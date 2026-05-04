// packages/pt-runtime/src/pt/kernel/execution/output-completion-policy.ts
// Helpers puros para detección de output completo y completion policy
// No tiene estado, no accede a terminal, no tiene side effects

export function normalizeCommandForFallback(command: unknown): string {
  return String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isLongOutputReadOnlyIosCommand(command: unknown): boolean {
  const cmd = normalizeCommandForFallback(command);

  return (
    /^show\s+version\b/.test(cmd) ||
    /^show\s+running-config\b/.test(cmd) ||
    /^show\s+startup-config\b/.test(cmd) ||
    /^show\s+interfaces?\b/.test(cmd) ||
    /^show\s+tech-support\b/.test(cmd) ||
    /^show\s+logging\b/.test(cmd) ||
    /^show\s+controllers\b/.test(cmd) ||
    /^show\s+processes\b/.test(cmd) ||
    /^show\s+inventory\b/.test(cmd) ||
    /^show\s+spanning-tree\b/.test(cmd) ||
    /^show\s+mac\s+address-table\b/.test(cmd) ||
    /^show\s+ip\s+route\b/.test(cmd)
  );
}

export function normalizeEol(value: unknown): string {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function isIosPrompt(value: unknown): boolean {
  const line = String(value ?? "").trim();
  return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line);
}

export function lastNonEmptyLine(value: unknown): string {
  const lines = normalizeEol(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines[lines.length - 1] : "";
}

export function isPagerOnlyLine(line: string): boolean {
  return /^--More--$/i.test(String(line ?? "").trim());
}

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

export function isConfigPromptText(value: string): boolean {
  return /\(config[^)]*\)#\s*$/.test(String(value ?? "").trim());
}

export function isEndCommand(command: string): boolean {
  return String(command ?? "").trim().toLowerCase() === "end";
}

export function isPromptOnlyTransitionCommand(command: string): boolean {
  const normalized = String(command ?? "").trim().toLowerCase();

  return (
    normalized === "disable" ||
    normalized === "enable" ||
    normalized === "end" ||
    normalized === "exit"
  );
}

export function blockHasCommandEcho(lines: string[], command: string): boolean {
  return lines.some((line) => lineContainsCommandEcho(line, command));
}

export function nativeEndCommandLooksComplete(lines: string[], command: string, prompt: string): boolean {
  if (!isEndCommand(command)) return false;

  const hasCommandEcho = blockHasCommandEcho(lines, command);
  if (!hasCommandEcho) return false;

  const promptLine = lastNonEmptyLine(lines.join("\n"));
  const resolvedPrompt = String(prompt || promptLine || "").trim();

  return /^[A-Za-z0-9._-]+#\s*$/.test(resolvedPrompt) && !/\(config[^)]*\)#\s*$/.test(resolvedPrompt);
}

export function nativePromptOnlyTransitionLooksComplete(
  lines: string[],
  command: string,
  prompt: string,
): boolean {
  if (!isPromptOnlyTransitionCommand(command)) return false;

  const hasCommandEcho = blockHasCommandEcho(lines, command);
  if (!hasCommandEcho) return false;

  const promptLine = lastNonEmptyLine(lines.join("\n"));
  const resolvedPrompt = String(prompt || promptLine || "").trim();

  return isIosPrompt(resolvedPrompt);
}

export function nativeConfigCommandEchoAndPromptLooksComplete(
  lines: string[],
  command: string,
  prompt: string,
): boolean {
  const promptLine = lastNonEmptyLine(lines.join("\n"));
  const hasConfigPrompt = isConfigPromptText(prompt) || isConfigPromptText(promptLine);

  if (!hasConfigPrompt) return false;

  const hasCommandEcho = lines.some((line) => lineContainsCommandEcho(line, command));
  if (!hasCommandEcho) return false;

  return true;
}

export function nativeFallbackBlockLooksComplete(block: string, command: string, prompt: string): boolean {
  const text = normalizeEol(block);
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return false;

  const promptOk = isIosPrompt(prompt) || isIosPrompt(lastNonEmptyLine(text));
  if (!promptOk) return false;

  if (outputHasPager(text)) return false;

  const meaningfulLines = lines.filter((line) => {
    const stripped = stripCommandEchoFromLine(line, command);
    if (!stripped) return false;
    if (isIosPrompt(stripped)) return false;
    if (isPagerOnlyLine(stripped)) return false;
    return true;
  });

  if (meaningfulLines.length > 0) {
    if (isLongOutputReadOnlyIosCommand(command) && !nativeLongOutputHasCommandEvidence(command, block)) {
      return false;
    }
    return true;
  }

  if (nativeEndCommandLooksComplete(lines, command, prompt)) {
    return true;
  }

  if (nativePromptOnlyTransitionLooksComplete(lines, command, prompt)) {
    return true;
  }

  return nativeConfigCommandEchoAndPromptLooksComplete(lines, command, prompt);
}

export function outputHasPager(output: string): boolean {
  return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
}

export function nativeOutputTailHasActivePager(output: string): boolean {
  const tail = normalizeEol(output).slice(-800);

  if (!tail.trim()) {
    return false;
  }

  return /--More--\s*$/i.test(tail) || /\s--More--\s*$/i.test(tail);
}

export function outputLooksComplete(output: string, command: string): boolean {
  const text = normalizeEol(output);
  const cmd = String(command ?? "").trim();

  if (!text.trim()) return false;

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));

  if (!hasPromptAtEnd) {
    return false;
  }

  const hasCommandEcho =
    cmd.length === 0 || lines.some((line) => lineContainsCommandEcho(line, cmd));

  const hasMeaningfulBody = lines.some((line) => {
    if (!line) return false;
    if (lineContainsCommandEcho(line, cmd)) return false;
    if (isIosPrompt(line)) return false;
    if (isPagerOnlyLine(line)) return false;
    return true;
  });

  return hasCommandEcho && hasMeaningfulBody;
}

