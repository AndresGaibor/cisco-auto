import { describe, expect, test, vi } from "bun:test";

import { createRuntimeTerminalAdapter } from "./adapter.js";
import {
  computeInitialDeferredPollDelayMs,
  computeRecommendedDeferredPollSleepMs,
} from "./plan-run-transport.js";

describe("createRuntimeTerminalAdapter plan-run transport", () => {
  test("submit timeout se calcula correctamente para planes cortos", async () => {
    const calls: Array<{ type: string; timeoutMs?: number }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, _payload: unknown, timeoutMs?: number) => {
        calls.push({ type, timeoutMs });
        return {
          ok: true,
          status: 0,
          completedAt: Date.now(),
          value: {
            ok: true,
            output: "R1#show version\nCisco IOS\nR1#",
            session: { mode: "privileged-exec", prompt: "R1#" },
            diagnostics: { statusCode: 0 },
          },
        };
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 45000,
    });

    await adapter.runTerminalPlan({
      id: "plan-1",
      device: "R1",
      steps: [{ command: "show version" }],
    } as never);

    expect(calls[0]?.type).toBe("terminal.plan.run");
    expect(calls[0]?.timeoutMs).toBeGreaterThanOrEqual(15000);
    expect(calls[0]?.timeoutMs).toBeLessThanOrEqual(30000);
  });

  test("terminal.plan.run recibe resolveDeferred:false", async () => {
    const calls: Array<{ type: string; options?: unknown }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, _payload: unknown, _timeoutMs?: number, options?: unknown) => {
        calls.push({ type, options });
        return {
          ok: true,
          status: 0,
          completedAt: Date.now(),
          value: {
            ok: true,
            output: "R1#show version\nCisco IOS\nR1#",
            session: { mode: "privileged-exec", prompt: "R1#" },
          },
        };
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 45000,
    });

    await adapter.runTerminalPlan({
      id: "plan-1",
      device: "R1",
      steps: [{ command: "show version" }],
    } as never);

    expect(calls[0]?.type).toBe("terminal.plan.run");
    expect(calls[0]?.options).toMatchObject({ resolveDeferred: false });
  });

  test("respuesta inmediata sin deferred se procesa correctamente", async () => {
    const bridge = {
      sendCommandAndWait: vi.fn(async () => ({
        ok: true,
        status: 0,
        completedAt: Date.now(),
        value: {
          ok: true,
          output: "R1#show version\nCisco IOS Software\nR1#",
          session: { modeBefore: "user-exec", modeAfter: "privileged-exec", promptBefore: "R1>", promptAfter: "R1#" },
          diagnostics: { completionReason: "completed", statusCode: 0 },
        },
      })),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan({
      id: "plan-1",
      device: "R1",
      steps: [{ command: "show version" }],
    } as never);

    expect(result.ok).toBe(true);
    expect(result.output).toContain("Cisco IOS");
    expect(result.status).toBe(0);
    expect(result.promptAfter).toBe("R1#");
    expect(result.confidence).toBe(1);
  });

  test("respuesta fallida con ok:false retorna fallo", async () => {
    const bridge = {
      sendCommandAndWait: vi.fn(async () => ({
        ok: true,
        status: 1,
        completedAt: Date.now(),
        value: {
          ok: false,
          output: "% Invalid input detected",
          session: { mode: "privileged-exec", prompt: "R1#" },
          diagnostics: { statusCode: 1 },
          error: "% Invalid input detected at '^' marker.",
        },
      })),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan({
      id: "plan-1",
      device: "R1",
      steps: [{ command: "invalid command" }],
    } as never);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(1);
    expect(result.confidence).toBe(0);
  });

  test("polling diferido usa recommendedPollAfterMs del runtime en timings", async () => {
    let pollCount = 0;

    const bridge = {
      sendCommandAndWait: vi.fn((type: string) => {
        if (type === "terminal.plan.run") {
          return Promise.resolve({
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              ok: true,
              deferred: true,
              ticket: "ticket-recommended",
            },
          });
        }

        if (type === "__pollDeferred") {
          pollCount += 1;

          if (pollCount === 1) {
            return new Promise((resolve) =>
              setTimeout(() => {
                resolve({
                  ok: true,
                  status: 0,
                  completedAt: Date.now(),
                  value: {
                    ok: true,
                    deferred: true,
                    done: false,
                    ticket: "ticket-recommended",
                    state: "waiting-command",
                    recommendedPollAfterMs: 250,
                  },
                });
              }, 10),
            );
          }

          return Promise.resolve({
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              done: true,
              ok: true,
              status: 0,
              output: "show version\nCisco IOS Software\nR1#",
              raw: "show version\nCisco IOS Software\nR1#",
              session: {
                mode: "privileged-exec",
                prompt: "R1#",
              },
            },
          });
        }

        throw new Error(`unexpected command type ${type}`);
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan(
      {
        id: "plan-1",
        device: "R1",
        steps: [{ command: "show version" }],
        metadata: {
          deferredInitialPollDelayMs: 0,
        },
        timeouts: {
          commandTimeoutMs: 1000,
          stallTimeoutMs: 1000,
        },
      } as never,
      { timeoutMs: 1000 },
    );

    expect(pollCount).toBe(2);
    expect(result.ok).toBe(true);
    expect(result.output).toContain("Cisco IOS");

    const timings = (result.evidence as any)?.timings?.adapter ?? (result.evidence as any)?.timings ?? {};
    expect(timings.terminalPlanPollRecommendedCount ?? 0).toBe(1);
    expect(timings.terminalPlanPollLastRecommendedSleepMs ?? 0).toBe(250);
  });

  test("fallo deferred stalled preserva timings completos en evidence", async () => {
    let pollCount = 0;

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string) => {
        if (type === "terminal.plan.run") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            timings: {
              queueLatencyMs: 10,
              execLatencyMs: 5,
            },
            value: {
              ok: true,
              deferred: true,
              ticket: "ticket-stalled",
            },
          };
        }

        if (type === "__pollDeferred") {
          pollCount += 1;

          if (pollCount >= 3) {
            return {
              ok: true,
              status: 0,
              completedAt: Date.now(),
              value: {
                done: true,
                ok: true,
                status: 0,
                output: "show version\nCisco IOS Software\nR1#",
                session: { mode: "privileged-exec", prompt: "R1#" },
              },
            };
          }

          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            timings: {
              queueLatencyMs: 20,
              execLatencyMs: 7,
            },
            value: {
              ok: true,
              deferred: true,
              done: false,
              ticket: "ticket-stalled",
              state: "waiting-command",
              recommendedPollAfterMs: 75,
            },
          };
        }

        throw new Error(`unexpected command type ${type}`);
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan(
      {
        id: "plan-stalled",
        device: "R1",
        steps: [{ command: "show version" }],
        metadata: {
          deferredInitialPollDelayMs: 0,
        },
        timeouts: {
          commandTimeoutMs: 50,
          stallTimeoutMs: 50,
        },
      } as never,
      { timeoutMs: 50 },
    );

    expect(result.ok).toBe(true);
    expect(result.output).toContain("Cisco IOS");

    const evidence = result.evidence as any;
    expect(evidence.timings).toMatchObject({
      terminalPlanPollCount: expect.any(Number),
      terminalPlanPollPendingCount: expect.any(Number),
      terminalPlanPollTimeoutMs: expect.any(Number),
      terminalPlanPollBridgeMs: expect.any(Number),
      terminalPlanPollQueueLatencyMs: expect.any(Number),
      terminalPlanPollExecLatencyMs: expect.any(Number),
      terminalPlanPollRecommendedCount: expect.any(Number),
      terminalPlanPollLastRecommendedSleepMs: expect.any(Number),
    });
  });
});
describe("createRuntimeTerminalAdapter plan-run transport", () => {
  test("poll diferido finalizado en JOB_TIMEOUT preserva pollValue y timings", async () => {
    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string) => {
        if (type === "terminal.plan.run") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            timings: {
              queueLatencyMs: 10,
              execLatencyMs: 5,
            },
            value: {
              ok: true,
              deferred: true,
              ticket: "ticket-job-timeout",
            },
          };
        }

        if (type === "__pollDeferred") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            timings: {
              queueLatencyMs: 20,
              execLatencyMs: 7,
            },
            value: {
              done: true,
              ok: false,
              status: 1,
              code: "JOB_TIMEOUT",
              errorCode: "JOB_TIMEOUT",
              error: "Job timed out while waiting for terminal command completion",
              output: "",
              raw: "",
              session: {
                mode: "unknown",
                prompt: "",
              },
            },
          };
        }

        throw new Error(`unexpected command type ${type}`);
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan(
      {
        id: "plan-job-timeout",
        device: "R1",
        steps: [{ command: "show version" }],
        metadata: {
          deferredInitialPollDelayMs: 0,
        },
        timeouts: {
          commandTimeoutMs: 1000,
          stallTimeoutMs: 1000,
        },
      } as never,
      { timeoutMs: 1000 },
    );

    expect(result.ok).toBe(false);
    expect(result.status).toBe(1);
    expect(result.parsed).toMatchObject({
      code: "JOB_TIMEOUT",
    });

    const evidence = result.evidence as any;

    expect(evidence.phase).toBe("terminal-plan-poll");
    expect(evidence.ticket).toBe("ticket-job-timeout");
    expect(evidence.pollValue).toMatchObject({
      done: true,
      ok: false,
      code: "JOB_TIMEOUT",
    });

    expect(evidence.timings).toMatchObject({
      terminalPlanPollCount: expect.any(Number),
      terminalPlanPollCompletedCount: expect.any(Number),
      terminalPlanPollBridgeMs: expect.any(Number),
      terminalPlanPollQueueLatencyMs: expect.any(Number),
      terminalPlanPollExecLatencyMs: expect.any(Number),
    });
  });
});

