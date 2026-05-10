import { describe, expect, test } from "bun:test";
import { CmdQueue } from "./cmd-queue.js";

describe("CmdQueue", () => {
  test("enqueue returns id and promise", async () => {
    const q = new CmdQueue();
    const { id, promise } = q.enqueue({
      scope: "device",
      key: "SW1",
      label: "test",
      run: async () => "ok",
    });

    expect(id).toMatch(/^cmdq-/);
    const result = await promise;
    expect(result).toBe("ok");
  });

  test("done status for successful job", async () => {
    const q = new CmdQueue();
    const { id, promise } = q.enqueue({
      scope: "device",
      key: "SW1",
      label: "test",
      run: async () => "ok",
    });

    await promise;

    const snap = q.snapshot();
    expect(snap.done).toHaveLength(1);
    expect(snap.done[0]!.status).toBe("done");
    expect(snap.done_with_errors).toHaveLength(0);
    expect(snap.failed).toHaveLength(0);
  });

  test("failed status for thrown error", async () => {
    const q = new CmdQueue();
    const { id, promise } = q.enqueue({
      scope: "device",
      key: "SW1",
      label: "test",
      run: async () => { throw new Error("boom"); },
    });

    await expect(promise).rejects.toThrow("boom");

    const snap = q.snapshot();
    expect(snap.failed).toHaveLength(1);
    expect(snap.failed[0]!.status).toBe("failed");
  });

  test("setJobResultStatus changes status to done_with_errors", async () => {
    const q = new CmdQueue();
    const { id, promise } = q.enqueue({
      scope: "device",
      key: "SW1",
      label: "test",
      run: async () => "ok",
    });

    await promise;
    const changed = q.setJobResultStatus(id, "done_with_errors");
    expect(changed).toBe(true);

    const snap = q.snapshot();
    expect(snap.done).toHaveLength(0);
    expect(snap.done_with_errors).toHaveLength(1);
    expect(snap.done_with_errors[0]!.status).toBe("done_with_errors");
  });

  test("setJobResultStatus returns false for unknown id", async () => {
    const q = new CmdQueue();
    const changed = q.setJobResultStatus("nonexistent", "done_with_errors");
    expect(changed).toBe(false);
  });

  test("clearFinished removes done_with_errors jobs", async () => {
    const q = new CmdQueue();
    const { id, promise } = q.enqueue({
      scope: "device",
      key: "SW1",
      label: "test",
      run: async () => "ok",
    });

    await promise;
    q.setJobResultStatus(id, "done_with_errors");
    const cleared = q.clearFinished();
    expect(cleared).toBe(1);

    const snap = q.snapshot();
    expect(snap.done_with_errors).toHaveLength(0);
  });

  test("snapshot separates all status categories", async () => {
    const q = new CmdQueue();

    const j1 = q.enqueue({ scope: "device", key: "SW1", label: "ok", run: async () => "a" });
    const j2 = q.enqueue({ scope: "device", key: "SW2", label: "err", run: async () => "b" });
    const j3 = q.enqueue({ scope: "device", key: "SW3", label: "fail", run: async () => { throw new Error("x"); } });

    await Promise.allSettled([j1.promise, j2.promise, j3.promise]);
    q.setJobResultStatus(j2.id, "done_with_errors");

    const snap = q.snapshot();
    expect(snap.done).toHaveLength(1);
    expect(snap.done_with_errors).toHaveLength(1);
    expect(snap.failed).toHaveLength(1);
  });

  test("device scope serializes per device key", async () => {
    const q = new CmdQueue();
    const order: number[] = [];

    const r1 = q.enqueue({ scope: "device", key: "SW1", label: "", run: async () => { await delay(5); order.push(1); return 1; } });
    const r2 = q.enqueue({ scope: "device", key: "SW1", label: "", run: async () => { order.push(2); return 2; } });
    const r3 = q.enqueue({ scope: "device", key: "SW2", label: "", run: async () => { order.push(3); return 3; } });

    await Promise.all([r1.promise, r2.promise, r3.promise]);
    expect(order[0]).toBe(3);
    expect(order[1]).toBe(1);
    expect(order[2]).toBe(2);
  });

  test("global scope serializes all jobs", async () => {
    const q = new CmdQueue();
    const order: number[] = [];

    const r1 = q.enqueue({ scope: "global", key: "any", label: "", run: async () => { await delay(5); order.push(1); return 1; } });
    const r2 = q.enqueue({ scope: "global", key: "any", label: "", run: async () => { order.push(2); return 2; } });

    await Promise.all([r1.promise, r2.promise]);
    expect(order).toEqual([1, 2]);
  });
});

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
