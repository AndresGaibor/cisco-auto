import type {
  TerminalDeviceKind,
  RunTerminalCommandOptions,
  TerminalCommandResult,
} from "@cisco-auto/terminal-contracts";
import type { RuntimeTerminalPort } from "../../ports/runtime-terminal-port.js";
import { buildUniversalTerminalPlan, splitCommandLines } from "./terminal-plan-builder.js";

type TerminalServiceTimingMap = Record<string, number>;

function serviceNowMs(): number {
  return Date.now();
}

function addServiceTiming(
  timings: TerminalServiceTimingMap,
  name: string,
  value: number,
): void {
  timings[name] = (timings[name] ?? 0) + Math.max(0, value);
}

async function measureServiceAsync<T>(
  timings: TerminalServiceTimingMap,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const startedAt = serviceNowMs();

  try {
    return await fn();
  } finally {
    addServiceTiming(timings, name, serviceNowMs() - startedAt);
  }
}

function measureServiceSync<T>(
  timings: TerminalServiceTimingMap,
  name: string,
  fn: () => T,
): T {
  const startedAt = serviceNowMs();

  try {
    return fn();
  } finally {
    addServiceTiming(timings, name, serviceNowMs() - startedAt);
  }
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

function normalizeTerminalText(value: unknown): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function isIosSyslogLine(line: string): boolean {
  return /^%[A-Z0-9_]+-\d+-[A-Z0-9_]+:/i.test(String(line ?? "").trim());
}

function stripSemanticCleanupSection(value: string): string {
  const text = normalizeTerminalText(value);
  const marker = "\n[cleanup]\n";
  const index = text.indexOf(marker);

  if (index >= 0) {
    return text.slice(0, index).trim();
  }

  return text;
}

function extractPrimaryIosErrorMessage(value: unknown): string {
  const withoutCleanup = stripSemanticCleanupSection(normalizeTerminalText(value));
  const lines = withoutCleanup
    .split("\n")
    .filter((line) => !isIosSyslogLine(line));

  const markerIndex = lines.findIndex((line) =>
    /%\s*(Invalid input detected|Incomplete command|Ambiguous command|Unknown command|Invalid command)/i.test(line),
  );

  if (markerIndex < 0) {
    return lines.join("\n").trim();
  }

  let start = markerIndex;

  while (start > 0) {
    const previous = lines[start - 1] ?? "";

    if (/^\s*\^+\s*$/.test(previous)) {
      start -= 1;
      continue;
    }

    if (previous.trim() && !/^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]\s*$/.test(previous.trim())) {
      start -= 1;
      continue;
    }

    break;
  }

  return lines.slice(start, markerIndex + 1).join("\n").trim();
}

function createRuntimePollingError(device: string, cause: string): Error {
  const error = new Error(
    `No se pudo inspeccionar "${device}" porque el runtime de Packet Tracer no respondió.`,
  ) as Error & { code?: string; details?: Record<string, unknown> };

  error.code = "RUNTIME_NOT_POLLING";
  error.details = { device, cause };
  return error;
}

function extractIosFailureDetails(input: {
  output?: unknown;
  error?: { code?: unknown; message?: unknown };
  parsed?: unknown;
}): { code: string; message: string } {
  const output = String(input.output ?? "").trim();
  const loweredOutput = output.toLowerCase();

  if (loweredOutput.includes("invalid input detected") || loweredOutput.includes("invalid command")) {
    return {
      code: "IOS_INVALID_INPUT",
      message: extractPrimaryIosErrorMessage(output) || output || "Entrada inválida en IOS",
    };
  }

  if (loweredOutput.includes("not recognized")) {
    return {
      code: "IOS_UNKNOWN_COMMAND",
      message: extractPrimaryIosErrorMessage(output) || output || "Comando IOS no reconocido",
    };
  }

  const parsed = input.parsed && typeof input.parsed === "object"
    ? (input.parsed as Record<string, unknown>)
    : {};

  const parsedError = parsed.error && typeof parsed.error === "object"
    ? (parsed.error as Record<string, unknown>)
    : {};

  const parsedCode = String(
    parsed.code ??
    parsed.errorCode ??
    parsedError.code ??
    input.error?.code ??
    "",
  );
  const parsedMessage = String(
    parsed.message ?? parsed.error ?? parsedError.message ?? input.error?.message ?? "",
  );

  if (parsedCode) {
    return {
      code: parsedCode,
      message: extractPrimaryIosErrorMessage(output) || output || parsedMessage || parsedCode,
    };
  }

  return {
    code: String(input.error?.code ?? "IOS_EXEC_FAILED"),
    message: extractPrimaryIosErrorMessage(output) || output || String(input.error?.message ?? "Error en ejecución de comando IOS"),
  };
}

