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
  if (!jobState) return { ...createErrorResult(`Job not found: ${ticket}`, "JOB_NOT_FOUND"), done: true } as PtResult;
  if (!jobState.done) return { ok: true, deferred: true, ticket, done: false, state: jobState.state } as any;
  const rawOutput = jobState.output || "";
  return { ok: true, done: true, raw: sanitizeTerminalOutput(undefined, rawOutput) || rawOutput, source: "terminal" };
}
