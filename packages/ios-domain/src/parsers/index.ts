import type {
  ShowIpInterfaceBrief,
  ShowVlan,
  ShowIpRoute,
  ShowRunningConfig,
  ShowInterfaces,
  ShowIpArp,
  ShowMacAddressTable,
  ShowSpanningTree,
  ShowVersion,
  ShowCdpNeighbors,
  ParsedOutput,
} from "@cisco-auto/types";

// ============================================================================
// IOS Output Parsers
// ============================================================================

/**
 * Parse "show ip interface brief" output
 */
export function parseShowIpInterfaceBrief(output: string): ShowIpInterfaceBrief {
  const lines = output.split("\n");
  const interfaces: ShowIpInterfaceBrief["interfaces"] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Match: Interface IP-Address OK? Method Status Protocol
    // Status can be "administratively down" (2 words), "up", or "down"
    const match = trimmed.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+((?:administratively\s+)?(?:up|down))\s+(up|down)$/i);
    
    if (match && !match[1]!.startsWith("Interface")) {
      interfaces.push({
        interface: match[1]!,
        ipAddress: match[2]!,
        ok: match[3]!,
        method: match[4]!,
        status: match[5]!.trim() as "up" | "down" | "administratively down",
        protocol: match[6]! as "up" | "down",
      });
    }
  }

  return { raw: output, interfaces };
}

/**
 * Parse "show vlan brief" or "show vlan" output
 */
export function parseShowVlan(output: string): ShowVlan {
  const lines = output.split("\n");
  const vlans: ShowVlan["vlans"] = [];
  let currentVlan: ShowVlan["vlans"][0] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Match: VLAN Name Status Ports
    // Example: 1 default active Fa0/1, Fa0/2, Gi0/1
    const match = trimmed.match(/^(\d+)\s+(\S+)\s+(\S+)\s*(.*?)$/);
    
    if (match && !match[1]!.startsWith("VLAN")) {
      const portsStr = match[4] || "";
      const ports = portsStr
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      currentVlan = {
        id: parseInt(match[1]!, 10),
        name: match[2]!,
        status: match[3]! as "active" | "suspended" | "act/unsup",
        ports,
      };
      vlans.push(currentVlan);
    } else if (currentVlan && line.match(/^\s+[FGS]/)) {
      // Continuation line with additional ports
      const ports = trimmed.split(",").map(p => p.trim()).filter(Boolean);
      currentVlan.ports.push(...ports);
    } else if (!line.match(/^\s/) || line.trim().length === 0) {
      currentVlan = null;
    }
  }

  return { raw: output, vlans };
}

/**
 * Parse "show ip route" output
 */
export function parseShowIpRoute(output: string): ShowIpRoute {
  const lines = output.split("\n");
  const routes: ShowIpRoute["routes"] = [];
  let gatewayOfLastResort: string | undefined;

  // Route type legend
  const typeMap: Record<string, ShowIpRoute["routes"][0]["type"]> = {
    C: "C", L: "L", S: "S", R: "R", O: "O", D: "D", B: "B", E: "E", I: "I", M: "M", U: "U", "*": "*",
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Gateway of last resort
    const gwMatch = trimmed.match(/Gateway of last resort is (.+)/i);
    if (gwMatch) {
      gatewayOfLastResort = gwMatch[1];
      continue;
    }

    // Route entry
    // Examples:
    // C    192.168.1.0/24 is directly connected, GigabitEthernet0/0
    // S    0.0.0.0/0 [1/0] via 192.168.1.1
    // O IA 10.0.2.0/24 [110/2] via 192.168.1.1
    // D EX 10.0.3.0/24 [170/2816] via 192.168.1.2
    const routeMatch = trimmed.match(/^([A-Z*](?:\s+[A-Z*]+)?)\s+(\S+)(?:\s+\[(\d+)\/(\d+)\])?\s*(.*)/);
    
    if (routeMatch) {
      const typeChar = routeMatch[1]!.trim();
      const network = routeMatch[2]!;
      const adminDist = routeMatch[3] ? parseInt(routeMatch[3], 10) : undefined;
      const metric = routeMatch[4] ? parseInt(routeMatch[4], 10) : undefined;
      const rest = routeMatch[5] || "";

      const route: ShowIpRoute["routes"][0] = {
        type: typeMap[typeChar.split(/\s+/)[0]!] || "C",
        network,
        administrativeDistance: adminDist,
        metric,
        nextHop: undefined,
        interface: undefined,
      };

      // Parse rest
      if (rest.includes("directly connected")) {
        const ifaceMatch = rest.match(/connected,?\s*(\S+)/);
        if (ifaceMatch) {
          route.interface = ifaceMatch[1];
        }
      } else if (rest.includes("via")) {
        const viaMatch = rest.match(/via\s+(\S+)/);
        if (viaMatch) {
          route.nextHop = viaMatch[1]!.replace(",", "");
        }

        // Interface after comma
        const ifaceMatch = rest.match(/,\s*(\S+)/);
        if (ifaceMatch) {
          route.interface = ifaceMatch[1];
        }
      }

      routes.push(route);
    }
  }

  return { raw: output, routes, gatewayOfLastResort };
}

