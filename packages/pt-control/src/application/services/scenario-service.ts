// ============================================================================
// Scenario Service - Orquestador de labs (CCNA 1-8)
// Delega parsing a scenario-parser.ts y resolución a scenario-catalog.ts
// ============================================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FileBridgePort } from "../ports/file-bridge.port.js";
import { OmniscienceService } from "./omniscience-service.js";
import { RuntimeOmniAdapter } from "../../adapters/runtime-omni-adapter.js";
import { RuntimePrimitiveAdapter } from "../../adapters/runtime-primitive-adapter.js";
import {
  parseYamlRaw,
  yamlToLab,
  type ParsedLab,
} from "./scenario-parser.js";
import {
  getScenarioPath,
  getScenarioMeta,
  listScenarios,
} from "./scenario-catalog.js";

interface ValidationResult {
  scenarioId: number;
  status: "PASS" | "FAIL";
  details: {
    physical: string[];
    layer2: string[];
    layer3: string[];
    services: string[];
  };
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Servicio de orquestación de escenarios de laboratorio.
 * Coordena carga de YAML, inyección en PT, y validación.
 * Delega parsing y catálogo a módulos especializados.
 */
export class ScenarioService {
  private readonly omniPort: RuntimeOmniAdapter;
  private readonly primitivePort: RuntimePrimitiveAdapter;
  private readonly omni: OmniscienceService;

  constructor(private readonly bridge: FileBridgePort) {
    this.omniPort = new RuntimeOmniAdapter({ bridge });
    this.primitivePort = new RuntimePrimitiveAdapter(bridge);
    this.omni = new OmniscienceService(this.omniPort);
  }

  /**
   * Lista escenarios disponibles en el catálogo.
   * @returns Array de escenarios con id, nombre y descripción
   */
  listScenarios(): Array<{ id: number; nombre: string; desc: string }> {
    return listScenarios();
  }

  /**
   * Carga un lab desde YAML usando el path del catálogo.
   * @param id - ID del escenario
   * @returns ParsedLab o null si no existe o falla el parsing
   */
  loadLab(id: number): ParsedLab | null {
    const path = getScenarioPath(id);
    if (!path) return null;
    try {
      const content = readFileSync(resolve(process.cwd(), path), "utf-8");
      const parsed = parseYamlRaw(content);
      return yamlToLab(parsed);
    } catch {
      return null;
    }
  }

  /**
   * Inyecta un escenario en Packet Tracer con delay de convergencia.
   * @param id - ID del escenario a inyectar
   */
  async startScenario(id: number): Promise<void> {
    const meta = getScenarioMeta(id);
    if (!meta) {
      console.log(`❌ Escenario ${id} no encontrado.`);
      console.log(`   Disponibles: ${Object.keys(listScenarios()).join(", ")}`);
      return;
    }

    console.log(`🚀 Inyectando Escenario ${id}: ${meta.nombre}`);
    console.log(`   ${meta.desc}`);

    const lab = this.loadLab(id);
    if (!lab) {
      console.log(`❌ No se pudo cargar el lab YAML para escenario ${id}.`);
      return;
    }

    const script = this.buildInjectionScript(lab);
    const res = await this.omniPort.runOmniCapability("omni.evaluate.raw", { code: script });

    const kernelMessage = res.ok ? String(res.value ?? "OK") : `ERROR: ${res.error ?? "unknown"}`;
    console.log(`   🔹 Kernel: ${kernelMessage}`);

    if (!res.ok || kernelMessage.includes("ERROR") || kernelMessage.includes("INJECT_ERROR")) {
      console.log(`❌ Error en inyección. Revisa el lab YAML.`);
      return;
    }

    console.log("   🔹 Esperando convergencia (15s)...");
    await delay(15000);
    console.log(`✅ Escenario ${id} preparado.`);
  }

  /**
   * Fuerza un escenario sin delays (inyección atómica).
   * @param id - ID del escenario a forzar
   */
  async forceScenario(id: number): Promise<void> {
    const meta = getScenarioMeta(id);
    if (!meta) {
      console.log(`❌ Escenario ${id} no encontrado.`);
      return;
    }

    console.log(`⚡ Forzando Escenario ${id}: ${meta.nombre}`);

    const lab = this.loadLab(id);
    if (!lab) {
      console.log(`❌ No se pudo cargar el lab YAML para escenario ${id}.`);
      return;
    }

    const script = this.buildInjectionScript(lab, true);
    const res = await this.omniPort.runOmniCapability("omni.evaluate.raw", { code: script });
    const kernelMessage = res.ok ? String(res.value ?? "OK") : `ERROR: ${res.error ?? "unknown"}`;
    console.log(`   🔹 Kernel: ${kernelMessage}`);
  }

