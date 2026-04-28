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

  const finished =
    jobState.finished === true ||
    (jobState as any).done === true ||
    jobState.state === "completed" ||
    jobState.state === "error";

  if (!finished) {
    const currentStep = jobState.currentStep ?? 0;
    const currentStepData = jobState.plan.plan[currentStep];
    return {
      ok: true,
      deferred: true,
      ticket,
      done: false,
      state: jobState.state,
      currentStep,
      totalSteps: jobState.plan.plan.length,
      stepType: currentStepData?.type,
      stepValue: currentStepData?.value,
      outputTail: jobState.outputBuffer ? jobState.outputBuffer.slice(-500) : "",
      lastPrompt: jobState.lastPrompt,
      lastMode: jobState.lastMode,
      waitingForCommandEnd: jobState.waitingForCommandEnd,
      updatedAt: jobState.updatedAt,
      ageMs: Date.now() - jobState.startedAt,
      idleMs: Date.now() - jobState.updatedAt,
      debug: (jobState as any).debug || [],
      stepResults: (jobState as any).stepResults || [],
    } as unknown as RuntimeResult;
  }

  const output = String(jobState.outputBuffer ?? (jobState.result as any)?.raw ?? (jobState.result as any)?.output ?? "");
  const status = jobState.error || jobState.state === "error" ? 1 : Number((jobState.result as any)?.status ?? 0);

  return {
    done: true,
    ok: !jobState.error && jobState.state !== "error",
    status,
    result: jobState.result,
    error: jobState.error || undefined,
    code: jobState.errorCode || undefined,
    errorCode: jobState.errorCode || undefined,
    raw: output,
    output,
    source: "terminal",
    session: {
      mode: String(jobState.lastMode ?? ""),
      prompt: String(jobState.lastPrompt ?? ""),
      paging: jobState.paged === true,
      awaitingConfirm: false,
    },
  } as unknown as RuntimeResult;
}
