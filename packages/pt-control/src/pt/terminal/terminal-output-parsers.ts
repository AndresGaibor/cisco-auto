export interface ParsedTerminalEvidence {
  parserId: string;
  facts: Record<string, unknown>;
}

function linesOf(raw: string): string[] {
  return String(raw ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function parseIosShowVersion(raw: string): ParsedTerminalEvidence {
  const lines = linesOf(raw);
  const facts: Record<string, unknown> = {};

  const versionLine = lines.find((line) => /version/i.test(line));
  const uptimeLine = lines.find((line) => /uptime is/i.test(line));
  const imageLine = lines.find((line) => /system image file is/i.test(line));

  if (versionLine) facts.versionLine = versionLine;
  if (uptimeLine) facts.uptimeLine = uptimeLine;
  if (imageLine) facts.systemImage = imageLine;

  facts.hasCiscoBanner = lines.some((line) => /cisco/i.test(line));
  facts.lineCount = lines.length;

  return {
    parserId: "ios.show-version",
    facts,
  };
}

export function parseIosShowRunningConfig(raw: string): ParsedTerminalEvidence {
  const text = String(raw ?? "");
  const lines = linesOf(text);

  const hostnameLine = lines.find((line) => /^hostname\s+/i.test(line));
  const interfaceLines = lines.filter((line) => /^interface\s+/i.test(line));
  const vlanLines = lines.filter((line) => /^vlan\s+\d+/i.test(line));
  const routerLines = lines.filter((line) => /^router\s+/i.test(line));

  return {
    parserId: "ios.show-running-config",
    facts: {
      hasVersionHeader: /Building configuration/i.test(text),
      hostnameLine: hostnameLine ?? null,
      interfaceCount: interfaceLines.length,
      vlanCount: vlanLines.length,
      routingSectionCount: routerLines.length,
      lineCount: lines.length,
    },
  };
}

export function parseIosShowIpInterfaceBrief(raw: string): ParsedTerminalEvidence {
  const lines = linesOf(raw);
  const interfaces: Array<Record<string, string>> = [];

  for (const line of lines) {
    if (
      /^interface/i.test(line) ||
      /^-+/.test(line) ||
      /^show ip interface brief/i.test(line)
    ) {
      continue;
    }

    const match = line.match(
      /^(\S+)\s+(\S+)\s+\S+\s+\S+\s+(\S+)\s+(\S+)$/i,
    );

    if (match) {
      interfaces.push({
        interface: match[1]!,
        ipAddress: match[2]!,
        status: match[3]!,
        protocol: match[4]!,
      });
    }
  }

  return {
    parserId: "ios.show-ip-interface-brief",
    facts: {
      interfaces,
      interfaceCount: interfaces.length,
      upCount: interfaces.filter((item) => /up/i.test(item.status) && /up/i.test(item.protocol)).length,
    },
  };
}

export function parseIosShowVlanBrief(raw: string): ParsedTerminalEvidence {
  const lines = linesOf(raw);
  const vlans: Array<Record<string, unknown>> = [];

  for (const line of lines) {
    if (
      /^vlan/i.test(line) ||
      /^----/.test(line) ||
      /^show vlan/i.test(line)
    ) {
      continue;
    }

    const match = line.match(/^(\d+)\s+(\S+)\s+(\S+)\s*(.*)$/i);
    if (match) {
      const ports = match[4] ? match[4].split(",").map((p) => p.trim()).filter(Boolean) : [];
      vlans.push({
        vlanId: Number(match[1]!),
        name: match[2]!,
        status: match[3]!,
        ports,
      });
    }
  }

  return {
    parserId: "ios.show-vlan-brief",
    facts: {
      vlans,
      vlanCount: vlans.length,
    },
  };
}

export function parseIosShowCdpNeighbors(raw: string): ParsedTerminalEvidence {
  const lines = linesOf(raw);
  const neighbors: Array<Record<string, string>> = [];

  for (const line of lines) {
    if (
      /^device id/i.test(line) ||
      /^-+/.test(line) ||
      /^show cdp neighbors/i.test(line)
    ) {
      continue;
    }

    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length >= 4) {
      const capIdx = parts.length - 2;
      const platIdx = parts.length - 1;
      neighbors.push({
        deviceId: parts[0]!,
        localInterface: parts[1]!,
        capability: parts[capIdx]!,
        platform: parts[platIdx]!,
      });
    }
  }

  return {
    parserId: "ios.show-cdp-neighbors",
    facts: {
      neighbors,
      neighborCount: neighbors.length,
    },
  };
}

export function parseHostIpconfig(raw: string): ParsedTerminalEvidence {
  const lines = linesOf(raw);
  const facts: Record<string, unknown> = {
    hasIPv4: false,
    hasSubnetMask: false,
    interfaces: [] as any[],
  };

  const ipv4Line = lines.find((line) => /ip(v4)? address/i.test(line));
  const subnetLine = lines.find((line) => /subnet mask/i.test(line));
  const gatewayLine = lines.find((line) => /default gateway/i.test(line));
  const dnsLine = lines.find((line) => /dns server/i.test(line));

  if (ipv4Line) {
    const val = ipv4Line.split(":")[1]?.trim();
    if (val && val !== "0.0.0.0") facts.hasIPv4 = true;
  }
  if (subnetLine) {
    const val = subnetLine.split(":")[1]?.trim();
    if (val && val !== "0.0.0.0") facts.hasSubnetMask = true;
  }

  return {
    parserId: "host.ipconfig",
    facts: {
      hasIPv4: facts.hasIPv4,
      hasSubnetMask: facts.hasSubnetMask,
      hasDefaultGateway: Boolean(gatewayLine),
      hasDnsServer: Boolean(dnsLine),
      ipv4Line: ipv4Line ?? null,
      subnetMaskLine: subnetLine ?? null,
      defaultGatewayLine: gatewayLine ?? null,
      dnsServerLine: dnsLine ?? null,
      lineCount: lines.length,
    },
  };
}

export function parseHostPing(raw: string): ParsedTerminalEvidence {
  const text = String(raw ?? "");
  const lines = linesOf(text);

  const successReplies = lines.filter((line) => /reply from/i.test(line)).length;
  const timeoutReplies = lines.filter((line) => /request timed out/i.test(line)).length;
  const unreachableReplies = lines.filter((line) => /unreachable/i.test(line)).length;
  const statsLine = lines.find((line) => /packets: sent/i.test(line) || /lost =/i.test(line));

  const stats: Record<string, number> = {
    sent: 0,
    received: 0,
    lost: 0,
    lossPercent: 100,
  };

  if (statsLine) {
    // Ejemplo: Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),
    const match = statsLine.match(/Sent\s*=\s*(\d+),\s*Received\s*=\s*(\d+),\s*Lost\s*=\s*(\d+)\s*\((\d+)%/i);
    if (match) {
      stats.sent = parseInt(match[1]!, 10);
      stats.received = parseInt(match[2]!, 10);
      stats.lost = parseInt(match[3]!, 10);
      stats.lossPercent = parseInt(match[4]!, 10);
    }
  }

  // Si no hay líneas de "Reply from" pero el resumen dice que se recibieron paquetes, 
  // confiamos en el resumen (caso donde el buffer solo capturó las estadísticas).
  const effectiveSuccessCount = Math.max(successReplies, stats.received);

  return {
    parserId: "host.ping",
    facts: {
      successReplies: effectiveSuccessCount,
      timeoutReplies,
      unreachableReplies,
      hasStatistics: Boolean(statsLine),
      statsLine: statsLine ?? null,
      ...stats,
      lineCount: lines.length,
    },
  };
}

export function parseHostTracert(raw: string): ParsedTerminalEvidence {
  const lines = linesOf(raw);
  const hops: Array<Record<string, unknown>> = [];

  for (const line of lines) {
    if (
      /^tracing|^routing|^packets|^traceroute|^over|^maximum|^hops|^timeout|^reply|^request/i.test(line)
    ) {
      continue;
    }

    const hopMatch = line.match(/^\s*(\d+)\s+(\S+)\s+(.+)/i);
    if (hopMatch) {
      hops.push({
        hop: Number(hopMatch[1]!),
        address: hopMatch[2]!,
        latency: hopMatch[3]!,
      });
    }
  }

  return {
    parserId: "host.tracert",
    facts: {
      hops,
      hopCount: hops.length,
      lineCount: lines.length,
    },
  };
}

export function parseHostArp(raw: string): ParsedTerminalEvidence {
  const lines = linesOf(raw);
  const entries: Array<Record<string, unknown>> = [];

  for (const line of lines) {
    if (/^interface|^internet|^ethernet|^dhcp|^static/i.test(line) || line.trim() === "") {
      continue;
    }

    const match = line.match(/^(\d{1,3}(?:\.\d{1,3}){3})\s+([0-9a-fA-F]{4}(?:\.[0-9a-fA-F]{4}){2})\s+(\S+)/i);
    if (match) {
      entries.push({
        internet: match[1]!,
        mac: match[2]!,
        type: match[3]!,
      });
    }
  }

  return {
    parserId: "host.arp",
    facts: {
      entries,
      entryCount: entries.length,
      lineCount: lines.length,
    },
  };
}

export function parseHostNslookup(raw: string): ParsedTerminalEvidence {
  const lines = linesOf(raw);
  const facts: Record<string, unknown> = {};

  const serverLine = lines.find((l) => /^Server:/i.test(l));
  const addressLine = lines.find((l) => /^Address:/i.test(l));
  const nameLine = lines.find((l) => /^Name:/i.test(l));
  const resultAddressLine = lines.find((l, i) => i > 0 && /^Address:/i.test(l) && l !== addressLine);

  if (serverLine) facts.dnsServer = serverLine.split(":")[1]?.trim();
  if (addressLine) facts.dnsServerAddress = addressLine.split(":")[1]?.trim();
  if (nameLine) facts.resolvedName = nameLine.split(":")[1]?.trim();
  if (resultAddressLine) facts.resolvedAddress = resultAddressLine.split(":")[1]?.trim();

  facts.hasTimeout = lines.some((l) => /timed out/i.test(l));
  facts.hasError = lines.some((l) => /Can't find|non-existent/i.test(l));

  return {
    parserId: "host.nslookup",
    facts,
  };
}

export function parseHostNetstat(raw: string): ParsedTerminalEvidence {
  const lines = linesOf(raw);
  const connections: Array<Record<string, string>> = [];

  for (const line of lines) {
    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length >= 3 && (parts[0] === "TCP" || parts[0] === "UDP")) {
      connections.push({
        proto: parts[0]!,
        localAddress: parts[1]!,
        foreignAddress: parts[2]!,
        state: parts[3] || "",
      });
    }
  }

  return {
    parserId: "host.netstat",
    facts: {
      connections,
      connectionCount: connections.length,
      listeningCount: connections.filter((c) => /LISTENING/i.test(c.state)).length,
      establishedCount: connections.filter((c) => /ESTABLISHED/i.test(c.state)).length,
      hasEstablished: connections.some((c) => /ESTABLISHED/i.test(c.state)),
    },
  };
}

export function parseHostHistory(raw: string): ParsedTerminalEvidence {
  const text = String(raw ?? "");
  
  // Dividir por patrones comunes de prompt de host: C:\>, PC>, Server>, etc.
  const promptRegex = /[A-Z]:\\>|[a-zA-Z0-9_-]+>/i;
  const segments = text.split(promptRegex);
  const history: Array<{ command: string; output: string }> = [];

  // El primer segmento suele ser el banner/limpieza. 
  // Los siguientes [1...N] contienen [comando + respuesta]
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]?.trim();
    if (!segment) continue;

    const lines = segment.split("\n");
    const command = lines[0]?.trim();
    const output = lines.slice(1).join("\n").trim();

    // Filtramos el banner inicial (si no hay comando claro)
    if (command && command.length < 500 && !command.includes("Packet Tracer")) { 
      history.push({ command, output });
    }
  }

  return {
    parserId: "host.history",
    facts: {
      entries: history,
      count: history.length,
      lastCommand: history.length > 0 ? history[history.length - 1]?.command : null,
      lastOutput: history.length > 0 ? history[history.length - 1]?.output : null,
      raw: text 
    },
  };
}

