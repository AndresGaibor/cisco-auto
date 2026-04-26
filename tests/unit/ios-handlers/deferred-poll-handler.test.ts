// ============================================================================
// Deferred Poll Handler Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import { handleDeferredPoll } from "../../../packages/pt-runtime/src/handlers/ios/deferred-poll-handler.ts";

describe("handleDeferredPoll", () => {
  it("should return job not found error when ticket does not exist", () => {
    const api = { getJobState: (_ticket: string) => null } as any;
    const result = handleDeferredPoll({ type: "__pollDeferred", ticket: "nonexistent" }, api);

    expect(result.ok).toBe(false);
    expect(result.code).toBe("JOB_NOT_FOUND");
    expect((result as any).done).toBe(true);
  });

  it("should return deferred status when job is not done", () => {
    const api = {
      getJobState: (_ticket: string) => ({ done: false, state: { progress: 50 } }),
    } as any;
    const result = handleDeferredPoll({ type: "__pollDeferred", ticket: "job-123" }, api);

    expect(result.ok).toBe(true);
    expect((result as any).deferred).toBe(true);
    expect((result as any).done).toBe(false);
    expect((result as any).ticket).toBe("job-123");
  });

  it("should return completed result when job is done with output", () => {
    const api = {
      getJobState: (_ticket: string) => ({
        done: true,
        output: "Configuration applied successfully",
      }),
    } as any;
    const result = handleDeferredPoll({ type: "__pollDeferred", ticket: "job-456" }, api);

    expect(result.ok).toBe(true);
    expect((result as any).done).toBe(true);
    expect((result as any).raw).toContain("Configuration applied");
    expect((result as any).source).toBe("terminal");
  });
});
