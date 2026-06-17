// packages/pt-runtime/src/pt/kernel/execution-engine.ts
// Execution Engine — wiring de módulos satélite
// Toda la lógica vive en los módulos importados; este archivo solo conecta deps.

import type {
  DeferredJobPlan,
  DeferredStep,
  KernelJobState,
} from "../../runtime/contracts";
import type { TerminalEngine, TerminalResult } from "../terminal/terminal-engine";

// ─── módulos satélite ──────────────────────────────────────────────────────
import {
  normalizeEol,
  isIosPrompt,
  isHostPrompt,
  lastNonEmptyLine,
  lineContainsCommandEcho,
  isPagerOnlyLine,
  nativeHostFallbackBlockLooksComplete,
} from "./execution-engine-output-detectors";

import {
  normalizeCommandForFallback,
  isLongOutputReadOnlyIosCommand,
  isConfigMode,
  isEndCommand,
  isPromptOnlyTransitionCommand,
  inferIosModeFromPrompt,
  normalizeIosMode,
  inferPromptFromTerminalText,
  outputHasPager,
  nativeOutputTailHasActivePager,
  nativeFallbackBlockLooksComplete,
  buildNativeLongOutputWarnings,
  nativeSnapshotIsStillInConfigMode,
  isIosConfigPromptText,
  isIosConfigModeText,
  detectIosSemanticErrorFromOutput,
  appendStepOutput,
  extractLatestCommandBlock,
  extractCurrentCommandBlockStrict,
} from "./output-completion-policy";