function detectIosSemanticFailure(output: unknown): { code: string; message: string } | null {
  const text = String(output ?? "");
  const recent = text.split(/\r?\n/).slice(-30).join("\n");
  const lower = recent.toLowerCase();

  if (lower.includes("% invalid input detected") || lower.includes("% invalid command")) {
    return {
      code: "IOS_INVALID_INPUT",
      message: recent.trim() || "Comando IOS con input inválido detectado",
    };
  }

  if (lower.includes("% incomplete command")) {
    return {
      code: "IOS_INCOMPLETE_COMMAND",
      message: recent.trim() || "Comando IOS incompleto",
    };
  }

  if (lower.includes("% ambiguous command")) {
    return {
      code: "IOS_AMBIGUOUS_COMMAND",
      message: recent.trim() || "Comando IOS ambiguo",
    };
  }

  if (lower.includes("% unknown command")) {
    return {
      code: "IOS_INVALID_INPUT",
      message: recent.trim() || "Comando IOS desconocido",
    };
  }

  if (lower.includes("translating...")) {
    return {
      code: "IOS_DNS_LOOKUP_TRIGGERED",
      message: recent.trim() || "DNS lookup activado durante ejecución de comando",
    };
  }

  if (lower.includes("% bad secrets")) {
    return {
      code: "IOS_PRIVILEGE_REQUIRED",
      message: recent.trim() || "Se requiere privilegio elevado",
    };
  }

  if (lower.includes("% not in config mode")) {
    return {
      code: "IOS_CONFIG_MODE_REQUIRED",
      message: recent.trim() || "Se requiere modo configuración",
    };
  }

  return null;
}

function detectIosSemanticFailureFromRuntimeResult(runtimeResult: any): { code: string; message: string } | null {
  return detectIosSemanticFailure(
    firstString(runtimeResult?.rawOutput, runtimeResult?.output, runtimeResult?.raw),
  );
}

function isIosConfigModeText(value: unknown): boolean {
  const text = String(value ?? "").trim().toLowerCase();

  return (
    text.startsWith("global-config") ||
    text.startsWith("interface-config") ||
    text.startsWith("router-config") ||
    text.startsWith("line-config") ||
    text.startsWith("config") ||
    /\(config[^)]*\)#\s*$/.test(text)
  );
}

function getLastNonEmptyLine(value: unknown): string {
  const lines = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.at(-1) ?? "";
}

function isIosPrivilegedPromptText(value: unknown): boolean {
  const text = String(value ?? "").trim();

  return /^[A-Za-z0-9._-]+#\s*$/.test(text) && !/\(config[^)]*\)#\s*$/.test(text);
}

function inferRuntimeFinalPromptFromOutput(runtimeResult: any): string {
  return getLastNonEmptyLine(
    firstString(
      runtimeResult?.rawOutput,
      runtimeResult?.output,
      runtimeResult?.raw,
      runtimeResult?.result?.raw,
      runtimeResult?.result?.output,
    ),
  );
}

function getRuntimeFailureText(runtimeResult: any): string {
  return firstString(
    runtimeResult?.parsed?.result?.output,
    runtimeResult?.parsed?.result?.rawOutput,
    runtimeResult?.parsed?.result?.raw,
    runtimeResult?.rawOutput,
    runtimeResult?.output,
    runtimeResult?.error?.message,
    runtimeResult?.error,
  );
}

function getRuntimeModeAfter(runtimeResult: any): string {
  return String(
    runtimeResult?.modeAfter ??
      runtimeResult?.session?.modeAfter ??
      runtimeResult?.session?.mode ??
      runtimeResult?.parsed?.session?.modeAfter ??
      runtimeResult?.parsed?.session?.mode ??
      "",
  );
}