describe("computeRecommendedDeferredPollSleepMs", () => {
  test("usa recommendedPollAfterMs cuando es valido", () => {
    expect(
      computeRecommendedDeferredPollSleepMs({ recommendedPollAfterMs: 250 }, 100),
    ).toBe(250);
  });

  test("clampa recommendedPollAfterMs entre 75 y 1000", () => {
    expect(
      computeRecommendedDeferredPollSleepMs({ recommendedPollAfterMs: 10 }, 100),
    ).toBe(75);

    expect(
      computeRecommendedDeferredPollSleepMs({ recommendedPollAfterMs: 5000 }, 100),
    ).toBe(1000);
  });

  test("usa fallback cuando recommendedPollAfterMs es invalido", () => {
    expect(
      computeRecommendedDeferredPollSleepMs({ recommendedPollAfterMs: "nope" }, 100),
    ).toBe(100);

    expect(
      computeRecommendedDeferredPollSleepMs({}, 100),
    ).toBe(100);

    expect(
      computeRecommendedDeferredPollSleepMs(null, 100),
    ).toBe(100);
  });
});

describe("computeInitialDeferredPollDelayMs", () => {
  test("usa metadata deferredInitialPollDelayMs cuando esta presente", () => {
    expect(
      computeInitialDeferredPollDelayMs(
        {
          id: "plan-1",
          device: "R1",
          steps: [{ command: "show version" }],
          metadata: { deferredInitialPollDelayMs: 0 },
        } as never,
        "show version",
      ),
    ).toBe(0);

    expect(
      computeInitialDeferredPollDelayMs(
        {
          id: "plan-1",
          device: "R1",
          steps: [{ command: "show version" }],
          metadata: { deferredInitialPollDelayMs: 9999 },
        } as never,
        "show version",
      ),
    ).toBe(1000);
  });

  test("no retrasa show version por defecto y retrasa otros show read-only pequenos", () => {
    expect(
      computeInitialDeferredPollDelayMs(
        {
          id: "plan-1",
          device: "R1",
          steps: [{ command: "show version" }],
        } as never,
        "show version",
      ),
    ).toBe(0);

    expect(
      computeInitialDeferredPollDelayMs(
        {
          id: "plan-1",
          device: "R1",
          steps: [{ command: "show ip interface brief" }],
        } as never,
        "show ip interface brief",
      ),
    ).toBe(150);
  });

  test("aplica delay inicial mayor para comandos show largos", () => {
    expect(
      computeInitialDeferredPollDelayMs(
        {
          id: "plan-1",
          device: "R1",
          steps: [{ command: "show running-config" }],
        } as never,
        "show running-config",
      ),
    ).toBe(250);

    expect(
      computeInitialDeferredPollDelayMs(
        {
          id: "plan-1",
          device: "R1",
          steps: [{ command: "show interfaces" }],
        } as never,
        "show interfaces",
      ),
    ).toBe(250);
  });

  test("no aplica delay inicial a comandos no reconocidos", () => {
    expect(
      computeInitialDeferredPollDelayMs(
        {
          id: "plan-1",
          device: "R1",
          steps: [{ command: "configure terminal" }],
        } as never,
        "configure terminal",
      ),
    ).toBe(0);
  });
});