export function parseIosShowIpRoute(raw: string): ParsedTerminalEvidence {
  const lines = linesOf(raw);
  const routes: Array<Record<string, unknown>> = [];

  for (const line of lines) {
    if (
      /^gateway|^interface|^subnet|^default|^code|^familia|^ Routing Table/i.test(line) ||
      /^-+/.test(line) ||
      /^show ip route/i.test(line)
    ) {
      continue;
    }

    const match = line.match(/^([CMLS])(?:\s+(\S+))?(?:\s+(\S+))?\s+/i);
    if (match) {
      routes.push({
        code: match[1]!,
        network: match[2] ?? null,
        metric: match[3] ?? null,
        raw: line,
      });
    }
  }

  return {
    parserId: "ios.show-ip-route",
    facts: {
      routes,
      routeCount: routes.length,
      hasDefaultRoute: routes.some((r) => r["code"] === "S" && String(r["network"] ?? "").includes("0.0.0.0")),
      hasConnectedRoutes: routes.some((r) => r["code"] === "C"),
    },
  };
}

export function parseIosShowMacAddressTable(raw: string): ParsedTerminalEvidence {
  const lines = linesOf(raw);
  const entries: Array<Record<string, unknown>> = [];

  for (const line of lines) {
    if (
      /^mac|^address|^vlan|^behaviour|^-+|^show mac/i.test(line) ||
      /^-+/.test(line)
    ) {
      continue;
    }

    const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/i);
    if (match) {
      entries.push({
        mac: match[1]!,
        type: match[2]!,
        vlan: match[3]!,
        port: match[4]!,
      });
    }
  }

  return {
    parserId: "ios.show-mac-address-table",
    facts: {
      entries,
      entryCount: entries.length,
    },
  };
}

