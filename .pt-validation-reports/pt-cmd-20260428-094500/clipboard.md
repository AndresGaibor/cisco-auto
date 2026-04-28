# REPORTE PARA CHATGPT

# PT cmd validation report

- Fecha: Tue Apr 28 09:45:00 -05 2026
- Repo: /Users/andresgaibor/code/javascript/cisco-auto
- Device PT: SW-SRV-DIST
- RUN_PT: 0
- RUN_DEPLOY: 0


## Tests enfocados
- ✅ pt-control terminal-plan-builder test
- ✅ pt-control terminal-command-service plan-run test
- ❌ pt-runtime execution-engine auto-attach test — exit 1
- ✅ pt-runtime terminal-plan-run handler test
- ✅ pt-runtime terminal-plan-run poll integration test
- ✅ pt-runtime poll-deferred test
- ✅ pt-runtime deferred-poll-handler test
- ✅ pt-runtime command-state-machine test

## Typecheck
- ❌ pt-runtime typecheck — exit 2
- ❌ pt-control typecheck — exit 2

## Generate
- ✅ pt-runtime generate

## Diff y archivos cambiados

---

# Git status
```
 M packages/pt-control/src/application/services/terminal-plan-builder.ts
 M packages/pt-runtime/src/handlers/poll-deferred.ts
 M packages/pt-runtime/src/pt/kernel/execution-engine.ts
?? .pt-validation-reports/
```

# Git diff stat
```
 .../application/services/terminal-plan-builder.ts  |  11 +-
 packages/pt-runtime/src/handlers/poll-deferred.ts  |   8 +-
 .../pt-runtime/src/pt/kernel/execution-engine.ts   | 277 ++++++++++++++++++++-
 3 files changed, 283 insertions(+), 13 deletions(-)
```