  /**
   * Valida un escenario en Packet Tracer contra las expectativas del YAML.
   * @param id - ID del escenario a validar
   * @returns ValidationResult con status PASS/FAIL y detalles por capa
   */
  async validateScenario(id: number): Promise<ValidationResult> {
    const result: ValidationResult = {
      scenarioId: id,
      status: "FAIL",
      details: { physical: [], layer2: [], layer3: [], services: [] },
    };

    const lab = this.loadLab(id);
    if (!lab) {
      result.details.physical.push(`❌ Escenario ${id} no encontrado o YAML inválido.`);
      return result;
    }

    const meta = getScenarioMeta(id);
    console.log(`🔍 Validando Escenario ${id}: ${lab.name || meta?.nombre}`);

    const snapshotResult = await this.primitivePort.runPrimitive(
      "topology.snapshot",
      {},
      { timeoutMs: 15000 },
    );

    const snapshotValue =
      snapshotResult.ok && snapshotResult.value && typeof snapshotResult.value === "object"
        ? (snapshotResult.value as { links?: unknown[] })
        : null;

    const detectedLinks = Array.isArray(snapshotValue?.links) ? snapshotValue.links.length : 0;
    const expectedLinks = lab.links.length;

    if (detectedLinks >= expectedLinks) {
      result.details.physical.push(
        `✅ ${detectedLinks} enlace(s) detectado(s) (esperados: ${expectedLinks})`,
      );
    } else {
      result.details.physical.push(
        `❌ Solo ${detectedLinks} enlace(s) (esperados: ${expectedLinks})`,
      );
    }

    for (const v of lab.validation) {
      if (v.type === "ping") {
        const from = v.from || "PC1";
        const to = v.to || "192.168.10.20";
        try {
          const ok = await this.omni.sendPing(from, to);
          const expectObj = v.expect as Record<string, unknown> | undefined;
          if (
            v.expect === "success" ||
            (typeof v.expect === "object" &&
              v.expect !== null &&
              expectObj &&
              "present" in expectObj)
          ) {
            if (ok) {
              result.details.layer3.push(`✅ Ping ${from} → ${to} exitoso.`);
            } else {
              result.details.layer3.push(`❌ Ping ${from} → ${to} falló (esperado: éxito).`);
            }
          } else {
            if (!ok) {
              result.details.layer3.push(`✅ Ping falló como se esperaba (${from} → ${to}).`);
            } else {
              result.details.layer3.push(
                `❌ Ping exitoso pero se esperaba fallo (${from} → ${to}).`,
              );
            }
          }
        } catch (e) {
          result.details.layer3.push(`❌ Error en ping ${from} → ${to}: ${String(e)}`);
        }
      } else if (v.type === "arp") {
        const device = v.device || lab.devices.find((d) => d.type === "switch")?.name || "Switch1";
        try {
          const count = await this.omni.evaluate(`
            (function() {
              var d = ipc.network().getDevice('${device}');
              return d && d.getMacAddressTable ? d.getMacAddressTable().getEntryCount() : 0;
            })()
          `);
          const n = parseInt(String(count), 10);
          const expected = ((v.expect as Record<string, unknown>)?.count as number) || 0;
          if (n >= expected) {
            result.details.layer2.push(
              `✅ Tabla MAC de ${device}: ${n} entrada(s) (esperadas: ≥${expected}).`,
            );
          } else {
            result.details.layer2.push(
              `❌ Tabla MAC de ${device}: ${n} entrada(s) (esperadas: ≥${expected}).`,
            );
          }
        } catch (e) {
          result.details.layer2.push(`❌ Error leyendo tabla MAC de ${device}: ${String(e)}`);
        }
      } else if (v.type === "mac_table") {
        const device = v.device || "Switch1";
        const expectCount = ((v.expect as Record<string, unknown>)?.mac_count as number) || 0;
        try {
          const count = await this.omni.evaluate(`
            (function() {
              var d = ipc.network().getDevice('${device}');
              return d && d.getMacAddressTable ? d.getMacAddressTable().getEntryCount() : 0;
            })()
          `);
          const n = parseInt(String(count), 10);
          if (n >= expectCount) {
            result.details.layer2.push(
              `✅ Tabla MAC ${device}: ${n} entrada(s) (≥${expectCount}).`,
            );
          } else {
            result.details.layer2.push(
              `❌ Tabla MAC ${device}: ${n} entrada(s) (esperado: ≥${expectCount}).`,
            );
          }
        } catch (e) {
          result.details.layer2.push(`❌ Error tabla MAC ${device}: ${String(e)}`);
        }
      } else if (v.type === "routing_table") {
        const device = v.device || "R1";
        const expectRoutes = ((v.expect as Record<string, unknown>)?.route_count as number) || 0;
        try {
          const count = await this.omni.evaluate(`
            (function() {
              var d = ipc.network().getDevice('${device}');
              return d && d.getRoutingTable ? d.getRoutingTable().getEntryCount() : 0;
            })()
          `);
          const n = parseInt(String(count), 10);
          if (n >= expectRoutes) {
            result.details.layer3.push(
              `✅ Tabla de rutas ${device}: ${n} ruta(s) (≥${expectRoutes}).`,
            );
          } else {
            result.details.layer3.push(
              `❌ Tabla de rutas ${device}: ${n} ruta(s) (esperado: ≥${expectRoutes}).`,
            );
          }
        } catch (e) {
          result.details.layer3.push(`❌ Error leyendo rutas de ${device}: ${String(e)}`);
        }
      } else if (v.type === "running_config") {
        const device = v.device || "Switch1";
        const expectText = ((v.expect as Record<string, unknown>)?.contains as string) || "";
        try {
          const genome = await this.omni.getDeviceGenome(device);
          const config = genome.ios.runningConfig || "";
          if (config.includes(expectText)) {
            result.details.layer2.push(`✅ Running-config de ${device} contiene "${expectText}".`);
          } else {
            result.details.layer2.push(
              `❌ Running-config de ${device} no contiene "${expectText}".`,
            );
          }
        } catch {
          result.details.layer2.push(`⚠ No se pudo obtener running-config de ${device}.`);
        }
      } else if (v.type === "ip_conflict") {
        const device = v.device || "PC2";
        try {
          const genome = await this.omni.getDeviceGenome(device);
          const ip = genome.ios.runningConfig.match(/ip address ([\d.]+)/)?.[1] || "";
          const dupes = await this.omni.evaluate(`
            (function() {
              var count = 0;
              var net = ipc.network();
              for(var i=0; i<net.getDeviceCount(); i++) {
                var d = net.getDeviceAt(i);
                if (!d || d.getName() === '${device}') continue;
                var p = d.getPortAt ? d.getPortAt(0) : null;
                if (p && p.getIpAddress && p.getIpAddress() === '${ip}') count++;
              }
              return count;
            })()
          `);
          if (parseInt(String(dupes), 10) > 0) {
            result.details.layer3.push(`✅ Conflicto de IP detectado para ${ip}.`);
          } else {
            result.details.layer3.push(`❌ No se detectó conflicto de IP ${ip} (era esperado).`);
          }
        } catch (e) {
          result.details.layer3.push(`❌ Error detectando conflicto IP: ${String(e)}`);
        }
      }
    }

    const hasErrors = [
      ...result.details.physical,
      ...result.details.layer2,
      ...result.details.layer3,
      ...result.details.services,
    ].some((d) => d.startsWith("❌"));

    result.status = hasErrors ? "FAIL" : "PASS";
    return result;
  }

