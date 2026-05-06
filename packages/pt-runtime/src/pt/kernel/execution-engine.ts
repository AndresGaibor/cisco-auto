// packages/pt-runtime/src/pt/kernel/execution-engine.ts
// Execution Engine para Deferred Jobs IOS
// Responsabilidades: tipos de job, contexto, ejecución de steps, serialización a KernelJobState

import type {
  DeferredJobPlan,
  DeferredStep,
  DeferredStepType,
  KernelJobState,
} from "../../runtime/contracts";
import type { TerminalEngine, TerminalResult } from "../terminal/terminal-engine";

export type JobPhase =
  | "pending"
  | "waiting-ensure-mode"
  | "waiting-command"
  | "waiting-confirm"
  | "waiting-prompt"
  | "waiting-save"
  | "waiting-delay"
  | "completed"
  | "error";

export interface JobStepResult {
  stepIndex: number;
  stepType: DeferredStepType;
  command: string;
  raw: string;
  status: number | null;
  error?: string;
  completedAt: number;
}

export interface JobContext {
  plan: DeferredJobPlan;
  currentStep: number;
  phase: JobPhase;
  outputBuffer: string;
  debug: string[];
  startedAt: number;
  updatedAt: number;
  stepResults: JobStepResult[];
  lastMode: string;
  lastPrompt: string;
  paged: boolean;
  waitingForCommandEnd: boolean;
  finished: boolean;
  result: TerminalResult | null;
  error: string | null;
  errorCode: string | null;
  pendingDelay: number | null;
  waitingForConfirm: boolean;
  nativeBaselineOutput: string;
  nativeBaselineStep: number;
}

export interface ActiveJob {
  id: string;
  device: string;
  context: JobContext;
  pendingCommand: Promise<TerminalResult> | null;
}

// ============================================================================
// INTERFAZ PÚBLICA
// ============================================================================

export interface ExecutionEngine {
  startJob(plan: DeferredJobPlan): ActiveJob;
  advanceJob(jobId: string): void;
  reapStaleJobs(): void;
  getJob(jobId: string): ActiveJob | null;
  getJobState(jobId: string): JobContext | null;
  getActiveJobs(): ActiveJob[];
  isJobFinished(jobId: string): boolean;
}

// ============================================================================
// IMPLEMENTACIÓN
// ============================================================================

