import type { RuntimeApi, RuntimeResult } from "../runtime/contracts.js";
import { createErrorResult } from "./result-factories.js";
import type { PTTerminal } from "./ios/ios-session-utils.js";

interface NativeExecPayload {
  device?: string;
  command?: string;
  timeoutMs?: number;
  maxPagerAdvances?: number;
  stableSamples?: number;
  sampleDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEol(value: unknown): string {
  return String(value == null ? "" : value).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function trimLine(value: unknown): string {
  return String(value == null ? "" : value).replace(/^[ \t\r\n]+/, "").replace(/[ \t\r\n]+$/, "");
}

function rtrim(value: unknown): string {
  return String(value == null ? "" : value).replace(/[ \t\r\n]+$/, "");
}

function contains(haystack: unknown, needle: string): boolean {
  return String(haystack == null ? "" : haystack).indexOf(needle) >= 0;
}

function startsWithText(value: unknown, prefix: string): boolean {
  const text = String(value == null ? "" : value);
  return text.slice(0, prefix.length) === prefix;
}

function endsWithText(value: unknown, suffix: string): boolean {
  const text = String(value == null ? "" : value);
  if (suffix.length > text.length) return false;
  return text.slice(text.length - suffix.length) === suffix;
}

function safeCallString(target: unknown, method: string): string {
  try {
    const maybe = target as Record<string, unknown> | null | undefined;

    if (!maybe || typeof maybe[method] !== "function") {
      return "";
    }

    // Conserva el receiver nativo para objetos QtScript/Packet Tracer.
    const value = (maybe[method] as () => unknown).call(maybe);

    return String(value == null ? "" : value);
  } catch {}

  return "";
}

function getTerminal(api: RuntimeApi, deviceName: string): PTTerminal | null {
  try {
    const ipc = (api as any).ipc;
    if (!ipc) return null;
    const net = typeof ipc.network === "function" ? ipc.network() : null;
    const device = net && typeof net.getDevice === "function" ? net.getDevice(deviceName) : null;

    if (device && typeof device.getCommandLine === "function") {
      return device.getCommandLine() as PTTerminal | null;
    }
  } catch {}

  return null;
}

function getTerminalOutput(term: PTTerminal): string {
  return (
    safeCallString(term, "getOutput") ||
    safeCallString(term, "getAllOutput") ||
    safeCallString(term, "getBuffer") ||
    safeCallString(term, "getText")
  );
}

function clearWhitespaceInput(term: PTTerminal): void {
  const input = safeCallString(term, "getCommandInput");

  if (input.length === 0) return;
  if (input.replace(/\s+/g, "") !== "") return;

  try {
    term.enterChar(21, 0);
  } catch {}

  for (let i = 0; i < Math.min(input.length + 8, 32); i += 1) {
    try {
      term.enterChar(8, 0);
    } catch {}
  }
}

function lastNonEmptyLine(output: string): string {
  const lines = normalizeEol(output).split("\n");

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = trimLine(lines[i]);
    if (line) return line;
  }

  return "";
}

function tailHasActivePager(output: string): boolean {
  const tail = normalizeEol(output).slice(-1000).replace(/\s+$/, "");

  return (
    /--More--$/i.test(tail) ||
    /More:$/i.test(tail) ||
    /Press any key to continue$/i.test(tail)
  );
}

async function drainActivePager(
  term: PTTerminal,
  maxAdvances: number,
  reason: string,
): Promise<number> {
  let advances = 0;

  while (advances < maxAdvances) {
    const output = getTerminalOutput(term);

    if (!tailHasActivePager(output)) {
      break;
    }

    try {
      term.enterChar(32, 0);
      advances += 1;
    } catch {
      break;
    }

    await sleep(120);
  }

  return advances;
}

function lineIsIosPrompt(line: string): boolean {
  return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(trimLine(line));
}

function isPrivilegedPrompt(prompt: string): boolean {
  return /#$/.test(trimLine(prompt));
}

function isUserPrompt(prompt: string): boolean {
  return />$/.test(trimLine(prompt));
}

function safeMode(term: PTTerminal): string {
  const raw = safeCallString(term, "getMode").toLowerCase();

  if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
  if (raw === "user" || raw === "user-exec") return "user-exec";
  if (raw === "logout") return "logout";
  return raw || "unknown";
}

function requiresPrivilege(command: string): boolean {
  const cmd = normalizeEol(command).replace(/\s+/g, " ").toLowerCase();

  return (
    /^show running-config\b/.test(cmd) ||
    /^show startup-config\b/.test(cmd) ||
    /^show archive\b/.test(cmd) ||
    /^show tech-support\b/.test(cmd) ||
    /^write\b/.test(cmd) ||
    /^copy\b/.test(cmd) ||
    /^erase\b/.test(cmd) ||
    /^reload\b/.test(cmd) ||
    /^clear\b/.test(cmd) ||
    /^debug\b/.test(cmd) ||
    /^undebug\b/.test(cmd)
  );
}

async function wakeTerminal(term: PTTerminal, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    await drainActivePager(term, 20, "wake-terminal");

    const prompt = safeCallString(term, "getPrompt");
    const mode = safeMode(term);

    if (prompt && mode !== "logout" && !tailHasActivePager(getTerminalOutput(term))) {
      return;
    }

    try {
      term.enterChar(13, 0);
    } catch {
      try {
        term.enterCommand("");
      } catch {}
    }

    await sleep(150);
  }
}

