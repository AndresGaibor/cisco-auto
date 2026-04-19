// ============================================================================
// Terminal Output Parsers - Verificación basada en evidencia estructurada
// ============================================================================

export interface ParsedShowVersion {
  ok: boolean;
  hostname?: string;
  iosVersion?: string;
  image?: string;
  uptime?: string;
  model?: string;
}

export function parseShowVersion(output: string): ParsedShowVersion {
  if (!output || output.trim().length === 0) {
    return { ok: false };
  }

  const hostname = /hostname\s+(\S+)/i.exec(output)?.[1];
  const iosVersion = /ios\s+version\s+([\d.]+)/i.exec(output)?.[1]
    ?? /version\s+([\d.]+)/i.exec(output)?.[1];
  const image = /system\s+image\s+file\s+["']([^"']+)["']/i.exec(output)?.[1];
  const uptime = /uptime\s+is\s+(.+)/i.exec(output)?.[1];
  const model = /(ISR\d+|C\d+|ASR\d+)/i.exec(output)?.[1];

  return {
    ok: Boolean(hostname || iosVersion),
    hostname,
    iosVersion,
    image,
    uptime,
    model,
  };
}

export interface ParsedShowIpInterfaceBrief {
  ok: boolean;
  interfaces: Array<{
    name: string;
    ipAddress?: string;
    status: string;
    protocol: string;
  }>;
  upCount: number;
  downCount: number;
}

export function parseShowIpInterfaceBrief(output: string): ParsedShowIpInterfaceBrief {
  if (!output || output.trim().length === 0) {
    return { ok: false, interfaces: [], upCount: 0, downCount: 0 };
  }

  const lines = output.split("\n").filter((l) => l.trim());
  const interfaces: ParsedShowIpInterfaceBrief["interfaces"] = [];

  for (const line of lines) {
    const match = /^(\S+)\s+([\d.]+)\s+YES\s+(up|down)\s+(up|down)/.exec(line.trim());
    if (match) {
      interfaces.push({
        name: match[1]!,
        ipAddress: match[2],
        status: match[3]!,
        protocol: match[4]!,
      });
    }
  }

  const upCount = interfaces.filter((i) => i.status === "up").length;
  const downCount = interfaces.filter((i) => i.status === "down").length;

  return {
    ok: interfaces.length > 0,
    interfaces,
    upCount,
    downCount,
  };
}

export interface ParsedShowVlan {
  ok: boolean;
  vlans: Array<{
    id: number;
    name: string;
    status: string;
  }>;
  vlanCount: number;
}

export function parseShowVlan(output: string): ParsedShowVlan {
  if (!output || output.trim().length === 0) {
    return { ok: false, vlans: [], vlanCount: 0 };
  }

  const lines = output.split("\n").filter((l) => l.trim());
  const vlans: ParsedShowVlan["vlans"] = [];

  for (const line of lines) {
    const match = /^\s*(\d+)\s+(\S+.*?)\s+(active|suspended)/.exec(line.trim());
    if (match) {
      vlans.push({
        id: parseInt(match[1]!, 10),
        name: match[2]!,
        status: match[3]!,
      });
    }
  }

  return {
    ok: vlans.length > 0,
    vlans,
    vlanCount: vlans.length,
  };
}

export interface ParsedShowCdpNeighbors {
  ok: boolean;
  neighbors: Array<{
    deviceId: string;
    localInterface: string;
    capability: string;
    holdtime: number;
  }>;
  neighborCount: number;
}

export function parseShowCdpNeighbors(output: string): ParsedShowCdpNeighbors {
  if (!output || output.trim().length === 0) {
    return { ok: false, neighbors: [], neighborCount: 0 };
  }

  const lines = output.split("\n").filter((l) => l.trim());
  const neighbors: ParsedShowCdpNeighbors["neighbors"] = [];

  for (const line of lines) {
    const match = /^(\S+)\s+(\S+)\s+\d+\s+\S+\s+(\S+)/.exec(line.trim());
    if (match) {
      neighbors.push({
        deviceId: match[1]!,
        localInterface: match[2]!,
        capability: match[3]!,
        holdtime: 0,
      });
    }
  }

  return {
    ok: neighbors.length > 0,
    neighbors,
    neighborCount: neighbors.length,
  };
}

export interface ParsedHostIpconfig {
  ok: boolean;
  adapters: Array<{
    name: string;
    ipv4Address?: string;
    ipv4Mask?: string;
    ipv6Address?: string;
    defaultGateway?: string;
    dhcpEnabled: boolean;
    macAddress?: string;
  }>;
}

export function parseHostIpconfig(output: string): ParsedHostIpconfig {
  if (!output || output.trim().length === 0) {
    return { ok: false, adapters: [] };
  }

  const adapters: ParsedHostIpconfig["adapters"] = [];
  const blocks = output.split(/\n\s*\n/);

  for (const block of blocks) {
    const nameMatch = /adapter\s+(.+?):/i.exec(block);
    if (!nameMatch) continue;

    const lines = block.split("\n");
    const adapter: ParsedHostIpconfig["adapters"][number] = {
      name: nameMatch[1]!.trim(),
      dhcpEnabled: /dhcp\s+enabled/i.test(block),
    };

    const ipv4Match = /ipv4.*?:\s*([\d.]+)/i.exec(block);
    if (ipv4Match) adapter.ipv4Address = ipv4Match[1];

    const maskMatch = /subnet\s+mask.*?:\s*([\d.]+)/i.exec(block);
    if (maskMatch) adapter.ipv4Mask = maskMatch[1];

    const gwMatch = /default\s+gateway.*?:\s*([\d.]+)/i.exec(block);
    if (gwMatch) adapter.defaultGateway = gwMatch[1];

    const macMatch = /physical\s+address.*?:\s*([\w-]+)/i.exec(block);
    if (macMatch) adapter.macAddress = macMatch[1];

    const ipv6Match = /ipv6.*?:\s*([\w:]+%)/i.exec(block);
    if (ipv6Match) adapter.ipv6Address = ipv6Match[1];

    adapters.push(adapter);
  }

  return {
    ok: adapters.length > 0,
    adapters,
  };
}