/**
 * Parse "show running-config" output
 */
export function parseShowRunningConfig(output: string): ShowRunningConfig {
  const lines = output.split("\n");
  const sections: ShowRunningConfig["sections"] = [];
  const interfaces: ShowRunningConfig["interfaces"] = {};
  
  let hostname: string | undefined;
  let currentSection: string | undefined;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Hostname
    if (line.startsWith("hostname ")) {
      hostname = line.substring(9).trim();
    }

    // Section start
    if (line.startsWith("interface ") || 
        line.startsWith("vlan ") || 
        line.startsWith("router ") ||
        line.startsWith("ip access-list ") ||
        line.startsWith("line ")) {
      
      // Save previous section
      if (currentSection) {
        sections.push({
          section: currentSection,
          content: currentContent.join("\n"),
        });
      }

      currentSection = line.trim();
      currentContent = [line];

      // Track interfaces
      if (line.startsWith("interface ")) {
        interfaces[line.substring(10).trim()] = "";
      }
    } else if (currentSection) {
      currentContent.push(line);
    }

    // Section end
    if (line === "!" && currentSection) {
      sections.push({
        section: currentSection,
        content: currentContent.join("\n"),
      });
      currentSection = undefined;
      currentContent = [];
    }
  }

  // Final section
  if (currentSection && currentContent.length > 0) {
    sections.push({
      section: currentSection,
      content: currentContent.join("\n"),
    });
  }

  // Populate interface configs
  for (const section of sections) {
    if (section.section.startsWith("interface ")) {
      const name = section.section.substring(10);
      interfaces[name] = section.content;
    }
  }

  return {
    raw: output,
    hostname,
    sections,
    interfaces,
  };
}

/**
 * Parse "show interfaces" output
 */
export function parseShowInterfaces(output: string): ShowInterfaces {
  const lines = output.split("\n");
  const interfaces: ShowInterfaces["interfaces"] = [];
  
  let current: ShowInterfaces["interfaces"][0] | null = null;

  for (const line of lines) {
    // New interface: GigabitEthernet0/0 is up, line protocol is up
    const ifaceMatch = line.match(/^(\S+)\s+is\s+(\S+),\s+line protocol is (\S+)/);
    
    if (ifaceMatch) {
      if (current) {
        interfaces.push(current);
      }
      current = {
        name: ifaceMatch[1]!,
        status: ifaceMatch[2]!,
        protocol: ifaceMatch[3]!,
      };
      continue;
    }

    if (!current) continue;

    // Hardware
    if (line.includes("Hardware is")) {
      current.hardware = line.match(/Hardware is (.+)/)?.[1]?.trim();
    }

    // Description
    if (line.includes("Description:")) {
      current.description = line.match(/Description: (.+)/)?.[1]?.trim();
    }

    // IP address
    if (line.includes("Internet address is")) {
      const ipMatch = line.match(/Internet address is (\S+)/);
      if (ipMatch) {
        const [ip, cidr] = ipMatch[1]!.split("/");
        current.ipAddress = ip;
        if (cidr) {
          current.subnetMask = cidrToMask(parseInt(cidr, 10));
        }
      }
    }

    // MTU
    if (line.includes("MTU")) {
      current.mtu = parseInt(line.match(/MTU (\d+)/)?.[1] || "0", 10);
    }

    // Bandwidth
    if (line.includes("BW")) {
      current.bandwidth = parseInt(line.match(/BW (\d+)/)?.[1] || "0", 10);
    }
  }

  if (current) {
    interfaces.push(current);
  }

  return { raw: output, interfaces };
}

