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
        try {
          if (typeof term.getMode === "function") {
            return term.getMode();
          }
        } catch {}

        const prompt = inferPromptFromTerminalText(readTerminalTextSafe(term));
        if (/\(config[^)]*\)#\s*$/.test(prompt)) return "global-config";
        if (/#\s*$/.test(prompt)) return "privileged-exec";
        if (/>$/.test(prompt)) return "user-exec";
        return "unknown";
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

  function isConfigMode(mode: string | null | undefined): boolean {
    return String(mode ?? "").startsWith("config");
  }

  function cleanupConfigSession(device: string, mode: string | null | undefined, prompt: string | null | undefined): void {
    if (!isConfigMode(mode) && !/\(config[^)]*\)#\s*$/.test(String(prompt ?? ""))) {
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
        rawCommand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
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

    if (expected === "global-config") {
      return mode === "global-config" || String(prompt || "").includes("(config");
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
      advanceJob(job.id);
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

  function nativeInputIsOnlyPagerResidue(input: string): boolean {
    const value = String(input ?? "");

    if (value.length === 0) {
      return false;
    }

    return value.replace(/\s+/g, "") === "";
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
        const raw = String(term.getMode() || "").trim().toLowerCase();

        if (raw === "user") return "user-exec";
        if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
        if (raw === "global" || raw === "config" || raw === "global-config") return "global-config";
        if (raw === "logout") return "logout";
      }
    } catch {}

    return inferModeFromPrompt(prompt);
  }

  function outputHasPager(output: string): boolean {
    return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
  }

  function shouldTryNativeFallback(job: ActiveJob, now: number): boolean {
    const ctx = job.context as any;

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

    return ageMs > 750;
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

  function forceCompleteFromNativeTerminal(job: ActiveJob, reason: string): boolean {
    const ctx = job.context;
    const step = getCurrentStep(ctx);
    const command = String(step?.value || "");

    if (!step || !command) return false;

    jobDebug(job, "native-fallback-enter reason=" + reason);

    const output = readNativeTerminalOutput(job.device);
    jobDebug(job, "native-output-len=" + String(output.length));

    if (!output.trim()) {
      jobDebug(job, "native-no-output");
      return false;
    }

    if (outputHasPager(output)) {
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

    if (nativeOutputTailHasActivePager(output)) {
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

    const block = extractLatestCommandBlock(output, command);
    const complete = nativeFallbackBlockLooksComplete(block, command, prompt);

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
    ctx.outputBuffer += block;
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
    });

    ctx.currentStep++;
    ctx.error = null;
    ctx.errorCode = null;
    ctx.updatedAt = Date.now();

    const terminalResult = {
      ok: true,
      output: block,
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
      advanceJob(job.id);
    }

    return true;
  }

  function reapStaleJobs(): void {
    execLog("REAP STALE JOBS tick");
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

      if (waitingForCommandEnd && waitingPhase && elapsedMs > 500) {
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

    if (target === "global-config") {
      return current === "config" || current === "global-config";
    }

    if (target === "privileged-exec") {
      return current === "privileged-exec";
    }

    return false;
  }

  function inferModeFromPrompt(prompt: string): string {
    const value = String(prompt ?? "").trim();

    if (/\(config[^)]*\)#$/.test(value)) return "config";
    if (/#$/.test(value)) return "privileged-exec";
    if (/>$/.test(value)) return "user-exec";

    return "unknown";
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
          if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
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
        });

        job.pendingCommand
          .then(function (result) {
            if (ctx.finished) return;

            job.pendingCommand = null;
            ctx.waitingForCommandEnd = false;
            ctx.outputBuffer += result.output;
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

        job.pendingCommand = terminal.executeCommand(job.device, command, {
          commandTimeoutMs: timeout,
          stallTimeoutMs: ctx.plan.options.stallTimeoutMs,
          expectedMode: (step as any).expectMode,
          expectedPromptPattern: stepOptions.expectedPrompt,
          allowPager: true,
          autoAdvancePager: true,
          maxPagerAdvances: 25,
          autoConfirm: false,
          autoDismissWizard: true,
        });

        job.pendingCommand
          .then(function (result) {
            if (ctx.finished) return;
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
            ctx.outputBuffer += result.output;
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
              advanceJob(job.id);
            }
          })
          .catch(function (err) {
            if (ctx.finished) return;
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

    const device = job.device;
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

  if (ctx.result && ctx.result.ok) {
    base.result = {
      ok: true,
      raw: ctx.result.output,
      status: ctx.result.status,
      session: ctx.result.session,
    };
    return base as KernelJobState;
  }

  base.result = null;
  return base as KernelJobState;
}
