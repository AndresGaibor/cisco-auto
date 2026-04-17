import { describe, expect, test } from "bun:test";

import { safeFM } from "../pt/kernel/safe-fm";
import { createHeartbeat } from "../pt/kernel/heartbeat";

describe("Kernel debug logging", () => {
  test("no emite logs ruidosos por defecto", () => {
    const calls: string[] = [];
    const originalDprint = (globalThis as any).dprint;
    (globalThis as any).dprint = (msg: string) => {
      calls.push(String(msg));
    };

    const originalDebug = (globalThis as any).PT_DEBUG;
    const originalFm = (globalThis as any).fm;
    const originalIpc = (globalThis as any).ipc;
    (globalThis as any).PT_DEBUG = undefined;
    (globalThis as any).fm = {
      writePlainTextToFile: () => {},
    };
    (globalThis as any).ipc = null;

    try {
      safeFM();
      const heartbeat = createHeartbeat({ devDir: "/tmp", intervalMs: 10 });
      heartbeat.write();

      expect(calls.some((msg) => msg.includes("[fm]"))).toBe(false);
      expect(calls.some((msg) => msg.includes("[heartbeat]"))).toBe(false);
    } finally {
      (globalThis as any).PT_DEBUG = originalDebug;
      (globalThis as any).dprint = originalDprint;
      (globalThis as any).fm = originalFm;
      (globalThis as any).ipc = originalIpc;
    }
  });
});