describe("createRuntimeTerminalAdapter inline completion", () => {
  test("skippea __pollDeferred cuando terminal.plan.run devuelve inlineCompleted", async () => {
    const calls: Array<{ type: string; payload: any }> = [];

    const bridge = {
      sendCommandAndWait: async (type: string, payload: any) => {
        calls.push({ type, payload });

        if (type === "terminal.plan.run") {
          return {
            ok: true,
            value: {
              ok: true,
              status: "completed",
              inlineCompleted: true,
              output: "SW1>show clock\n*2:00:00 UTC\nSW1>",
              raw: "SW1>show clock\n*2:00:00 UTC\nSW1>",
              completedAt: Date.now(),
              diagnostics: { completionReason: "completed", statusCode: 0 },
            },
            timings: {
              bridgeWaitMs: 10,
              queueLatencyMs: 2,
              execLatencyMs: 5,
              completedAtMs: 100,
            },
          };
        }

        throw new Error(`Unexpected command ${type}`);
      },
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-1",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan({
      id: "inline-show-clock",
      device: "SW1",
      steps: [{ kind: "command", command: "show clock" }],
    } as never);

    expect(result.ok).toBe(true);
    expect(result.output).toContain("show clock");
    expect(calls.map((x) => x.type)).toEqual(["terminal.plan.run"]);

    const timings = (result.evidence as any)?.timings?.adapter ?? (result.evidence as any)?.timings ?? {};
    expect(timings.terminalPlanInlineCompleted).toBe(1);
    expect(timings.terminalPlanPollCount).toBe(0);
  });

  test("conserva fallback deferred cuando terminal.plan.run devuelve pending", async () => {
    const calls: Array<{ type: string; payload: any }> = [];

    const bridge = {
      sendCommandAndWait: async (type: string, payload: any) => {
        calls.push({ type, payload });

        if (type === "terminal.plan.run") {
          return {
            ok: true,
            value: {
              ok: true,
              deferred: true,
              ticket: "ticket-inline-fallback",
            },
          };
        }

        if (type === "__pollDeferred") {
          return {
            ok: true,
            value: {
              done: true,
              ok: true,
              status: 0,
              output: "SW1>show version\nSW1>",
              raw: "SW1>show version\nSW1>",
              session: { mode: "user-exec", prompt: "SW1>" },
            },
          };
        }

        throw new Error(`Unexpected command ${type}`);
      },
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-2",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan({
      id: "deferred-show-config",
      device: "SW1",
      steps: [{ kind: "command", command: "show running-config" }],
    } as never);

    expect(result.ok).toBe(true);
    expect(calls.map((x) => x.type)).toEqual(["terminal.plan.run", "__pollDeferred"]);
    expect(calls[0]?.payload?.waitForCompletion).toBe(true);
    expect(calls[0]?.payload?.inlineTimeoutMs).toBe(1200);
  });

  test("inline completion copia fastDeferred diagnostics a timings adapter", async () => {
    const calls: Array<{ type: string; payload: unknown }> = [];

    const bridge = {
      sendCommandAndWait: async (type: string, payload: unknown) => {
        calls.push({ type, payload });

        return {
          ok: true,
          value: {
            ok: true,
            status: 0,
            inlineCompleted: true,
            output: "SW1>show clock\n*1:00:00 UTC\nSW1>",
            raw: "SW1>show clock\n*1:00:00 UTC\nSW1>",
            fastDeferred: {
              enabled: true,
              hit: true,
              waitMs: 123,
              budgetMs: 1200,
              intervalMs: 25,
              checks: 5,
            },
          },
          timings: {
            bridgeWaitMs: 10,
            queueLatencyMs: 2,
            execLatencyMs: 8,
          },
        };
      },
    };

    const adapter = createRuntimeTerminalAdapter({ bridge } as any);

    const result = await adapter.runTerminalPlan({
      id: "inline-fast-deferred",
      device: "SW1",
      steps: [{ kind: "command", command: "show clock" }],
    } as any);

    expect(result.ok).toBe(true);
    expect(calls.map((x) => x.type)).toEqual(["terminal.plan.run"]);

    const timings = (result.evidence as any)?.timings?.adapter;
    expect(timings.terminalPlanInlineCompleted).toBe(1);
    expect(timings.terminalPlanPollCount).toBe(0);
    expect(timings.terminalPlanFastDeferredEnabled).toBe(1);
    expect(timings.terminalPlanFastDeferredHit).toBe(1);
    expect(timings.terminalPlanFastDeferredWaitMs).toBe(123);
    expect(timings.terminalPlanFastDeferredBudgetMs).toBe(1200);
    expect(timings.terminalPlanFastDeferredIntervalMs).toBe(25);
    expect(timings.terminalPlanFastDeferredChecks).toBe(5);
  });
});