export function normalizeIosMode(mode: unknown, prompt?: unknown): string {
  const promptMode = inferIosModeFromPrompt(prompt);

  if (promptMode) {
    return promptMode;
  }

  const raw = String(mode ?? "").trim().toLowerCase();

  if (raw === "user") return "user-exec";
  if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
  if (raw === "global" || raw === "config" || raw === "global-config") return "global-config";
  if (raw === "config-if") return "config-if";
  if (raw === "config-if-range") return "config-if-range";
  if (raw === "config-subif") return "config-subif";
  if (raw === "config-router") return "config-router";
  if (raw === "config-line") return "config-line";
  if (raw === "config-vlan") return "config-vlan";
  if (raw === "interface-config") return "config-if";
  if (raw === "router-config") return "config-router";
  if (raw === "line-config") return "config-line";
  if (raw === "vlan-config") return "config-vlan";
  if (raw === "logout") return "logout";

  return raw || "unknown";
}

export function inferIosModeFromPrompt(prompt: unknown): string | null {
  const value = String(prompt ?? "").trim();

  if (/\(config-if-range\)#\s*$/i.test(value)) return "config-if-range";
  if (/\(config-if\)#\s*$/i.test(value)) return "config-if";
  if (/\(config-subif\)#\s*$/i.test(value)) return "config-subif";
  if (/\(config-router\)#\s*$/i.test(value)) return "config-router";
  if (/\(config-line\)#\s*$/i.test(value)) return "config-line";
  if (/\(config-vlan\)#\s*$/i.test(value)) return "config-vlan";
  if (/\(config\)#\s*$/i.test(value)) return "global-config";

  if (/#\s*$/.test(value)) return "privileged-exec";
  if (/>$/.test(value)) return "user-exec";

  return null;
}

export function isConfigMode(mode: string | null | undefined, prompt?: unknown): boolean {
  const normalized = normalizeIosMode(mode, prompt);

  return normalized === "global-config" || normalized === "config" || normalized.startsWith("config-");
}

export function inferPromptFromTerminalText(text: string): string {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i] || "";

    if (/^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line)) {
      return line;
    }

    if (/[A-Z]:\\>$/.test(line)) {
      return line;
    }
  }

  return "";
}

export function firstMeaningfulNativeOutputLine(output: unknown, command?: string): string {
  const lines = normalizeEol(output)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (isIosPrompt(line)) return false;
      if (isPagerOnlyLine(line)) return false;
      if (command && lineContainsCommandEcho(line, command)) return false;
      return true;
    });

  return lines[0] ?? "";
}

export function lineLooksLikeNativeInterfaceHeader(line: string): boolean {
  return /^(?:FastEthernet|GigabitEthernet|TenGigabitEthernet|Ethernet|Serial|Vlan|Port-channel|Loopback|Tunnel|Null)\S*\s+is\s+/i.test(
    String(line ?? "").trim(),
  );
}

export function nativeLongOutputLooksPartial(args: {
  command: string;
  block: string;
  hasCommandEcho: boolean;
}): boolean {
  if (!/^show\s+interfaces?\b/.test(normalizeCommandForFallback(args.command))) {
    return false;
  }

  const firstLine = firstMeaningfulNativeOutputLine(args.block, args.command);

  if (!firstLine) {
    return false;
  }

  return !lineLooksLikeNativeInterfaceHeader(firstLine);
}

export const PARTIAL_LONG_OUTPUT_WARNING =
  "Output posiblemente parcial: el comando largo terminó sin eco ni encabezado inicial esperado.";

export function buildNativeLongOutputWarnings(args: {
  command: string;
  block: string;
  hasCommandEcho: boolean;
}): string[] {
  return nativeLongOutputLooksPartial(args) ? [PARTIAL_LONG_OUTPUT_WARNING] : [];
}

export function nativeLongOutputCanCompleteWithoutEcho(args: { block: string; command: string; prompt: string }): boolean {
  if (!isLongOutputReadOnlyIosCommand(args.command)) {
    return false;
  }

  const block = normalizeEol(args.block);
  const prompt = String(args.prompt ?? "").trim();

  if (!block.trim()) {
    return false;
  }

  if (outputHasPager(block)) {
    return false;
  }

  if (!isIosPrompt(prompt) && !isIosPrompt(lastNonEmptyLine(block))) {
    return false;
  }

  if (detectIosSemanticErrorFromOutput(block)) {
    return false;
  }

  if (!nativeLongOutputHasCommandEvidence(args.command, block)) {
    return false;
  }

  const meaningfulLines = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (isIosPrompt(line)) return false;
      if (isPagerOnlyLine(line)) return false;
      return true;
    });

  const cmd = normalizeCommandForFallback(args.command);
  const minimumMeaningfulLines = /^show\s+startup-config\b/.test(cmd) ? 1 : 3;

  return meaningfulLines.length >= minimumMeaningfulLines;
}

export function nativeLongOutputHasCommandEvidence(command: string, block: string): boolean {
  const cmd = normalizeCommandForFallback(command);
  const text = normalizeEol(block);

  if (/^show\s+version\b/.test(cmd)) {
    return (
      /Cisco IOS Software/i.test(text) ||
      /System image file/i.test(text) ||
      /Configuration register is/i.test(text) ||
      /\bVersion\s+\d+(?:\.\d+)?/i.test(text)
    );
  }

  if (/^show\s+running-config\b/.test(cmd)) {
    return (
      /Building configuration/i.test(text) ||
      /Current configuration\s*:/i.test(text) ||
      /interface\s+Vlan\d+/i.test(text) ||
      /hostname\s+\S+/i.test(text) ||
      /(?:^|\n)version\s+\S+/i.test(text) ||
      /(?:^|\n)end\s*$/i.test(text)
    );
  }

  if (/^show\s+startup-config\b/.test(cmd)) {
    return (
      /Using\s+\d+\s+bytes/i.test(text) ||
      /startup-config/i.test(text) ||
      /Current configuration\s*:/i.test(text) ||
      /(?:^|\n)version\s+\S+/i.test(text)
    );
  }

  if (/^show\s+ip\s+interface\s+brief\b/.test(cmd)) {
    return /Interface\s+IP-Address\s+OK\?\s+Method\s+Status\s+Protocol/i.test(text);
  }

  if (/^show\s+interfaces?\b/.test(cmd)) {
    const firstLine = firstMeaningfulNativeOutputLine(text, command);
    return lineLooksLikeNativeInterfaceHeader(firstLine);
  }

  return true;
}

export function detectIosSemanticErrorFromOutput(output: unknown): { code: string; message: string } | null {
  const text = String(output ?? "");

  if (!text.trim()) {
    return null;
  }

  if (/%\s*Invalid input detected/i.test(text)) {
    return {
      code: "IOS_INVALID_INPUT",
      message: text.trim(),
    };
  }

  if (/%\s*Incomplete command/i.test(text)) {
    return {
      code: "IOS_INCOMPLETE_COMMAND",
      message: text.trim(),
    };
  }

  if (/%\s*Ambiguous command/i.test(text)) {
    return {
      code: "IOS_AMBIGUOUS_COMMAND",
      message: text.trim(),
    };
  }

  if (/%\s*Unknown command/i.test(text)) {
    return {
      code: "IOS_UNKNOWN_COMMAND",
      message: text.trim(),
    };
  }

  return null;
}

export function isIosConfigPromptText(value: unknown): boolean {
  const text = String(value ?? "").trim();

  return /\(config[^)]*\)#\s*$/.test(text);
}

