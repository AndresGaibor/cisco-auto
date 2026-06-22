// CONSOLIDATED - do not edit directly
// Sources: execution-engine-*-helpers.ts, execution-engine-native.ts, execution-engine-semantic.ts, execution-engine-delta.ts

// packages/pt-runtime/src/pt/kernel/execution-engine-helpers.ts
// Funciones puras: validators, formatters, normalizers

import type { TerminalResult } from "../terminal/terminal-engine";

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

export function lineContainsCommandEcho(line: string, command: string): boolean {
  const rawLine = String(line ?? "").trim();
  const rawCommand = String(command ?? "").trim();

  if (!rawLine || !rawCommand) return false;

  const lowerLine = rawLine.toLowerCase();
  const lowerCommand = rawCommand.toLowerCase();

  if (lowerLine === lowerCommand) {
    return true;
  }

  const promptEchoPattern = new RegExp(
    "^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*" +
      String(rawCommand ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
      "\\s*$",
    "i",
  );

  return promptEchoPattern.test(rawLine);
}

export function isPagerOnlyLine(line: string): boolean {
  return /^--More--$/i.test(String(line ?? "").trim());
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

export function isConfigPromptText(value: string): boolean {
  return /\(config[^)]*\)#\s*$/.test(String(value ?? "").trim());
}

export function isHostPrompt(value: unknown): boolean {
  const line = String(value ?? "").trim();

  return /[A-Z]:\\>$/i.test(line) || /\b(?:pc|server|laptop|host|client|terminal)[A-Za-z0-9._-]*>$/i.test(line);
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

export function inferIosModeFromPrompt(prompt: unknown): string | null {
  const value = String(prompt ?? "").trim();

  if (isHostPrompt(value)) return "host-prompt";

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

export function isConfigMode(mode: string | null | undefined, prompt?: unknown): boolean {
  const normalized = normalizeIosMode(mode, prompt);

  return normalized === "global-config" || normalized === "config" || normalized.startsWith("config-");
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

export function isBlankText(value: unknown): boolean {
  return String(value ?? "").replace(/\s+/g, "") === "";
}

export function normalizeCommandForFallback(command: unknown): string {
  return String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isLongOutputReadOnlyIosCommand(command: unknown): boolean {
  const cmd = normalizeCommandForFallback(command);

  return (
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

export function lineLooksLikeNativeInterfaceHeader(line: string): boolean {
  return /^(?:FastEthernet|GigabitEthernet|TenGigabitEthernet|Ethernet|Serial|Vlan|Port-channel|Loopback|Tunnel|Null)\S*\s+is\s+/i.test(
    String(line ?? "").trim(),
  );
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

export function readTerminalTextSafe(term: any): string {
  const methods = [
    "getAllOutput",
    "getBuffer",
    "getOutput",
    "getText",
    "readAll",
    "read",
    "getHistory",
    "history",
  ];

  for (let i = 0; i < methods.length; i += 1) {
    const name = methods[i];

    try {
      if (typeof term[name] === "function") {
        const value = term[name]();
        if (value && typeof value === "string") {
          return value;
        }
      }
    } catch {}
  }

  try {
    if (typeof term.getConsole === "function") {
      const consoleObj = term.getConsole();

      if (consoleObj) {
        for (let i = 0; i < methods.length; i += 1) {
          const name = methods[i];

          try {
            if (typeof consoleObj[name] === "function") {
              const value = consoleObj[name]();
              if (value && typeof value === "string") {
                return value;
              }
            }
          } catch {}
        }
      }
    }
  } catch {}

  return "";
}

export function nativeModeSatisfiesEnsureStep(
  step: DeferredStep,
  mode: string,
  prompt: string,
): boolean {
  const expected = String(
    (step as any).expectMode ?? (step as any).value ?? "",
  ).trim();
  if (!expected) return false;
  if (expected === "privileged-exec") return mode === "privileged-exec" || String(prompt || "").trim().endsWith("#");
  if (expected === "user-exec") return mode === "user-exec" || String(prompt || "").trim().endsWith(">");
  if (expected === "global-config" || expected === "config") {
    return (mode === "global-config" || mode === "config" || mode.startsWith("config-")) ||
      String(prompt || "").includes("(config");
  }
  return false;
}

export function nativeHostFallbackBlockLooksComplete(
  block: string,
  command: string,
  prompt: string,
): boolean {
  const text = normalizeEol(block);
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return false;
  const promptLine = lastNonEmptyLine(text);
  if (!isHostPrompt(promptLine)) return false;
  const normalizedCommand = normalizeCommandForFallback(command);
  const meaningfulLines = lines.filter((line) => {
    const normalizedLine = line.trim().toLowerCase();
    if (!normalizedLine) return false;
    if (normalizedLine === normalizedCommand) return false;
    if (isHostPrompt(line)) return false;
    if (/^cisco packet tracer pc command line/i.test(line)) return false;
    return true;
  });
  return meaningfulLines.length > 0;
}

export function semanticErrorNeedsCleanupToPrivilegedExec(
  _job: any,
  prompt: unknown,
  mode: unknown,
): boolean {
  return nativeSnapshotIsStillInConfigMode({ prompt, mode });
}

export function isLikelyConfigStep(command: string): boolean {
  const normalized = String(command ?? "").trim().toLowerCase();
  return (
    normalized === "configure terminal" ||
    normalized === "end" ||
    /^interface\b/.test(normalized) ||
    /^vlan\b/.test(normalized) ||
    /^no\s+vlan\b/.test(normalized) ||
    /^router\b/.test(normalized) ||
    /^line\b/.test(normalized) ||
    /^hostname\b/.test(normalized) ||
    /^ip\s+/.test(normalized) ||
    /^no\s+ip\s+/.test(normalized) ||
    /^spanning-tree\b/.test(normalized) ||
    /^switchport\b/.test(normalized) ||
    /^shutdown$/.test(normalized) ||
    /^no\s+shutdown$/.test(normalized) ||
    /^description\b/.test(normalized) ||
    /^no\s+description$/.test(normalized)
  );
}

export function jobRequiresPrivilegedExecFinalMode(job: ActiveJob): boolean {
  const targetMode = String((job.context as any)?.targetMode ?? (job.context as any)?.plan?.targetMode ?? "").trim();
  return targetMode === "privileged-exec";
}

export function resolveJobSessionKind(job: ActiveJob): "ios" | "host" {
  const payload = job.context.plan.payload as any;
  const sessionKind = String(payload?.metadata?.sessionKind ?? payload?.sessionKind ?? "").trim().toLowerCase();
  if (sessionKind === "host") return "host";
  if (String(payload?.metadata?.deviceKind ?? "").trim().toLowerCase() === "host") return "host";
  return "ios";
}

export function getNextCommandStep(job: ActiveJob): string {
  const ctx = job.context;
  const nextStep = ctx.plan.plan[ctx.currentStep + 1];
  if (!nextStep || nextStep.type !== "command") return "";
  return String(nextStep.value ?? "").trim();
}

export function hasRemainingEndStep(job: ActiveJob): boolean {
  const ctx = job.context;
  for (let index = ctx.currentStep + 1; index < ctx.plan.plan.length; index += 1) {
    const step = ctx.plan.plan[index];
    if (step && step.type === "command" && String(step.value ?? "").trim().toLowerCase() === "end") {
      return true;
    }
  }
  return false;
}

export function appendStepOutput(current: string, next: unknown): string {
  const value = String(next ?? "");

  if (!value.trim()) return current;
  if (!current.trim()) return value;

  return current.replace(/\s+$/g, "") + "\n" + value.replace(/^\s+/g, "");
}

export function buildSemanticErrorResult(
  semanticError: { code: string; message: string },
) {
  return {
    ok: false,
    output: semanticError.message,
    status: 1,
    session: null,
    mode: "unknown",
    error: semanticError.message,
    code: semanticError.code,
  };
}

export function extractNativeCleanupOutputSinceBaseline(fullOutput: string, baselineOutput: string): string {
  const normalizedFull = normalizeEol(fullOutput);
  const normalizedBaseline = normalizeEol(baselineOutput);

  if (!normalizedFull.trim()) return "";

  if (normalizedBaseline && normalizedFull.startsWith(normalizedBaseline)) {
    const delta = normalizedFull.slice(normalizedBaseline.length).trim();
    if (delta) return delta;
  }
  return "";
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

  if (startIndex >= 0) {
    return lines.slice(startIndex).join("\n");
  }
  return text;
}

export function extractCurrentCommandBlockStrict(
  output: string,
  command: string,
): { block: string; hasCommandEcho: boolean } {
  const block = extractLatestCommandBlock(output, command);
  const lines = block.split("\n");
  const hasCommandEcho = blockHasCommandEcho(lines, command);
  return { block, hasCommandEcho };
}

export function getNativeDeltaForCurrentStep(
  _job: NativeDeltaJob,
  currentOutput: string,
  command: string,
): string {
  const ctx = _job.context;
  const output = normalizeEol(currentOutput);
  const strict = extractCurrentCommandBlockStrict(output, command);
  const baseline = normalizeEol(ctx.nativeBaselineOutput || "");

  if (ctx.nativeBaselineStep !== ctx.currentStep) {
    if (strict.hasCommandEcho) return strict.block;
    if (isPromptOnlyTransitionCommand(command)) return extractLatestCommandBlock(output, command).trim();
    return "";
  }

  return strict.block;
}

