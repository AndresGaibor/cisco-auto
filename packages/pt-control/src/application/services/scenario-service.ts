// ============================================================================
// Scenario Service - The Lab Orchestrator (CCNA 1-8)
// Carga labs desde YAML y los inyecta en PT via evaluate/OmniscienceService.
// ============================================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { ScenarioDefinition, ValidationResult } from "../../contracts/scenarios.js";
import { OmniscienceService } from "./omniscience-service.js";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ============================================================================
// Tipos internos
// ============================================================================

interface LabDevice {
  name: string;
  type: string;
  model: string;
  x: number;
  y: number;
}

interface LabLink {
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
}

interface LabConfig {
  device: string;
  type: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

interface LabValidation {
  type: string;
  from?: string;
  to?: string;
  device?: string;
  expect?: string | Record<string, unknown>;
}

interface ParsedLab {
  name?: string;
  description?: string;
  devices: LabDevice[];
  links: LabLink[];
  configs: LabConfig[];
  validation: LabValidation[];
}

// ============================================================================
// Mapa de escenarios registrados
// ============================================================================

const SCENARIOS: Record<number, string> = {
  1: "labs/lan-basica.yaml",
  2: "labs/arp-learning.yaml",
  3: "labs/router-between-nets.yaml",
  4: "labs/gateway-misconfig.yaml",
  5: "labs/mask-misconfig.yaml",
  6: "labs/ip-duplicate.yaml",
  7: "labs/switch-documented.yaml",
  8: "labs/subnetting-basic.yaml",
};

const ESCENARIOS_META: Record<number, { nombre: string; desc: string }> = {
  1: { nombre: "LAN mínima", desc: "2 PCs + 1 switch, conectividad básica" },
  2: { nombre: "ARP learning", desc: "3 PCs + 1 switch, tabla ARP" },
  3: { nombre: "Router entre redes", desc: "Router + 2 PCs, redes separadas" },
  4: { nombre: "Gateway mal configurado", desc: "Detectar fallo de gateway" },
  5: { nombre: "Máscara incorrecta", desc: "Detectar error de subnetting" },
  6: { nombre: "IP duplicada", desc: "Detectar conflicto de IP" },
  7: { nombre: "Switch documentado", desc: "Hostname y descripciones" },
  8: { nombre: "Subnetting básico", desc: "Dos LANs con /26" },
};

// ============================================================================
// Helpers de parsing YAML mínimo (sin dependencia externa)
// Usa RegExp para parseo simple de YAML de labs
// ============================================================================

function parseYamlRaw(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");
  const stack: Array<{ indent: number; key: string; obj: Record<string, unknown> }> = [];
  let currentList: unknown[] = [];
  let listKey = "";

  for (let li = 0; li < lines.length; li++) {
    const rawLine = lines[li]!;
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim() || line.trim().startsWith("#")) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    while (stack.length > 0 && indent <= stack[stack.length - 1]!.indent) {
      stack.pop();
    }

    if (trimmed === "-") {
      listKey = stack.length > 0 ? stack[stack.length - 1]!.key : "";
      currentList = [];
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) {
      if (currentList.length > 0 && typeof currentList[currentList.length - 1] === "string") {
        currentList.push(trimmed);
      }
      continue;
    }

    const rawKey = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed
      .slice(colonIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");

    if (currentList.length > 0 && listKey) {
      const last = currentList[currentList.length - 1];
      if (typeof last === "string" && last.includes(":")) {
        const obj: Record<string, string> = {};
        obj[rawKey] = rawValue;
        currentList[currentList.length - 1] = obj;
      } else if (typeof last === "object" && last !== null) {
        (last as Record<string, string>)[rawKey] = rawValue;
      }
      continue;
    }

    if (!rawValue) {
      const newObj: Record<string, unknown> = { _indent: indent };
      if (stack.length > 0) {
        const top = stack[stack.length - 1]!;
        top.obj[rawKey] = newObj;
      } else {
        result[rawKey] = newObj;
      }
      stack.push({ indent, key: rawKey, obj: newObj });
    } else {
      const value = rawValue;
      if (stack.length > 0) {
        const top = stack[stack.length - 1]!;
        top.obj[rawKey] = value;
      } else {
        result[rawKey] = value;
      }
    }
  }

  return result;
}

function yamlToLab(parsed: Record<string, unknown>): ParsedLab {
  const devices = ((parsed.devices as Array<Record<string, unknown>>) || []).map(
    (d): LabDevice => ({
      name: String(d["name"] || d["id"] || ""),
      type: String(d["type"] || "unknown"),
      model: String(d["model"] || "PC-PT"),
      x: Number(d["x"] ?? 200),
      y: Number(d["y"] ?? 200),
    }),
  );

  const links = ((parsed.links as Array<Record<string, unknown>>) || []).map(
    (l): LabLink => ({
      from: String(l["from"] || ""),
      fromPort: String(l["fromPort"] || l["port"] || "FastEthernet0/1"),
      to: String(l["to"] || ""),
      toPort: String(l["toPort"] || l["port"] || "FastEthernet0/1"),
    }),
  );

  const configs = ((parsed.configs as Array<Record<string, unknown>>) || []).map(
    (c): LabConfig => ({
      device: String(c["device"] || ""),
      type: String(c["type"] || "host"),
      ip: c["ip"] as string | undefined,
      mask: c["mask"] as string | undefined,
      gateway: c["gateway"] as string | undefined,
      dns: c["dns"] as string | undefined,
      dhcp: c["dhcp"] as boolean | undefined,
    }),
  );

  const validation = ((parsed.validation as Array<Record<string, unknown>>) || []).map(
    (v): LabValidation => ({
      type: String(v["type"] || ""),
      from: v["from"] as string | undefined,
      to: v["to"] as string | undefined,
      device: v["device"] as string | undefined,
      expect: v["expect"] as Record<string, unknown> | undefined,
    }),
  );

  return {
    name: parsed["name"] as string | undefined,
    description: parsed["description"] as string | undefined,
    devices,
    links,
    configs,
    validation,
  };
}

// ============================================================================
// Scenario Service
// ============================================================================

export class ScenarioService {
  private readonly omni: OmniscienceService;

