// packages/pt-runtime/src/__tests__/pt/terminal-session.test.ts
import { describe, test, expect } from "bun:test";
import {
  createTerminalSession,
  toSnapshot,
  updateMode,
  updatePrompt,
  setPaging,
  setBusy,
} from "../../pt/terminal/terminal-session";

describe("createTerminalSession", () => {
  test("creates default session", () => {
    const session = createTerminalSession("R1");

    expect(session.device).toBe("R1");
    expect(session.mode).toBe("unknown");
    expect(session.prompt).toBe("");
    expect(session.paging).toBe(false);
    expect(session.awaitingConfirm).toBe(false);
    expect(session.busyJobId).toBeNull();
    expect(session.healthy).toBe(true);
  });
});

describe("toSnapshot", () => {
  test("converts to SessionStateSnapshot", () => {
    const session = createTerminalSession("R1");
    session.mode = "privileged";
    session.prompt = "Router#";

    const snapshot = toSnapshot(session);

    expect(snapshot.mode).toBe("privileged");
    expect(snapshot.prompt).toBe("Router#");
    expect(snapshot.paging).toBe(false);
    expect(snapshot.awaitingConfirm).toBe(false);
  });
});

describe("updateMode", () => {
  test("updates mode", () => {
    const session = createTerminalSession("R1");
    const updated = updateMode(session, "privileged");

    expect(updated.mode).toBe("privileged");
    expect(updated.device).toBe("R1");
  });
});

describe("updatePrompt", () => {
  test("updates prompt", () => {
    const session = createTerminalSession("R1");
    const updated = updatePrompt(session, "Router(config)#");

    expect(updated.prompt).toBe("Router(config)#");
  });
});

describe("setPaging", () => {
  test("sets paging", () => {
    const session = createTerminalSession("R1");
    const updated = setPaging(session, true);

    expect(updated.paging).toBe(true);
  });
});

describe("setBusy", () => {
  test("sets busy job", () => {
    const session = createTerminalSession("R1");
    const updated = setBusy(session, "job-123");

    expect(updated.busyJobId).toBe("job-123");
  });

  test("clears busy job", () => {
    const session = createTerminalSession("R1");
    session.busyJobId = "job-123";
    const updated = setBusy(session, null);

    expect(updated.busyJobId).toBeNull();
  });
});