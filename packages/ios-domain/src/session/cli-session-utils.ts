import { inferPromptState } from "./prompt-state";
import {
  classifyOutput,
  isPagingResult,
  isPasswordPrompt,
  isConfirmPrompt,
} from "./command-result";
import type { CommandResult } from "./command-result";
import type { CliSessionState } from "./cli-session-state";

function isInteractivePrompt(mode: string): boolean {
  return (
    mode === "awaiting-password" ||
    mode === "awaiting-confirm" ||
    mode === "username-prompt" ||
    mode === "login-prompt" ||
    mode === "copy-destination" ||
    mode === "reload-confirm" ||
    mode === "erase-confirm"
  );
}

export interface StateTransitionResult {
  result: CommandResult;
  stateUpdated: boolean;
}

export function processCommandOutput(
  raw: string,
  command: string,
  status: number,
  modeBefore: string | undefined,
): CommandResult {
  const lastLine = raw.trim().split('\n').map(l => l.trim()).filter(Boolean).at(-1) ?? "";
  const promptState = inferPromptState(lastLine);
  const classification = classifyOutput(raw);

  return {
    ok: status === 0 &&
      classification.type !== "invalid" &&
      classification.type !== "error" &&
      classification.type !== "incomplete" &&
      classification.type !== "dns-lookup-timeout" &&
      classification.type !== "permission-denied",
    raw,
    status,
    classification: classification.type,
    modeBefore: modeBefore as any,
    modeAfter: promptState.mode !== "unknown" ? promptState.mode : (modeBefore as any),
    warnings: classification.warnings,
  };
}

export function updateStateFromResult(
  state: CliSessionState,
  result: CommandResult,
): void {
  const promptState = inferPromptState(result.raw);
  const classification = classifyOutput(result.raw);

  handlePagingState(state, result, promptState, classification);
  handleConfirmationState(state, result, promptState, classification);
  handlePasswordPrompt(state, result, promptState);
  handleDnsLookup(state, result, promptState, classification);
  handleCopyDestinationPrompt(state, result, promptState);
  handleReloadConfirm(state, result, promptState);
  handleEraseConfirm(state, result, promptState);
  handleDesync(state, result, promptState);
  updateModeFromPrompt(state, result, promptState);
}

function handlePagingState(
  state: CliSessionState,
  result: CommandResult,
  promptState: ReturnType<typeof inferPromptState>,
  classification: ReturnType<typeof classifyOutput>,
): void {
  if (promptState.mode === "paging" || classification.type === "paging") {
    result.paging = true;
    state.paging = true;
  } else {
    state.paging = false;
  }
}

function handleConfirmationState(
  state: CliSessionState,
  result: CommandResult,
  promptState: ReturnType<typeof inferPromptState>,
  classification: ReturnType<typeof classifyOutput>,
): void {
  if (promptState.mode === "awaiting-confirm" || classification.type === "confirmation-required") {
    result.awaitingConfirm = true;
    state.awaitingConfirm = true;
  } else {
    state.awaitingConfirm = false;
  }
}

function handlePasswordPrompt(
  state: CliSessionState,
  result: CommandResult,
  promptState: ReturnType<typeof inferPromptState>,
): void {
  if (promptState.mode === "awaiting-password") {
    state.awaitingPassword = true;
    state.mode = "awaiting-password";
    result.modeAfter = "awaiting-password";
    result.awaitingDnsLookup = false;
  } else {
    state.awaitingPassword = false;
  }
}

function handleDnsLookup(
  state: CliSessionState,
  result: CommandResult,
  promptState: ReturnType<typeof inferPromptState>,
  classification: ReturnType<typeof classifyOutput>,
): void {
  if (promptState.mode === "resolving-hostname" || classification.type === "dns-lookup") {
    state.awaitingDnsLookup = true;
    state.mode = "resolving-hostname";
    result.modeAfter = "resolving-hostname";
    result.awaitingDnsLookup = true;
    result.ok = false;
    result.error = result.error ?? "IOS triggered DNS hostname lookup";
  } else if (classification.type === "dns-lookup-timeout") {
    state.awaitingDnsLookup = false;
    state.mode = "unknown";
    result.modeAfter = "unknown";
  }
}

function handleCopyDestinationPrompt(
  state: CliSessionState,
  result: CommandResult,
  promptState: ReturnType<typeof inferPromptState>,
): void {
  if (promptState.mode === "copy-destination") {
    state.awaitingCopyDestination = true;
    result.awaitingConfirm = true;
  }
}

function handleReloadConfirm(
  state: CliSessionState,
  result: CommandResult,
  promptState: ReturnType<typeof inferPromptState>,
): void {
  if (promptState.mode === "reload-confirm") {
    state.awaitingReloadConfirm = true;
    result.awaitingConfirm = true;
  }
}

function handleEraseConfirm(
  state: CliSessionState,
  result: CommandResult,
  promptState: ReturnType<typeof inferPromptState>,
): void {
  if (promptState.mode === "erase-confirm") {
    state.awaitingEraseConfirm = true;
    result.awaitingConfirm = true;
  }
}

function handleDesync(
  state: CliSessionState,
  result: CommandResult,
  promptState: ReturnType<typeof inferPromptState>,
): void {
  if (promptState.mode === "unknown" && result.modeBefore !== "unknown" && result.modeBefore !== "paging") {
    state.desynced = true;
    result.error = result.error ?? `Session desynced: Mode inference returned unknown after ${result.modeBefore}`;
    result.classification = "session-desync";
  }
}

function updateModeFromPrompt(
  state: CliSessionState,
  result: CommandResult,
  promptState: ReturnType<typeof inferPromptState>,
): void {
  if (
    promptState.mode !== "unknown" &&
    promptState.mode !== "paging" &&
    !isInteractivePrompt(promptState.mode)
  ) {
    state.mode = promptState.mode;
    state.desynced = false;
  }

  if (promptState.deviceName) {
    state.deviceName = promptState.deviceName;
  }
}

export function maintainHistory(
  history: Array<{ command: string; result: CommandResult; timestamp: number }>,
  entry: { command: string; result: CommandResult; timestamp: number },
  maxSize: number,
): void {
  history.push(entry);

  if (maxSize <= 0) {
    return;
  }

  if (history.length > maxSize) {
    const removeCount = Math.max(1, Math.floor(maxSize * 0.2));
    history.splice(0, removeCount);
  }
}
