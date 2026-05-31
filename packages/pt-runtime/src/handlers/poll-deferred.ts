import type { RuntimeApi, RuntimeResult } from "../runtime/contracts.js";

interface PollDeferredPayload {
  ticket?: string;
}

const DEFAULT_POLL_INTERVAL_MS = 100;

const RECOMMENDED_POLL_BY_STATE: Record<string, number | undefined> = {
  pending: 150,
  "waiting-ensure-mode": 150,
  "waiting-command": 250,
  "waiting-confirm": 150,
  "waiting-prompt": 150,
  "waiting-save": 150,
  "waiting-delay": 100,
  cleanup: 150,
  queued: 150,
};

function getRecommendedPollAfterMs(state: string): number | undefined {
  return RECOMMENDED_POLL_BY_STATE[state];
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
    const recommendedPollAfterMs = getRecommendedPollAfterMs(jobState.state);

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
      recommendedPollAfterMs,
    } as unknown as RuntimeResult;
  }

  const result = (jobState.result ?? {}) as any;
  const output = String(
    result.rawOutput ??
      result.raw ??
      result.output ??
      jobState.outputBuffer ??
      "",
  );
  const status = Number(result.status ?? (jobState.error || jobState.state === "error" ? 1 : 0));
  const ok = Boolean(result.ok ?? (!jobState.error && jobState.state !== "error" && status === 0));

  return {
    done: true,
    ok,
    status,
    result: result,
    error: jobState.error || result.error || undefined,
    code: jobState.errorCode || result.code || result.errorCode || undefined,
    errorCode: jobState.errorCode || result.code || result.errorCode || undefined,
    raw: output,
    output,
    source: "terminal",
    stepResults: Array.isArray((jobState as any).stepResults)
      ? (jobState as any).stepResults
      : [],
    totalSteps: Array.isArray((jobState as any).plan?.plan)
      ? (jobState as any).plan.plan.length
      : undefined,
    currentStep: typeof (jobState as any).currentStep === "number"
      ? (jobState as any).currentStep
      : undefined,
    session: {
      mode: String(jobState.lastMode ?? ""),
      prompt: String(jobState.lastPrompt ?? ""),
      paging: jobState.paged === true,
      awaitingConfirm: false,
    },
  } as unknown as RuntimeResult;
}
