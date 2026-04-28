# native exec source review

Fecha: Tue Apr 28 16:53:40 -05 2026

## repo status
```
/Users/andresgaibor/code/javascript/cisco-auto
 M packages/pt-control/src/adapters/omni-payload-builder.ts
 M packages/pt-control/src/adapters/omni-response-parser.ts
 M packages/pt-control/src/adapters/runtime-omni-adapter.ts
 M packages/pt-control/src/adapters/runtime-primitive-adapter.ts
 M packages/pt-control/src/adapters/runtime-terminal/adapter.deferred.test.ts
 M packages/pt-control/src/adapters/runtime-terminal/adapter.ts
 M packages/pt-control/src/adapters/runtime-terminal/response-parser.test.ts
 M packages/pt-control/src/adapters/runtime-terminal/response-parser.ts
 M packages/pt-control/src/application/services/terminal-plan-builder.test.ts
 M packages/pt-control/src/application/services/terminal-plan-builder.ts
 M packages/pt-control/src/commands/bridge-doctor-command.ts
 M packages/pt-control/src/pt/terminal/standard-terminal-plans.ts
 M packages/pt-runtime/src/__tests__/handlers/poll-deferred.test.ts
 M packages/pt-runtime/src/__tests__/handlers/runtime-handler-groups.test.ts
 M packages/pt-runtime/src/__tests__/pt/execution-engine-auto-attach.test.ts
 M packages/pt-runtime/src/__tests__/pt/kernel/runtime-api-compat.test.ts
 M packages/pt-runtime/src/__tests__/pt/queue-control-while-busy.test.ts
 M packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts
 M packages/pt-runtime/src/__tests__/terminal/command-state-machine.test.ts
 M packages/pt-runtime/src/build/runtime-manifest.ts
 M packages/pt-runtime/src/handlers/poll-deferred.ts
 M packages/pt-runtime/src/handlers/registration/experimental-handlers.ts
 M packages/pt-runtime/src/handlers/registration/runtime-registration.ts
 M packages/pt-runtime/src/handlers/registration/stable-handlers.ts
 M packages/pt-runtime/src/pt/kernel/execution-engine.ts
 M packages/pt-runtime/src/pt/kernel/kernel-lifecycle.ts
 M packages/pt-runtime/src/pt/kernel/queue-poller.ts
 M packages/pt-runtime/src/pt/kernel/runtime-api.ts
 M packages/pt-runtime/src/pt/terminal/terminal-engine.ts
 M packages/pt-runtime/src/terminal/engine/command-state-machine.ts
 M packages/pt-runtime/src/terminal/terminal-ready.ts
?? .pt-validation-reports/
?? packages/pt-control/src/__tests__/bridge-doctor-command.test.ts
?? packages/pt-control/src/__tests__/omni/runtime-omni-adapter.test.ts
?? packages/pt-control/src/adapters/runtime-terminal/adapter.native-exec.test.ts
?? packages/pt-runtime/src/__tests__/handlers/terminal-native-exec.test.ts
?? packages/pt-runtime/src/handlers/terminal-native-exec.ts
```

## terminal-native-exec handler
```ts
import type { RuntimeApi, RuntimeResult } from "../runtime/contracts.js";
import { createErrorResult, createSuccessResult } from "./result-factories.js";
import type { PTTerminal } from "./ios/ios-session-utils.js";

interface NativeExecPayload {
  device?: string;
  command?: string;
  timeoutMs?: number;
  maxPagerAdvances?: number;
  stableSamples?: number;
  sampleDelayMs?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeEol(value: unknown): string {
  return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function trimLine(value: unknown): string {
  return String(value ?? "").replace(/^[ \t]+/, "").replace(/[ \t]+$/, "");
}

function safeCallString(target: unknown, method: string): string {
  try {
    const maybe = target as Record<string, unknown> | null | undefined;
    const fn = maybe && typeof maybe[method] === "function" ? (maybe[method] as () => unknown) : null;

    if (fn) return String(fn() ?? "");
  } catch {}

  return "";
}

function getTerminal(api: RuntimeApi, deviceName: string): PTTerminal | null {
  try {
    const ipc = (api as any).ipc ?? (globalThis as any).ipc;
    const net = ipc && typeof ipc.network === "function" ? ipc.network() : null;
    const device = net && typeof net.getDevice === "function" ? net.getDevice(deviceName) : null;

    if (device && typeof device.getCommandLine === "function") {
      return device.getCommandLine() as PTTerminal | null;
    }
  } catch {}

  return null;
}

function clearWhitespaceInput(term: PTTerminal): void {
  const input = safeCallString(term, "getCommandInput");

  if (input.length === 0) return;
  if (input.replace(/\s+/g, "") !== "") return;

  try {
    term.enterChar(21, 0);
  } catch {}

  for (let i = 0; i < Math.min(input.length + 8, 32); i += 1) {
    try {
      term.enterChar(8, 0);
    } catch {}
  }
}

function lastNonEmptyLine(output: string): string {
  const lines = normalizeEol(output).split("\n");

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = trimLine(lines[i]);
    if (line) return line;
  }

  return "";
}

function tailHasActivePager(output: string): boolean {
  const tail = normalizeEol(output).slice(-1000).replace(/\s+$/, "");

  return /--More--$/i.test(tail) || /More:$/i.test(tail) || /Press any key to continue$/i.test(tail);
}

function lineIsIosPrompt(line: string): boolean {
  return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(trimLine(line));
}

function hasCommandEcho(output: string, command: string): boolean {
  const text = normalizeEol(output).toLowerCase();
  const cmd = String(command ?? "").trim().toLowerCase();

  return (
    text.startsWith(cmd + "\n") ||
    text.startsWith(cmd) ||
    text.includes(">" + cmd) ||
    text.includes("#" + cmd) ||
    text.includes("\n" + cmd + "\n")
  );
}

function extractLatestCommandBlock(output: string, command: string): string {
  const text = normalizeEol(output);
  const cmd = String(command ?? "").trim().toLowerCase();
  const lines = text.split("\n");

  let startIndex = -1;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const lower = trimLine(lines[i]).toLowerCase();

    if (lower === cmd || lower.includes(">" + cmd) || lower.includes("#" + cmd)) {
      startIndex = i;
      break;
    }
  }

  return startIndex >= 0 ? lines.slice(startIndex).join("\n") : text;
}

function stripFinalPromptForOutput(raw: string): string {
  const lines = normalizeEol(raw).split("\n");

  while (lines.length > 0 && trimLine(lines[lines.length - 1]) === "") {
    lines.pop();
  }

  if (lines.length > 0 && lineIsIosPrompt(lines[lines.length - 1])) {
    lines.pop();
  }

  return lines.join("\n").trimEnd();
}

export async function handleTerminalNativeExec(
  payload: NativeExecPayload,
  api: RuntimeApi,
): Promise<RuntimeResult> {
  const device = String(payload.device ?? "").trim();
  const command = String(payload.command ?? "").trim();
  const timeoutMs = Number(payload.timeoutMs ?? 8000);
  const maxPagerAdvances = Number(payload.maxPagerAdvances ?? 80);
  const stableSamplesRequired = Number(payload.stableSamples ?? 2);
  const sampleDelayMs = Number(payload.sampleDelayMs ?? 90);

  if (!device || !command) {
    return createErrorResult("terminal.native.exec requiere device y command", "INVALID_NATIVE_EXEC_PAYLOAD");
  }

  const term = getTerminal(api, device);

  if (!term) {
    return createErrorResult("No se encontró terminal para " + device, "DEVICE_TERMINAL_NOT_FOUND");
  }

  const startedAt = Date.now();
  clearWhitespaceInput(term);

  const beforePrompt = safeCallString(term, "getPrompt");
  const beforeMode = safeCallString(term, "getMode");

  if (beforePrompt.trim().endsWith(">")) {
    try {
      term.enterCommand("enable");
      await sleep(250);
      clearWhitespaceInput(term);
    } catch {}
  }

  try {
    term.enterCommand(command);
  } catch (error) {
    return createErrorResult("terminal.native.exec no pudo enviar el comando: " + String(error), "NATIVE_EXEC_SEND_FAILED");
  }

  let pagerAdvances = 0;
  let lastOutput = "";
  let stableSamples = 0;
  let completed = false;
  let completionReason = "timeout";

  while (Date.now() - startedAt < timeoutMs) {
    const output = safeCallString(term, "getOutput") || safeCallString(term, "getAllOutput") || safeCallString(term, "getBuffer");
    const lastLine = lastNonEmptyLine(output);

    if (tailHasActivePager(output)) {
      if (pagerAdvances >= maxPagerAdvances) {
        completionReason = "pager-limit";
        break;
      }

      try {
        term.enterChar(32, 0);
        pagerAdvances += 1;
      } catch {}

      await sleep(sampleDelayMs);
      continue;
    }

    if (hasCommandEcho(output, command) && lineIsIosPrompt(lastLine)) {
      if (output === lastOutput) {
        stableSamples += 1;
      } else {
        stableSamples = 0;
      }

      if (stableSamples >= stableSamplesRequired) {
        completed = true;
        completionReason = "stable-prompt";
        break;
      }
    }

    lastOutput = output;
    await sleep(sampleDelayMs);
  }

  const finalOutput = safeCallString(term, "getOutput") || safeCallString(term, "getAllOutput") || safeCallString(term, "getBuffer");
  const raw = extractLatestCommandBlock(finalOutput, command);
  const output = stripFinalPromptForOutput(raw);
  const afterPrompt = safeCallString(term, "getPrompt");
  const afterMode = safeCallString(term, "getMode");
  const afterInput = safeCallString(term, "getCommandInput");

  clearWhitespaceInput(term);

  if (!completed) {
    return createErrorResult(
      `terminal.native.exec no completó ${command} en ${timeoutMs}ms`,
      completionReason === "pager-limit" ? "NATIVE_EXEC_PAGER_LIMIT" : "NATIVE_EXEC_TIMEOUT",
      {
        raw,
        details: {
          completionReason,
          pagerAdvances,
          elapsedMs: Date.now() - startedAt,
          prompt: afterPrompt,
          mode: afterMode,
          input: afterInput,
        },
      } as any,
    );
  }

  return createSuccessResult({
    ok: true,
    raw,
    output,
    status: 0,
    session: {
      modeBefore: beforeMode,
      modeAfter: afterMode,
      promptBefore: beforePrompt,
      promptAfter: afterPrompt,
      paging: pagerAdvances > 0,
      awaitingConfirm: false,
      kind: "ios",
    },
    diagnostics: {
      statusCode: 0,
      completionReason,
    },
  }) as RuntimeResult;
}
```

## stable handlers registration
```ts
import type { HandlerFn } from "../dispatcher.js";
import { registerHandler } from "../dispatcher.js";

import {
  handleEnsureVlans,
  handleConfigVlanInterfaces,
} from "../vlan.js";

import {
  handleConfigDhcpServer,
  handleInspectDhcpServer,
} from "../dhcp.js";

import { handleInspectHost } from "../host.js";

import {
  handleListDevices,
  handleAddDevice,
  handleRemoveDevice,
  handleRenameDevice,
  handleMoveDevice,
} from "../device.js";

import { handleAddLink, handleRemoveLink, handleVerifyLink, handleListLinks } from "../link.js";

import {
  handleSetDeviceIp,
  handleSetDefaultGateway,
} from "../device-config.js";

import {
  handleListCanvasRects,
  handleGetRect,
  handleDevicesInRect,
  handleClearCanvas,
} from "../canvas.js";

import {
  handleAddModule,
  handleRemoveModule,
  handleInspectModuleSlots,
} from "../module/index.js";

import { handleDeepInspect } from "../deep-inspect.js";

import {
  handleInspect,
  handleInspectDeviceFast,
  handleSnapshot,
  handleHardwareInfo,
  handleHardwareCatalog,
  handleCommandLog,
} from "../inspect.js";

import { handleConfigHost } from "../host-handler.js";
import { handleTerminalPlanRun } from "../terminal-plan-run.js";
import { handleTerminalNativeExec } from "../terminal-native-exec.js";
import { handlePollDeferred } from "../poll-deferred.js";
import {
  handleExecIos,
  handleConfigIos,
  handlePing,
  handleExecPc,
  handleReadTerminal,
} from "../ios/index.js";

let stableHandlersRegistered = false;

/**
 * Registra únicamente handlers operativos/estables.
 *
 * No registrar aquí:
 * - __evaluate
 * - omni.*
 * - siphon*
 * - exfiltrate*
 * - skipBoot
 * - evaluateInternalVariable
 */
export function registerStableRuntimeHandlers(): void {
  if (stableHandlersRegistered) {
    return;
  }

  stableHandlersRegistered = true;

  registerHandler("configHost", handleConfigHost as unknown as HandlerFn);
  registerHandler("terminal.plan.run", handleTerminalPlanRun as unknown as HandlerFn);
  registerHandler("terminal.native.exec", handleTerminalNativeExec as unknown as HandlerFn);
  registerHandler("__pollDeferred", handlePollDeferred as unknown as HandlerFn);

  // Legacy IOS/terminal handlers.
  // Se mantienen registrados para compatibilidad con adapters/comandos antiguos.
  registerHandler("configIos", handleConfigIos as unknown as HandlerFn);
  registerHandler("execIos", handleExecIos as unknown as HandlerFn);
  registerHandler("__ping", handlePing as unknown as HandlerFn);
  registerHandler("execPc", handleExecPc as unknown as HandlerFn);
  registerHandler("readTerminal", handleReadTerminal as unknown as HandlerFn);

  registerHandler("ensureVlans", handleEnsureVlans as unknown as HandlerFn);
  registerHandler("configVlanInterfaces", handleConfigVlanInterfaces as unknown as HandlerFn);
  registerHandler("configDhcpServer", handleConfigDhcpServer as unknown as HandlerFn);
  registerHandler("inspectDhcpServer", handleInspectDhcpServer as unknown as HandlerFn);
  registerHandler("inspectHost", handleInspectHost as unknown as HandlerFn);

  registerHandler("listDevices", handleListDevices as unknown as HandlerFn);
  registerHandler("addDevice", handleAddDevice as unknown as HandlerFn);
  registerHandler("removeDevice", handleRemoveDevice as unknown as HandlerFn);
  registerHandler("renameDevice", handleRenameDevice as unknown as HandlerFn);
  registerHandler("moveDevice", handleMoveDevice as unknown as HandlerFn);

  registerHandler("setDeviceIp", handleSetDeviceIp as unknown as HandlerFn);
  registerHandler("setDefaultGateway", handleSetDefaultGateway as unknown as HandlerFn);

  registerHandler("addLink", handleAddLink as unknown as HandlerFn);
  registerHandler("removeLink", handleRemoveLink as unknown as HandlerFn);
  registerHandler("verifyLink", handleVerifyLink as unknown as HandlerFn);
  registerHandler("listLinks", handleListLinks as unknown as HandlerFn);

  registerHandler("listCanvasRects", handleListCanvasRects as unknown as HandlerFn);
  registerHandler("getRect", handleGetRect as unknown as HandlerFn);
  registerHandler("devicesInRect", handleDevicesInRect as unknown as HandlerFn);
  registerHandler("clearCanvas", handleClearCanvas as unknown as HandlerFn);

  registerHandler("addModule", handleAddModule as unknown as HandlerFn);
  registerHandler("removeModule", handleRemoveModule as unknown as HandlerFn);
  registerHandler("inspectModuleSlots", handleInspectModuleSlots as unknown as HandlerFn);

  registerHandler("inspect", handleInspect as unknown as HandlerFn);
  registerHandler("inspectDeviceFast", handleInspectDeviceFast as unknown as HandlerFn);
  registerHandler("snapshot", handleSnapshot as unknown as HandlerFn);
  registerHandler("hardwareInfo", handleHardwareInfo as unknown as HandlerFn);
  registerHandler("hardwareCatalog", handleHardwareCatalog as unknown as HandlerFn);
  registerHandler("commandLog", handleCommandLog as unknown as HandlerFn);

  // Deep inspect sigue siendo estable porque ya existía como comando de inspección
  // explícito y no ejecuta evaluación arbitraria.
  registerHandler("deepInspect", handleDeepInspect as unknown as HandlerFn);
}
```

## runtime handler groups test
```ts
import { describe, expect, test } from "bun:test";

import {
  getHandler,
  getRegisteredTypes,
  registerRuntimeHandlers,
} from "../../handlers/runtime-handlers.js";

const stableHandlers = [
  "configHost",
  "terminal.native.exec",
  "configIos",
  "execIos",
  "__pollDeferred",
  "__ping",
  "execPc",
  "readTerminal",
  "ensureVlans",
  "configVlanInterfaces",
  "configDhcpServer",
  "inspectDhcpServer",
  "inspectHost",
  "listDevices",
  "addDevice",
  "removeDevice",
  "renameDevice",
  "moveDevice",
  "setDeviceIp",
  "setDefaultGateway",
  "addLink",
  "removeLink",
  "listCanvasRects",
  "getRect",
  "devicesInRect",
  "clearCanvas",
  "addModule",
  "removeModule",
  "inspect",
  "snapshot",
  "hardwareInfo",
  "hardwareCatalog",
  "commandLog",
  "deepInspect",
];

// Handlers experimentales/omni que ahora se registran juntos
const evaluateHandlers = [
  "__evaluate",
  "omni.evaluate.raw",
  "omni.raw",
];

const omniHandlers = [
  "omni.physical.siphon",
  "omni.logical.siphonConfigs",
  "siphonAllConfigs",
  "evaluateInternalVariable",
  "getActivityTreeXml",
  "execIosOmni",
  "setEnvironmentRules",
  "controlSimulation",
  "getNetworkGenoma",
  "exfiltrateHostFile",
  "skipBoot",
  "workspaceVisuals",
  "siphonDesktopApps",
  "siphonActiveProcesses",
  "isDesktopReady",
  "kvStore",
  "base64",
  "cryptoUtils",
];

describe("runtime handler groups", () => {
  test("stable handlers are registered", () => {
    registerRuntimeHandlers();

    for (const type of stableHandlers) {
      expect(getHandler(type), `${type} should be registered`).toBeDefined();
    }
  });

  test("evaluate handlers are registered with aliases", () => {
    registerRuntimeHandlers();

    for (const type of evaluateHandlers) {
      expect(getHandler(type), `${type} should be registered`).toBeDefined();
    }
  });

  test("omni handlers are registered", () => {
    registerRuntimeHandlers();

    for (const type of omniHandlers) {
      expect(getHandler(type), `${type} should be registered`).toBeDefined();
    }
  });

  test("registered type list includes all handlers", () => {
    registerRuntimeHandlers();
    const registered = getRegisteredTypes();

    for (const type of [...stableHandlers, ...evaluateHandlers, ...omniHandlers]) {
      expect(registered).toContain(type);
    }
  });
});
```

## native exec tests
```ts
import { describe, expect, test, vi } from "bun:test";

import { handleTerminalNativeExec } from "../../handlers/terminal-native-exec.js";

describe("terminal.native.exec", () => {
  test("ejecuta show running-config y devuelve salida estable", async () => {
    const terminal = {
      getPrompt: vi.fn(() => "SW1#"),
      getMode: vi.fn(() => "privileged-exec"),
      getOutput: vi.fn(() => "show running-config\nhostname SW1\nSW1#"),
      getAllOutput: vi.fn(() => "show running-config\nhostname SW1\nSW1#"),
      getBuffer: vi.fn(() => "show running-config\nhostname SW1\nSW1#"),
      getCommandInput: vi.fn(() => ""),
      enterCommand: vi.fn(),
      enterChar: vi.fn(),
    };

    const api = {
      ipc: {
        network: () => ({
          getDevice: () => ({
            getCommandLine: () => terminal,
          }),
        }),
      },
    } as any;

    const result = await handleTerminalNativeExec(
      {
        device: "SW1",
        command: "show running-config",
        timeoutMs: 2000,
      },
      api,
    );

    expect(result.ok).toBe(true);
    expect(result.raw).toContain("hostname SW1");
    expect(result.status).toBe(0);
  });
});
```

