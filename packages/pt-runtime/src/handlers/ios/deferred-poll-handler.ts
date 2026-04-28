// ============================================================================
// Deferred Poll Handler - Polling for deferred job state
// ============================================================================

import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";
import type { PtResult } from "../../pt-api/pt-results.js";
import type { PollDeferredPayload } from "../ios-payloads.js";
import { createErrorResult } from "../result-factories";
import { sanitizeTerminalOutput } from "../terminal-sanitizer";

export function handleDeferredPoll(pollPayload: PollDeferredPayload, api: PtRuntimeApi): PtResult {
  const { ticket } = pollPayload;
  const jobState = (api as any).getJobState?.(ticket);

  if (!jobState) {
    return {
      ...createErrorResult(`Job not found: ${ticket}`, "JOB_NOT_FOUND"),
      done: true,
      ticket,
    } as PtResult;
  }

  const rawOutput = String(
    jobState.output ?? jobState.outputBuffer ?? jobState.result?.raw ?? jobState.result?.output ?? ""
  );

  const done =
    jobState.done === true ||
    jobState.finished === true ||
    jobState.state === "completed" ||
    jobState.state === "error";

  if (!done) {
    return {
      ok: true,
      deferred: true,
      ticket,
      done: false,
      state: jobState.state,
      updatedAt: jobState.updatedAt,
      currentStep: jobState.currentStep,
      waitingForCommandEnd: jobState.waitingForCommandEnd,
      outputLen: rawOutput.length,
      outputTail: rawOutput.slice(Math.max(0, rawOutput.length - 600)),
      lastPrompt: jobState.lastPrompt,
      lastMode: jobState.lastMode,
      error: jobState.error,
      errorCode: jobState.errorCode,
    } as any;
  }

  if (jobState.error || jobState.errorCode || jobState.state === "error") {
    return {
      ok: false,
      done: true,
      ticket,
      code: jobState.errorCode || "DEFERRED_JOB_FAILED",
      error: jobState.error || "Deferred job failed",
      raw: rawOutput,
      output: rawOutput,
      source: "terminal",
      state: jobState.state,
      lastPrompt: jobState.lastPrompt,
      lastMode: jobState.lastMode,
    } as any;
  }

  const cleanOutput = sanitizeTerminalOutput(undefined, rawOutput) || rawOutput;

  return {
    ok: true,
    done: true,
    ticket,
    raw: cleanOutput,
    output: cleanOutput,
    source: "terminal",
    state: jobState.state,
    lastPrompt: jobState.lastPrompt,
    lastMode: jobState.lastMode,
  } as any;
}