/**
 * Parse "show ip arp" output
 */
export function parseShowIpArp(output: string): ShowIpArp {
  const lines = output.split("\n");
  const entries: ShowIpArp["entries"] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Protocol Address Age (min) Hardware Addr Type Interface
    // Internet 192.168.1.1 0 0050.56be.6b49 ARPA GigabitEthernet0/0
    const match = trimmed.match(/^(\S+)\s+(\S+)\s+(\S+)\s+([0-9a-fA-F.]+)\s+(\S+)\s+(\S+)$/);
    
    if (match && match[1] !== "Protocol" && match[1] !== "Internet") {
      entries.push({
        protocol: match[1]!,
        address: match[2]!,
        age: match[3]!,
        mac: match[4]!,
        type: match[5]! as "ARPA" | "SNAP" | "Other",
        interface: match[6]!,
      });
    }
  }

  return { raw: output, entries };
}

/**
 * Parse "show mac address-table" output
 */
export function parseShowMacAddressTable(output: string): ShowMacAddressTable {
  const lines = output.split("\n");
  const entries: ShowMacAddressTable["entries"] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Vlan Mac Address Type Ports
    // 1 0050.56be.6b49 DYNAMIC Gi0/0
    const match = trimmed.match(/^(\S+)\s+([0-9a-fA-F.]+)\s+(\S+)\s+(\S+)$/);
    
    if (match && match[1] !== "Vlan") {
      entries.push({
        vlan: match[1]!,
        macAddress: match[2]!,
        type: match[3]!.toLowerCase() as "dynamic" | "static" | "secure" | "self",
        ports: [match[4]!],
      });
    }
  }

  return { raw: output, entries };
}

/**
 * Parse "show spanning-tree" output
 */
export function parseShowSpanningTree(output: string): ShowSpanningTree {
  const lines = output.split("\n");
  const vlans: ShowSpanningTree["vlans"] = [];
  
  let current: ShowSpanningTree["vlans"][0] | null = null;

  for (const line of lines) {
    // VLAN start: VLAN0001
    const vlanMatch = line.match(/^VLAN(\d+)/);
    
    if (vlanMatch) {
      if (current) {
        vlans.push(current);
      }
      current = {
        vlan: parseInt(vlanMatch[1]!, 10),
        bridgeId: "",
        rootBridge: false,
        interfaces: [],
      };
      continue;
    }

    if (!current) continue;

    // Bridge ID
    if (line.includes("Bridge ID")) {
      current.bridgeId = line.match(/Bridge ID\s+(.+)/)?.[1]?.trim() || "";
    }

    // Root ID (if present and different, not root bridge)
    if (line.includes("Root ID")) {
      current.rootBridgeId = line.match(/Root ID\s+(.+)/)?.[1]?.trim();
      // Check if this bridge IS the root by comparing Bridge ID and Root ID
      current.rootBridge = current.bridgeId === current.rootBridgeId;
    }

    // Also check for explicit "This bridge is the root" statement
    if (line.includes("This bridge is the root")) {
      current.rootBridge = true;
    }

    // Interface line: Fa0/1 root FWD 19 128.1 P2p
    const ifaceMatch = line.match(/^\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(\S+)/);
    
    if (ifaceMatch) {
      current.interfaces.push({
        port: ifaceMatch[1]!,
        role: ifaceMatch[2]!.toLowerCase() as ShowSpanningTree["vlans"][0]["interfaces"][0]["role"],
        state: ifaceMatch[3]!.toLowerCase() as ShowSpanningTree["vlans"][0]["interfaces"][0]["state"],
        cost: parseInt(ifaceMatch[4]!, 10),
        priority: parseInt(ifaceMatch[5]!.split(".")[0]!, 10),
      });
    }
  }

  if (current) {
    vlans.push(current);
  }

  return { raw: output, vlans };
}