# Git diff completo
```diff
diff --git a/packages/pt-control/src/application/services/terminal-plan-builder.ts b/packages/pt-control/src/application/services/terminal-plan-builder.ts
index 7965b3c6..1d02dc82 100644
--- a/packages/pt-control/src/application/services/terminal-plan-builder.ts
+++ b/packages/pt-control/src/application/services/terminal-plan-builder.ts
@@ -85,13 +85,20 @@ function shouldPrependEnable(options: BuildUniversalTerminalPlanOptions, lines:
   return lines.some(requiresPrivilegedIosCommand);
 }
 
-function inferIosTargetMode(lines: string[]): TerminalMode | undefined {
+function inferIosTargetMode(
+  lines: string[],
+  options: BuildUniversalTerminalPlanOptions,
+): TerminalMode | undefined {
   const normalized = lines.map(normalizeIosCommand);
 
   if (normalized.some((line) => isConfigureTerminal(line))) {
     return "global-config";
   }
 
+  if (shouldPrependEnable(options, lines)) {
+    return "privileged-exec";
+  }
+
   return undefined;
 }
 
@@ -189,7 +196,7 @@ export function buildUniversalTerminalPlan(
   return {
     id: options.id,
     device: options.device,
-    targetMode: inferIosTargetMode(lines),
+    targetMode: inferIosTargetMode(lines, options),
     steps,
     timeouts: buildDefaultTerminalTimeouts(options.timeoutMs),
     policies: buildDefaultTerminalPolicies(options),
diff --git a/packages/pt-runtime/src/handlers/poll-deferred.ts b/packages/pt-runtime/src/handlers/poll-deferred.ts
index 9a59bb2c..1f02349e 100644
--- a/packages/pt-runtime/src/handlers/poll-deferred.ts
+++ b/packages/pt-runtime/src/handlers/poll-deferred.ts
@@ -23,19 +23,25 @@ export function handlePollDeferred(payload: PollDeferredPayload, api: RuntimeApi
     jobState.state === "error";
 
   if (!finished) {
+    const currentStep = jobState.currentStep ?? 0;
+    const currentStepData = jobState.plan.plan[currentStep];
     return {
       ok: true,
       deferred: true,
       ticket,
       done: false,
       state: jobState.state,
-      currentStep: jobState.currentStep,
+      currentStep,
       totalSteps: jobState.plan.plan.length,
+      stepType: currentStepData?.type,
+      stepValue: currentStepData?.value,
       outputTail: jobState.outputBuffer ? jobState.outputBuffer.slice(-500) : "",
       lastPrompt: jobState.lastPrompt,
       lastMode: jobState.lastMode,
       waitingForCommandEnd: jobState.waitingForCommandEnd,
       updatedAt: jobState.updatedAt,
+      ageMs: Date.now() - jobState.startedAt,
+      idleMs: Date.now() - jobState.updatedAt,
     } as unknown as RuntimeResult;
   }
 
diff --git a/packages/pt-runtime/src/pt/kernel/execution-engine.ts b/packages/pt-runtime/src/pt/kernel/execution-engine.ts
index 0d68d678..097e659c 100644
--- a/packages/pt-runtime/src/pt/kernel/execution-engine.ts
+++ b/packages/pt-runtime/src/pt/kernel/execution-engine.ts
@@ -125,12 +125,17 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
       var dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;
       var term = dev && typeof dev.getCommandLine === "function" ? dev.getCommandLine() : null;
 
-      if (!term) {
-        execLog("ATTACH failed device=" + device + " reason=no-command-line");
+      if (
+        !term ||
+        typeof term.enterCommand !== "function" ||
+        typeof term.getPrompt !== "function" ||
+        typeof term.registerEvent !== "function"
+      ) {
+        execLog("ATTACH failed device=" + device + " reason=invalid-terminal-capabilities");
         return false;
       }
 
-      terminal.attach(device, term);
+      terminal.attach(device, term as any);
       return true;
     } catch (error) {
       execLog("ATTACH failed device=" + device + " error=" + String(error));
@@ -286,6 +291,92 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
     }, 0);
   }
 
+  function modeMatches(actual: unknown, expected: unknown): boolean {
+    const current = String(actual ?? "").trim();
+    const target = String(expected ?? "").trim();
+
+    if (!target) return true;
+    if (current === target) return true;
+
+    if (target === "global-config") {
+      return current === "config" || current === "global-config";
+    }
+
+    if (target === "privileged-exec") {
+      return current === "privileged-exec";
+    }
+
+    return false;
+  }
+
+  function inferModeFromPrompt(prompt: string): string {
+    const value = String(prompt ?? "").trim();
+
+    if (/\(config[^)]*\)#$/.test(value)) return "config";
+    if (/#$/.test(value)) return "privileged-exec";
+    if (/>$/.test(value)) return "user-exec";
+
+    return "unknown";
+  }
+
+  function readSession(device: string): { mode: string; prompt: string } {
+    try {
+      const session = terminal.getSession(device) as any;
+      const prompt = String(session?.prompt ?? "");
+      const mode = String(session?.mode ?? "unknown");
+
+      return {
+        mode: mode === "unknown" ? inferModeFromPrompt(prompt) : mode,
+        prompt,
+      };
+    } catch {
+      return { mode: "unknown", prompt: "" };
+    }
+  }
+
+  function commandForEnsureMode(currentMode: string, targetMode: string): string | null {
+    if (modeMatches(currentMode, targetMode)) return null;
+
+    if (targetMode === "privileged-exec") {
+      if (isConfigMode(currentMode)) return "end";
+      return "enable";
+    }
+
+    if (targetMode === "global-config" || targetMode === "config") {
+      if (currentMode === "user-exec" || currentMode === "unknown") return "enable";
+      if (currentMode === "privileged-exec") return "configure terminal";
+    }
+
+    return null;
+  }
+
+  function completeJobIfLastStep(job: ActiveJob, result: TerminalResult | null): boolean {
+    const ctx = job.context;
+
+    if (ctx.currentStep < ctx.plan.plan.length) {
+      return false;
+    }
+
+    execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
+    ctx.phase = "completed";
+    ctx.result = result;
+    ctx.finished = true;
+    ctx.updatedAt = Date.now();
+    wakePendingJobsForDevice(job.device);
+    return true;
+  }
+
+  function promptMatches(prompt: string, expectedPrompt: string): boolean {
+    if (!expectedPrompt) return true;
+    if (prompt.indexOf(expectedPrompt) >= 0) return true;
+
+    try {
+      return new RegExp(expectedPrompt).test(prompt);
+    } catch {
+      return false;
+    }
+  }
+
   function getCurrentStep(ctx: JobContext): DeferredStep | null {
     if (ctx.currentStep >= ctx.plan.plan.length) return null;
     return ctx.plan.plan[ctx.currentStep];
@@ -319,6 +410,178 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
         break;
       }
 
+      case "ensure-mode": {
+        const targetMode = String(
+          (step as any).expectMode ||
+            (step.options as any)?.expectedMode ||
+            step.value ||
+            "privileged-exec",
+        );
+
+        const session = readSession(job.device);
+        const command = commandForEnsureMode(session.mode, targetMode);
+
+        ctx.phase = "waiting-ensure-mode";
+        ctx.lastMode = session.mode;
+        ctx.lastPrompt = session.prompt;
+
+        if (!targetMode || command === null) {
+          if (targetMode && !modeMatches(session.mode, targetMode)) {
+            execLog("ENSURE MODE unsupported target=" + targetMode + " current=" + session.mode + " id=" + job.id);
+            if (stopOnError) {
+              ctx.phase = "error";
+              ctx.error = "Cannot ensure terminal mode " + targetMode + " from " + session.mode;
+              ctx.errorCode = "ENSURE_MODE_UNSUPPORTED";
+              ctx.finished = true;
+              ctx.updatedAt = Date.now();
+              wakePendingJobsForDevice(job.device);
+              return;
+            }
+          }
+
+          ctx.stepResults.push({
+            stepIndex: ctx.currentStep,
+            stepType: stepType,
+            command: "",
+            raw: "",
+            status: 0,
+            completedAt: Date.now(),
+          });
+          ctx.currentStep++;
+          ctx.phase = "pending";
+          ctx.updatedAt = Date.now();
+          if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
+          return;
+        }
+
+        execLog(
+          "ENSURE MODE id=" +
+            job.id +
+            " device=" +
+            job.device +
+            " current=" +
+            session.mode +
+            " target=" +
+            targetMode +
+            " cmd='" +
+            command +
+            "'",
+        );
+
+        ctx.waitingForCommandEnd = true;
+        job.pendingCommand = terminal.executeCommand(job.device, command, {
+          commandTimeoutMs: timeout,
+          stallTimeoutMs: ctx.plan.options.stallTimeoutMs,
+          expectedMode: targetMode as any,
+          allowPager: false,
+          autoAdvancePager: false,
+          maxPagerAdvances: 0,
+          autoConfirm: false,
+          autoDismissWizard: true,
+        });
+
+        job.pendingCommand
+          .then(function (result) {
+            if (ctx.finished) return;
+
+            job.pendingCommand = null;
+            ctx.waitingForCommandEnd = false;
+            ctx.outputBuffer += result.output;
+            ctx.lastPrompt = result.session.prompt;
+            ctx.lastMode = result.session.mode;
+            ctx.paged = result.session.paging;
+
+            ctx.stepResults.push({
+              stepIndex: ctx.currentStep,
+              stepType: stepType,
+              command: command,
+              raw: result.output,
+              status: result.status,
+              completedAt: Date.now(),
+            });
+
+            if (!modeMatches(result.session.mode, targetMode)) {
+              execLog(
+                "ENSURE MODE FAILED id=" +
+                  job.id +
+                  " expected=" +
+                  targetMode +
+                  " actual=" +
+                  result.session.mode,
+              );
+              ctx.phase = "error";
+              ctx.error = "Expected mode " + targetMode + ", got " + result.session.mode;
+              ctx.errorCode = "ENSURE_MODE_FAILED";
+              ctx.finished = true;
+              ctx.updatedAt = Date.now();
+              cleanupConfigSession(job.device, result.session.mode, result.session.prompt);
+              wakePendingJobsForDevice(job.device);
+              return;
+            }
+
+            ctx.currentStep++;
+            ctx.phase = "pending";
+            ctx.error = null;
+            ctx.errorCode = null;
+            ctx.updatedAt = Date.now();
+
+            if (!completeJobIfLastStep(job, result)) advanceJob(job.id);
+          })
+          .catch(function (err) {
+            if (ctx.finished) return;
+            execLog("ENSURE MODE ERROR id=" + job.id + " error=" + String(err));
+            job.pendingCommand = null;
+            ctx.waitingForCommandEnd = false;
+            ctx.phase = "error";
+            ctx.error = String(err);
+            ctx.errorCode = "ENSURE_MODE_EXEC_ERROR";
+            ctx.finished = true;
+            ctx.updatedAt = Date.now();
+            cleanupConfigSession(job.device, ctx.lastMode, ctx.lastPrompt);
+            wakePendingJobsForDevice(job.device);
+          });
+        break;
+      }
+
+      case "expect-prompt": {
+        const expectedPrompt = String(
+          (step.options as any)?.expectedPrompt ||
+            (step as any).expectPromptPattern ||
+            step.value ||
+            "",
+        );
+
+        const session = readSession(job.device);
+        const prompt = session.prompt || ctx.lastPrompt;
+        const matched = promptMatches(prompt, expectedPrompt);
+
+        if (!matched && stopOnError) {
+          ctx.phase = "error";
+          ctx.error = "Expected prompt " + expectedPrompt + ", got " + prompt;
+          ctx.errorCode = "EXPECT_PROMPT_FAILED";
+          ctx.finished = true;
+          ctx.updatedAt = Date.now();
+          wakePendingJobsForDevice(job.device);
+          return;
+        }
+
+        ctx.stepResults.push({
+          stepIndex: ctx.currentStep,
+          stepType: stepType,
+          command: "",
+          raw: prompt,
+          status: 0,
+          completedAt: Date.now(),
+        });
+        ctx.lastMode = session.mode;
+        ctx.lastPrompt = prompt;
+        ctx.currentStep++;
+        ctx.phase = "pending";
+        ctx.updatedAt = Date.now();
+        if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
+        break;
+      }
+
       case "release-session":
       case "close-session": {
         execLog("RELEASE SESSION id=" + job.id + " device=" + job.device);
@@ -452,13 +715,7 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
             ctx.phase = "pending";
             ctx.updatedAt = Date.now();
 
-            if (ctx.currentStep >= ctx.plan.plan.length) {
-              execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
-              ctx.phase = "completed";
-              ctx.result = result;
-              ctx.finished = true;
-              wakePendingJobsForDevice(job.device);
-            } else {
+            if (!completeJobIfLastStep(job, result)) {
               advanceJob(job.id);
             }
           })
```

