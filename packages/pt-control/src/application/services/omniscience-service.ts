// ============================================================================
// Omniscience Service V11 - THE ULTIMATE ORCHESTRATOR
// Fixed: Reliable port discovery and Terminal-based Ping with Output Capture.
// ============================================================================

import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { 
    PhysicalLink, PortIntelligence, DeviceGenome,
    AuditReport, EnvironmentRules, NetworkTopology, 
    ProcessState, DesktopApp, DeepDeviceContext
} from "../../contracts/omniscience.js";

export class OmniscienceService {
  constructor(private readonly bridge: FileBridgePort) {}

  async getDeepDeviceContext(name: string): Promise<DeepDeviceContext> {
    const genome = await this.getDeviceGenome(name);
    const portListStr = await this.evaluate(`
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
    `);
    
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
    const xmlRes = await this.bridge.sendCommandAndWait("getNetworkGenoma", { deviceName });
    if (!xmlRes.ok) throw new Error(xmlRes.error);
    const xml = String((xmlRes.value as any)?.result || "");
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
    const res = await this.bridge.sendCommandAndWait("getPortDeepStats", { deviceName, portName });
    if (!res.ok) throw new Error(res.error);
    const s = (res.value as any)?.result || {};
    return {
        name: s.name || portName,
        status: s.status === 1 ? "UP" : (s.status === 2 ? "NEGOTIATING" : "DOWN"),
        physical: { mac: s.mac || "N/A", bia: s.mac || "N/A", bandwidth: s.bandwidth || 0, duplex: s.duplex ? "Full" : "Half" },
        logical: { ip: s.ip || "0.0.0.0", mask: "255.255.255.0", ipv6: [] },
        routing: { ospfHello: s.ospf }
    };
  }

  async getTopology(): Promise<NetworkTopology> {
    const res = await this.bridge.sendCommandAndWait("siphonPhysicalTopology", {});
    if (!res.ok) return { devices: [], links: [] };
    const rawData = (res.value as any)?.result || "";
    const links = String(rawData).split("|||").filter(Boolean).map(record => {
        if (!record.includes(":::")) return null;
        const [id, connection] = record.split(":::");
        const [from, to] = connection.split(" <---> ");
        return { id, from, to };
    }).filter((l): l is any => l !== null);
    return { devices: [], links };
  }

  async sendPing(sourceDevice: string, targetIp: string): Promise<{ success: boolean, raw: string }> {
    const res = await this.bridge.sendCommandAndWait<any>("__ping", { 
        device: sourceDevice, 
        target: targetIp 
    });
    
    if (!res.ok) return { success: false, raw: "Error en el Bridge: " + res.error };

    if (res.deferred && res.ticket) {
        let done = false;
        let pollRes;
        while (!done) {
            await new Promise(r => setTimeout(r, 1000));
            pollRes = await this.bridge.sendCommandAndWait<any>("__pollDeferred", { ticket: res.ticket });
            if (!pollRes || !pollRes.ok || pollRes.done) done = true;
        }
        if (pollRes && pollRes.ok) {
            const raw = String(pollRes.raw || "");
            const success = raw.includes("Reply from") || raw.includes("!!!!") || (raw.includes("Success rate") && !raw.includes("0 percent"));
            return { success, raw };
        }
    }
    return { success: !!(res.value && (res.value as any).success === true), raw: "Resultado instantáneo (sin terminal)" };
  }

  async evaluate(code: string): Promise<any> {
    const res = await this.bridge.sendCommandAndWait("__evaluate", { code });
    if (!res.ok) throw new Error(res.error);
    return (res.value as any)?.result;
  }

  private async getOneConfig(deviceName: string): Promise<string> {
    try {
      const res = await this.evaluate("global.AssessmentModel.getRunningConfig('" + deviceName + "')");
      return String(res || "N/A");
    } catch(e) { return "N/A"; }
  }

  async setReality(options: any): Promise<void> {
    await this.bridge.sendCommandAndWait("setEnvironmentRules", options);
  }
}