async function waitForPrompt(
  term: PTTerminal,
  predicate: (prompt: string, mode: string) => boolean,
  timeoutMs: number,
): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const prompt = safeCallString(term, "getPrompt");
    const mode = safeMode(term);

    if (predicate(prompt, mode)) {
      return true;
    }

    await sleep(100);
  }

  return false;
}

async function ensurePrivilegedIfNeeded(term: PTTerminal, command: string): Promise<boolean> {
  await wakeTerminal(term, 1800);
  clearWhitespaceInput(term);

  if (!requiresPrivilege(command)) {
    return true;
  }

  let prompt = safeCallString(term, "getPrompt");

  if (isPrivilegedPrompt(prompt)) {
    return true;
  }

  if (isUserPrompt(prompt) || safeMode(term) === "user-exec") {
    await drainActivePager(term, 20, "before-enable");
    try {
      term.enterCommand("enable");
    } catch {
      return false;
    }

    clearWhitespaceInput(term);

    if (await waitForPrompt(term, (currentPrompt) => isPrivilegedPrompt(currentPrompt), 1800)) {
      return true;
    }
  }

  return false;
}

function hasCommandEcho(output: string, command: string): boolean {
  const text = normalizeEol(output).toLowerCase();
  const cmd = String(command == null ? "" : command).replace(/^[ \t\r\n]+/, "").replace(/[ \t\r\n]+$/, "").toLowerCase();

  return (
    startsWithText(text, cmd + "\n") ||
    startsWithText(text, cmd) ||
    contains(text, ">" + cmd) ||
    contains(text, "#" + cmd) ||
    contains(text, "\n" + cmd + "\n")
  );
}

function extractLatestCommandBlock(output: string, command: string): string {
  const text = normalizeEol(output);
  const cmd = String(command == null ? "" : command).replace(/^[ \t\r\n]+/, "").replace(/[ \t\r\n]+$/, "").toLowerCase();
  const lines = text.split("\n");

  let startIndex = -1;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const lower = trimLine(lines[i]).toLowerCase();

    if (
      lower === cmd ||
      contains(lower, ">" + cmd) ||
      contains(lower, "#" + cmd)
    ) {
      startIndex = i;
      break;
    }
  }

  return startIndex >= 0 ? lines.slice(startIndex).join("\n") : text;
}

function stripFinalPromptForOutput(raw: string): string {
  const lines = normalizeEol(raw).split("\n");

  while (lines.length > 0 && trimLine(lines[lines.length - 1]) === "") {
    lines.pop();
  }

  if (lines.length > 0 && lineIsIosPrompt(lines[lines.length - 1])) {
    lines.pop();
  }

  return rtrim(lines.join("\n"));
}

function commandBlockHasIosError(output: string, command: string): boolean {
  const block = extractLatestCommandBlock(output, command).toLowerCase();

  return (
    contains(block, "% invalid input detected") ||
    contains(block, "% incomplete command") ||
    contains(block, "% ambiguous command") ||
    contains(block, "% unknown command") ||
    contains(block, "invalid command") ||
    contains(block, "command not found")
  );
}

