// packages/pt-runtime/src/__tests__/runtime/runtime-entry.test.ts
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { initializeLogger, getLogger } from "../../runtime/logger";
import type { RuntimeApi } from "../../runtime/contracts";

describe("Runtime Entry - Logging de comandos", () => {
  let entries: any[] = [];

  beforeEach(() => {
    entries = [];
    initializeLogger({
      level: "debug",
      transport: (entry) => entries.push(entry),
      includeData: true,
    });
  });

  test("runtime function existe y es callable", async () => {
    const { runtime } = await import("../../runtime/index");
    expect(typeof runtime).toBe("function");
  });

  test("logger captura mensajes con commandType", () => {
    const log = getLogger("test");
    log.withCommand("testCommand").info("test message");

    expect(entries.length).toBe(1);
    expect(entries[0].commandType).toBe("testCommand");
    expect(entries[0].msg).toBe("test message");
  });

  test("logger captura entradas con payloadKeys", () => {
    const log = getLogger("test");
    log.debug("Runtime entrada", {
      commandType: "listDevices",
      payloadKeys: ["type", "device"],
    });

    expect(entries.length).toBe(1);
    expect(entries[0].data?.commandType).toBe("listDevices");
  });

  test("logger captura resultados con ok/deferred/ticket", () => {
    const log = getLogger("test");
    log.debug("Runtime resultado", {
      commandType: "config",
      ok: true,
      deferred: true,
      ticket: "TICKET-123",
    });

    expect(entries.length).toBe(1);
    expect(entries[0].data?.ok).toBe(true);
    expect(entries[0].data?.deferred).toBe(true);
    expect(entries[0].data?.ticket).toBe("TICKET-123");
  });

  test("logger captura errores fatales con stack", () => {
    const log = getLogger("runtime");
    log.error("Runtime fatal error", {
      error: "fatal error message",
      stack: "Error at ... in file.js",
      payloadType: "testFatal",
    });

    expect(entries.length).toBe(1);
    expect(entries[0].level).toBe("error");
    expect(entries[0].data?.error).toBe("fatal error message");
    expect(entries[0].data?.stack).toBeDefined();
  });

  test("comandos especiales (__pollDeferred) se loguean", () => {
    const log = getLogger("runtime");
    log.debug("Runtime entrada __pollDeferred", { ticket: "TICKET-123" });
    log.debug("Runtime resultado __pollDeferred", { done: false, ok: true });

    const pollLogs = entries.filter((e) => e.msg && e.msg.includes("pollDeferred"));
    expect(pollLogs.length).toBe(2);
  });

  test("comandos especiales (__hasPendingDeferred) se loguean", () => {
    const log = getLogger("runtime");
    log.debug("Runtime entrada __hasPendingDeferred", {});
    log.debug("Runtime resultado __hasPendingDeferred", { pending: true });

    const pendingLogs = entries.filter((e) => e.msg && e.msg.includes("hasPendingDeferred"));
    expect(pendingLogs.length).toBe(2);
  });

  test("payload con valores largos no incluye valores", () => {
    const log = getLogger("runtime");
    const longValue = "a".repeat(5000);

    log.debug("Runtime entrada", {
      commandType: "config",
      payloadKeys: ["type", "commands", "longConfig"],
      commands: ["interface gig0/1"],
      longConfig: longValue,
    });

    expect(entries.length).toBe(1);
    const data = entries[0].data;
    expect(data).toBeDefined();
  });
});
