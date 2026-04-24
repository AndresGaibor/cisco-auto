// ============================================================================
// Omniscience Service V12 - Migrado a RuntimeOmniPort
// delegacion pura al adapter, sin ejecutores directos
// ============================================================================

import type { RuntimeOmniPort } from "../../ports/runtime-omni-port.js";
import type { RuntimeTerminalPort } from "../../ports/runtime-terminal-port.js";
import type {
  PortIntelligence,
  DeviceGenome,
  AuditReport,
  NetworkTopology,
  DeepDeviceContext,
} from "../../contracts/omniscience.js";
import { createHostPingPlan } from "../../pt/terminal/standard-terminal-plans.js";
import { parseTerminalOutput } from "../../pt/terminal/terminal-output-parsers.js";
import { verifyTerminalEvidence } from "../../pt/terminal/terminal-evidence-verifier.js";

/**
 * @deprecated Usar RuntimeOmniPort directamente o a través del Orchestrator.
 * Este servicio es un wrapper legacy sin lógica propia. Será removido cuando
 * los consumidores migren a usar omniPort directamente.
 */
export class OmniscienceService {
  constructor(
    private readonly omniPort: RuntimeOmniPort,
    private readonly terminalPort?: RuntimeTerminalPort,
  ) {}

  async getDeepDeviceContext(name: string): Promise<DeepDeviceContext> {
    const genome = await this.getDeviceGenome(name);
    const portListResult = await this.omniPort.runOmniCapability(
      "omni.evaluate.raw",
      { code: `
        (function() {
            var d = n.getDevice('${name}');
            if (!d) return "";
            var p = [];
            for(var i=0; i<d.getPortCount(); i++) {
                var port = d.getPortAt(i);
                if (port) p.push(port.getName());
            }
            return p.join('|');
        })()
      ` }
    );

    const portListStr = portListResult.ok ? String(portListResult.value || "") : "";
    const realPorts = String(portListStr || "").split('|').filter(Boolean);
    if (realPorts.length > 0) genome.ports = realPorts;

    const topo = await this.getTopology();
    const interfaces: PortIntelligence[] = [];
    for (const portName of genome.ports) {
        try {
            const stats = await this.auditPort(name, portName);
            const myPortId = `${name}:${portName}`;
            const link = topo.links.find(l => l.from === myPortId || l.to === myPortId);
            if (link) stats.neighbor = link.from === myPortId ? link.to : link.from;
            interfaces.push(stats);
        } catch(e) {}
    }
    return { genome, interfaces };
  }

  async getDeviceGenome(deviceName: string): Promise<DeviceGenome> {
    const genomaResult = await this.omniPort.runOmniCapability(
      "omni.device.genoma",
      { deviceName }
    );
    if (!genomaResult.ok) throw new Error(genomaResult.error);
    const xml = String(genomaResult.value || "");

    const extract = (tag: string) => (xml.match(new RegExp(`<${tag}.*?>(.*?)<\\/${tag}>`)) || [])[1] || "";
    const extractMatch = (pattern: RegExp) => (xml.match(pattern) || [])[1] || "";

    return {
        name: extract("NAME") || deviceName,
        model: extractMatch(/model="(.*?)"/) || "Unknown",
        power: extract("POWER") === "true",
        serialNumber: extract("SERIALNUMBER") || "N/A",
        physicalLocation: { x: parseFloat(extract("GLOBALXPHYSICALWS")) || 0, y: parseFloat(extract("GLOBALYPHYSICALWS")) || 0 },
        chasis: { modules: [] },
        ios: {
            hostname: extract("HOSTNAME") || deviceName,
            version: extractMatch(/version (.*?)\n/) || "15.1",
            runningConfig: await this.getOneConfig(deviceName),
            passwords: { enable: extract("ENABLEPASSWORD"), secret: extract("ENABLESECRET") }
        },
        ports: []
    };
  }