  constructor(private readonly bridge: FileBridgePort) {
    this.omni = new OmniscienceService(this.bridge);
  }

  /**
   * Lista escenarios disponibles
   */
  listScenarios(): Array<{ id: number; nombre: string; desc: string }> {
    return Object.keys(SCENARIOS).map((id) => {
      const num = parseInt(id, 10);
      const meta = ESCENARIOS_META[num];
      return { id: num, nombre: meta?.nombre ?? "?", desc: meta?.desc ?? "" };
    });
  }

  /**
   * Carga un lab desde YAML
   */
  loadLab(id: number): ParsedLab | null {
    const path = SCENARIOS[id];
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
   * Inyecta un escenario en PT
   */
  async startScenario(id: number): Promise<void> {
    const meta = ESCENARIOS_META[id];
    if (!meta) {
      console.log(`❌ Escenario ${id} no encontrado.`);
      console.log(`   Disponibles: ${Object.keys(SCENARIOS).join(", ")}`);
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
    const res = await this.omni.evaluate(script);
    console.log(`   🔹 Kernel: ${res}`);

    if (String(res).includes("ERROR")) {
      console.log(`❌ Error en inyección. Revisa el lab YAML.`);
      return;
    }

    console.log("   🔹 Esperando convergencia (15s)...");
    await delay(15000);
    console.log(`✅ Escenario ${id} preparado.`);
  }

  /**
   * Fuerza un escenario sin delays (inyección atómica)
   */
  async forceScenario(id: number): Promise<void> {
    const meta = ESCENARIOS_META[id];
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
    const res = await this.omni.evaluate(script);
    console.log(`   🔹 Kernel: ${res}`);
  }

  /**
   * Valida un escenario en PT
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

    console.log(`🔍 Validando Escenario ${id}: ${lab.name || ESCENARIOS_META[id]?.nombre}`);

    // Validación capa física
    const topo = await this.omni.getTopology();
    const expectedLinks = lab.links.length;
    if (topo.links.length >= expectedLinks) {
      result.details.physical.push(
        `✅ ${topo.links.length} enlace(s) detectado(s) (esperados: ${expectedLinks})`,
      );
    } else {
      result.details.physical.push(
        `❌ Solo ${topo.links.length} enlace(s) (esperados: ${expectedLinks})`,
      );
    }

    // Validaciones del YAML
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

    // Status final
    const hasErrors = [
      ...result.details.physical,
      ...result.details.layer2,
      ...result.details.layer3,
      ...result.details.services,
    ].some((d) => d.startsWith("❌"));

    result.status = hasErrors ? "FAIL" : "PASS";
    return result;
  }

  // ============================================================================
  // Builder del script de inyección
  // ============================================================================

  private buildInjectionScript(lab: ParsedLab, atomic = false): string {
    const deviceLines = lab.devices
      .map((d) => `w.createDevice('${d.model}', '${d.name}', ${d.x}, ${d.y});`)
      .join("\n                    ");

    const linkLines = lab.links
      .map((l) => `w.createLink('${l.from}', '${l.fromPort}', '${l.to}', '${l.toPort}', 0);`)
      .join("\n                    ");

    const configLines = lab.configs
      .map((c) => {
        if (c.type === "host" || c.type === "pc" || c.type === "server") {
          let lines = "";
          if (c.ip && c.mask) {
            lines += `d.getPortAt(0).setIpAddress('${c.ip}', '${c.mask}');`;
          }
          if (c.gateway) {
            lines += `\n                    d.setDefaultGateway('${c.gateway}');`;
          }
          return lines;
        } else if (c.type === "router") {
          // Routers need interface-specific config
          // We handle this via CLI config after the lab is set up
          return "";
        }
        return "";
      })
      .filter(Boolean)
      .join("\n                    ");

    // Config IPs para PCs
    const pcConfigs = lab.configs
      .filter((c) => c.type === "host" || c.type === "pc" || c.type === "server")
      .map((c) => {
        let lines = `var d = n.getDevice('${c.device}');`;
        if (c.ip && c.mask) {
          lines += `\n                    if(d && d.getPortAt) d.getPortAt(0).setIpAddress('${c.ip}', '${c.mask}');`;
        }
        if (c.gateway) {
          lines += `\n                    if(d && d.setDefaultGateway) d.setDefaultGateway('${c.gateway}');`;
        }
        return lines;
      })
      .join("\n                    ");

    const convergeScript = atomic
      ? `
                // Simulation forwarding (convergencia instantanea)
                try {
                    var sim = ipc.simulation();
                    if (sim) {
                        sim.setSimulationMode(true);
                        for(var k=0; k<10; k++) sim.forward();
                        sim.setSimulationMode(false);
                    }
                } catch(e) { /* sim puede no estar disponible */ }
`
      : "";

    return `
        (function() {
            try {
                var g = global;
                var n = g.ipc.network();
                var w = g.appWindow.getActiveWorkspace().getLogicalWorkspace();

                // 1. Clear canvas (Chainbreaker)
                var count = n.getDeviceCount();
                for(var i=count-1; i>=0; i--) {
                    var dev = n.getDeviceAt(i);
                    if (dev) n.removeDevice(dev.getName());
                }

                // 2. Crear dispositivos
                ${deviceLines}

                // 3. Crear enlaces
                ${linkLines}

                // 4. Configurar IPs (PCs y Servers)
                ${pcConfigs}

                // 5. Convergencia
                ${convergeScript}

                return "OK";
            } catch(e) { return "INJECT_ERROR: " + String(e); }
        })()
    `;
  }
}