export function isIosConfigModeText(value: unknown): boolean {
  const text = String(value ?? "").trim().toLowerCase();

  return (
    text === "config" ||
    text === "global-config" ||
    text === "interface-config" ||
    text === "router-config" ||
    text === "line-config" ||
    text.startsWith("config") ||
    text.endsWith("-config")
  );
}

export function nativeSnapshotIsStillInConfigMode(snapshot: { prompt?: unknown; mode?: unknown }): boolean {
  return isIosConfigPromptText(snapshot.prompt) || isIosConfigModeText(snapshot.mode);
}

export function inferModeFromPrompt(prompt: string): string {
  return normalizeIosMode("unknown", prompt);
}

export function extractLatestCommandBlock(output: string, command: string): string {
  const text = normalizeEol(output);
  const cmd = String(command || "").trim();

  if (!text.trim() || !cmd) return text;

  const lines = text.split("\n");
  let startIndex = -1;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = String(lines[i] || "").trim();

    if (line === cmd || line.endsWith(">" + cmd) || line.endsWith("#" + cmd)) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    const idx = text.lastIndexOf(cmd);
    if (idx >= 0) return text.slice(idx);
    return text;
  }

  return lines.slice(startIndex).join("\n");
}

export function extractCurrentCommandBlockStrict(
  output: string,
  command: string,
): { block: string; hasCommandEcho: boolean } {
  const text = normalizeEol(output);
  const cmd = String(command || "").trim();

  if (!text.trim() || !cmd) {
    return { block: "", hasCommandEcho: false };
  }

  const lines = text.split("\n");
  let startIndex = -1;

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lineContainsCommandEcho(lines[index] || "", cmd)) {
      startIndex = index;
      break;
    }
  }

  if (startIndex < 0) {
    return { block: "", hasCommandEcho: false };
  }

  let endIndex = lines.length;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = String(lines[index] || "").trim();

    if (index > startIndex + 1 && isIosPrompt(line)) {
      endIndex = index + 1;
      break;
    }
  }

  return {
    block: lines.slice(startIndex, endIndex).join("\n").trim(),
    hasCommandEcho: true,
  };
}

export function appendStepOutput(current: string, next: unknown): string {
  const value = String(next ?? "");

  if (!value.trim()) {
    return current;
  }

  if (!current.trim()) {
    return value;
  }

  return current.replace(/\s+$/g, "") + "\n" + value.replace(/^\s+/g, "");
}