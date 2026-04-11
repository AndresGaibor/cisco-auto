/**
 * PT Control V2 - Runtime Entry Point
 * 
 * This is the main runtime function called from PT main.js
 * Usage: var result = runtime(payload, api);
 * 
 * NOTE: This file is compiled to ES5 for Packet Tracer.
 * No imports/exports - all code is global scope compatible.
 */

import { runtimeDispatcher } from "../handlers/runtime-handlers";

/**
 * Main runtime dispatcher
 * Called by PT Script Engine with: runtime(payload, api)
 * 
 * @param payload - Command payload with type and parameters
 * @param api - RuntimeApi object injected by main.js kernel
 */
function runtime(payload: any, api: any): any {
  try {
    api.dprint("[RUNTIME] Processing: " + payload.type);

    if (payload.type === "__pollDeferred") {
      return handlePollDeferred(payload, api);
    }

    if (payload.type === "__hasPendingDeferred") {
      return handleHasPendingDeferred(api);
    }

    const result = runtimeDispatcher(payload, api);

    if (result && (result as any).deferred && (result as any).ticket && (result as any).job) {
      const jobId = (api as any).createJob?.((result as any).job);
      if (jobId) {
        (result as any).ticket = jobId;
        api.dprint("[RUNTIME] Job created: " + jobId);
      }
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    api.dprint("[RUNTIME] Fatal error: " + message);

    return {
      ok: false,
      error: "Runtime error: " + message
    };
  }
}

function handlePollDeferred(payload: any, api: any): any {
  const ticket = payload.ticket;
  if (!ticket) {
    return { ok: false, error: "Missing ticket" };
  }

  const getJobState = (api as any).getJobState;
  if (!getJobState) {
    return { ok: false, error: "API does not support getJobState" };
  }

  const jobState = getJobState(ticket);
  if (!jobState) {
    return { done: true, ok: false, error: "Job not found: " + ticket };
  }

  if (!jobState.done) {
    return {
      done: false,
      state: jobState.state,
      currentStep: jobState.currentStep,
      totalSteps: jobState.totalSteps,
      outputTail: jobState.outputTail
    };
  }

  return {
    done: true,
    ok: !jobState.error,
    result: jobState.result,
    error: jobState.error,
    errorCode: jobState.errorCode,
    output: jobState.output
  };
}

function handleHasPendingDeferred(api: any): any {
  const getActiveJobs = (api as any).getActiveJobs;
  if (!getActiveJobs) {
    return { pending: false };
  }

  const jobs = getActiveJobs();
  const hasPending = jobs && jobs.some((job: any) => !job.finished);
  
  return { pending: hasPending };
}

// Export for global scope
(globalThis as any).runtime = runtime;
export { runtime };