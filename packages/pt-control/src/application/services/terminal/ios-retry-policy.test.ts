import { describe, expect, test } from "bun:test";
import {
  attachRuntimeRetryEvidence,
  getRuntimeErrorCode,
  getRuntimeOutputEvidence,
  isRecoverableEmptyTerminalTimeout,
  isRetryableReadOnlyIosCommand,
} from "./ios-retry-policy.js";

describe("ios-retry-policy", () => {
  test("isRetryableReadOnlyIosCommand solo permite show version por ahora", () => {
    expect(isRetryableReadOnlyIosCommand("show version")).toBe(true);
    expect(isRetryableReadOnlyIosCommand("  SHOW   VERSION  ")).toBe(true);

    expect(isRetryableReadOnlyIosCommand("show ip interface brief")).toBe(false);
    expect(isRetryableReadOnlyIosCommand("show running-config")).toBe(false);
    expect(isRetryableReadOnlyIosCommand("configure terminal")).toBe(false);
    expect(isRetryableReadOnlyIosCommand("interface f0/1")).toBe(false);
  });

  test("getRuntimeErrorCode lee error code desde error directo", () => {
    expect(
      getRuntimeErrorCode({
        error: { code: "JOB_TIMEOUT" },
      }),
    ).toBe("JOB_TIMEOUT");
  });

  test("getRuntimeErrorCode lee error code desde evidence.pollValue", () => {
    expect(
      getRuntimeErrorCode({
        evidence: {
          pollValue: {
            errorCode: "TERMINAL_DEFERRED_STALLED",
          },
        },
      }),
    ).toBe("TERMINAL_DEFERRED_STALLED");
  });

  test("getRuntimeOutputEvidence detecta output útil en runtimeResult", () => {
    expect(
      getRuntimeOutputEvidence({
        output: "Cisco IOS Software",
      }),
    ).toBe("Cisco IOS Software");
  });

  test("getRuntimeOutputEvidence detecta output útil en pollValue", () => {
    expect(
      getRuntimeOutputEvidence({
        evidence: {
          pollValue: {
            outputTail: "Cisco IOS Software",
          },
        },
      }),
    ).toBe("Cisco IOS Software");
  });

  test("isRecoverableEmptyTerminalTimeout acepta JOB_TIMEOUT vacío para show version", () => {
    expect(
      isRecoverableEmptyTerminalTimeout(
        {
          ok: false,
          status: 1,
          error: { code: "JOB_TIMEOUT" },
          output: "",
          rawOutput: "",
          evidence: {
            pollValue: {
              done: true,
              ok: false,
              status: 1,
              code: "JOB_TIMEOUT",
              output: "",
              raw: "",
            },
          },
        },
        "show version",
      ),
    ).toBe(true);
  });

  test("isRecoverableEmptyTerminalTimeout acepta TERMINAL_DEFERRED_STALLED vacío para show version", () => {
    expect(
      isRecoverableEmptyTerminalTimeout(
        {
          ok: false,
          status: 1,
          errorCode: "TERMINAL_DEFERRED_STALLED",
          output: "",
          rawOutput: "",
        },
        "show version",
      ),
    ).toBe(true);
  });

  test("isRecoverableEmptyTerminalTimeout rechaza output útil", () => {
    expect(
      isRecoverableEmptyTerminalTimeout(
        {
          ok: false,
          status: 1,
          error: { code: "JOB_TIMEOUT" },
          output: "Cisco IOS Software",
        },
        "show version",
      ),
    ).toBe(false);
  });

  test("isRecoverableEmptyTerminalTimeout rechaza comandos no allowlist", () => {
    expect(
      isRecoverableEmptyTerminalTimeout(
        {
          ok: false,
          status: 1,
          error: { code: "JOB_TIMEOUT" },
          output: "",
          rawOutput: "",
        },
        "show running-config",
      ),
    ).toBe(false);
  });

  test("attachRuntimeRetryEvidence preserva evidence del retry y adjunta resumen del primer fallo", () => {
    const result = attachRuntimeRetryEvidence(
      {
        ok: true,
        output: "Cisco IOS Software",
        rawOutput: "show version\nCisco IOS Software",
        status: 0,
        warnings: ["Se filtró el eco del comando (1 línea/s)."],
        evidence: {
          timings: {
            adapter: {
              terminalPlanPollCount: 2,
            },
          },
        },
      },
      {
        reason: "empty_show_version_timeout",
        attempts: 2,
        retryDelayMs: 350,
        firstRuntimeResult: {
          ok: false,
          status: 1,
          output: "",
          rawOutput: "",
          error: {
            code: "JOB_TIMEOUT",
          },
          evidence: {
            phase: "terminal-plan-poll",
            ticket: "cmd-first",
            pollValue: {
              done: true,
              ok: false,
              status: 1,
              code: "JOB_TIMEOUT",
              output: "",
              raw: "",
              session: {
                mode: "unknown",
                prompt: "",
              },
            },
          },
        },
      },
    );

    expect(result.evidence).toMatchObject({
      timings: {
        adapter: {
          terminalPlanPollCount: 2,
        },
      },
      retry: {
        reason: "empty_show_version_timeout",
        attempts: 2,
        retryDelayMs: 350,
        firstErrorCode: "JOB_TIMEOUT",
        firstStatus: 1,
        firstOutputLen: 0,
        firstRawOutputLen: 0,
        firstTicket: "cmd-first",
        firstPhase: "terminal-plan-poll",
        firstPollValue: {
          done: true,
          ok: false,
          status: 1,
          code: "JOB_TIMEOUT",
          session: {
            mode: "unknown",
            prompt: "",
          },
        },
      },
    });

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        "Se filtró el eco del comando (1 línea/s).",
        "Se reintentó el comando IOS por timeout recuperable (JOB_TIMEOUT).",
      ]),
    );
  });
});