  /**
   * Construye el script de inyección JavaScript para Packet Tracer.
   * @param lab - Lab parseado con dispositivos, enlaces y configs
   * @param atomic - Si true, habilita convergencia instantánea
   * @returns Código JavaScript como string
   */
  private buildInjectionScript(lab: ParsedLab, atomic = false): string {
    const deviceLines = lab.devices
      .map((d) => `w.createDevice('${d.model}', '${d.name}', ${d.x}, ${d.y});`)
      .join("\n                    ");

    const linkLines = lab.links
      .map((l) => `(function() { 
          var link = w.createLink('${l.from}', '${l.fromPort}', '${l.to}', '${l.toPort}', 0);
          if(!link && w.autoConnectDevices) w.autoConnectDevices('${l.from}', '${l.to}');
      })();`)
      .join("\n                    ");

    const configLines = lab.configs
      .map((c) => {
        if (c.type === "host" || c.type === "pc" || c.type === "server") {
          let lines = `var d = n.getDevice('${c.device}'); if(d) {`;
          if (c.ip && c.mask) {
            lines += `
                    try { 
                      var p = d.getPortAt(0);
                      if(p && p.setIpSubnetMask) p.setIpSubnetMask('${c.ip}', '${c.mask}');
                      else if(d.setIpSubnetMask) d.setIpSubnetMask('${c.ip}', '${c.mask}');
                      else if(p && p.setIpAddress) p.setIpAddress('${c.ip}', '${c.mask}');
                    } catch(e) {
                      if(d.getCommandLine && d.getCommandLine()) {
                        d.getCommandLine().enterCommand('ipconfig ${c.ip} ${c.mask}');
                      } else {
                        throw new Error('Hardware API fail and no CLI available for ${c.device}');
                      }
                    }`;
          }
          if (c.gateway) {
            lines += `\n                    try { d.setDefaultGateway('${c.gateway}'); } catch(e) {}`;
          }
          lines += `\n                    }`;
          return lines;
        } else if (c.type === "router") {
          return "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n                    ");

    const convergeScript = atomic
      ? `
                try {
                    var sim = ipc.simulation();
                    if (sim) {
                        sim.setSimulationMode(true);
                        for(var k=0; k<10; k++) sim.forward();
                        sim.setSimulationMode(false);
                    }
                } catch(e) { }
`
      : "";

    return `
        (function() {
            try {
                var g = global;
                var n = g.ipc.network();
                var w = g.appWindow.getActiveWorkspace().getLogicalWorkspace();

                var count = n.getDeviceCount();
                for(var i=count-1; i>=0; i--) {
                    var dev = n.getDeviceAt(i);
                    if (dev) n.removeDevice(dev.getName());
                }

                ${deviceLines}

                ${linkLines}

                ${configLines}

                ${convergeScript}

                return "OK";
            } catch(e) { return "INJECT_ERROR: " + String(e); }
        })()
    `;
  }
}