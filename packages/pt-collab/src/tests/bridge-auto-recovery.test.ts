import { describe, expect, test } from "bun:test";
import { BridgeAutoRecovery } from "../telemetry/bridge-auto-recovery.js";

describe("BridgeAutoRecovery", () => {
  test("no se activa para frequent_failures con muestras insuficientes", async () => {
    let triggered = 0;
    const recovery = new BridgeAutoRecovery({
      stuckThresholdMs: 5000,
      stuckConsecutivePolls: 3,
      failureRateThreshold: 0.5,
      minSamples: 10,
      onRecoveryNeeded: () => { triggered++; },
    });

    await recovery.recordPoll(100, false);
    await recovery.recordPoll(100, false);
    await recovery.recordPoll(100, false);
    await recovery.recordPoll(100, false);

    expect(triggered).toBe(0);
  });

  test("se activa tras polls stuck consecutivos", async () => {
    let triggeredDetails = "";
    let triggeredCount = 0;
    const recovery = new BridgeAutoRecovery({
      stuckThresholdMs: 5000,
      stuckConsecutivePolls: 3,
      minSamples: 1,
      cooldownMs: 100,
      onRecoveryNeeded: (_t, details) => {
        triggeredCount++;
        triggeredDetails = details;
      },
    });

    await recovery.recordPoll(6000, true);
    await recovery.recordPoll(6000, true);
    await recovery.recordPoll(6000, true);

    expect(triggeredCount).toBe(1);
    expect(triggeredDetails).toContain("atascado");
  });

  test("respeta el cooldown (no se dispara dos veces seguidas)", async () => {
    let triggeredCount = 0;
    const recovery = new BridgeAutoRecovery({
      stuckThresholdMs: 5000,
      stuckConsecutivePolls: 2,
      minSamples: 1,
      cooldownMs: 60_000,
      onRecoveryNeeded: () => { triggeredCount++; },
    });

    await recovery.recordPoll(6000, true);
    await recovery.recordPoll(6000, true);
    await recovery.recordPoll(6000, true);
    await recovery.recordPoll(6000, true);
    await recovery.recordPoll(6000, true);
    await recovery.recordPoll(6000, true);

    expect(triggeredCount).toBe(1);
  });

  test("detecta alta tasa de fallos y dispara frequent_failures", async () => {
    let triggered: "frequent_failures" | null = null;
    const recovery = new BridgeAutoRecovery({
      stuckThresholdMs: 5000,
      stuckConsecutivePolls: 10,
      failureRateThreshold: 0.5,
      minSamples: 4,
      cooldownMs: 100,
      onRecoveryNeeded: (t, _d) => { triggered = t as "frequent_failures"; },
    });

    await recovery.recordPoll(100, false);
    await recovery.recordPoll(100, false);
    await recovery.recordPoll(100, true);
    await recovery.recordPoll(100, false);

    expect(triggered as unknown as "frequent_failures").toBe("frequent_failures");
  });

  test("triggerFatal respeta cooldown como cualquier otro", async () => {
    let count = 0;
    const recovery = new BridgeAutoRecovery({
      stuckThresholdMs: 5000,
      stuckConsecutivePolls: 2,
      minSamples: 1,
      cooldownMs: 100,
      onRecoveryNeeded: () => { count++; },
    });

    await recovery.recordPoll(6000, true);
    await recovery.recordPoll(6000, true);
    await new Promise((r) => setTimeout(r, 150));
    await recovery.triggerFatal("Bridge crashed");
    await new Promise((r) => setTimeout(r, 150));
    await recovery.triggerFatal("Bridge crashed again");

    expect(count).toBe(3);
  });

  test("reset limpia el estado", async () => {
    let count = 0;
    const recovery = new BridgeAutoRecovery({
      stuckThresholdMs: 5000,
      stuckConsecutivePolls: 2,
      minSamples: 1,
      cooldownMs: 60_000,
      onRecoveryNeeded: () => { count++; },
    });

    await recovery.recordPoll(6000, true);
    await recovery.recordPoll(6000, true);
    expect(count).toBe(1);

    recovery.reset();
    const state = recovery.getState();
    expect(state.consecutiveStuckPolls).toBe(0);
    expect(state.recentFailures).toBe(0);
    expect(state.lastTrigger).toBeNull();
  });

  test("getState expone métricas actuales", async () => {
    const recovery = new BridgeAutoRecovery({
      stuckThresholdMs: 5000,
      stuckConsecutivePolls: 3,
      minSamples: 1,
      onRecoveryNeeded: () => {},
    });

    await recovery.recordPoll(100, true);
    await recovery.recordPoll(200, true);
    await recovery.recordPoll(100, false);

    const state = recovery.getState();
    expect(state.totalSamples).toBe(3);
    expect(state.recentFailures).toBe(1);
    expect(state.consecutiveStuckPolls).toBe(0);
  });
});
