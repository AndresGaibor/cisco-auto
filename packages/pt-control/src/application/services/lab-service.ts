// ============================================================================
// LabService - Capa de orquestación para laboratorios PT
// Setup → Action → Verify → Cleanup con snapshot y verificación
// ============================================================================

import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type { TopologyCache } from "../../infrastructure/pt/topology-cache.js";
import type { DeviceService } from "./device-service.js";
import type { IosService } from "./ios-service.js";
import type { TopologyService } from "./topology-service.js";

export interface XmlPort {
  name: string;
  ipAddress?: string;
  subnetMask?: string;
  macAddress?: string;
  status?: string;
  protocol?: string;
  vlan?: number;
  mode?: string;
  description?: string;
  bandwidth?: string;
  delay?: string;
  duplex?: string;
  speed?: string;
  encapsulation?: string;
  trunkVlan?: number;
  type?: string;
}

export interface XmlModule {
  slot: string;
  model?: string;
  type?: string;
  ports: string[];
}

export interface XmlVlan {
  id: number;
  name?: string;
  state?: string;
}

export interface XmlRoutingEntry {
  type: string;
  network: string;
  mask?: string;
  nextHop?: string;
  interface?: string;
  metric?: string;
  distance?: string;
  age?: string;
}

export interface XmlArpEntry {
  ipAddress: string;
  macAddress: string;
  interface: string;
  age?: string;
  type?: string;
}

export interface XmlMacEntry {
  vlan: string;
  macAddress: string;
  type: string;
  ports: string[];
}

export interface ParsedDeviceXml {
  hostname?: string;
  model?: string;
  typeId?: number;
  power?: boolean;
  version?: string;
  uptime?: string;
  serialNumber?: string;
  configRegister?: string;
  ports: XmlPort[];
  modules: XmlModule[];
  vlans: XmlVlan[];
  routingTable: XmlRoutingEntry[];
  arpTable: XmlArpEntry[];
  macTable: XmlMacEntry[];
  rawXml: string;
}

export interface LabScenario {
  id: string;
  name: string;
  description: string;
  setup: (ctx: LabContext) => Promise<void>;
  action: (ctx: LabContext) => Promise<void>;
  verify: (ctx: LabContext) => Promise<LabVerification>;
  cleanup: (ctx: LabContext) => Promise<void>;
}

export interface LabCheck {
  name: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  message?: string;
}

export interface LabVerification {
  ok: boolean;
  scenarioId: string;
  checks: LabCheck[];
  evidence: Record<string, unknown>;
  errors: string[];
  durationMs: number;
}

export interface LabContext {
  snapshotBefore?: Record<string, unknown>;
  snapshotAfter?: Record<string, unknown>;
  deviceXml?: Record<string, ParsedDeviceXml>;
}

function extractXmlTagContent(xml: string, tag: string, fallback = ""): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m && m[1] ? m[1].trim() : fallback;
}