// Override: nativeLongOutputCanCompleteWithoutEcho — versión permisiva original.
// La versión de output-completion-policy.ts exige evidencia de encabezado específico
// (e.g. para show interfaces, la primera línea debe ser un header de interfaz).
// El contrato de los tests del engine es más permisivo: completa si hay suficientes
// líneas significativas, y marca como parcial en warnings cuando falta el encabezado.
function nativeLongOutputCanCompleteWithoutEcho(args: { block: string; command: string; prompt: string }): boolean {
  if (!isLongOutputReadOnlyIosCommand(args.command)) return false;

  const block = normalizeEol(args.block);
  const prompt = String(args.prompt ?? "").trim();

  if (!block.trim()) return false;
  if (outputHasPager(block)) return false;
  if (!isIosPrompt(prompt) && !isIosPrompt(lastNonEmptyLine(block))) return false;
  if (detectIosSemanticErrorFromOutput(block)) return false;

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

import {
  buildSemanticErrorResult,
  extractNativeCleanupOutputSinceBaseline,
} from "./execution-engine-semantic";

// Override: inferModeFromPrompt — incluye detección de "host-prompt" (PCs/hosts en PT).
// output-completion-policy.ts omite este caso; el contrato del engine lo requiere.
function inferModeFromPrompt(prompt: string): string {
  if (isHostPrompt(prompt)) return "host-prompt";
  return normalizeIosMode("unknown", prompt);
}

import { getNativeDeltaForCurrentStep } from "./execution-engine-delta";

import {
  handleDelayStep,
  handleEnsureModeStep,
  handleExpectPromptStep,
  handleReleaseCloseSessionStep,
  handleLogoutSessionStep,
  handleConfirmStep,
  type StepHandlerDeps,
} from "./execution-engine-step-handlers";

import {
  handleCommandStep,
  type CommandStepDeps,
} from "./handle-command-step";

import {
  forceCompleteFromNativeTerminal,
  type ForceCompleteDeps,
} from "./force-complete-native";

import {
  reapStaleJobs,
  type ReapStaleJobsDeps,
} from "./reap-stale-jobs";

// ─── tipos re-exportados para compatibilidad ───────────────────────────────
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
  stepType: string;
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

// ─── interfaz pública ──────────────────────────────────────────────────────
export interface ExecutionEngine {
  startJob(plan: DeferredJobPlan): ActiveJob;
  advanceJob(jobId: string): void;
  reapStaleJobs(): void;
  getJob(jobId: string): ActiveJob | null;
  getJobState(jobId: string): JobContext | null;
  getActiveJobs(): ActiveJob[];
  isJobFinished(jobId: string): boolean;
}

// ─── implementación ────────────────────────────────────────────────────────
export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine {
  const jobs: Record<string, ActiveJob> = {};

  // ── logging ──────────────────────────────────────────────────────────────

  function execLog(message: string): void {
    try {
      dprint("[exec] " + message);
    } catch {}
  }

  function jobDebug(job: ActiveJob, message: string): void {
    try {
      const ctx = job.context as any;
      if (!ctx.debug) ctx.debug = [];
      ctx.debug.push(String(Date.now()) + " " + message);
    } catch {}
  }

  // ── job helpers ──────────────────────────────────────────────────────────

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

  function getCurrentStep(ctx: JobContext): DeferredStep | null {
    if (ctx.currentStep >= ctx.plan.plan.length) return null;
    return ctx.plan.plan[ctx.currentStep];
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

  function completeJobIfLastStep(job: ActiveJob, result: TerminalResult | null): boolean {
    const ctx = job.context;
    if (ctx.currentStep < ctx.plan.plan.length) return false;
    execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
    ctx.phase = "completed";
    ctx.result = result;
    ctx.finished = true;
    ctx.updatedAt = Date.now();
    wakePendingJobsForDevice(job.device);
    return true;
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
    if (target === "global-config" || target === "config") return isConfigMode(current);
    if (target === "privileged-exec") return current === "privileged-exec";
    return false;
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

  function promptMatches(prompt: string, expectedPrompt: string): boolean {
    if (!expectedPrompt) return true;
    if (prompt.indexOf(expectedPrompt) >= 0) return true;
    try {
      return new RegExp(expectedPrompt).test(prompt);
    } catch {
      return false;
    }
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

  function resolveJobSessionKind(job: ActiveJob): "ios" | "host" {
    const payload = job.context.plan.payload as any;
    const sessionKind = String(payload?.metadata?.sessionKind ?? payload?.sessionKind ?? "").trim().toLowerCase();
    if (sessionKind === "host") return "host";
    if (String(payload?.metadata?.deviceKind ?? "").trim().toLowerCase() === "host") return "host";
    return "ios";
  }

  function jobRequiresPrivilegedExecFinalMode(job: ActiveJob): boolean {
    const targetMode = String((job.context as any)?.targetMode ?? (job.context as any)?.plan?.targetMode ?? "").trim();
    return targetMode === "privileged-exec";
  }

  function getNextCommandStep(job: ActiveJob): string {
    const ctx = job.context;
    const nextStep = ctx.plan.plan[ctx.currentStep + 1];
    if (!nextStep || nextStep.type !== "command") return "";
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

  function readPlanMaxPagerAdvances(ctx: JobContext): number {
    const value = Number((ctx.plan.payload as any)?.policies?.maxPagerAdvances ?? 25);
    if (!Number.isFinite(value) || value <= 0) return 25;
    return Math.max(1, Math.min(Math.floor(value), 200));
  }

  // ── ipc / terminal attach ─────────────────────────────────────────────────

  function resolvePacketTracerIpc(): any {
    try {
      if (typeof self !== "undefined" && self) {
        const root = self as any;
        if (root.ipc && typeof root.ipc.network === "function") return root.ipc;
      }
    } catch {}
    try {
      if (typeof ipc !== "undefined" && ipc && typeof ipc.network === "function") return ipc;
    } catch {}
    try {
      if (typeof _ScriptModule !== "undefined" && _ScriptModule) {
        const scriptModule = _ScriptModule as any;
        const context = scriptModule.context;
        const scriptModuleIpc = context && context.ipc;
        if (scriptModuleIpc && typeof scriptModuleIpc.network === "function") return scriptModuleIpc;
      }
    } catch {}
    return null;
  }

  function readTerminalTextSafe(term: any): string {
    const methods = ["getAllOutput", "getBuffer", "getOutput", "getText", "readAll", "read", "getHistory", "history"];
    for (let i = 0; i < methods.length; i += 1) {
      const name = methods[i];
      try {
        if (typeof term[name] === "function") {
          const value = term[name]();
          if (value && typeof value === "string") return value;
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
                if (value && typeof value === "string") return value;
              }
            } catch {}
          }
        }
      }
    } catch {}
    return "";
  }

  function createAttachableTerminal(term: any): any {
    return {
      getPrompt: function () {
        try {
          if (typeof term.getPrompt === "function") {
            const prompt = term.getPrompt();
            if (prompt && typeof prompt === "string") return prompt;
          }
        } catch {}
        return inferPromptFromTerminalText(readTerminalTextSafe(term));
      },
      getMode: function () {
        const prompt = inferPromptFromTerminalText(readTerminalTextSafe(term));
        try {
          if (typeof term.getMode === "function") return normalizeIosMode(term.getMode(), prompt);
        } catch {}
        return normalizeIosMode("unknown", prompt);
      },
      getOutput: function () {
        try {
          if (typeof term.getOutput === "function") return term.getOutput();
        } catch {}
        return readTerminalTextSafe(term);
      },
      getAllOutput: function () {
        try {
          if (typeof term.getAllOutput === "function") return term.getAllOutput();
        } catch {}
        return readTerminalTextSafe(term);
      },
      getBuffer: function () {
        try {
          if (typeof term.getBuffer === "function") return term.getBuffer();
        } catch {}
        return readTerminalTextSafe(term);
      },
      getCommandInput: function () {
        try {
          if (typeof term.getCommandInput === "function") return term.getCommandInput();
        } catch {}
        return "";
      },
      enterCommand: function (cmd: string) { return term.enterCommand(cmd); },
      enterChar: function (charCode: number, modifiers: number) { return term.enterChar(charCode, modifiers); },
      registerEvent: function (eventName: string, context: unknown, handler: (src: unknown, args: unknown) => void) {
        return term.registerEvent(eventName, context, handler);
      },
      unregisterEvent: function (eventName: string, context: unknown, handler: (src: unknown, args: unknown) => void) {
        return term.unregisterEvent(eventName, context, handler);
      },
      println: function (text: string) {
        if (typeof term.println === "function") return term.println(text);
      },
      flush: function () {
        if (typeof term.flush === "function") return term.flush();
      },
      getConsole: function () {
        if (typeof term.getConsole === "function") return term.getConsole();
        return null;
      },
    };
  }

  function tryAttachTerminal(device: string): boolean {
    try {
      const resolvedIpc = resolvePacketTracerIpc();
      if (!resolvedIpc) { execLog("ATTACH failed device=" + device + " reason=no-ipc"); return false; }
      const net = typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
      if (!net || typeof net.getDevice !== "function") { execLog("ATTACH failed device=" + device + " reason=no-network"); return false; }
      const dev = net.getDevice(device);
      if (!dev) { execLog("ATTACH failed device=" + device + " reason=no-device"); return false; }
      if (typeof dev.getCommandLine !== "function") { execLog("ATTACH failed device=" + device + " reason=no-get-command-line"); return false; }
      const term = dev.getCommandLine();
      if (!term) { execLog("ATTACH failed device=" + device + " reason=no-command-line"); return false; }
      if (typeof term.enterCommand !== "function") { execLog("ATTACH failed device=" + device + " reason=no-enter-command"); return false; }
      if (typeof term.registerEvent !== "function") { execLog("ATTACH failed device=" + device + " reason=no-register-event"); return false; }
      if (typeof term.unregisterEvent !== "function") { execLog("ATTACH failed device=" + device + " reason=no-unregister-event"); return false; }
      terminal.attach(device, createAttachableTerminal(term) as any);
      return true;
    } catch (error) {
      execLog("ATTACH failed device=" + device + " error=" + String(error));
      return false;
    }
  }

  function isDeviceTerminalBusy(device: string): boolean {
    try {
      if (terminal && typeof (terminal as any).isBusy === "function") {
        return (terminal as any).isBusy(device) === true;
      }
    } catch {}
    return false;
  }

  // ── native terminal helpers ───────────────────────────────────────────────

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
    // Siempre verificar host-prompt primero (C:\> etc.)
    if (isHostPrompt(prompt)) return "host-prompt";
    try {
      const term = getNativeTerminalForDevice(device);
      if (term && typeof term.getMode === "function") return normalizeIosMode(term.getMode(), prompt);
    } catch {}
    return inferModeFromPrompt(prompt);
  }

  function getNativeInput(deviceName: string): string {
    try {
      const term = getNativeTerminalForDevice(deviceName);
      if (term && typeof term.getCommandInput === "function") return String(term.getCommandInput() ?? "");
    } catch {}
    return "";
  }

  function isBlankText(value: unknown): boolean {
    return String(value ?? "").replace(/\s+/g, "") === "";
  }

  function nativeInputIsOnlyPagerResidue(input: string): boolean {
    const value = String(input ?? "");
    if (value.length === 0) return false;
    return isBlankText(value);
  }

  function clearNativeInputIfPagerResidue(deviceName: string): void {
    try {
      const term = getNativeTerminalForDevice(deviceName);
      if (!term || typeof term.getCommandInput !== "function") return;
      const input = String(term.getCommandInput() ?? "");
      if (!nativeInputIsOnlyPagerResidue(input)) return;
      if (typeof term.enterChar === "function") term.enterChar(13, 0);
    } catch {}
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

  // ── session cleanup ───────────────────────────────────────────────────────

  function cleanupConfigSession(device: string, mode: string | null | undefined, prompt: string | null | undefined): void {
    if (!isConfigMode(mode, prompt) && !/\(config[^)]*\)#\s*$/.test(String(prompt ?? ""))) return;
    execLog("CLEANUP config session device=" + device);
    void terminal
      .executeCommand(device, "end", { commandTimeoutMs: 5000, allowPager: false, autoConfirm: false })
      .catch(function (error) {
        execLog("CLEANUP failed device=" + device + " error=" + String(error));
      });
  }

  // ── semantic error handling ───────────────────────────────────────────────

  function semanticErrorNeedsCleanupToPrivilegedExec(job: ActiveJob, prompt: unknown, mode: unknown): boolean {
    const promptStr = String(prompt ?? "").trim();
    const modeStr = String(mode ?? "").trim();
    return isIosConfigPromptText(promptStr) || isIosConfigModeText(modeStr);
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
      execLog("JOB SEMANTIC ERROR CLEANUP END NATIVE threw id=" + job.id + " device=" + job.device + " error=" + String(error));
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
    if (ctx.finished === true) return;
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
    execLog("JOB SEMANTIC ERROR CLEANUP END id=" + job.id + " device=" + job.device + " prompt=" + String(prompt || "") + " mode=" + String(mode || ""));
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
        if (ctx.finished === true) return;
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
          execLog("JOB SEMANTIC ERROR CLEANUP END RETRY id=" + job.id + " device=" + job.device + " prompt=" + currentPrompt + " mode=" + currentMode);
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
      execLog("JOB SEMANTIC ERROR CLEANUP END THREW id=" + job.id + " device=" + job.device + " error=" + String(err));
      finishJobWithSemanticError(job, semanticError, prompt, mode);
      return true;
    }
  }

  // ── ensure-mode from native terminal ─────────────────────────────────────

  function nativeModeSatisfiesEnsureStep(step: DeferredStep, mode: string, prompt: string): boolean {
    const expected = String((step as any).expectMode ?? (step as any).value ?? "").trim();
    if (!expected) return false;
    if (expected === "privileged-exec") return mode === "privileged-exec" || String(prompt || "").trim().endsWith("#");
    if (expected === "user-exec") return mode === "user-exec" || String(prompt || "").trim().endsWith(">");
    if (expected === "global-config" || expected === "config") return isConfigMode(mode, prompt) || String(prompt || "").includes("(config");
    return mode === expected;
  }

  function completeEnsureModeFromNativeTerminal(job: ActiveJob, step: DeferredStep, prompt: string, mode: string): boolean {
    const ctx = job.context;
    if (!nativeModeSatisfiesEnsureStep(step, mode, prompt)) return false;
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
      session: { mode, prompt, paging: false, awaitingConfirm: false },
      mode,
    } as unknown as TerminalResult;
    if (!completeJobIfLastStep(job, terminalResult)) {
      ctx.phase = "pending";
      deferAdvanceJob(job.id, String(step.value || ""));
    }
    return true;
  }

  // ── build force-complete deps ─────────────────────────────────────────────

  function buildForceCompleteDeps(): ForceCompleteDeps {
    return {
      jobDebug,
      execLog,
      advanceJob,
      getCurrentStep,
      readNativeTerminalOutput,
      getNativeDeltaForCurrentStep: (job, output, command) => getNativeDeltaForCurrentStep(job, output, command),
      isLongOutputReadOnlyIosCommand,
      outputHasPager,
      advanceNativePager,
      normalizeEol,
      nativeOutputTailHasActivePager,
      getNativePrompt,
      getNativeMode,
      getNativeInput,
      nativeInputIsOnlyPagerResidue,
      clearNativeInputIfPagerResidue,
      extractCurrentCommandBlockStrict,
      extractLatestCommandBlock,
      inferPromptFromTerminalText,
      inferModeFromPrompt,
      nativeSnapshotIsStillInConfigMode,
      detectIosSemanticErrorFromOutput,
      nativeLongOutputCanCompleteWithoutEcho,
      resolveJobSessionKind,
      nativeHostFallbackBlockLooksComplete,
      nativeFallbackBlockLooksComplete,
      isEndCommand,
      isPromptOnlyTransitionCommand,
      isIosPrompt,
      lastNonEmptyLine,
      completeEnsureModeFromNativeTerminal,
      cleanupToPrivilegedExecBeforeSemanticError,
      jobRequiresPrivilegedExecFinalMode,
      hasRemainingEndStep,
      getNextCommandStep,
      appendStepOutput,
      buildNativeLongOutputWarnings,
      completeJobIfLastStep,
    };
  }

  function runForceCompleteFromNativeTerminal(job: ActiveJob, reason: string): boolean {
    return forceCompleteFromNativeTerminal(job, reason, buildForceCompleteDeps());
  }

  // ── native fallback tick ──────────────────────────────────────────────────

  function shouldTryNativeFallback(job: ActiveJob, now: number): boolean {
    const ctx = job.context as any;
    if (ctx.semanticErrorCleanupInProgress === true) return false;
    if (!job || ctx.finished === true || ctx.phase === "completed" || ctx.phase === "error") return false;
    const waitingPhase = ctx.phase === "waiting-command" || ctx.phase === "waiting-ensure-mode";
    if (!waitingPhase) return false;
    if (ctx.waitingForCommandEnd !== true) return false;
    const ageMs = now - Number(ctx.updatedAt || ctx.startedAt || now);
    if (ageMs <= 750) return false;
    if (isDeviceTerminalBusy(job.device) && ageMs <= 1200) return false;
    return true;
  }

  function tickNativeFallback(job: ActiveJob, reason: string): boolean {
    const now = Date.now();
    jobDebug(
      job,
      "native-tick reason=" + reason +
        " phase=" + String(job.context.phase) +
        " waiting=" + String(job.context.waitingForCommandEnd) +
        " pending=" + String(job.pendingCommand === null ? "null" : "set") +
        " ageMs=" + String(now - Number(job.context.startedAt || now)) +
        " idleMs=" + String(now - Number(job.context.updatedAt || now)),
    );
    if (!shouldTryNativeFallback(job, now)) return false;
    return runForceCompleteFromNativeTerminal(job, reason);
  }

  // ── reap stale jobs ───────────────────────────────────────────────────────

  function runReapStaleJobs(): void {
    const deps: ReapStaleJobsDeps = {
      jobs,
      execLog,
      getJobTimeoutMs,
      tickNativeFallback,
      forceCompleteFromNativeTerminal: runForceCompleteFromNativeTerminal,
      getCurrentStep,
      jobRequiresPrivilegedExecFinalMode,
      nativeSnapshotIsStillInConfigMode,
      readNativeTerminalOutput,
      getNativePrompt,
      getNativeMode,
      cleanupConfigSession,
      terminal: { detach: (device) => terminal.detach(device) },
      wakePendingJobsForDevice,
      isDeviceTerminalBusy,
      isJobFinished,
      advanceJob,
    };
    reapStaleJobs(deps);
  }

  // ── step execution ────────────────────────────────────────────────────────

  // ─── build shared step deps ─────────────────────────────────────────────

  function buildStepHandlerDeps(): StepHandlerDeps {
    return {
      execLog,
      advanceJob,
      deferAdvanceJob,
      completeJobIfLastStep,
      cleanupConfigSession,
      wakePendingJobsForDevice,
      captureNativeBaselineForCurrentStep,
      readSession,
      commandForEnsureMode,
      modeMatches,
      resolveJobSessionKind,
      terminal: {
        executeCommand: (device, command, opts) => terminal.executeCommand(device, command, opts),
        getSession: (device) => terminal.getSession(device) as any,
        detach: (device) => terminal.detach(device),
        confirmPrompt: (device) => terminal.confirmPrompt(device),
      },
      readNativeTerminalOutput,
      getNativePrompt,
      getNativeMode,
      appendStepOutput,
      inferModeFromPrompt,
    };
  }

  function buildCommandStepDeps(): CommandStepDeps {
    return {
      execLog,
      advanceJob,
      captureNativeBaselineForCurrentStep,
      readPlanMaxPagerAdvances,
      resolveJobSessionKind,
      extractCurrentCommandBlockStrict,
      readNativeTerminalOutput,
      getNativeDeltaForCurrentStep: (job, output, command) => getNativeDeltaForCurrentStep(job, output, command),
      inferPromptFromTerminalText,
      inferModeFromPrompt,
      nativeSnapshotIsStillInConfigMode,
      detectIosSemanticErrorFromOutput,
      cleanupToPrivilegedExecBeforeSemanticError,
      appendStepOutput,
      completeJobIfLastStep,
      deferAdvanceJob,
      cleanupConfigSession,
      wakePendingJobsForDevice,
      terminal: {
        executeCommand: (device, command, opts) => terminal.executeCommand(device, command, opts),
        continuePager: (device) => terminal.continuePager(device),
      },
    };
  }

  // ─── step dispatcher ─────────────────────────────────────────────────────

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
    const stopOnError = (step.options?.stopOnError ?? ctx.plan.options.stopOnError) === true;
    const stepDeps = buildStepHandlerDeps();

    switch (stepType) {
      case "delay":
        return handleDelayStep(job, step, stepDeps);

      case "ensure-mode":
        return handleEnsureModeStep(job, step, stopOnError, timeout, stepDeps);

      case "expect-prompt":
        return handleExpectPromptStep(job, step, stopOnError, stepDeps);

      case "release-session":
      case "close-session":
        return handleReleaseCloseSessionStep(job, step, stepDeps);

      case "logout-session":
        return handleLogoutSessionStep(job, step, stepDeps);

      case "confirm":
        return handleConfirmStep(job, step, stepDeps);

      case "command":
      case "save-config":
        return handleCommandStep(job, step, stepType, timeout, stopOnError, buildCommandStepDeps());

      default:
        execLog("UNKNOWN STEP TYPE: " + stepType + " id=" + job.id);
        ctx.currentStep++;
        advanceJob(job.id);
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
      if (!isJobFinished(key) && other.device === device && other.pendingCommand !== null) return;
    }
    if (job.context.paged) {
      terminal.continuePager(job.device);
      job.context.paged = false;
    }
    executeCurrentStep(job);
  }

  // ── API pública ───────────────────────────────────────────────────────────

  return {
    startJob: function (plan) {
      execLog("START JOB id=" + plan.id + " device=" + plan.device + " steps=" + plan.plan.length);
      const context = createJobContext(plan);
      const job: ActiveJob = { id: plan.id, device: plan.device, context, pendingCommand: null };
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
    advanceJob,
    reapStaleJobs: runReapStaleJobs,
    getJob: function (id) {
      const job = jobs[id] || null;
      if (job) tickNativeFallback(job, "getJob");
      runReapStaleJobs();
      return jobs[id] || null;
    },
    getJobState: function (id: string) {
      const job = jobs[id] || null;
      if (job) tickNativeFallback(job, "getJobState");
      runReapStaleJobs();
      return jobs[id] ? jobs[id].context : null;
    },
    getActiveJobs: function () {
      runReapStaleJobs();
      const active: ActiveJob[] = [];
      for (const key in jobs) {
        if (!isJobFinished(key)) active.push(jobs[key]);
      }
      return active;
    },
    isJobFinished,
  };
}

// ─── serialización ─────────────────────────────────────────────────────────

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

  if (!ctx.result) base.result = null;

  return base as KernelJobState;
}
