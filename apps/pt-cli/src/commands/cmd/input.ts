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
