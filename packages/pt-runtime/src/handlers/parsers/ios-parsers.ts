// handlers/parsers/ios-parsers.ts
// Parsers for IOS show commands — pure functions with no PT dependencies

export type ParserFn = (output: string) => Record<string, unknown>;

export const IOS_PARSERS: Record<string, ParserFn> = {
  "show ip interface brief": (output: string) => {
    const interfaces: Array<{
      interface: string;
      ipAddress: string;
      ok: string;
      method: string;
      status: string;
      protocol: string;
    }> = [];
    const lines = output.split("\n").filter((l) => l.trim().length > 0);
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!.trim();
      if (line.includes("---")) continue;
      const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)$/);
      if (match) {
        interfaces.push({
          interface: match[1]!,
          ipAddress: match[2]!,
          ok: match[3]!,
          method: match[4]!,
          status: match[5]!,
          protocol: match[6]!,
        });
      }
    }
    return { entries: interfaces };
  },

  "show vlan brief": (output: string) => {
    const vlans: Array<{ id: number; name: string; status: string; ports: string[] }> = [];
    const lines = output.split("\n").filter((l) => l.trim().length > 0);
    for (const line of lines) {
      if (line.includes("---")) continue;
      const match = line.match(/^(\d+)\s+(\S+)\s+(\S+)\s*(.*)$/);
      if (match) {
        vlans.push({
          id: parseInt(match[1]!),
          name: match[2]!,
          status: match[3]!,
          ports: match[4]
            ? match[4]
                .split(",")
                .map((p) => p.trim())
                .filter((p) => p)
            : [],
        });
      }
    }
    return { entries: vlans };
  },

  "show ip route": (output: string) => {
    const routes: Array<{ code: string; network: string; via: string; interface: string }> = [];
    const lines = output.split("\n").filter((l) => l.trim().length > 0);
    for (const line of lines) {
      const match = line.match(/^([A-Z*])\s+(\d+\.\d+\.\d+\.\d+(?:\/\d+)?)\s+(?:\[\d+\/\d+\]\s+via\s+(\S+),\s+\S+,\s+(\S+))?/);
      if (match) {
        routes.push({
          code: match[1]!,
          network: match[2]!,
          via: match[3] || "directly connected",
          interface: match[4] || "",
        });
      }
    }
    return { entries: routes };
  },

  "show running-config": (output: string) => {
    return { raw: output, lines: output.split("\n").length };
  },
};

export function getParser(command: string): ParserFn | null {
  const cmd = command.toLowerCase().trim();
  if (IOS_PARSERS[cmd]) return IOS_PARSERS[cmd]!;
  for (const key in IOS_PARSERS) {
    if (cmd.startsWith(key)) return IOS_PARSERS[key]!;
  }
  return null;
}
