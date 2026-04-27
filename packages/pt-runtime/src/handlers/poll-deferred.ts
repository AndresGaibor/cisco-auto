import type { RuntimeApi, RuntimeResult } from "../runtime/contracts.js";

interface PollDeferredPayload {
  ticket?: string;
}

export function handlePollDeferred(payload: PollDeferredPayload, api: RuntimeApi): RuntimeResult {
  const ticket = String(payload.ticket ?? "").trim();

  if (!ticket) {
    return { ok: false, error: "Missing ticket", code: "INVALID_PAYLOAD" } as RuntimeResult;
  }

  const jobState = api.getJobState(ticket);
  if (!jobState) {
    return { ok: false, error: `Job not found: ${ticket}`, code: "UNKNOWN_COMMAND" } as RuntimeResult;
  }

  if (!jobState.finished) {
    return {
      done: false,
      state: jobState.state,
      currentStep: jobState.currentStep,
      totalSteps: jobState.plan.plan.length,
      outputTail: jobState.outputBuffer ? jobState.outputBuffer.slice(-500) : "",
    } as unknown as RuntimeResult;
  }

  return {
    done: true,
    ok: !jobState.error,
    result: jobState.result,
    error: jobState.error,
    errorCode: jobState.errorCode,
    output: jobState.outputBuffer,
  } as unknown as RuntimeResult;
}