## pt-control adapter native exec path
```ts
// RuntimeTerminalAdapter — orchestrator (runTerminalPlan)
// Coordinates step handlers, status normalization, and device detection.
// No pure logic lives here — it delegates to specialized modules.

import type { FileBridgePort } from "../../application/ports/file-bridge.port.js";
import type {
  RuntimeTerminalPort,
  TerminalPortOptions,
  TerminalPortResult,
  TerminalPlan,
  TerminalPlanTimeouts,
  TerminalPlanPolicies,
} from "../../ports/runtime-terminal-port.js";
import { detectDeviceType } from "./device-type-detector.js";
import { handleEnsureModeStep } from "./step-handlers/ensure-mode-handler.js";
import { handleConfirmStep } from "./step-handlers/confirm-handler.js";
import { ensureSession, pollTerminalJob } from "./terminal-session.js";
import { createPayloadBuilder } from "./payload-builder.js";
import { createResponseParser } from "./response-parser.js";
import { createTerminalPlanAdapter } from "./terminal-plan-adapter.js";

export interface RuntimeTerminalAdapterDeps {
  bridge: FileBridgePort;
  generateId: () => string;
  defaultTimeout?: number;
}

export function createRuntimeTerminalAdapter(
  deps: RuntimeTerminalAdapterDeps,
): RuntimeTerminalPort {
  const { bridge, generateId, defaultTimeout = 30000 } = deps;

  const payloadBuilder = createPayloadBuilder({ bridge });
  const responseParser = createResponseParser();
  const planAdapter = createTerminalPlanAdapter();

  function normalizeBridgeValue(result: unknown): unknown {
    return (result as { value?: unknown })?.value ?? result ?? {};
  }

  function buildTimingsEvidence(timings: unknown): Record<string, unknown> {
    return timings ? { timings } : {};
  }

  function isDeferredValue(value: unknown): value is { deferred: true; ticket: string } {
    return (
      typeof value === "object" &&
      value !== null &&
      (value as { deferred?: unknown }).deferred === true &&
      typeof (value as { ticket?: unknown }).ticket === "string"
    );
  }

  function isStillPending(value: unknown): boolean {
    if (!value || typeof value !== "object") {
      return false;
    }

    const record = value as Record<string, unknown>;
    if (record.deferred === true) return true;
    if (record.done === false) return true;
    if (record.status === "pending") return true;
    if (record.status === "in-flight") return true;
    if (record.status === "running") return true;
    return false;
  }

  function isUnsupportedTerminalPlanRun(result: unknown): boolean {
    const value = result as { error?: unknown; value?: { error?: unknown } } | null | undefined;
    const text = String(value?.error ?? value?.value?.error ?? "").toLowerCase();
    return (
      text.includes("unknown command") ||
      text.includes("not found") ||
      text.includes("unsupported") ||
      text.includes("unrecognized") ||
      text.includes("no existe")
    );
  }

  function normalizeCommand(command: string): string {
    return String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function isFastNativeIosCommand(command: string): boolean {
    const cmd = normalizeCommand(command);

    if (!cmd) return false;

    return /^show\b/.test(cmd) || /^dir\b/.test(cmd) || /^more\b/.test(cmd);
  }

  function getVisibleCommandSteps(plan: TerminalPlan): Array<{ command: string; kind?: string }> {
    return plan.steps.filter((step) => {
      const metadata = step.metadata as { internal?: boolean } | undefined;

      return metadata?.internal !== true && String(step.command ?? "").trim().length > 0;
    }) as Array<{ command: string; kind?: string }>;
  }

  function getSingleVisibleCommand(plan: TerminalPlan): string | null {
    const commands = getVisibleCommandSteps(plan);

    if (commands.length !== 1) return null;

    const command = String(commands[0]?.command ?? "").trim();
    return command || null;
  }

  function shouldUseNativeExec(plan: TerminalPlan): boolean {
    const metadata = plan.metadata as { deviceKind?: string } | undefined;

    if (metadata?.deviceKind !== "ios") return false;

    const command = getSingleVisibleCommand(plan);
    if (!command) return false;

    return isFastNativeIosCommand(command);
  }

  function buildTerminalTransportFailure(
    message: string,
    evidence?: Record<string, unknown>,
  ): TerminalPortResult {
    return {
      ok: false,
      output: "",
      status: 1,
      promptBefore: "",
      promptAfter: "",
      modeBefore: "",
      modeAfter: "",
      events: [],
      warnings: [message],
      parsed: {
        ok: false,
        code: "TERMINAL_PLAN_TRANSPORT_FAILED",
        error: message,
      },
      evidence,
      confidence: 0,
    };
  }

  function buildTerminalDeferredFailure(
    code: string,
    message: string,
    evidence?: Record<string, unknown>,
  ): TerminalPortResult {
    return {
      ok: false,
      output: "",
      status: 1,
      promptBefore: "",
      promptAfter: "",
      modeBefore: "",
      modeAfter: "",
      events: [],
      warnings: [message],
      parsed: {
        ok: false,
        code,
        error: message,
      },
      evidence,
      confidence: 0,
    };
  }

  async function executeLegacyPlan(normalizedPlan: ReturnType<typeof planAdapter.normalizePlan>): Promise<TerminalPortResult> {
    let promptBefore = "";
    let modeBefore = "";
    let promptAfter = "";
    let modeAfter = "";
    let aggregatedOutput = "";
    let finalStatus = 0;
    let finalParsed: unknown = undefined;
    let finalTimings: unknown = undefined;

    const warnings: string[] = [];
    const events: Array<Record<string, unknown>> = [];

    const deviceType = await detectDeviceType(bridge, normalizedPlan.device);
    const isHost = deviceType === "host";
    const handlerName = isHost ? "execPc" : "execIos";

    const defaultTimeouts = normalizedPlan.timeouts ?? payloadBuilder.getDefaultTimeouts();
    const defaultPolicies = normalizedPlan.policies ?? payloadBuilder.getDefaultPolicies();

    for (let i = 0; i < normalizedPlan.steps.length; i += 1) {
      const step = normalizedPlan.steps[i]!;

      if (step.kind === "ensureMode") {
        const { event, result, returnEarly, returnValue } = await handleEnsureModeStep(
          {
            bridge,
            device: normalizedPlan.device,
            isHost,
            handlerName,
            defaultTimeouts,
            planTargetMode: normalizedPlan.targetMode,
          },
          step,
          i,
        );

        if (result.promptBefore && !promptBefore) promptBefore = result.promptBefore;
        if (result.modeBefore && !modeBefore) modeBefore = result.modeBefore;
        if (result.promptAfter) promptAfter = result.promptAfter;
        if (result.modeAfter) modeAfter = result.modeAfter;
        if (result.finalParsed) finalParsed = result.finalParsed;

        events.push(event);

        if (returnEarly && returnValue) return returnValue;
        continue;
      }

      if (step.kind === "expectPrompt") {
        events.push({
          stepIndex: i,
          kind: "expectPrompt",
          expectPromptPattern: step.expectPromptPattern,
        });
        continue;
      }

      if (step.kind === "confirm") {
        const { event } = await handleConfirmStep(
          {
            bridge,
            device: normalizedPlan.device,
            isHost,
            handlerName,
            defaultTimeouts,
          },
          i,
        );
        events.push(event);
        continue;
      }

      const command = String(step.command ?? "");
      const stepTimeout = step.timeout ?? defaultTimeouts.commandTimeoutMs;
      const stepStallTimeout = defaultTimeouts.stallTimeoutMs;

      const payload = payloadBuilder.buildCommandPayload({
        handlerName,
        device: normalizedPlan.device,
        command,
        targetMode: normalizedPlan.targetMode,
        expectMode: step.expectMode,
        expectPromptPattern: step.expectPromptPattern,
        allowPager: step.allowPager ?? defaultPolicies.autoAdvancePager,
        allowConfirm: step.allowConfirm ?? false,
        ensurePrivileged: payloadBuilder.shouldEnsurePrivilegedForStep({
          isHost,
          planTargetMode: normalizedPlan.targetMode,
          command,
          stepIndex: i,
        }),
        commandTimeoutMs: stepTimeout,
        stallTimeoutMs: stepStallTimeout,
      });

      const bridgeResult = await bridge.sendCommandAndWait<unknown>(handlerName, payload, stepTimeout);
      finalTimings = bridgeResult.timings;
      const parsed = responseParser.parseCommandResponse(normalizeBridgeValue(bridgeResult), {
        stepIndex: i,
        isHost,
        command,
      });

      if (i === 0) {
        promptBefore = parsed.promptBefore;
        modeBefore = parsed.modeBefore;
      }

      promptAfter = parsed.promptAfter;
      modeAfter = parsed.modeAfter;
      aggregatedOutput += parsed.raw.endsWith("\n") ? parsed.raw : `${parsed.raw}\n`;
      finalStatus = parsed.status;
      finalParsed = parsed.parsed;

      warnings.push(...parsed.warnings);
      const event = responseParser.buildEventFromResponse(parsed, step, i);
      events.push(event);

      const mismatchWarning = responseParser.checkPromptMismatch(parsed, step);
      if (mismatchWarning) warnings.push(mismatchWarning);

      if (!parsed.ok || parsed.status !== 0) {
        return {
          ok: false,
          output: aggregatedOutput.trim(),
          status: parsed.status || 1,
          promptBefore,
          promptAfter,
          modeBefore,
          modeAfter,
          events,
          warnings,
          parsed: finalParsed,
          evidence: buildTimingsEvidence(bridgeResult.timings),
          confidence: 0,
        };
      }
    }

    return {
      ok: true,
      output: aggregatedOutput.trim(),
      status: finalStatus,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      events,
      warnings,
      parsed: finalParsed,
      evidence: buildTimingsEvidence(finalTimings),
      confidence: warnings.length > 0 ? 0.8 : 1,
    };
  }

  function computeDeferredPollTimeoutMs(plan: TerminalPlan, requestedTimeoutMs: number): number {
    const planTimeouts = plan.timeouts as TerminalPlanTimeouts | undefined;
    const commandTimeoutMs = Number(planTimeouts?.commandTimeoutMs ?? requestedTimeoutMs ?? 30000);
    const stallTimeoutMs = Number(planTimeouts?.stallTimeoutMs ?? 15000);
    const stepCount = Math.max(plan.steps.length, 1);

    const perStepBudgetMs = commandTimeoutMs + stallTimeoutMs + 3000;
    const totalBudgetMs = perStepBudgetMs * stepCount;

    return Math.max(requestedTimeoutMs, totalBudgetMs, 25000);
  }

  function computeTerminalPlanSubmitTimeoutMs(plan: TerminalPlan, requestedTimeoutMs: number): number {
    const firstStepTimeoutMs = Number(plan.steps[0]?.timeout ?? requestedTimeoutMs ?? 30000);

    // terminal.plan.run solo debe crear el ticket; no ejecuta todo el comando.
    // Pero Packet Tracer puede tardar en reclamar archivos si el kernel está ocupado,
    // hay polling activo, o el filesystem compartido va lento.
    return Math.max(
      15000,
      Math.min(firstStepTimeoutMs, 30000),
    );
  }

  async function executeTerminalPlanRun(
    plan: TerminalPlan,
    timeoutMs: number,
  ): Promise<TerminalPortResult | null> {
    const submitTimeoutMs = computeTerminalPlanSubmitTimeoutMs(plan, timeoutMs);
    const submitResult = await bridge.sendCommandAndWait(
      "terminal.plan.run",
      { plan, options: { timeoutMs } },
      submitTimeoutMs,
      { resolveDeferred: false },
    );
    let finalTimings: unknown = submitResult.timings;

    if (isUnsupportedTerminalPlanRun(submitResult)) {
      return null;
    }

    const submitValue = normalizeBridgeValue(submitResult);

    if (
      submitValue &&
      typeof submitValue === "object" &&
      (submitValue as { ok?: unknown }).ok === false
    ) {
      const parsed = responseParser.parseCommandResponse(submitValue, {
        stepIndex: 0,
        isHost: false,
        command: "terminal.plan.run",
      });

      return {
        ok: false,
        output: parsed.raw.trim(),
        status: parsed.status || 1,
        promptBefore: parsed.promptBefore,
        promptAfter: parsed.promptAfter,
        modeBefore: parsed.modeBefore,
        modeAfter: parsed.modeAfter,
        events: [
          responseParser.buildEventFromResponse(
            parsed,
            { kind: "command", command: "terminal.plan.run" },
            0,
          ),
        ],
        warnings: parsed.warnings,
        parsed: parsed.parsed,
        evidence: buildTimingsEvidence(submitResult.timings),
        confidence: 0,
      };
    }

    if (isDeferredValue(submitValue)) {
      const startedAt = Date.now();
      const pollTimeoutMs = computeDeferredPollTimeoutMs(plan, timeoutMs);
      const pollIntervalMs = 300;

      let pollValue: unknown = null;

      while (Date.now() - startedAt < pollTimeoutMs) {
        try {
          const pollResult = await bridge.sendCommandAndWait(
            "__pollDeferred",
            { ticket: submitValue.ticket },
            Math.max(pollTimeoutMs - (Date.now() - startedAt), 1000),
            { resolveDeferred: false },
          );

          finalTimings = pollResult.timings;
          pollValue = normalizeBridgeValue(pollResult);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error ?? "Unknown poll error");

          return buildTerminalDeferredFailure(
            "TERMINAL_DEFERRED_POLL_TIMEOUT",
            `__pollDeferred no respondió en ${pollTimeoutMs}ms para ticket ${submitValue.ticket}: ${message}`,
            {
              phase: "terminal-plan-poll",
              ticket: submitValue.ticket,
              pollTimeoutMs,
              elapsedMs: Date.now() - startedAt,
              error: message,
            },
          );
        }

        if (!isStillPending(pollValue)) {
          break;
        }

        const remainingMs = pollTimeoutMs - (Date.now() - startedAt);
        if (remainingMs <= 0) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, Math.min(pollIntervalMs, remainingMs)));
      }

      if (isStillPending(pollValue)) {
        return buildTerminalDeferredFailure(
          "TERMINAL_DEFERRED_STALLED",
          `terminal.plan.run creó el ticket ${submitValue.ticket}, pero el job siguió pendiente después de ${pollTimeoutMs}ms.`,
          {
            phase: "terminal-plan-poll",
            ticket: submitValue.ticket,
            pollTimeoutMs,
            elapsedMs: Date.now() - startedAt,
            pollValue,
          },
        );
      }

      const parsed = responseParser.parseCommandResponse(pollValue, {
        stepIndex: 0,
        isHost: false,
        command: "terminal.plan.run",
      });

      const warnings = [...parsed.warnings];
      const mismatchWarning = responseParser.checkPromptMismatch(parsed, plan.steps[0] ?? {});
      if (mismatchWarning) warnings.push(mismatchWarning);

      return {
        ok: parsed.ok,
        output: parsed.raw.trim(),
        status: parsed.status,
        promptBefore: parsed.promptBefore,
        promptAfter: parsed.promptAfter,
        modeBefore: parsed.modeBefore,
        modeAfter: parsed.modeAfter,
        events: [responseParser.buildEventFromResponse(parsed, { kind: "command", command: "terminal.plan.run" }, 0)],
        warnings,
        parsed: parsed.parsed,
        evidence: buildTimingsEvidence(finalTimings),
        confidence: !parsed.ok || parsed.status !== 0 ? 0 : warnings.length > 0 ? 0.8 : 1,
      };
    }

    const parsed = responseParser.parseCommandResponse(submitValue, {
      stepIndex: 0,
      isHost: false,
      command: "terminal.plan.run",
    });

    const warnings = [...parsed.warnings];
    const mismatchWarning = responseParser.checkPromptMismatch(parsed, plan.steps[0] ?? {});
    if (mismatchWarning) warnings.push(mismatchWarning);

    return {
      ok: parsed.ok,
      output: parsed.raw.trim(),
      status: parsed.status,
      promptBefore: parsed.promptBefore,
      promptAfter: parsed.promptAfter,
      modeBefore: parsed.modeBefore,
      modeAfter: parsed.modeAfter,
      events: [responseParser.buildEventFromResponse(parsed, { kind: "command", command: "terminal.plan.run" }, 0)],
      warnings,
      parsed: parsed.parsed,
      evidence: buildTimingsEvidence(submitResult.timings),
      confidence: !parsed.ok || parsed.status !== 0 ? 0 : warnings.length > 0 ? 0.8 : 1,
    };
  }

  async function executeTerminalNativeExec(
    plan: TerminalPlan,
    timeoutMs: number,
  ): Promise<TerminalPortResult> {
    const command = String(getSingleVisibleCommand(plan) ?? "").trim();
    const stepTimeoutMs = Number(plan.steps[0]?.timeout ?? timeoutMs ?? defaultTimeout);
    const nativeTimeoutMs = Math.max(stepTimeoutMs, 10000);

    const nativeResult = await bridge.sendCommandAndWait(
      "terminal.native.exec",
      {
        device: plan.device,
        command,
        timeoutMs: nativeTimeoutMs,
        maxPagerAdvances: plan.policies?.maxPagerAdvances ?? 80,
        stableSamples: 2,
        sampleDelayMs: 90,
      },
      nativeTimeoutMs,
      { resolveDeferred: false },
    );

    const parsed = responseParser.parseCommandResponse(normalizeBridgeValue(nativeResult), {
      stepIndex: 0,
      isHost: false,
      command,
    });

    const warnings = [...parsed.warnings];
    const mismatchWarning = responseParser.checkPromptMismatch(parsed, plan.steps[0] ?? {});
    if (mismatchWarning) warnings.push(mismatchWarning);

    return {
      ok: parsed.ok,
      output: parsed.raw.trim(),
      status: parsed.status,
      promptBefore: parsed.promptBefore,
      promptAfter: parsed.promptAfter,
      modeBefore: parsed.modeBefore,
      modeAfter: parsed.modeAfter,
      events: [responseParser.buildEventFromResponse(parsed, { kind: "command", command }, 0)],
      warnings,
      parsed: parsed.parsed,
      evidence: buildTimingsEvidence(nativeResult.timings),
      confidence: !parsed.ok || parsed.status !== 0 ? 0 : warnings.length > 0 ? 0.8 : 1,
    };
  }

  async function runTerminalPlan(
    plan: TerminalPlan,
    options?: TerminalPortOptions,
  ): Promise<TerminalPortResult> {
    const timeoutMs = options?.timeoutMs ?? defaultTimeout;

    const validation = planAdapter.validatePlan(plan);
    if (!validation.valid) {
      return {
        ok: false,
        output: "",
        status: 1,
        promptBefore: "",
        promptAfter: "",
        modeBefore: "",
        modeAfter: "",
        events: [],
        warnings: validation.errors,
        confidence: 0,
      };
    }

    if (validation.warnings.length > 0) {
      console.warn("[runtime-terminal] Plan warnings:", validation.warnings);
    }

    const normalizedPlan = planAdapter.normalizePlan(plan);

    if (shouldUseNativeExec(normalizedPlan)) {
      return executeTerminalNativeExec(normalizedPlan, timeoutMs);
    }

    const deferredResult = await executeTerminalPlanRun(normalizedPlan, timeoutMs);
    if (deferredResult) return deferredResult;

    return executeLegacyPlan(normalizedPlan);
  }

  return {
    runTerminalPlan,
    ensureSession,
    pollTerminalJob,
  };
}
```

## adapter native exec tests
```ts
import { describe, expect, test, vi } from "bun:test";

import { createRuntimeTerminalAdapter } from "./adapter.js";

describe("createRuntimeTerminalAdapter native fast path", () => {
  test("usa terminal.native.exec para show running-config IOS", async () => {
    const calls: Array<{ type: string; timeoutMs?: number; options?: unknown }> = [];

    const bridge = {
      sendCommandAndWait: vi.fn(async (type: string, payload: unknown, timeoutMs?: number, options?: unknown) => {
        calls.push({ type, timeoutMs, options });

        if (type === "terminal.native.exec") {
          return {
            ok: true,
            status: 0,
            completedAt: Date.now(),
            value: {
              ok: true,
              raw: "show running-config\nhostname SW1\nSW1#",
              output: "show running-config\nhostname SW1\nSW1#",
              status: 0,
              session: {
                modeBefore: "privileged-exec",
                modeAfter: "privileged-exec",
                promptBefore: "SW1#",
                promptAfter: "SW1#",
              },
              diagnostics: { completionReason: "stable-prompt", pagerAdvances: 5 },
            },
          };
        }

        throw new Error(`unexpected ${type}`);
      }),
    };

    const adapter = createRuntimeTerminalAdapter({
      bridge: bridge as never,
      generateId: () => "id-native",
      defaultTimeout: 45000,
    });

    const result = await adapter.runTerminalPlan({
      id: "plan-native",
      device: "SW1",
      targetMode: "privileged-exec",
      metadata: { deviceKind: "ios" },
      steps: [{ command: "show running-config" }],
    } as never);

    expect(result.ok).toBe(true);
    expect(calls.map((call) => call.type)).toEqual(["terminal.native.exec"]);
    expect(calls[0]?.options).toMatchObject({ resolveDeferred: false });
  });
});
```

## response parser
```ts
// Response parser — parsea respuestas del bridge
// NO llama al bridge — esa responsabilidad es del adapter

interface UnifiedContractValue {
  ok: boolean;
  output: string;
  session: {
    modeBefore?: string;
    modeAfter?: string;
    promptBefore?: string;
    promptAfter?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
    autoDismissedInitialDialog?: boolean;
    kind?: string;
  };
  diagnostics?: {
    statusCode?: number;
    completionReason?: string;
  };
  warnings?: string[];
  error?: string;
}

interface LegacyContractValue {
  raw?: string;
  value?: string;
  output?: string;
  parsed?: {
    promptBefore?: string;
    promptAfter?: string;
    modeBefore?: string;
    modeAfter?: string;
    warnings?: string[];
  };
  session?: {
    mode?: string;
    prompt?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
    autoDismissedInitialDialog?: boolean;
  };
  diagnostics?: {
    commandStatus?: number;
    completionReason?: string;
  };
}

interface SimpleRuntimeResultValue {
  ok?: boolean;
  done?: boolean;
  status?: number;
  result?: {
    ok?: boolean;
    raw?: string;
    output?: string;
    status?: number;
    session?: {
      mode?: string;
      prompt?: string;
      modeBefore?: string;
      modeAfter?: string;
      promptBefore?: string;
      promptAfter?: string;
      paging?: boolean;
      awaitingConfirm?: boolean;
      autoDismissedInitialDialog?: boolean;
      kind?: string;
    };
  };
  code?: string;
  errorCode?: string;
  error?: string | { message?: string; code?: string; errorCode?: string };
  message?: string;
  raw?: string;
  output?: string;
  value?: unknown;
  parsed?: unknown;
  warnings?: string[];
  session?: {
    mode?: string;
    prompt?: string;
    modeBefore?: string;
    modeAfter?: string;
    promptBefore?: string;
    promptAfter?: string;
    paging?: boolean;
    awaitingConfirm?: boolean;
    autoDismissedInitialDialog?: boolean;
    kind?: string;
  };
  diagnostics?: {
    commandStatus?: number;
    statusCode?: number;
    completionReason?: string;
  };
}

export interface ParsedCommandResponse {
  raw: string;
  status: number;
  ok: boolean;
  promptBefore: string;
  promptAfter: string;
  modeBefore: string;
  modeAfter: string;
  parsed: unknown;
  paging: boolean;
  awaitingConfirm: boolean;
  autoDismissedInitialDialog: boolean;
  sessionKind: "host" | "ios";
  warnings: string[];
  error?: string;
  diagnostics?: {
    completionReason?: string;
    statusCode?: number;
  };
}

export interface ParseResponseOptions {
  stepIndex: number;
  isHost: boolean;
  command: string;
}

export function createResponseParser() {
  function normalizeStatusFromLegacy(value: LegacyContractValue | undefined): number {
    if (typeof value?.diagnostics?.commandStatus === "number") {
      return value.diagnostics.commandStatus;
    }

    const raw = String(value?.raw ?? value?.value ?? value?.output ?? "");
    if (!raw) return 0;

    const lines = raw.split("\n");
    const recentLines = lines.slice(-15).join("\n");

    if (
      recentLines.includes("% Invalid") ||
      recentLines.includes("% Incomplete") ||
      recentLines.includes("% Ambiguous") ||
      recentLines.includes("% Unknown") ||
      recentLines.includes("%Error") ||
      recentLines.toLowerCase().includes("invalid command") ||
      recentLines.includes("Command not found")
    ) {
      return 1;
    }

    return 0;
  }

  function parseCommandResponse(
    res: unknown,
    options: ParseResponseOptions,
  ): ParsedCommandResponse {
    const { stepIndex, isHost, command } = options;
    const warnings: string[] = [];

    const value = res as UnifiedContractValue | undefined;
    const hasUnifiedContract =
      typeof value?.ok === "boolean" &&
      value?.diagnostics &&
      value?.session &&
      typeof value?.output === "string";

    if (hasUnifiedContract) {
      return parseUnifiedContract(value, options, warnings);
    }

    const simpleValue = res as SimpleRuntimeResultValue | undefined;
    if (typeof simpleValue?.ok === "boolean") {
      return parseSimpleRuntimeResult(simpleValue, options, warnings);
    }

    return parseLegacyContract(res as LegacyContractValue | undefined, options, warnings, stepIndex);
  }

  function parseUnifiedContract(
    res: UnifiedContractValue,
    options: ParseResponseOptions,
    warnings: string[],
  ): ParsedCommandResponse {
    const { stepIndex, isHost, command } = options;
    const tr = res;

    const raw = String(tr.output ?? "");
    const status = Number(tr.diagnostics?.statusCode ?? (tr.ok ? 0 : 1));

    const promptBefore = stepIndex === 0 ? String(tr.session?.promptBefore ?? "") : "";
    const promptAfter = String(tr.session?.promptAfter ?? "");
    const modeBefore = stepIndex === 0 ? String(tr.session?.modeBefore ?? "") : "";
    const modeAfter = String(tr.session?.modeAfter ?? "");

    const sessionInfo = tr.session ?? {};

    if (tr.warnings && Array.isArray(tr.warnings)) {
      warnings.push(...tr.warnings);
    }

    if (sessionInfo.paging) {
      warnings.push(`El comando "${command}" activó paginación`);
    }

    if (sessionInfo.awaitingConfirm) {
      warnings.push(`El comando "${command}" requirió confirmación`);
    }

    if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
      warnings.push(`Comando host "${command}" produjo output de red (ping/tracert)`);
    }

    return {
      raw,
      status,
      ok: tr.ok,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      parsed: tr,
      paging: Boolean(sessionInfo.paging),
      awaitingConfirm: Boolean(sessionInfo.awaitingConfirm),
      autoDismissedInitialDialog: Boolean(sessionInfo.autoDismissedInitialDialog),
      sessionKind: isHost ? "host" : "ios",
      warnings,
      error: tr.error,
      diagnostics: tr.diagnostics,
    };
  }

  function parseLegacyContract(
    res: LegacyContractValue | undefined,
    options: ParseResponseOptions,
    warnings: string[],
    stepIndex: number,
  ): ParsedCommandResponse {
    const { isHost, command } = options;

    const raw = String(
      res?.output ?? res?.raw ?? (typeof res?.value === "string" ? res.value : "") ?? "",
    );
    const status = normalizeStatusFromLegacy(res);

    const parsedInfo = (res?.parsed ?? {}) as {
      promptBefore?: string;
      promptAfter?: string;
      modeBefore?: string;
      modeAfter?: string;
      warnings?: string[];
    };

    const promptBefore =
      stepIndex === 0
        ? String(parsedInfo.promptBefore ?? res?.session?.prompt ?? "")
        : "";
    const promptAfter = String(parsedInfo.promptAfter ?? res?.session?.prompt ?? "");
    const modeBefore =
      stepIndex === 0
        ? String(parsedInfo.modeBefore ?? res?.session?.mode ?? "")
        : "";
    const modeAfter = String(parsedInfo.modeAfter ?? res?.session?.mode ?? "");

    const sessionInfo = res?.session ?? {};

    if (sessionInfo.paging) {
      warnings.push(`El comando "${command}" activó paginación`);
    }

    if (sessionInfo.awaitingConfirm) {
      warnings.push(`El comando "${command}" requirió confirmación`);
    }

    if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
      warnings.push(`Comando host "${command}" produjo output de red (ping/tracert)`);
    }

    return {
      raw,
      status,
      ok: status === 0,
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      parsed: res?.parsed,
      paging: Boolean(sessionInfo.paging),
      awaitingConfirm: Boolean(sessionInfo.awaitingConfirm),
      autoDismissedInitialDialog: Boolean(sessionInfo.autoDismissedInitialDialog),
      sessionKind: isHost ? "host" : "ios",
      warnings,
    };
  }

  function parseSimpleRuntimeResult(
    res: SimpleRuntimeResultValue,
    options: ParseResponseOptions,
    warnings: string[],
  ): ParsedCommandResponse {
    const { stepIndex, isHost, command } = options;

    const nestedResult = res.result;

    const raw = String(
      nestedResult?.output ??
        nestedResult?.raw ??
        res.output ??
        res.raw ??
        (typeof res.value === "string" ? res.value : "") ??
        "",
    );

    const status = Number(
      nestedResult?.status ??
        res.status ??
        res.diagnostics?.statusCode ??
        res.diagnostics?.commandStatus ??
        (nestedResult?.ok ?? res.ok ? 0 : 1),
    );

    const sessionInfo = nestedResult?.session ?? res.session ?? {};

    const promptBefore =
      stepIndex === 0
        ? String(sessionInfo.promptBefore ?? sessionInfo.prompt ?? "")
        : "";

    const promptAfter = String(sessionInfo.promptAfter ?? sessionInfo.prompt ?? "");

    const modeBefore =
      stepIndex === 0
        ? String(sessionInfo.modeBefore ?? sessionInfo.mode ?? "")
        : "";

    const modeAfter = String(sessionInfo.modeAfter ?? sessionInfo.mode ?? "");

    if (Array.isArray(res.warnings)) {
      warnings.push(...res.warnings.map(String));
    }

    const errorText =
      typeof res.error === "string"
        ? res.error
        : String(res.error?.message ?? res.message ?? res.code ?? res.errorCode ?? "");

    if (!(nestedResult?.ok ?? res.ok) && errorText) {
      warnings.push(errorText);
    }

    if (sessionInfo.paging) {
      warnings.push(`El comando "${command}" activó paginación`);
    }

    if (sessionInfo.awaitingConfirm) {
      warnings.push(`El comando "${command}" requirió confirmación`);
    }

    if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
      warnings.push(`Comando host "${command}" produjo output de red (ping/tracert)`);
    }

    return {
      raw,
      status,
      ok: Boolean(nestedResult?.ok ?? res.ok),
      promptBefore,
      promptAfter,
      modeBefore,
      modeAfter,
      parsed: res.parsed ?? res,
      paging: Boolean(sessionInfo.paging),
      awaitingConfirm: Boolean(sessionInfo.awaitingConfirm),
      autoDismissedInitialDialog: Boolean(sessionInfo.autoDismissedInitialDialog),
      sessionKind: isHost ? "host" : "ios",
      warnings,
      error: errorText || undefined,
      diagnostics: {
        completionReason: res.diagnostics?.completionReason,
        statusCode: status,
      },
    };
  }

  function buildEventFromResponse(
    parsed: ParsedCommandResponse,
    step: { kind?: string; command?: string; expectMode?: string; expectPromptPattern?: string; optional?: boolean },
    stepIndex: number,
  ): Record<string, unknown> {
    return {
      stepIndex,
      kind: step.kind ?? "command",
      command: step.command ?? "",
      status: parsed.status,
      ok: parsed.ok,
      promptAfter: parsed.promptAfter,
      modeAfter: parsed.modeAfter,
      completionReason: parsed.diagnostics?.completionReason,
      paging: parsed.paging,
      awaitingConfirm: parsed.awaitingConfirm,
      autoDismissedInitialDialog: parsed.autoDismissedInitialDialog,
      sessionKind: parsed.sessionKind,
      expectMode: step.expectMode,
      expectPromptPattern: step.expectPromptPattern,
      optional: step.optional,
      error: parsed.error,
      diagnostics: parsed.diagnostics,
    };
  }

  function checkPromptMismatch(
    parsed: ParsedCommandResponse,
    step: { expectedPrompt?: string; expectPromptPattern?: string },
  ): string | null {
    const expected = step.expectedPrompt ?? step.expectPromptPattern;
    if (!expected) return null;
    if (!parsed.promptAfter) return null;
    if (parsed.promptAfter.includes(expected)) return null;
    return `Prompt esperado "${expected}" no alcanzado. Prompt final: "${parsed.promptAfter}"`;
  }

```

## terminal plan builder
```ts
import type {
  TerminalMode,
  TerminalPlan,
  TerminalPlanPolicies,
  TerminalPlanStep,
  TerminalPlanTimeouts,
} from "../../ports/runtime-terminal-port.js";

export interface BuildUniversalTerminalPlanOptions {
  id: string;
  device: string;
  command: string;
  deviceKind: "ios" | "host" | "unknown";
  mode?: "safe" | "interactive" | "raw" | "strict";
  allowConfirm?: boolean;
  allowDestructive?: boolean;
  timeoutMs?: number;
}

export function splitCommandLines(command: string): string[] {
  return command
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .filter((line) => !line.trimStart().startsWith("#"));
}

export function buildDefaultTerminalTimeouts(timeoutMs?: number): TerminalPlanTimeouts {
  return {
    commandTimeoutMs: timeoutMs ?? 30000,
    stallTimeoutMs: 15000,
  };
}

export function buildDefaultTerminalPolicies(args?: {
  allowConfirm?: boolean;
  mode?: "safe" | "interactive" | "raw" | "strict";
}): TerminalPlanPolicies {
  return {
    autoBreakWizard: true,
    autoAdvancePager: true,
    maxPagerAdvances: 80,
    maxConfirmations: args?.allowConfirm || args?.mode === "interactive" ? 5 : 0,
    abortOnPromptMismatch: args?.mode === "strict",
    abortOnModeMismatch: args?.mode !== "raw",
  };
}

function isConfigureTerminal(command: string): boolean {
  return /^(conf|config|configure)(\s+t|\s+terminal)?$/i.test(command.trim());
}

function normalizeIosCommand(line: string): string {
  return line.trim().replace(/\s+/g, " ").toLowerCase();
}

function isEnableCommand(line: string): boolean {
  return /^enable\b/i.test(line.trim());
}

function requiresPrivilegedIosCommand(line: string): boolean {
  const cmd = normalizeIosCommand(line);

  return (
    /^show running-config\b/.test(cmd) ||
    /^show startup-config\b/.test(cmd) ||
    /^show archive\b/.test(cmd) ||
    /^show tech-support\b/.test(cmd) ||
    /^write\b/.test(cmd) ||
    /^copy\b/.test(cmd) ||
    /^erase\b/.test(cmd) ||
    /^reload\b/.test(cmd) ||
    /^clear\b/.test(cmd) ||
    /^debug\b/.test(cmd) ||
    /^undebug\b/.test(cmd) ||
    isConfigureTerminal(cmd)
  );
}

function shouldPrependEnable(options: BuildUniversalTerminalPlanOptions, lines: string[]): boolean {
  if (options.deviceKind !== "ios") return false;
  if (options.mode === "raw") return false;
  if (lines.some(isEnableCommand)) return false;

  return lines.some(requiresPrivilegedIosCommand);
}

function inferIosTargetMode(
  lines: string[],
  options: BuildUniversalTerminalPlanOptions,
): TerminalMode | undefined {
  const normalized = lines.map(normalizeIosCommand);

  if (normalized.some((line) => isConfigureTerminal(line))) {
    return "global-config";
  }

  if (shouldPrependEnable(options, lines)) {
    return "privileged-exec";
  }

  return undefined;
}

export function buildUniversalTerminalPlan(
  options: BuildUniversalTerminalPlanOptions,
): TerminalPlan {
  const lines = splitCommandLines(options.command);

  if (lines.length === 0) {
    return {
      id: options.id,
      device: options.device,
      steps: [],
      timeouts: buildDefaultTerminalTimeouts(options.timeoutMs),
      policies: buildDefaultTerminalPolicies(options),
      metadata: {
        deviceKind: options.deviceKind,
        source: "pt-control.terminal-plan-builder",
      },
    };
  }

  if (options.deviceKind === "host") {
    const steps: TerminalPlanStep[] = lines.map((line) => ({
      kind: "command",
      command: line,
      timeout: options.timeoutMs,
      allowPager: false,
      allowConfirm: Boolean(options.allowConfirm),
      expectMode: "host-prompt",
    }));

    return {
      id: options.id,
      device: options.device,
      targetMode: "host-prompt",
      steps,
      timeouts: buildDefaultTerminalTimeouts(options.timeoutMs),
      policies: buildDefaultTerminalPolicies(options),
      metadata: {
        deviceKind: "host",
        source: "pt-control.terminal-plan-builder",
      },
    };
  }

  if (options.deviceKind === "ios" && lines.length === 1 && isEnableCommand(lines[0] ?? "")) {
    return {
      id: options.id,
      device: options.device,
      targetMode: "privileged-exec",
      steps: [
        {
          kind: "ensureMode",
          expectMode: "privileged-exec",
          timeout: options.timeoutMs,
          metadata: {
            reason: "explicit-enable-command",
          },
        },
      ],
      timeouts: buildDefaultTerminalTimeouts(options.timeoutMs),
      policies: buildDefaultTerminalPolicies(options),
      metadata: {
        deviceKind: "ios",
        source: "pt-control.terminal-plan-builder",
        lineCount: lines.length,
      },
    };
  }

  const steps: TerminalPlanStep[] = [];

  if (shouldPrependEnable(options, lines)) {
    steps.push({
      kind: "ensureMode",
      expectMode: "privileged-exec",
      timeout: options.timeoutMs,
      metadata: {
        reason: "auto-enable-for-privileged-ios-command",
      },
    });
  }

  steps.push(
    ...lines.map((line) => ({
      kind: "command" as const,
      command: line,
      timeout: options.timeoutMs,
      allowPager: /^show\s+/i.test(line),
      allowConfirm: Boolean(options.allowConfirm),
    })),
  );

  return {
    id: options.id,
    device: options.device,
    targetMode: inferIosTargetMode(lines, options),
    steps,
    timeouts: buildDefaultTerminalTimeouts(options.timeoutMs),
    policies: buildDefaultTerminalPolicies(options),
    metadata: {
      deviceKind: "ios",
      source: "pt-control.terminal-plan-builder",
      lineCount: lines.length,
    },
  };
}
```