export function parseTerminalOutput(
  capabilityId: string,
  raw: string,
): ParsedTerminalEvidence | null {
  switch (capabilityId) {
    case "terminal.show-version":
      return parseIosShowVersion(raw);
    case "terminal.show-running-config":
      return parseIosShowRunningConfig(raw);
    case "terminal.show-ip-interface-brief":
      return parseIosShowIpInterfaceBrief(raw);
    case "terminal.show-vlan-brief":
      return parseIosShowVlanBrief(raw);
    case "terminal.show-cdp-neighbors":
      return parseIosShowCdpNeighbors(raw);
    case "terminal.show-ip-route":
      return parseIosShowIpRoute(raw);
    case "terminal.show-mac-address-table":
      return parseIosShowMacAddressTable(raw);
    case "host.ipconfig":
      return parseHostIpconfig(raw);
    case "host.ping":
      return parseHostPing(raw);
    case "host.tracert":
      return parseHostTracert(raw);
    case "host.arp":
      return parseHostArp(raw);
    case "host.nslookup":
      return parseHostNslookup(raw);
    case "host.netstat":
      return parseHostNetstat(raw);
    case "host.history":
      return parseHostHistory(raw);
    case "host.route":
      return { parserId: "host.route", facts: { raw: String(raw ?? "") } };
    case "host.command":
      return { parserId: "host.command", facts: { raw: String(raw ?? "") } };
    default:
      return null;
  }
}