# Archivos cambiados

- packages/pt-control/src/application/services/terminal-plan-builder.ts
- packages/pt-runtime/src/handlers/poll-deferred.ts
- packages/pt-runtime/src/pt/kernel/execution-engine.ts

## Contenido de archivos cambiados

### packages/pt-control/src/application/services/terminal-plan-builder.ts
```
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

### packages/pt-runtime/src/handlers/poll-deferred.ts
```
import type { RuntimeApi, RuntimeResult } from "../runtime/contracts.js";

interface PollDeferredPayload {
  ticket?: string;
}

export function handlePollDeferred(payload: PollDeferredPayload, api: RuntimeApi): RuntimeResult {
  const ticket = String(payload.ticket ?? "").trim();

  if (!ticket) {
    return { ok: false, error: "Missing ticket", code: "INVALID_PAYLOAD" } as RuntimeResult;
  }

  const jobState = api.getJobState(ticket);
  if (!jobState) {
    return { ok: false, error: `Job not found: ${ticket}`, code: "UNKNOWN_COMMAND" } as RuntimeResult;
  }

  const finished =
    jobState.finished === true ||
    (jobState as any).done === true ||
    jobState.state === "completed" ||
    jobState.state === "error";

  if (!finished) {
    const currentStep = jobState.currentStep ?? 0;
    const currentStepData = jobState.plan.plan[currentStep];
    return {
      ok: true,
      deferred: true,
      ticket,
      done: false,
      state: jobState.state,
      currentStep,
      totalSteps: jobState.plan.plan.length,
      stepType: currentStepData?.type,
      stepValue: currentStepData?.value,
      outputTail: jobState.outputBuffer ? jobState.outputBuffer.slice(-500) : "",
      lastPrompt: jobState.lastPrompt,
      lastMode: jobState.lastMode,
      waitingForCommandEnd: jobState.waitingForCommandEnd,
      updatedAt: jobState.updatedAt,
      ageMs: Date.now() - jobState.startedAt,
      idleMs: Date.now() - jobState.updatedAt,
    } as unknown as RuntimeResult;
  }

  const output = String(jobState.outputBuffer ?? (jobState.result as any)?.raw ?? (jobState.result as any)?.output ?? "");
  const status = jobState.error || jobState.state === "error" ? 1 : Number((jobState.result as any)?.status ?? 0);

  return {
    done: true,
    ok: !jobState.error && jobState.state !== "error",
    status,
    result: jobState.result,
    error: jobState.error || undefined,
    code: jobState.errorCode || undefined,
    errorCode: jobState.errorCode || undefined,
    raw: output,
    output,
    source: "terminal",
    session: {
      mode: String(jobState.lastMode ?? ""),
      prompt: String(jobState.lastPrompt ?? ""),
      paging: jobState.paged === true,
      awaitingConfirm: false,
    },
  } as unknown as RuntimeResult;
}
```

### packages/pt-runtime/src/pt/kernel/execution-engine.ts
```
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
  getJob(jobId: string): ActiveJob | null;
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

  function tryAttachTerminal(device: string): boolean {
    try {
      var net = typeof ipc !== "undefined" && ipc && typeof ipc.network === "function" ? ipc.network() : null;
      var dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;
      var term = dev && typeof dev.getCommandLine === "function" ? dev.getCommandLine() : null;

      if (
        !term ||
        typeof term.enterCommand !== "function" ||
        typeof term.getPrompt !== "function" ||
        typeof term.registerEvent !== "function"
      ) {
        execLog("ATTACH failed device=" + device + " reason=invalid-terminal-capabilities");
        return false;
      }

      terminal.attach(device, term as any);
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

  function outputLooksComplete(output: string, command: string): boolean {
    const text = normalizeEol(output);
    const cmd = String(command ?? "").trim().toLowerCase();

    if (!text.trim()) return false;

    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    const hasCommandEcho = cmd.length > 0 && lines.some((line) => line.toLowerCase() === cmd);
    const hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));
    const hasMeaningfulBody = lines.some((line) => {
      if (!line) return false;
      if (cmd && line.toLowerCase() === cmd) return false;
      if (isIosPrompt(line)) return false;
      return true;
    });

    return hasCommandEcho && hasPromptAtEnd && hasMeaningfulBody;
  }

  function reapStaleJobs(): void {
    const now = Date.now();

    for (const key in jobs) {
      const job = jobs[key];
      if (!job || job.context.finished || job.context.phase === "completed" || job.context.phase === "error") {
        continue;
      }

      if (job.pendingCommand === null) {
        continue;
      }

      if (now - job.context.updatedAt <= getJobTimeoutMs(job)) {
        const output = String(job.context.outputBuffer ?? "");
        const lastPrompt = String(job.context.lastPrompt ?? "");
        const waitingForCommandEnd = job.context.waitingForCommandEnd === true;

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
```

_Archivo truncado a 260 líneas. Total líneas: 

---

# Últimas 300 líneas del full output
```
+    return false;
+  }
+
+  function inferModeFromPrompt(prompt: string): string {
+    const value = String(prompt ?? "").trim();
+
+    if (/\(config[^)]*\)#$/.test(value)) return "config";
+    if (/#$/.test(value)) return "privileged-exec";
+    if (/>$/.test(value)) return "user-exec";
+
+    return "unknown";
+  }
+
+  function readSession(device: string): { mode: string; prompt: string } {
+    try {
+      const session = terminal.getSession(device) as any;
+      const prompt = String(session?.prompt ?? "");
+      const mode = String(session?.mode ?? "unknown");
+
+      return {
+        mode: mode === "unknown" ? inferModeFromPrompt(prompt) : mode,
+        prompt,
+      };
+    } catch {
+      return { mode: "unknown", prompt: "" };
+    }
+  }
+
+  function commandForEnsureMode(currentMode: string, targetMode: string): string | null {
+    if (modeMatches(currentMode, targetMode)) return null;
+
+    if (targetMode === "privileged-exec") {
+      if (isConfigMode(currentMode)) return "end";
+      return "enable";
+    }
+
+    if (targetMode === "global-config" || targetMode === "config") {
+      if (currentMode === "user-exec" || currentMode === "unknown") return "enable";
+      if (currentMode === "privileged-exec") return "configure terminal";
+    }
+
+    return null;
+  }
+
+  function completeJobIfLastStep(job: ActiveJob, result: TerminalResult | null): boolean {
+    const ctx = job.context;
+
+    if (ctx.currentStep < ctx.plan.plan.length) {
+      return false;
+    }
+
+    execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
+    ctx.phase = "completed";
+    ctx.result = result;
+    ctx.finished = true;
+    ctx.updatedAt = Date.now();
+    wakePendingJobsForDevice(job.device);
+    return true;
+  }
+
+  function promptMatches(prompt: string, expectedPrompt: string): boolean {
+    if (!expectedPrompt) return true;
+    if (prompt.indexOf(expectedPrompt) >= 0) return true;
+
+    try {
+      return new RegExp(expectedPrompt).test(prompt);
+    } catch {
+      return false;
+    }
+  }
+
   function getCurrentStep(ctx: JobContext): DeferredStep | null {
     if (ctx.currentStep >= ctx.plan.plan.length) return null;
     return ctx.plan.plan[ctx.currentStep];
@@ -319,6 +410,178 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
         break;
       }
 
+      case "ensure-mode": {
+        const targetMode = String(
+          (step as any).expectMode ||
+            (step.options as any)?.expectedMode ||
+            step.value ||
+            "privileged-exec",
+        );
+
+        const session = readSession(job.device);
+        const command = commandForEnsureMode(session.mode, targetMode);
+
+        ctx.phase = "waiting-ensure-mode";
+        ctx.lastMode = session.mode;
+        ctx.lastPrompt = session.prompt;
+
+        if (!targetMode || command === null) {
+          if (targetMode && !modeMatches(session.mode, targetMode)) {
+            execLog("ENSURE MODE unsupported target=" + targetMode + " current=" + session.mode + " id=" + job.id);
+            if (stopOnError) {
+              ctx.phase = "error";
+              ctx.error = "Cannot ensure terminal mode " + targetMode + " from " + session.mode;
+              ctx.errorCode = "ENSURE_MODE_UNSUPPORTED";
+              ctx.finished = true;
+              ctx.updatedAt = Date.now();
+              wakePendingJobsForDevice(job.device);
+              return;
+            }
+          }
+
+          ctx.stepResults.push({
+            stepIndex: ctx.currentStep,
+            stepType: stepType,
+            command: "",
+            raw: "",
+            status: 0,
+            completedAt: Date.now(),
+          });
+          ctx.currentStep++;
+          ctx.phase = "pending";
+          ctx.updatedAt = Date.now();
+          if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
+          return;
+        }
+
+        execLog(
+          "ENSURE MODE id=" +
+            job.id +
+            " device=" +
+            job.device +
+            " current=" +
+            session.mode +
+            " target=" +
+            targetMode +
+            " cmd='" +
+            command +
+            "'",
+        );
+
+        ctx.waitingForCommandEnd = true;
+        job.pendingCommand = terminal.executeCommand(job.device, command, {
+          commandTimeoutMs: timeout,
+          stallTimeoutMs: ctx.plan.options.stallTimeoutMs,
+          expectedMode: targetMode as any,
+          allowPager: false,
+          autoAdvancePager: false,
+          maxPagerAdvances: 0,
+          autoConfirm: false,
+          autoDismissWizard: true,
+        });
+
+        job.pendingCommand
+          .then(function (result) {
+            if (ctx.finished) return;
+
+            job.pendingCommand = null;
+            ctx.waitingForCommandEnd = false;
+            ctx.outputBuffer += result.output;
+            ctx.lastPrompt = result.session.prompt;
+            ctx.lastMode = result.session.mode;
+            ctx.paged = result.session.paging;
+
+            ctx.stepResults.push({
+              stepIndex: ctx.currentStep,
+              stepType: stepType,
+              command: command,
+              raw: result.output,
+              status: result.status,
+              completedAt: Date.now(),
+            });
+
+            if (!modeMatches(result.session.mode, targetMode)) {
+              execLog(
+                "ENSURE MODE FAILED id=" +
+                  job.id +
+                  " expected=" +
+                  targetMode +
+                  " actual=" +
+                  result.session.mode,
+              );
+              ctx.phase = "error";
+              ctx.error = "Expected mode " + targetMode + ", got " + result.session.mode;
+              ctx.errorCode = "ENSURE_MODE_FAILED";
+              ctx.finished = true;
+              ctx.updatedAt = Date.now();
+              cleanupConfigSession(job.device, result.session.mode, result.session.prompt);
+              wakePendingJobsForDevice(job.device);
+              return;
+            }
+
+            ctx.currentStep++;
+            ctx.phase = "pending";
+            ctx.error = null;
+            ctx.errorCode = null;
+            ctx.updatedAt = Date.now();
+
+            if (!completeJobIfLastStep(job, result)) advanceJob(job.id);
+          })
+          .catch(function (err) {
+            if (ctx.finished) return;
+            execLog("ENSURE MODE ERROR id=" + job.id + " error=" + String(err));
+            job.pendingCommand = null;
+            ctx.waitingForCommandEnd = false;
+            ctx.phase = "error";
+            ctx.error = String(err);
+            ctx.errorCode = "ENSURE_MODE_EXEC_ERROR";
+            ctx.finished = true;
+            ctx.updatedAt = Date.now();
+            cleanupConfigSession(job.device, ctx.lastMode, ctx.lastPrompt);
+            wakePendingJobsForDevice(job.device);
+          });
+        break;
+      }
+
+      case "expect-prompt": {
+        const expectedPrompt = String(
+          (step.options as any)?.expectedPrompt ||
+            (step as any).expectPromptPattern ||
+            step.value ||
+            "",
+        );
+
+        const session = readSession(job.device);
+        const prompt = session.prompt || ctx.lastPrompt;
+        const matched = promptMatches(prompt, expectedPrompt);
+
+        if (!matched && stopOnError) {
+          ctx.phase = "error";
+          ctx.error = "Expected prompt " + expectedPrompt + ", got " + prompt;
+          ctx.errorCode = "EXPECT_PROMPT_FAILED";
+          ctx.finished = true;
+          ctx.updatedAt = Date.now();
+          wakePendingJobsForDevice(job.device);
+          return;
+        }
+
+        ctx.stepResults.push({
+          stepIndex: ctx.currentStep,
+          stepType: stepType,
+          command: "",
+          raw: prompt,
+          status: 0,
+          completedAt: Date.now(),
+        });
+        ctx.lastMode = session.mode;
+        ctx.lastPrompt = prompt;
+        ctx.currentStep++;
+        ctx.phase = "pending";
+        ctx.updatedAt = Date.now();
+        if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
+        break;
+      }
+
       case "release-session":
       case "close-session": {
         execLog("RELEASE SESSION id=" + job.id + " device=" + job.device);
@@ -452,13 +715,7 @@ export function createExecutionEngine(terminal: TerminalEngine): ExecutionEngine
             ctx.phase = "pending";
             ctx.updatedAt = Date.now();
 
-            if (ctx.currentStep >= ctx.plan.plan.length) {
-              execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
-              ctx.phase = "completed";
-              ctx.result = result;
-              ctx.finished = true;
-              wakePendingJobsForDevice(job.device);
-            } else {
+            if (!completeJobIfLastStep(job, result)) {
               advanceJob(job.id);
             }
           })

============================================================
Resumen final
============================================================

# PT cmd validation report

- Fecha: Tue Apr 28 09:45:00 -05 2026
- Repo: /Users/andresgaibor/code/javascript/cisco-auto
- Device PT: SW-SRV-DIST
- RUN_PT: 0
- RUN_DEPLOY: 0


## Tests enfocados
- ✅ pt-control terminal-plan-builder test
- ✅ pt-control terminal-command-service plan-run test
- ❌ pt-runtime execution-engine auto-attach test — exit 1
- ✅ pt-runtime terminal-plan-run handler test
- ✅ pt-runtime terminal-plan-run poll integration test
- ✅ pt-runtime poll-deferred test
- ✅ pt-runtime deferred-poll-handler test
- ✅ pt-runtime command-state-machine test

## Typecheck
- ❌ pt-runtime typecheck — exit 2
- ❌ pt-control typecheck — exit 2

## Generate
- ✅ pt-runtime generate

## Diff y archivos cambiados
```
