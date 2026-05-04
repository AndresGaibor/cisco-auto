import type {
  TerminalDeviceKind,
  TerminalCommandResult,
  RunTerminalCommandOptions,
} from "@cisco-auto/terminal-contracts";
import type { RuntimeTerminalPort } from "../../../ports/runtime-terminal-port.js";
import { measureServiceAsync, measureServiceSync, type TerminalServiceTimingMap } from "./command-timing-recorder.js";
import { createDeviceKindResolver } from "./device-kind-resolver.js";
import { createIosCommandExecutor } from "./ios-command-executor.js";
import { createHostCommandExecutor } from "./host-command-executor.js";
import { createTerminalReadinessChecker } from "./terminal-readiness-checker.js";
import {
  buildCommandResult,
  createUnknownDeviceResult,
} from "./command-result-mapper.js";

export interface TerminalControllerPort {
  inspectDeviceFast?(device: string): Promise<{
    type?: string | number;
    model?: string;
    name?: string;
    hostname?: string;
    customDeviceModel?: string;
  } | null | undefined>;
  inspectDevice(device: string): Promise<{
    type?: string | number;
    model?: string;
    name?: string;
    hostname?: string;
    customDeviceModel?: string;
  } | null | undefined>;
  execIos(
    device: string,
    command: string,
    parse?: boolean,
    timeoutMs?: number,
  ): Promise<unknown>;
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
  getHeartbeatHealth?(): {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  };
}

export interface TerminalCommandServiceDeps {
  runtimeTerminal?: RuntimeTerminalPort | null;
  controller: TerminalControllerPort;
  generateId: () => string;
  cacheFilePath?: string;
}

function serviceNowMs(): number {
  return Date.now();
}

function attachTerminalServiceTimings<T extends { evidence?: unknown }>(
  result: T,
  timings: TerminalServiceTimingMap,
  startedAt: number,
): T {
  timings.terminalCommandServiceTotalMs = Math.max(0, serviceNowMs() - startedAt);

  const evidence =
    result.evidence && typeof result.evidence === "object"
      ? { ...(result.evidence as Record<string, unknown>) }
      : {};

  const evidenceTimings =
    evidence.timings && typeof evidence.timings === "object"
      ? { ...(evidence.timings as Record<string, unknown>) }
      : {};

  result.evidence = {
    ...evidence,
    timings: {
      ...evidenceTimings,
      terminalCommandService: {
        ...(evidenceTimings.terminalCommandService &&
        typeof evidenceTimings.terminalCommandService === "object"
          ? (evidenceTimings.terminalCommandService as Record<string, unknown>)
          : {}),
        ...timings,
      },
    },
  };

  return result;
}

export function createTerminalCommandService(deps: TerminalCommandServiceDeps) {
  const deviceKindResolver = createDeviceKindResolver({
    controller: deps.controller,
    cacheFilePath: deps.cacheFilePath,
  });

  const iosExecutor = createIosCommandExecutor({
    runtimeTerminal: deps.runtimeTerminal,
    controller: deps.controller,
    generateId: deps.generateId,
  });

  const hostExecutor = createHostCommandExecutor({
    runtimeTerminal: deps.runtimeTerminal,
    controller: deps.controller,
    generateId: deps.generateId,
  });

  const readinessChecker = createTerminalReadinessChecker({
    controller: deps.controller,
  });

  async function executeCommand(
    device: string,
    command: string,
    options?: RunTerminalCommandOptions,
  ): Promise<TerminalCommandResult> {
    const serviceStartedAt = serviceNowMs();
    const serviceTimings: TerminalServiceTimingMap = {};
    let deviceKind: TerminalDeviceKind = "unknown";

    const heartbeat = measureServiceSync(serviceTimings, "executeCommandHeartbeatMs", () =>
      readinessChecker.getHeartbeatHealth(),
    );
    const heartbeatAgeMs = measureServiceSync(serviceTimings, "executeCommandHeartbeatAgeMs", () =>
      readinessChecker.getHeartbeatAgeMs(heartbeat),
    );

    if (heartbeatAgeMs !== null && heartbeatAgeMs > 20_000) {
      return attachTerminalServiceTimings(
        buildCommandResult({
          ok: false,
          action: "unknown",
          device,
          deviceKind: "unknown",
          command,
          output: "",
          rawOutput: "",
          status: 1,
          error: {
            code: "PT_RUNTIME_UNAVAILABLE",
            message: "PT_RUNTIME_UNAVAILABLE: el heartbeat del runtime supera 20s.",
            phase: "detection",
          },
          warnings: [],
          evidence: {
            heartbeat,
            reason: "PT_RUNTIME_UNAVAILABLE: el heartbeat del runtime supera 20s.",
          },
        }),
        serviceTimings,
        serviceStartedAt,
      );
    }

    try {
      deviceKind = await measureServiceAsync(serviceTimings, "resolveDeviceKindMs", () =>
        deviceKindResolver.resolveDeviceKind(device, serviceTimings),
      );
    } catch (error) {
      const runtimeError = error as Error & { code?: string; details?: Record<string, unknown> };

      if (runtimeError.code === "RUNTIME_NOT_POLLING") {
        return attachTerminalServiceTimings(
          {
            ok: false,
            action: "ios.exec" as const,
            device,
            deviceKind: "unknown" as const,
            command,
            output: "",
            rawOutput: "",
            status: 1,
            error: {
              code: runtimeError.code,
              message: runtimeError.message,
              phase: "detection" as const,
            },
            warnings: [],
            evidence: runtimeError.details ?? null,
          } as TerminalCommandResult,
          serviceTimings,
          serviceStartedAt,
        );
      }

      deviceKind = "unknown";
    }

    if (heartbeatAgeMs !== null && heartbeatAgeMs > 20_000) {
      return attachTerminalServiceTimings(
        buildCommandResult({
          ok: false,
          action: deviceKind === "ios" ? "ios.exec" : deviceKind === "host" ? "host.exec" : "unknown",
          device,
          deviceKind,
          command,
          output: "",
          rawOutput: "",
          status: 1,
          error: {
            code: "PT_RUNTIME_UNAVAILABLE",
            message: "PT_RUNTIME_UNAVAILABLE: el heartbeat del runtime supera 20s.",
            phase: "detection",
          },
          warnings: [],
          evidence: {
            heartbeat,
            reason: "PT_RUNTIME_UNAVAILABLE: el heartbeat del runtime supera 20s.",
          },
        }),
        serviceTimings,
        serviceStartedAt,
      );
    }

    if (deviceKind === "ios") {
      return attachTerminalServiceTimings(
        await measureServiceAsync(serviceTimings, "executeIosCommandMs", () =>
          iosExecutor.executeIosCommand(device, command, options, serviceTimings),
        ),
        serviceTimings,
        serviceStartedAt,
      );
    }

    if (deviceKind === "host") {
      return attachTerminalServiceTimings(
        await measureServiceAsync(serviceTimings, "executeHostCommandMs", () =>
          hostExecutor.executeHostCommand(device, command, options, serviceTimings),
        ),
        serviceTimings,
        serviceStartedAt,
      );
    }

    return attachTerminalServiceTimings(
      createUnknownDeviceResult(device, command),
      serviceTimings,
      serviceStartedAt,
    );
  }

  async function resolveDeviceKind(
    device: string,
    timings?: TerminalServiceTimingMap,
  ): Promise<TerminalDeviceKind> {
    return deviceKindResolver.resolveDeviceKind(device, timings);
  }

  return {
    executeCommand,
    resolveDeviceKind,
  };
}

export type { TerminalServiceTimingMap } from "./command-timing-recorder.js";