export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine {
  const jobs: Record<string, ActiveJob> = {};

  function execLog(message: string): void {
    try {
      dprint("[exec] " + message);
    } catch {}
  }

  function getJobTimeoutMs(job: ActiveJob): number {
    const commandTimeout = Number(job.context.plan.options.commandTimeoutMs || 30000);
    const stallTimeout = Number(job.context.plan.options.stallTimeoutMs || 15000);
    return Math.max(commandTimeout + stallTimeout + 2000, 5000);
  }

  function isJobFinished(jobId: string): boolean {
    const job = jobs[jobId];
    if (!job) return true;
    return job.context.finished === true || job.context.phase === "completed" || job.context.phase === "error";
  }

  function isDeviceTerminalBusy(device: string): boolean {
    try {
      if (terminal && typeof (terminal as any).isBusy === "function") {
        return (terminal as any).isBusy(device) === true;
      }
    } catch {}

    return false;
  }

  function createJobContext(plan: DeferredJobPlan): JobContext {
    const now = Date.now();

    return {
      plan,
      currentStep: 0,
      phase: "pending",
      outputBuffer: "",
      debug: [],
      startedAt: now,
      updatedAt: now,
      stepResults: [],
      lastMode: "unknown",
      lastPrompt: "",
      paged: false,
      waitingForCommandEnd: false,
      finished: false,
      result: null,
      error: null,
      errorCode: null,
      pendingDelay: null,
      waitingForConfirm: false,
      nativeBaselineOutput: "",
      nativeBaselineStep: -1,
    };
  }

  function resolvePacketTracerIpc(): any {
    // 1. self — funciona en PT QTScript, browsers y Node
    try {
      if (typeof self !== "undefined" && self) {
        const root = self as any;
        if (root.ipc && typeof root.ipc.network === "function") {
          return root.ipc;
        }
      }
    } catch {}
 
    // 2. Free variable 'ipc' — Packet Tracer nativo (QTScript)
    try {
      if (typeof ipc !== "undefined" && ipc && typeof ipc.network === "function") {
        return ipc;
      }
    } catch {}
 
    // 3. _ScriptModule.context.ipc — fallback PT
    try {
      if (typeof _ScriptModule !== "undefined" && _ScriptModule) {
        const scriptModule = _ScriptModule as any;
        const context = scriptModule.context;
        const scriptModuleIpc = context && context.ipc;
        if (scriptModuleIpc && typeof scriptModuleIpc.network === "function") {
          return scriptModuleIpc;
        }
      }
    } catch {}
 
    return null;
  }

  function readTerminalTextSafe(term: any): string {
    const methods = [
      "getAllOutput",
      "getBuffer",
      "getOutput",
      "getText",
      "readAll",
      "read",
      "getHistory",
      "history",
    ];

    for (let i = 0; i < methods.length; i += 1) {
      const name = methods[i];

      try {
        if (typeof term[name] === "function") {
          const value = term[name]();
          if (value && typeof value === "string") {
            return value;
          }
        }
      } catch {}
    }

    try {
      if (typeof term.getConsole === "function") {
        const consoleObj = term.getConsole();

        if (consoleObj) {
          for (let i = 0; i < methods.length; i += 1) {
            const name = methods[i];

            try {
              if (typeof consoleObj[name] === "function") {
                const value = consoleObj[name]();
                if (value && typeof value === "string") {
                  return value;
                }
              }
            } catch {}
          }
        }
      }
    } catch {}

    return "";
  }

  function inferPromptFromTerminalText(text: string): string {
    const lines = String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean);

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i] || "";

      if (/^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line)) {
        return line;
      }

      if (/[A-Z]:\\>$/.test(line)) {
        return line;
      }
    }

    return "";
  }

  function inferIosModeFromPrompt(prompt: unknown): string | null {
    const value = String(prompt ?? "").trim();

    if (isHostPrompt(value)) return "host-prompt";

    if (/\(config-if-range\)#\s*$/i.test(value)) return "config-if-range";
    if (/\(config-if\)#\s*$/i.test(value)) return "config-if";
    if (/\(config-subif\)#\s*$/i.test(value)) return "config-subif";
    if (/\(config-router\)#\s*$/i.test(value)) return "config-router";
    if (/\(config-line\)#\s*$/i.test(value)) return "config-line";
    if (/\(config-vlan\)#\s*$/i.test(value)) return "config-vlan";
    if (/\(config\)#\s*$/i.test(value)) return "global-config";

    if (/#\s*$/.test(value)) return "privileged-exec";
    if (/>$/.test(value)) return "user-exec";

    return null;
  }

  function isHostPrompt(value: unknown): boolean {
    const line = String(value ?? "").trim();

    return /[A-Z]:\\>$/i.test(line) || /\b(?:pc|server|laptop|host|client|terminal)[A-Za-z0-9._-]*>$/i.test(line);
  }

  function normalizeIosMode(mode: unknown, prompt?: unknown): string {
    const promptMode = inferIosModeFromPrompt(prompt);

    if (promptMode) {
      return promptMode;
    }

    const raw = String(mode ?? "").trim().toLowerCase();

    if (raw === "user") return "user-exec";
    if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
    if (raw === "global" || raw === "config" || raw === "global-config") return "global-config";
    if (raw === "config-if") return "config-if";
    if (raw === "config-if-range") return "config-if-range";
    if (raw === "config-subif") return "config-subif";
    if (raw === "config-router") return "config-router";
    if (raw === "config-line") return "config-line";
    if (raw === "config-vlan") return "config-vlan";
    if (raw === "interface-config") return "config-if";
    if (raw === "router-config") return "config-router";
    if (raw === "line-config") return "config-line";
    if (raw === "vlan-config") return "config-vlan";
    if (raw === "logout") return "logout";

    return raw || "unknown";
  }

  function createAttachableTerminal(term: any): any {
    return {
      getPrompt: function () {
        try {
          if (typeof term.getPrompt === "function") {
            const prompt = term.getPrompt();
            if (prompt && typeof prompt === "string") {
              return prompt;
            }
          }
        } catch {}

        return inferPromptFromTerminalText(readTerminalTextSafe(term));
      },

      getMode: function () {
        const prompt = inferPromptFromTerminalText(readTerminalTextSafe(term));

        try {
          if (typeof term.getMode === "function") {
            return normalizeIosMode(term.getMode(), prompt);
          }
        } catch {}

        return normalizeIosMode("unknown", prompt);
      },

      getOutput: function () {
        try {
          if (typeof term.getOutput === "function") {
            return term.getOutput();
          }
        } catch {}

        return readTerminalTextSafe(term);
      },

      getAllOutput: function () {
        try {
          if (typeof term.getAllOutput === "function") {
            return term.getAllOutput();
          }
        } catch {}

        return readTerminalTextSafe(term);
      },

      getBuffer: function () {
        try {
          if (typeof term.getBuffer === "function") {
            return term.getBuffer();
          }
        } catch {}

        return readTerminalTextSafe(term);
      },

      getCommandInput: function () {
        try {
          if (typeof term.getCommandInput === "function") {
            return term.getCommandInput();
          }
        } catch {}

        return "";
      },

      enterCommand: function (cmd: string) {
        return term.enterCommand(cmd);
      },

      enterChar: function (charCode: number, modifiers: number) {
        return term.enterChar(charCode, modifiers);
      },

      registerEvent: function (
        eventName: string,
        context: unknown,
        handler: (src: unknown, args: unknown) => void,
      ) {
        return term.registerEvent(eventName, context, handler);
      },

      unregisterEvent: function (
        eventName: string,
        context: unknown,
        handler: (src: unknown, args: unknown) => void,
      ) {
        return term.unregisterEvent(eventName, context, handler);
      },

      println: function (text: string) {
        if (typeof term.println === "function") {
          return term.println(text);
        }
      },

      flush: function () {
        if (typeof term.flush === "function") {
          return term.flush();
        }
      },

      getConsole: function () {
        if (typeof term.getConsole === "function") {
          return term.getConsole();
        }

        return null;
      },
    };
  }

  function tryAttachTerminal(device: string): boolean {
    try {
      const resolvedIpc = resolvePacketTracerIpc();

      if (!resolvedIpc) {
        execLog("ATTACH failed device=" + device + " reason=no-ipc");
        return false;
      }

      const net = typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;

      if (!net || typeof net.getDevice !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-network");
        return false;
      }

      const dev = net.getDevice(device);

      if (!dev) {
        execLog("ATTACH failed device=" + device + " reason=no-device");
        return false;
      }

      if (typeof dev.getCommandLine !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-get-command-line");
        return false;
      }

      const term = dev.getCommandLine();

      if (!term) {
        execLog("ATTACH failed device=" + device + " reason=no-command-line");
        return false;
      }

      if (typeof term.enterCommand !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-enter-command");
        return false;
      }

      if (typeof term.registerEvent !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-register-event");
        return false;
      }

      if (typeof term.unregisterEvent !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-unregister-event");
        return false;
      }

      terminal.attach(device, createAttachableTerminal(term) as any);
      return true;
    } catch (error) {
      execLog("ATTACH failed device=" + device + " error=" + String(error));
      return false;
    }
  }

  function isConfigMode(mode: string | null | undefined, prompt?: unknown): boolean {
    const normalized = normalizeIosMode(mode, prompt);

    return normalized === "global-config" || normalized === "config" || normalized.startsWith("config-");
  }

  function cleanupConfigSession(device: string, mode: string | null | undefined, prompt: string | null | undefined): void {
    if (!isConfigMode(mode, prompt) && !/\(config[^)]*\)#\s*$/.test(String(prompt ?? ""))) {
      return;
    }

    execLog("CLEANUP config session device=" + device);
    void terminal
      .executeCommand(device, "end", {
        commandTimeoutMs: 5000,
        allowPager: false,
        autoConfirm: false,
      })
      .catch(function (error) {
        execLog("CLEANUP failed device=" + device + " error=" + String(error));
      });
  }

  // ============================================================================
  // Helpers para detección de prompt y output completo
  // ============================================================================

  function normalizeEol(value: unknown): string {
    return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function isIosPrompt(value: unknown): boolean {
    const line = String(value ?? "").trim();
    return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line);
  }

  function lastNonEmptyLine(value: unknown): string {
    const lines = normalizeEol(value)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.length > 0 ? lines[lines.length - 1] : "";
  }

  function lineContainsCommandEcho(line: string, command: string): boolean {
    const rawLine = String(line ?? "").trim();
    const rawCommand = String(command ?? "").trim();

    if (!rawLine || !rawCommand) return false;

    const lowerLine = rawLine.toLowerCase();
    const lowerCommand = rawCommand.toLowerCase();

    if (lowerLine === lowerCommand) {
      return true;
    }

    // Packet Tracer suele dejar el eco como:
    //   SW-SRV-DIST>show version
    //   Router#show ip interface brief
    //   Switch(config)#interface vlan 10
      const promptEchoPattern = new RegExp(
        "^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*" +
          String(rawCommand ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
          "\\s*$",
        "i",
      );

    return promptEchoPattern.test(rawLine);
  }

  function isPagerOnlyLine(line: string): boolean {
    return /^--More--$/i.test(String(line ?? "").trim());
  }

  function outputLooksComplete(output: string, command: string): boolean {
    const text = normalizeEol(output);
    const cmd = String(command ?? "").trim();

    if (!text.trim()) return false;

    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));

    if (!hasPromptAtEnd) {
      return false;
    }

    const hasCommandEcho =
      cmd.length === 0 || lines.some((line) => lineContainsCommandEcho(line, cmd));

    const hasMeaningfulBody = lines.some((line) => {
      if (!line) return false;
      if (lineContainsCommandEcho(line, cmd)) return false;
      if (isIosPrompt(line)) return false;
      if (isPagerOnlyLine(line)) return false;
      return true;
    });

    return hasCommandEcho && hasMeaningfulBody;
  }

  function nativeModeSatisfiesEnsureStep(step: DeferredStep, mode: string, prompt: string): boolean {
    const expected = String(
      (step as any).expectMode ??
        (step as any).value ??
        "",
    ).trim();

    if (!expected) return false;

    if (expected === "privileged-exec") {
      return mode === "privileged-exec" || String(prompt || "").trim().endsWith("#");
    }

    if (expected === "user-exec") {
      return mode === "user-exec" || String(prompt || "").trim().endsWith(">");
    }

    if (expected === "global-config" || expected === "config") {
      return isConfigMode(mode, prompt) || String(prompt || "").includes("(config");
    }

    return mode === expected;
  }

  function completeEnsureModeFromNativeTerminal(
    job: ActiveJob,
    step: DeferredStep,
    prompt: string,
    mode: string,
  ): boolean {
    const ctx = job.context;

    if (!nativeModeSatisfiesEnsureStep(step, mode, prompt)) {
      return false;
    }

    const raw = String(prompt || "");

    job.pendingCommand = null;
    ctx.waitingForCommandEnd = false;
    ctx.lastPrompt = prompt;
    ctx.lastMode = mode;
    ctx.paged = false;

    ctx.stepResults.push({
      stepIndex: ctx.currentStep,
      stepType: step.type,
      command: String(step.value || ""),
      raw,
      status: 0,
      completedAt: Date.now(),
    });

    ctx.currentStep++;
    ctx.error = null;
    ctx.errorCode = null;
    ctx.updatedAt = Date.now();

    const terminalResult = {
      ok: true,
      output: raw,
      status: 0,
      session: {
        mode,
        prompt,
        paging: false,
        awaitingConfirm: false,
      },
      mode,
    } as unknown as TerminalResult;

    if (!completeJobIfLastStep(job, terminalResult)) {
      ctx.phase = "pending";
      deferAdvanceJob(job.id, String(step.value || ""));
    }

    return true;
  }

  function stripCommandEchoFromLine(line: string, command: string): string {
    const rawLine = String(line ?? "").trim();
    const rawCommand = String(command ?? "").trim();

    if (!rawLine || !rawCommand) return rawLine;

    if (rawLine.toLowerCase() === rawCommand.toLowerCase()) {
      return "";
    }

    const lowerLine = rawLine.toLowerCase();
    const lowerCommand = rawCommand.toLowerCase();

    const gtIndex = lowerLine.indexOf(">" + lowerCommand);
    if (gtIndex >= 0) return "";

    const hashIndex = lowerLine.indexOf("#" + lowerCommand);
    if (hashIndex >= 0) return "";

    return rawLine;
  }

  function isConfigPromptText(value: string): boolean {
    return /\(config[^)]*\)#\s*$/.test(String(value ?? "").trim());
  }

  function nativeConfigCommandEchoAndPromptLooksComplete(
    lines: string[],
    command: string,
    prompt: string,
  ): boolean {
    const promptLine = lastNonEmptyLine(lines.join("\n"));
    const hasConfigPrompt = isConfigPromptText(prompt) || isConfigPromptText(promptLine);

    if (!hasConfigPrompt) return false;

    const hasCommandEcho = lines.some((line) => lineContainsCommandEcho(line, command));
    if (!hasCommandEcho) return false;

    return true;
  }

  function isEndCommand(command: string): boolean {
    return String(command ?? "").trim().toLowerCase() === "end";
  }

  function isPromptOnlyTransitionCommand(command: string): boolean {
    const normalized = String(command ?? "").trim().toLowerCase();

    return (
      normalized === "disable" ||
      normalized === "enable" ||
      normalized === "end" ||
      normalized === "exit"
    );
  }

  function nativePromptOnlyTransitionLooksComplete(
    lines: string[],
    command: string,
    prompt: string,
  ): boolean {
    if (!isPromptOnlyTransitionCommand(command)) return false;

    const hasCommandEcho = blockHasCommandEcho(lines, command);
    if (!hasCommandEcho) return false;

    const promptLine = lastNonEmptyLine(lines.join("\n"));
    const resolvedPrompt = String(prompt || promptLine || "").trim();

    return isIosPrompt(resolvedPrompt);
  }

  function blockHasCommandEcho(lines: string[], command: string): boolean {
    return lines.some((line) => lineContainsCommandEcho(line, command));
  }

  function nativeEndCommandLooksComplete(lines: string[], command: string, prompt: string): boolean {
    if (!isEndCommand(command)) return false;

    const hasCommandEcho = blockHasCommandEcho(lines, command);
    if (!hasCommandEcho) return false;

    const promptLine = lastNonEmptyLine(lines.join("\n"));
    const resolvedPrompt = String(prompt || promptLine || "").trim();

    return /^[A-Za-z0-9._-]+#\s*$/.test(resolvedPrompt) && !/\(config[^)]*\)#\s*$/.test(resolvedPrompt);
  }

  function nativeFallbackBlockLooksComplete(block: string, command: string, prompt: string): boolean {
    const text = normalizeEol(block);
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return false;

    const promptOk = isIosPrompt(prompt) || isIosPrompt(lastNonEmptyLine(text));
    if (!promptOk) return false;

    if (outputHasPager(text)) return false;

    const meaningfulLines = lines.filter((line) => {
      const stripped = stripCommandEchoFromLine(line, command);
      if (!stripped) return false;
      if (isIosPrompt(stripped)) return false;
      if (isPagerOnlyLine(stripped)) return false;
      return true;
    });

    if (meaningfulLines.length > 0) {
      return true;
    }

    if (nativeEndCommandLooksComplete(lines, command, prompt)) {
      return true;
    }

    if (nativePromptOnlyTransitionLooksComplete(lines, command, prompt)) {
      return true;
    }

    return nativeConfigCommandEchoAndPromptLooksComplete(lines, command, prompt);
  }

  function nativeHostFallbackBlockLooksComplete(block: string, command: string, prompt: string): boolean {
    const text = normalizeEol(block);
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) return false;

    const promptLine = lastNonEmptyLine(text);
    if (!isHostPrompt(promptLine)) return false;

    const normalizedCommand = normalizeCommandForFallback(command);
    const meaningfulLines = lines.filter((line) => {
      const normalizedLine = line.trim().toLowerCase();
      if (!normalizedLine) return false;
      if (normalizedLine === normalizedCommand) return false;
      if (isHostPrompt(line)) return false;
      if (/^cisco packet tracer pc command line/i.test(line)) return false;
      return true;
    });

    return meaningfulLines.length > 0;
  }

  function nativeOutputTailHasActivePager(output: string): boolean {
    const tail = normalizeEol(output).slice(-800);

    if (!tail.trim()) {
      return false;
    }

    return /--More--\s*$/i.test(tail) || /\s--More--\s*$/i.test(tail);
  }

  function getNativeInput(deviceName: string): string {
    try {
      const term = getNativeTerminalForDevice(deviceName);

      if (term && typeof term.getCommandInput === "function") {
        return String(term.getCommandInput() ?? "");
      }
    } catch {}

    return "";
  }

  function isBlankText(value: unknown): boolean {
    return String(value ?? "").replace(/\s+/g, "") === "";
  }

  function nativeInputIsOnlyPagerResidue(input: string): boolean {
    const value = String(input ?? "");

    if (value.length === 0) {
      return false;
    }

    return isBlankText(value);
  }

  function clearNativeInputIfPagerResidue(deviceName: string): void {
    try {
      const term = getNativeTerminalForDevice(deviceName);

      if (!term || typeof term.getCommandInput !== "function") {
        return;
      }

      const input = String(term.getCommandInput() ?? "");

      if (!nativeInputIsOnlyPagerResidue(input)) {
        return;
      }

      if (typeof term.enterChar === "function") {
        term.enterChar(13, 0);
      }
    } catch {}
  }

  function getNativeTerminalForDevice(device: string): any {
    try {
      const resolvedIpc = resolvePacketTracerIpc();
      const net = resolvedIpc && typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
      const dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;

      if (!dev) return null;

      try {
        if (typeof dev.getCommandLine === "function") {
          const term = dev.getCommandLine();
          if (term) return term;
        }
      } catch {}

      try {
        if (
          typeof dev.getConsole === "function" &&
          dev.getConsole() &&
          typeof dev.getConsole().getTerminalLine === "function"
        ) {
          const term = dev.getConsole().getTerminalLine();
          if (term) return term;
        }
      } catch {}

      return null;
    } catch {
      return null;
    }
  }

  function readNativeTerminalOutput(device: string): string {
    const term = getNativeTerminalForDevice(device);
    if (!term) return "";
    return readTerminalTextSafe(term);
  }

  function captureNativeBaselineForCurrentStep(job: ActiveJob): void {
    try {
      job.context.nativeBaselineOutput = readNativeTerminalOutput(job.device);
      job.context.nativeBaselineStep = job.context.currentStep;
    } catch {
      job.context.nativeBaselineOutput = "";
      job.context.nativeBaselineStep = job.context.currentStep;
    }
  }

  function getNativeDeltaForCurrentStep(_job: ActiveJob, currentOutput: string, command: string): string {
    const ctx = _job.context;
    const output = normalizeEol(currentOutput);
    const strict = extractCurrentCommandBlockStrict(output, command);
    const baseline = normalizeEol(ctx.nativeBaselineOutput || "");

    if (ctx.nativeBaselineStep !== ctx.currentStep) {
      if (strict.hasCommandEcho) {
        return strict.block;
      }

      if (isPromptOnlyTransitionCommand(command)) {
        return extractLatestCommandBlock(output, command).trim();
      }

      return "";
    }

    if (!baseline) {
      if (strict.hasCommandEcho) {
        return strict.block;
      }

      if (isPromptOnlyTransitionCommand(command)) {
        return extractLatestCommandBlock(output, command).trim();
      }

      return "";
    }

    if (output.length >= baseline.length && output.slice(0, baseline.length) === baseline) {
      const delta = output.slice(baseline.length).trim();
      if (!delta) {
        return isPromptOnlyTransitionCommand(command) ? extractLatestCommandBlock(output, command).trim() : "";
      }

      const deltaStrict = extractCurrentCommandBlockStrict(delta, command);
      if (deltaStrict.hasCommandEcho) {
        return deltaStrict.block;
      }

      const deltaBlock = extractLatestCommandBlock(delta, command).trim();
      return deltaBlock || "";
    }

    const marker = lastNonEmptyLine(baseline);
    const overlapStart = marker ? output.lastIndexOf(marker) : -1;

    if (overlapStart >= 0) {
      const afterOverlap = output.slice(overlapStart);
      const markerIndex = afterOverlap.indexOf(marker);

      if (markerIndex >= 0) {
        const sliced = afterOverlap.slice(markerIndex + marker.length).trim();
        if (sliced) {
          const slicedStrict = extractCurrentCommandBlockStrict(sliced, command);
          if (slicedStrict.hasCommandEcho) {
            return slicedStrict.block;
          }

          const slicedBlock = extractLatestCommandBlock(sliced, command).trim();
          if (slicedBlock) {
            return slicedBlock;
          }
        }
      }
    }

    if (isPromptOnlyTransitionCommand(command)) {
      return extractLatestCommandBlock(output, command).trim();
    }

    return strict.hasCommandEcho ? strict.block : "";
  }

  function getNativePrompt(device: string, output: string): string {
    try {
      const term = getNativeTerminalForDevice(device);
      if (term && typeof term.getPrompt === "function") {
        const prompt = String(term.getPrompt() || "").trim();
        if (prompt) return prompt;
      }
    } catch {}

    return inferPromptFromTerminalText(output);
  }

  function getNativeMode(device: string, prompt: string): string {
    try {
      const term = getNativeTerminalForDevice(device);
      if (term && typeof term.getMode === "function") {
        return normalizeIosMode(term.getMode(), prompt);
      }
    } catch {}

    return inferModeFromPrompt(prompt);
  }

  function outputHasPager(output: string): boolean {
    return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
  }

  function readPlanMaxPagerAdvances(ctx: JobContext): number {
    const value = Number((ctx.plan.payload as any)?.policies?.maxPagerAdvances ?? 25);

    if (!Number.isFinite(value) || value <= 0) {
      return 25;
    }

    return Math.max(1, Math.min(Math.floor(value), 200));
  }

  function normalizeCommandForFallback(command: unknown): string {
    return String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  }

  function isLongOutputReadOnlyIosCommand(command: unknown): boolean {
    const cmd = normalizeCommandForFallback(command);

    return (
      /^show\s+running-config\b/.test(cmd) ||
      /^show\s+startup-config\b/.test(cmd) ||
      /^show\s+interfaces?\b/.test(cmd) ||
      /^show\s+tech-support\b/.test(cmd) ||
      /^show\s+logging\b/.test(cmd) ||
      /^show\s+controllers\b/.test(cmd) ||
      /^show\s+processes\b/.test(cmd) ||
      /^show\s+inventory\b/.test(cmd) ||
      /^show\s+spanning-tree\b/.test(cmd) ||
      /^show\s+mac\s+address-table\b/.test(cmd) ||
      /^show\s+ip\s+route\b/.test(cmd)
    );
  }

  const PARTIAL_LONG_OUTPUT_WARNING =
    "Output posiblemente parcial: el comando largo terminó sin eco ni encabezado inicial esperado.";

  function firstMeaningfulNativeOutputLine(output: unknown, command?: string): string {
    const lines = normalizeEol(output)
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => {
        if (!line) return false;
        if (isIosPrompt(line)) return false;
        if (isPagerOnlyLine(line)) return false;
        if (command && lineContainsCommandEcho(line, command)) return false;
        return true;
      });

    return lines[0] ?? "";
  }

  function lineLooksLikeNativeInterfaceHeader(line: string): boolean {
    return /^(?:FastEthernet|GigabitEthernet|TenGigabitEthernet|Ethernet|Serial|Vlan|Port-channel|Loopback|Tunnel|Null)\S*\s+is\s+/i.test(
      String(line ?? "").trim(),
    );
  }

  function nativeLongOutputLooksPartial(args: {
    command: string;
    block: string;
    hasCommandEcho: boolean;
  }): boolean {
    if (!/^show\s+interfaces?\b/.test(normalizeCommandForFallback(args.command))) {
      return false;
    }

    const firstLine = firstMeaningfulNativeOutputLine(args.block, args.command);

    if (!firstLine) {
      return false;
    }

    return !lineLooksLikeNativeInterfaceHeader(firstLine);
  }

  function buildNativeLongOutputWarnings(args: {
    command: string;
    block: string;
    hasCommandEcho: boolean;
  }): string[] {
    return nativeLongOutputLooksPartial(args) ? [PARTIAL_LONG_OUTPUT_WARNING] : [];
  }

  function nativeLongOutputCanCompleteWithoutEcho(args: { block: string; command: string; prompt: string }): boolean {
    if (!isLongOutputReadOnlyIosCommand(args.command)) {
      return false;
    }

    const block = normalizeEol(args.block);
    const prompt = String(args.prompt ?? "").trim();

    if (!block.trim()) {
      return false;
    }

    if (outputHasPager(block)) {
      return false;
    }

    if (!isIosPrompt(prompt) && !isIosPrompt(lastNonEmptyLine(block))) {
      return false;
    }

    if (detectIosSemanticErrorFromOutput(block)) {
      return false;
    }

    const meaningfulLines = block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => {
        if (!line) return false;
        if (isIosPrompt(line)) return false;
        if (isPagerOnlyLine(line)) return false;
        return true;
      });

    const cmd = normalizeCommandForFallback(args.command);
    const minimumMeaningfulLines = /^show\s+startup-config\b/.test(cmd) ? 1 : 3;

    return meaningfulLines.length >= minimumMeaningfulLines;
  }

  function shouldTryNativeFallback(job: ActiveJob, now: number): boolean {
    const ctx = job.context as any;

    if (ctx.semanticErrorCleanupInProgress === true) {
      return false;
    }

    if (!job || ctx.finished === true || ctx.phase === "completed" || ctx.phase === "error") {
      return false;
    }

    const waitingPhase =
      ctx.phase === "waiting-command" ||
      ctx.phase === "waiting-ensure-mode";

    if (!waitingPhase) {
      return false;
    }

    if (ctx.waitingForCommandEnd !== true) {
      return false;
    }

    const ageMs = now - Number(ctx.updatedAt || ctx.startedAt || now);

    if (ageMs <= 750) {
      return false;
    }

    if (isDeviceTerminalBusy(job.device) && ageMs <= 1200) {
      return false;
    }

    return true;
  }

  function tickNativeFallback(job: ActiveJob, reason: string): boolean {
    const now = Date.now();

    jobDebug(
      job,
      "native-tick reason=" +
        reason +
        " phase=" +
        String(job.context.phase) +
        " waiting=" +
        String(job.context.waitingForCommandEnd) +
        " pending=" +
        String(job.pendingCommand === null ? "null" : "set") +
        " ageMs=" +
        String(now - Number(job.context.startedAt || now)) +
        " idleMs=" +
        String(now - Number(job.context.updatedAt || now)),
    );

    if (!shouldTryNativeFallback(job, now)) {
      return false;
    }

    return forceCompleteFromNativeTerminal(job, reason);
  }

  function jobDebug(job: ActiveJob, message: string): void {
    try {
      const ctx = job.context as any;

      if (!ctx.debug) {
        ctx.debug = [];
      }

      ctx.debug.push(Date.now() + " " + message);

      if (ctx.debug.length > 100) {
        ctx.debug.splice(0, ctx.debug.length - 100);
      }
    } catch {}

    try {
      execLog("JOB DEBUG id=" + job.id + " " + message);
    } catch {}
  }

  function advanceNativePager(device: string): boolean {
    try {
      const term = getNativeTerminalForDevice(device);
      if (!term || typeof term.enterChar !== "function") return false;
      term.enterChar(32, 0);
      return true;
    } catch {
      return false;
    }
  }

  function extractLatestCommandBlock(output: string, command: string): string {
    const text = normalizeEol(output);
    const cmd = String(command || "").trim();

    if (!text.trim() || !cmd) return text;

    const lines = text.split("\n");
    let startIndex = -1;

    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = String(lines[i] || "").trim();

      if (line === cmd || line.endsWith(">" + cmd) || line.endsWith("#" + cmd)) {
        startIndex = i;
        break;
      }
    }

    if (startIndex === -1) {
      const idx = text.lastIndexOf(cmd);
      if (idx >= 0) return text.slice(idx);
      return text;
    }

    return lines.slice(startIndex).join("\n");
  }

  function extractCurrentCommandBlockStrict(
    output: string,
    command: string,
  ): { block: string; hasCommandEcho: boolean } {
    const text = normalizeEol(output);
    const cmd = String(command || "").trim();

    if (!text.trim() || !cmd) {
      return { block: "", hasCommandEcho: false };
    }

    const lines = text.split("\n");
    let startIndex = -1;

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (lineContainsCommandEcho(lines[index] || "", cmd)) {
        startIndex = index;
        break;
      }
    }

    if (startIndex < 0) {
      return { block: "", hasCommandEcho: false };
    }

    let endIndex = lines.length;

    for (let index = startIndex + 1; index < lines.length; index += 1) {
      const line = String(lines[index] || "").trim();

      if (index > startIndex + 1 && isIosPrompt(line)) {
        endIndex = index + 1;
        break;
      }
    }

    return {
      block: lines.slice(startIndex, endIndex).join("\n").trim(),
      hasCommandEcho: true,
    };
  }

  function appendStepOutput(current: string, next: unknown): string {
    const value = String(next ?? "");

    if (!value.trim()) {
      return current;
    }

    if (!current.trim()) {
      return value;
    }

    return current.replace(/\s+$/g, "") + "\n" + value.replace(/^\s+/g, "");
  }

  function detectIosSemanticErrorFromOutput(output: unknown): { code: string; message: string } | null {
    const text = String(output ?? "");

    if (!text.trim()) {
      return null;
    }

    if (/%\s*Invalid input detected/i.test(text)) {
      return {
        code: "IOS_INVALID_INPUT",
        message: text.trim(),
      };
    }

    if (/%\s*Incomplete command/i.test(text)) {
      return {
        code: "IOS_INCOMPLETE_COMMAND",
        message: text.trim(),
      };
    }

    if (/%\s*Ambiguous command/i.test(text)) {
      return {
        code: "IOS_AMBIGUOUS_COMMAND",
        message: text.trim(),
      };
    }

    if (/%\s*Unknown command/i.test(text)) {
      return {
        code: "IOS_UNKNOWN_COMMAND",
        message: text.trim(),
      };
    }

    return null;
  }

