import type { ParsedTerminalEvidence } from "../terminal-output-parsers.js";
import { linesOf, parseLineRecords, splitCsvList } from "./parser-helpers.js";

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
  const versionLine = lines.find((line) => /^version\s+\d+(\.\d+)?(\S*)?$/i.test(line));
  const interfaceLines = lines.filter((line) => /^interface\s+/i.test(line));
  const vlanLines = lines.filter((line) => /^vlan\s+\d+/i.test(line));
  const routerLines = lines.filter((line) => /^router\s+/i.test(line));
  const hasBuildingConfiguration = /Building configuration/i.test(text);
  const hasCurrentConfiguration = /Current configuration\s*:/i.test(text);
  const hasConfigTerminator = lines.some((line) => /^end$/i.test(line));
  const hasConfigBody = Boolean(
    versionLine ||
      hostnameLine ||
      interfaceLines.length > 0 ||
      vlanLines.length > 0 ||
      routerLines.length > 0,
  );

  return {
    parserId: "ios.show-running-config",
    facts: {
      hasVersionHeader: hasBuildingConfiguration,
      hasBuildingConfiguration,
      hasCurrentConfiguration,
      hasConfigTerminator,
      hasConfigBody,
      versionLine: versionLine ?? null,
      hostnameLine: hostnameLine ?? null,
      interfaceCount: interfaceLines.length,
      vlanCount: vlanLines.length,
      routingSectionCount: routerLines.length,
      lineCount: lines.length,
    },
  };
}

export function parseIosShowIpInterfaceBrief(raw: string): ParsedTerminalEvidence {
  const interfaces = parseLineRecords(raw, {
    skip: (line) =>
      /^interface/i.test(line) ||
      /^---/.test(line) ||
      /^show ip interface brief/i.test(line),
    parse: (line) => {
      const match = line.match(/^(\S+)\s+(\S+)\s+\S+\s+\S+\s+(\S+)\s+(\S+)$/i);

      if (!match) {
        return null;
      }

      return {
        interface: match[1]!,
        ipAddress: match[2]!,
        status: match[3]!,
        protocol: match[4]!,
      };
    },
  });

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
  const vlans = parseLineRecords(raw, {
    skip: (line) => /^vlan/i.test(line) || /^----/.test(line) || /^show vlan/i.test(line),
    parse: (line) => {
      const match = line.match(/^(\d+)\s+(\S+)\s+(\S+)\s*(.*)$/i);

      if (!match) {
        return null;
      }

      return {
        vlanId: Number(match[1]!),
        name: match[2]!,
        status: match[3]!,
        ports: splitCsvList(match[4]),
      };
    },
  });

  return {
    parserId: "ios.show-vlan-brief",
    facts: {
      vlans,
      vlanCount: vlans.length,
    },
  };
}

export function parseIosShowCdpNeighbors(raw: string): ParsedTerminalEvidence {
  const neighbors = parseLineRecords(raw, {
    skip: (line) => /^device id/i.test(line) || /^-+/.test(line) || /^show cdp neighbors/i.test(line),
    parse: (line) => {
      const parts = line.split(/\s+/).filter(Boolean);

      if (parts.length < 4) {
        return null;
      }

      const capIdx = parts.length - 2;
      const platIdx = parts.length - 1;

      return {
        deviceId: parts[0]!,
        localInterface: parts[1]!,
        capability: parts[capIdx]!,
        platform: parts[platIdx]!,
      };
    },
  });

  return {
    parserId: "ios.show-cdp-neighbors",
    facts: {
      neighbors,
      neighborCount: neighbors.length,
    },
  };
}

export function parseIosShowIpRoute(raw: string): ParsedTerminalEvidence {
  const routes = parseLineRecords(raw, {
    skip: (line) =>
      /^gateway|^interface|^subnet|^default|^code|^family|^Routing Table/i.test(line) ||
      /^-+/.test(line) ||
      /^show ip route/i.test(line),
    parse: (line) => {
      const match = line.match(/^([CMLS])(\s+(\S+))?(\s+(\S+))?\s+/i);

      if (!match) {
        return null;
      }

      return {
        code: match[1]!,
        network: match[2] ?? null,
        metric: match[3] ?? null,
        raw: line,
      };
    },
  });

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
  const entries = parseLineRecords(raw, {
    skip: (line) => /^mac|^address|^vlan|^behaviour|^-+|^show mac/i.test(line),
    parse: (line) => {
      const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/i);

      if (!match) {
        return null;
      }

      return {
        mac: match[1]!,
        type: match[2]!,
        vlan: match[3]!,
        port: match[4]!,
      };
    },
  });

  return {
    parserId: "ios.show-mac-address-table",
    facts: {
      entries,
      entryCount: entries.length,
    },
  };
}