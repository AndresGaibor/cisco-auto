type IOSParser = (output: string) => Record<string, unknown>;

const IOS_PARSERS: Record<string, IOSParser> = {
  "show ip interface brief": parseShowIpInterfaceBrief,
  "show vlan brief": parseShowVlanBrief,
  "show vlan": parseShowVlanBrief,
  "show ip route": parseShowIpRoute,
  "show running-config": parseShowRunningConfig,
  "show interfaces": parseShowInterfaces,
  "show ip arp": parseShowIpArp,
  "show mac address-table": parseShowMacAddressTable,
  "show spanning-tree": parseShowSpanningTree,
  "show version": parseShowVersion,
  "show cdp neighbors": parseShowCdpNeighbors,
};

export function getParser(command: string): IOSParser | null {
  const cmd = command.toLowerCase().trim();

  if (IOS_PARSERS[cmd]) {
    return IOS_PARSERS[cmd];
  }

  for (const key of Object.keys(IOS_PARSERS)) {
    if (cmd.startsWith(key.toLowerCase())) {
      return IOS_PARSERS[key];
    }
  }

  return null;
}

function parseShowIpInterfaceBrief(output: string): Record<string, unknown> {
  const interfaces: Array<Record<string, string>> = [];
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/);
    if (match && !match[1].startsWith("Interface")) {
      interfaces.push({
        interface: match[1],
        ipAddress: match[2],
        ok: match[3],
        method: match[4],
        status: match[5],
        protocol: match[6],
      });
    }
  }
  return { raw: output, interfaces };
}

function parseShowVlanBrief(output: string): Record<string, unknown> {
  const vlans: Array<Record<string, unknown>> = [];
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\d+)\s+(\S+)\s+(\S+)\s*(.*?)$/);
    if (match) {
      const ports = match[4]
        ? match[4].split(",").map((p) => p.trim()).filter((p) => p)
        : [];
      vlans.push({ id: parseInt(match[1]), name: match[2], status: match[3], ports });
    }
  }
  return { raw: output, vlans };
}

function parseShowIpRoute(output: string): Record<string, unknown> {
  const routes: Array<Record<string, unknown>> = [];
  let gatewayOfLastResort: string | null = null;

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    const gwMatch = trimmed.match(/Gateway of last resort is (.+)/i);
    if (gwMatch) {
      gatewayOfLastResort = gwMatch[1];
      continue;
    }

    const routeMatch = trimmed.match(/^([CLSORDBEIUM*])\s+(\S+)\s+(?:is\s+)?(.+)$/);
    if (routeMatch) {
      const route: Record<string, unknown> = {
        type: routeMatch[1],
        network: routeMatch[2],
        nextHop: null,
        interface: null,
      };
      const rest = routeMatch[3];
      if (rest.indexOf("directly connected") >= 0) {
        const ifaceMatch = rest.match(/connected,?\s*(\S+)/);
        if (ifaceMatch) route.interface = ifaceMatch[1];
      } else if (rest.indexOf("via") >= 0) {
        const viaMatch = rest.match(/via\s+(\S+)/);
        if (viaMatch) route.nextHop = viaMatch[1].replace(",", "");
      }
      routes.push(route);
    }
  }

  return { raw: output, routes, gatewayOfLastResort };
}

