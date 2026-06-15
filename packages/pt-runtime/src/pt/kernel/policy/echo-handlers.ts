export function lineContainsCommandEcho(line: string, command: string): boolean {
  const rawLine = String(line ?? "").trim();
  const rawCommand = String(command ?? "").trim();

  if (!rawLine || !rawCommand) return false;

  const lowerLine = rawLine.toLowerCase();
  const lowerCommand = rawCommand.toLowerCase();

  if (lowerLine === lowerCommand) {
    return true;
  }

  const escapedCommand = String(rawCommand).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const promptEchoPattern = new RegExp(
    "^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*" + escapedCommand + "\\s*$",
    "i",
  );

  if (promptEchoPattern.test(rawLine)) {
    return true;
  }

  const damagedPromptEchoPattern = new RegExp(
    "^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]?\\s+" + escapedCommand + "\\s*$",
    "i",
  );

  return damagedPromptEchoPattern.test(rawLine);
}

export function stripCommandEchoFromLine(line: string, command: string): string {
  const rawLine = String(line ?? "").trim();
  const rawCommand = String(command ?? "").trim();

  if (!rawLine || !rawCommand) return rawLine;

  if (rawLine.toLowerCase() === rawCommand.toLowerCase()) {
    return "";
  }

  const lowerLine = rawLine.toLowerCase();
  const lowerCommand = rawCommand.toLowerCase();

  const gtIndex = lowerLine.indexOf(">" + lowerCommand);
  if (gtIndex >= 0) return "";

  const hashIndex = lowerLine.indexOf("#" + lowerCommand);
  if (hashIndex >= 0) return "";

  return rawLine;
}

export function blockHasCommandEcho(lines: string[], command: string): boolean {
  return lines.some((line) => lineContainsCommandEcho(line, command));
}