## terminal plan builder tests
```ts
import { describe, expect, test } from "bun:test";
import {
  buildDefaultTerminalPolicies,
  buildDefaultTerminalTimeouts,
  buildUniversalTerminalPlan,
  splitCommandLines,
} from "./terminal-plan-builder.js";
import { createIosRunningConfigPlan } from "../../pt/terminal/standard-terminal-plans.js";
import type { TerminalPlanStep } from "../../ports/runtime-terminal-port.js";

describe("terminal-plan-builder", () => {
  test("splitCommandLines elimina comentarios y líneas vacías", () => {
    expect(splitCommandLines("conf t\n# nope\n\ninterface g0/0\n no shutdown\n")).toEqual([
      "conf t",
      "interface g0/0",
      " no shutdown",
    ]);
  });

  test("buildDefaultTerminalTimeouts usa timeoutMs como commandTimeoutMs", () => {
    expect(buildDefaultTerminalTimeouts(12000)).toEqual({
      commandTimeoutMs: 12000,
      stallTimeoutMs: 15000,
    });
  });

  test("buildDefaultTerminalPolicies activa confirmación solo cuando se pide", () => {
    expect(buildDefaultTerminalPolicies({ mode: "safe" })).toEqual({
      autoBreakWizard: true,
      autoAdvancePager: true,
      maxPagerAdvances: 80,
      maxConfirmations: 0,
      abortOnPromptMismatch: false,
      abortOnModeMismatch: true,
    });

    expect(buildDefaultTerminalPolicies({ mode: "interactive", allowConfirm: true })).toEqual({
      autoBreakWizard: true,
      autoAdvancePager: true,
      maxPagerAdvances: 80,
      maxConfirmations: 5,
      abortOnPromptMismatch: false,
      abortOnModeMismatch: true,
    });
  });

  test("buildUniversalTerminalPlan crea un plan host", () => {
    const plan = buildUniversalTerminalPlan({
      id: "host-plan",
      device: "PC1",
      deviceKind: "host",
      command: "ipconfig",
      mode: "safe",
    });

    expect(plan.targetMode).toBe("host-prompt");
    expect(plan.steps.map((step: TerminalPlanStep) => step.command)).toEqual(["ipconfig"]);
  });

  test("buildUniversalTerminalPlan crea un plan IOS multi-step", () => {
    const plan = buildUniversalTerminalPlan({
      id: "ios-plan",
      device: "R1",
      deviceKind: "ios",
      command: "configure terminal\ninterface g0/0\nno shutdown\nend",
      mode: "safe",
    });

    expect(plan.steps.map((step: TerminalPlanStep) => step.kind)).toEqual([
      "ensureMode",
      "command",
      "command",
      "command",
      "command",
    ]);
    expect(plan.steps[0]).toMatchObject({ kind: "ensureMode", expectMode: "privileged-exec" });
    expect(plan.steps.slice(1).map((step: TerminalPlanStep) => step.command)).toEqual([
      "configure terminal",
      "interface g0/0",
      "no shutdown",
      "end",
    ]);
    expect(plan.targetMode).toBe("global-config");
  });

  test("buildUniversalTerminalPlan inserta enable para show IOS sin desactivar pager", () => {
    const plan = buildUniversalTerminalPlan({
      id: "ios-privileged",
      device: "R1",
      deviceKind: "ios",
      command: "show running-config",
      mode: "safe",
    });

    expect(plan.targetMode).toBe("privileged-exec");
    expect(plan.steps.map((step: TerminalPlanStep) => step.kind)).toEqual([
      "ensureMode",
      "command",
    ]);
    expect(plan.steps[0]).toMatchObject({
      kind: "ensureMode",
      expectMode: "privileged-exec",
    });
    expect(plan.steps[1]).toMatchObject({
      kind: "command",
      command: "show running-config",
    });
  });

  test("buildUniversalTerminalPlan no inserta terminal length 0 para show IOS", () => {
    const plan = buildUniversalTerminalPlan({
      id: "ios-show",
      device: "R1",
      deviceKind: "ios",
      command: "show running-config",
      mode: "safe",
    });

    expect(plan.steps.map((step: TerminalPlanStep) => step.kind)).toEqual([
      "ensureMode",
      "command",
    ]);
    expect(plan.steps[0]).toMatchObject({
      kind: "ensureMode",
      expectMode: "privileged-exec",
    });
    expect(plan.steps[1]).toMatchObject({
      kind: "command",
      command: "show running-config",
      allowPager: true,
    });
  });

  test("createIosRunningConfigPlan solo contiene show running-config", () => {
    const plan = createIosRunningConfigPlan("R1", { id: "running-config", timeout: 9000 });

    expect(plan.steps.map((step: TerminalPlanStep) => step.command)).toEqual([
      "show running-config",
    ]);
    expect(plan.steps[0]).toMatchObject({
      kind: "command",
      command: "show running-config",
      timeout: 9000,
    });
  });
});
```

## pt-control standard terminal plans
```ts
import type { TerminalPlan, TerminalPlanStep } from "../../ports/runtime-terminal-port.js";

export type StandardTerminalProfile = "ios" | "host";

function buildSteps(commands: string[], timeout?: number): TerminalPlanStep[] {
  return commands.map((command) => ({
    command,
    timeout,
  }));
}

export function createIosShowPlan(
  device: string,
  command: string,
  options?: {
    id?: string;
    timeout?: number;
    expectedPrompt?: string;
  },
): TerminalPlan {
  const steps: TerminalPlanStep[] = [{
    kind: "command",
    command,
    timeout: options?.timeout ?? 15000,
    expectedPrompt: options?.expectedPrompt,
    allowPager: /^show\s+/i.test(command.trim()),
  }];

  return {
    id: options?.id ?? `ios-show-${Date.now()}`,
    device,
    steps,
  };
}

export function createIosConfigPlan(
  device: string,
  commands: string[],
  options?: {
    id?: string;
    timeout?: number;
    save?: boolean;
  },
): TerminalPlan {
  const timeout = options?.timeout ?? 15000;
  const sequence = ["configure terminal", ...commands, "end"];

  if (options?.save) {
    sequence.push("copy running-config startup-config");
  }

  return {
    id: options?.id ?? `ios-config-${Date.now()}`,
    device,
    steps: buildSteps(sequence, timeout),
  };
}

export function createIosEnablePlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return {
    id: options?.id ?? `ios-enable-${Date.now()}`,
    device,
    targetMode: "privileged-exec",
    steps: [
      {
        kind: "ensureMode",
        expectMode: "privileged-exec",
        timeout: options?.timeout ?? 10000,
      },
    ],
  };
}

export function createIosRunningConfigPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createIosShowPlan(device, "show running-config", {
    id: options?.id ?? `ios-running-config-${Date.now()}`,
    timeout: options?.timeout ?? 20000,
  });
}

export function createIosShowVersionPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createIosShowPlan(device, "show version", {
    id: options?.id ?? `ios-show-version-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostCommandPlan(
  device: string,
  command: string,
  options?: {
    id?: string;
    timeout?: number;
    expectedPrompt?: string;
  },
): TerminalPlan {
  return {
    id: options?.id ?? `host-cmd-${Date.now()}`,
    device,
    steps: [
      {
        command,
        timeout: options?.timeout ?? 20000,
        expectedPrompt: options?.expectedPrompt,
      },
    ],
  };
}

export function createHostIpconfigPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, "ipconfig /all", {
    id: options?.id ?? `host-ipconfig-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostPingPlan(
  device: string,
  target: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, `ping ${target}`, {
    id: options?.id ?? `host-ping-${Date.now()}`,
    timeout: options?.timeout ?? 20000,
  });
}

export function createTerminalPlanFromInput(input: {
  device: string;
  profile?: StandardTerminalProfile;
  command?: string;
  commands?: string[];
  save?: boolean;
  target?: string;
  timeout?: number;
  expectedPrompt?: string;
}): TerminalPlan {
  const profile = input.profile ?? "ios";

  if (profile === "host") {
    if (input.command) {
      return createHostCommandPlan(input.device, input.command, {
        timeout: input.timeout,
        expectedPrompt: input.expectedPrompt,
      });
    }

    if (input.target) {
      return createHostPingPlan(input.device, input.target, {
        timeout: input.timeout,
      });
    }

    return createHostIpconfigPlan(input.device, {
      timeout: input.timeout,
    });
  }

  if (input.commands && input.commands.length > 0) {
    return createIosConfigPlan(input.device, input.commands, {
      timeout: input.timeout,
      save: input.save,
    });
  }

  if (input.command) {
    return createIosShowPlan(input.device, input.command, {
      timeout: input.timeout,
      expectedPrompt: input.expectedPrompt,
    });
  }

  return createIosShowVersionPlan(input.device, {
    timeout: input.timeout,
  });
}

export function createIosShowIpInterfaceBriefPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createIosShowPlan(device, "show ip interface brief", {
    id: options?.id ?? `ios-show-ip-int-brief-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createIosShowVlanBriefPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createIosShowPlan(device, "show vlan brief", {
    id: options?.id ?? `ios-show-vlan-brief-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createIosShowCdpNeighborsPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createIosShowPlan(device, "show cdp neighbors", {
    id: options?.id ?? `ios-show-cdp-neighbors-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostTracertPlan(
  device: string,
  target: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, `tracert ${target}`, {
    id: options?.id ?? `host-tracert-${Date.now()}`,
    timeout: options?.timeout ?? 30000,
  });
}

export function createHostArpPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, "arp -a", {
    id: options?.id ?? `host-arp-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostNslookupPlan(
  device: string,
  target: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, `nslookup ${target}`, {
    id: options?.id ?? `host-nslookup-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostNetstatPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, "netstat", {
    id: options?.id ?? `host-netstat-${Date.now()}`,
    timeout: options?.timeout ?? 15000,
  });
}

export function createHostHistoryPlan(
  device: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  // En PCs de PT el historial se ve a menudo solo subiendo (UP arrow) 
  // pero "history" a veces funciona o se puede simular. 
  // Aquí usamos el comando 'history' si existe o simplemente un comando genérico.
  return createHostCommandPlan(device, "history", {
    id: options?.id ?? `host-history-${Date.now()}`,
    timeout: options?.timeout ?? 10000,
  });
}

export function createHostTelnetPlan(
  device: string,
  target: string,
  options?: { id?: string; timeout?: number },
): TerminalPlan {
  return createHostCommandPlan(device, `telnet ${target}`, {
```

## pt-runtime standard plans
```ts
// ============================================================================
// Standard Plans - Biblioteca de planes terminal reutilizables
// ============================================================================

import { createTerminalPlan, createCommandStep, type TerminalPlanStep } from "./terminal-plan";
import type { TerminalMode } from "./session-state";

function defaultTimeouts() {
  return {
    commandTimeoutMs: 15000,
    stallTimeoutMs: 5000,
  };
}

function defaultPolicies() {
  return {
    autoBreakWizard: true,
    autoAdvancePager: true,
    maxPagerAdvances: 50,
    maxConfirmations: 3,
    abortOnPromptMismatch: false,
    abortOnModeMismatch: true,
  };
}

export function createIosShowPlan(deviceName: string, command: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep(command, { allowPager: true }),
  ], {
    targetMode: "privileged-exec",
    timeouts: defaultTimeouts(),
    policies: {
      ...defaultPolicies(),
      autoAdvancePager: true,
    },
  });
}

export function createIosConfigPlan(
  deviceName: string,
  commands: string[],
  options?: { save?: boolean },
) {
  const steps: TerminalPlanStep[] = [];

  steps.push({ kind: "command", command: "configure terminal", expectMode: "global-config" });

  for (const cmd of commands) {
    steps.push({ kind: "command", command: cmd, expectMode: "global-config" });
  }

  if (options?.save) {
    steps.push({ kind: "command", command: "end", expectMode: "privileged-exec" });
    steps.push({ kind: "command", command: "copy running-config startup-config" });
  }

  return createTerminalPlan(deviceName, steps, {
    targetMode: "global-config",
    timeouts: { commandTimeoutMs: 20000, stallTimeoutMs: 5000 },
    policies: defaultPolicies(),
  });
}

export function createIosEnablePlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    { kind: "ensureMode", expectMode: "privileged-exec" },
  ], {
    targetMode: "privileged-exec",
    timeouts: defaultTimeouts(),
    policies: defaultPolicies(),
  });
}

export function createIosSaveConfigPlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    { kind: "ensureMode", expectMode: "privileged-exec" },
    { kind: "command", command: "copy running-config startup-config" },
  ], {
    targetMode: "privileged-exec",
    timeouts: { commandTimeoutMs: 20000, stallTimeoutMs: 8000 },
    policies: { ...defaultPolicies(), autoAdvancePager: false },
  });
}

export function createHostPingPlan(deviceName: string, target: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep(`ping ${target}`),
  ], {
    targetMode: "host-prompt",
    timeouts: { commandTimeoutMs: 30000, stallTimeoutMs: 10000 },
    policies: { ...defaultPolicies(), autoAdvancePager: false, abortOnModeMismatch: false },
  });
}

export function createHostIpconfigPlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep("ipconfig"),
  ], {
    targetMode: "host-prompt",
    timeouts: defaultTimeouts(),
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostTracertPlan(deviceName: string, target: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep(`tracert ${target}`),
  ], {
    targetMode: "host-prompt",
    timeouts: { commandTimeoutMs: 60000, stallTimeoutMs: 30000 },
    policies: { ...defaultPolicies(), autoAdvancePager: false, abortOnModeMismatch: false },
  });
}

