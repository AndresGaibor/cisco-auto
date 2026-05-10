import { describe, expect, test } from "bun:test";
import {
  attachRuntimeRetryEvidence,
  getRuntimeErrorCode,
  getRuntimeOutputEvidence,
  isRecoverableEmptyTerminalTimeout,
  isRetryableReadOnlyIosCommand,
} from "./ios-retry-policy.js";

describe("ios-retry-policy", () => {
  test("isRetryableReadOnlyIosCommand acepta comandos show/ping/traceroute/dir", () => {
    expect(isRetryableReadOnlyIosCommand("show version")).toBe(true);
    expect(isRetryableReadOnlyIosCommand("  SHOW   VERSION  ")).toBe(true);
    expect(isRetryableReadOnlyIosCommand("show clock")).toBe(true);
    expect(isRetryableReadOnlyIosCommand("show vlan brief")).toBe(true);
    expect(isRetryableReadOnlyIosCommand("show ip interface brief")).toBe(true);
    expect(isRetryableReadOnlyIosCommand("show running-config")).toBe(true);
    expect(isRetryableReadOnlyIosCommand("ping 192.168.1.1")).toBe(true);
    expect(isRetryableReadOnlyIosCommand("traceroute 192.168.1.1")).toBe(true);
    expect(isRetryableReadOnlyIosCommand("dir flash:")).toBe(true);

    expect(isRetryableReadOnlyIosCommand("configure terminal")).toBe(false);
    expect(isRetryableReadOnlyIosCommand("interface f0/1")).toBe(false);
    expect(isRetryableReadOnlyIosCommand("write memory")).toBe(false);
    expect(isRetryableReadOnlyIosCommand("copy running-config startup-config")).toBe(false);
    expect(isRetryableReadOnlyIosCommand("clear counters")).toBe(false);
    expect(isRetryableReadOnlyIosCommand("debug ip packet")).toBe(false);
    expect(isRetryableReadOnlyIosCommand("")).toBe(false);
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
        "reload",
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
        reason: "empty_terminal_timeout",
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
        reason: "empty_terminal_timeout",
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
        "IOS_EMPTY_TIMEOUT_RETRY: se reintentó el comando IOS de solo lectura por timeout vacío recuperable (JOB_TIMEOUT).",
      ]),
    );
  });

  test("isRecoverableEmptyTerminalTimeout acepta JOB_TIMEOUT vacío para show clock", () => {
    expect(
      isRecoverableEmptyTerminalTimeout(
        {
          ok: false,
          error: { code: "JOB_TIMEOUT" },
          output: "",
          rawOutput: "",
        },
        "show clock",
      ),
    ).toBe(true);
  });

  test("isRecoverableEmptyTerminalTimeout acepta JOB_TIMEOUT vacío para show vlan brief", () => {
    expect(
      isRecoverableEmptyTerminalTimeout(
        {
          ok: false,
          error: { code: "JOB_TIMEOUT" },
          evidence: {
            pollValue: {
              code: "JOB_TIMEOUT",
              output: "",
              raw: "",
            },
          },
        },
        "show vlan brief",
      ),
    ).toBe(true);
  });

  test("isRecoverableEmptyTerminalTimeout rechaza comandos IOS de configuración", () => {
    expect(
      isRecoverableEmptyTerminalTimeout(
        {
          ok: false,
          error: { code: "JOB_TIMEOUT" },
          output: "",
          rawOutput: "",
        },
        "configure terminal\nhostname SW1",
      ),
    ).toBe(false);
  });

  test("isRecoverableEmptyTerminalTimeout rechaza comandos destructivos", () => {
    expect(
      isRecoverableEmptyTerminalTimeout(
        {
          ok: false,
          error: { code: "JOB_TIMEOUT" },
          output: "",
          rawOutput: "",
        },
        "write memory",
      ),
    ).toBe(false);
  });

  test("isRecoverableEmptyTerminalTimeout rechaza output útil de show clock", () => {
    expect(
      isRecoverableEmptyTerminalTimeout(
        {
          ok: false,
          error: { code: "JOB_TIMEOUT" },
          output: "Router>show clock\n*1:00:00 UTC",
        },
        "show clock",
      ),
    ).toBe(false);
  });
});