/**
 * Parse "show version" output
 */
export function parseShowVersion(output: string): ShowVersion {
  const result: ShowVersion = { raw: output };
  const lines = output.split("\n");

  for (const line of lines) {
    if (line.includes("Version")) {
      result.version = line.match(/Version (\S+)/)?.[1];
    }

    if (line.includes(" uptime is ")) {
      result.uptime = line.substring(line.indexOf(" uptime is ") + 11).trim();
    }

    // Hostname is first word before " uptime"
    const hostMatch = line.match(/^(\S+)\s+uptime is/);
    if (hostMatch) {
      result.hostname = hostMatch[1]!;
    }

    if (line.includes("image:")) {
      result.image = line.match(/image: (\S+)/)?.[1];
    }

    if (line.includes("processor")) {
      result.processor = line.match(/(.+) processor/)?.[1]?.trim();
    }

    if (line.includes("Configuration register")) {
      result.configRegister = line.match(/Configuration register is (\S+)/)?.[1];
    }
  }

  return result;
}

/**
 * Parse "show cdp neighbors" output
 */
export function parseShowCdpNeighbors(output: string): ShowCdpNeighbors {
  const lines = output.split("\n");
  const neighbors: ShowCdpNeighbors["neighbors"] = [];
  let started = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip header
    if (trimmed.startsWith("Device ID")) {
      started = true;
      continue;
    }

    if (!started || !trimmed) continue;

    // Device ID Local Intrfce Holdtme Capability Platform Port ID
    // Capability can be multiple tokens like "R S" or "R S I"
    const match = trimmed.match(/^(\S+)\s+(\S+)\s+(\d+)\s+((?:[A-Z]\s*)+)\s+(\S+)\s+(\S+)$/);
    
    if (match) {
      neighbors.push({
        deviceId: match[1]!,
        localInterface: match[2]!,
        holdtime: parseInt(match[3]!, 10),
        capability: match[4]!.trim(),
        platform: match[5]!,
        portId: match[6]!,
      });
    }
  }

  return { raw: output, neighbors };
}

// ============================================================================
// Parser Registry
// ============================================================================

export type ParserCommand = 
  | "show ip interface brief"
  | "show interfaces"
  | "show vlan brief"
  | "show vlan"
  | "show ip route"
  | "show running-config"
  | "show ip arp"
  | "show mac address-table"
  | "show spanning-tree"
  | "show version"
  | "show cdp neighbors";

export const PARSERS: Record<string, (output: string) => ParsedOutput> = {
  "show ip interface brief": parseShowIpInterfaceBrief,
  "show interfaces": parseShowInterfaces,
  "show vlan brief": parseShowVlan,
  "show vlan": parseShowVlan,
  "show ip route": parseShowIpRoute,
  "show running-config": parseShowRunningConfig,
  "show ip arp": parseShowIpArp,
  "show mac address-table": parseShowMacAddressTable,
  "show spanning-tree": parseShowSpanningTree,
  "show version": parseShowVersion,
  "show cdp neighbors": parseShowCdpNeighbors,
};

/**
 * Get parser for a command
 */
export function getParser(command: string): ((output: string) => ParsedOutput) | null {
  const cmd = command.toLowerCase().trim();

  // Direct match
  if (PARSERS[cmd]) {
    return PARSERS[cmd];
  }

  // Partial match
  for (const [key, parser] of Object.entries(PARSERS)) {
    if (cmd.startsWith(key.toLowerCase())) {
      return parser;
    }
  }

  return null;
}

/**
 * Parse IOS command output
 */
export function parseOutput(command: string, output: string): ParsedOutput | null {
  const parser = getParser(command);
  return parser ? parser(output) : null;
}

// ============================================================================
// Utilities
// ============================================================================

function cidrToMask(cidr: number): string {
  const mask: number[] = [];
  for (let i = 0; i < 4; i++) {
    const bits = Math.min(8, Math.max(0, cidr - i * 8));
    mask.push(256 - Math.pow(2, 8 - bits));
  }
  return mask.join(".");
}