function parseShowRunningConfig(output: string): Record<string, unknown> {
  const sections: Record<string, string> = {};
  const interfaces: Record<string, string> = {};
  const currentContent: string[] = [];
  let currentSection: string | null = null;
  let hostname: string | null = null;

  for (const line of output.split("\n")) {
    if (line.startsWith("hostname ")) hostname = line.substring(9).trim();

    if (line.startsWith("!")) {
      if (currentSection) sections[currentSection] = currentContent.join("\n");
      currentSection = null;
      currentContent.length = 0;
    } else if (line.startsWith("interface ")) {
      currentSection = line.trim();
      currentContent.push(line);
      interfaces[line.substring(10).trim()] = "";
    } else if (line.startsWith("vlan ") || line.startsWith("router ")) {
      currentSection = line.trim();
      currentContent.push(line);
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  return { raw: output, hostname, sections, interfaces };
}

function parseShowInterfaces(output: string): Record<string, unknown> {
  const interfaces: Array<Record<string, unknown>> = [];
  let current: Record<string, unknown> | null = null;

  for (const line of output.split("\n")) {
    const ifaceMatch = line.match(/^(\S+)\s+is\s+(\S+),\s+line protocol is (\S+)/);
    if (ifaceMatch) {
      if (current) interfaces.push(current);
      current = { name: ifaceMatch[1], status: ifaceMatch[2], protocol: ifaceMatch[3] };
    }

    if (current) {
      if (line.startsWith("  Hardware is ")) current.hardware = line.substring(14).trim();
      if (line.startsWith("  Description: ")) current.description = line.substring(15).trim();
      if (line.startsWith("  Internet address is ")) {
        const ipMatch = line.match(/Internet address is (\S+)/);
        if (ipMatch) {
          const parts = ipMatch[1].split("/");
          current.ipAddress = parts[0];
          if (parts[1]) current.cidr = parseInt(parts[1]);
        }
      }
    }
  }

  if (current) interfaces.push(current);
  return { raw: output, interfaces };
}

function parseShowIpArp(output: string): Record<string, unknown> {
  const entries: Array<Record<string, string>> = [];
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(Internet)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/i);
    if (match) {
      entries.push({ protocol: match[1], address: match[2], age: match[3], mac: match[4], type: match[5], interface: match[6] });
    }
  }
  return { raw: output, entries };
}

function parseShowMacAddressTable(output: string): Record<string, unknown> {
  const entries: Array<Record<string, unknown>> = [];
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\S+)\s+([0-9a-fA-F.]+)\s+(\S+)\s+(\S+)$/);
    if (match) {
      entries.push({ vlan: match[1], macAddress: match[2], type: match[3].toLowerCase(), ports: [match[4]] });
    }
  }
  return { raw: output, entries };
}

function parseShowSpanningTree(output: string): Record<string, unknown> {
  const vlans: Array<Record<string, unknown>> = [];
  let current: Record<string, unknown> | null = null;

  for (const line of output.split("\n")) {
    const vlanMatch = line.match(/^VLAN(\d+)/);
    if (vlanMatch) {
      if (current) vlans.push(current);
      current = { vlan: parseInt(vlanMatch[1]), interfaces: [] };
    }

    if (current) {
      if (line.startsWith("  Root ID")) current.rootBridgeId = line.substring(10).trim();
      if (line.startsWith("  Bridge ID")) current.bridgeId = line.substring(12).trim();
      const ifaceMatch = line.match(/^\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(\S+)/);
      if (ifaceMatch) {
        (current.interfaces as Array<Record<string, unknown>>).push({
          port: ifaceMatch[1],
          role: ifaceMatch[2].toLowerCase(),
          state: ifaceMatch[3].toLowerCase(),
          cost: parseInt(ifaceMatch[4]),
        });
      }
    }
  }

  if (current) vlans.push(current);
  return { raw: output, vlans };
}

function parseShowVersion(output: string): Record<string, unknown> {
  const result: Record<string, unknown> = { raw: output };
  for (const line of output.split("\n")) {
    if (line.includes("Version ")) {
      const vMatch = line.match(/Version (\S+)/);
      if (vMatch) result.version = vMatch[1];
    }
    if (line.includes(" uptime is ")) result.uptime = line.substring(line.indexOf(" uptime is ") + 11);
    const uptimeMatch = line.match(/^(\S+)\s+uptime is /);
    if (uptimeMatch) result.hostname = uptimeMatch[1];
  }
  return result;
}

function parseShowCdpNeighbors(output: string): Record<string, unknown> {
  const neighbors: Array<Record<string, unknown>> = [];
  let started = false;

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.includes("Device ID")) {
      started = true;
      continue;
    }
    if (!started || !trimmed) continue;

    const parts = trimmed.split(/\s+/);
    if (parts.length >= 6) {
      neighbors.push({
        deviceId: parts[0],
        localInterface: parts[1],
        holdtime: parseInt(parts[2]),
        capability: parts[3],
        platform: parts[4],
        portId: parts[5],
      });
    }
  }

  return { raw: output, neighbors };
}