export function createHostArpPlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep("arp -a"),
  ], {
    targetMode: "host-prompt",
    timeouts: defaultTimeouts(),
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostRoutePlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep("route print"),
  ], {
    targetMode: "host-prompt",
    timeouts: defaultTimeouts(),
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostNslookupPlan(deviceName: string, target: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep(`nslookup ${target}`),
  ], {
    targetMode: "host-prompt",
    timeouts: defaultTimeouts(),
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostNetstatPlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep("netstat"),
  ], {
    targetMode: "host-prompt",
    timeouts: defaultTimeouts(),
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostHistoryPlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep("history"),
  ], {
    targetMode: "host-prompt",
    timeouts: defaultTimeouts(),
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostTelnetPlan(deviceName: string, target: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep(`telnet ${target}`),
  ], {
    targetMode: "host-prompt",
    timeouts: { commandTimeoutMs: 20000, stallTimeoutMs: 10000 },
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function createHostSshPlan(deviceName: string, user: string, target: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep(`ssh -l ${user} ${target}`),
  ], {
    targetMode: "host-prompt",
    timeouts: { commandTimeoutMs: 20000, stallTimeoutMs: 10000 },
    policies: { ...defaultPolicies(), autoAdvancePager: true },
  });
}

export function buildIosBootstrapPlan(deviceName: string) {
  return createTerminalPlan(deviceName, [
    createCommandStep("terminal length 0", { expectMode: "privileged-exec" }),
    createCommandStep("terminal width 512", { expectMode: "privileged-exec", optional: true }),
    createCommandStep("configure terminal", { expectMode: "global-config" }),
    createCommandStep("line console 0", { expectMode: "config-line" }),
    createCommandStep("exec-timeout 0 0", { expectMode: "config-line" }),
    createCommandStep("logging synchronous", { expectMode: "config-line" }),
    createCommandStep("exit", { expectMode: "global-config" }),
    createCommandStep("no ip domain-lookup", { expectMode: "global-config", optional: true }),
    createCommandStep("end", { expectMode: "privileged-exec" }),
  ], {
    targetMode: "privileged-exec",
    timeouts: defaultTimeouts(),
    policies: defaultPolicies(),
  });
}
```

## command state machine relevant sections
```ts
31-import { verifyIosOutput, verifyHostOutput } from "../terminal-semantic-verifier";
32-import { recoverTerminalSync } from "../terminal-recovery";
33-import {
34-  getPromptSafe,
35-  getModeSafe,
36-  ensureTerminalReadySync,
37-} from "../terminal-ready";
38-import { extractCommandOutput } from "../command-output-extractor";
39-import {
40-  pushEvent,
41-  compactTerminalEvents,
42-  buildFinalOutput,
43-  resolveTerminalError,
44-  guessFailureStatus,
45-  isOnlyPrompt,
46-  computeConfidenceString,
47-  shouldFinalizeCommand,
48-} from "./index.js";
49-import { detectWizardFromOutput, sleep } from "../terminal-utils";
50-import { TerminalErrors } from "../terminal-errors";
51-import type { PTCommandLine, ExecutionOptions, CommandExecutionResult } from "../command-executor";
52-import type { TerminalSessionState } from "../session-state";
53-import type { CommandSessionKind } from "../command-output-extractor";
54-
55-export { COMMAND_END_GRACE_MS, COMMAND_END_MAX_WAIT_MS, HOST_COMMAND_END_GRACE_MS } from "./terminal-completion-controller";
56-
57-const DEFAULT_COMMAND_TIMEOUT = 15000;
58-const DEFAULT_STALL_TIMEOUT = 5000;
59-const DEFAULT_READY_TIMEOUT = 3000;
60-
61-export interface CommandStateMachineConfig {
62-  deviceName: string;
63-  command: string;
64-  terminal: PTCommandLine;
65-  options: ExecutionOptions;
66-  session: TerminalSessionState;
67-  events: TerminalEventRecord[];
68-  warnings: string[];
69-  sessionKind: TerminalSessionKind;
70-  promptBefore: string;
71-  modeBefore: string;
72-  baselineSnapshot: { raw: string; source: string };
73-  baselineOutput: string;
74-  // Dependencies - allows testing without real PT API
75-  now?: () => number;
76-  setTimeout?: typeof setTimeout;
77-  clearTimeout?: typeof clearTimeout;
78-  setInterval?: typeof setInterval;
79-  clearInterval?: typeof clearInterval;
80-  readTerminalSnapshotFn?: typeof readTerminalSnapshot;
81-  getPromptSafeFn?: typeof getPromptSafe;
82-  getModeSafeFn?: typeof getModeSafe;
83-  recoverTerminalSyncFn?: typeof recoverTerminalSync;
84-  sendPagerAdvanceFn?: (terminal: PTCommandLine, events: TerminalEventRecord[], sessionId: string, deviceName: string, source: string) => boolean;
85-}
86-
87-export interface SendPagerAdvanceFn {
88-  (terminal: PTCommandLine, events: TerminalEventRecord[], sessionId: string, deviceName: string, source: string): boolean;
89-}
90-
91:function defaultSendPagerAdvance(
92-  terminal: PTCommandLine,
93-  events: TerminalEventRecord[],
94-  sessionId: string,
95-  deviceName: string,
96-  source: string,
97-): boolean {
98-  let sent = false;
99-
100-  try {
101-    terminal.enterChar?.(32, 0);
102-    sent = true;
103-  } catch {}
104-
105-  pushEvent(
106-    events,
107-    sessionId,
108-    deviceName,
109-    sent ? "pagerAdvance" : "pagerAdvanceFailed",
110-    "SPACE",
111-    sent ? `SPACE sent to pager from ${source}` : `Failed to send SPACE to pager from ${source}`,
112-  );
113-
114-  setTimeout(() => {
115-    try {
116:      if (!terminalSnapshotTailHasActivePager(terminal)) return;
117-
118-      terminal.enterChar?.(32, 0);
119-
120-      pushEvent(
121-        events,
122-        sessionId,
123-        deviceName,
124-        "pagerAdvanceFallback",
125-        "SPACE",
126-        `Fallback SPACE char sent to active pager from ${source}`,
127-      );
128-    } catch {
129-      pushEvent(
130-        events,
131-        sessionId,
132-        deviceName,
133-        "pagerAdvanceFallbackFailed",
134-        "SPACE",
135-        `Fallback SPACE char failed from ${source}`,
136-      );
137-    }
138-  }, 150);
139-
140-  return sent;
141-}
142-
143:function terminalSnapshotTailHasActivePager(terminal: PTCommandLine): boolean {
144-  try {
145-    const snapshot = readTerminalSnapshot(terminal);
146-    const tail = String(snapshot.raw || "")
147-      .replace(/\r\n/g, "\n")
148-      .replace(/\r/g, "\n")
149-      .slice(-800);
150-
151-    if (!tail.trim()) {
152-      return false;
153-    }
154-
155-    return (
156-      /--More--\s*$/i.test(tail) ||
157-      /\s--More--\s*$/i.test(tail) ||
158-      /More:\s*$/i.test(tail) ||
159-      /Press any key to continue\s*$/i.test(tail)
160-    );
161-  } catch {
162-    return false;
163-  }
164-}
165-
166-/**
167- * CommandStateMachine - Clase que gestiona el ciclo de vida de un comando terminal.
168- *
169- * Maneja:
170- * - Envío del comando
171- * - Eventos de output, fin de comando, cambio de prompt, pager
172- * - Timeouts (stall, global, start)
173- * - Finalización del comando
174- *
175- * No realiza llamadas directas a PT API - todas las interacciones van via terminal
176- * pasado en el constructor, lo que permite testing con mocks.
177- */
178-export class CommandStateMachine {
179-  private readonly config: Required<CommandStateMachineConfig>;
180-  private readonly sendPagerAdvance: SendPagerAdvanceFn;
181-
182-  // State
183-  private settled = false;
184-  private startedSeen = false;
185-  private commandEndedSeen = false;
186-  private commandEndSeenAt: number | null = null;
187-  private endedStatus: number | null = null;
188-  private wizardDismissed = false;
189-  private hostBusy = false;
190-  private outputBuffer = "";
191-  private outputEventsCount = 0;
192-  private lastTerminalSnapshot: { raw: string; source: string };
193-  private promptFirstSeenAt: number | null = null;
194-  private finalizedOk = true;
195-  private finalizedError: string | undefined;
196-  private finalizedCode: TerminalErrorCode | undefined;
197-
198-  // Timers
199-  private commandEndGraceTimer: ReturnType<typeof setTimeout> | null = null;
200-  private stallTimer: ReturnType<typeof setTimeout> | null = null;
201-  private globalTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
202-  private startTimer: ReturnType<typeof setTimeout> | null = null;
203-  private outputPollTimer: ReturnType<typeof setInterval> | null = null;
204-
205-  // Time tracking
206-  private readonly startedAt: number;
207-  private lastOutputAt: number;
208-  private previousPrompt: string;
209-  private promptStableSince: number | null = null;
210-  private lastPagerAdvanceAt = 0;
211-
212-  // Handlers
213-  private readonly pagerHandler;
214-  private readonly confirmHandler;
215-
216-  // Callbacks bound for unregistering
217-  private readonly onOutputHandler: (src: unknown, args: unknown) => void;
218-  private readonly onStartedHandler: () => void;
219-  private readonly onEndedHandler: (src: unknown, args: unknown) => void;
220-  private readonly onPromptChangedHandler: (src: unknown, args: unknown) => void;
221-  private readonly onMoreDisplayedHandler: (src: unknown, args: unknown) => void;
222-
223-  constructor(config: CommandStateMachineConfig) {
224-    this.config = {
225-      now: function() { return Date.now(); },
226-      setTimeout: setTimeout,
227-      clearTimeout: clearTimeout,
228-      setInterval: setInterval,
229-      clearInterval: clearInterval,
230-      readTerminalSnapshotFn: readTerminalSnapshot,
231-      getPromptSafeFn: getPromptSafe,
232-      getModeSafeFn: getModeSafe,
233-      recoverTerminalSyncFn: recoverTerminalSync,
234:      sendPagerAdvanceFn: defaultSendPagerAdvance,
235-      ...config,
236-    };
237-
238-    this.sendPagerAdvance = this.config.sendPagerAdvanceFn;
239-
240-    this.startedAt = this.config.now();
241-    this.lastOutputAt = this.config.now();
242-    this.previousPrompt = this.config.promptBefore;
243-    this.lastTerminalSnapshot = this.config.baselineSnapshot;
244-
245-    this.pagerHandler = createPagerHandler({
246-      maxAdvances: this.config.options.maxPagerAdvances ?? 50,
247-    });
248-
249-    this.confirmHandler = createConfirmHandler({
250-      autoConfirm: this.config.options.autoConfirm ?? true,
251-    });
252-
253-    // Bind handlers once to avoid issues with unregistration
254-    this.onOutputHandler = this.onOutput.bind(this);
255-    this.onStartedHandler = this.onStarted.bind(this);
256-    this.onEndedHandler = this.onEnded.bind(this);
257-    this.onPromptChangedHandler = this.onPromptChanged.bind(this);
258-    this.onMoreDisplayedHandler = this.onMoreDisplayed.bind(this);
259-  }
260-
261-  private debug(message: string): void {
262-    try {
263-      dprint(
264-        "[cmd-sm] device=" +
265-          this.config.deviceName +
266-          " command=" +
267-          JSON.stringify(this.config.command) +
268-          " " +
269-          message,
270-      );
271-    } catch {}
272-  }
273-
274-  private wakeTerminalIfNeeded(): void {
275-    const terminal = this.config.terminal;
276-
277-    try {
278-      const prompt = this.config.getPromptSafeFn(terminal);
279-      let mode = "";
280-
281-      try {
282-        if (typeof (terminal as any).getMode === "function") {
283-          mode = String((terminal as any).getMode() || "");
284-        }
285-      } catch {}
286-
287-      const needsWake =
288-        !prompt ||
289-        mode.toLowerCase() === "logout" ||
290-        String(this.config.session.lastMode || "") === "logout" ||
291-        this.config.session.lastMode === "unknown";
292-
293-      if (!needsWake) return;
294-
295-      this.debug(
296-        "wake begin prompt=" +
297-          JSON.stringify(prompt) +
298-          " mode=" +
299-          JSON.stringify(mode) +
300-          " sessionMode=" +
301-          JSON.stringify(this.config.session.lastMode),
302-      );
303-
304-      try {
305-        terminal.enterChar(13, 0);
306-      } catch {
307-        try {
308:          terminal.enterCommand("");
309-        } catch {}
310-      }
311-
312-      this.lastOutputAt = this.config.now();
313-      this.config.session.lastActivityAt = this.config.now();
314-      this.debug("wake sent enter");
315-    } catch (error) {
316-      this.debug("wake failed error=" + String(error));
317-    }
318-  }
319-
320-  /**
321-   * Ejecuta el comando y retorna el resultado.
322-   */
323-  async run(): Promise<CommandExecutionResult> {
324-    const { terminal, session, sessionKind, options } = this.config;
325-    const commandTimeoutMs = options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT;
326-    const stallTimeoutMs = options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;
327-
328-    // Ensure terminal ready
329-    const readyResult = ensureTerminalReadySync(terminal, sessionKind, {
330-      maxRetries: 3,
331-      wakeUpOnFail: options.sendEnterFallback ?? true,
332-      ensurePrivileged: options.ensurePrivileged ?? false,
333-    });
334-
335-    if (!readyResult.ready) {
336-      this.config.warnings.push("Terminal not ready after retries: " + readyResult.prompt);
337-    }
338-
339-    this.debug(
340-      "run start promptBefore=" +
341-        JSON.stringify(this.config.promptBefore) +
342-        " modeBefore=" +
343-        JSON.stringify(this.config.modeBefore) +
344-        " timeoutMs=" +
345-        commandTimeoutMs +
346-        " stallMs=" +
347-        stallTimeoutMs,
348-    );
349-
350-    this.setupHandlers();
351-    this.debug("handlers setup complete");
352-
353-    // Start output polling fallback
354:    this.startOutputPolling();
355-
356-    // Set global timeout
357-    this.globalTimeoutTimer = this.config.setTimeout(() => {
358-      if (this.settled) return;
359-      this.finalizeFailure(TerminalErrors.COMMAND_END_TIMEOUT, `Global timeout reached (${commandTimeoutMs}ms)`);
360-    }, commandTimeoutMs);
361-
362-    // Set start detection timeout
363-    this.startTimer = this.config.setTimeout(() => {
364-      if (!this.startedSeen && !this.settled) {
365-        const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);
366-        if (currentPrompt) {
367-          this.startedSeen = true;
368:          this.scheduleFinalizeAfterCommandEnd();
369-        } else {
370-          this.finalizeFailure(TerminalErrors.COMMAND_START_TIMEOUT, "Command did not start");
371-        }
372-      }
373-    }, 2000);
374-
375-    // Send the command
376-    this.wakeTerminalIfNeeded();
377-
378-    sleep(250).then(() => {
379-      if (this.settled) return;
380-
381-      try {
382:        this.clearWhitespaceOnlyInput();
383:        this.debug("enterCommand begin");
384:        terminal.enterCommand(this.config.command);
385-        this.startedSeen = true;
386-        this.resetStallTimer();
387:        this.debug("enterCommand sent");
388-
389-        sleep(100).then(() => {
390-          if (!this.settled) {
391:            this.scheduleFinalizeAfterCommandEnd();
392-          }
393-        });
394-      } catch (e) {
395-        this.finalizeFailure(TerminalErrors.UNKNOWN_STATE, "Failed to send command: " + String(e));
396-      }
397-    });
398-
399-    // Return promise that resolves when settled
400-    return new Promise((resolve) => {
401-      const checkSettled = () => {
402-        if (this.settled) {
403-          resolve(this.buildResult());
404-        } else {
405-          this.config.setTimeout!(checkSettled, 50);
406-        }
407-      };
408-      checkSettled();
409-    });
410-  }
411-
412-  /**
413-   * Build the final result object.
414-   * Called after settled=true.
415-   */
416-  private buildResult(): CommandExecutionResult {
417-    const { session, sessionKind, options } = this.config;
418-    const endedAt = this.config.now();
419-    const promptAfter = this.config.getPromptSafeFn(this.config.terminal);
420-    const modeAfter = this.config.getModeSafeFn(this.config.terminal);
421-
422-    const snapshotAfter = this.config.readTerminalSnapshotFn!(this.config.terminal);
423-    const { delta: snapshotDelta } = diffSnapshotStrict(this.config.baselineOutput, snapshotAfter.raw);
424-
425-    const extractResult = extractCommandOutput({
426-      command: this.config.command,
427-      sessionKind: sessionKind === "unknown" ? "ios" : sessionKind,
428-      promptBefore: this.config.promptBefore,
429-      promptAfter,
430-      eventOutput: this.outputBuffer,
431-      snapshotDelta: snapshotDelta,
432-      snapshotAfter: snapshotAfter,
433-      commandEndedSeen: this.commandEndedSeen,
434-      outputEventsCount: this.outputEventsCount,
435-    });
436-
437-    let finalOutput = extractResult.output;
438-    let finalRaw = extractResult.raw;
439-
440-    if (sessionKind === "host" && detectHostBusy(finalOutput)) {
441-      this.hostBusy = true;
442-    }
443-
444-    const promptMatched = !options.expectedPromptPattern || promptAfter.includes(options.expectedPromptPattern);
445-    const modeMatched = !options.expectedMode || modeAfter === options.expectedMode;
446-
447-    let finalError: string | undefined = this.finalizedError;
448-    let finalCode: TerminalErrorCode | undefined = this.finalizedCode;
449-
450-    const semantic = sessionKind === "host"
451-      ? verifyHostOutput(finalOutput)
452-      : verifyIosOutput(finalOutput);
453-
454-    let cmdOk = this.finalizedOk && (this.endedStatus === null ? true : this.endedStatus === 0);
455-
456-    if (!semantic.ok) {
457-      cmdOk = false;
458-      this.endedStatus = semantic.status;
459-      finalError = semantic.message || finalError;
460-      finalCode = (semantic.code as TerminalErrorCode) || finalCode;
461-      this.config.warnings.push(...semantic.warnings);
462-    } else if (!cmdOk && this.endedStatus === null) {
463-      this.endedStatus = guessFailureStatus(finalOutput);
464-    }
465-
466-    if (sessionKind !== "ios" && sessionKind !== "unknown") {
467-      const hasPager = /--More--/i.test(finalOutput) || /--More--/i.test(this.outputBuffer);
468-      if (hasPager) {
469-        this.config.warnings.push("Output truncated (pager detected, auto-advance disabled)");
470-      }
471-    }
472-
473-    const isOnlyPromptResult = isOnlyPrompt(finalOutput, promptAfter);
474-    const emptyWithoutEnded = !finalOutput.trim() && !this.commandEndedSeen;
475-    if (!options.allowEmptyOutput && (isOnlyPromptResult || emptyWithoutEnded)) {
476-      cmdOk = false;
477-      if (!this.config.warnings.includes("No output received")) {
478-        this.config.warnings.push("No output received");
479-      }
480-    }
481-
482-    const confidence = computeConfidenceString(
483-      cmdOk,
484-      this.config.warnings,
485-      finalOutput,
486-      modeMatched,
487-      promptMatched,
488-      this.startedSeen,
489-      this.commandEndedSeen,
490-      this.outputEventsCount
491-    );
492-
493-    session.lastActivityAt = endedAt;
494-    session.lastCommandEndedAt = endedAt;
495-    session.pendingCommand = null;
496-    session.lastPrompt = promptAfter;
497-    session.lastMode = modeAfter as TerminalMode;
498-    session.outputBuffer = finalOutput;
499-    session.pagerActive = false;
500-    session.confirmPromptActive = false;
501-
502-    session.history.push({ command: this.config.command, output: finalOutput, timestamp: endedAt });
503-    if (session.history.length > 100) session.history.splice(0, 20);
504-
505-    if (!cmdOk) session.health = "desynced";
506-
507-    return {
508-      ok: cmdOk && promptMatched && modeMatched,
509-      command: this.config.command,
510-      output: finalOutput,
511-      rawOutput: finalRaw,
512-      status: this.endedStatus,
513-      startedAt: this.startedAt,
514-      endedAt,
515-      durationMs: Math.max(0, endedAt - this.startedAt),
516-      promptBefore: this.config.promptBefore,
517-      promptAfter,
518-      modeBefore: this.config.modeBefore,
519-      modeAfter,
520-      startedSeen: this.startedSeen,
521-      endedSeen: this.commandEndedSeen,
522-      outputEvents: this.outputEventsCount,
523-      confidence,
524-      warnings: [...this.config.warnings, ...extractResult.warnings],
525-      events: compactTerminalEvents(this.config.events),
526-      error: finalError,
527-      code: finalCode,
528-    };
529-  }
530-
531-  private setupHandlers(): void {
532-    const { terminal } = this.config;
533-
534-    try {
535-      terminal.registerEvent?.("commandStarted", null, this.onStartedHandler);
536-      terminal.registerEvent?.("outputWritten", null, this.onOutputHandler);
537-      terminal.registerEvent?.("commandEnded", null, this.onEndedHandler);
538-      terminal.registerEvent?.("promptChanged", null, this.onPromptChangedHandler);
539-      terminal.registerEvent?.("moreDisplayed", null, this.onMoreDisplayedHandler);
540-    } catch {}
541-  }
542-
543-  private cleanup(): void {
544-    const { terminal } = this.config;
545-
546-    try {
547-      terminal.unregisterEvent?.("commandStarted", null, this.onStartedHandler);
548-      terminal.unregisterEvent?.("outputWritten", null, this.onOutputHandler);
549-      terminal.unregisterEvent?.("commandEnded", null, this.onEndedHandler);
550-      terminal.unregisterEvent?.("promptChanged", null, this.onPromptChangedHandler);
551-      terminal.unregisterEvent?.("moreDisplayed", null, this.onMoreDisplayedHandler);
552-    } catch {}
553-  }
554-
555:  private startOutputPolling(): void {
556-    const poll = (): void => {
557-      if (this.settled) return;
558-      const currentRaw = this.config.readTerminalSnapshotFn!(this.config.terminal);
559-      const rawTail = String(currentRaw.raw || "")
560-        .replace(/\r\n/g, "\n")
561-        .replace(/\r/g, "\n")
562-        .slice(-800);
563-      const pagerVisible =
564-        /--More--\s*$/i.test(rawTail) ||
565-        /\s--More--\s*$/i.test(rawTail) ||
566-        /More:\s*$/i.test(rawTail) ||
567-        /Press RETURN to get started\s*$/i.test(rawTail) ||
568-        /Press any key to continue\s*$/i.test(rawTail);
569-
570-      if (pagerVisible) {
571-        this.config.session.pagerActive = true;
572-        this.debug("poll pager visible tail=" + JSON.stringify(rawTail.slice(-120)));
573-
574-        if (this.config.options.autoAdvancePager !== false) {
575-          try {
576-            this.config.terminal.enterChar(32, 0);
577-            this.debug("poll pager advanced with space");
578-            this.config.session.pagerActive = true;
579-            this.lastOutputAt = this.config.now();
580-            this.config.session.lastActivityAt = this.config.now();
581-          } catch (error) {
582-            this.debug("poll pager advance failed error=" + String(error));
583-          }
584-        }
585-      }
586-
587-      // Handle buffer reset/rotation
588-      if (currentRaw.raw.length < this.lastTerminalSnapshot.raw.length) {
589-        this.lastTerminalSnapshot = { raw: "", source: "reset" };
590-      }
591-
592-      try {
593-        const prompt = this.config.getPromptSafeFn(this.config.terminal);
594-        if (prompt && prompt !== this.previousPrompt) {
595-          this.previousPrompt = prompt;
596-          this.promptStableSince = this.config.now();
597-
598-          const mode = detectModeFromPrompt(normalizePrompt(prompt));
599-          this.config.session.lastPrompt = normalizePrompt(prompt);
600-          this.config.session.lastMode = mode;
601-
602-          this.debug("poll prompt=" + JSON.stringify(prompt) + " mode=" + mode);
603:          this.scheduleFinalizeAfterCommandEnd();
604-        }
605-      } catch {}
606-
607-      if (currentRaw.raw.length > this.lastTerminalSnapshot.raw.length) {
608-        const delta = currentRaw.raw.substring(this.lastTerminalSnapshot.raw.length);
609-        this.lastTerminalSnapshot = currentRaw;
610-        this.debug("poll output deltaLen=" + delta.length);
611-        this.onOutput(null, { chunk: delta, newOutput: delta });
612-      }
613-    };
614-
615-    poll();
616-    this.outputPollTimer = this.config.setInterval!(poll, 250) as unknown as ReturnType<typeof setInterval>;
617-  }
618-
619-  private clearTimers(): void {
620-    if (this.commandEndGraceTimer) this.config.clearTimeout!(this.commandEndGraceTimer);
621-    if (this.stallTimer) this.config.clearTimeout!(this.stallTimer);
622-    if (this.globalTimeoutTimer) this.config.clearTimeout!(this.globalTimeoutTimer);
623-    if (this.startTimer) this.config.clearTimeout!(this.startTimer);
624-    if (this.outputPollTimer) {
625-      if (this.config.clearInterval) {
626-        this.config.clearInterval(this.outputPollTimer);
627-      } else {
628-        this.config.clearTimeout!(this.outputPollTimer as unknown as ReturnType<typeof setTimeout>);
629-      }
630-      this.outputPollTimer = null;
631-    }
632-  }
633-
634-  private canAdvancePagerNow(): boolean {
635-    const now = this.config.now();
636-    if (now - this.lastPagerAdvanceAt < 120) {
637-      return false;
638-    }
639-    this.lastPagerAdvanceAt = now;
640-    return true;
641-  }
642-
643-  private getCommandInputSafe(): string {
644-    try {
645-      if (typeof this.config.terminal.getCommandInput === "function") {
646-        return String(this.config.terminal.getCommandInput() ?? "");
647-      }
648-    } catch {}
649-
650-    return "";
651-  }
652-
653:  private clearWhitespaceOnlyInput(): boolean {
654-    const input = this.getCommandInputSafe();
655-
656-    if (input.length === 0) return false;
657-    if (input.replace(/\s+/g, "") !== "") return false;
658-
659-    try {
660-      this.config.terminal.enterChar?.(21, 0);
661-    } catch {}
662-
663-    for (let i = 0; i < Math.min(input.length + 8, 32); i += 1) {
664-      try {
665-        this.config.terminal.enterChar?.(8, 0);
666-      } catch {}
667-    }
668-
669-    this.debug("cleared whitespace-only input before command len=" + input.length);
670-    return true;
671-  }
672-
673-  private snapshotTailHasActivePager(): boolean {
674-    try {
675:      return terminalSnapshotTailHasActivePager(this.config.terminal);
676-    } catch {
677-      return false;
678-    }
679-  }
680-
681-  private resetStallTimer(): void {
682-    if (this.stallTimer) this.config.clearTimeout!(this.stallTimer);
683-
684-    const stallTimeoutMs = this.config.options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;
685-
686-    this.stallTimer = this.config.setTimeout!(() => {
687-      if (this.settled) return;
688-
689-      const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);
690-      const currentMode = this.config.getModeSafeFn(this.config.terminal) as TerminalMode;
691-      const now = this.config.now();
692-
693-      if (currentPrompt !== this.previousPrompt) {
694-        this.previousPrompt = currentPrompt;
695-        this.promptStableSince = now;
696-      }
697-
698-      const verdict = shouldFinalizeCommand({
699-        state: {
700-          startedSeen: this.startedSeen,
701-          commandEndedSeen: this.commandEndedSeen,
702-          commandEndSeenAt: this.commandEndSeenAt,
703-          lastOutputAt: this.lastOutputAt,
704-          promptStableSince: this.promptStableSince,
705-          previousPrompt: this.previousPrompt,
706-        },
707-        currentPrompt,
708-        currentMode,
709-        expectedMode: this.config.options.expectedMode,
710-        sessionKind: this.config.sessionKind,
711-        pagerActive: this.config.session.pagerActive,
712-        confirmPromptActive: this.config.session.confirmPromptActive,
713-      });
714-
715-      if (verdict.finished) {
716-        this.finalize(true, this.endedStatus, verdict.reason);
717-        return;
718-      }
719-
720-      this.finalizeFailure(
721-        TerminalErrors.COMMAND_END_TIMEOUT,
722-        "Command stalled before completion",
723-      );
724-    }, stallTimeoutMs);
725-  }
726-
727-  private onOutput(_src: unknown, args: unknown): void {
728-    const payload = args as any;
729-    const chunk = String(payload?.newOutput ?? payload?.data ?? payload?.output ?? payload?.chunk ?? "");
730-    if (!chunk) return;
731-
732-    this.outputEventsCount++;
733-    this.outputBuffer += chunk;
734-    this.lastOutputAt = this.config.now();
735-
736-    const currentRaw = this.config.readTerminalSnapshotFn!(this.config.terminal);
737-    if (currentRaw.raw.length >= this.lastTerminalSnapshot.raw.length) {
738-      this.lastTerminalSnapshot = currentRaw;
739-    }
740-
741-    pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "outputWritten", chunk, chunk.trim());
742-
743-    if (detectDnsLookup(chunk)) {
744-      try {
745-        this.config.terminal.enterChar(3, 0);
746-        this.config.warnings.push("DNS Hangup detected (Translating...). Breaking with Ctrl+C");
747-        pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "dnsBreak", "Ctrl+C", "Ctrl+C");
748-      } catch (e) {}
749-    }
750-
751-    if (detectWizardFromOutput(chunk)) {
752-      this.config.session.wizardDetected = true;
753-      if (this.config.options.autoDismissWizard !== false && !this.wizardDismissed) {
754-        this.wizardDismissed = true;
755:        try { this.config.terminal.enterCommand("no"); this.resetStallTimer(); } catch {}
756-      }
757-    }
758-
759-    if (detectConfirmPrompt(chunk)) {
760-      this.config.session.confirmPromptActive = true;
761-      this.confirmHandler.handleOutput(chunk);
762-      if (this.config.options.autoConfirm && this.confirmHandler.shouldAutoConfirm()) {
763-        try {
764-          const lower = chunk.toLowerCase();
765-          if (lower.indexOf("[yes/no]") !== -1 || lower.indexOf("(y/n)") !== -1) {
766:            this.config.terminal.enterCommand("y");
767-          } else {
768-            this.config.terminal.enterChar(13, 0);
769-          }
770-          this.confirmHandler.confirm();
771-          this.resetStallTimer();
772-        } catch {}
773-      }
774-    }
775-
776-    if (detectAuthPrompt(chunk)) {
777-      this.config.warnings.push("Authentication required");
778-      if (this.commandEndGraceTimer) this.config.clearTimeout!(this.commandEndGraceTimer);
779-      this.commandEndGraceTimer = this.config.setTimeout!(() => {
780-        if (!this.settled) this.finalize(true, 0);
781-      }, 900);
782-      return;
783-    }
784-
785-    if (detectPager(chunk)) {
786-      this.config.session.pagerActive = true;
787-      this.pagerHandler.handleOutput(chunk);
788-
789-      if (this.pagerHandler.isLoop()) {
790-        this.finalizeFailure(
791-          TerminalErrors.COMMAND_END_TIMEOUT,
792-          `Pager advance limit reached (${this.config.options.maxPagerAdvances ?? 50})`,
793-        );
794-        return;
795-      }
796-
797-      if (this.config.sessionKind !== "ios" && this.config.sessionKind !== "unknown") {
798-        const hasPager = /--More--/i.test(chunk);
799-        if (hasPager) {
800-          this.finalize(true, this.endedStatus, "Pager detected in non-IOS session");
801-          return;
802-        }
803-      }
804-
805-      if (
806-        this.config.options.autoAdvancePager !== false &&
807-        this.pagerHandler.canContinue() &&
808-        this.canAdvancePagerNow()
809-      ) {
810-        this.pagerHandler.advance();
811-
812-        this.config.setTimeout!(() => {
813-          if (this.settled) return;
814-          const sent = this.sendPagerAdvance(
815-            this.config.terminal,
816-            this.config.events,
817-            this.config.session.sessionId,
818-            this.config.deviceName,
819-            "pagerHandler",
820-          );
821-
822-          if (!sent) {
823-            this.finalizeFailure(
824-              TerminalErrors.COMMAND_END_TIMEOUT,
825-              "Pager detected but auto-advance failed",
826-            );
827-            return;
828-          }
829-
830-          this.config.session.pagerActive = true;
831-          this.resetStallTimer();
832-        }, 50);
833-      }
834-    }
835-
836-    this.resetStallTimer();
837:    this.scheduleFinalizeAfterCommandEnd();
838-  }
839-
840-  private onStarted(): void {
841-    this.startedSeen = true;
842-    if (this.startTimer) { this.config.clearTimeout!(this.startTimer); this.startTimer = null; }
843-    this.config.session.lastActivityAt = this.config.now();
844-    this.resetStallTimer();
845-    pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "commandStarted", this.config.command, this.config.command);
846-  }
847-
848-  private onEnded(_src: unknown, args: unknown): void {
849-    const payload = args as CommandEndedPayload;
850-    this.commandEndedSeen = true;
851-    this.commandEndSeenAt = this.config.now();
852-    this.endedStatus = payload.status ?? 0;
853-    this.resetStallTimer();
854-    pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "commandEnded", String(this.endedStatus), String(this.endedStatus));
855:    this.scheduleFinalizeAfterCommandEnd();
856-  }
857-
858-  private onPromptChanged(_src: unknown, args: unknown): void {
859-    const p = String((args as any).prompt || "");
860-    this.previousPrompt = this.config.session.lastPrompt || this.previousPrompt;
861-    this.config.session.lastPrompt = normalizePrompt(p);
862-    const mode = detectModeFromPrompt(this.config.session.lastPrompt);
863-    this.config.session.lastMode = mode;
864-    if (isHostMode(mode)) this.config.session.sessionKind = "host";
865-    this.promptStableSince = this.config.now();
866-    this.resetStallTimer();
867:    this.scheduleFinalizeAfterCommandEnd();
868-  }
869-
870-  private onMoreDisplayed(_src: unknown, args: unknown): void {
871-    this.config.session.pagerActive = true;
872-    this.pagerHandler.handleOutput("--More--");
873-
874-    if (this.pagerHandler.isLoop()) {
875-      this.finalizeFailure(
876-        TerminalErrors.COMMAND_END_TIMEOUT,
877-        `Pager advance limit reached (${this.config.options.maxPagerAdvances ?? 50})`,
878-      );
879-      return;
880-    }
881-
882-    pushEvent(
883-      this.config.events,
884-      this.config.session.sessionId,
885-      this.config.deviceName,
886-      "moreDisplayed",
887-      "--More--",
888-      "--More--",
889-    );
890-
891-    if (
892-      this.config.options.autoAdvancePager !== false &&
893-      this.pagerHandler.canContinue() &&
894-      this.canAdvancePagerNow()
895-    ) {
896-      this.pagerHandler.advance();
897-
898-      this.config.setTimeout!(() => {
899-        if (this.settled) return;
900-        const sent = this.sendPagerAdvance(
901-          this.config.terminal,
902-          this.config.events,
903-          this.config.session.sessionId,
904-          this.config.deviceName,
905-          "moreDisplayed",
906-        );
907-
908-        if (!sent) {
909-          this.finalizeFailure(
910-            TerminalErrors.COMMAND_END_TIMEOUT,
911-            "Pager displayed but auto-advance failed",
912-          );
913-          return;
914-        }
915-
916-        this.config.session.pagerActive = true;
917-        this.resetStallTimer();
918-      }, 50);
919-    }
920-  }
921-
922:  private scheduleFinalizeAfterCommandEnd(): void {
923-    if (this.settled) return;
924-
925-    if (this.commandEndedSeen && this.commandEndSeenAt) {
926-      const waitedAfterEnd = this.config.now() - this.commandEndSeenAt;
927-
928-      if (waitedAfterEnd >= 1000) {
929-        this.finalize(true, this.endedStatus, "command-ended-max-wait");
930-        return;
931-      }
932-    }
933-
934-    if (this.snapshotTailHasActivePager()) {
935-      this.config.session.pagerActive = true;
936-
937-      if (this.config.options.autoAdvancePager !== false && this.canAdvancePagerNow()) {
938-        const sent = this.sendPagerAdvance(
939-          this.config.terminal,
940-          this.config.events,
941-          this.config.session.sessionId,
942-          this.config.deviceName,
943-          "finalizeGuard",
944-        );
945-
946-        this.debug("finalize blocked by active pager sent=" + String(sent));
947-        this.lastOutputAt = this.config.now();
948-        this.resetStallTimer();
949-      }
950-
951-      return;
952-    }
953-
954-    if (this.config.session.pagerActive) {
955-      this.config.session.pagerActive = false;
956-      this.debug("pager cleared by snapshot tail");
957-    }
958-
959-    const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);
960-
961-    const snapshot = this.config.readTerminalSnapshotFn!(this.config.terminal);
962-    const diff = diffSnapshotStrict(this.config.baselineOutput, snapshot.raw);
963-    const snapshotDelta = String(diff.delta || "");
964-    const hasAnyOutput = this.outputBuffer.trim().length > 0 || snapshotDelta.trim().length > 0;
965-    const promptLooksReady = /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]\s*$/.test(String(currentPrompt || "").trim());
966-    const quietLongEnough = this.config.now() - this.lastOutputAt >= 700;
967-
968-    if (
969-      this.startedSeen &&
970-      promptLooksReady &&
971-      quietLongEnough &&
972-      !this.config.session.pagerActive &&
973-      !this.config.session.confirmPromptActive
974-    ) {
975-      if (hasAnyOutput || this.config.options.allowEmptyOutput === true || isEnableOrEndCommand(this.config.command)) {
976-        this.debug(
977-          "finalize by prompt-ready fallback prompt=" +
978-            JSON.stringify(currentPrompt) +
979-            " hasAnyOutput=" +
980-            hasAnyOutput,
981-        );
982-        this.finalize(true, this.endedStatus, "prompt-ready-fallback");
983-        return;
984-      }
985-    }
986-
987-    const verdict = shouldFinalizeCommand({
988-      state: {
989-        startedSeen: this.startedSeen,
990-        commandEndedSeen: this.commandEndedSeen,
991-        commandEndSeenAt: this.commandEndSeenAt,
992-        lastOutputAt: this.lastOutputAt,
993-        promptStableSince: this.promptStableSince,
994-        previousPrompt: this.previousPrompt,
995-      },
996-      currentPrompt,
997-      currentMode: this.config.getModeSafeFn(this.config.terminal) as TerminalMode,
998-      expectedMode: this.config.options.expectedMode,
999-      sessionKind: this.config.sessionKind,
1000-      pagerActive: this.config.session.pagerActive,
1001-      confirmPromptActive: this.config.session.confirmPromptActive,
1002-    });
1003-
1004-    if (verdict.finished) {
1005-      this.finalize(true, this.endedStatus, verdict.reason);
1006-      return;
1007-    }
1008-
1009-    if (this.commandEndGraceTimer) this.config.clearTimeout!(this.commandEndGraceTimer);
1010-    this.commandEndGraceTimer = this.config.setTimeout!(() => {
1011-      this.commandEndGraceTimer = null;
1012:      this.scheduleFinalizeAfterCommandEnd();
1013-    }, this.config.sessionKind === "host" ? 800 : 250);
1014-  }
1015-
1016-  private finalize(cmdOk: boolean, status: number | null, error?: string, code?: TerminalErrorCode): void {
1017-    if (this.settled) return;
1018-
1019-    this.debug(
1020-      "finalize ok=" +
1021-        cmdOk +
1022-        " status=" +
1023-        status +
1024-        " error=" +
1025-        JSON.stringify(error || "") +
1026-        " code=" +
1027-        JSON.stringify(code || "") +
1028-        " outputLen=" +
1029-        this.outputBuffer.length +
1030-        " startedSeen=" +
1031-        this.startedSeen +
1032-        " endedSeen=" +
1033-        this.commandEndedSeen,
1034-    );
1035-
1036-    this.finalizedOk = cmdOk;
1037-    if (status !== null) this.endedStatus = status;
1038-    this.finalizedError = error;
1039-    this.finalizedCode = code;
1040-
1041-    this.settled = true;
1042-    this.clearTimers();
1043-    this.cleanup();
1044-  }
1045-
1046-  private finalizeFailure(code: TerminalErrorCode, message: string): void {
1047-    this.debug(
1048-      "finalizeFailure code=" +
1049-        String(code) +
1050-        " message=" +
1051-        JSON.stringify(message) +
1052-        " outputLen=" +
1053-        this.outputBuffer.length,
1054-    );
1055-
1056-    this.finalize(false, 1, message, code);
1057-
1058-    const recoverable =
1059-      code === TerminalErrors.COMMAND_START_TIMEOUT ||
1060-      code === TerminalErrors.COMMAND_END_TIMEOUT ||
1061-      code === TerminalErrors.PROMPT_MISMATCH ||
1062-      code === TerminalErrors.MODE_MISMATCH ||
1063-      message.includes("No output received");
1064-
1065-    if (recoverable && this.config.terminal) {
1066-      this.config.setTimeout!(() => {
1067-        try {
1068-          const recovery = this.config.recoverTerminalSyncFn!(
1069-            this.config.terminal,
1070-            this.config.sessionKind === "host" ? "host" : "ios"
1071-          );
1072-          this.config.warnings.push(
1073-            `Recovery attempted: ${recovery.actions.join(", ")}; prompt=${recovery.prompt}; mode=${recovery.mode}`,
1074-          );
1075-        } catch {}
1076-      }, 0);
1077-    }
1078-  }
1079-}
```

## runtime manifest/build include
```ts
    "core/dispatcher.ts",
  ],

  handlers: [
    // Handler implementations
    "handlers/handler-registry.ts",
    "handlers/dispatcher.ts",
    "handlers/device-crud.ts",
    "handlers/device-discovery.ts",
    "handlers/device.ts",
    "handlers/device-classifier.ts",
    "handlers/device-listing.ts",
    "handlers/device-config.ts",
    "handlers/deep-inspect.ts",
    "handlers/evaluate.ts",
    "handlers/omniscience-physical.ts",
    "handlers/omniscience-logical.ts",
    "handlers/omniscience-environment.ts",
    "handlers/omniscience-telepathy.ts",
    "handlers/omniscience-utils.ts",
    "handlers/link.ts",
    "handlers/list-links.ts",
    "handlers/add-link.ts",
    "handlers/remove-link.ts",
    "handlers/verify-link.ts",
    "handlers/inspect.ts",
    "handlers/module.ts",
    "handlers/module/index.ts",
    "handlers/module/constants.ts",
    "handlers/module/helpers.ts",
    "handlers/module/handlers.ts",
    "handlers/module/slot-finder.ts",
    "handlers/canvas.ts",
    "handlers/vlan.ts",
    "handlers/dhcp.ts",
    "handlers/host.ts",
    "handlers/result-factories.ts",
    "handlers/host-handler.ts",
    "handlers/terminal-plan-run.ts",
    "handlers/poll-deferred.ts",
    "handlers/terminal-native-exec.ts",
    "handlers/ios/index.ts",
    "handlers/ios-execution.ts",
    "handlers/ios-plan-builder.ts",
    "handlers/terminal-sanitizer.ts",
    "handlers/cable-recommender.ts",
    "handlers/ios/ios-session-utils.ts",
    "handlers/ios/host-stabilize.ts",
    "handlers/ios/ios-result-mapper.ts",
    "handlers/ios/exec-ios-handler.ts",
    "handlers/ios/config-ios-handler.ts",
    "handlers/ios/deferred-poll-handler.ts",
    "handlers/ios/ping-handler.ts",
    "handlers/ios/exec-pc-handler.ts",
    "handlers/ios/read-terminal-handler.ts",
    // IOS show command parsers (pure functions, no PT dependencies)
    "handlers/parsers/ios-parsers.ts",
    // IOS output classification (pure functions, no event handling)
    "handlers/ios-output-classifier.ts",
    // Main dispatcher
    "handlers/runtime-handlers.ts",
    // Registration handlers
    "handlers/registration/stable-handlers.ts",
    "handlers/registration/experimental-handlers.ts",
    "handlers/registration/omni-handlers.ts",
    "handlers/registration/runtime-registration.ts",
```

## grep active risky patterns
```
packages/pt-runtime/src/value-objects/cable-type.ts:99:    if (!validNames.includes(name)) {
packages/pt-runtime/src/value-objects/cable-type.ts:210:    if (Object.keys(CABLE_TYPE_IDS).includes(normalizedName)) {
packages/pt-runtime/src/value-objects/interface-name.ts:187:           !['Loopback', 'Vlan', 'Port-channel', 'Tunnel', 'NVI', 'Null'].includes(this.type);
packages/pt-runtime/src/value-objects/interface-name.ts:208:    return ['Loopback', 'Vlan', 'Serial', 'Tunnel', 'NVI'].includes(this.type) ||
packages/pt-runtime/src/value-objects/interface-name.ts:217:           !['Serial', 'Tunnel', 'NVI'].includes(this.type);
packages/pt-runtime/src/value-objects/interface-name.ts:247:    return ['Ethernet', 'FastEthernet', 'GigabitEthernet', 'TenGigabit'].includes(this.type);
packages/pt-runtime/src/value-objects/interface-name.ts:254:    return ['Serial', 'Async', 'Tunnel'].includes(this.type) || this.isSubinterface;
packages/pt-runtime/src/value-objects/session-mode.ts:51:    if (!validModes.includes(value)) {
packages/pt-runtime/src/value-objects/session-mode.ts:97:    return this.value.startsWith("config");
packages/pt-runtime/src/value-objects/session-mode.ts:253:    if (trimmed.endsWith("(config-if)#")) return new SessionMode("config-if");
packages/pt-runtime/src/value-objects/session-mode.ts:254:    if (trimmed.endsWith("(config-line)#")) return new SessionMode("config-line");
packages/pt-runtime/src/value-objects/session-mode.ts:255:    if (trimmed.endsWith("(config-router)#")) return new SessionMode("config-router");
packages/pt-runtime/src/value-objects/session-mode.ts:256:    if (trimmed.endsWith("(config-vlan)#")) return new SessionMode("config-vlan");
packages/pt-runtime/src/value-objects/session-mode.ts:257:    if (trimmed.endsWith("(config-subif)#")) return new SessionMode("config-subif");
packages/pt-runtime/src/value-objects/session-mode.ts:258:    if (trimmed.endsWith("(config)#")) return new SessionMode("config");
packages/pt-runtime/src/value-objects/session-mode.ts:261:    if (trimmed.endsWith("#")) return new SessionMode("privileged-exec");
packages/pt-runtime/src/value-objects/session-mode.ts:262:    if (trimmed.endsWith(">")) return new SessionMode("user-exec");
packages/pt-runtime/src/compat/__tests__/pt-safe-validator.test.ts:218:      expect(resultado.warnings.some(w => w.includes('dprint'))).toBe(true);
packages/pt-runtime/src/compat/__tests__/pt-safe-validator.test.ts:228:      expect(resultado.warnings.some(w => w.includes('Concatenacion'))).toBe(true);
packages/pt-runtime/src/terminal/command-output-extractor.ts:128:      if (line.toLowerCase().includes(cmdLine.toLowerCase())) {
packages/pt-runtime/src/terminal/command-output-extractor.ts:132:      if (line.includes(cmdLine) || line.trim() === cmdLine) {
packages/pt-runtime/src/terminal/command-output-extractor.ts:230:    .map((line) => line.trimEnd());
packages/pt-runtime/src/terminal/command-output-extractor.ts:310:    if (eventLines.length > 0 && eventLines[0]!.toLowerCase().includes("reply from")) {
packages/pt-runtime/src/terminal/terminal-errors.ts:68:  return Object.values(TerminalErrors).includes(code as TerminalErrorCode);
packages/pt-runtime/src/terminal/prompt-detector.ts:45:  if (typeof pattern === "string") return normalized.includes(pattern);
packages/pt-runtime/src/terminal/prompt-detector.ts:236:    text.includes("self decompressing the image") ||
packages/pt-runtime/src/terminal/prompt-detector.ts:237:    text.includes("bootstrap") ||
packages/pt-runtime/src/terminal/prompt-detector.ts:238:    text.includes("rommon") ||
packages/pt-runtime/src/terminal/prompt-detector.ts:239:    text.includes("boot loader")
packages/pt-runtime/src/terminal/prompt-detector.ts:255:    text.includes("reply from") ||
packages/pt-runtime/src/terminal/prompt-detector.ts:256:    text.includes("request timed out") ||
packages/pt-runtime/src/terminal/prompt-detector.ts:257:    text.includes("destination host unreachable") ||
packages/pt-runtime/src/terminal/prompt-detector.ts:258:    text.includes("tracing route") ||
packages/pt-runtime/src/terminal/prompt-detector.ts:259:    text.includes("trace complete") ||
packages/pt-runtime/src/terminal/prompt-detector.ts:260:    text.includes("ping statistics") ||
packages/pt-runtime/src/terminal/prompt-detector.ts:261:    text.includes("connected to") ||
packages/pt-runtime/src/terminal/prompt-detector.ts:262:    text.includes("trying") ||
packages/pt-runtime/src/terminal/prompt-detector.ts:263:    text.includes("escape character is") ||
packages/pt-runtime/src/terminal/prompt-detector.ts:264:    text.includes("connection closed")
packages/pt-runtime/src/terminal/prompt-detector.ts:290:    text.includes("reload") &&
packages/pt-runtime/src/terminal/prompt-detector.ts:291:    text.includes("confirm")
packages/pt-runtime/src/terminal/prompt-detector.ts:298:    text.includes("erase") &&
packages/pt-runtime/src/terminal/prompt-detector.ts:299:    text.includes("confirm")
packages/pt-runtime/src/terminal/prompt-detector.ts:436:  if (afterClean.startsWith(beforeClean)) {
packages/pt-runtime/src/terminal/terminal-utils.ts:13:    output.includes("initial configuration dialog?") ||
packages/pt-runtime/src/terminal/terminal-utils.ts:14:    output.includes("[yes/no]") ||
packages/pt-runtime/src/terminal/terminal-utils.ts:15:    output.includes("continuar con la configuración")
packages/pt-runtime/src/terminal/ios-evidence.ts:68:  const wizardInterventions = events.filter((e) => e.normalized?.includes("wizard")).length;
packages/pt-runtime/src/terminal/ios-evidence.ts:69:  const confirmations = events.filter((e) => e.normalized?.includes("yes/no")).length;
packages/pt-runtime/src/terminal/ios-evidence.ts:72:  if (output.includes("--More--") && pagerAdvances === 0) {
packages/pt-runtime/src/terminal/ios-evidence.ts:77:    const changedMode = modeKeywords.some((kw) => command.toLowerCase().includes(kw));
packages/pt-runtime/src/terminal/standard-plans.ts:187:    createCommandStep("terminal length 0", { expectMode: "privileged-exec" }),
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:444:    const promptMatched = !options.expectedPromptPattern || promptAfter.includes(options.expectedPromptPattern);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:477:      if (!this.config.warnings.includes("No output received")) {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:1063:      message.includes("No output received");
packages/pt-runtime/src/terminal/engine/terminal-recovery-controller.ts:66:  if (recoverableCodes.includes(code as any)) return true;
packages/pt-runtime/src/terminal/engine/terminal-recovery-controller.ts:67:  if (message?.includes("No output received")) return true;
packages/pt-runtime/src/terminal/engine/terminal-error-resolver.ts:79:    if (!warnings.includes("No output received")) {
packages/pt-runtime/src/terminal/engine/terminal-error-resolver.ts:100:    text.includes("% Invalid") ||
packages/pt-runtime/src/terminal/engine/terminal-error-resolver.ts:101:    text.includes("% Incomplete") ||
packages/pt-runtime/src/terminal/engine/terminal-error-resolver.ts:102:    text.includes("% Ambiguous") ||
packages/pt-runtime/src/terminal/engine/terminal-error-resolver.ts:103:    text.includes("% Unknown") ||
packages/pt-runtime/src/terminal/engine/terminal-error-resolver.ts:104:    text.includes("%Error") ||
packages/pt-runtime/src/terminal/engine/terminal-error-resolver.ts:105:    text.toLowerCase().includes("invalid command")
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts:28:  if (recent.includes("% Invalid input detected")) {
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts:33:  if (recent.includes("% Incomplete command")) {
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts:38:  if (recent.includes("% Ambiguous command")) {
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts:43:  if (recent.includes("% Unknown command")) {
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts:48:  if (recent.includes("Translating...")) {
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts:55:  if (recent.includes("% Bad secrets")) {
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts:60:  if (recent.includes("% Not in config mode")) {
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts:76:  if (lower.includes("invalid command") || lower.includes("bad command or file name")) {
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts:81:  if (lower.includes("request timed out")) {
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts:86:  if (lower.includes("destination host unreachable")) {
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts:91:  if (lower.includes("could not find host") || lower.includes("unknown host")) {
packages/pt-runtime/src/terminal/terminal-semantic-verifier.ts:96:  if (lower.includes("ping request could not find host")) {
packages/pt-runtime/src/utils/parser-generator.ts:114:    if (cmd.startsWith(key.toLowerCase())) return IOS_PARSERS[key];
packages/pt-runtime/src/utils/device-creation.ts:52:      if (!candidates.includes(t)) candidates.push(t);
packages/pt-runtime/src/utils/device-creation.ts:60:      if (!candidates.includes(t)) candidates.push(t);
packages/pt-runtime/src/harness/pt-script-result/parser.ts:148:    if (file.startsWith("class_")) {
packages/pt-runtime/src/harness/pt-script-result/parser.ts:166:    } else if (file.startsWith("global_")) {
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:20:  const isPaged = trimmed.includes("--More--");
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:25:  if (trimmed.includes("(config-router)#")) {
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:28:  } else if (trimmed.includes("(config-line)#")) {
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:31:  } else if (trimmed.includes("(config-if)#")) {
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:34:  } else if (trimmed.includes("(config-subif)#")) {
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:37:  } else if (trimmed.includes("(config)#")) {
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:40:  } else if (trimmed.includes("#")) {
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:43:  } else if (trimmed.includes(">")) {
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:63:  return mode === "privileged-exec" || mode.startsWith("config");
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:70:  return output.includes("[confirm]") || 
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:71:         output.includes("Proceed?") ||
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:72:         output.includes("confirmar");
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:187:        paging: execResult.warnings.some(w => w.toLowerCase().includes("paginación")),
packages/pt-runtime/src/pt/terminal/terminal-engine.ts:188:        awaitingConfirm: execResult.warnings.some(w => w.toLowerCase().includes("confirmación")),
packages/pt-runtime/src/pt/kernel/execution-engine.ts:406:    return String(mode ?? "").startsWith("config");
packages/pt-runtime/src/pt/kernel/execution-engine.ts:520:      return mode === "privileged-exec" || String(prompt || "").trim().endsWith("#");
packages/pt-runtime/src/pt/kernel/execution-engine.ts:524:      return mode === "user-exec" || String(prompt || "").trim().endsWith(">");
packages/pt-runtime/src/pt/kernel/execution-engine.ts:528:      return mode === "global-config" || String(prompt || "").includes("(config");
packages/pt-runtime/src/pt/kernel/execution-engine.ts:851:      if (line === cmd || line.endsWith(">" + cmd) || line.endsWith("#" + cmd)) {
packages/pt-runtime/src/__tests__/runtime-validator.test.ts:9:      expect(result.errors.some((e) => e.includes("main()"))).toBe(true);
packages/pt-runtime/src/__tests__/runtime-validator.test.ts:15:      expect(result.errors.some((e) => e.includes("cleanUp()"))).toBe(true);
packages/pt-runtime/src/__tests__/runtime-validator.test.ts:86:      expect(result.errors.some((e) => e.includes("runtimeDispatcher"))).toBe(true);
packages/pt-runtime/src/__tests__/kernel-debug-logging.test.ts:28:      expect(calls.some((msg) => msg.includes("[fm]"))).toBe(false);
packages/pt-runtime/src/__tests__/kernel-debug-logging.test.ts:29:      expect(calls.some((msg) => msg.includes("[heartbeat]"))).toBe(false);
packages/pt-runtime/src/__tests__/runtime/runtime-entry.test.ts:77:    const pollLogs = entries.filter((e) => e.msg && e.msg.includes("pollDeferred"));
packages/pt-runtime/src/__tests__/runtime/runtime-entry.test.ts:86:    const pendingLogs = entries.filter((e) => e.msg && e.msg.includes("hasPendingDeferred"));
packages/pt-runtime/src/__tests__/utils/parser-generator.test.ts:58:    expect(code).toContain("cmd.startsWith(key.toLowerCase())");
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:153:        p.endsWith("_queue.json") || (p.includes("commands") && !p.includes("in-flight")),
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:156:      if (p.endsWith("_queue.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:186:        p.endsWith("_queue.json") || (p.includes("commands") && !p.includes("in-flight")),
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:189:      if (p.endsWith("_queue.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:213:    mockFm.fileExists.mockImplementation((p: string) => p.endsWith("_queue.json"));
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:215:      if (p.endsWith("_queue.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:236:      if (p.endsWith("_queue.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:237:      if (p.includes("in-flight")) return false;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:238:      if (p.includes("commands") && p.endsWith("000000000005-listDevices.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:242:      if (p.endsWith("_queue.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:245:      if (p.includes("000000000005-listDevices.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:271:      if (p.endsWith("_queue.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:272:      if (p.includes("in-flight") && p.endsWith("000000000006-listDevices.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:273:      if (p.includes("commands") && p.endsWith("000000000006-listDevices.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:277:      if (p.endsWith("_queue.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:280:      if (p.includes("000000000006-listDevices.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:305:      if (p.endsWith("_queue.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:306:      if (p.includes("in-flight") && p.endsWith("000000000007-listDevices.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:307:      if (p.includes("commands") && p.endsWith("000000000007-listDevices.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:311:      if (p.endsWith("_queue.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:314:      if (p.includes("in-flight")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:317:      if (p.includes("commands") && p.endsWith("000000000007-listDevices.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:344:    mockFm.fileExists.mockImplementation((p: string) => p.endsWith(".json"));
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:346:      if (p.includes("__pollDeferred")) {
packages/pt-runtime/src/__tests__/build/main-generated-symbols.test.ts:13:    const references = source.includes("buildCommandResultEnvelope");
packages/pt-runtime/src/__tests__/build/main-generated-symbols.test.ts:15:      source.includes("function buildCommandResultEnvelope") ||
packages/pt-runtime/src/__tests__/build/main-generated-symbols.test.ts:16:      source.includes("var buildCommandResultEnvelope") ||
packages/pt-runtime/src/__tests__/build/main-generated-symbols.test.ts:17:      source.includes("const buildCommandResultEnvelope");
packages/pt-runtime/src/__tests__/handlers/runtime-handler-groups.test.ts:11:  "terminal.native.exec",
packages/pt-runtime/src/__tests__/handlers/ios-execution.test.ts:31:      const output = command.startsWith("ping ") ? pingOutput : commandOutput;
packages/pt-runtime/src/__tests__/handlers/ios-execution.test.ts:49:          currentOutput = command.startsWith("ping ")
packages/pt-runtime/src/__tests__/handlers/terminal-native-exec.test.ts:3:import { handleTerminalNativeExec } from "../../handlers/terminal-native-exec.js";
packages/pt-runtime/src/__tests__/handlers/terminal-native-exec.test.ts:5:describe("terminal.native.exec", () => {
packages/pt-runtime/src/__tests__/handlers/terminal-native-exec.test.ts:28:    const result = await handleTerminalNativeExec(
packages/pt-runtime/src/runtime-validator.ts:57:  if (!target.includes(value)) {
packages/pt-runtime/src/build/main-manifest.ts:130:  if (!specifier.startsWith(".")) return null;
packages/pt-runtime/src/build/main-manifest.ts:147:    if (!fallback && (candidate.endsWith(".ts") || candidate.endsWith(".tsx"))) {
packages/pt-runtime/src/build/ast-transform.ts:300:  if (importPath.startsWith(".")) {
packages/pt-runtime/src/build/ast-transform.ts:322:      if (filePaths.includes(candidate)) {
packages/pt-runtime/src/build/ast-transform.ts:405:    const trimmed = line.trimStart();
packages/pt-runtime/src/build/ast-transform.ts:410:      if (line.includes("*/")) inJSDocComment = false;
packages/pt-runtime/src/build/ast-transform.ts:413:    if (trimmed.startsWith("/**")) {
packages/pt-runtime/src/build/ast-transform.ts:445:      const isClosingUnionLine = trimmed.startsWith("|") && trimmed.endsWith(";");
packages/pt-runtime/src/build/ast-transform.ts:446:      const isTypeAliasTerminated = inExportTypeAssign.braceDepth <= 0 && (trimmed.endsWith(";") || closeBraces > 0);
packages/pt-runtime/src/build/ast-transform.ts:466:      if (!trimmed.endsWith(";")) {
packages/pt-runtime/src/build/ast-transform.ts:492:    if ((/^export\s+\{/.test(trimmed) || /^export\s+type\s+\{/.test(trimmed)) && !trimmed.includes("}")) {
packages/pt-runtime/src/build/ast-transform.ts:507:  if (line.includes("/*") && line.includes("*/")) {
packages/pt-runtime/src/build/ast-transform.ts:521:    if (line.includes("/**")) {
packages/pt-runtime/src/build/ast-transform.ts:528:      if (line.includes("*/")) {
packages/pt-runtime/src/build/ast-transform.ts:546:      if (!content.includes("${")) {
packages/pt-runtime/src/build/ast-transform.ts:603:      const before = result.trimEnd();
packages/pt-runtime/src/build/ast-transform.ts:668:              ["log", "error", "warn", "info", "debug"].includes(property)
packages/pt-runtime/src/build/validate-pt-safe.ts:251:    const trimmed = line.trimStart();
packages/pt-runtime/src/build/validate-pt-safe.ts:252:    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
packages/pt-runtime/src/build/pt-safe-build-gate.ts:49:  const lineComments = beforeMatch.includes("//");
packages/pt-runtime/src/build/pt-safe-build-gate.ts:69:  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
packages/pt-runtime/src/build/pt-safe-cli.ts:19:      while (i < flags.length && !flags[i].startsWith("--")) {
packages/pt-runtime/src/build/pt-safe-cli.ts:45:      if (entry.name !== "node_modules" && entry.name !== "__tests__" && !entry.name.startsWith(".")) {
packages/pt-runtime/src/build/pt-safe-cli.ts:48:    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".ts")) {
packages/pt-runtime/src/build/render-main-v2.ts:164:  if (!specifier.startsWith(".")) return null;
packages/pt-runtime/src/build/render-main-v2.ts:181:    if (!fallback && (candidate.endsWith(".ts") || candidate.endsWith(".tsx"))) {
packages/pt-runtime/src/build/runtime-manifest.ts:110:    "handlers/terminal-native-exec.ts",
packages/pt-runtime/src/build/runtime-manifest.ts:257:  if (!specifier.startsWith(".")) return null;
packages/pt-runtime/src/build/runtime-manifest.ts:274:    if (!fallback && (candidate.endsWith(".ts") || candidate.endsWith(".tsx"))) {
packages/pt-runtime/src/build/render-runtime-v2.ts:284:  if (!specifier.startsWith(".")) return null;
packages/pt-runtime/src/build/render-runtime-v2.ts:301:    if (!fallback && (candidate.endsWith(".ts") || candidate.endsWith(".tsx"))) {
packages/pt-runtime/src/build/__tests__/runtime-module-manifest.test.ts:71:      expect(coreFiles.some(f => f.includes("helpers"))).toBe(true);
packages/pt-runtime/src/build/__tests__/runtime-module-manifest.test.ts:76:      expect(iosFiles.some(f => f.includes("ios-output-classifier"))).toBe(true);
packages/pt-runtime/src/build/__tests__/runtime-module-manifest.test.ts:128:      expect(files.some(f => f.includes("ios-output-classifier"))).toBe(true);
packages/pt-runtime/src/build/__tests__/validate-pt-safe.test.ts:19:    expect(result.errors.some((error) => error.message.includes("Set"))).toBe(true);
packages/pt-runtime/src/build/__tests__/validate-pt-safe.test.ts:20:    expect(result.errors.some((error) => error.message.includes("Map"))).toBe(true);
packages/pt-runtime/src/build/__tests__/validate-pt-safe.test.ts:21:    expect(result.errors.some((error) => error.message.includes("WeakMap"))).toBe(true);
packages/pt-runtime/src/build/__tests__/main-generator.test.ts:59:      if (relPath.endsWith("main.ts")) {
packages/pt-runtime/src/build/__tests__/main-generator.test.ts:61:      } else if (relPath.includes("terminal")) {
packages/pt-runtime/src/build/__tests__/main-generator.test.ts:113:      (e) => e.includes("PT-safe validation error"),
packages/pt-runtime/src/build/__tests__/compile-to-module.test.ts:67:      expect(missing.some(m => m.includes("foo"))).toBe(true);
packages/pt-runtime/src/build/__tests__/catalog-generator.test.ts:79:      (e) => e.includes("executive logic") || e.includes("runtimeDispatcher"),
packages/pt-runtime/src/build/__tests__/catalog-generator.test.ts:92:    const hasIIFE = result.code.includes("(function()");
packages/pt-runtime/src/build/__tests__/catalog-generator.test.ts:95:    const usesVar = result.code.includes("var ");
packages/pt-runtime/src/build/validate-pt-api.ts:38:    if (lines[i].trimStart().startsWith("//")) continue;
packages/pt-runtime/src/build/validate-pt-api.ts:69:      const existsSomewhere = Array.from(registered).some((entry) => entry.endsWith(`.${call.method}`));
packages/pt-runtime/src/build/ast/compile-to-module.ts:51:      if (importPath.startsWith(".")) {
packages/pt-runtime/src/build/ast/compile-to-module.ts:64:  if (!importPath.startsWith(".")) return null;
packages/pt-runtime/src/build/ast/compile-to-module.ts:77:    if (candidate.endsWith(".ts") || candidate.endsWith(".tsx")) {
packages/pt-runtime/src/build/checksum.ts:16:        !line.includes("PT-SCRIPT v2 active (build:") &&
packages/pt-runtime/src/build/checksum.ts:17:        !line.includes("Generated at:") &&
packages/pt-runtime/src/build/checksum.ts:18:        !line.includes("Build ID:"),
packages/pt-runtime/src/build/render-runtime-modular.ts:272:if (typeof Bun !== "undefined" && Bun.argv.includes("modular-generate")) {
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:57:import { handleTerminalNativeExec } from "../terminal-native-exec.js";
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:89:  registerHandler("terminal.native.exec", handleTerminalNativeExec as unknown as HandlerFn);
packages/pt-runtime/src/handlers/parsers/ios-parsers.ts:19:      if (line.includes("---")) continue;
packages/pt-runtime/src/handlers/parsers/ios-parsers.ts:39:      if (line.includes("---")) continue;
packages/pt-runtime/src/handlers/parsers/ios-parsers.ts:114:      if (currentInterface && line.includes("Description:")) {
packages/pt-runtime/src/handlers/parsers/ios-parsers.ts:173:      if (line.includes("VLAN Name") && line.includes("Status")) {
packages/pt-runtime/src/handlers/parsers/ios-parsers.ts:177:      if (line.includes("----") && inVlanSection) continue;
packages/pt-runtime/src/handlers/parsers/ios-parsers.ts:280:    if (cmd.startsWith(key)) return IOS_PARSERS[key]!;
packages/pt-runtime/src/handlers/terminal-native-exec.ts:94:    text.startsWith(cmd + "\n") ||
packages/pt-runtime/src/handlers/terminal-native-exec.ts:95:    text.startsWith(cmd) ||
packages/pt-runtime/src/handlers/terminal-native-exec.ts:96:    text.includes(">" + cmd) ||
packages/pt-runtime/src/handlers/terminal-native-exec.ts:97:    text.includes("#" + cmd) ||
packages/pt-runtime/src/handlers/terminal-native-exec.ts:98:    text.includes("\n" + cmd + "\n")
packages/pt-runtime/src/handlers/terminal-native-exec.ts:112:    if (lower === cmd || lower.includes(">" + cmd) || lower.includes("#" + cmd)) {
packages/pt-runtime/src/handlers/terminal-native-exec.ts:132:  return lines.join("\n").trimEnd();
packages/pt-runtime/src/handlers/terminal-native-exec.ts:135:export async function handleTerminalNativeExec(
packages/pt-runtime/src/handlers/terminal-native-exec.ts:147:    return createErrorResult("terminal.native.exec requiere device y command", "INVALID_NATIVE_EXEC_PAYLOAD");
packages/pt-runtime/src/handlers/terminal-native-exec.ts:162:  if (beforePrompt.trim().endsWith(">")) {
packages/pt-runtime/src/handlers/terminal-native-exec.ts:173:    return createErrorResult("terminal.native.exec no pudo enviar el comando: " + String(error), "NATIVE_EXEC_SEND_FAILED");
packages/pt-runtime/src/handlers/terminal-native-exec.ts:230:      `terminal.native.exec no completó ${command} en ${timeoutMs}ms`,
packages/pt-runtime/src/handlers/terminal-native-exec.ts:231:      completionReason === "pager-limit" ? "NATIVE_EXEC_PAGER_LIMIT" : "NATIVE_EXEC_TIMEOUT",
packages/pt-runtime/src/handlers/deep-inspect.ts:124:        if (trimmed.startsWith("'") || trimmed.startsWith("\"")) return trimmed.slice(1, -1);
packages/pt-runtime/src/handlers/module/helpers.ts:16:  return id.startsWith("HWIC-") || id.startsWith("WIC-");
packages/pt-runtime/src/handlers/module/helpers.ts:21:  return id.startsWith("NM-");
packages/pt-runtime/src/handlers/module/handlers.ts:45:  const is2811 = model.includes("2811");
packages/pt-runtime/src/handlers/ios-engine.ts:301:    if (output.includes("--More--")) return "dismiss-continue-dialog";
packages/pt-runtime/src/handlers/ios/exec-ios-handler.ts:44:  const isHost = deviceModel.toLowerCase().includes("pc") || deviceModel.toLowerCase().includes("server");
packages/pt-runtime/src/handlers/ios/host-stabilize.ts:31:  return text.includes(withoutFirstChar) && !text.includes(expected);
packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts:36:  const isLongRunningCommand = cmd.startsWith("ping") || cmd.startsWith("tracert") || cmd.startsWith("trace");
packages/pt-runtime/src/handlers/ios/exec-pc-handler.ts:77:  const autoDismissedInitialDialog = result.warnings?.includes("Initial configuration dialog was auto-dismissed") ?? false;
packages/pt-runtime/src/handlers/ios-session.ts:31:  if (trimmed.endsWith("(config)#")) return "config";
packages/pt-runtime/src/handlers/ios-session.ts:32:  if (trimmed.endsWith("(config-if)#")) return "config-if";
packages/pt-runtime/src/handlers/ios-session.ts:33:  if (trimmed.endsWith("(config-line)#")) return "config-line";
packages/pt-runtime/src/handlers/ios-session.ts:34:  if (trimmed.endsWith("(config-router)#")) return "config-router";
packages/pt-runtime/src/handlers/ios-session.ts:35:  if (trimmed.endsWith("(config-subif)#")) return "config-subif";
packages/pt-runtime/src/handlers/ios-session.ts:36:  if (trimmed.endsWith("(config-vlan)#")) return "config-vlan";
packages/pt-runtime/src/handlers/ios-session.ts:37:  if (trimmed.endsWith("#")) return "privileged-exec";
packages/pt-runtime/src/handlers/ios-session.ts:38:  if (trimmed.endsWith(">")) return "user-exec";
packages/pt-runtime/src/handlers/ios-session.ts:51:  session.paging = output.includes("--More--");
packages/pt-runtime/src/handlers/ios-session.ts:52:  session.awaitingConfirm = /\n\[confirm\]/i.test(output) || output.startsWith("[confirm]");
packages/pt-runtime/src/handlers/ios-session.ts:59:    if (line && !line.includes("--More--") && !line.startsWith("%")) {
packages/pt-runtime/src/handlers/ios-session.ts:77:  return mode.startsWith("config");
packages/pt-runtime/src/handlers/ios-output-classifier.ts:19:  if (trimmed.includes("% Invalid command") || trimmed.includes("% Invalid input")) {
packages/pt-runtime/src/handlers/ios-output-classifier.ts:22:  if (trimmed.includes("% Incomplete command")) {
packages/pt-runtime/src/handlers/ios-output-classifier.ts:25:  if (trimmed.includes("% Ambiguous command")) {
packages/pt-runtime/src/handlers/ios-output-classifier.ts:28:  if (trimmed.includes("% ") && trimmed.includes("ERROR")) {
packages/pt-runtime/src/handlers/ios-output-classifier.ts:33:  if (trimmed.includes("--More--") || trimmed.endsWith("--More--")) {
packages/pt-runtime/src/handlers/ios-output-classifier.ts:52:  return classification.includes("error") ||
packages/pt-runtime/src/handlers/ios-output-classifier.ts:53:    classification.includes("invalid") ||
packages/pt-runtime/src/handlers/ios-output-classifier.ts:54:    classification.includes("incomplete") ||
packages/pt-runtime/src/handlers/ios-output-classifier.ts:55:    classification.includes("ambiguous");
packages/pt-runtime/src/handlers/list-links.ts:13:  if (["green", "up", "operational", "on"].includes(raw)) return "green";
packages/pt-runtime/src/handlers/list-links.ts:14:  if (["amber", "orange", "yellow"].includes(raw)) return "amber";
packages/pt-runtime/src/handlers/list-links.ts:15:  if (["down", "red", "off", "missing", "disconnected"].includes(raw)) return "down";
packages/pt-runtime/src/kernel/__tests__/runtime-loader.test.ts:69:        validator: (code: string) => code.includes('VALID_MARKER'),
packages/pt-control/src/checks/functional-check-engine.ts:166:        if (port.ipAddress && port.ipAddress.endsWith(".1")) {
packages/pt-control/src/workflows/dhcp-workflow.ts:118:  if (output.includes('Pool') && output.includes('DHCP')) {
packages/pt-control/src/workflows/dhcp-workflow.ts:144:  const runConfigResult = results.find((r) => r.step.includes('DHCP en'));
packages/pt-control/src/workflows/dhcp-workflow.ts:146:    dhcpEnabled = runConfigResult.output.includes('ip dhcp');
packages/pt-control/src/workflows/dhcp-workflow.ts:149:  const poolResult = results.find((r) => r.step.includes('pool DHCP'));
packages/pt-control/src/workflows/dhcp-workflow.ts:165:  const bindingResult = results.find((r) => r.step.includes('bindings DHCP'));
packages/pt-control/src/workflows/dhcp-workflow.ts:166:  if (!bindingResult?.output || bindingResult.output.includes('No bindings')) {
packages/pt-control/src/workflows/dhcp-workflow.ts:175:  const conflictResult = results.find((r) => r.step.includes('conflictos'));
packages/pt-control/src/workflows/dhcp-workflow.ts:176:  if (conflictResult?.output && !conflictResult.output.includes('No conflicts')) {
packages/pt-control/src/workflows/router-on-stick-workflow.ts:194:  const subinterfaceSteps = results.filter((r) => r.step.includes('subinterfaz'));
packages/pt-control/src/utils/ios-commands.test.ts:78:      const trunkCounts = cmds.filter(c => c.includes('switchport mode trunk')).length;
packages/pt-control/src/utils/ios-commands.test.ts:171:      expect(cmds.some(c => c.includes('admin-user'))).toBe(true);
packages/pt-control/src/utils/ios-commands.test.ts:184:      const vtyIndex = cmds.findIndex(c => c.includes('line vty'));
packages/pt-control/src/utils/ios-commands.test.ts:185:      const exitAfterVty = cmds.slice(vtyIndex).some(c => c.includes(' exit'));
packages/pt-control/src/utils/ios-commands.test.ts:217:      expect(cmds.some(c => c.includes('switchport trunk allowed vlan'))).toBe(true);
packages/pt-control/src/utils/ios-commands.test.ts:227:      expect(cmds.some(c => c.includes('P@ssw0rd!#$%'))).toBe(true);
packages/pt-control/src/agent/queries.ts:331:      if (portName.includes(`.${vlanId}`)) {
packages/pt-control/src/agent/queries.ts:365:      (m) => m.moduleType?.toLowerCase().includes(moduleType.toLowerCase()) ||
packages/pt-control/src/agent/queries.ts:366:             m.model?.toLowerCase().includes(moduleType.toLowerCase())
packages/pt-control/src/agent/agent-context-service.test.ts:71:    expect(context.task?.risks?.some((risk) => risk.includes('connect'))).toBe(true);
packages/pt-control/src/shared/utils/helpers.ts:154:      if (!candidates.includes(t)) candidates.push(t);
packages/pt-control/src/shared/utils/helpers.ts:163:      if (!candidates.includes(t)) candidates.push(t);
packages/pt-control/src/debug-move3.ts:14:    const beforeCmds = fs.readdirSync(`${devDir}/commands`).filter((f) => f.startsWith("cmd_"));
packages/pt-control/src/debug-move3.ts:15:    const beforeResults = fs.readdirSync(`${devDir}/results`).filter((f) => f.startsWith("cmd_"));
packages/pt-control/src/debug-move3.ts:25:    const afterCmds = fs.readdirSync(`${devDir}/commands`).filter((f) => f.startsWith("cmd_"));
packages/pt-control/src/debug-move3.ts:26:    const afterResults = fs.readdirSync(`${devDir}/results`).filter((f) => f.startsWith("cmd_"));
packages/pt-control/src/debug-move3.ts:30:    const newCmds = afterCmds.filter(c => !beforeCmds.includes(c));
packages/pt-control/src/debug-move3.ts:31:    const newResults = afterResults.filter(r => !beforeResults.includes(r));
packages/pt-control/src/controller/command-trace-service.ts:20:      if (!String(evt.type ?? "").startsWith("command-")) return;
packages/pt-control/src/debug-move4.ts:28:    const newResults = resultsAfter.filter(r => !resultsBefore.includes(r));
packages/pt-control/src/adapters/runtime-terminal/device-type-detector.ts:30:          model.includes("pc") ||
packages/pt-control/src/adapters/runtime-terminal/device-type-detector.ts:31:          model.includes("server") ||
packages/pt-control/src/adapters/runtime-terminal/device-type-detector.ts:32:          model.includes("laptop") ||
packages/pt-control/src/adapters/runtime-terminal/device-type-detector.ts:39:          model.includes("router") ||
packages/pt-control/src/adapters/runtime-terminal/device-type-detector.ts:40:          model.includes("switch") ||
packages/pt-control/src/adapters/runtime-terminal/device-type-detector.ts:65:        model.includes("pc") ||
packages/pt-control/src/adapters/runtime-terminal/device-type-detector.ts:66:        model.includes("server") ||
packages/pt-control/src/adapters/runtime-terminal/device-type-detector.ts:67:        model.includes("laptop") ||
packages/pt-control/src/adapters/runtime-terminal/device-type-detector.ts:74:        model.includes("router") ||
packages/pt-control/src/adapters/runtime-terminal/device-type-detector.ts:75:        model.includes("switch") ||
packages/pt-control/src/adapters/runtime-terminal/device-type-detector.ts:87:  if (deviceName.toLowerCase().includes("pc") || deviceName.toLowerCase().includes("server")) {
packages/pt-control/src/adapters/runtime-terminal/status-normalizer.ts:40:    recentLines.includes("% Invalid") ||
packages/pt-control/src/adapters/runtime-terminal/status-normalizer.ts:41:    recentLines.includes("% Incomplete") ||
packages/pt-control/src/adapters/runtime-terminal/status-normalizer.ts:42:    recentLines.includes("% Ambiguous") ||
packages/pt-control/src/adapters/runtime-terminal/status-normalizer.ts:43:    recentLines.includes("% Unknown") ||
packages/pt-control/src/adapters/runtime-terminal/status-normalizer.ts:44:    recentLines.includes("%Error") ||
packages/pt-control/src/adapters/runtime-terminal/status-normalizer.ts:45:    recentLines.toLowerCase().includes("invalid command") ||
packages/pt-control/src/adapters/runtime-terminal/status-normalizer.ts:46:    recentLines.includes("Command not found")
packages/pt-control/src/adapters/runtime-terminal/status-normalizer.ts:60:  return mode.includes("host") || mode === "pc" || mode === "server";
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:139:      recentLines.includes("% Invalid") ||
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:140:      recentLines.includes("% Incomplete") ||
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:141:      recentLines.includes("% Ambiguous") ||
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:142:      recentLines.includes("% Unknown") ||
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:143:      recentLines.includes("%Error") ||
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:144:      recentLines.toLowerCase().includes("invalid command") ||
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:145:      recentLines.includes("Command not found")
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:209:    if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:274:    if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:358:    if (isHost && (raw.includes("request timed out") || raw.includes("reply from"))) {
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:417:    if (parsed.promptAfter.includes(expected)) return null;
packages/pt-control/src/adapters/runtime-terminal/retry-policy.ts:45:      if (!cfg.retryableStatuses.includes(context.lastStatus)) {
packages/pt-control/src/adapters/runtime-terminal/retry-policy.ts:53:        errorLower.includes(e.toLowerCase()),
packages/pt-control/src/adapters/runtime-terminal/adapter.native-exec.test.ts:6:  test("usa terminal.native.exec para show running-config IOS", async () => {
packages/pt-control/src/adapters/runtime-terminal/adapter.native-exec.test.ts:13:        if (type === "terminal.native.exec") {
packages/pt-control/src/adapters/runtime-terminal/adapter.native-exec.test.ts:53:    expect(calls.map((call) => call.type)).toEqual(["terminal.native.exec"]);
packages/pt-control/src/adapters/runtime-terminal/terminal-plan-adapter.ts:84:    return validModes.includes(mode as TerminalMode);
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:72:      text.includes("unknown command") ||
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:73:      text.includes("not found") ||
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:74:      text.includes("unsupported") ||
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:75:      text.includes("unrecognized") ||
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:76:      text.includes("no existe")
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:280:      aggregatedOutput += parsed.raw.endsWith("\n") ? parsed.raw : `${parsed.raw}\n`;
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:522:      "terminal.native.exec",
packages/pt-control/src/adapters/omni-response-parser.ts:89:  if (typeof rawValue === "string" && rawValue.includes("|")) {
packages/pt-control/src/adapters/omni-response-parser.ts:296:    ["getRunningConfig", "getAssessmentItemValue", "isAssessmentItemCorrect", "getTimeElapsed", "startPeriodicPDU"].includes(action)
packages/pt-control/src/verification/real-scenario-registry.ts:128:  return Array.from(SCENARIOS.values()).filter((s) => s.profile.includes(profile));
packages/pt-control/src/verification/real-scenario-registry.ts:138:    tags.some((tag) => s.tags.includes(tag))
packages/pt-control/src/verification/stability/e2e-baseline-store.ts:140:      .filter((f) => f.startsWith("e2e-") && f.endsWith(".json"))
packages/pt-control/src/verification/stability/e2e-baseline-store.ts:144:      baselines = baselines.filter((b) => b.startsWith(`${profile}-`));
packages/pt-control/src/verification/stability/retry-policy.ts:137:      (e) => lowerMsg.includes(e.toLowerCase())
packages/pt-control/src/verification/stability/baseline-manager.ts:87:      outcome: summary.flakyScenarios.includes(scenarioId) ? "flaky" : "stable",
packages/pt-control/src/verification/stability/baseline-manager.ts:118:  const matchingFile = files.find((f) => f.includes(`-${label.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`));
packages/pt-control/src/verification/stability/baseline-manager.ts:194:      if (baselineResult.outcome === "flaky" && !current.flakyScenarios.includes(scenarioId)) {
packages/pt-control/src/verification/stability/baseline-manager.ts:203:      if (baselineResult.outcome === "stable" && current.flakyScenarios.includes(scenarioId)) {
packages/pt-control/src/verification/stability/baseline-manager.ts:218:      if (current.flakyScenarios.includes(scenarioId)) {
packages/pt-control/src/verification/stability/baseline-manager.ts:250:    let baselines = files.filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
packages/pt-control/src/verification/stability/baseline-manager.ts:253:      baselines = baselines.filter((b) => b.startsWith(`${profile}-`));
packages/pt-control/src/verification/stability/baseline-manager.ts:277:  const matchingFile = files.find((f) => f.includes(`-${label.replace(/[^a-zA-Z0-9-_]/g, "_")}.json`));
packages/pt-control/src/verification/scenarios/vlan-hopping-attack-scenario.scenario.ts:103:    const isTrunk = raw.includes("trunk") || raw.includes("Mode") || raw.includes("PVID");
packages/pt-control/src/verification/scenarios/vlan-hopping-attack-scenario.scenario.ts:109:    const isAccess = switchportRaw.includes("Access") || switchportRaw.includes("mode");
packages/pt-control/src/verification/scenarios/router-on-stick-basic.scenario.ts:91:      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/router-on-stick-basic.scenario.ts:121:      i.interface?.includes("GigabitEthernet0/0.10") || i.name?.includes("GigabitEthernet0/0.10")
packages/pt-control/src/verification/scenarios/router-on-stick-basic.scenario.ts:124:      i.interface?.includes("GigabitEthernet0/0.20") || i.name?.includes("GigabitEthernet0/0.20")
packages/pt-control/src/verification/scenarios/dhcp-snooping-basic.scenario.ts:92:    const snoopingEnabled = raw.includes("DHCP Snooping") || raw.includes("Enabled") || raw.includes("snooping");
packages/pt-control/src/verification/scenarios/etherchannel-lacp.scenario.ts:110:    const verified = etherchannelRaw.includes("Port-channel") || etherchannelRaw.includes("EtherChannel");
packages/pt-control/src/verification/scenarios/hsrp-load-balancing.scenario.ts:176:      const vlan10ActiveOnR1 = standbyRawVlan10R1.includes("Active") || standbyRawVlan10R1.includes("active");
packages/pt-control/src/verification/scenarios/hsrp-load-balancing.scenario.ts:177:      const vlan20ActiveOnR2 = standbyRawVlan20R2.includes("Active") || standbyRawVlan20R2.includes("active");
packages/pt-control/src/verification/scenarios/hsrp-load-balancing.scenario.ts:178:      const pingSuccessPC1 = pingRawPC1.includes("Success") || pingRawPC1.includes("sent") || pingRawPC1.includes("=");
packages/pt-control/src/verification/scenarios/hsrp-load-balancing.scenario.ts:179:      const pingSuccessPC2 = pingRawPC2.includes("Success") || pingRawPC2.includes("sent") || pingRawPC2.includes("=");
packages/pt-control/src/verification/scenarios/acl-extended-basic.scenario.ts:107:      hasTcpRules: aclRaw.includes("tcp"),
packages/pt-control/src/verification/scenarios/acl-extended-basic.scenario.ts:108:      hasDenyRule: aclRaw.includes("deny"),
packages/pt-control/src/verification/scenarios/nat-static-basic.scenario.ts:106:    const hasStaticNat = runRaw.includes("ip nat inside source static");
packages/pt-control/src/verification/scenarios/nat-static-basic.scenario.ts:107:    const hasInside = runRaw.includes("ip nat inside");
packages/pt-control/src/verification/scenarios/nat-static-basic.scenario.ts:108:    const hasOutside = runRaw.includes("ip nat outside");
packages/pt-control/src/verification/scenarios/initial-dialog-recovery.scenario.ts:37:      const hasPrompt = versionRaw.includes("Router") || versionRaw.includes("Router>") || versionRaw.includes("Router#");
packages/pt-control/src/verification/scenarios/initial-dialog-recovery.scenario.ts:74:        hasVersionContent: versionRaw.includes("Cisco") || versionRaw.includes("IOS"),
packages/pt-control/src/verification/scenarios/arp-inspection-basic.scenario.ts:92:    const arpEnabled = raw.includes("ARP") || raw.includes("Inspection") || raw.includes("enabled") || raw.includes("Active");
packages/pt-control/src/verification/scenarios/ospf-negative.scenario.ts:142:    const r1ToR2Ok = typeof r1PingR2 === "string" && r1PingR2.includes("Success");
packages/pt-control/src/verification/scenarios/ospf-negative.scenario.ts:143:    const r1ToR3Fails = typeof r1PingR3 === "string" && !r1PingR3.includes("Success");
packages/pt-control/src/verification/scenarios/etherchannel-pagp.scenario.ts:110:    const verified = etherchannelRaw.includes("Port-channel") || etherchannelRaw.includes("EtherChannel");
packages/pt-control/src/verification/scenarios/wireless-basic.scenario.ts:105:      const pingSuccessLaptop1 = pingLaptop1Output.includes("Success") || pingLaptop1Output.includes("TTL");
packages/pt-control/src/verification/scenarios/wireless-basic.scenario.ts:106:      const pingSuccessLaptop2 = pingLaptop2Output.includes("Success") || pingLaptop2Output.includes("TTL");
packages/pt-control/src/verification/scenarios/ipv6-dhcpv6-stateful.scenario.ts:96:    const has_binding = typeof dhcp_binding === "string" ? dhcp_binding.includes("2001:db8:cafe") : JSON.stringify(dhcp_binding).includes("2001:db8:cafe");
packages/pt-control/src/verification/scenarios/rstp-failover.scenario.ts:149:        failoverDetected: stpRaw.includes("Forwarding") || stpRaw3.includes("Forwarding"),
packages/pt-control/src/verification/scenarios/rstp-failover.scenario.ts:154:      const pingSuccess = pingRaw.includes("Success") || pingRaw.includes("sent") || pingRaw.includes("=");
packages/pt-control/src/verification/scenarios/service-policy-regression.scenario.ts:108:      const baselineSuccess = pingBaselineOutput.includes("Success") || pingBaselineOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/service-policy-regression.scenario.ts:128:      const postAclSuccess = pingPostAclOutput.includes("Success") || pingPostAclOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/service-policy-regression.scenario.ts:173:      aclConfigured: aclConfig.raw.includes("access-list"),
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:26:  if (cmd === "ipconfig" || cmd.startsWith("ipconfig ")) return "host.ipconfig";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:27:  if (cmd === "ping" || cmd.startsWith("ping ")) return "host.ping";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:28:  if (cmd === "tracert" || cmd.startsWith("tracert ")) return "host.tracert";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:29:  if (cmd === "nslookup" || cmd.startsWith("nslookup ")) return "host.nslookup";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:30:  if (cmd === "arp" || cmd.startsWith("arp ")) return "host.arp";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:31:  if (cmd === "netstat" || cmd.startsWith("netstat ")) return "host.netstat";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:32:  if (cmd === "route" || cmd.startsWith("route ")) return "host.route";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:33:  if (cmd === "telnet" || cmd.startsWith("telnet ")) return "host.telnet";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:42:    if (text.includes("% invalid input detected")) return "IOS_INVALID_INPUT";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:43:    if (text.includes("% incomplete command")) return "IOS_INCOMPLETE_COMMAND";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:44:    if (text.includes("% ambiguous command")) return "IOS_AMBIGUOUS_COMMAND";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:45:    if (text.includes("translating...")) return "IOS_DNS_LOOKUP_TRIGGERED";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:50:    text.includes("invalid command") ||
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:51:    text.includes("bad command or file name") ||
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:52:    text.includes("not recognized")
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:57:  if (text.includes("request timed out")) return "HOST_NETWORK_TIMEOUT";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:58:  if (text.includes("destination host unreachable")) return "HOST_UNREACHABLE";
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:59:  if (text.includes("could not find host") || text.includes("unknown host")) {
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:199:    if (message.includes("Timeout waiting for result")) {
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:228:      !lastResult.modeAfter.startsWith("config")
packages/pt-control/src/verification/scenarios/terminal-regression.scenario.ts:261:  return haystack.toLowerCase().includes(needle.toLowerCase());
packages/pt-control/src/verification/scenarios/nat-overload-basic.scenario.ts:127:    const hasOverload = runRaw.includes("overload");
packages/pt-control/src/verification/scenarios/nat-overload-basic.scenario.ts:128:    const hasPool = runRaw.includes("OVERLOAD-POOL");
packages/pt-control/src/verification/scenarios/nat-overload-basic.scenario.ts:129:    const hasAcl = runRaw.includes("access-list 1");
packages/pt-control/src/verification/scenarios/multi-switch-vlan.scenario.ts:102:      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/rstp-basic.scenario.ts:138:      const hasBlocking = stpRaw1.includes("Blocking") || stpRaw2.includes("Blocking") || stpRaw3.includes("Blocking") ||
packages/pt-control/src/verification/scenarios/rstp-basic.scenario.ts:139:                          stpRaw1.includes("BLK") || stpRaw2.includes("BLK") || stpRaw3.includes("BLK");
packages/pt-control/src/verification/scenarios/rstp-basic.scenario.ts:140:      const hasForwarding = stpRaw1.includes("Forwarding") || stpRaw2.includes("Forwarding") || stpRaw3.includes("Forwarding") ||
packages/pt-control/src/verification/scenarios/rstp-basic.scenario.ts:141:                           stpRaw1.includes("FWD") || stpRaw2.includes("FWD") || stpRaw3.includes("FWD");
packages/pt-control/src/verification/scenarios/rstp-basic.scenario.ts:142:      const pingSuccess = pingRaw.includes("Success") || pingRaw.includes("sent") || pingRaw.includes("=");
packages/pt-control/src/verification/scenarios/hsrp-basic.scenario.ts:116:      const hasActive = standbyRaw1.includes("Active") || standbyRaw2.includes("Active");
packages/pt-control/src/verification/scenarios/hsrp-basic.scenario.ts:117:      const hasStandby = standbyRaw1.includes("Standby") || standbyRaw2.includes("Standby");
packages/pt-control/src/verification/scenarios/hsrp-basic.scenario.ts:118:      const hasVirtualIp = standbyRaw1.includes("192.168.10.1") || standbyRaw2.includes("192.168.10.1");
packages/pt-control/src/verification/scenarios/hsrp-basic.scenario.ts:119:      const pingSuccess = pingRaw.includes("Success") || pingRaw.includes("sent") || pingRaw.includes("=");
packages/pt-control/src/verification/scenarios/dhcp-multi-vlan.scenario.ts:105:      const pc1FromPool = pc1Ip.startsWith("192.168.10.");
packages/pt-control/src/verification/scenarios/dhcp-multi-vlan.scenario.ts:106:      const pc2FromPool = pc2Ip.startsWith("192.168.20.");
packages/pt-control/src/verification/scenarios/dhcp-multi-vlan.scenario.ts:116:      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/dhcp-multi-vlan.scenario.ts:149:      pc1FromCorrectPool: (pc1.ip ?? "").startsWith("192.168.10."),
packages/pt-control/src/verification/scenarios/dhcp-multi-vlan.scenario.ts:150:      pc2FromCorrectPool: (pc2.ip ?? "").startsWith("192.168.20."),
packages/pt-control/src/verification/scenarios/host-command-prompt-connectivity.scenario.ts:94:    const hasArpEntry = arpResult.success && (arpOutput.includes("192.168.1.1") || arpOutput.includes("gateway"));
packages/pt-control/src/verification/scenarios/vlan-isolation.scenario.ts:88:      const sameVlanReachable = pingSameVlanOutput.includes("Success") || pingSameVlanOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/vlan-isolation.scenario.ts:89:      const diffVlanUnreachable = !pingDiffVlanOutput.includes("Success") || pingDiffVlanOutput.includes("100%");
packages/pt-control/src/verification/scenarios/dhcp-single-subnet.scenario.ts:58:      const hasIpFromPool = ipAssigned.startsWith("192.168.1.");
packages/pt-control/src/verification/scenarios/dhcp-single-subnet.scenario.ts:68:      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/hsrp-failover.scenario.ts:132:      const pingSuccessBefore = pingRawBefore.includes("Success") || pingRawBefore.includes("sent") || pingRawBefore.includes("=");
packages/pt-control/src/verification/scenarios/hsrp-failover.scenario.ts:133:      const pingSuccessAfter = pingRawAfter.includes("Success") || pingRawAfter.includes("sent") || pingRawAfter.includes("=");
packages/pt-control/src/verification/scenarios/hsrp-failover.scenario.ts:148:      const failoverOccurred = pingSuccessAfter && (standbyRawAfter2.includes("Active") || standbyRawAfter2.includes("active"));
packages/pt-control/src/verification/scenarios/ios-confirmation-prompts.scenario.ts:47:      const hasConfirmation = raw.includes("confirm") || raw.includes("[confirm]") || raw.includes("OK");
packages/pt-control/src/verification/scenarios/ios-confirmation-prompts.scenario.ts:94:        hasContent: versionRaw.includes("Cisco") || versionRaw.includes("IOS"),
packages/pt-control/src/verification/scenarios/ipv6-nd-stateless.scenario.ts:98:    const ping_ok = typeof ping_result === "string" ? ping_result.includes("Success") : false;
packages/pt-control/src/verification/scenarios/router-on-stick-negative.scenario.ts:90:      const pingFailed = pingOutput.includes("100%") || pingOutput.includes("fail");
packages/pt-control/src/verification/scenarios/router-on-stick-negative.scenario.ts:129:    const hasEncapsulation = configRaw.includes("encapsulation dot1Q");
packages/pt-control/src/verification/scenarios/etherchannel-failure-member-loss.scenario.ts:111:      etherchannelStillActive: etherchannelAfter.raw?.includes("Port-channel") || etherchannelAfter.raw?.includes("EtherChannel"),
packages/pt-control/src/verification/scenarios/etherchannel-failure-member-loss.scenario.ts:114:    const verified = etherchannelAfter.raw?.includes("Port-channel") || etherchannelAfter.raw?.includes("EtherChannel");
packages/pt-control/src/verification/scenarios/ospf-failover.scenario.ts:121:    const connectivityMaintained = typeof pingAfter === "string" && pingAfter.includes("Success");
packages/pt-control/src/verification/scenarios/ospf-failover.scenario.ts:151:    const r2PingR1Ok = typeof r2ToR1 === "string" && r2ToR1.includes("Success");
packages/pt-control/src/verification/scenarios/ospf-failover.scenario.ts:152:    const r2PingR3Ok = typeof r2ToR3 === "string" && r2ToR3.includes("Success");
packages/pt-control/src/verification/scenarios/ios-session-recovery.scenario.ts:45:      const hasError = invalidRaw.includes("Invalid") || invalidRaw.includes("error") || invalidRaw.includes("^");
packages/pt-control/src/verification/scenarios/ios-session-recovery.scenario.ts:51:      const sessionRecovered = validRaw.includes("GigabitEthernet") || validRaw.includes("Interface");
packages/pt-control/src/verification/scenarios/ios-session-recovery.scenario.ts:95:        i.interface?.includes("GigabitEthernet0/0") || i.name?.includes("GigabitEthernet0/0")
packages/pt-control/src/verification/scenarios/email-basic-scenario.ts:95:      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/email-regression.scenario.ts:116:      const pingSuccessBefore = pingBeforeOutput.includes("Success") || pingBeforeOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/email-regression.scenario.ts:117:      const pingSuccessAfter = pingAfterOutput.includes("Success") || pingAfterOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/http-service-basic.scenario.ts:80:      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/http-service-basic.scenario.ts:118:      httpServerConfigured: httpConfig.raw.includes("http server") || httpConfig.raw.includes("ip http server"),
packages/pt-control/src/verification/scenarios/acl-logging-regression.scenario.ts:93:    const hasAcl = raw.includes("101") || raw.includes("permit") || raw.includes("deny");
packages/pt-control/src/verification/scenarios/port-security-basic.scenario.ts:84:    const hasPortSecurity = raw.includes("Port Security") || raw.includes("Enabled");
packages/pt-control/src/verification/scenarios/port-security-basic.scenario.ts:85:    const hasMaxAddr = raw.includes("1") || raw.includes("Maximum");
packages/pt-control/src/verification/scenarios/nat-overload-regression.scenario.ts:118:    const hasNat = raw.includes("NAT") || raw.includes("inside") || raw.includes("outside") || raw.includes("translation");
packages/pt-control/src/verification/scenarios/stp-root-control.scenario.ts:111:      const switch1IsRoot = stpRaw1.includes("This bridge is the root") || stpRaw1.includes("Root ID");
packages/pt-control/src/verification/scenarios/stp-root-control.scenario.ts:112:      const switch2NotRoot = !stpRaw2.includes("This bridge is the root");
packages/pt-control/src/verification/scenarios/stp-root-control.scenario.ts:113:      const switch3NotRoot = !stpRaw3.includes("This bridge is the root");
packages/pt-control/src/verification/scenarios/stp-root-control.scenario.ts:115:      const hasDesignated = stpRaw2.includes("Designated") || stpRaw3.includes("Designated");
packages/pt-control/src/verification/scenarios/stp-root-control.scenario.ts:116:      const hasRoot = stpRaw2.includes("Root") || stpRaw3.includes("Root");
packages/pt-control/src/verification/scenarios/stp-root-control.scenario.ts:117:      const hasBlocking = stpRaw2.includes("Blocking") || stpRaw3.includes("Blocking") ||
packages/pt-control/src/verification/scenarios/stp-root-control.scenario.ts:118:                         stpRaw2.includes("BLK") || stpRaw3.includes("BLK");
packages/pt-control/src/verification/scenarios/ipv6-ospf-basic.scenario.ts:121:    const r1_ping_ok = typeof ping_r1_to_r2 === "string" ? ping_r1_to_r2.includes("Success") : false;
packages/pt-control/src/verification/scenarios/ipv6-ospf-basic.scenario.ts:122:    const r2_ping_ok = typeof ping_r2_to_r1 === "string" ? ping_r2_to_r1.includes("Success") : false;
packages/pt-control/src/verification/scenarios/acl-standard-basic.scenario.ts:128:      configApplied: runRaw.includes("access-list 10"),
packages/pt-control/src/verification/scenarios/ipv6-basic-slaac.scenario.ts:65:    const has_ipv6 = typeof r1_ipv6_int === "string" ? r1_ipv6_int.includes("IPv6") || r1_ipv6_int.includes("FE80") : JSON.stringify(r1_ipv6_int).includes("IPv6");
packages/pt-control/src/verification/scenarios/ipv6-basic-slaac.scenario.ts:86:    const ping_ok = typeof ping_result === "string" ? ping_result.includes("Success") : false;
packages/pt-control/src/verification/scenarios/dns-http-integration.scenario.ts:91:      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/dns-http-integration.scenario.ts:133:      httpServerConfigured: routerConfig.raw.includes("http server") || routerConfig.raw.includes("ip http server"),
packages/pt-control/src/verification/scenarios/dns-http-integration.scenario.ts:134:      domainNameConfigured: routerDomain.raw.includes("domain-name"),
packages/pt-control/src/verification/scenarios/acl-regression-guard.scenario.ts:131:    const blockedPresent = aclRaw.includes("10.3.3.0") || aclRaw.includes("10.3.3");
packages/pt-control/src/verification/scenarios/acl-regression-guard.scenario.ts:132:    const permittedPresent = aclRaw.includes("permit");
packages/pt-control/src/verification/scenarios/interactive-pagination.scenario.ts:45:      const hasMorePrompt = raw.includes("--More--") || raw.includes("More");
packages/pt-control/src/verification/scenarios/nat-acl-integration.scenario.ts:142:    const hasAcl = runRaw.includes("access-list 100");
packages/pt-control/src/verification/scenarios/nat-acl-integration.scenario.ts:143:    const hasNat = runRaw.includes("ip nat inside source");
packages/pt-control/src/verification/scenarios/nat-acl-integration.scenario.ts:144:    const hasOverload = runRaw.includes("overload");
packages/pt-control/src/verification/scenarios/trunk-basic.scenario.ts:103:      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/switch-mac-learning.scenario.ts:50:      const pingSuccess = pingOutput.includes("Success") || pingOutput.includes("TTL");
packages/pt-control/src/verification/scenarios/switch-mac-learning.scenario.ts:84:      e.ports?.some((p: string) => p.includes("FastEthernet0/1")) ||
packages/pt-control/src/verification/scenarios/switch-mac-learning.scenario.ts:85:      e.interface?.includes("FastEthernet0/1")
packages/pt-control/src/verification/scenarios/switch-mac-learning.scenario.ts:88:      e.ports?.some((p: string) => p.includes("FastEthernet0/2")) ||
packages/pt-control/src/verification/scenarios/switch-mac-learning.scenario.ts:89:      e.interface?.includes("FastEthernet0/2")
packages/pt-control/src/verification/scenarios/ospf-basic.scenario.ts:112:    const r1HasOspfRoute = typeof r1Route === "string" ? r1Route.includes("O") : JSON.stringify(r1Route).includes('"protocol":"ospf"');
packages/pt-control/src/verification/scenarios/ospf-basic.scenario.ts:113:    const r3HasOspfRoute = typeof r3Route === "string" ? r3Route.includes("O") : JSON.stringify(r3Route).includes('"protocol":"ospf"');
packages/pt-control/src/verification/scenarios/ospf-basic.scenario.ts:145:    const r1PingOk = typeof r1ToR3 === "string" ? r1ToR3.includes("Success") : false;
packages/pt-control/src/verification/scenarios/ospf-basic.scenario.ts:146:    const r3PingOk = typeof r3ToR1 === "string" ? r3ToR1.includes("Success") : false;
packages/pt-control/src/verification/scenarios/ios-show-commands.scenario.ts:91:      i.interface?.includes("GigabitEthernet0/0") || i.name?.includes("GigabitEthernet0/0")
packages/pt-control/src/verification/scenarios/ios-show-commands.scenario.ts:94:      i.interface?.includes("GigabitEthernet0/1") || i.name?.includes("GigabitEthernet0/1")
packages/pt-control/src/verification/real-verification-runner.ts:120:      options.includeScenarioIds!.includes(s.id)
packages/pt-control/src/verification/real-verification-runner.ts:125:      (s) => !options.excludeScenarioIds!.includes(s.id)
packages/pt-control/src/verification/e2e/mock-pt-bridge.ts:218:    if (model.includes("2911") || model.includes("1941") || model.includes("4331")) {
packages/pt-control/src/verification/e2e/mock-pt-bridge.ts:221:    if (model.includes("2960") || model.includes("2950") || model.includes("3650")) {
packages/pt-control/src/verification/e2e/mock-pt-bridge.ts:224:    if (model.includes("PC-PT")) {
packages/pt-control/src/verification/e2e/mock-pt-bridge.ts:227:    if (model.includes("SERVER")) {
packages/pt-control/src/verification/e2e/mock-pt-bridge.ts:244:    if (command.startsWith("hostname")) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:238:              if (!iface.trunkVlanAllowed.includes(Number(vlanId))) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:390:              if (device.runningConfig && !device.runningConfig.includes(`ip helper-address`)) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:560:            if (device.runningConfig && !device.runningConfig.includes('spanning-tree portfast')) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:590:          if (device.runningConfig?.includes('spanning-tree portfast')) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:591:            if (!device.runningConfig.includes('spanning-tree bpduguard')) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:630:                config.includes(`interface ${i.name}`) &&
packages/pt-control/src/pt/topology/lint/rule-registry.ts:631:                config.includes(match)
packages/pt-control/src/pt/topology/lint/rule-registry.ts:644:            (modes.includes('active') && modes.includes('passive')) ||
packages/pt-control/src/pt/topology/lint/rule-registry.ts:645:            (modes.includes('active') && modes.includes('auto')) ||
packages/pt-control/src/pt/topology/lint/rule-registry.ts:646:            (modes.includes('active') && modes.includes('desirable')) ||
packages/pt-control/src/pt/topology/lint/rule-registry.ts:647:            (modes.includes('passive') && modes.includes('auto')) ||
packages/pt-control/src/pt/topology/lint/rule-registry.ts:648:            (modes.includes('passive') && modes.includes('desirable')) ||
packages/pt-control/src/pt/topology/lint/rule-registry.ts:649:            (modes.includes('auto') && modes.includes('desirable'));
packages/pt-control/src/pt/topology/lint/rule-registry.ts:766:        const hasOspf = device.runningConfig.includes('router ospf');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:767:        const hasAreaAuth = device.runningConfig.includes('area ') && device.runningConfig.includes('authentication');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:878:        if (!device.runningConfig.includes('ip dhcp excluded-address')) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:963:          i.name.toLowerCase().includes('vlan1') ||
packages/pt-control/src/pt/topology/lint/rule-registry.ts:964:          i.name.toLowerCase().includes('loopback')
packages/pt-control/src/pt/topology/lint/rule-registry.ts:969:            const hasAcl = device.runningConfig?.includes('access-group') ??
packages/pt-control/src/pt/topology/lint/rule-registry.ts:970:              device.runningConfig?.includes('ip access-class');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1002:          if (iface.mode === 'trunk' && iface.trunkVlanAllowed?.includes(1)) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1032:        const hasCdpRun = device.runningConfig.includes('cdp run');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1033:        const hasNoCdpInterface = device.runningConfig.includes('no cdp enable');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1065:        const hasVty = device.runningConfig.includes('line vty');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1066:        const hasSsh = device.runningConfig.includes('ip ssh');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1067:        const hasCryptoKey = device.runningConfig.includes('crypto key');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1098:        const hasPasswords = device.runningConfig.includes('enable password') ||
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1099:          device.runningConfig.includes('username ');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1100:        const hasEncryption = device.runningConfig.includes('service password-encryption');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1133:        const hasIpv6Enable = device.runningConfig.includes('ipv6 enable');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1165:        const hasSlaac = device.runningConfig.includes('ipv6 address autoconfig');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1166:        const hasNoRa = device.runningConfig.includes('ipv6 nd suppress-ra');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1197:        const hasDhcpClient = device.runningConfig.includes('ipv6 address dhcp');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1198:        const hasRelay = device.runningConfig.includes('ipv6 dhcp relay');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1229:        const hasIpv6Routing = device.runningConfig.includes('ipv6 unicast-routing');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1233:          if (iface.ip?.includes(':')) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1272:          const hasPriority = device.runningConfig.includes('standby priority');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1303:        const hasPriority = device.runningConfig.includes('standby priority');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1304:        const hasPreempt = device.runningConfig.includes('standby preempt');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1335:        const hasHsrp = device.runningConfig.includes('standby ');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1336:        const hasAuth = device.runningConfig.includes('standby authentication');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1367:        const hasPriority = device.runningConfig.includes('standby priority');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1368:        const hasTrack = device.runningConfig.includes('standby track');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1400:        if (device.model?.toLowerCase().includes('wireless')) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1408:        if (device.runningConfig?.includes('ap join')) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1441:        if (device.model?.toLowerCase().includes('access point') ||
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1442:          device.model?.toLowerCase().includes('ap ')) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1445:            !device.runningConfig?.includes('controller')) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1473:        if (device.runningConfig?.includes('wireless')) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1505:        if (device.runningConfig?.includes('wireless')) {
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1506:          const hasRrm = device.runningConfig.includes('rrm');
packages/pt-control/src/pt/topology/lint/rule-registry.ts:1507:          const hasDot11Radio = device.runningConfig.includes('dot11Radio');
packages/pt-control/src/pt/topology/hsrp-service.ts:133:      if (line.includes('Priority')) {
packages/pt-control/src/pt/topology/hsrp-service.ts:137:      if (line.includes('Preempt')) {
packages/pt-control/src/pt/topology/hsrp-service.ts:140:      if (line.includes('State')) {
packages/pt-control/src/pt/topology/hsrp-service.ts:149:      if (line.includes('Virtual IP')) {
packages/pt-control/src/pt/topology/hsrp-service.ts:177:      if (line.includes('Interface')) {
packages/pt-control/src/pt/topology/hsrp-service.ts:182:      if (line.includes('Group')) {
packages/pt-control/src/pt/topology/hsrp-service.ts:187:      if (currentInterface && currentGroup > 0 && line.includes('State')) {
packages/pt-control/src/pt/topology/drift-detector.ts:116:            const hasSviConfig = obsDevice.runningConfig?.includes('interface Vlan');
packages/pt-control/src/pt/topology/ipv6-service.ts:142:      if (line.includes('Router advertisements')) {
packages/pt-control/src/pt/topology/ipv6-service.ts:146:      if (line.includes('Managed address configuration')) {
packages/pt-control/src/pt/topology/ipv6-service.ts:147:        managedConfig = line.includes('enabled') || line.includes('Yes');
packages/pt-control/src/pt/topology/ipv6-service.ts:149:      if (line.includes('Other stateful configuration')) {
packages/pt-control/src/pt/topology/ipv6-service.ts:150:        otherConfig = line.includes('enabled') || line.includes('Yes');
packages/pt-control/src/pt/topology/ipv6-service.ts:152:      if (line.includes('Reachable Time')) {
packages/pt-control/src/pt/topology/ipv6-service.ts:156:      if (line.includes('Retrans Timer')) {
packages/pt-control/src/pt/topology/wireless-service.ts:179:      if (line.includes('SSID')) {
packages/pt-control/src/pt/topology/wireless-service.ts:183:      if (line.includes('AP')) {
packages/pt-control/src/pt/topology/wireless-service.ts:187:      if (line.includes('VLAN')) {
packages/pt-control/src/pt/topology/wireless-service.ts:191:      if (line.includes('IP Address')) {
packages/pt-control/src/pt/topology/wireless-service.ts:216:      if (line.includes(apName) || line.includes('AP Name')) {
packages/pt-control/src/pt/topology/wireless-service.ts:217:        if (line.includes('Auth Failed') || line.includes('Authentication')) {
packages/pt-control/src/pt/topology/wireless-service.ts:221:        } else if (line.includes('Unreachable') || line.includes('timeout')) {
packages/pt-control/src/pt/topology/wireless-service.ts:225:        } else if (line.includes('License') || line.includes('licensed')) {
packages/pt-control/src/pt/topology/wireless-service.ts:229:        } else if (line.includes('Image') || line.includes('mismatch')) {
packages/pt-control/src/pt/topology/blueprint-store.ts:102:      if (!existing.devices.includes(op.device)) {
packages/pt-control/src/pt/topology/blueprint-store.ts:164:    if (!device.vlans.includes(String(vlan))) {
packages/pt-control/src/pt/terminal/terminal-policy-engine.ts:103:        if (error.message?.includes('timeout')) {
packages/pt-control/src/pt/terminal/terminal-policy-engine.ts:174:      if (error instanceof Error && error.message.includes('timed out')) {
packages/pt-control/src/pt/terminal/terminal-evidence-verifier.test.ts:22:      expect(verdict.warnings.some(w => w.includes("25%"))).toBe(true);
packages/pt-control/src/pt/terminal/dialog-resolver.ts:50:    return output.includes(this.PAGER_MARKER);
packages/pt-control/src/pt/terminal/dialog-resolver.ts:57:    return output.includes(this.CONFIRM_MARKER);
packages/pt-control/src/pt/terminal/mode-transition.ts:58:    const isValid = validModes.includes(to);
packages/pt-control/src/pt/terminal/mode-transition.ts:156:    return ['configure', 'interface', 'subinterface', 'router', 'vlan', 'line'].includes(mode);
packages/pt-control/src/pt/terminal/mode-transition.ts:163:    return ['exec', 'privilege'].includes(mode);
packages/pt-control/src/pt/terminal/terminal-output-parsers.ts:376:    if (command && command.length < 500 && !command.includes("Packet Tracer")) { 
packages/pt-control/src/pt/terminal/terminal-output-parsers.ts:422:      hasDefaultRoute: routes.some((r) => r["code"] === "S" && String(r["network"] ?? "").includes("0.0.0.0")),
packages/pt-control/src/pt/terminal/terminal-evidence-verifier.ts:160:      const isZeroIp = ipv4Line.includes("0.0.0.0");
packages/pt-control/src/pt/terminal/terminal-evidence-verifier.ts:161:      const isApipa = ipv4Line.includes("169.254.");
packages/pt-control/src/pt/terminal/terminal-evidence-verifier.ts:198:        evidenceOk: text.includes("Server:"),
packages/pt-control/src/pt/terminal/terminal-evidence-verifier.ts:205:      const hasProto = text.includes("Proto") && text.includes("Local Address");
packages/pt-control/src/pt/terminal/terminal-evidence-verifier.ts:251:      const ok = raw.includes("Network Destination") || raw.includes("Active Routes");
packages/pt-control/src/pt/terminal/terminal-evidence-verifier.ts:266:      const hasConnection = lower.includes("open") || lower.includes("password:") || lower.includes("username:") || lower.includes(">") || lower.includes("#");
packages/pt-control/src/pt/terminal/terminal-evidence-verifier.ts:267:      const hasFailure = lower.includes("timeout") || lower.includes("connection closed") || lower.includes("refused") || lower.includes("unreachable");
packages/pt-control/src/pt/terminal/terminal-evidence-verifier.ts:314:      const hasTraceComplete = text.toLowerCase().includes("trace complete");
packages/pt-control/src/pt/server/subnet-validator.ts:237:    if (afterFirstZero.includes('1')) return false;
packages/pt-control/src/pt/diagnosis/diagnosis-engine.ts:142:          passed: output.length > 0 && !output.includes('error'),
packages/pt-control/src/autonomy/destructive-actions.ts:24:  return DESTRUCTIVE_ACTIONS.includes(action as DestructiveAction);
packages/pt-control/src/intent/templates.ts:403:    if (part.includes("-")) {
packages/pt-control/src/intent/blueprint-builder.ts:467:        device.name.toLowerCase().includes(normalized) ||
packages/pt-control/src/intent/blueprint-builder.ts:468:        normalized.includes(device.name.toLowerCase())
packages/pt-control/src/intent/blueprint-builder.ts:483:      if (part.includes("-")) {
packages/pt-control/src/__tests__/public-api-boundary.test.ts:28:    const offenders = forbidden.filter((pattern) => source.includes(pattern));
packages/pt-control/src/commands/bridge-doctor-command.ts:60:    .filter((f) => f.endsWith(".json"))
packages/pt-control/src/commands/bridge-doctor-command.ts:99:    markers.hasCommandTimeout = content.includes("command-timeout") || content.includes("CommandTimeout");
packages/pt-control/src/commands/bridge-doctor-command.ts:100:    markers.hasPagerAdvance = content.includes("pager-advance") || content.includes("PagerAdvance");
packages/pt-control/src/commands/bridge-doctor-command.ts:101:    markers.hasTerminalExecutionResult = content.includes("terminal-execution-result") || content.includes("TerminalExecutionResult");
packages/pt-control/src/application/network-services/network-services-use-cases.test.ts:52:      expect(commands.some((c) => c.includes("dhcp") || c.includes("pool"))).toBe(true);
packages/pt-control/src/application/network-services/network-services-use-cases.test.ts:64:      expect(commands.some((c) => c.includes("ntp") || c.includes("server"))).toBe(true);
packages/pt-control/src/application/network-services/network-services-use-cases.test.ts:72:      expect(commands.some((c) => c.includes("logging") || c.includes("syslog"))).toBe(true);
packages/pt-control/src/application/validate/validate-use-cases.ts:120:          String(conn.cableType).includes("trunk"),
packages/pt-control/src/application/validate/validate-use-cases.test.ts:40:        (i) => i.message.includes("duplicado") && i.severity === "error",
packages/pt-control/src/application/command-catalog/command-catalog-use-cases.ts:24:      cmd.summary.toLowerCase().includes(lower) ||
packages/pt-control/src/application/command-catalog/command-catalog-use-cases.ts:25:      (cmd.longDescription?.toLowerCase().includes(lower) ?? false),
packages/pt-control/src/application/command-catalog/command-catalog-use-cases.ts:59:    if (!['stable', 'partial', 'experimental'].includes(entry.status)) {
packages/pt-control/src/application/wlc/wlc-use-cases.ts:56:        if (d.getModel && d.getModel().includes('LAP')) {
packages/pt-control/src/application/wlc/wlc-use-cases.ts:286:    const success = String(raw).includes("success");
packages/pt-control/src/application/doctor/doctor-use-cases.ts:204:    ? readdirSync(commandsDir).filter((f) => f.endsWith(".json")).length
packages/pt-control/src/application/doctor/doctor-use-cases.ts:207:    ? readdirSync(inFlightDir).filter((f) => f.endsWith(".json")).length
packages/pt-control/src/application/doctor/doctor-use-cases.ts:210:    ? readdirSync(deadLetterDir).filter((f) => f.endsWith(".json")).length
packages/pt-control/src/application/lab/lab-plan-persistence.ts:78:    const files = readdirSync(this.stateDir).filter((f: string) => f.endsWith(".json"));
packages/pt-control/src/application/lab/lab-verifier.ts:174:          trunk.allowedVlans.every((v: number) => expectedAllowedVlans.includes(v)));
packages/pt-control/src/application/lab/core3650-lift.ts:519:      ok: snapshot.coreRunningConfig.includes(`hostname ${CORE_NAME}`),
packages/pt-control/src/application/lab/core3650-lift.ts:524:      ok: snapshot.coreRunningConfig.toLowerCase().includes("spanning-tree mode rapid-pvst"),
packages/pt-control/src/application/lab/core3650-lift.ts:529:      ok: snapshot.coreRunningConfig.toLowerCase().includes("ip routing"),
packages/pt-control/src/application/lab/core3650-lift.ts:535:        snapshot.coreVlans.includes(vlan),
packages/pt-control/src/application/lab/core3650-lift.ts:546:          entry.toLowerCase().includes(iface.toLowerCase()),
packages/pt-control/src/application/lab/core3650-lift.ts:564:        (item) => typeof item.ip === "string" && item.ip.startsWith("192.168.99."),
packages/pt-control/src/application/stp/stp-use-cases.ts:32:  if (!["pvst", "rapid-pvst", "mst"].includes(mode)) {
packages/pt-control/src/application/stp/stp-use-cases.test.ts:42:      expect(commands.some((c) => c.includes("pvst"))).toBe(true);
packages/pt-control/src/application/results/results-use-cases.ts:119:  if (child !== parent && !child.startsWith(parent + sep)) {
packages/pt-control/src/application/results/results-use-cases.ts:135:  if (!clean.endsWith(".json")) {
packages/pt-control/src/application/results/results-use-cases.ts:179:  return name.startsWith("cmd_") && name.endsWith(".json");
packages/pt-control/src/application/results/results-use-cases.ts:556:    return readdirSync(dir).filter((file) => file.endsWith(".json")).length;
packages/pt-control/src/application/results/results-use-cases.test.ts:52:    expect(result.data.files[0]?.name.startsWith("cmd_")).toBe(true);
packages/pt-control/src/application/logs/categorize.ts:9:    lowerAction.includes("bridge") ||
packages/pt-control/src/application/logs/categorize.ts:10:    lowerMessage.includes("lease") ||
packages/pt-control/src/application/logs/categorize.ts:11:    lowerMessage.includes("queue")
packages/pt-control/src/application/logs/categorize.ts:17:    lowerAction.includes("pt") ||
packages/pt-control/src/application/logs/categorize.ts:18:    lowerMessage.includes("runtime") ||
packages/pt-control/src/application/logs/categorize.ts:19:    lowerMessage.includes("terminal")
packages/pt-control/src/application/logs/categorize.ts:25:    lowerAction.includes("ios") ||
packages/pt-control/src/application/logs/categorize.ts:26:    lowerAction.includes("config") ||
packages/pt-control/src/application/logs/categorize.ts:27:    lowerMessage.includes("command")
packages/pt-control/src/application/logs/categorize.ts:32:  if (lowerMessage.includes("verif")) {
packages/pt-control/src/application/logs/logs-use-cases.ts:107:  if (child !== parent && !child.startsWith(parent + sep)) {
packages/pt-control/src/application/logs/logs-use-cases.ts:141:    .filter((file) => file.endsWith(".ndjson"))
packages/pt-control/src/application/logs/logs-use-cases.ts:446:          !action.includes("ios") &&
packages/pt-control/src/application/logs/logs-use-cases.ts:447:          !action.includes("config") &&
packages/pt-control/src/application/logs/logs-use-cases.ts:448:          !action.includes("show") &&
packages/pt-control/src/application/logs/logs-use-cases.ts:449:          !action.includes("exec")
packages/pt-control/src/application/logs/logs-use-cases.ts:459:          !evtDevice.toLowerCase().includes(input.device.toLowerCase())
packages/pt-control/src/application/config-ios/verification-planner.ts:27:            return Boolean(match && raw.includes(match[1]!));
packages/pt-control/src/application/config-ios/verification-planner.ts:97:    if (c.includes("interface")) types.push("interface");
packages/pt-control/src/application/config-ios/verification-planner.ts:98:    if (c.includes("vlan")) types.push("vlan");
packages/pt-control/src/application/config-ios/verification-planner.ts:99:    if (c.includes("ip route") || c.includes("router")) types.push("routing");
packages/pt-control/src/application/config-ios/verification-planner.ts:100:    if (c.includes("access-list")) types.push("acl");
packages/pt-control/src/application/config-ios/verification-planner.ts:101:    if (c.includes("spanning") || c.includes("stp")) types.push("stp");
packages/pt-control/src/application/config-ios/verification-planner.ts:102:    if (c.includes("etherchannel") || c.includes("port-channel"))
packages/pt-control/src/application/config-ios/verification-planner.ts:104:    if (c.includes("line vty") || c.includes("line console")) types.push("line");
packages/pt-control/src/application/config-ios/verification-planner.ts:106:      c.includes("hostname") ||
packages/pt-control/src/application/config-ios/verification-planner.ts:107:      c.includes("enable") ||
packages/pt-control/src/application/config-ios/verification-planner.ts:108:      c.includes("service")
packages/pt-control/src/application/history/history-use-cases.test.ts:30:      entries = entries.filter((entry) => entry.action.startsWith(filters.actionPrefix!));
packages/pt-control/src/application/history/history-use-cases.ts:146:  if (entry.verificationSummary?.includes("not verified")) {
packages/pt-control/src/application/history/history-use-cases.ts:218:  if (nonTerminalActions.includes(action)) {
packages/pt-control/src/application/history/history-use-cases.ts:225:  if (writeActions.includes(action)) {
packages/pt-control/src/application/history/history-use-cases.ts:232:  if (getHistoryStatus(entry) === "error" && getHistoryErrorMessage(entry)?.includes("confirmación")) {
packages/pt-control/src/application/routing/ios-builders.ts:34:  if (cidr.includes('/')) {
packages/pt-control/src/application/routing/ios-builders.ts:45:  const networkAddr = network.includes('/') ? (network.split('/')[0] ?? network) : network;
packages/pt-control/src/application/routing/ios-builders.ts:82:  const [net, wildcard] = network.includes('/') ? parseCidrToNetworkWildcard(network) : [network, '0.0.0.255'];
packages/pt-control/src/application/check/check-use-cases.test.ts:170:      expect(checks.every((c) => ["pass", "fail", "warning", "skip"].includes(c.status))).toBe(true);
packages/pt-control/src/application/check/check-use-cases.test.ts:200:      expect(checks.every((c) => c.name.startsWith("gateway-"))).toBe(true);
packages/pt-control/src/application/acl/acl-types.ts:81:  return validPrefixes.some((prefix) => interfaceName.startsWith(prefix));
packages/pt-control/src/application/acl/acl-use-cases.test.ts:74:      expect(commands.some((c: string) => c.includes("access-list"))).toBe(true);
packages/pt-control/src/application/services/terminal-plan-builder.test.ts:110:  test("buildUniversalTerminalPlan no inserta terminal length 0 para show IOS", () => {
packages/pt-control/src/application/services/ios-verification-service.ts:53:          if (name.toLowerCase().endsWith(interfaceName.toLowerCase())) return true;
packages/pt-control/src/application/services/ios-verification-service.ts:146:        const found = ifaces[portName] || Object.keys(ifaces).find((k) => k.toLowerCase().endsWith(portName.toLowerCase()));
packages/pt-control/src/application/services/ios-verification-service.ts:271:          return name.toLowerCase() === subinterfaceName.toLowerCase() || name.toLowerCase().endsWith(subinterfaceName.toLowerCase());
packages/pt-control/src/application/services/ios-verification-service.ts:332:      const hasPool = raw.includes(`ip dhcp pool ${poolName}`);
packages/pt-control/src/application/services/ios-verification-service.ts:349:      const hasOspf = raw.toLowerCase().includes("ospf");
packages/pt-control/src/application/services/ios-verification-service.ts:358:        const hasProcess = raw.includes(`Routing Protocol is "ospf ${processId}"`) || raw.includes(`Routing Protocol is "ospf"`);
packages/pt-control/src/application/services/ios-verification-service.ts:364:      if (raw.toLowerCase().includes('ospf')) {
packages/pt-control/src/application/services/ios-verification-service.ts:382:      const hasAcl = raw.includes(`${aclNumber} `) || raw.includes(`access-list ${aclNumber}`);
packages/pt-control/src/application/services/ios-verification-service.ts:401:        const ok = raw.toLowerCase().includes(snippet.toLowerCase());
packages/pt-control/src/application/services/ios-verification-service.ts:426:      if (!raw.includes("Group") || !raw.includes("Standby")) {
packages/pt-control/src/application/services/ios-verification-service.ts:450:      const hasStandby = raw.includes("Standby router is");
packages/pt-control/src/application/services/ios-verification-service.ts:457:      const isActive = raw.includes("State is Active");
packages/pt-control/src/application/services/ios-verification-service.ts:458:      const isStandby = raw.includes("State is Standby");
packages/pt-control/src/application/services/port-planner-service.ts:43:  if (name.includes('gi') || name.includes('gigabit')) score += 100;
packages/pt-control/src/application/services/port-planner-service.ts:44:  else if (name.includes('fa') || name.includes('fastethernet')) score += 80;
packages/pt-control/src/application/services/port-planner-service.ts:45:  else if (name.includes('eth')) score += 70;
packages/pt-control/src/application/services/port-planner-service.ts:46:  else if (name.includes('serial')) score += 60;
packages/pt-control/src/application/services/scenario-parser.ts:79:    if (!line.trim() || line.trim().startsWith("#")) continue;
packages/pt-control/src/application/services/scenario-parser.ts:110:      if (typeof last === "string" && last.includes(":")) {
packages/pt-control/src/application/services/wlc-service.ts:144:    return result.ok && String(result.value).includes("success");
packages/pt-control/src/application/services/wlc-service.ts:186:          if (dev.model.includes('LAP')) {
packages/pt-control/src/application/services/omniscience-service.ts:118:        if (!record.includes(":::")) return null;
packages/pt-control/src/application/services/terminal-plan-builder.ts:23:    .map((line) => line.trimEnd())
packages/pt-control/src/application/services/terminal-plan-builder.ts:25:    .filter((line) => !line.trimStart().startsWith("#"));
packages/pt-control/src/application/services/ios-execution-service.ts:150:      paging: result.warnings.some((w) => w.toLowerCase().includes("paginación")),
packages/pt-control/src/application/services/ios-execution-service.ts:151:      awaitingConfirm: result.warnings.some((w) => w.toLowerCase().includes("confirmación")),
packages/pt-control/src/application/services/ios-execution-service.ts:441:      if (trimmed.startsWith("show running-config")) return false;
packages/pt-control/src/application/services/ios-execution-service.ts:442:      if (trimmed.startsWith("Building configuration...")) return false;
packages/pt-control/src/application/services/device-mutation-service.ts:58:      const autoSlot = slots.find((candidate) => !candidate.occupied && (candidate.compatibleModules ?? []).includes(module));
packages/pt-control/src/application/services/device-mutation-service.ts:74:      if (!(targetSlot.compatibleModules ?? []).includes(module))
packages/pt-control/src/application/services/ios-validator.ts:48:    if (command.includes('  ')) {
packages/pt-control/src/application/services/ios-validator.ts:58:    if (command.startsWith('ip route ')) {
packages/pt-control/src/application/services/ios-validator.ts:63:    if (command.startsWith('interface ')) {
packages/pt-control/src/application/services/ios-validator.ts:68:    if (command.startsWith('ip address ')) {
packages/pt-control/src/application/services/ios-validator.ts:95:    return deprecated.some(d => command.startsWith(d));
packages/pt-control/src/application/services/scenario-service.ts:104:    if (!res.ok || kernelMessage.includes("ERROR") || kernelMessage.includes("INJECT_ERROR")) {
packages/pt-control/src/application/services/scenario-service.ts:290:          if (config.includes(expectText)) {
packages/pt-control/src/application/services/scenario-service.ts:334:    ].some((d) => d.startsWith("❌"));
packages/pt-control/src/application/services/topology-connectivity-verification-service.ts:110:        const hasRemote = raw.toLowerCase().includes(expected.remoteDevice.toLowerCase());
packages/pt-control/src/application/services/topology-connectivity-verification-service.ts:112:          ? raw.toLowerCase().includes(expected.localPort.toLowerCase())
packages/pt-control/src/application/services/terminal-command-classifier.ts:68:  if (cmd.startsWith("interface ")) {
packages/pt-control/src/application/services/terminal-command-classifier.ts:77:  if (cmd.startsWith("line ")) {
packages/pt-control/src/application/services/terminal-command-classifier.ts:86:  if (cmd.startsWith("router ")) {
packages/pt-control/src/application/services/terminal-command-classifier.ts:147:  if (cmd.startsWith("show ") || cmd.startsWith("do show ")) {
packages/pt-control/src/application/services/terminal-command-classifier.ts:164:      (safe) => cmd === safe || cmd.startsWith(safe + " "),
packages/pt-control/src/application/services/terminal-command-classifier.ts:180:    profile.ensurePrivileged = !cmd.startsWith("do ");
packages/pt-control/src/application/services/terminal-command-classifier.ts:198:      runningConfigCommands.some((c) => cmd === c || cmd.startsWith(c + " ")) ||
packages/pt-control/src/application/services/terminal-command-classifier.ts:199:      techCommands.some((c) => cmd === c || cmd.startsWith(c + " ")) ||
packages/pt-control/src/application/services/terminal-command-classifier.ts:200:      loggingCommands.some((c) => cmd === c || cmd.startsWith(c + " "))
packages/pt-control/src/application/services/terminal-command-classifier.ts:224:  if (destructiveCommands.some((d) => cmd === d || cmd.startsWith(d + " "))) {
packages/pt-control/src/application/services/terminal-command-classifier.ts:232:  if (cmd === "ping" || cmd.startsWith("ping ")) {
packages/pt-control/src/application/services/terminal-command-classifier.ts:239:  if (cmd === "traceroute" || cmd.startsWith("traceroute ")) {
packages/pt-control/src/application/services/terminal-command-classifier.ts:257:  if (cmd === "ipconfig" || cmd === "ipconfig /all" || cmd.startsWith("ipconfig ")) {
packages/pt-control/src/application/services/terminal-command-classifier.ts:265:  if (cmd === "ping" || cmd.startsWith("ping ")) {
packages/pt-control/src/application/services/terminal-command-classifier.ts:272:  if (cmd === "tracert" || cmd.startsWith("tracert ")) {
packages/pt-control/src/application/services/terminal-command-classifier.ts:280:  if (infoCommands.some((c) => cmd === c || cmd.startsWith(c))) {
packages/pt-control/src/application/services/terminal-command-service.ts:92:  if (loweredOutput.includes("invalid input detected") || loweredOutput.includes("invalid command")) {
packages/pt-control/src/application/services/terminal-command-service.ts:99:  if (loweredOutput.includes("not recognized")) {
packages/pt-control/src/application/services/terminal-command-service.ts:161:    model.includes("router") ||
packages/pt-control/src/application/services/terminal-command-service.ts:162:    model.includes("switch")
packages/pt-control/src/application/services/terminal-command-service.ts:187:    model.includes("server") ||
packages/pt-control/src/application/services/terminal-command-service.ts:188:    model.includes("pc-pt") ||
packages/pt-control/src/application/services/terminal-command-service.ts:189:    model.includes("laptop") ||
packages/pt-control/src/application/services/terminal-command-service.ts:190:    model.includes("printer")
packages/pt-control/src/application/services/terminal-command-service.ts:208:            lowered.includes("timeout") ||
packages/pt-control/src/application/services/terminal-command-service.ts:209:            lowered.includes("timed out") ||
packages/pt-control/src/application/services/terminal-command-service.ts:210:            lowered.includes("runtime_not_polling") ||
packages/pt-control/src/application/services/terminal-command-service.ts:211:            lowered.includes("no result")
packages/pt-control/src/application/services/terminal-command-service.ts:358:              (String(err?.message ?? "").includes("Timeout waiting for result")
packages/pt-control/src/application/services/terminal-command-service.ts:471:          hostOutput.toLowerCase().includes("invalid command") ||
packages/pt-control/src/application/services/terminal-command-service.ts:472:          hostOutput.toLowerCase().includes("not recognized")
packages/pt-control/src/application/services/terminal-command-service.ts:520:      hostOutput.toLowerCase().includes("invalid command") ||
packages/pt-control/src/application/services/terminal-command-service.ts:521:      hostOutput.toLowerCase().includes("not recognized")
packages/pt-control/src/application/services/layout-planner-service.ts:87:    if (intent.zoneId && !zoneIds.includes(intent.zoneId)) {
packages/pt-control/src/application/services/layout-planner-service.ts:194:      if (!zoneIds.includes(intent.zoneId)) zoneIds.push(intent.zoneId);
packages/pt-control/src/application/services/ios-semantic-service.ts:253:    if (!verification.raw.includes(`ip dhcp pool ${poolName}`))
packages/pt-control/src/application/services/ios-semantic-service.ts:275:    if (!verification.raw.toLowerCase().includes("ospf"))
packages/pt-control/src/application/services/ios-semantic-service.ts:304:    if (!raw.includes("transport input ssh") || !raw.includes("login local"))
packages/pt-control/src/application/services/ios-semantic-service.ts:321:    if (!verification.raw.includes(String(aclNumber)))
packages/pt-control/src/application/services/ios-session-manager.ts:85:      state.configMode = mode.startsWith("config");
packages/pt-control/src/application/services/topology-query-service.ts:88:            device.name.toLowerCase().includes(normalized) ||
packages/pt-control/src/application/services/topology-query-service.ts:89:            device.model.toLowerCase().includes(normalized) ||
packages/pt-control/src/application/services/topology-query-service.ts:90:            device.type.toLowerCase().includes(normalized)
packages/pt-control/src/domain/topology/value-objects/cable-media.ts:64:    if (!validMedia.includes(value)) {
packages/pt-control/src/domain/ios/session/setup-guard.ts:63:    return estados.includes(IosPromptState.SETUP_DIALOG);
packages/pt-control/src/domain/ios/session/setup-guard.ts:71:    return estados.includes(IosPromptState.PRESS_RETURN);
packages/pt-control/src/domain/ios/session/setup-guard.ts:83:    if (estados.includes(IosPromptState.SETUP_DIALOG)) {
packages/pt-control/src/domain/ios/session/setup-guard.ts:91:    if (estados.includes(IosPromptState.PRESS_RETURN)) {
packages/pt-control/src/domain/ios/session/setup-guard.ts:144:    if (estados.includes(IosPromptState.SETUP_DIALOG)) {
packages/pt-control/src/domain/ios/session/setup-guard.ts:147:    } else if (estados.includes(IosPromptState.PRESS_RETURN)) {
packages/pt-control/src/logging/types.ts:138:    const isSensitive = SENSITIVE_KEYS.some(sk => lowerKey.includes(sk));
packages/pt-control/src/logging/__tests__/log-manager.test.ts:293:      expect(id1.startsWith('cor_')).toBe(true);
packages/pt-control/src/logging/__tests__/log-manager.test.ts:300:      expect(id1.startsWith('ses_')).toBe(true);
packages/pt-control/src/vdom/twin-adapter.ts:57:  if (lower.includes("ethernet") || lower.includes("fastethernet") || lower.includes("gigabit")) {
packages/pt-control/src/vdom/twin-adapter.ts:60:  if (lower.includes("serial")) return "serial";
packages/pt-control/src/vdom/twin-adapter.ts:61:  if (lower.includes("fiber") || lower.includes("sfp")) return "fiber";
packages/pt-control/src/vdom/twin-adapter.ts:62:  if (lower.includes("usb")) return "usb";
packages/pt-control/src/vdom/twin-adapter.ts:63:  if (lower.includes("wireless") || lower.includes("wlan")) return "wireless";
packages/pt-control/src/vdom/twin-adapter.ts:69:  if (speed?.toLowerCase().includes("fiber")) return "fiber";
packages/pt-control/src/vdom/twin-adapter.ts:70:  if (speed?.toLowerCase().includes("copper")) return "copper";
packages/pt-control/src/vdom/twin-adapter.ts:229:    if (lowerText.includes("server") || lowerText.includes("servidor")) {
packages/pt-control/src/vdom/twin-adapter.ts:231:    } else if (lowerText.includes("user") || lowerText.includes("usuario")) {
packages/pt-control/src/vdom/twin-adapter.ts:233:    } else if (lowerText.includes("wifi") || lowerText.includes("wireless")) {
packages/pt-control/src/vdom/twin-adapter.ts:422:    if (!models.includes(deviceTwin.name)) {
packages/pt-control/src/vdom/topology-cache-manager.ts:112:    if (lower.includes('router') || lower.includes('isr') || lower.includes('1941') || lower.includes('2911') || lower.includes('2921') || lower.includes('4331')) {
packages/pt-control/src/vdom/topology-cache-manager.ts:116:    if (lower.includes('switch') || lower.includes('2960') || lower.includes('3560') || lower.includes('3650') || lower.includes('catalyst')) {
packages/pt-control/src/vdom/topology-cache-manager.ts:120:    if (lower.includes('pc') || lower.includes('laptop') || lower.includes('workstation')) {
packages/pt-control/src/vdom/topology-cache-manager.ts:124:    if (lower.includes('server')) {
packages/pt-control/src/vdom/topology-cache-manager.ts:128:    if (lower.includes('accesspoint') || lower.includes('access point') || lower.includes('ap') || lower.includes('wireless')) {
packages/pt-control/src/vdom/topology-cache-manager.ts:132:    if (lower.includes('cloud')) {
packages/pt-control/src/vdom/vdom-helpers.ts:65:    if (lowerModel.includes('router')) return 'router';
packages/pt-control/src/vdom/vdom-helpers.ts:66:    if (lowerModel.includes('switch') && !lowerModel.includes('multilayer') && !lowerModel.includes('layer3')) return 'switch';
packages/pt-control/src/vdom/vdom-helpers.ts:67:    if (lowerModel.includes('multilayer') || lowerModel.includes('l3') || lowerModel.includes('layer3')) return 'switch_layer3';
packages/pt-control/src/vdom/vdom-helpers.ts:68:    if (lowerModel.includes('pc') || lowerModel.includes('workstation')) return 'pc';
packages/pt-control/src/vdom/vdom-helpers.ts:69:    if (lowerModel.includes('server')) return 'server';
packages/pt-control/src/vdom/vdom-helpers.ts:70:    if (lowerModel.includes('wireless_router')) return 'wireless_router';
packages/pt-control/src/vdom/vdom-helpers.ts:71:    if (lowerModel.includes('access_point') || lowerModel.includes('ap') || lowerModel.includes('access point')) return 'access_point';
packages/pt-control/src/vdom/vdom-helpers.ts:72:    if (lowerModel.includes('cloud')) return 'cloud';
packages/pt-control/src/vdom/vdom-helpers.ts:73:    if (lowerModel.includes('multilayer_device')) return 'multilayer_device';
packages/pt-control/src/omni/risk-policy.ts:42:  return policy.allowedInSuites.includes(suite);
packages/pt-control/src/omni/capability-runner.ts:246:    (capability.tags.includes("host") ? "host" : "ios");
packages/pt-control/src/omni/capability-runner.ts:251:    (capability.execute.handler && capability.execute.handler.startsWith("show ")
packages/pt-control/src/omni/support-matrix.ts:77:          if (CRITICAL_WARNINGS.some((cw) => lower.includes(cw))) {
```

## deployed runtime markers
```

----- /Users/andresgaibor/pt-dev/main.js -----
5304:function wakeTerminal(terminal) {
5355: * - enable automático si ensurePrivileged=true
5359:        var maxRetries, retryDelayMs, wakeUpOnFail, ensurePrivileged, quietThresholdMs, lastOutputLength, attempt, prompt, mode, snapshot, currentLength, outputDelta, hasNoise, newPrompt, newMode, _a, finalPrompt, finalMode;
5368:                    ensurePrivileged = (_e = options.ensurePrivileged) !== null && _e !== void 0 ? _e : false;
5391:                    if (!(ensurePrivileged && kind === "ios" && mode !== "privileged-exec")) return [3 /*break*/, 7];
5413:                        wakeTerminal(terminal);
5446:                wakeTerminal(terminal);
5641:        .map(function (line) { return line.trimEnd(); });
6290:                ensurePrivileged: (_l = options.ensurePrivileged) !== null && _l !== void 0 ? _l : false,
6441:    CommandStateMachine.prototype.wakeTerminalIfNeeded = function () {
6496:                    ensurePrivileged: (_e = options.ensurePrivileged) !== null && _e !== void 0 ? _e : false,
6533:                this.wakeTerminalIfNeeded();

----- /Users/andresgaibor/pt-dev/runtime.js -----
1750:    if (options.ensurePrivileged) {
1800:    if (options.ensurePrivileged) {
6441:    return lines.join("\n").trimEnd();
6443:function handleTerminalNativeExec(payload, api) {
6457:                        return [2 /*return*/, createErrorResult("terminal.native.exec requiere device y command", "INVALID_NATIVE_EXEC_PAYLOAD")];
6485:                        return [2 /*return*/, createErrorResult("terminal.native.exec no pudo enviar el comando: " + String(error), "NATIVE_EXEC_SEND_FAILED")];
6539:                        return [2 /*return*/, createErrorResult("terminal.native.exec no complet\u00F3 ".concat(command, " en ").concat(timeoutMs, "ms"), completionReason === "pager-limit" ? "NATIVE_EXEC_PAGER_LIMIT" : "NATIVE_EXEC_TIMEOUT", {
6864:                ensurePrivileged: Boolean(payload.ensurePrivileged),
6910:                ensurePrivileged: Boolean(payload.ensurePrivileged),
7565:    registerHandler("terminal.native.exec", handleTerminalNativeExec);
9347:function wakeTerminal(terminal) {
9398: * - enable automático si ensurePrivileged=true
9402:        var maxRetries, retryDelayMs, wakeUpOnFail, ensurePrivileged, quietThresholdMs, lastOutputLength, attempt, prompt, mode, snapshot, currentLength, outputDelta, hasNoise, newPrompt, newMode, _a, finalPrompt, finalMode;
9411:                    ensurePrivileged = (_e = options.ensurePrivileged) !== null && _e !== void 0 ? _e : false;
9434:                    if (!(ensurePrivileged && kind === "ios" && mode !== "privileged-exec")) return [3 /*break*/, 7];
9456:                        wakeTerminal(terminal);
9489:                wakeTerminal(terminal);
9684:        .map(function (line) { return line.trimEnd(); });
10094:    function ensurePrivilegedExec(deviceName, terminal) {
10210:                        return [4 /*yield*/, ensurePrivilegedExec(deviceName, terminal)];
10274:                        return [2 /*return*/, ensurePrivilegedExec(deviceName, terminal)];
10305:        ensurePrivilegedExec: ensurePrivilegedExec,
10648:        createCommandStep("terminal length 0", { expectMode: "privileged-exec" }),
11205:                ensurePrivileged: (_k = options.ensurePrivileged) !== null && _k !== void 0 ? _k : false,
11356:    CommandStateMachine.prototype.wakeTerminalIfNeeded = function () {
11411:                    ensurePrivileged: (_e = options.ensurePrivileged) !== null && _e !== void 0 ? _e : false,
11448:                this.wakeTerminalIfNeeded();

----- packages/pt-runtime/dist-qtscript/main.js -----
5304:function wakeTerminal(terminal) {
5355: * - enable automático si ensurePrivileged=true
5359:        var maxRetries, retryDelayMs, wakeUpOnFail, ensurePrivileged, quietThresholdMs, lastOutputLength, attempt, prompt, mode, snapshot, currentLength, outputDelta, hasNoise, newPrompt, newMode, _a, finalPrompt, finalMode;
5368:                    ensurePrivileged = (_e = options.ensurePrivileged) !== null && _e !== void 0 ? _e : false;
5391:                    if (!(ensurePrivileged && kind === "ios" && mode !== "privileged-exec")) return [3 /*break*/, 7];
5413:                        wakeTerminal(terminal);
5446:                wakeTerminal(terminal);
5641:        .map(function (line) { return line.trimEnd(); });
6290:                ensurePrivileged: (_l = options.ensurePrivileged) !== null && _l !== void 0 ? _l : false,
6441:    CommandStateMachine.prototype.wakeTerminalIfNeeded = function () {
6496:                    ensurePrivileged: (_e = options.ensurePrivileged) !== null && _e !== void 0 ? _e : false,
6533:                this.wakeTerminalIfNeeded();

----- packages/pt-runtime/dist-qtscript/runtime.js -----
1750:    if (options.ensurePrivileged) {
1800:    if (options.ensurePrivileged) {
6441:    return lines.join("\n").trimEnd();
6443:function handleTerminalNativeExec(payload, api) {
6457:                        return [2 /*return*/, createErrorResult("terminal.native.exec requiere device y command", "INVALID_NATIVE_EXEC_PAYLOAD")];
6485:                        return [2 /*return*/, createErrorResult("terminal.native.exec no pudo enviar el comando: " + String(error), "NATIVE_EXEC_SEND_FAILED")];
6539:                        return [2 /*return*/, createErrorResult("terminal.native.exec no complet\u00F3 ".concat(command, " en ").concat(timeoutMs, "ms"), completionReason === "pager-limit" ? "NATIVE_EXEC_PAGER_LIMIT" : "NATIVE_EXEC_TIMEOUT", {
6864:                ensurePrivileged: Boolean(payload.ensurePrivileged),
6910:                ensurePrivileged: Boolean(payload.ensurePrivileged),
7565:    registerHandler("terminal.native.exec", handleTerminalNativeExec);
9347:function wakeTerminal(terminal) {
9398: * - enable automático si ensurePrivileged=true
9402:        var maxRetries, retryDelayMs, wakeUpOnFail, ensurePrivileged, quietThresholdMs, lastOutputLength, attempt, prompt, mode, snapshot, currentLength, outputDelta, hasNoise, newPrompt, newMode, _a, finalPrompt, finalMode;
9411:                    ensurePrivileged = (_e = options.ensurePrivileged) !== null && _e !== void 0 ? _e : false;
9434:                    if (!(ensurePrivileged && kind === "ios" && mode !== "privileged-exec")) return [3 /*break*/, 7];
9456:                        wakeTerminal(terminal);
9489:                wakeTerminal(terminal);
9684:        .map(function (line) { return line.trimEnd(); });
10094:    function ensurePrivilegedExec(deviceName, terminal) {
10210:                        return [4 /*yield*/, ensurePrivilegedExec(deviceName, terminal)];
10274:                        return [2 /*return*/, ensurePrivilegedExec(deviceName, terminal)];
10305:        ensurePrivilegedExec: ensurePrivilegedExec,
10648:        createCommandStep("terminal length 0", { expectMode: "privileged-exec" }),
11205:                ensurePrivileged: (_k = options.ensurePrivileged) !== null && _k !== void 0 ? _k : false,
11356:    CommandStateMachine.prototype.wakeTerminalIfNeeded = function () {
11411:                    ensurePrivileged: (_e = options.ensurePrivileged) !== null && _e !== void 0 ? _e : false,
11448:                this.wakeTerminalIfNeeded();
```

## latest native result failures
```json

----- /Users/andresgaibor/pt-dev/results/cmd_000000018684.json -----
{
  "id": "cmd_000000018684",
  "seq": 18684,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018680.json -----
{
  "id": "cmd_000000018680",
  "seq": 18680,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018677.json -----
{
  "id": "cmd_000000018677",
  "seq": 18677,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018676.json -----
{
  "id": "cmd_000000018676",
  "seq": 18676,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018674.json -----
{
  "id": "cmd_000000018674",
  "seq": 18674,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018673.json -----
{
  "id": "cmd_000000018673",
  "seq": 18673,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018671.json -----
{
  "id": "cmd_000000018671",
  "seq": 18671,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\" changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018670.json -----
{
  "id": "cmd_000000018670",
  "seq": 18670,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018668.json -----
{
  "id": "cmd_000000018668",
  "seq": 18668,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"net0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018667.json -----
{
  "id": "cmd_000000018667",
  "seq": 18667,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018665.json -----
{
  "id": "cmd_000000018665",
  "seq": 18665,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"tocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018664.json -----
{
  "id": "cmd_000000018664",
  "seq": 18664,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018662.json -----
{
  "id": "cmd_000000018662",
  "seq": 18662,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018661.json -----
{
  "id": "cmd_000000018661",
  "seq": 18661,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018659.json -----
{
  "id": "cmd_000000018659",
  "seq": 18659,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"o up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018658.json -----
{
  "id": "cmd_000000018658",
  "seq": 18658,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018652.json -----
{
  "id": "cmd_000000018652",
  "seq": 18652,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018649.json -----
{
  "id": "cmd_000000018649",
  "seq": 18649,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018643.json -----
{
  "id": "cmd_000000018643",
  "seq": 18643,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018640.json -----
{
  "id": "cmd_000000018640",
  "seq": 18640,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018634.json -----
{
  "id": "cmd_000000018634",
  "seq": 18634,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018631.json -----
{
  "id": "cmd_000000018631",
  "seq": 18631,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}
```
