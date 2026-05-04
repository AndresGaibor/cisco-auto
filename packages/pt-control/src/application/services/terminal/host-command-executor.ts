import type { TerminalDeviceKind, RunTerminalCommandOptions } from "@cisco-auto/terminal-contracts";
import type { RuntimeTerminalPort } from "../../../ports/runtime-terminal-port.js";
import { buildUniversalTerminalPlan } from "../terminal-plan-builder.js";
import { measureServiceSync, type TerminalServiceTimingMap } from "./command-timing-recorder.js";
import { createTerminalReadinessChecker } from "./terminal-readiness-checker.js";
import {
  buildCommandResult,
  createRuntimeUnavailableResult,
  firstString,
  normalizeWarnings,
} from "./command-result-mapper.js";

export interface HostCommandExecutorDeps {
  runtimeTerminal?: RuntimeTerminalPort | null;
  controller: {
    getHeartbeatHealth?(): {
      state: "ok" | "stale" | "missing" | "unknown";
      ageMs?: number;
      lastSeenTs?: number;
    };
    execHost(
      device: string,
      command: string,
      capabilityId: string,
      options?: { timeoutMs?: number },
    ): Promise<{
      success?: boolean;
      raw?: string;
      output?: string;
      verdict?: {
        ok?: boolean;
        reason?: string;
      };
      parsed?: unknown;
    }>;
  };
  generateId: () => string;
}

function resolveHostCapabilityId(command: string): string {
  const cmdName = command.split(" ")[0]!.toLowerCase();

  if (cmdName === "ipconfig") return "host.ipconfig";
  if (cmdName === "ping") return "host.ping";
  if (cmdName === "tracert") return "host.tracert";
  if (cmdName === "arp") return "host.arp";
  if (cmdName === "nslookup") return "host.nslookup";
  if (cmdName === "netstat") return "host.netstat";

  return "host.exec";
}

function isHostInvalidCommand(output: string): boolean {
  const lowered = output.toLowerCase();
  return lowered.includes("invalid command") || lowered.includes("not recognized");
}

export function createHostCommandExecutor(deps: HostCommandExecutorDeps) {
  const readinessChecker = createTerminalReadinessChecker({
    controller: deps.controller as any,
  });

  async function executeHostCommand(
    device: string,
    command: string,
    options?: RunTerminalCommandOptions,
    timings?: TerminalServiceTimingMap,
  ): Promise<ReturnType<typeof buildCommandResult> | ReturnType<typeof createRuntimeUnavailableResult>> {
    const serviceTimings = timings ?? {};
    const runtimeTerminal = deps.runtimeTerminal;
    const capabilityId = measureServiceSync(serviceTimings, "resolveHostCapabilityIdMs", () =>
      resolveHostCapabilityId(command),
    );

    const timeoutMs = options?.timeoutMs ?? 45000;
    const { isReady, heartbeat, heartbeatAgeMs, reason } = readinessChecker.checkReadiness();

    if (!isReady) {
      return createRuntimeUnavailableResult({
        action: "host.exec",
        device,
        deviceKind: "host",
        command,
        health: heartbeat,
        reason: reason ?? "PT_RUNTIME_UNAVAILABLE",
      });
    }

    if (runtimeTerminal?.runTerminalPlan) {
      const plan = measureServiceSync(serviceTimings, "buildHostPlanMs", () =>
        buildUniversalTerminalPlan({
          id: deps.generateId(),
          device,
          command,
          deviceKind: "host",
          mode: options?.mode,
          allowConfirm: options?.allowConfirm,
          allowDestructive: options?.allowDestructive,
          timeoutMs,
        }),
      );

      const runtimeResult = (await (async () => {
        const startedAt = Date.now();
        try {
          return await runtimeTerminal.runTerminalPlan(plan, { timeoutMs });
        } finally {
          serviceTimings.runtimeTerminalRunPlanMs = (serviceTimings.runtimeTerminalRunPlanMs ?? 0) + Math.max(0, Date.now() - startedAt);
        }
      })()) as any;

      if (!runtimeResult.ok) {
        const hostOutput = firstString(
          runtimeResult.output,
          runtimeResult.rawOutput,
          runtimeResult.error?.message,
          runtimeResult.parsed?.error?.message,
        );
        const hostCode =
          hostOutput.toLowerCase().includes("invalid command") ||
          hostOutput.toLowerCase().includes("not recognized")
            ? "HOST_INVALID_COMMAND"
            : "HOST_EXEC_FAILED";

        return buildCommandResult({
          ok: false,
          action: "host.exec",
          device,
          deviceKind: "host",
          command,
          output: hostOutput,
          rawOutput: firstString(runtimeResult.rawOutput, runtimeResult.output),
          status: Number(runtimeResult.status ?? 1),
          error: {
            code: String(runtimeResult.error?.code ?? hostCode),
            message: String(runtimeResult.error?.message ?? "Error en ejecución de comando Host"),
            phase: "execution",
          },
          warnings: runtimeResult.warnings,
          evidence: runtimeResult.evidence,
        });
      }

      return buildCommandResult({
        ok: true,
        action: "host.exec",
        device,
        deviceKind: "host",
        command,
        output: firstString(runtimeResult.output),
        rawOutput: firstString(runtimeResult.rawOutput, runtimeResult.output),
        status: Number(runtimeResult.status ?? 0),
        warnings: runtimeResult.warnings,
        evidence: runtimeResult.evidence,
      });
    }

    const execResult = await (async () => {
      const startedAt = Date.now();
      try {
        return await deps.controller.execHost(device, command, capabilityId, { timeoutMs });
      } finally {
        serviceTimings.legacyExecHostMs = (serviceTimings.legacyExecHostMs ?? 0) + Math.max(0, Date.now() - startedAt);
      }
    })();

    const hostOutput = firstString(
      execResult.raw,
      (execResult as any).output,
      (execResult as any).rawOutput,
      execResult.verdict?.reason,
      (execResult as any).error?.message,
    );
    const hostCode = isHostInvalidCommand(hostOutput) ? "HOST_INVALID_COMMAND" : "HOST_EXEC_FAILED";

    if (!execResult.success || execResult.verdict?.ok === false) {
      const execResultAny = execResult as any;
      return buildCommandResult({
        ok: false,
        action: "host.exec",
        device,
        deviceKind: "host",
        command,
        output: hostOutput,
        rawOutput: firstString(
          execResultAny.rawOutput,
          execResultAny.raw,
          execResultAny.output,
          execResult.verdict?.reason,
        ),
        status: 1,
        error: {
          code: hostCode,
          message: String(
            execResult.verdict?.reason ?? "Error en ejecución de comando Host"
          ),
          phase: "execution",
        },
        warnings: [],
        evidence: {
          verdict: execResult.verdict,
          parsed: execResult.parsed,
        },
      });
    }

    return buildCommandResult({
      ok: true,
      action: "host.exec",
      device,
      deviceKind: "host",
      command,
      output: hostOutput,
      rawOutput: firstString(
        (execResult as any).rawOutput,
        (execResult as any).raw,
        (execResult as any).output,
        execResult.verdict?.reason,
      ),
      status: 0,
      warnings: [],
      evidence: {
        verdict: execResult.verdict,
        parsed: execResult.parsed,
      },
    });
  }

  return {
    executeHostCommand,
  };
}