function semanticErrorNeedsCleanupToPrivilegedExec(
    _job: ActiveJob,
    prompt: unknown,
    mode: unknown,
  ): boolean {
    return nativeSnapshotIsStillInConfigMode({ prompt, mode });
  }

  function buildSemanticErrorResult(
    semanticError: { code: string; message: string },
    prompt: unknown,
    mode: unknown,
    cleanupOutput?: string,
  ): TerminalResult {
    const baseMessage = semanticError.message.replace(/\s+$/g, "");
    const message = cleanupOutput
      ? baseMessage + "\n\n[cleanup]\n" + cleanupOutput.replace(/^\s+/g, "")
      : baseMessage;

    return {
      ok: false,
      output: message,
      rawOutput: message,
      raw: message,
      status: 1,
      error: message,
      code: semanticError.code,
      prompt: String(prompt || ""),
      mode: String(mode || ""),
    } as any;
  }

  function extractNativeCleanupOutputSinceBaseline(fullOutput: string, baselineOutput: string): string {
    const normalizedFull = normalizeEol(fullOutput);
    const normalizedBaseline = normalizeEol(baselineOutput);

    if (!normalizedFull.trim()) {
      return "";
    }

    if (normalizedBaseline && normalizedFull.startsWith(normalizedBaseline)) {
      const delta = normalizedFull.slice(normalizedBaseline.length).trim();
      if (delta) {
        return delta;
      }
    }

    const block = extractLatestCommandBlock(normalizedFull, "end").trim();
    if (block && block !== normalizedFull.trim()) {
      return block;
    }

    return "";
  }

  function finishJobWithSemanticError(
    job: ActiveJob,
    semanticError: { code: string; message: string },
    prompt: unknown,
    mode: unknown,
    cleanupOutput?: string,
  ): void {
    const ctx = job.context;
    const finalResult = buildSemanticErrorResult(semanticError, prompt, mode, cleanupOutput);

    job.pendingCommand = null;
    ctx.waitingForCommandEnd = false;
    ctx.pendingDelay = null;
    ctx.outputBuffer = appendStepOutput(ctx.outputBuffer, finalResult.output);
    ctx.error = finalResult.output;
    ctx.errorCode = semanticError.code;
    ctx.phase = "completed";
    ctx.finished = true;
    ctx.updatedAt = Date.now();
    ctx.result = finalResult;
    (ctx as any).semanticErrorCleanupInProgress = false;
    wakePendingJobsForDevice(job.device);
  }

  function sendNativeEndForSemanticCleanup(job: ActiveJob): boolean {
    try {
      const term = getNativeTerminalForDevice(job.device);

      if (!term || typeof term.enterCommand !== "function") {
        execLog("JOB SEMANTIC ERROR CLEANUP END NATIVE unavailable id=" + job.id + " device=" + job.device);
        return false;
      }

      term.enterCommand("end");
      return true;
    } catch (error) {
      execLog(
        "JOB SEMANTIC ERROR CLEANUP END NATIVE threw id=" +
          job.id +
          " device=" +
          job.device +
          " error=" +
          String(error),
      );
      return false;
    }
  }

  function finishSemanticCleanupFromNativeSnapshot(
    job: ActiveJob,
    semanticError: { code: string; message: string },
    fallbackPrompt: unknown,
    fallbackMode: unknown,
    cleanupBaselineOutput: string,
  ): void {
    const ctx = job.context;

    if (ctx.finished === true) {
      return;
    }

    const fullOutput = readNativeTerminalOutput(job.device);
    const cleanupOutput = extractNativeCleanupOutputSinceBaseline(fullOutput, cleanupBaselineOutput);
    const prompt = getNativePrompt(job.device, fullOutput) || String(fallbackPrompt || "");
    const mode = getNativeMode(job.device, prompt) || String(fallbackMode || "");

    finishJobWithSemanticError(job, semanticError, prompt, mode, cleanupOutput);
  }

  function cleanupToPrivilegedExecBeforeSemanticError(
    job: ActiveJob,
    semanticError: { code: string; message: string },
    prompt: unknown,
    mode: unknown,
  ): boolean {
    const ctx = job.context;

    if ((ctx as any).semanticErrorCleanupInProgress === true) {
      execLog("JOB SEMANTIC ERROR CLEANUP already-in-progress id=" + job.id + " device=" + job.device);
      return true;
    }

    (ctx as any).semanticErrorCleanupInProgress = true;
    (ctx as any).semanticErrorOriginal = semanticError;
    ctx.error = semanticError.message;
    ctx.errorCode = semanticError.code;

    if (!semanticErrorNeedsCleanupToPrivilegedExec(job, prompt, mode)) {
      finishJobWithSemanticError(job, semanticError, prompt, mode);
      return true;
    }

    execLog(
      "JOB SEMANTIC ERROR CLEANUP END id=" +
        job.id +
        " device=" +
        job.device +
        " prompt=" +
        String(prompt || "") +
        " mode=" +
        String(mode || ""),
    );

    try {
      const cleanupBaselineOutput = readNativeTerminalOutput(job.device);
      const sent = sendNativeEndForSemanticCleanup(job);

      job.pendingCommand = null;
      ctx.waitingForCommandEnd = false;
      ctx.pendingDelay = 650;
      ctx.phase = "waiting-delay";
      ctx.updatedAt = Date.now();

      if (!sent) {
        finishJobWithSemanticError(job, semanticError, prompt, mode);
        return true;
      }

      const cleanupStartedAt = Date.now();

      setTimeout(function semanticCleanupTick() {
        if (ctx.finished === true) {
          return;
        }

        if (isDeviceTerminalBusy(job.device) && Date.now() - cleanupStartedAt <= 1200) {
          ctx.updatedAt = Date.now();
          ctx.pendingDelay = 100;
          setTimeout(semanticCleanupTick, 100);
          return;
        }

        const fullOutput = readNativeTerminalOutput(job.device);
        const currentPrompt = getNativePrompt(job.device, fullOutput);
        const currentMode = getNativeMode(job.device, currentPrompt);

        if (nativeSnapshotIsStillInConfigMode({ prompt: currentPrompt, mode: currentMode })) {
          execLog(
            "JOB SEMANTIC ERROR CLEANUP END RETRY id=" +
              job.id +
              " device=" +
              job.device +
              " prompt=" +
              currentPrompt +
              " mode=" +
              currentMode,
          );

          if (sendNativeEndForSemanticCleanup(job)) {
            ctx.updatedAt = Date.now();
            ctx.pendingDelay = 650;
            setTimeout(semanticCleanupTick, 650);
            return;
          }

          finishSemanticCleanupFromNativeSnapshot(job, semanticError, prompt, mode, cleanupBaselineOutput);
          return;
        }

        finishSemanticCleanupFromNativeSnapshot(job, semanticError, currentPrompt, currentMode, cleanupBaselineOutput);
      }, 650);

      return true;
    } catch (err) {
      execLog(
        "JOB SEMANTIC ERROR CLEANUP END THREW id=" +
          job.id +
          " device=" +
          job.device +
          " error=" +
          String(err),
      );

      finishJobWithSemanticError(job, semanticError, prompt, mode);
      return true;
    }
  }

  function isLikelyConfigStep(command: string): boolean {
    const normalized = String(command ?? "").trim().toLowerCase();

    return (
      normalized === "configure terminal" ||
      normalized === "end" ||
      /^interface\b/.test(normalized) ||
      /^vlan\b/.test(normalized) ||
      /^no\s+vlan\b/.test(normalized) ||
      /^router\b/.test(normalized) ||
      /^line\b/.test(normalized) ||
      /^hostname\b/.test(normalized) ||
      /^ip\s+/.test(normalized) ||
      /^no\s+ip\s+/.test(normalized) ||
      /^spanning-tree\b/.test(normalized) ||
      /^switchport\b/.test(normalized) ||
      /^shutdown$/.test(normalized) ||
      /^no\s+shutdown$/.test(normalized) ||
      /^description\b/.test(normalized) ||
      /^no\s+description$/.test(normalized)
    );
  }

  function deferAdvanceJob(jobId: string, command: string): void {
    const delayMs = isLikelyConfigStep(command) ? 350 : 25;

    if (delayMs <= 0) {
      advanceJob(jobId);
      return;
    }

    setTimeout(function () {
      advanceJob(jobId);
    }, delayMs);
  }

  function forceCompleteFromNativeTerminal(job: ActiveJob, reason: string): boolean {
    const ctx = job.context;

    if ((ctx as any).semanticErrorCleanupInProgress === true) {
      jobDebug(job, "native-fallback-skip-semantic-cleanup reason=" + reason);
      return false;
    }

    const step = getCurrentStep(ctx);
    const command = String(step?.value || "");

    if (!step || !command) return false;

    jobDebug(job, "native-fallback-enter reason=" + reason);

    const fullOutput = readNativeTerminalOutput(job.device);
    const output = getNativeDeltaForCurrentStep(job, fullOutput, command);
    const fallbackOutput = output || (isLongOutputReadOnlyIosCommand(command) ? fullOutput : "");
    jobDebug(
      job,
      "native-output-len=" +
        String(fullOutput.length) +
        " deltaLen=" +
        String(fallbackOutput.length) +
        " baselineStep=" +
        String(ctx.nativeBaselineStep) +
        " currentStep=" +
        String(ctx.currentStep),
    );

    if (!fallbackOutput.trim()) {
      jobDebug(job, "native-no-output");
      return false;
    }

    if (outputHasPager(fallbackOutput)) {
      const advanced = advanceNativePager(job.device);
      execLog(
        "JOB NATIVE PAGER id=" +
          job.id +
          " device=" +
          job.device +
          " advanced=" +
          advanced,
      );

      ctx.updatedAt = Date.now();
      return false;
    }

    if (nativeOutputTailHasActivePager(fallbackOutput)) {
      const advanced = advanceNativePager(job.device);

      jobDebug(
        job,
        "native-active-pager advanced=" +
          String(advanced) +
          " tail=" +
          JSON.stringify(normalizeEol(output).slice(-300)),
      );

      ctx.paged = true;
      ctx.updatedAt = Date.now();

      return false;
    }

    const prompt = getNativePrompt(job.device, output);
    const mode = getNativeMode(job.device, prompt);

    const nativeInput = getNativeInput(job.device);
    jobDebug(job, "native-input=" + JSON.stringify(nativeInput));

    if (nativeInputIsOnlyPagerResidue(nativeInput)) {
      clearNativeInputIfPagerResidue(job.device);
    }

    if (step.type === "ensure-mode") {
      jobDebug(
        job,
        "native-ensure-check command=" +
          JSON.stringify(command) +
          " prompt=" +
          JSON.stringify(prompt) +
          " mode=" +
          JSON.stringify(mode),
      );

      return completeEnsureModeFromNativeTerminal(job, step, prompt, mode);
    }

    const strictBlock = extractCurrentCommandBlockStrict(fallbackOutput, command);
    const block = strictBlock.hasCommandEcho
      ? strictBlock.block
      : extractLatestCommandBlock(fallbackOutput, command);
    const baselinePrompt = inferPromptFromTerminalText(ctx.nativeBaselineOutput || "");
    const baselineMode = inferModeFromPrompt(baselinePrompt);

    const semanticError = strictBlock.hasCommandEcho
      ? detectIosSemanticErrorFromOutput(strictBlock.block)
      : nativeSnapshotIsStillInConfigMode({ prompt: baselinePrompt, mode: baselineMode })
        ? detectIosSemanticErrorFromOutput(fallbackOutput)
        : null;

    if (semanticError) {
      execLog(
        "JOB NATIVE IOS SEMANTIC ERROR id=" +
          job.id +
          " device=" +
          job.device +
          " command=" +
          command +
          " code=" +
          semanticError.code,
      );

      return cleanupToPrivilegedExecBeforeSemanticError(job, semanticError, prompt, mode);
    }

    const longOutputBlock = block || output;

    const echoLessLongOutputComplete = nativeLongOutputCanCompleteWithoutEcho({
      block: longOutputBlock,
      command,
      prompt,
    });
    const hostOutputComplete =
      resolveJobSessionKind(job) === "host" && nativeHostFallbackBlockLooksComplete(longOutputBlock, command, prompt);

    const complete = nativeFallbackBlockLooksComplete(block, command, prompt) || echoLessLongOutputComplete || hostOutputComplete;

    if (
      !strictBlock.hasCommandEcho &&
      !echoLessLongOutputComplete &&
      !hostOutputComplete &&
      !isEndCommand(command) &&
      !isPromptOnlyTransitionCommand(command)
    ) {
      execLog(
        "JOB NATIVE REFUSE STALE BLOCK id=" +
          job.id +
          " device=" +
          job.device +
          " command=" +
          command +
          " step=" +
          ctx.currentStep +
          " blockTail=" +
          longOutputBlock.slice(-240),
      );

      return false;
    }

    if (echoLessLongOutputComplete) {
      jobDebug(
        job,
        "native-long-output-complete-without-echo command=" +
          JSON.stringify(command) +
          " prompt=" +
          JSON.stringify(prompt) +
          " blockLen=" +
          String(longOutputBlock.length),
      );
    }

    if (hostOutputComplete) {
      jobDebug(
        job,
        "native-host-output-complete-without-echo command=" +
          JSON.stringify(command) +
          " prompt=" +
          JSON.stringify(prompt) +
          " blockLen=" +
          String(longOutputBlock.length),
      );
    }

    jobDebug(
      job,
      "native-check command=" +
        JSON.stringify(command) +
        " prompt=" +
        JSON.stringify(prompt) +
        " mode=" +
        JSON.stringify(mode) +
        " blockLen=" +
        String(block.length) +
        " complete=" +
        String(complete) +
        " promptOk=" +
        String(isIosPrompt(prompt) || isIosPrompt(lastNonEmptyLine(block))) +
        " pager=" +
        String(outputHasPager(block)) +
        " blockHead=" +
        JSON.stringify(block.slice(0, 300)) +
        " blockTail=" +
        JSON.stringify(block.slice(-300)),
    );

    if (!complete) {
      execLog(
        "JOB NATIVE INCOMPLETE id=" +
          job.id +
          " device=" +
          job.device +
          " command=" +
          command +
          " prompt=" +
          prompt +
          " blockTail=" +
          block.slice(-300),
      );
      return false;
    }

    if (jobRequiresPrivilegedExecFinalMode(job) && nativeSnapshotIsStillInConfigMode({ prompt, mode })) {
      if (hasRemainingEndStep(job)) {
        execLog(
          "JOB NATIVE FORCE STEP CONFIG MODE WITH END PENDING id=" +
            job.id +
            " device=" +
            job.device +
            " step=" +
            ctx.currentStep +
            "/" +
            ctx.plan.plan.length +
            " nextCommand=" +
            JSON.stringify(getNextCommandStep(job)),
        );
      }

      execLog(
        "JOB NATIVE FORCE REFUSE FINAL CONFIG MODE id=" +
          job.id +
          " device=" +
          job.device +
          " step=" +
          ctx.currentStep +
          "/" +
          ctx.plan.plan.length +
          " prompt=" +
          String(prompt || "") +
          " mode=" +
          String(mode || ""),
      );

      return false;
    }

    execLog(
      "JOB FORCE COMPLETE FROM NATIVE TERMINAL id=" +
        job.id +
        " device=" +
        job.device +
        " reason=" +
        reason +
        " prompt=" +
        prompt +
        " mode=" +
        mode +
        " blockLen=" +
        block.length,
    );

    job.pendingCommand = null;
    ctx.waitingForCommandEnd = false;
    ctx.outputBuffer = appendStepOutput(ctx.outputBuffer, block);
    ctx.lastPrompt = prompt;
    ctx.lastMode = mode;
    ctx.paged = false;

    ctx.stepResults.push({
      stepIndex: ctx.currentStep,
      stepType: step.type,
      command,
      raw: block,
      status: 0,
      completedAt: Date.now(),
      warnings: buildNativeLongOutputWarnings({
        command,
        block: longOutputBlock || block,
        hasCommandEcho: strictBlock.hasCommandEcho,
      }),
    } as any);

    const semanticCleanupActive = (ctx as any).semanticErrorCleanupInProgress === true;

    ctx.currentStep++;
    if (!semanticCleanupActive) {
      ctx.error = null;
      ctx.errorCode = null;
    }
    ctx.updatedAt = Date.now();

    const nativeWarnings = buildNativeLongOutputWarnings({
      command,
      block: longOutputBlock || block,
      hasCommandEcho: strictBlock.hasCommandEcho,
    });

    const terminalResult = {
      ok: true,
      output: block,
      rawOutput: block,
      raw: block,
      status: 0,
      session: {
        mode,
        prompt,
        paging: false,
        awaitingConfirm: false,
      },
      mode,
      warnings: nativeWarnings,
      diagnostics: {
        statusCode: 0,
        completionReason: echoLessLongOutputComplete
          ? "native-long-output-without-echo"
          : hostOutputComplete
            ? "native-host-output-without-echo"
          : "native-fallback-complete",
        partialOutput: nativeWarnings.length > 0,
      },
    } as unknown as TerminalResult;

    if (semanticCleanupActive) {
      ctx.phase = "waiting-delay";
      return true;
    }

    if (!completeJobIfLastStep(job, terminalResult)) {
      ctx.phase = "pending";
      advanceJob(job.id);
    }

    return true;
  }

  function reapStaleJobs(): void {
    // No loguear cada tick en idle; solo loguear cuando se recoja un job stale.
    const now = Date.now();

    for (const key in jobs) {
      const job = jobs[key];
      if (!job || job.context.finished || job.context.phase === "completed" || job.context.phase === "error") {
        continue;
      }

      const completedFromNative = tickNativeFallback(job, "reapStaleJobs");

      if (completedFromNative) {
        continue;
      }

      if (job.pendingCommand === null) {
        continue;
      }

      const elapsedMs = now - job.context.updatedAt;
      const withinTimeout = elapsedMs <= getJobTimeoutMs(job);
      const waitingForCommandEnd = job.context.waitingForCommandEnd === true;
      const waitingPhase =
        job.context.phase === "waiting-command" ||
        job.context.phase === "waiting-ensure-mode";

      if (
        waitingForCommandEnd &&
        waitingPhase &&
        elapsedMs > 500 &&
        (job.context as any).semanticErrorCleanupInProgress !== true
      ) {
        try {
          const completedFromNative = forceCompleteFromNativeTerminal(
            job,
            "reapStaleJobs elapsedMs=" + elapsedMs,
          );

          if (completedFromNative) {
            continue;
          }
        } catch (error) {
          execLog(
            "JOB NATIVE FALLBACK ERROR id=" +
              job.id +
              " device=" +
              job.device +
              " error=" +
              String(error),
          );
        }
      }

      if (withinTimeout) {
        const output = String(job.context.outputBuffer ?? "");
        const lastPrompt = String(job.context.lastPrompt ?? "");

        const looksBackAtPrompt =
          /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(lastPrompt.trim());

        const hasOutput = output.trim().length > 0;

        if (
          waitingForCommandEnd &&
          job.context.phase === "waiting-command" &&
          looksBackAtPrompt &&
          hasOutput &&
          now - job.context.updatedAt > 750
        ) {
          const currentStepForPromptForce = getCurrentStep(job.context);
          const isLastStepForPromptForce =
            job.context.currentStep >= job.context.plan.plan.length - 1;

          if (currentStepForPromptForce && !isLastStepForPromptForce) {
            try {
              job.context.debug.push(
                String(Date.now()) +
                  " prompt-force-skip-non-final step=" +
                  String(job.context.currentStep) +
                  "/" +
                  String(job.context.plan.plan.length - 1) +
                  " command=" +
                  String((currentStepForPromptForce as any).value || (currentStepForPromptForce as any).command || "") +
                  " prompt=" +
                  String(prompt || ""),
              );
            } catch {}

            execLog(
              "JOB PROMPT FORCE SKIP non-final id=" +
                job.id +
                " device=" +
                job.device +
                " step=" +
                job.context.currentStep +
                "/" +
                (job.context.plan.plan.length - 1) +
                " prompt=" +
                String(lastPrompt || ""),
            );

            job.context.updatedAt = Date.now();
            continue;
          }

          const promptForceCurrentStep = currentStepForPromptForce;
          const promptForceCommand = String(
            (promptForceCurrentStep as any)?.value ??
              (promptForceCurrentStep as any)?.command ??
              "",
          ).trim();

          const nativeOutputForPromptForce = readNativeTerminalOutput(job.device);
          const nativePromptForPromptForce = getNativePrompt(job.device, nativeOutputForPromptForce);
          const nativeModeForPromptForce = getNativeMode(job.device, nativePromptForPromptForce);

          if (
            promptForceCommand.toLowerCase() === "end" &&
            nativePromptForPromptForce &&
            nativePromptForPromptForce !== lastPrompt
          ) {
            execLog(
              "JOB PROMPT FORCE SKIP stale prompt for end id=" +
                job.id +
                " device=" +
                job.device +
                " lastPrompt=" +
                String(lastPrompt || "") +
                " nativePrompt=" +
                String(nativePromptForPromptForce || "") +
                " nativeMode=" +
                String(nativeModeForPromptForce || ""),
            );

            job.context.updatedAt = now;
            continue;
          }

          if (
            jobRequiresPrivilegedExecFinalMode(job) &&
            nativeSnapshotIsStillInConfigMode({
              prompt: lastPrompt,
              mode: job.context.lastMode,
            })
          ) {
            execLog(
              "JOB PROMPT FORCE REFUSE CONFIG MODE id=" +
                job.id +
                " device=" +
                job.device +
                " step=" +
                job.context.currentStep +
                "/" +
                job.context.plan.plan.length +
                " prompt=" +
                String(lastPrompt || "") +
                " mode=" +
                String(job.context.lastMode || ""),
            );

            job.context.updatedAt = now;
            continue;
          }

          execLog(
            "JOB FORCE COMPLETE FROM PROMPT id=" +
              job.id +
              " device=" +
              job.device +
              " prompt=" +
              lastPrompt,
          );

          job.pendingCommand = null;
          job.context.waitingForCommandEnd = false;
          job.context.phase = "completed";
          job.context.finished = true;
          job.context.error = null;
          job.context.errorCode = null;
          job.context.updatedAt = now;

          job.context.result = {
            ok: true,
            output,
            status: 0,
            prompt: lastPrompt,
            mode: job.context.lastMode,
          } as any;

          cleanupConfigSession(job.device, job.context.lastMode, job.context.lastPrompt);
          wakePendingJobsForDevice(job.device);
        }
        continue;
      }

      execLog("JOB TIMEOUT id=" + job.id + " device=" + job.device + " phase=" + job.context.phase);
      job.pendingCommand = null;
      job.context.phase = "error";
      job.context.finished = true;
      job.context.error = "Job timed out while waiting for terminal command completion";
      job.context.errorCode = "JOB_TIMEOUT";
      job.context.updatedAt = now;
      cleanupConfigSession(job.device, job.context.lastMode, job.context.lastPrompt);
      wakePendingJobsForDevice(job.device);
    }
  }

  function wakePendingJobsForDevice(device: string): void {
    if (isDeviceTerminalBusy(device)) {
      execLog("WAKE DEFERRED terminal busy device=" + device);
      return;
    }

    setTimeout(function () {
      for (const key in jobs) {
        const other = jobs[key];
        if (!other) continue;
        if (other.device !== device) continue;
        if (isJobFinished(key)) continue;
        if (other.pendingCommand !== null) continue;
        advanceJob(key);
      }
    }, 0);
  }

  function modeMatches(actual: unknown, expected: unknown): boolean {
    const current = String(actual ?? "").trim();
    const target = String(expected ?? "").trim();

    if (!target) return true;
    if (current === target) return true;

    if (target === "global-config" || target === "config") {
      return isConfigMode(current);
    }

    if (target === "privileged-exec") {
      return current === "privileged-exec";
    }

    return false;
  }

  function inferModeFromPrompt(prompt: string): string {
    return normalizeIosMode("unknown", prompt);
  }

  function readSession(device: string): { mode: string; prompt: string } {
    try {
      const session = terminal.getSession(device) as any;
      const prompt = String(session?.prompt ?? "");
      const mode = String(session?.mode ?? "unknown");

      return {
        mode: mode === "unknown" ? inferModeFromPrompt(prompt) : mode,
        prompt,
      };
    } catch {
      return { mode: "unknown", prompt: "" };
    }
  }

  function commandForEnsureMode(currentMode: string, targetMode: string): string | null {
    if (modeMatches(currentMode, targetMode)) return null;

    if (targetMode === "privileged-exec") {
      if (isConfigMode(currentMode)) return "end";
      return "enable";
    }

    if (targetMode === "global-config" || targetMode === "config") {
      if (currentMode === "user-exec" || currentMode === "unknown") return "enable";
      if (currentMode === "privileged-exec") return "configure terminal";
    }

    return null;
  }

  function completeJobIfLastStep(job: ActiveJob, result: TerminalResult | null): boolean {
    const ctx = job.context;

    if (ctx.currentStep < ctx.plan.plan.length) {
      return false;
    }

    execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
    ctx.phase = "completed";
    ctx.result = result;
    ctx.finished = true;
    ctx.updatedAt = Date.now();
    wakePendingJobsForDevice(job.device);
    return true;
  }

  function promptMatches(prompt: string, expectedPrompt: string): boolean {
    if (!expectedPrompt) return true;
    if (prompt.indexOf(expectedPrompt) >= 0) return true;

    try {
      return new RegExp(expectedPrompt).test(prompt);
    } catch {
      return false;
    }
  }

  function getCurrentStep(ctx: JobContext): DeferredStep | null {
    if (ctx.currentStep >= ctx.plan.plan.length) return null;
    return ctx.plan.plan[ctx.currentStep];
  }

  function isIosConfigPromptText(value: unknown): boolean {
    const text = String(value ?? "").trim();

    return /\(config[^)]*\)#\s*$/.test(text);
  }

  function isIosConfigModeText(value: unknown): boolean {
    const text = String(value ?? "").trim().toLowerCase();

    return (
      text === "config" ||
      text === "global-config" ||
      text === "interface-config" ||
      text === "router-config" ||
      text === "line-config" ||
      text.startsWith("config") ||
      text.endsWith("-config")
    );
  }

  function jobRequiresPrivilegedExecFinalMode(job: ActiveJob): boolean {
    const targetMode = String((job.context as any)?.targetMode ?? (job.context as any)?.plan?.targetMode ?? "").trim();

    return targetMode === "privileged-exec";
  }

  function resolveJobSessionKind(job: ActiveJob): "ios" | "host" {
    const payload = job.context.plan.payload as any;
    const sessionKind = String(payload?.metadata?.sessionKind ?? payload?.sessionKind ?? "").trim().toLowerCase();

    if (sessionKind === "host") {
      return "host";
    }

    if (String(payload?.metadata?.deviceKind ?? "").trim().toLowerCase() === "host") {
      return "host";
    }

    return "ios";
  }

  function nativeSnapshotIsStillInConfigMode(snapshot: { prompt?: unknown; mode?: unknown }): boolean {
    return isIosConfigPromptText(snapshot.prompt) || isIosConfigModeText(snapshot.mode);
  }

  function getNextCommandStep(job: ActiveJob): string {
    const ctx = job.context;
    const nextStep = ctx.plan.plan[ctx.currentStep + 1];

    if (!nextStep || nextStep.type !== "command") {
      return "";
    }

    return String(nextStep.value ?? "").trim();
  }

  function hasRemainingEndStep(job: ActiveJob): boolean {
    const ctx = job.context;

    for (let index = ctx.currentStep + 1; index < ctx.plan.plan.length; index += 1) {
      const step = ctx.plan.plan[index];

      if (step && step.type === "command" && String(step.value ?? "").trim().toLowerCase() === "end") {
        return true;
      }
    }

    return false;
  }

  function executeCurrentStep(job: ActiveJob): void {
    const ctx = job.context;
    const step = getCurrentStep(ctx);

    if (!step) {
      execLog("JOB COMPLETE id=" + job.id + " device=" + job.device);
      ctx.phase = "completed";
      ctx.finished = true;
      return;
    }

    const stepType = step.type;
    const timeout = step.options?.timeoutMs ?? ctx.plan.options.commandTimeoutMs;
    const stopOnError = step.options?.stopOnError ?? ctx.plan.options.stopOnError;

    switch (stepType) {
      case "delay": {
        const delayMs = parseInt(step.value || "1000", 10);
        execLog("DELAY id=" + job.id + " ms=" + delayMs);
        ctx.phase = "waiting-delay";
        ctx.pendingDelay = delayMs;
        setTimeout(function () {
          ctx.pendingDelay = null;
          advanceJob(job.id);
        }, delayMs);
        break;
      }

      case "ensure-mode": {
        const targetMode = String(
          (step as any).expectMode ||
            (step.options as any)?.expectedMode ||
            step.value ||
            "privileged-exec",
        );

        const session = readSession(job.device);
        const command = commandForEnsureMode(session.mode, targetMode);

        ctx.phase = "waiting-ensure-mode";
        ctx.lastMode = session.mode;
        ctx.lastPrompt = session.prompt;

        if (!targetMode || command === null) {
          if (targetMode && !modeMatches(session.mode, targetMode)) {
            execLog("ENSURE MODE unsupported target=" + targetMode + " current=" + session.mode + " id=" + job.id);
            if (stopOnError) {
              ctx.phase = "error";
              ctx.error = "Cannot ensure terminal mode " + targetMode + " from " + session.mode;
              ctx.errorCode = "ENSURE_MODE_UNSUPPORTED";
              ctx.finished = true;
              ctx.updatedAt = Date.now();
              wakePendingJobsForDevice(job.device);
              return;
            }
          }

          ctx.stepResults.push({
            stepIndex: ctx.currentStep,
            stepType: stepType,
            command: "",
            raw: "",
            status: 0,
            completedAt: Date.now(),
          });
          ctx.currentStep++;
          ctx.phase = "pending";
          ctx.updatedAt = Date.now();
          if (!completeJobIfLastStep(job, null)) deferAdvanceJob(job.id, String(command || ""));
          return;
        }

        execLog(
          "ENSURE MODE id=" +
            job.id +
            " device=" +
            job.device +
            " current=" +
            session.mode +
            " target=" +
            targetMode +
            " cmd='" +
            command +
            "'",
        );

        const ensureModeTimeoutMs = Number((step.options as any)?.timeoutMs ?? 8000);

        ctx.waitingForCommandEnd = true;
        captureNativeBaselineForCurrentStep(job);
        job.pendingCommand = terminal.executeCommand(job.device, command, {
          commandTimeoutMs: ensureModeTimeoutMs,
          stallTimeoutMs: ctx.plan.options.stallTimeoutMs,
          expectedMode: targetMode as any,
          allowPager: false,
          autoAdvancePager: false,
          maxPagerAdvances: 0,
          autoConfirm: false,
          autoDismissWizard: true,
          allowEmptyOutput: true,
          sendEnterFallback: false,
          sessionKind: resolveJobSessionKind(job),
        });

        const runningCommand = job.pendingCommand;

        runningCommand
          .then(function (result) {
            if (ctx.finished) return;
            if (job.pendingCommand !== runningCommand) {
              execLog(
                "STALE ENSURE-MODE RESULT ignored id=" +
                  job.id +
                  " device=" +
                  job.device +
                  " step=" +
                  ctx.currentStep,
              );
              return;
            }

            job.pendingCommand = null;
            ctx.waitingForCommandEnd = false;
            ctx.outputBuffer = appendStepOutput(ctx.outputBuffer, result.output);
            ctx.lastPrompt = result.session.prompt;
            ctx.lastMode = result.session.mode;
            ctx.paged = result.session.paging;

            ctx.stepResults.push({
              stepIndex: ctx.currentStep,
              stepType: stepType,
              command: command,
              raw: result.output,
              status: result.status,
              completedAt: Date.now(),
            });

            if (!modeMatches(result.session.mode, targetMode)) {
              execLog(
                "ENSURE MODE FAILED id=" +
                  job.id +
                  " expected=" +
                  targetMode +
                  " actual=" +
                  result.session.mode,
              );
              ctx.phase = "error";
              ctx.error = "Expected mode " + targetMode + ", got " + result.session.mode;
              ctx.errorCode = "ENSURE_MODE_FAILED";
              ctx.finished = true;
              ctx.updatedAt = Date.now();
              cleanupConfigSession(job.device, result.session.mode, result.session.prompt);
              wakePendingJobsForDevice(job.device);
              return;
            }

            ctx.currentStep++;
            ctx.phase = "pending";
            ctx.error = null;
            ctx.errorCode = null;
            ctx.updatedAt = Date.now();

            if (!completeJobIfLastStep(job, result)) advanceJob(job.id);
          })
          .catch(function (err) {
            if (ctx.finished) return;
            if (job.pendingCommand !== runningCommand) {
              execLog(
                "STALE ENSURE-MODE ERROR ignored id=" +
                  job.id +
                  " device=" +
                  job.device +
                  " step=" +
                  ctx.currentStep +
                  " error=" +
                  String(err),
              );
              return;
            }
            execLog("ENSURE MODE ERROR id=" + job.id + " error=" + String(err));
            job.pendingCommand = null;
            ctx.waitingForCommandEnd = false;
            ctx.phase = "error";
            ctx.error = String(err);
            ctx.errorCode = "ENSURE_MODE_EXEC_ERROR";
            ctx.finished = true;
            ctx.updatedAt = Date.now();
            cleanupConfigSession(job.device, ctx.lastMode, ctx.lastPrompt);
            wakePendingJobsForDevice(job.device);
          });
        break;
      }

      case "expect-prompt": {
        const expectedPrompt = String(
          (step.options as any)?.expectedPrompt ||
            (step as any).expectPromptPattern ||
            step.value ||
            "",
        );

        const session = readSession(job.device);
        const prompt = session.prompt || ctx.lastPrompt;
        const matched = promptMatches(prompt, expectedPrompt);

        if (!matched && stopOnError) {
          ctx.phase = "error";
          ctx.error = "Expected prompt " + expectedPrompt + ", got " + prompt;
          ctx.errorCode = "EXPECT_PROMPT_FAILED";
          ctx.finished = true;
          ctx.updatedAt = Date.now();
          wakePendingJobsForDevice(job.device);
          return;
        }

        ctx.stepResults.push({
          stepIndex: ctx.currentStep,
          stepType: stepType,
          command: "",
          raw: prompt,
          status: 0,
          completedAt: Date.now(),
        });
        ctx.lastMode = session.mode;
        ctx.lastPrompt = prompt;
        ctx.currentStep++;
        ctx.phase = "pending";
        ctx.updatedAt = Date.now();
        if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
        break;
      }

      case "release-session":
      case "close-session": {
        execLog("RELEASE SESSION id=" + job.id + " device=" + job.device);
        terminal.detach(job.device);
        ctx.phase = "completed";
        ctx.finished = true;
        wakePendingJobsForDevice(job.device);
        break;
      }

      case "logout-session": {
        execLog("LOGOUT SESSION id=" + job.id + " device=" + job.device);
        try {
          // Obtener el terminal directamente y enviar exit
          var net = typeof ipc !== "undefined" ? ipc.network() : null;
          if (net) {
            var dev = net.getDevice(job.device);
            if (dev && dev.getCommandLine) {
              var term = dev.getCommandLine();
              if (term && term.enterCommand) {
                term.enterCommand("exit");
              }
            }
          }
        } catch (e) {}
        terminal.detach(job.device);
        ctx.phase = "completed";
        ctx.finished = true;
        wakePendingJobsForDevice(job.device);
        break;
      }

      case "confirm": {
        execLog("CONFIRM id=" + job.id + " device=" + job.device);
        terminal.confirmPrompt(job.device);
        ctx.currentStep++;
        ctx.phase = "pending";
        ctx.updatedAt = Date.now();
        advanceJob(job.id);
        break;
      }

      case "command":
      case "save-config": {
        let command = step.value || "";
        if (stepType === "save-config") {
          command = "write memory";
        }

        if (!command) {
          execLog("SKIP empty command step=" + ctx.currentStep + " id=" + job.id);
          ctx.currentStep++;
          advanceJob(job.id);
          return;
        }

        ctx.phase = stepType === "save-config" ? "waiting-save" : "waiting-command";
        ctx.waitingForCommandEnd = true;
        execLog(
          "EXEC CMD step=" +
            ctx.currentStep +
            "/" +
            (ctx.plan.plan.length - 1) +
            " type=" +
            stepType +
            " cmd='" +
            command.substring(0, 40) +
            "' id=" +
            job.id,
        );

        const stepOptions = (step.options || {}) as any;

        captureNativeBaselineForCurrentStep(job);
        job.pendingCommand = terminal.executeCommand(job.device, command, {
          commandTimeoutMs: timeout,
          stallTimeoutMs: ctx.plan.options.stallTimeoutMs,
          expectedMode: (step as any).expectMode,
          expectedPromptPattern: stepOptions.expectedPrompt,
          allowPager: true,
          autoAdvancePager: true,
          maxPagerAdvances: readPlanMaxPagerAdvances(ctx),
          autoConfirm: false,
          autoDismissWizard: true,
          sessionKind: resolveJobSessionKind(job),
        });

        const runningCommand = job.pendingCommand;

        runningCommand
          .then(function (result) {
            if (ctx.finished) return;
            if (job.pendingCommand !== runningCommand) {
              execLog(
                "STALE COMMAND RESULT ignored id=" +
                  job.id +
                  " device=" +
                  job.device +
                  " command=" +
                  command +
                  " step=" +
                  ctx.currentStep,
              );
              return;
            }
            execLog(
              "CMD OK id=" +
                job.id +
                " step=" +
                ctx.currentStep +
                " status=" +
                result.status +
                " outputLen=" +
                result.output.length,
            );
            job.pendingCommand = null;
            ctx.waitingForCommandEnd = false;
            ctx.lastPrompt = result.session.prompt;
            ctx.lastMode = result.session.mode;
            ctx.paged = result.session.paging;

            const rawOutput = String(
              (result as any).rawOutput ?? (result as any).raw ?? result.output ?? "",
            );
            const strictResultBlock = extractCurrentCommandBlockStrict(rawOutput || result.output, command);
            const commandReportedFailure =
              Number(result.status ?? 0) !== 0 ||
              (result as any).ok === false ||
              Boolean((result as any).code);
            const nativeOutput = readNativeTerminalOutput(job.device);
            const nativeDelta = getNativeDeltaForCurrentStep(job, nativeOutput, command);
            const nativeBaselinePrompt = inferPromptFromTerminalText(ctx.nativeBaselineOutput || "");
            const nativeBaselineMode = inferModeFromPrompt(nativeBaselinePrompt);
            const nativeLooksConfig = nativeSnapshotIsStillInConfigMode({
              prompt: nativeBaselinePrompt,
              mode: nativeBaselineMode,
            });

            const semanticError =
              (strictResultBlock.hasCommandEcho
                ? detectIosSemanticErrorFromOutput(strictResultBlock.block)
                : null) ??
              (commandReportedFailure
                ? detectIosSemanticErrorFromOutput(result.output)
                : nativeLooksConfig
                  ? detectIosSemanticErrorFromOutput(nativeDelta || nativeOutput)
                  : null);

            ctx.stepResults.push({
              stepIndex: ctx.currentStep,
              stepType: stepType,
              command: command,
              raw: semanticError ? semanticError.message : (strictResultBlock.block || result.output),
              status: result.status,
              completedAt: Date.now(),
            });

            if (semanticError) {
              execLog(
                "JOB STEP IOS SEMANTIC ERROR id=" +
                  job.id +
                  " device=" +
                  job.device +
                  " command=" +
                  command +
                  " code=" +
                  semanticError.code,
              );

              cleanupToPrivilegedExecBeforeSemanticError(job, semanticError, ctx.lastPrompt, ctx.lastMode);
              return;
            }

            ctx.outputBuffer = appendStepOutput(ctx.outputBuffer, result.output);

            if (result.status !== 0 && stopOnError) {
              execLog("CMD FAILED (stopOnError) id=" + job.id + " status=" + result.status);
              ctx.phase = "error";
              ctx.error = "Command failed with status " + result.status + ": " + command;
              ctx.errorCode = "CMD_FAILED";
              ctx.finished = true;
              cleanupConfigSession(job.device, result.session.mode, result.session.prompt);
              return;
            }

            if (ctx.paged && stepType === "save-config") {
              terminal.continuePager(job.device);
            }

            ctx.currentStep++;
            ctx.phase = "pending";
            ctx.updatedAt = Date.now();

            if (!completeJobIfLastStep(job, result)) {
              deferAdvanceJob(job.id, command);
            }
          })
          .catch(function (err) {
            if (ctx.finished) return;
            if (job.pendingCommand !== runningCommand) {
              execLog(
                "STALE COMMAND ERROR ignored id=" +
                  job.id +
                  " device=" +
                  job.device +
                  " command=" +
                  command +
                  " step=" +
                  ctx.currentStep +
                  " error=" +
                  String(err),
              );
              return;
            }
            execLog("CMD ERROR id=" + job.id + " error=" + String(err));
            job.pendingCommand = null;
            ctx.waitingForCommandEnd = false;
            ctx.phase = "error";
            ctx.error = String(err);
            ctx.errorCode = "EXEC_ERROR";
            ctx.finished = true;
            cleanupConfigSession(job.device, ctx.lastMode, ctx.lastPrompt);
            wakePendingJobsForDevice(job.device);
          });
        break;
      }

      default: {
        execLog("UNKNOWN STEP TYPE: " + stepType + " id=" + job.id);
        ctx.currentStep++;
        advanceJob(job.id);
      }
    }
  }

  function advanceJob(jobId: string): void {
    const job = jobs[jobId];
    if (!job || isJobFinished(jobId) || job.pendingCommand !== null) return;

    if ((job.context as any).semanticErrorCleanupInProgress === true) {
      jobDebug(job, "advance-skip-semantic-cleanup-in-progress");
      return;
    }

    const device = job.device;

    if (isDeviceTerminalBusy(device)) {
      execLog("ADVANCE DEFERRED terminal busy id=" + job.id + " device=" + device);
      return;
    }

    const jobIdStr = job.id;

    for (const key in jobs) {
      if (key === jobIdStr) continue;
      const other = jobs[key];
      if (!isJobFinished(key) && other.device === device && other.pendingCommand !== null) {
        return;
      }
    }

    if (job.context.paged) {
      terminal.continuePager(job.device);
      job.context.paged = false;
    }

    executeCurrentStep(job);
  }

  return {
    startJob: function (plan) {
      execLog("START JOB id=" + plan.id + " device=" + plan.device + " steps=" + plan.plan.length);
      const context = createJobContext(plan);
      const job: ActiveJob = {
        id: plan.id,
        device: plan.device,
        context: context,
        pendingCommand: null,
      };
      jobs[plan.id] = job;

      const attached = tryAttachTerminal(plan.device);
      if (!attached) {
        context.phase = "error";
        context.finished = true;
        context.error = "No terminal attached to " + plan.device;
        context.errorCode = "NO_TERMINAL_ATTACHED";
        context.updatedAt = Date.now();
        return job;
      }

      advanceJob(plan.id);
      return job;
    },
    advanceJob: advanceJob,
    reapStaleJobs: reapStaleJobs,
    getJob: function (id) {
      const job = jobs[id] || null;

      if (job) {
        tickNativeFallback(job, "getJob");
      }

      reapStaleJobs();
      return jobs[id] || null;
    },
    getJobState: function (id: string) {
      const job = jobs[id] || null;

      if (job) {
        tickNativeFallback(job, "getJobState");
      }

      reapStaleJobs();
      return jobs[id] ? jobs[id].context : null;
    },
    getActiveJobs: function () {
      reapStaleJobs();

      const active: ActiveJob[] = [];

      for (const key in jobs) {
        if (!isJobFinished(key)) {
          active.push(jobs[key]);
        }
      }

      return active;
    },
    isJobFinished: isJobFinished,
  };
}

