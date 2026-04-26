import type {
  TerminalDeviceKind,
  RunTerminalCommandOptions,
  TerminalCommandResult,
} from "@cisco-auto/terminal-contracts";
import type { RuntimeTerminalPort } from "../../ports/runtime-terminal-port.js";

export interface TerminalControllerPort {
  inspectDevice(device: string): Promise<{ type?: string | number } | null | undefined>;
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
  16: "switch_layer3",
};

function normalizeDeviceType(type: string | number | undefined): string {
  if (typeof type === "string") return type;
  if (typeof type === "number") return DEVICE_TYPE_MAP[type] || "unknown";
  return "unknown";
}

export function createTerminalCommandService(deps: TerminalCommandServiceDeps) {
  async function resolveDeviceKind(device: string): Promise<TerminalDeviceKind> {
    try {
      const deviceState = await deps.controller.inspectDevice(device).catch(() => null);
      const deviceType =
        typeof deviceState?.type === "string"
          ? deviceState.type
          : normalizeDeviceType(deviceState?.type);

      const isIOS =
        deviceType === "router" ||
        deviceType === "switch" ||
        deviceType === "switch_layer3";

      return isIOS ? "ios" : "host";
    } catch {
      return "unknown";
    }
  }

  async function executeIosCommand(
    device: string,
    command: string,
    options?: RunTerminalCommandOptions
  ): Promise<TerminalCommandResult> {
    const executionTimeout = options?.timeoutMs ?? 45000;
    const bridgeTimeout = executionTimeout + 5000; // Margen para que el runtime falle primero

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
    const cmdName = command.split(" ")[0]!.toLowerCase();
    let capabilityId = "host.exec";

    if (cmdName === "ipconfig") capabilityId = "host.ipconfig";
    else if (cmdName === "ping") capabilityId = "host.ping";
    else if (cmdName === "tracert") capabilityId = "host.tracert";
    else if (cmdName === "arp") capabilityId = "host.arp";
    else if (cmdName === "nslookup") capabilityId = "host.nslookup";
    else if (cmdName === "netstat") capabilityId = "host.netstat";

    const timeoutMs = options?.timeoutMs ?? 45000;
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
        code: "UNKNOWN_DEVICE_TYPE",
        message: `No se pudo determinar el tipo de dispositivo para "${device}"`,
        phase: "detection",
      },
      warnings: [],
      evidence: null,
    };
  }

  return {
    executeCommand,
    resolveDeviceKind,
  };
}