export async function handleTerminalNativeExec(
  payload: NativeExecPayload,
  api: RuntimeApi,
): Promise<RuntimeResult> {
  const device = String(payload.device == null ? "" : payload.device).replace(/^[ \t\r\n]+/, "").replace(/[ \t\r\n]+$/, "");
  const command = String(payload.command == null ? "" : payload.command).replace(/^[ \t\r\n]+/, "").replace(/[ \t\r\n]+$/, "");
  const timeoutMs = Number(payload.timeoutMs || 8000);
  const maxPagerAdvances = Number(payload.maxPagerAdvances || 80);
  const stableSamplesRequired = Number(payload.stableSamples || 2);
  const sampleDelayMs = Number(payload.sampleDelayMs || 90);

  if (!device || !command) {
    return createErrorResult("terminal.native.exec requiere device y command", "INVALID_NATIVE_EXEC_PAYLOAD");
  }

  const term = getTerminal(api, device);

  if (!term) {
    return createErrorResult("No se encontró terminal para " + device, "DEVICE_TERMINAL_NOT_FOUND");
  }

  const startedAt = Date.now();

  await wakeTerminal(term, 1800);
  clearWhitespaceInput(term);

  const privilegedOk = await ensurePrivilegedIfNeeded(term, command);

  if (!privilegedOk) {
    return {
      ok: false,
      code: "NATIVE_EXEC_PRIVILEGE_REQUIRED",
      error:
        "El comando " +
        command +
        " requiere modo privilegiado, pero la terminal quedó en prompt " +
        safeCallString(term, "getPrompt"),
      raw: "",
      output: "",
      status: 1,
      session: {
        modeBefore: "",
        modeAfter: safeMode(term),
        promptBefore: "",
        promptAfter: safeCallString(term, "getPrompt"),
        paging: false,
        awaitingConfirm: false,
        kind: "ios",
      },
      diagnostics: {
        statusCode: 1,
        completionReason: "privilege-required",
        elapsedMs: Date.now() - startedAt,
        input: safeCallString(term, "getCommandInput"),
        tail: normalizeEol(getTerminalOutput(term)).slice(-1000),
      },
    } as unknown as RuntimeResult;
  }

  const beforePrompt = safeCallString(term, "getPrompt");
  const beforeMode = safeMode(term);

  await drainActivePager(term, maxPagerAdvances, "before-command");
  clearWhitespaceInput(term);

  try {
    term.enterCommand(command);
  } catch (error) {
    return createErrorResult(
      "terminal.native.exec no pudo enviar el comando: " + String(error),
      "NATIVE_EXEC_SEND_FAILED",
    );
  }

  let pagerAdvances = 0;
  let lastOutput = "";
  let stableSamples = 0;
  let completed = false;
  let completionReason = "timeout";

  while (Date.now() - startedAt < timeoutMs) {
    const output = getTerminalOutput(term);
    const lastLine = lastNonEmptyLine(output);

    if (tailHasActivePager(output)) {
      if (pagerAdvances >= maxPagerAdvances) {
        completionReason = "pager-limit";
        break;
      }

      try {
        term.enterChar(32, 0);
        pagerAdvances += 1;
      } catch {}

      await sleep(sampleDelayMs);
      continue;
    }

    if (hasCommandEcho(output, command) && commandBlockHasIosError(output, command)) {
      completionReason = "ios-error";
      break;
    }

    if (hasCommandEcho(output, command) && lineIsIosPrompt(lastLine)) {
      if (output === lastOutput) {
        stableSamples += 1;
      } else {
        stableSamples = 0;
      }

      if (stableSamples >= stableSamplesRequired) {
        completed = true;
        completionReason = "stable-prompt";
        break;
      }
    }

    lastOutput = output;
    await sleep(sampleDelayMs);
  }

  const finalOutput = getTerminalOutput(term);
  const raw = extractLatestCommandBlock(finalOutput, command);
  const output = stripFinalPromptForOutput(raw);
  const afterPrompt = safeCallString(term, "getPrompt");
  const afterMode = safeMode(term);
  const afterInput = safeCallString(term, "getCommandInput");
  const iosError = commandBlockHasIosError(finalOutput, command);

  clearWhitespaceInput(term);

  if (iosError) {
    return {
      ok: false,
      code: "NATIVE_EXEC_IOS_ERROR",
      error: "IOS rechazó el comando " + command,
      raw,
      output,
      status: 1,
      session: {
        modeBefore: beforeMode,
        modeAfter: afterMode,
        promptBefore: beforePrompt,
        promptAfter: afterPrompt,
        paging: pagerAdvances > 0,
        awaitingConfirm: false,
        kind: "ios",
      },
      diagnostics: {
        statusCode: 1,
        completionReason: "ios-error",
        pagerAdvances,
        elapsedMs: Date.now() - startedAt,
        input: afterInput,
      },
    } as unknown as RuntimeResult;
  }

  if (!completed) {
    return {
      ok: false,
      code: completionReason === "pager-limit" ? "NATIVE_EXEC_PAGER_LIMIT" : "NATIVE_EXEC_TIMEOUT",
      error: "terminal.native.exec no completó " + command + " en " + timeoutMs + "ms",
      raw,
      output,
      status: 1,
      session: {
        modeBefore: beforeMode,
        modeAfter: afterMode,
        promptBefore: beforePrompt,
        promptAfter: afterPrompt,
        paging: pagerAdvances > 0,
        awaitingConfirm: false,
        kind: "ios",
      },
      diagnostics: {
        statusCode: 1,
        completionReason,
        pagerAdvances,
        elapsedMs: Date.now() - startedAt,
        input: afterInput,
      },
    } as unknown as RuntimeResult;
  }

  return {
    ok: true,
    raw,
    output,
    status: 0,
    session: {
      modeBefore: beforeMode,
      modeAfter: afterMode,
      promptBefore: beforePrompt,
      promptAfter: afterPrompt,
      paging: pagerAdvances > 0,
      awaitingConfirm: false,
      kind: "ios",
    },
    diagnostics: {
      statusCode: 0,
      completionReason,
      pagerAdvances,
      elapsedMs: Date.now() - startedAt,
    },
  } as unknown as RuntimeResult;
}
