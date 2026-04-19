// ============================================================================
// Omniscience Service V12 - Migrado a RuntimeOmniPort
// delegacion pura al adapter, sin ejecutores directos
// ============================================================================

import type { RuntimeOmniPort } from "../../ports/runtime-omni-port.js";
import type {
    PortIntelligence, DeviceGenome,
    AuditReport, NetworkTopology,
    DeepDeviceContext
} from "../../contracts/omniscience.js";

export class OmniscienceService {
  constructor(private readonly omniPort: RuntimeOmniPort) {}

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

  async sendPing(sourceDevice: string, targetIp: string): Promise<{ success: boolean, raw: string }> {
    const res = await this.omniPort.runOmniCapability(
      "omni.evaluate.raw",
      { code: `
        (function() {
          var net = ipc.network();
          var dev = net.getDevice('${sourceDevice}');
          if (!dev) return { error: 'Device not found' };
          var term = dev.getTerminal ? dev.getTerminal() : null;
          if (!term) return { error: 'No terminal' };
          term.clear();
          term.sendText('ping ${targetIp}\\n');
          return { sent: true };
        })()
      ` }
    );

    if (!res.ok) return { success: false, raw: "Error en OmniPort: " + res.error };

    await new Promise(r => setTimeout(r, 3000));

    const pollResult = await this.omniPort.runOmniCapability(
      "omni.evaluate.raw",
      { code: `
        (function() {
          var net = ipc.network();
          var dev = net.getDevice('${sourceDevice}');
          if (!dev) return '';
          var term = dev.getTerminal ? dev.getTerminal() : null;
          if (!term) return '';
          return term.getOutput ? term.getOutput() : '';
        })()
      ` }
    );

    const raw = pollResult.ok ? String(pollResult.value || "") : "";
    const success = raw.includes("Reply from") || raw.includes("!!!!") || (raw.includes("Success rate") && !raw.includes("0 percent"));
    return { success, raw };
  }

  async evaluate(code: string): Promise<any> {
    const res = await this.omniPort.runOmniCapability("omni.evaluate.raw", { code });
    if (!res.ok) throw new Error(res.error);
    return res.value;
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