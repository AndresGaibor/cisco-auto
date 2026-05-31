export type CommandWeight = "short" | "medium" | "long";

export function classifyIosShowCommand(command: string): CommandWeight {
  const cmd = command.trim().toLowerCase().replace(/\s+/g, " ");

  if (cmd === "show clock") return "short";
  if (cmd === "show etherchannel summary") return "short";
  if (cmd === "show cdp neighbors") return "short";
  if (cmd === "show standby brief") return "short";

  if (cmd === "show vlan brief") return "medium";
  if (cmd === "show ip interface brief") return "medium";
  if (cmd.startsWith("show ip route")) return "medium";

  if (cmd === "show interfaces trunk") return "long";
  if (cmd.startsWith("show spanning-tree")) return "long";
  if (cmd.startsWith("show running-config")) return "long";
  if (cmd === "show version") return "long";

  return "medium";
}

export function buildAdaptiveCommandChunks(commands: string[]): string[][] {
  const chunks: string[][] = [];
  let shortChunk: string[] = [];
  let mediumChunk: string[] = [];

  const flushShort = (): void => {
    if (shortChunk.length > 0) {
      chunks.push(shortChunk);
      shortChunk = [];
    }
  };

  const flushMedium = (): void => {
    if (mediumChunk.length > 0) {
      chunks.push(mediumChunk);
      mediumChunk = [];
    }
  };

  for (const command of commands) {
    const weight = classifyIosShowCommand(command);

    if (weight === "short") {
      shortChunk.push(command);
      if (shortChunk.length >= 5) flushShort();
      continue;
    }

    if (weight === "medium") {
      flushShort();
      mediumChunk.push(command);
      if (mediumChunk.length >= 2) flushMedium();
      continue;
    }

    flushShort();
    flushMedium();
    chunks.push([command]);
  }

  flushShort();
  flushMedium();

  return chunks;
}
