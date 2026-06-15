// packages/pt-runtime/src/pt/kernel/poller/fast-deferred.ts
// Lógica de resolución rápida de resultados deferred

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clampFastDeferredWaitMs(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(Math.trunc(parsed), 1200));
}

export function isDeferredRuntimeResult(value: unknown): value is {
  ok: true;
  deferred: true;
  ticket: string;
} {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;

  return (
    record.ok === true &&
    record.deferred === true &&
    typeof record.ticket === "string" &&
    record.ticket.trim().length > 0
  );
}

export function isFinishedJobState(jobState: any): boolean {
  if (!jobState) return false;

  return (
    jobState.finished === true ||
    jobState.done === true ||
    jobState.state === "completed" ||
    jobState.state === "error" ||
    jobState.phase === "completed" ||
    jobState.phase === "error"
  );
}

export function buildCompletedDeferredRuntimeResult(ticket: string, jobState: any, fastDeferred?: any): any {
  const result = jobState.result ?? {};
  const output = String(
    result.rawOutput ??
      result.raw ??
      result.output ??
      jobState.output ??
      jobState.outputBuffer ??
      "",
  );

  const status = Number(
    result.status ??
      (jobState.error || jobState.errorCode || jobState.state === "error" ? 1 : 0),
  );

  const ok = Boolean(
    result.ok ??
      (!jobState.error && !jobState.errorCode && jobState.state !== "error" && status === 0),
  );

  return {
    done: true,
    ok,
    status,
    inlineCompleted: true,
    fastDeferred: fastDeferred || undefined,
    diagnostics: fastDeferred ? { fastDeferred } : undefined,
    ticket,
    jobId: ticket,
    result: fastDeferred && result && typeof result === "object"
      ? { ...result, fastDeferred }
      : result,
    error: jobState.error || result.error || undefined,
    code: jobState.errorCode || result.code || result.errorCode || undefined,
    errorCode: jobState.errorCode || result.code || result.errorCode || undefined,
    raw: output,
    output,
    source: "terminal",
    stepResults: Array.isArray(jobState?.stepResults)
      ? jobState.stepResults
      : [],
    totalSteps: Array.isArray(jobState?.plan?.plan)
      ? jobState.plan.plan.length
      : undefined,
    currentStep: typeof jobState?.currentStep === "number"
      ? jobState.currentStep
      : undefined,
    session: {
      mode: String(jobState.lastMode ?? ""),
      prompt: String(jobState.lastPrompt ?? ""),
      paging: jobState.paged === true,
      awaitingConfirm: false,
    },
  };
}

export function shouldAttemptFastDeferredResolution(claimed: any, result: any): boolean {
  if (!isDeferredRuntimeResult(result)) return false;

  const commandType = String(claimed?.type || claimed?.payload?.type || "");
  if (commandType !== "terminal.plan.run") return false;

  const payload = claimed?.payload ?? {};

  return payload.waitForCompletion === true;
}

export async function tryResolveFastDeferredResult(
  claimed: any,
  result: any,
  executionEngine: any,
  kernelLogSubsystem: (name: string, message: string) => void,
): Promise<any | null> {
  if (!shouldAttemptFastDeferredResolution(claimed, result)) {
    return null;
  }

  if (!executionEngine || typeof executionEngine.getJobState !== "function") {
    return null;
  }

  const ticket = String(result.ticket || "").trim();
  if (!ticket) return null;

  const payload = claimed?.payload ?? {};
  const budgetMs = clampFastDeferredWaitMs(payload.inlineTimeoutMs ?? 1200);

  if (budgetMs <= 0) {
    return null;
  }

  const startedAt = Date.now();
  const intervalMs = 25;
  let fastDeferredChecks = 0;

  kernelLogSubsystem(
    "queue",
    "fast deferred resolution start ticket=" + ticket + " budgetMs=" + budgetMs,
  );

  while (Date.now() - startedAt <= budgetMs) {
    const jobState = executionEngine.getJobState(ticket);
    fastDeferredChecks += 1;

    if (isFinishedJobState(jobState)) {
      const elapsedMs = Date.now() - startedAt;

      kernelLogSubsystem(
        "queue",
        "fast deferred resolution hit ticket=" + ticket + " elapsedMs=" + elapsedMs,
      );

      return buildCompletedDeferredRuntimeResult(ticket, jobState, {
        enabled: true,
        hit: true,
        ticket,
        waitMs: elapsedMs,
        budgetMs,
        intervalMs,
        checks: fastDeferredChecks,
        resolvedState: String(jobState?.state ?? jobState?.phase ?? ''),
        resolvedFinished: jobState?.finished === true || jobState?.done === true,
      });
    }

    const remainingMs = budgetMs - (Date.now() - startedAt);
    if (remainingMs <= 0) break;

    await sleepMs(Math.min(intervalMs, remainingMs));
  }

  kernelLogSubsystem(
    "queue",
    "fast deferred resolution miss ticket=" + ticket + " elapsedMs=" + (Date.now() - startedAt),
  );

  return null;
}
