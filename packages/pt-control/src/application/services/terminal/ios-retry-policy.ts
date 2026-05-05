import {
  firstString,
  normalizeWarnings,
} from "./command-result-mapper.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRetryCommand(command: string): string {
  return String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isRetryableReadOnlyIosCommand(command: string): boolean {
  const normalized = normalizeRetryCommand(command);

  // Allowlist inicial conservadora. No ampliarla sin evidencia real.
  return /^show\s+version\b/.test(normalized);
}

export function getRuntimeErrorCode(runtimeResult: any): string {
  const evidence = isRecord(runtimeResult?.evidence) ? runtimeResult.evidence : {};
  const pollValue = isRecord(evidence.pollValue) ? evidence.pollValue : {};
  const parsed = isRecord(runtimeResult?.parsed) ? runtimeResult.parsed : {};
  const parsedError = isRecord(parsed.error) ? parsed.error : {};

  return String(
    runtimeResult?.error?.code ??
      runtimeResult?.code ??
      runtimeResult?.errorCode ??
      pollValue.code ??
      pollValue.errorCode ??
      parsed.code ??
      parsed.errorCode ??
      parsedError.code ??
      "",
  );
}

function hasUsefulRuntimeOutput(value: unknown): boolean {
  return String(value ?? "").trim().length > 0;
}

export function getRuntimeOutputEvidence(runtimeResult: any): string {
  const evidence = isRecord(runtimeResult?.evidence) ? runtimeResult.evidence : {};
  const pollValue = isRecord(evidence.pollValue) ? evidence.pollValue : {};

  return firstString(
    runtimeResult?.output,
    runtimeResult?.rawOutput,
    runtimeResult?.raw,
    runtimeResult?.parsed?.result?.output,
    runtimeResult?.parsed?.result?.rawOutput,
    runtimeResult?.parsed?.result?.raw,
    pollValue.output,
    pollValue.raw,
    pollValue.outputTail,
  );
}

export function isRecoverableEmptyTerminalTimeout(
  runtimeResult: any,
  command: string,
): boolean {
  if (!isRetryableReadOnlyIosCommand(command)) {
    return false;
  }

  if (runtimeResult?.ok === true) {
    return false;
  }

  const code = getRuntimeErrorCode(runtimeResult);

  if (code !== "JOB_TIMEOUT" && code !== "TERMINAL_DEFERRED_STALLED") {
    return false;
  }

  return !hasUsefulRuntimeOutput(getRuntimeOutputEvidence(runtimeResult));
}

function summarizePollValueForRetry(value: unknown): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    done: value.done,
    ok: value.ok,
    status: value.status,
    code: value.code,
    errorCode: value.errorCode,
    state: value.state,
    outputTail: value.outputTail,
    lastPrompt: value.lastPrompt,
    lastMode: value.lastMode,
    waitingForCommandEnd: value.waitingForCommandEnd,
    session: value.session,
  };
}

function getEvidenceRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? { ...value } : {};
}

export function attachRuntimeRetryEvidence(
  runtimeResult: any,
  args: {
    reason: string;
    attempts: number;
    firstRuntimeResult: any;
    retryDelayMs: number;
  },
): any {
  const firstEvidence = getEvidenceRecord(args.firstRuntimeResult?.evidence);
  const firstPollValue = isRecord(firstEvidence.pollValue) ? firstEvidence.pollValue : null;

  const evidence = getEvidenceRecord(runtimeResult?.evidence);
  const retry = {
    reason: args.reason,
    attempts: args.attempts,
    retryDelayMs: args.retryDelayMs,
    firstErrorCode: getRuntimeErrorCode(args.firstRuntimeResult),
    firstStatus: args.firstRuntimeResult?.status,
    firstOutputLen: String(args.firstRuntimeResult?.output ?? "").length,
    firstRawOutputLen: String(args.firstRuntimeResult?.rawOutput ?? "").length,
    firstTicket: firstEvidence.ticket,
    firstPhase: firstEvidence.phase,
    firstPollValue: summarizePollValueForRetry(firstPollValue),
  };

  return {
    ...runtimeResult,
    evidence: {
      ...evidence,
      retry,
    },
    warnings: [
      ...normalizeWarnings(runtimeResult?.warnings),
      `Se reintentó el comando IOS por timeout recuperable (${retry.firstErrorCode}).`,
    ],
  };
}