describe("createRuntimeTerminalAdapter runtime stepResults", () => {
  test("inline terminal.plan.run expone stepResults separados", async () => {
    const bridge = {
      sendCommandAndWait: vi.fn(async () => ({
        ok: true,
        value: {
          ok: true,
          status: 0,
          inlineCompleted: true,
          output:
            "R1#show clock\n*1:00:00 UTC\nR1#\nR1#show ip interface brief\nInterface IP-Address OK? Method Status Protocol\nR1#",
          raw:
            "R1#show clock\n*1:00:00 UTC\nR1#\nR1#show ip interface brief\nInterface IP-Address OK? Method Status Protocol\nR1#",
          stepResults: [
            {
              stepIndex: 0,
              stepType: "command",
              command: "show clock",
              raw: "R1#show clock\n*1:00:00 UTC\nR1#",
              status: 0,
              completedAt: 1000,
            },
            {
              stepIndex: 1,
              stepType: "command",
              command: "show ip interface brief",
              raw: "R1#show ip interface brief\nInterface IP-Address OK? Method Status Protocol\nR1#",
              status: 0,
              completedAt: 2000,
            },
          ],
          session: { mode: "privileged-exec", prompt: "R1#" },
        },
      })),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-step-inline",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan({
      id: "plan-step-inline",
      device: "R1",
      steps: [
        { kind: "command", command: "show clock" },
        { kind: "command", command: "show ip interface brief" },
      ],
    } as never);

    expect(result.ok).toBe(true);
    expect(result.stepResults).toHaveLength(2);
    expect(result.stepResults?.[0]?.command).toBe("show clock");
    expect(result.stepResults?.[1]?.command).toBe("show ip interface brief");
    expect(result.output).toContain("show clock");
    expect(result.output).toContain("show ip interface brief");
  });

  test("poll deferred final expone stepResults separados", async () => {
    const calls: string[] = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string) => {
        calls.push(type);

        if (type === "terminal.plan.run") {
          return {
            ok: true,
            value: {
              ok: true,
              deferred: true,
              ticket: "ticket-step-results",
            },
          };
        }

        if (type === "__pollDeferred") {
          return {
            ok: true,
            value: {
              done: true,
              ok: true,
              status: 0,
              output:
                "R1#show clock\n*1:00:00 UTC\nR1#\nR1#show vlan brief\nVLAN Name Status Ports\nR1#",
              raw:
                "R1#show clock\n*1:00:00 UTC\nR1#\nR1#show vlan brief\nVLAN Name Status Ports\nR1#",
              stepResults: [
                {
                  stepIndex: 0,
                  stepType: "command",
                  command: "show clock",
                  raw: "R1#show clock\n*1:00:00 UTC\nR1#",
                  status: 0,
                  completedAt: 1000,
                },
                {
                  stepIndex: 1,
                  stepType: "command",
                  command: "show vlan brief",
                  raw: "R1#show vlan brief\nVLAN Name Status Ports\nR1#",
                  status: 0,
                  completedAt: 2000,
                },
              ],
              session: { mode: "privileged-exec", prompt: "R1#" },
            },
          };
        }

        throw new Error(`unexpected command type ${type}`);
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-step-deferred",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan(
      {
        id: "plan-step-deferred",
        device: "R1",
        steps: [
          { kind: "command", command: "show clock" },
          { kind: "command", command: "show vlan brief" },
        ],
        metadata: { deferredInitialPollDelayMs: 0 },
        timeouts: { commandTimeoutMs: 1000, stallTimeoutMs: 1000 },
      } as never,
      { timeoutMs: 1000 },
    );

    expect(calls).toEqual(["terminal.plan.run", "__pollDeferred"]);
    expect(result.ok).toBe(true);
    expect(result.stepResults).toHaveLength(2);
    expect(result.stepResults?.[0]?.command).toBe("show clock");
    expect(result.stepResults?.[1]?.command).toBe("show vlan brief");
    expect(result.output).toContain("show clock");
    expect(result.output).toContain("show vlan brief");
  });
});