function tagAttr(xml: string, tag: string, attr: string, fallback = ""): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*>`, "i");
  const m = xml.match(re);
  return m && m[1] ? m[1] : fallback;
}

function allTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
  const matches: string[] = [];
  let m;
  while ((m = re.exec(xml)) !== null) {
    matches.push(m[0]);
  }
  re.lastIndex = 0;
  return matches;
}

function parseDeviceXml(xml: string): ParsedDeviceXml {
  const hostname = extractXmlTagContent(xml, "hostname") || tagAttr(xml, "device", "name");
  const model = tagAttr(xml, "device", "model");
  const powerStr = tagAttr(xml, "device", "power");
  const power = powerStr === "true" || powerStr === "1";
  const typeIdStr = tagAttr(xml, "device", "typeId");
  const typeId = typeIdStr ? parseInt(typeIdStr, 10) : undefined;

  const ports: XmlPort[] = [];
  for (const portXml of allTags(xml, "port")) {
    const name = tagAttr(portXml, "port", "name") || extractXmlTagContent(portXml, "name");
    ports.push({
      name,
      ipAddress: extractXmlTagContent(portXml, "ipAddress") || undefined,
      subnetMask: extractXmlTagContent(portXml, "subnetMask") || undefined,
      macAddress: extractXmlTagContent(portXml, "macAddress") || undefined,
      status: extractXmlTagContent(portXml, "status") || undefined,
      protocol: extractXmlTagContent(portXml, "protocol") || undefined,
      vlan: parseInt(extractXmlTagContent(portXml, "vlan") || "0", 10) || undefined,
      mode: extractXmlTagContent(portXml, "mode") || undefined,
      description: extractXmlTagContent(portXml, "description") || undefined,
      bandwidth: extractXmlTagContent(portXml, "bandwidth") || undefined,
      delay: extractXmlTagContent(portXml, "delay") || undefined,
      duplex: extractXmlTagContent(portXml, "duplex") || undefined,
      speed: extractXmlTagContent(portXml, "speed") || undefined,
      encapsulation: extractXmlTagContent(portXml, "encapsulation") || undefined,
      trunkVlan: parseInt(extractXmlTagContent(portXml, "trunkVlan") || "0", 10) || undefined,
      type: extractXmlTagContent(portXml, "type") || undefined,
    });
  }

  const modules: XmlModule[] = [];
  for (const modXml of allTags(xml, "module")) {
    const slot = tagAttr(modXml, "module", "slot") || extractXmlTagContent(modXml, "slot");
    modules.push({
      slot,
      model: extractXmlTagContent(modXml, "model") || undefined,
      type: extractXmlTagContent(modXml, "type") || undefined,
      ports: extractXmlTagContent(modXml, "ports")
        ? extractXmlTagContent(modXml, "ports")
            .split(",")
            .map((p) => p.trim())
        : [],
    });
  }

  const vlans: XmlVlan[] = [];
  for (const vlanXml of allTags(xml, "vlan")) {
    vlans.push({
      id: parseInt(tagAttr(vlanXml, "vlan", "id") || extractXmlTagContent(vlanXml, "id") || "0", 10),
      name: extractXmlTagContent(vlanXml, "name") || undefined,
      state: extractXmlTagContent(vlanXml, "state") || undefined,
    });
  }

  const routingTable: XmlRoutingEntry[] = [];
  for (const routeXml of allTags(xml, "route")) {
    routingTable.push({
      type: extractXmlTagContent(routeXml, "type") || "C",
      network: extractXmlTagContent(routeXml, "network") || "",
      mask: extractXmlTagContent(routeXml, "mask") || undefined,
      nextHop: extractXmlTagContent(routeXml, "nextHop") || undefined,
      interface: extractXmlTagContent(routeXml, "interface") || undefined,
      metric: extractXmlTagContent(routeXml, "metric") || undefined,
      distance: extractXmlTagContent(routeXml, "distance") || undefined,
      age: extractXmlTagContent(routeXml, "age") || undefined,
    });
  }

  const arpTable: XmlArpEntry[] = [];
  for (const arpXml of allTags(xml, "arp")) {
    arpTable.push({
      ipAddress: extractXmlTagContent(arpXml, "ipAddress") || "",
      macAddress: extractXmlTagContent(arpXml, "macAddress") || "",
      interface: extractXmlTagContent(arpXml, "interface") || "",
      age: extractXmlTagContent(arpXml, "age") || undefined,
      type: extractXmlTagContent(arpXml, "type") || undefined,
    });
  }

  const macTable: XmlMacEntry[] = [];
  for (const macXml of allTags(xml, "mac")) {
    macTable.push({
      vlan: extractXmlTagContent(macXml, "vlan") || "1",
      macAddress: extractXmlTagContent(macXml, "macAddress") || "",
      type: extractXmlTagContent(macXml, "type") || "",
      ports: (extractXmlTagContent(macXml, "ports") || "").split(",").map((p) => p.trim()),
    });
  }

  return {
    hostname: hostname || undefined,
    model: model || undefined,
    typeId: typeId,
    power: power,
    version: extractXmlTagContent(xml, "version") || undefined,
    uptime: extractXmlTagContent(xml, "uptime") || undefined,
    serialNumber: extractXmlTagContent(xml, "serialNumber") || undefined,
    configRegister: extractXmlTagContent(xml, "configRegister") || undefined,
    ports,
    modules,
    vlans,
    routingTable,
    arpTable,
    macTable,
    rawXml: xml,
  };
}

export class LabService {
  constructor(
    private readonly primitivePort: RuntimePrimitivePort,
    private readonly topologyCache: TopologyCache,
    private readonly deviceService: DeviceService,
    private readonly iosService: IosService,
    private readonly topologyService: TopologyService,
  ) {}

  async runScenario(scenario: LabScenario): Promise<LabVerification> {
    const inicio = Date.now();
    const errors: string[] = [];
    const checks: LabCheck[] = [];
    const evidence: Record<string, unknown> = {};

    const contexto: LabContext = {};

    try {
      contexto.snapshotBefore = await this.getSnapshot();
      await scenario.setup(contexto);
      await scenario.action(contexto);
      const verificacion = await scenario.verify(contexto);
      checks.push(...verificacion.checks);
      Object.assign(evidence, verificacion.evidence);
      if (verificacion.errors.length > 0) {
        errors.push(...verificacion.errors);
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    } finally {
      try {
        await scenario.cleanup(contexto);
      } catch (e) {
        errors.push(`Cleanup error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    contexto.snapshotAfter = await this.getSnapshot();
    const duracionMs = Date.now() - inicio;

    return {
      ok: errors.length === 0 && checks.every((c) => c.passed),
      scenarioId: scenario.id,
      checks,
      evidence,
      errors,
      durationMs: duracionMs,
    };
  }

  async inspectDeviceXml(deviceName: string): Promise<ParsedDeviceXml | null> {
    try {
      const estado = await this.deviceService.inspect(deviceName, true);
      if (!estado || !estado.uuid) {
        return null;
      }
      const xmlBruto = await this.obtenerXmlDispositivo(deviceName);
      if (!xmlBruto) {
        return null;
      }
      return parseDeviceXml(xmlBruto);
    } catch {
      return null;
    }
  }

  async getSnapshot(): Promise<Record<string, unknown>> {
    return this.topologyCache.getSnapshot() as Record<string, unknown>;
  }

  private async obtenerXmlDispositivo(deviceName: string): Promise<string | null> {
    try {
      const resultado = await this.primitivePort.runPrimitive("device.inspect", {
        device: deviceName,
        includeXml: true,
      });
      if (!resultado.ok) {
        return null;
      }
      return (resultado.value as { xml?: string }).xml ?? null;
    } catch {
      return null;
    }
  }
}