  async auditPort(deviceName: string, portName: string): Promise<PortIntelligence> {
    const res = await this.omniPort.runOmniCapability(
      "omni.device.portStats",
      { deviceName, portName }
    );
    if (!res.ok) throw new Error(res.error);
    const s = res.value as any || {};
    return {
        name: s.name || portName,
        status: s.status === 1 ? "UP" : (s.status === 2 ? "NEGOTIATING" : "DOWN"),
        physical: { mac: s.mac || "N/A", bia: s.mac || "N/A", bandwidth: s.bandwidth || 0, duplex: s.duplex ? "Full" : "Half" },
        logical: { ip: s.ip || "0.0.0.0", mask: "255.255.255.0", ipv6: [] },
        routing: { ospfHello: s.ospf }
    };
  }

  async getTopology(): Promise<NetworkTopology> {
    const res = await this.omniPort.runOmniCapability(
      "omni.topology.physical",
      {}
    );
    if (!res.ok) return { devices: [], links: [] };
    const rawData = String(res.value || "");
    const links = rawData.split("|||").filter(Boolean).map(record => {
        if (!record.includes(":::")) return null;
        const parts = record.split(":::");
        const id = parts[0] ?? "";
        const connection = parts[1] ?? "";
        if (!id || !connection) return null;
        const [from, to] = connection.split(" <---> ");
        if (!from || !to) return null;
        return { id, from, to };
    }).filter((l): l is any => l !== null);
    return { devices: [], links };
  }

  async sendPing(sourceDevice: string, targetIp: string): Promise<{ 
    success: boolean, 
    raw: string,
    stats?: { sent: number; received: number; lost: number; lossPercent: number }
  }> {
    const plan = createHostPingPlan(sourceDevice, targetIp);
    const result = await this.terminalPort.runTerminalPlan(plan);
    
    const raw = result.output;
    const parsed = parseTerminalOutput("host.ping", raw);
    const verdict = verifyTerminalEvidence("host.ping", raw, parsed, result.status);
    
    return { 
      success: verdict.ok, 
      raw,
      stats: parsed?.facts ? {
        sent: Number(parsed.facts.sent ?? 0),
        received: Number(parsed.facts.received ?? 0),
        lost: Number(parsed.facts.lost ?? 0),
        lossPercent: Number(parsed.facts.lossPercent ?? 100),
      } : undefined
    };
  }

  async evaluate(code: string): Promise<any> {
    const res = await this.omniPort.runOmniCapability("omni.evaluate.raw", { code });
    if (!res.ok) throw new Error(res.error);
    return res.value;
  }

  async siphonAllConfigs(): Promise<Array<{ deviceName: string, config: string }>> {
    const devicesResult = await this.omniPort.runOmniCapability(
      "omni.evaluate.raw",
      { code: `
        (function() {
            var net = ipc.network();
            var count = net.getDeviceCount();
            var names = [];
            for(var i=0; i<count; i++) {
                var d = net.getDeviceAt(i);
                if (d) names.push(d.getName());
            }
            return names.join('|');
        })()
      ` }
    );
    
    const names = String(devicesResult.value || "").split('|').filter(Boolean);
    const results = [];
    for (const name of names) {
        const config = await this.getOneConfig(name);
        results.push({ deviceName: name, config });
    }
    return results;
  }

  private async getOneConfig(deviceName: string): Promise<string> {
    try {
      const res = await this.omniPort.runOmniCapability(
        "omni.assessment.read",
        { action: "getRunningConfig", deviceId: deviceName }
      );
      return res.ok ? String(res.value || "N/A") : "N/A";
    } catch(e) { return "N/A"; }
  }

  async setReality(options: any): Promise<void> {
    const res = await this.omniPort.runOmniCapability(
      "omni.environment.rules",
      { rules: options }
    );
    if (!res.ok) throw new Error(res.error);
  }
}