// ============================================================================
// SERIALIZACIÓN
// ============================================================================

export function toKernelJobState(ctx: JobContext): KernelJobState {
  const base: any = {
    id: ctx.plan.id,
    device: ctx.plan.device,
    plan: ctx.plan,
    currentStep: ctx.currentStep,
    state: ctx.phase,
    outputBuffer: ctx.outputBuffer,
    debug: (ctx as any).debug || [],
    startedAt: ctx.startedAt,
    updatedAt: ctx.updatedAt,
    stepResults: ctx.stepResults,
    lastMode: ctx.lastMode,
    lastPrompt: ctx.lastPrompt,
    paged: ctx.paged,
    waitingForCommandEnd: ctx.waitingForCommandEnd,
    finished: ctx.finished,
    done: ctx.finished,
    error: ctx.error,
    errorCode: ctx.errorCode,
  };

  if (ctx.result) {
    const result = ctx.result as any;
    const raw = result.rawOutput ?? result.raw ?? result.output;

    base.result = {
      ok: ctx.result.ok,
      raw,
      rawOutput: raw,
      output: ctx.result.output,
      status: ctx.result.status,
      code: result.code,
      error: result.error,
      session: ctx.result.session,
      warnings: Array.isArray(result.warnings) ? result.warnings : [],
      diagnostics: result.diagnostics,
    };
  }

  if (!ctx.result) {
    base.result = null;
  }

  return base as KernelJobState;
}
