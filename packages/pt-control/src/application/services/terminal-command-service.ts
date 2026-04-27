import type {
  TerminalDeviceKind,
  RunTerminalCommandOptions,
  TerminalCommandResult,
} from "@cisco-auto/terminal-contracts";
import type { RuntimeTerminalPort } from "../../ports/runtime-terminal-port.js";
import { buildUniversalTerminalPlan } from "./terminal-plan-builder.js";

export interface TerminalControllerPort {
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
}

export interface TerminalCommandServiceDeps {
  runtimeTerminal?: RuntimeTerminalPort | null;
  controller: TerminalControllerPort;
  generateId: () => string;
}

const DEVICE_TYPE_MAP: Record<number, string> = {
  0: "router",
  1: "switch",
  3: "pc",
  4: "server",
  5: "printer",
  8: "host",
  9: "host",
  16: "switch_layer3",
};

function normalizeDeviceType(type: string | number | undefined): string {
  if (typeof type === "string") return type.trim().toLowerCase();
  if (typeof type === "number") return DEVICE_TYPE_MAP[type] || "unknown";
  return "unknown";
}

function normalizeText(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function getDeviceModel(deviceState: { model?: unknown; customDeviceModel?: unknown }): string {
  return normalizeText(deviceState.model ?? deviceState.customDeviceModel);
}

function isIosLikeDevice(deviceState: {
  type?: string | number;
  model?: unknown;
  customDeviceModel?: unknown;
}): boolean {
  const deviceType = normalizeDeviceType(deviceState.type);
  const model = getDeviceModel(deviceState);

  return (
    deviceType === "router" ||
    deviceType === "switch" ||
    deviceType === "switch_layer3" ||
    deviceType === "generic" ||
    model === "2811" ||
    model === "2911" ||
    model === "1941" ||
    model === "2960" ||
    model === "2960-24tt" ||
    model === "3650-24ps" ||
    model.includes("router") ||
    model.includes("switch")
  );
}

function isHostLikeDevice(deviceState: {
  type?: string | number;
  model?: unknown;
  customDeviceModel?: unknown;
}): boolean {
  const deviceType = normalizeDeviceType(deviceState.type);
  const model = getDeviceModel(deviceState);

  return (
    deviceType === "host" ||
    deviceType === "pc" ||
    deviceType === "server" ||
    deviceType === "printer" ||
    model === "pc" ||
    model === "pc-pt" ||
    model === "laptop" ||
    model === "laptop-pt" ||
    model === "server" ||
    model === "server-pt" ||
    model === "printer" ||
    model === "printer-pt" ||
    model.includes("server") ||
    model.includes("pc-pt") ||
    model.includes("laptop") ||
    model.includes("printer")
  );
}

export function createTerminalCommandService(deps: TerminalCommandServiceDeps) {
  async function resolveDeviceKind(device: string): Promise<TerminalDeviceKind> {
    try {
      const deviceState = await deps.controller.inspectDevice(device).catch(() => null);

      if (!deviceState) {
        return "unknown";
      }

      if (isIosLikeDevice(deviceState)) {
        return "ios";
      }

      if (isHostLikeDevice(deviceState)) {
        return "host";
      }

      return "unknown";
    } catch {
      return "unknown";
    }
  }

  async function executeIosCommand(
    device: string,
    command: string,
    options?: RunTerminalCommandOptions
  ): Promise<TerminalCommandResult> {
    const runtimeTerminal = deps.runtimeTerminal;
    const executionTimeout = options?.timeoutMs ?? 45000;
    const bridgeTimeout = executionTimeout + 5000; // Margen para que el runtime falle primero

    if (runtimeTerminal?.runTerminalPlan) {
      const plan = buildUniversalTerminalPlan({
        id: deps.generateId(),
        device,
        command,
        deviceKind: "ios",
        mode: options?.mode,
        allowConfirm: options?.allowConfirm,
        allowDestructive: options?.allowDestructive,
        timeoutMs: executionTimeout,
      });

      const runtimeResult = (await runtimeTerminal.runTerminalPlan(plan, { timeoutMs: bridgeTimeout })) as any;

      if (!runtimeResult.ok) {
        return {
          ok: false,
          action: "ios.exec",
          device,
          deviceKind: "ios",
          command,
          output: String(runtimeResult.output ?? ""),
          status: Number(runtimeResult.status ?? 1),
          error: {
            code: String(runtimeResult.error?.code ?? "IOS_EXEC_FAILED"),
            message: String(runtimeResult.error?.message ?? "Error en ejecución de comando IOS"),
            phase: "execution",
          },
          warnings: Array.isArray(runtimeResult.warnings) ? runtimeResult.warnings : [],
          evidence: runtimeResult.evidence,
        };
      }

      return {
        ok: true,
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        output: String(runtimeResult.output ?? ""),
        status: Number(runtimeResult.status ?? 0),
        warnings: Array.isArray(runtimeResult.warnings) ? runtimeResult.warnings : [],
        evidence: runtimeResult.evidence,
      };
    }

    let execResult: any;

    try {
      execResult = await deps.controller.execIos(device, command, false, executionTimeout);
    } catch (error) {
      const err = error as any;

      return {
        ok: false,
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        output: String(
          err?.details?.output ??
            err?.details?.evidence?.raw ??
            err?.details?.parsed?.raw ??
            err?.output ??
            err?.raw ??
            ""
        ),
        status: 1,
        error: {
          code: String(
            err?.code ??
              err?.error?.code ??
              (String(err?.message ?? "").includes("Timeout waiting for result")
                ? "IOS_RESULT_TIMEOUT"
                : "IOS_EXEC_FAILED")
          ),
          message: String(err?.message ?? err?.error?.message ?? "Error en ejecución de comando IOS"),
          phase: "execution",
        },
        warnings: [],
        evidence: {
          thrown: true,
          details: err?.details ?? null,
          stack: err?.stack ?? null,
        },
      };
    }

    const output = String(
      execResult.raw ??
        execResult.output ??
        execResult.evidence?.raw ??
        execResult.parsed?.raw ??
        execResult.parsed?.output ??
        execResult.error?.details?.output ??
        "",
    );

    const ok = Boolean(execResult.ok ?? false);

    if (!ok) {
      const evidence = execResult.evidence as any;
      const events = Array.isArray(evidence?.events) ? evidence.events : [];
      const parsedError = (execResult.parsed as any)?.error;
      const failureEvent = events.find((e: any) => e?.error || e?.code);

      return {
        ok: false,
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        output,
        status: 1,
        error: {
          code: String(
            parsedError?.code ?? failureEvent?.code ?? "IOS_EXEC_FAILED"
          ),
          message: String(
            parsedError?.message ?? failureEvent?.error ?? "Error en ejecución de comando IOS"
          ),
          phase: "execution",
        },
        warnings: Array.isArray(execResult.warnings) ? execResult.warnings : [],
        evidence,
      };
    }

    return {
      ok: true,
      action: "ios.exec",
      device,
      deviceKind: "ios",
      command,
      output,
      status: 0,
      warnings: Array.isArray(execResult.warnings) ? execResult.warnings : [],
      evidence: execResult.evidence,
    };
  }

  async function executeHostCommand(
    device: string,
    command: string,
    options?: RunTerminalCommandOptions
  ): Promise<TerminalCommandResult> {
    const runtimeTerminal = deps.runtimeTerminal;
    const cmdName = command.split(" ")[0]!.toLowerCase();
    let capabilityId = "host.exec";

    if (cmdName === "ipconfig") capabilityId = "host.ipconfig";
    else if (cmdName === "ping") capabilityId = "host.ping";
    else if (cmdName === "tracert") capabilityId = "host.tracert";
    else if (cmdName === "arp") capabilityId = "host.arp";
    else if (cmdName === "nslookup") capabilityId = "host.nslookup";
    else if (cmdName === "netstat") capabilityId = "host.netstat";

    const timeoutMs = options?.timeoutMs ?? 45000;
    if (runtimeTerminal?.runTerminalPlan) {
      const plan = buildUniversalTerminalPlan({
        id: deps.generateId(),
        device,
        command,
        deviceKind: "host",
        mode: options?.mode,
        allowConfirm: options?.allowConfirm,
        allowDestructive: options?.allowDestructive,
        timeoutMs,
      });

      const runtimeResult = (await runtimeTerminal.runTerminalPlan(plan, { timeoutMs })) as any;

      if (!runtimeResult.ok) {
        const hostOutput = String(runtimeResult.output ?? "");
        const hostCode =
          hostOutput.toLowerCase().includes("invalid command") ||
          hostOutput.toLowerCase().includes("not recognized")
            ? "HOST_INVALID_COMMAND"
            : "HOST_EXEC_FAILED";

        return {
          ok: false,
          action: "host.exec",
          device,
          deviceKind: "host",
          command,
          output: hostOutput,
          status: Number(runtimeResult.status ?? 1),
          error: {
            code: String(runtimeResult.error?.code ?? hostCode),
            message: String(runtimeResult.error?.message ?? "Error en ejecución de comando Host"),
            phase: "execution",
          },
          warnings: Array.isArray(runtimeResult.warnings) ? runtimeResult.warnings : [],
          evidence: runtimeResult.evidence,
        };
      }

      return {
        ok: true,
        action: "host.exec",
        device,
        deviceKind: "host",
        command,
        output: String(runtimeResult.output ?? ""),
        status: Number(runtimeResult.status ?? 0),
        warnings: Array.isArray(runtimeResult.warnings) ? runtimeResult.warnings : [],
        evidence: runtimeResult.evidence,
      };
    }

    const execResult = await deps.controller.execHost(device, command, capabilityId, {
      timeoutMs,
    });

    const hostOutput = String(
      execResult.raw ??
        (execResult as any).output ??
        execResult.verdict?.reason ??
        "",
    );
    const hostCode =
      hostOutput.toLowerCase().includes("invalid command") ||
      hostOutput.toLowerCase().includes("not recognized")
        ? "HOST_INVALID_COMMAND"
        : "HOST_EXEC_FAILED";

    if (!execResult.success || execResult.verdict?.ok === false) {
      return {
        ok: false,
        action: "host.exec",
        device,
        deviceKind: "host",
        command,
        output: hostOutput,
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
      };
    }

    return {
      ok: true,
      action: "host.exec",
      device,
      deviceKind: "host",
      command,
      output: hostOutput,
      status: 0,
      warnings: [],
      evidence: {
        verdict: execResult.verdict,
        parsed: execResult.parsed,
      },
    };
  }

  async function executeCommand(
    device: string,
    command: string,
    options?: RunTerminalCommandOptions
  ): Promise<TerminalCommandResult> {
    const deviceKind = await resolveDeviceKind(device);

    if (deviceKind === "ios") {
      return executeIosCommand(device, command, options);
    }

    if (deviceKind === "host") {
      return executeHostCommand(device, command, options);
    }

    return {
      ok: false,
      action: "unknown",
      device,
      deviceKind: "unknown",
      command,
      output: "",
      status: 1,
      error: {
        code: "DEVICE_NOT_FOUND_OR_UNSUPPORTED",
        message: `No se encontró el dispositivo "${device}" o no se pudo determinar si usa IOS/terminal host.`,
        phase: "detection",
      },
      warnings: [
        "Ejecuta `bun run pt device list --json` para ver los nombres exactos de dispositivos.",
      ],
      evidence: null,
    };
  }

  return {
    executeCommand,
    resolveDeviceKind,
  };
}