function getRuntimePromptAfter(runtimeResult: any): string {
  return String(
    runtimeResult?.promptAfter ??
      runtimeResult?.session?.promptAfter ??
      runtimeResult?.session?.prompt ??
      runtimeResult?.parsed?.session?.promptAfter ??
      runtimeResult?.parsed?.session?.prompt ??
      "",
  );
}

function detectAutoConfigFinalModeFailure(
  plan: any,
  runtimeResult: any,
): { code: string; message: string } | null {
  const metadata = plan?.metadata as { autoConfig?: unknown } | undefined;

  if (metadata?.autoConfig !== true) {
    return null;
  }

  const modeAfter = getRuntimeModeAfter(runtimeResult);
  const promptAfter = getRuntimePromptAfter(runtimeResult);
  const rawOutput = firstString(runtimeResult?.rawOutput, runtimeResult?.output);
  const finalPromptFromOutput = inferRuntimeFinalPromptFromOutput(runtimeResult);

  if (isIosPrivilegedPromptText(finalPromptFromOutput)) {
    return null;
  }

  if (isIosConfigModeText(modeAfter) || isIosConfigModeText(promptAfter)) {
    return {
      code: "IOS_AUTOCONFIG_DID_NOT_EXIT_CONFIG_MODE",
      message:
        `Auto-config terminó en modo configuración. modeAfter=${JSON.stringify(modeAfter)} ` +
        `promptAfter=${JSON.stringify(promptAfter)} ` +
        `finalPromptFromOutput=${JSON.stringify(finalPromptFromOutput)}\n` +
        rawOutput,
    };
  }

  return null;
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

function classifyDeviceState(deviceState: {
  type?: string | number;
  model?: unknown;
  customDeviceModel?: unknown;
}): TerminalDeviceKind {
  if (isIosLikeDevice(deviceState)) {
    return "ios";
  }

  if (isHostLikeDevice(deviceState)) {
    return "host";
  }

  return "unknown";
}

function normalizeWarnings(warnings: unknown): string[] {
  return Array.isArray(warnings) ? warnings : [];
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return String(value);
    }
  }

  return "";
}

function normalizeIosCommand(line: string): string {
  return line.trim().replace(/\s+/g, " ").toLowerCase();
}

function isPrivilegedIosCommand(line: string): boolean {
  const cmd = normalizeIosCommand(line);

  return (
    /^write\b/.test(cmd) ||
    /^copy\b/.test(cmd) ||
    /^erase\b/.test(cmd) ||
    /^reload\b/.test(cmd) ||
    /^clear\b/.test(cmd) ||
    /^debug\b/.test(cmd) ||
    /^undebug\b/.test(cmd)
  );
}

function getHeartbeatHealth(controller: TerminalControllerPort): {
  state: "ok" | "stale" | "missing" | "unknown";
  ageMs?: number;
  lastSeenTs?: number;
} | null {
  try {
    return controller.getHeartbeatHealth?.() ?? null;
  } catch {
    return null;
  }
}

function getHeartbeatAgeMs(health: { ageMs?: number } | null): number | null {
  if (!health || typeof health.ageMs !== "number" || !Number.isFinite(health.ageMs)) {
    return null;
  }

  return health.ageMs;
}

function isHighRiskIosCommand(command: string, plan: any): boolean {
  if (plan?.metadata?.autoConfig === true) {
    return true;
  }

  return splitCommandLines(command).some(isPrivilegedIosCommand);
}

function createRuntimeUnavailableResult(args: {
  action: "ios.exec" | "host.exec";
  device: string;
  deviceKind: TerminalDeviceKind;
  command: string;
  health: { state: "ok" | "stale" | "missing" | "unknown"; ageMs?: number; lastSeenTs?: number } | null;
  reason: string;
}): TerminalCommandResult {
  return buildCommandResult({
    ok: false,
    action: args.action,
    device: args.device,
    deviceKind: args.deviceKind,
    command: args.command,
    output: "",
    rawOutput: "",
    status: 1,
    error: {
      code: "PT_RUNTIME_UNAVAILABLE",
      message: args.reason,
      phase: "detection",
    },
    warnings: [],
    evidence: {
      heartbeat: args.health,
      reason: args.reason,
    },
  });
}

function isHostInvalidCommand(output: string): boolean {
  const lowered = output.toLowerCase();
  return lowered.includes("invalid command") || lowered.includes("not recognized");
}

