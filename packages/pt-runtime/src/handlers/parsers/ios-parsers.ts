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

  "show interfaces": (output: string) => {
    const interfaces: Array<{
      interface: string;
      status: string;
      protocol: string;
      vlan: string;
      duplex: string;
      speed: string;
      type: string;
    }> = [];
    const lines = output.split("\n");
    let currentInterface = "";

    for (const line of lines) {
      const statusMatch = line.match(/^(\S+)\s+is\s+(\w+),\s+line protocol is\s+(\w+)/);
      if (statusMatch) {
        currentInterface = statusMatch[1]!;
        const status = statusMatch[2]!;
        const protocol = statusMatch[3]!;
        const vlanMatch = line.match(/s+(\d+)\s+\[?(?:access|trunk)\]?/);
        const duplexMatch = line.match(/(\w+)-duplex/);
        const speedMatch = line.match(/(\d+)\s*Mbps/);
        const typeMatch = line.match(/Hardware is\s+([^,]+)/);

        interfaces.push({
          interface: currentInterface,
          status,
          protocol,
          vlan: vlanMatch ? vlanMatch[1]! : "N/A",
          duplex: duplexMatch ? duplexMatch[1]! : "N/A",
          speed: speedMatch ? speedMatch[1]! : "N/A",
          type: typeMatch ? typeMatch[1]! : "unknown",
        });
      }

      if (currentInterface && line.includes("Description:")) {
        const descMatch = line.match(/Description:\s*(.*)/);
        if (descMatch && interfaces.length > 0) {
          const last = interfaces[interfaces.length - 1]!;
          (last as any).description = descMatch[1]!.trim();
        }
      }

      const inputMatch = line.match(/(\d+)\s+input packets\s+(\d+)\s+bytes/);
      if (inputMatch && interfaces.length > 0) {
        const last = interfaces[interfaces.length - 1]!;
        (last as any).inputPackets = parseInt(inputMatch[1]!);
        (last as any).inputBytes = parseInt(inputMatch[2]!);
      }

      const outputMatch = line.match(/(\d+)\s+output packets/);
      if (outputMatch && interfaces.length > 0) {
        const last = interfaces[interfaces.length - 1]!;
        (last as any).outputPackets = parseInt(outputMatch[1]!);
      }
    }
    return { entries: interfaces };
  },

  "show cdp neighbors": (output: string) => {
    const neighbors: Array<{
      deviceId: string;
      localInterface: string;
      holdtime: string;
      capability: string;
      platform: string;
      portId: string;
    }> = [];
    const lines = output.split("\n");

    for (const line of lines) {
      const match = line.match(
        /^(\S+)\s+(\S+)\s+(\d+)\s+([A-Za-z ]+)\s+([\w-]+)\s+(\S+)\s*$/,
      );
      if (match) {
        neighbors.push({
          deviceId: match[1]!,
          localInterface: match[2]!,
          holdtime: match[3]!,
          capability: match[4]!.trim(),
          platform: match[5]!,
          portId: match[6]!,
        });
      }
    }
    return { entries: neighbors };
  },

  "show vlan": (output: string) => {
    const vlans: Array<{ id: number; name: string; status: string; ports: string[] }> = [];
    const lines = output.split("\n");
    let inVlanSection = false;

    for (const line of lines) {
      if (line.includes("VLAN Name") && line.includes("Status")) {
        inVlanSection = true;
        continue;
      }
      if (line.includes("----") && inVlanSection) continue;

      const match = line.match(
        /^(\d+)\s+(\S+)\s+(\w+)\s+(.+)$/,
      );
      if (match && inVlanSection) {
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

  "show mac address-table": (output: string) => {
    const entries: Array<{
      mac: string;
      type: string;
      vlan: string;
      interface: string;
    }> = [];
    const lines = output.split("\n");

    for (const line of lines) {
      const match = line.match(
        /^\s*(\d+)\s+([0-9a-fA-F.]+)\s+(\w+)\s+(\S+)/,
      );
      if (match) {
        entries.push({
          vlan: match[1]!,
          mac: match[2]!,
          type: match[3]!,
          interface: match[4]!,
        });
      }
    }
    return { entries };
  },

  "show ip nat translations": (output: string) => {
    const translations: Array<{
      protocol: string;
      insideLocal: string;
      insideGlobal: string;
      outsideLocal: string;
      outsideGlobal: string;
    }> = [];
    const lines = output.split("\n");

    for (const line of lines) {
      const match = line.match(
        /(\w+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/,
      );
      if (match) {
        translations.push({
          protocol: match[1]!,
          insideLocal: match[2]!,
          insideGlobal: match[3]!,
          outsideLocal: match[4]!,
          outsideGlobal: match[5]!,
        });
      }
    }
    return { entries: translations };
  },

  "show version": (output: string) => {
    const result: Record<string, unknown> = { raw: output };

    const versionMatch = output.match(/Cisco IOS Software.*Version\s+([^\s,]+)/);
    if (versionMatch) result.iosVersion = versionMatch[1]!;

    const uptimeMatch = output.match(/uptime is\s+(.+)/);
    if (uptimeMatch) result.uptime = uptimeMatch[1]!.trim();

    const imageMatch = output.match(/System image file is\s+"([^"]+)"/);
    if (imageMatch) result.systemImage = imageMatch[1]!;

    const modelMatch = output.match(/^(Cisco \S+)/m);
    if (modelMatch) result.model = modelMatch[1]!;

    const processorMatch = output.match(/processor.*with (\d+)K/);
    if (processorMatch) result.memory = parseInt(processorMatch[1]!) + "K";

    const restartMatch = output.match(/router was restarted.*by (.+)/);
    if (restartMatch) result.restartReason = restartMatch[1]!.trim();

    return result;
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
