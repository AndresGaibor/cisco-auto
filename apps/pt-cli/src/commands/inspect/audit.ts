#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { createDefaultPTController, type PTController } from "@cisco-auto/pt-control/controller";

export interface AuditResult {
  ok: boolean;
  score: number;
  findings: Array<{
    severity: "error" | "warning" | "info";
    message: string;
    device?: string;
    advice: string;
  }>;
}

export async function auditTopology(controller: PTController): Promise<AuditResult> {
  const snapshot = await controller.snapshot();
  const findings: AuditResult["findings"] = [];
  const devices = Object.values(snapshot.devices || {});
  const links = Object.values(snapshot.links || {});

  // 1. Check for devices with no links
  for (const device of devices) {
    const deviceLinks = links.filter(l => l.device1 === device.name || l.device2 === device.name);
    if (deviceLinks.length === 0) {
      findings.push({
        severity: "warning",
        message: `El dispositivo ${device.name} no tiene enlaces físicos.`,
        device: device.name,
        advice: "Conecta el dispositivo a la red o elimínalo si no es necesario."
      });
    }
  }

  // 2. Check for potential duplicate IPs (Expert logic)
  const ipMap = new Map<string, string>(); // IP -> Device Name
  for (const device of devices) {
    const ports = (device.ports || []) as any[];
    for (const port of ports) {
      const ip = port.ipAddress || port.ip;
      if (ip && ip !== "0.0.0.0" && ip !== "" && !ip.startsWith("169.254")) {
        const cleanIp = ip.split("/")[0];
        if (ipMap.has(cleanIp)) {
          findings.push({
            severity: "error",
            message: `Conflicto de IP detectado: ${cleanIp} está duplicada.`,
            device: device.name,
            advice: `Cambia la IP en ${device.name} o en ${ipMap.get(cleanIp)}.`
          });
        } else {
          ipMap.set(cleanIp, device.name);
        }
      }
    }
  }

  // 3. Check for Trunk mismatches (Native VLAN mismatch)
  for (const link of links) {
    const dev1 = snapshot.devices[link.device1];
    const dev2 = snapshot.devices[link.device2];
    if (!dev1 || !dev2) continue;

    const port1 = dev1.ports.find((p: any) => p.name === link.port1);
    const port2 = dev2.ports.find((p: any) => p.name === link.port2);

    if (port1 && port2 && port1.mode === "trunk" && port2.mode === "trunk") {
      if (port1.nativeVlan !== undefined && port2.nativeVlan !== undefined && port1.nativeVlan !== port2.nativeVlan) {
        findings.push({
          severity: "error",
          message: `Native VLAN mismatch en el enlace entre ${link.device1} y ${link.device2}.`,
          device: link.device1,
          advice: `Configura la misma VLAN nativa en ${link.device1}:${link.port1} (${port1.nativeVlan}) y ${link.device2}:${link.port2} (${port2.nativeVlan}).`
        });
      }
    }
  }

  // 4. Check for VLAN 1 usage on access ports (Security warning)
  for (const device of devices) {
    const ports = (device.ports || []) as any[];
    for (const port of ports) {
      if (port.mode === "access" && port.vlan === 1 && port.status === "up") {
        findings.push({
          severity: "warning",
          message: `El puerto ${port.name} en ${device.name} está usando la VLAN 1 (predeterminada).`,
          device: device.name,
          advice: "Mueve los puertos de usuario a una VLAN de datos dedicada por seguridad."
        });
      }
    }
  }

  // 5. Check for ports with status 'up' but protocol 'down' (Layer 1/2 issue)
  for (const device of devices) {
    const ports = (device.ports || []) as any[];
    for (const port of ports) {
      if (port.status === "up" && port.protocol === "down") {
        findings.push({
          severity: "error",
          message: `Puerto ${port.name} está UP pero el protocolo está DOWN (Layer 2 mismatch).`,
          device: device.name,
          advice: "Verifica duplex, velocidad o encapsulación (trunk vs access) en ambos extremos."
        });
      }
    }
  }

  // 6. Security Check: SNMP Default Community
  // (Requires running-config, which we can check if available in XML)
  for (const device of devices) {
      const xml = (device as any).xml || "";
      if (xml.toLowerCase().includes("snmp-server community public") || xml.toLowerCase().includes("snmp-server community private")) {
          findings.push({
              severity: "warning",
              message: "Comunidad SNMP predeterminada (public/private) detectada.",
              device: device.name,
              advice: "Cambia las comunidades SNMP por unas más seguras o deshabilita SNMP si no se usa."
          });
      }
  }

  // 7. Topology Check: No Gateway on PC/Server
  for (const device of devices) {
    if ((device.type === "pc" || device.type === "server") && !device.gateway && !device.dhcp) {
      findings.push({
        severity: "info",
        message: `El host ${device.name} no tiene un gateway configurado.`,
        device: device.name,
        advice: "Configura un Default Gateway para permitir la comunicación fuera de la subred local."
      });
    }
  }

  // 8. Spanning-Tree Mode Consistency
  const switchStpModes = new Map<string, string>(); // Mode -> First Device Name
  for (const device of devices) {
    if (device.type === "switch" || device.type === "multilayer_device") {
      const mode = (device as any).stpMode;
      if (mode && mode !== "unknown") {
        if (switchStpModes.size > 0 && !switchStpModes.has(mode)) {
          const otherMode = Array.from(switchStpModes.keys())[0];
          findings.push({
            severity: "warning",
            message: `Mezcla de modos Spanning-Tree detectada: ${device.name} usa ${mode} mientras que ${switchStpModes.get(otherMode!)} usa ${otherMode}.`,
            device: device.name,
            advice: "Usa el mismo modo STP (preferiblemente Rapid PVST) en todos los switches para evitar tiempos de convergencia lentos o inestabilidad."
          });
        } else {
          switchStpModes.set(mode, device.name);
        }
      }
    }
  }

  // 9. Check for duplicate Hostnames
  const hostnameMap = new Map<string, string>(); // Hostname -> Device Name
  for (const device of devices) {
      const hostname = (device as any).hostname;
      if (hostname && hostname !== "Router" && hostname !== "Switch") {
          if (hostnameMap.has(hostname)) {
              findings.push({
                  severity: "warning",
                  message: `Hostname duplicado detectado: "${hostname}" está configurado en ${device.name} y ${hostnameMap.get(hostname)}.`,
                  device: device.name,
                  advice: "Cada dispositivo debe tener un hostname único para evitar confusión en la gestión y logs."
              });
          } else {
              hostnameMap.set(hostname, device.name);
          }
      }
  }

  const errorCount = findings.filter(f => f.severity === "error").length;
  const warningCount = findings.filter(f => f.severity === "warning").length;
  const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 5));

  return {
    ok: errorCount === 0,
    score,
    findings
  };
}

export function createInspectAuditCommand(): Command {
  return new Command("audit")
    .description("Auditoría experta de mejores prácticas de red")
    .option("--json", "Salida en JSON", false)
    .action(async (options: { json: boolean }) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        const result = await auditTopology(controller);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        console.log(chalk.bold(`\n📋 Auditoría de Red (Score: ${result.score}/100)\n`));
        
        if (result.findings.length === 0) {
          console.log(chalk.green("  ✅ No se encontraron problemas. ¡Excelente diseño!"));
        } else {
          for (const f of result.findings) {
            const icon = f.severity === "error" ? chalk.red("✖") : f.severity === "warning" ? chalk.yellow("⚠") : chalk.blue("ℹ");
            console.log(`  ${icon} ${chalk.bold(f.device || "Global")}: ${f.message}`);
            console.log(`     ${chalk.gray("Sugerencia: " + f.advice)}`);
          }
        }
        console.log();
      } finally {
        await controller.stop();
      }
    });
}