function buildCommandResult(input: {
  ok: boolean;
  action: "ios.exec" | "host.exec";
  device: string;
  deviceKind: TerminalDeviceKind;
  command: string;
  output: string;
  rawOutput: string;
  status: number;
  warnings: unknown;
  evidence: unknown;
  error?: {
    code: string;
    message: string;
    phase: "detection" | "execution";
  };
}): TerminalCommandResult {
  const result: TerminalCommandResult = {
    ok: input.ok,
    action: input.action,
    device: input.device,
    deviceKind: input.deviceKind,
    command: input.command,
    output: input.output,
    rawOutput: input.rawOutput,
    status: input.status,
    warnings: normalizeWarnings(input.warnings),
    evidence: input.evidence,
  };

  if (input.error) {
    result.error = input.error;
  }

  return result;
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

function createExecuteCommandRuntimeUnavailableResult(args: {
  device: string;
  deviceKind: TerminalDeviceKind;
  command: string;
  heartbeat: { state: "ok" | "stale" | "missing" | "unknown"; ageMs?: number; lastSeenTs?: number } | null;
  reason: string;
}): TerminalCommandResult {
  return {
    ok: false,
    action: args.deviceKind === "host" ? "host.exec" : "ios.exec",
    device: args.device,
    deviceKind: args.deviceKind,
    command: args.command,
    output: "",
    rawOutput: "",
    status: 1,
    error: {
      code: "PT_RUNTIME_UNAVAILABLE",
      message: args.reason,
      phase: "detection",
    },
    warnings: [],
    evidence: {
      heartbeat: args.heartbeat,
      reason: args.reason,
    },
  };
}

const DEVICE_KIND_CACHE_TTL_MS = 30_000;

type DeviceKindCacheEntry = {
  kind: TerminalDeviceKind;
  expiresAtMs: number;
};

function getDeviceKindCacheKey(device: string): string {
  return String(device ?? "").trim().toLowerCase();
}

function isCacheableDeviceKind(kind: TerminalDeviceKind): boolean {
  return kind === "ios" || kind === "host";
}

export function createTerminalCommandService(deps: TerminalCommandServiceDeps) {
  const deviceKindCache = new Map<string, DeviceKindCacheEntry>();

  function readCachedDeviceKind(device: string): TerminalDeviceKind | null {
    const cacheKey = getDeviceKindCacheKey(device);
    if (!cacheKey) return null;

    const cached = deviceKindCache.get(cacheKey);
    if (!cached) return null;

    if (cached.expiresAtMs <= serviceNowMs()) {
      deviceKindCache.delete(cacheKey);
      return null;
    }

    return cached.kind;
  }

  function writeCachedDeviceKind(device: string, kind: TerminalDeviceKind): void {
    if (!isCacheableDeviceKind(kind)) return;

    const cacheKey = getDeviceKindCacheKey(device);
    if (!cacheKey) return;

    deviceKindCache.set(cacheKey, {
      kind,
      expiresAtMs: serviceNowMs() + DEVICE_KIND_CACHE_TTL_MS,
    });
  }

  async function resolveDeviceKind(
    device: string,
    timings?: TerminalServiceTimingMap,
  ): Promise<TerminalDeviceKind> {
    const serviceTimings = timings ?? {};
    const cachedKind = readCachedDeviceKind(device);

    if (cachedKind) {
      serviceTimings.resolveDeviceKindCacheHit = 1;
      return cachedKind;
    }

    serviceTimings.resolveDeviceKindCacheMiss = 1;

    try {
      const fastInspector = deps.controller.inspectDeviceFast;

      if (fastInspector) {
        let fastDeviceState: unknown = null;

        try {
          fastDeviceState = await measureServiceAsync(
            serviceTimings,
            "inspectDeviceFastMs",
            () => fastInspector.call(deps.controller, device),
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error ?? "");
          const lowered = message.toLowerCase();

          if (
            lowered.includes("timeout") ||
            lowered.includes("timed out") ||
            lowered.includes("runtime_not_polling") ||
            lowered.includes("no result")
          ) {
            throw createRuntimePollingError(device, message);
          }

          fastDeviceState = null;
        }

        if (!fastDeviceState) {
          return "unknown";
        }

        const kind = classifyDeviceState(fastDeviceState);
        writeCachedDeviceKind(device, kind);
        return kind;
      }

      const deviceState = await measureServiceAsync(
        serviceTimings,
        "inspectDeviceMs",
        () => deps.controller.inspectDevice(device).catch(() => null),
      );

      if (!deviceState) {
        return "unknown";
      }

      const kind = classifyDeviceState(deviceState);
      writeCachedDeviceKind(device, kind);
      return kind;
    } catch (error) {
      const runtimeError = error as Error & { code?: string };

      if (runtimeError.code === "RUNTIME_NOT_POLLING") {
        throw runtimeError;
      }

      return "unknown";
    }
  }

async function executeIosCommand(
  device: string,
  command: string,
  options?: RunTerminalCommandOptions,
  timings?: TerminalServiceTimingMap,
): Promise<TerminalCommandResult> {
  const serviceTimings = timings ?? {};
  const runtimeTerminal = deps.runtimeTerminal;
  const executionTimeout = options?.timeoutMs ?? 45000;
  const bridgeTimeout = executionTimeout + 5000; // Margen para que el runtime falle primero
  const plan = measureServiceSync(serviceTimings, "buildIosPlanMs", () =>
    buildUniversalTerminalPlan({
      id: deps.generateId(),
      device,
      command,
      deviceKind: "ios",
      mode: options?.mode,
      allowConfirm: options?.allowConfirm,
      allowDestructive: options?.allowDestructive,
      timeoutMs: executionTimeout,
    }),
  );
  const heartbeat = measureServiceSync(serviceTimings, "getHeartbeatHealthMs", () =>
    getHeartbeatHealth(deps.controller),
  );
  const heartbeatAgeMs = measureServiceSync(serviceTimings, "getHeartbeatAgeMs", () =>
    getHeartbeatAgeMs(heartbeat),
  );

    if (heartbeatAgeMs !== null && heartbeatAgeMs > 20000) {
      return createRuntimeUnavailableResult({
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        health: heartbeat,
        reason: "PT_RUNTIME_UNAVAILABLE: el heartbeat del runtime supera 20s.",
      });
    }

    if (heartbeatAgeMs !== null && heartbeatAgeMs > 10000 && isHighRiskIosCommand(command, plan)) {
      return createRuntimeUnavailableResult({
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        health: heartbeat,
        reason: "PT_RUNTIME_UNAVAILABLE: el heartbeat del runtime supera 10s para un comando IOS de alto riesgo.",
      });
    }

    if (runtimeTerminal?.runTerminalPlan) {
      const runtimeResult = (await measureServiceAsync(serviceTimings, "runtimeTerminalRunPlanMs", () =>
        runtimeTerminal.runTerminalPlan(plan, { timeoutMs: bridgeTimeout }),
      )) as any;

      if (!runtimeResult.ok) {
        const iosFailure = extractIosFailureDetails({
          output: getRuntimeFailureText(runtimeResult),
          error: runtimeResult.error,
          parsed: runtimeResult.parsed,
        });

        return buildCommandResult({
          ok: false,
          action: "ios.exec",
          device,
          deviceKind: "ios",
          command,
          output: firstString(runtimeResult.output),
          rawOutput: firstString(runtimeResult.rawOutput, runtimeResult.output),
          status: Number(runtimeResult.status ?? 1),
          error: {
            code: iosFailure.code,
            message: iosFailure.message,
            phase: "execution",
          },
          warnings: runtimeResult.warnings,
          evidence: runtimeResult.evidence,
        });
      }

      const semanticFailure = detectIosSemanticFailureFromRuntimeResult(runtimeResult);

      if (semanticFailure) {
        return buildCommandResult({
          ok: false,
          action: "ios.exec",
          device,
          deviceKind: "ios",
          command,
          output: firstString(runtimeResult.output),
          rawOutput: firstString(runtimeResult.rawOutput, runtimeResult.output),
          status: 1,
          error: {
            code: semanticFailure.code,
            message: semanticFailure.message,
            phase: "execution",
          },
          warnings: runtimeResult.warnings,
          evidence: runtimeResult.evidence,
        });
      }

      const autoConfigFinalModeFailure = detectAutoConfigFinalModeFailure(plan, runtimeResult);

      if (autoConfigFinalModeFailure) {
        return buildCommandResult({
          ok: false,
          action: "ios.exec",
          device,
          deviceKind: "ios",
          command,
          output: firstString(runtimeResult.output),
          rawOutput: firstString(runtimeResult.rawOutput, runtimeResult.output),
          status: 1,
          error: {
            code: autoConfigFinalModeFailure.code,
            message: autoConfigFinalModeFailure.message,
            phase: "execution",
          },
          warnings: runtimeResult.warnings,
          evidence: runtimeResult.evidence,
        });
      }

      return buildCommandResult({
        ok: true,
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        output: firstString(runtimeResult.output),
        rawOutput: firstString(runtimeResult.rawOutput, runtimeResult.output),
        status: Number(runtimeResult.status ?? 0),
        warnings: runtimeResult.warnings,
        evidence: runtimeResult.evidence,
      });
    }

    let execResult: any;

    try {
      execResult = await measureServiceAsync(serviceTimings, "legacyExecIosMs", () =>
        deps.controller.execIos(device, command, false, executionTimeout),
      );
    } catch (error) {
      const err = error as any;

        return buildCommandResult({
          ok: false,
          action: "ios.exec",
          device,
          deviceKind: "ios",
          command,
          output: firstString(
            err?.details?.output,
            err?.details?.evidence?.raw,
            err?.details?.parsed?.raw,
            err?.output,
            err?.raw,
          ),
        rawOutput: firstString(
          err?.details?.rawOutput,
          err?.details?.output,
          err?.details?.evidence?.raw,
          err?.details?.parsed?.raw,
          err?.output,
          err?.raw,
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
      });
    }

    const output = firstString(
      execResult.raw,
      execResult.output,
      execResult.evidence?.raw,
      execResult.parsed?.raw,
      execResult.parsed?.output,
      execResult.error?.details?.output,
    );

    const ok = Boolean(execResult.ok ?? false);
    const semanticFailure = detectIosSemanticFailure(output);

    if (!ok) {
      const evidence = execResult.evidence as any;
      const events = Array.isArray(evidence?.events) ? evidence.events : [];
      const parsedError = (execResult.parsed as any)?.error;
      const failureEvent = events.find((e: any) => e?.error || e?.code);
      const iosFailure = extractIosFailureDetails({
        output,
        error: parsedError,
      });

      return buildCommandResult({
        ok: false,
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        output,
        rawOutput: firstString(
          execResult.rawOutput,
          execResult.raw,
          execResult.output,
          execResult.evidence?.raw,
          execResult.parsed?.raw,
          execResult.parsed?.output,
          execResult.error?.details?.output,
        ),
        status: 1,
        error: {
          code: String(parsedError?.code ?? failureEvent?.code ?? iosFailure.code),
          message: String(parsedError?.message ?? failureEvent?.error ?? iosFailure.message),
          phase: "execution",
        },
        warnings: execResult.warnings,
        evidence,
      });
    }

    if (semanticFailure) {
      return buildCommandResult({
        ok: false,
        action: "ios.exec",
        device,
        deviceKind: "ios",
        command,
        output,
        rawOutput: firstString(
          execResult.rawOutput,
          execResult.raw,
          execResult.output,
          execResult.evidence?.raw,
          execResult.parsed?.raw,
          execResult.parsed?.output,
          execResult.error?.details?.output,
        ),
        status: 1,
        error: {
          code: semanticFailure.code,
          message: semanticFailure.message,
          phase: "execution",
        },
        warnings: execResult.warnings,
        evidence: execResult.evidence,
      });
    }

    return buildCommandResult({
      ok: true,
      action: "ios.exec",
      device,
      deviceKind: "ios",
      command,
      output,
      rawOutput: firstString(
        execResult.rawOutput,
        execResult.raw,
        execResult.output,
        execResult.evidence?.raw,
        execResult.parsed?.raw,
        execResult.parsed?.output,
        execResult.error?.details?.output,
      ),
      status: 0,
      warnings: execResult.warnings,
      evidence: execResult.evidence,
    });
  }

async function executeHostCommand(
  device: string,
  command: string,
  options?: RunTerminalCommandOptions,
  timings?: TerminalServiceTimingMap,
): Promise<TerminalCommandResult> {
  const serviceTimings = timings ?? {};
  const runtimeTerminal = deps.runtimeTerminal;
  const capabilityId = measureServiceSync(serviceTimings, "resolveHostCapabilityIdMs", () =>
    resolveHostCapabilityId(command),
  );

  const timeoutMs = options?.timeoutMs ?? 45000;
  const heartbeat = measureServiceSync(serviceTimings, "getHeartbeatHealthMs", () =>
    getHeartbeatHealth(deps.controller),
  );
  const heartbeatAgeMs = measureServiceSync(serviceTimings, "getHeartbeatAgeMs", () =>
    getHeartbeatAgeMs(heartbeat),
  );

    if (heartbeatAgeMs !== null && heartbeatAgeMs > 20000) {
      return createRuntimeUnavailableResult({
        action: "host.exec",
        device,
        deviceKind: "host",
        command,
        health: heartbeat,
        reason: "PT_RUNTIME_UNAVAILABLE: el heartbeat del runtime supera 20s.",
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

      const runtimeResult = (await measureServiceAsync(serviceTimings, "runtimeTerminalRunPlanMs", () =>
        runtimeTerminal.runTerminalPlan(plan, { timeoutMs }),
      )) as any;

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

    const execResult = await measureServiceAsync(serviceTimings, "legacyExecHostMs", () =>
      deps.controller.execHost(device, command, capabilityId, {
        timeoutMs,
      }),
    );

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

async function executeCommand(
  device: string,
  command: string,
  options?: RunTerminalCommandOptions
): Promise<TerminalCommandResult> {
  const serviceStartedAt = serviceNowMs();
  const serviceTimings: TerminalServiceTimingMap = {};
  let deviceKind: TerminalDeviceKind = "unknown";

  const heartbeat = measureServiceSync(serviceTimings, "executeCommandHeartbeatMs", () =>
    getHeartbeatHealth(deps.controller),
  );
  const heartbeatAgeMs = measureServiceSync(serviceTimings, "executeCommandHeartbeatAgeMs", () =>
    getHeartbeatAgeMs(heartbeat),
  );

  if (heartbeatAgeMs !== null && heartbeatAgeMs > 20000) {
    return attachTerminalServiceTimings(
      createExecuteCommandRuntimeUnavailableResult({
        device,
        deviceKind: "unknown",
        command,
        heartbeat,
        reason: "PT_RUNTIME_UNAVAILABLE: el heartbeat del runtime supera 20s.",
      }),
      serviceTimings,
      serviceStartedAt,
    );
  }

  try {
    deviceKind = await measureServiceAsync(serviceTimings, "resolveDeviceKindMs", () =>
      resolveDeviceKind(device, serviceTimings),
    );
  } catch (error) {
    const runtimeError = error as Error & { code?: string; details?: Record<string, unknown> };

    if (runtimeError.code === "RUNTIME_NOT_POLLING") {
      return attachTerminalServiceTimings(
        {
          ok: false,
          action: "ios.exec",
          device,
          deviceKind: "unknown",
          command,
          output: "",
          rawOutput: "",
          status: 1,
          error: {
            code: runtimeError.code,
            message: runtimeError.message,
            phase: "detection",
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

  if (heartbeatAgeMs !== null && heartbeatAgeMs > 20000) {
    return attachTerminalServiceTimings(
      createExecuteCommandRuntimeUnavailableResult({
        device,
        deviceKind,
        command,
        heartbeat,
        reason: "PT_RUNTIME_UNAVAILABLE: el heartbeat del runtime supera 20s.",
      }),
      serviceTimings,
      serviceStartedAt,
    );
  }

  if (deviceKind === "ios") {
    return attachTerminalServiceTimings(
      await measureServiceAsync(serviceTimings, "executeIosCommandMs", () =>
        executeIosCommand(device, command, options, serviceTimings),
      ),
      serviceTimings,
      serviceStartedAt,
    );
  }

  if (deviceKind === "host") {
    return attachTerminalServiceTimings(
      await measureServiceAsync(serviceTimings, "executeHostCommandMs", () =>
        executeHostCommand(device, command, options, serviceTimings),
      ),
      serviceTimings,
      serviceStartedAt,
    );
  }

  return attachTerminalServiceTimings(
    {
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
    } as TerminalCommandResult,
    serviceTimings,
    serviceStartedAt,
  );
}

  return {
    executeCommand,
    resolveDeviceKind,
  };
}
