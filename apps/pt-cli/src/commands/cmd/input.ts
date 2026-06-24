import { readFileSync } from "node:fs";

function joinCommandParts(parts: string[]): string {
  return parts.join(" ").trim();
}

export interface CmdInputOptions {
  file?: string;
  stdin?: boolean;
  config?: boolean;
}

export function normalizeCommandLines(content: string): string[] {
  return content
    .replace(/;/g, "\n")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .filter((line) => !line.trimStart().startsWith("#"));
}

export function looksLikeMultiCommandInput(commandParts: string[]): boolean {
  const parts = commandParts
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.some((part) => /\r?\n/.test(part))) {
    return true;
  }

  if (parts.some((part) => part.includes(";"))) {
    return true;
  }

  if (parts.length <= 1) return false;

  const lower = parts.map((part) => part.toLowerCase());

  const startsConfigContext = /^(interface|vlan|router|line|ip access-list|class-map|policy-map|ip dhcp pool)\b/.test(lower[0] ?? "");

  const hasConfigChild = lower.slice(1).some((part) =>
    /^(description|switchport|shutdown|no shutdown|ip address|ipv6 address|duplex|speed|name|network|default-router|dns-server|lease|login|password|transport input|exec-timeout|channel-group|spanning-tree)\b/.test(part),
  );

  if (startsConfigContext && hasConfigChild) {
    return true;
  }

  const everyPartLooksLikeFullCommand = parts.every((part) => /\s+/.test(part) || /^(end|exit|no|show|wr|write|copy)\b/i.test(part));

  if (everyPartLooksLikeFullCommand) {
    return true;
  }

  return false;
}

export function readCommandsFromOptions(
  options: CmdInputOptions,
  commandParts: string[],
): string[] {
  if (options.file) {
    return normalizeCommandLines(readFileSync(options.file, "utf-8"));
  }

  if (options.stdin) {
    return normalizeCommandLines(readFileSync(0, "utf-8"));
  }

  if (options.config) {
    return commandParts.flatMap((part) => normalizeCommandLines(part)).filter(Boolean);
  }

  if (looksLikeMultiCommandInput(commandParts)) {
    return commandParts.flatMap((part) => normalizeCommandLines(part)).filter(Boolean);
  }

  const joined = joinCommandParts(commandParts);
  return joined ? normalizeCommandLines(joined) : [];
}

function isEndCommand(command: string): boolean {
  return /^(end|exit)$/i.test(command.trim());
}

const CONFIG_CONTEXT_PATTERNS = [
  /^interface\s+/i,
  /^vlan\s+\d+/i,
  /^router\s+/i,
  /^line\s+/i,
  /^ip\s+access-list\s+/i,
  /^class-map\s+/i,
  /^policy-map\s+/i,
  /^ip\s+dhcp\s+pool\s+/i,
  /^telephony-service$/i,
  /^ephone-dn\s+\d+/i,
  /^ephone\s+\d+/i,
  /^spanning-tree\s+vlan\s+/i,
  /^sdm\s+prefer\s+/i,
  /^standby\s+/i,
  /^ipv6\s+unicast-routing$/i,
  /^ip\s+helper-address\s+/i,
  /^switchport\s+voice\s+vlan\s+/i,
  /^channel-group\s+\d+\s+mode\s+/i,
];

const CONFIG_COMMAND_PATTERNS = [
  /^description\s+/i,
  /^switchport\s+/i,
  /^shutdown$/i,
  /^no\s+shutdown$/i,
  /^ip\s+address\s+/i,
  /^ipv6\s+address\s+/i,
  /^duplex\s+/i,
  /^speed\s+/i,
  /^name\s+/i,
  /^network\s+/i,
  /^default-router\s+/i,
  /^dns-server\s+/i,
  /^lease\s+/i,
  /^login\s+/i,
  /^password\s+/i,
  /^transport\s+input\s+/i,
  /^exec-timeout\s+/i,
  /^channel-group\s+/i,
  /^spanning-tree\s+/i,
  /^ip\s+dhcp\s+(excluded-address|relay|server)/i,
];

export function needsConfigMode(commands: string[]): boolean {
  if (commands.length === 0) return false;

  for (const cmd of commands) {
    const trimmed = cmd.trim();
    if (!trimmed) continue;

    for (const pattern of CONFIG_CONTEXT_PATTERNS) {
      if (pattern.test(trimmed)) return true;
    }

    if (trimmed.toLowerCase() === "configure terminal" || trimmed.toLowerCase() === "conf t") {
      return true;
    }

    for (const pattern of CONFIG_COMMAND_PATTERNS) {
      if (pattern.test(trimmed)) return true;
    }
  }

  return false;
}

export function buildConfigCommand(commands: string[], save: boolean): string {
  const lines: string[] = [];
  const normalizedCommands = commands.filter((line) => line.trim().length > 0);

  lines.push("configure terminal");
  lines.push(...normalizedCommands);

  const lastCommand = normalizedCommands.at(-1);
  if (!lastCommand || !isEndCommand(lastCommand)) {
    lines.push("end");
  }

  if (save) lines.push("write memory");
  return lines.join("\n");
}