export interface ParsedHostPing {
  ok: boolean;
  packetsSent?: number;
  packetsReceived?: number;
  packetsLost?: number;
  minRtt?: number;
  avgRtt?: number;
  maxRtt?: number;
  success: boolean;
}

export function parseHostPing(output: string): ParsedHostPing {
  if (!output || output.trim().length === 0) {
    return { ok: false, success: false };
  }

  const sentMatch = /packets:\s*(\d+)\s*sent/i.exec(output);
  const receivedMatch = /packets:\s*(\d+)\s*received/i.exec(output);
  const lostMatch = /lost.*?\((\d+)%\)/i.exec(output) ?? /lost\s+(\d+)/i.exec(output);
  const minMatch = /minimum\s*=\s*(\d+)/i.exec(output);
  const avgMatch = /average\s*=\s*(\d+)/i.exec(output);
  const maxMatch = /maximum\s*=\s*(\d+)/i.exec(output);

  const packetsSent = sentMatch ? parseInt(sentMatch[1]!, 10) : undefined;
  const packetsReceived = receivedMatch ? parseInt(receivedMatch[1]!, 10) : undefined;
  const packetsLost = lostMatch ? parseInt(lostMatch[1]!, 10) : undefined;
  const minRtt = minMatch ? parseInt(minMatch[1]!, 10) : undefined;
  const avgRtt = avgMatch ? parseInt(avgMatch[1]!, 10) : undefined;
  const maxRtt = maxMatch ? parseInt(maxMatch[1]!, 10) : undefined;

  const success = packetsReceived !== undefined && packetsReceived > 0;

  return {
    ok: Boolean(success || packetsSent !== undefined),
    packetsSent,
    packetsReceived,
    packetsLost,
    minRtt,
    avgRtt,
    maxRtt,
    success,
  };
}

export interface ParsedShowRunningConfig {
  ok: boolean;
  hasVlanConfigured: boolean;
  hasInterfaceConfigured: boolean;
  hasRouterConfigured: boolean;
  lines: number;
}

export function parseShowRunningConfig(output: string): ParsedShowRunningConfig {
  if (!output || output.trim().length === 0) {
    return { ok: false, hasVlanConfigured: false, hasInterfaceConfigured: false, hasRouterConfigured: false, lines: 0 };
  }

  const lines = output.split("\n").length;

  return {
    ok: lines > 10,
    hasVlanConfigured: /\bvlan\s+\d+/i.test(output),
    hasInterfaceConfigured: /\ninterface\s+\S+/i.test(output),
    hasRouterConfigured: /\brouter\s+\S+/i.test(output),
    lines,
  };
}

export interface VerificationResult {
  pass: boolean;
  reason: string;
  confidence: number;
  parsed?: unknown;
}

export function verifyShowVersionEvidence(evidence: Record<string, unknown>): VerificationResult {
  const output = String(evidence.output ?? "");
  if (!output) {
    return { pass: false, reason: "No output in evidence", confidence: 0 };
  }

  const parsed = parseShowVersion(output);

  if (!parsed.ok) {
    return { pass: false, reason: "Could not parse show version output", confidence: 0.3, parsed };
  }

  if (!parsed.hostname) {
    return { pass: false, reason: "No hostname found in output", confidence: 0.5, parsed };
  }

  return {
    pass: true,
    reason: `Parsed successfully: hostname=${parsed.hostname}, ios=${parsed.iosVersion ?? "unknown"}`,
    confidence: 0.9,
    parsed,
  };
}

export function verifyHostIpconfigEvidence(evidence: Record<string, unknown>): VerificationResult {
  const output = String(evidence.output ?? "");
  if (!output) {
    return { pass: false, reason: "No output in evidence", confidence: 0 };
  }

  const parsed = parseHostIpconfig(output);

  if (!parsed.ok || parsed.adapters.length === 0) {
    return { pass: false, reason: "Could not parse ipconfig output", confidence: 0.3, parsed };
  }

  const hasIp = parsed.adapters.some((a) => a.ipv4Address && a.ipv4Address !== "0.0.0.0");

  return {
    pass: hasIp,
    reason: hasIp
      ? `Found ${parsed.adapters.length} adapter(s) with IP configured`
      : "No adapter has valid IP address",
    confidence: hasIp ? 0.9 : 0.6,
    parsed,
  };
}

export function verifyHostPingEvidence(evidence: Record<string, unknown>): VerificationResult {
  const output = String(evidence.output ?? "");
  if (!output) {
    return { pass: false, reason: "No output in evidence", confidence: 0 };
  }

  const parsed = parseHostPing(output);

  if (!parsed.ok) {
    return { pass: false, reason: "Could not parse ping output", confidence: 0.3, parsed };
  }

  if (parsed.packetsLost !== undefined && parsed.packetsLost > 50) {
    return {
      pass: false,
      reason: `High packet loss: ${parsed.packetsLost}%`,
      confidence: 0.7,
      parsed,
    };
  }

  return {
    pass: parsed.success,
    reason: parsed.success
      ? `Ping successful: ${parsed.packetsReceived}/${parsed.packetsSent} received`
      : `Ping failed: ${parsed.packetsLost}% loss`,
    confidence: parsed.success ? 0.9 : 0.5,
    parsed,
  };
}
