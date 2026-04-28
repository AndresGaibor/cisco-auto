# native exec decision diagnosis

Fecha: Tue Apr 28 16:27:26 -05 2026

## context from last validation

El reporte anterior muestra que algunos intentos exitosos tardaron 2.4s-4.4s, mientras los fallidos agotaron timeouts de 15s, 60s y 90s; eso sugiere timeout del mecanismo, no lentitud real del switch.

## relevant source files

### terminal plan builder
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

function shouldDisableIosPager(options: BuildUniversalTerminalPlanOptions, lines: string[]): boolean {
  if (options.deviceKind !== "ios") return false;
  if (options.mode === "raw") return false;

  return lines.some((line) => /^show\s+/i.test(normalizeIosCommand(line)));
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

  if (shouldDisableIosPager(options, lines)) {
    steps.push({
      kind: "command",
      command: "terminal length 0",
      timeout: options.timeoutMs,
      allowPager: false,
      allowConfirm: false,
      metadata: {
        internal: true,
        suppressOutput: true,
        reason: "disable-ios-pager-before-show-command",
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

### standard terminal plans
```ts
import type { TerminalPlan, TerminalPlanStep } from "../../ports/runtime-terminal-port.js";

export type StandardTerminalProfile = "ios" | "host";

function buildSteps(commands: string[], timeout?: number): TerminalPlanStep[] {
  return commands.map((command) => ({
    command,
    timeout,
  }));
}

function buildIosPagerDisableStep(timeout?: number): TerminalPlanStep {
  return {
    kind: "command",
    command: "terminal length 0",
    timeout,
    allowPager: false,
    allowConfirm: false,
    metadata: {
      internal: true,
      suppressOutput: true,
      reason: "disable-ios-pager-before-show-command",
    },
  };
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
  const steps: TerminalPlanStep[] = [];

  if (/^show\s+/i.test(command.trim())) {
    steps.push(buildIosPagerDisableStep(options?.timeout ?? 15000));
  }

  steps.push({
    command,
    timeout: options?.timeout ?? 15000,
    expectedPrompt: options?.expectedPrompt,
  });

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
```

### runtime terminal adapter deferred area
```ts

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
```

### command state machine pager/input area
```ts
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
382:        this.debug("enterCommand begin");
383:        terminal.enterCommand(this.config.command);
384-        this.startedSeen = true;
385-        this.resetStallTimer();
386:        this.debug("enterCommand sent");
387-
388-        sleep(100).then(() => {
389-          if (!this.settled) {
390:            this.scheduleFinalizeAfterCommandEnd();
391-          }
392-        });
393-      } catch (e) {
394-        this.finalizeFailure(TerminalErrors.UNKNOWN_STATE, "Failed to send command: " + String(e));
395-      }
396-    });
397-
398-    // Return promise that resolves when settled
399-    return new Promise((resolve) => {
400-      const checkSettled = () => {
401-        if (this.settled) {
402-          resolve(this.buildResult());
403-        } else {
404-          this.config.setTimeout!(checkSettled, 50);
405-        }
406-      };
407-      checkSettled();
408-    });
409-  }
410-
411-  /**
412-   * Build the final result object.
413-   * Called after settled=true.
414-   */
415-  private buildResult(): CommandExecutionResult {
416-    const { session, sessionKind, options } = this.config;
417-    const endedAt = this.config.now();
418-    const promptAfter = this.config.getPromptSafeFn(this.config.terminal);
419-    const modeAfter = this.config.getModeSafeFn(this.config.terminal);
420-
421-    const snapshotAfter = this.config.readTerminalSnapshotFn!(this.config.terminal);
422-    const { delta: snapshotDelta } = diffSnapshotStrict(this.config.baselineOutput, snapshotAfter.raw);
423-
424-    const extractResult = extractCommandOutput({
425-      command: this.config.command,
426-      sessionKind: sessionKind === "unknown" ? "ios" : sessionKind,
427-      promptBefore: this.config.promptBefore,
428-      promptAfter,
429-      eventOutput: this.outputBuffer,
430-      snapshotDelta: snapshotDelta,
431-      snapshotAfter: snapshotAfter,
432-      commandEndedSeen: this.commandEndedSeen,
433-      outputEventsCount: this.outputEventsCount,
434-    });
435-
436-    let finalOutput = extractResult.output;
437-    let finalRaw = extractResult.raw;
438-
439-    if (sessionKind === "host" && detectHostBusy(finalOutput)) {
440-      this.hostBusy = true;
441-    }
442-
443-    const promptMatched = !options.expectedPromptPattern || promptAfter.includes(options.expectedPromptPattern);
444-    const modeMatched = !options.expectedMode || modeAfter === options.expectedMode;
445-
446-    let finalError: string | undefined = this.finalizedError;
447-    let finalCode: TerminalErrorCode | undefined = this.finalizedCode;
448-
449-    const semantic = sessionKind === "host"
450-      ? verifyHostOutput(finalOutput)
451-      : verifyIosOutput(finalOutput);
452-
453-    let cmdOk = this.finalizedOk && (this.endedStatus === null ? true : this.endedStatus === 0);
454-
455-    if (!semantic.ok) {
456-      cmdOk = false;
457-      this.endedStatus = semantic.status;
458-      finalError = semantic.message || finalError;
459-      finalCode = (semantic.code as TerminalErrorCode) || finalCode;
460-      this.config.warnings.push(...semantic.warnings);
461-    } else if (!cmdOk && this.endedStatus === null) {
462-      this.endedStatus = guessFailureStatus(finalOutput);
463-    }
464-
465-    if (sessionKind !== "ios" && sessionKind !== "unknown") {
466-      const hasPager = /--More--/i.test(finalOutput) || /--More--/i.test(this.outputBuffer);
467-      if (hasPager) {
468-        this.config.warnings.push("Output truncated (pager detected, auto-advance disabled)");
469-      }
470-    }
471-
472-    const isOnlyPromptResult = isOnlyPrompt(finalOutput, promptAfter);
473-    const emptyWithoutEnded = !finalOutput.trim() && !this.commandEndedSeen;
474-    if (!options.allowEmptyOutput && (isOnlyPromptResult || emptyWithoutEnded)) {
475-      cmdOk = false;
476-      if (!this.config.warnings.includes("No output received")) {
477-        this.config.warnings.push("No output received");
478-      }
479-    }
480-
481-    const confidence = computeConfidenceString(
482-      cmdOk,
483-      this.config.warnings,
484-      finalOutput,
485-      modeMatched,
486-      promptMatched,
487-      this.startedSeen,
488-      this.commandEndedSeen,
489-      this.outputEventsCount
490-    );
491-
492-    session.lastActivityAt = endedAt;
493-    session.lastCommandEndedAt = endedAt;
494-    session.pendingCommand = null;
495-    session.lastPrompt = promptAfter;
496-    session.lastMode = modeAfter as TerminalMode;
497-    session.outputBuffer = finalOutput;
498-    session.pagerActive = false;
499-    session.confirmPromptActive = false;
500-
501-    session.history.push({ command: this.config.command, output: finalOutput, timestamp: endedAt });
502-    if (session.history.length > 100) session.history.splice(0, 20);
503-
504-    if (!cmdOk) session.health = "desynced";
505-
506-    return {
507-      ok: cmdOk && promptMatched && modeMatched,
508-      command: this.config.command,
509-      output: finalOutput,
510-      rawOutput: finalRaw,
511-      status: this.endedStatus,
512-      startedAt: this.startedAt,
513-      endedAt,
514-      durationMs: Math.max(0, endedAt - this.startedAt),
515-      promptBefore: this.config.promptBefore,
516-      promptAfter,
517-      modeBefore: this.config.modeBefore,
518-      modeAfter,
519-      startedSeen: this.startedSeen,
520-      endedSeen: this.commandEndedSeen,
521-      outputEvents: this.outputEventsCount,
522-      confidence,
523-      warnings: [...this.config.warnings, ...extractResult.warnings],
524-      events: compactTerminalEvents(this.config.events),
525-      error: finalError,
526-      code: finalCode,
527-    };
528-  }
529-
530-  private setupHandlers(): void {
531-    const { terminal } = this.config;
532-
533-    try {
534-      terminal.registerEvent?.("commandStarted", null, this.onStartedHandler);
535-      terminal.registerEvent?.("outputWritten", null, this.onOutputHandler);
536-      terminal.registerEvent?.("commandEnded", null, this.onEndedHandler);
537-      terminal.registerEvent?.("promptChanged", null, this.onPromptChangedHandler);
538-      terminal.registerEvent?.("moreDisplayed", null, this.onMoreDisplayedHandler);
539-    } catch {}
540-  }
541-
542-  private cleanup(): void {
543-    const { terminal } = this.config;
544-
545-    try {
546-      terminal.unregisterEvent?.("commandStarted", null, this.onStartedHandler);
547-      terminal.unregisterEvent?.("outputWritten", null, this.onOutputHandler);
548-      terminal.unregisterEvent?.("commandEnded", null, this.onEndedHandler);
549-      terminal.unregisterEvent?.("promptChanged", null, this.onPromptChangedHandler);
550-      terminal.unregisterEvent?.("moreDisplayed", null, this.onMoreDisplayedHandler);
551-    } catch {}
552-  }
553-
554:  private startOutputPolling(): void {
555-    const poll = (): void => {
556-      if (this.settled) return;
557-      const currentRaw = this.config.readTerminalSnapshotFn!(this.config.terminal);
558-      const rawTail = String(currentRaw.raw || "")
559-        .replace(/\r\n/g, "\n")
560-        .replace(/\r/g, "\n")
561-        .slice(-800);
562-      const pagerVisible =
563-        /--More--\s*$/i.test(rawTail) ||
564-        /\s--More--\s*$/i.test(rawTail) ||
565-        /More:\s*$/i.test(rawTail) ||
566-        /Press RETURN to get started\s*$/i.test(rawTail) ||
567-        /Press any key to continue\s*$/i.test(rawTail);
568-
569-      if (pagerVisible) {
570-        this.config.session.pagerActive = true;
571-        this.debug("poll pager visible tail=" + JSON.stringify(rawTail.slice(-120)));
572-
573-        if (this.config.options.autoAdvancePager !== false) {
574-          try {
575-            this.config.terminal.enterChar(32, 0);
576-            this.debug("poll pager advanced with space");
577-            this.config.session.pagerActive = false;
578-            this.lastOutputAt = this.config.now();
579-            this.config.session.lastActivityAt = this.config.now();
580-          } catch (error) {
581-            this.debug("poll pager advance failed error=" + String(error));
582-          }
583-        }
584-      }
585-
586-      // Handle buffer reset/rotation
587-      if (currentRaw.raw.length < this.lastTerminalSnapshot.raw.length) {
588-        this.lastTerminalSnapshot = { raw: "", source: "reset" };
589-      }
590-
591-      try {
592-        const prompt = this.config.getPromptSafeFn(this.config.terminal);
593-        if (prompt && prompt !== this.previousPrompt) {
594-          this.previousPrompt = prompt;
595-          this.promptStableSince = this.config.now();
596-
597-          const mode = detectModeFromPrompt(normalizePrompt(prompt));
598-          this.config.session.lastPrompt = normalizePrompt(prompt);
599-          this.config.session.lastMode = mode;
600-
601-          this.debug("poll prompt=" + JSON.stringify(prompt) + " mode=" + mode);
602:          this.scheduleFinalizeAfterCommandEnd();
603-        }
604-      } catch {}
605-
606-      if (currentRaw.raw.length > this.lastTerminalSnapshot.raw.length) {
607-        const delta = currentRaw.raw.substring(this.lastTerminalSnapshot.raw.length);
608-        this.lastTerminalSnapshot = currentRaw;
609-        this.debug("poll output deltaLen=" + delta.length);
610-        this.onOutput(null, { chunk: delta, newOutput: delta });
611-      }
612-    };
613-
614-    poll();
615-    this.outputPollTimer = this.config.setInterval!(poll, 250) as unknown as ReturnType<typeof setInterval>;
616-  }
617-
618-  private clearTimers(): void {
619-    if (this.commandEndGraceTimer) this.config.clearTimeout!(this.commandEndGraceTimer);
620-    if (this.stallTimer) this.config.clearTimeout!(this.stallTimer);
621-    if (this.globalTimeoutTimer) this.config.clearTimeout!(this.globalTimeoutTimer);
622-    if (this.startTimer) this.config.clearTimeout!(this.startTimer);
623-    if (this.outputPollTimer) {
624-      if (this.config.clearInterval) {
625-        this.config.clearInterval(this.outputPollTimer);
626-      } else {
627-        this.config.clearTimeout!(this.outputPollTimer as unknown as ReturnType<typeof setTimeout>);
628-      }
629-      this.outputPollTimer = null;
630-    }
631-  }
632-
633-  private canAdvancePagerNow(): boolean {
634-    const now = this.config.now();
635-    if (now - this.lastPagerAdvanceAt < 120) {
636-      return false;
637-    }
638-    this.lastPagerAdvanceAt = now;
639-    return true;
640-  }
641-
642-  private resetStallTimer(): void {
643-    if (this.stallTimer) this.config.clearTimeout!(this.stallTimer);
644-
645-    const stallTimeoutMs = this.config.options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;
646-
647-    this.stallTimer = this.config.setTimeout!(() => {
648-      if (this.settled) return;
649-
650-      const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);
651-      const currentMode = this.config.getModeSafeFn(this.config.terminal) as TerminalMode;
652-      const now = this.config.now();
653-
654-      if (currentPrompt !== this.previousPrompt) {
655-        this.previousPrompt = currentPrompt;
656-        this.promptStableSince = now;
657-      }
658-
659-      const verdict = shouldFinalizeCommand({
660-        state: {
661-          startedSeen: this.startedSeen,
662-          commandEndedSeen: this.commandEndedSeen,
663-          commandEndSeenAt: this.commandEndSeenAt,
664-          lastOutputAt: this.lastOutputAt,
665-          promptStableSince: this.promptStableSince,
666-          previousPrompt: this.previousPrompt,
667-        },
668-        currentPrompt,
669-        currentMode,
670-        expectedMode: this.config.options.expectedMode,
671-        sessionKind: this.config.sessionKind,
672-        pagerActive: this.config.session.pagerActive,
673-        confirmPromptActive: this.config.session.confirmPromptActive,
674-      });
675-
676-      if (verdict.finished) {
677-        this.finalize(true, this.endedStatus, verdict.reason);
678-        return;
679-      }
680-
681-      this.finalizeFailure(
682-        TerminalErrors.COMMAND_END_TIMEOUT,
683-        "Command stalled before completion",
684-      );
685-    }, stallTimeoutMs);
686-  }
687-
688-  private onOutput(_src: unknown, args: unknown): void {
689-    const payload = args as any;
690-    const chunk = String(payload?.newOutput ?? payload?.data ?? payload?.output ?? payload?.chunk ?? "");
691-    if (!chunk) return;
692-
693-    this.outputEventsCount++;
694-    this.outputBuffer += chunk;
695-    this.lastOutputAt = this.config.now();
696-
697-    const currentRaw = this.config.readTerminalSnapshotFn!(this.config.terminal);
698-    if (currentRaw.raw.length >= this.lastTerminalSnapshot.raw.length) {
699-      this.lastTerminalSnapshot = currentRaw;
700-    }
701-
702-    pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "outputWritten", chunk, chunk.trim());
703-
704-    if (detectDnsLookup(chunk)) {
705-      try {
706-        this.config.terminal.enterChar(3, 0);
707-        this.config.warnings.push("DNS Hangup detected (Translating...). Breaking with Ctrl+C");
708-        pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "dnsBreak", "Ctrl+C", "Ctrl+C");
709-      } catch (e) {}
710-    }
711-
712-    if (detectWizardFromOutput(chunk)) {
713-      this.config.session.wizardDetected = true;
714-      if (this.config.options.autoDismissWizard !== false && !this.wizardDismissed) {
715-        this.wizardDismissed = true;
716:        try { this.config.terminal.enterCommand("no"); this.resetStallTimer(); } catch {}
717-      }
718-    }
719-
720-    if (detectConfirmPrompt(chunk)) {
721-      this.config.session.confirmPromptActive = true;
722-      this.confirmHandler.handleOutput(chunk);
723-      if (this.config.options.autoConfirm && this.confirmHandler.shouldAutoConfirm()) {
724-        try {
725-          const lower = chunk.toLowerCase();
726-          if (lower.indexOf("[yes/no]") !== -1 || lower.indexOf("(y/n)") !== -1) {
727:            this.config.terminal.enterCommand("y");
728-          } else {
729-            this.config.terminal.enterChar(13, 0);
730-          }
731-          this.confirmHandler.confirm();
732-          this.resetStallTimer();
733-        } catch {}
734-      }
735-    }
736-
737-    if (detectAuthPrompt(chunk)) {
738-      this.config.warnings.push("Authentication required");
739-      if (this.commandEndGraceTimer) this.config.clearTimeout!(this.commandEndGraceTimer);
740-      this.commandEndGraceTimer = this.config.setTimeout!(() => {
741-        if (!this.settled) this.finalize(true, 0);
742-      }, 900);
743-      return;
744-    }
745-
746-    if (detectPager(chunk)) {
747-      this.config.session.pagerActive = true;
748-      this.pagerHandler.handleOutput(chunk);
749-
750-      if (this.pagerHandler.isLoop()) {
751-        this.finalizeFailure(
752-          TerminalErrors.COMMAND_END_TIMEOUT,
753-          `Pager advance limit reached (${this.config.options.maxPagerAdvances ?? 50})`,
754-        );
755-        return;
756-      }
757-
758-      if (this.config.sessionKind !== "ios" && this.config.sessionKind !== "unknown") {
759-        const hasPager = /--More--/i.test(chunk);
760-        if (hasPager) {
761-          this.finalize(true, this.endedStatus, "Pager detected in non-IOS session");
762-          return;
763-        }
764-      }
765-
766-      if (
767-        this.config.options.autoAdvancePager !== false &&
768-        this.pagerHandler.canContinue() &&
769-        this.canAdvancePagerNow()
770-      ) {
771-        this.pagerHandler.advance();
772-
773-        this.config.setTimeout!(() => {
774-          if (this.settled) return;
775-          const sent = this.sendPagerAdvance(
776-            this.config.terminal,
777-            this.config.events,
778-            this.config.session.sessionId,
779-            this.config.deviceName,
780-            "pagerHandler",
781-          );
782-
783-          if (!sent) {
784-            this.finalizeFailure(
785-              TerminalErrors.COMMAND_END_TIMEOUT,
786-              "Pager detected but auto-advance failed",
787-            );
788-            return;
789-          }
790-
791-          this.config.session.pagerActive = false;
792-          this.resetStallTimer();
793-        }, 50);
794-      }
795-    }
796-
797-    this.resetStallTimer();
798:    this.scheduleFinalizeAfterCommandEnd();
799-  }
800-
801-  private onStarted(): void {
802-    this.startedSeen = true;
803-    if (this.startTimer) { this.config.clearTimeout!(this.startTimer); this.startTimer = null; }
804-    this.config.session.lastActivityAt = this.config.now();
805-    this.resetStallTimer();
806-    pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "commandStarted", this.config.command, this.config.command);
807-  }
808-
809-  private onEnded(_src: unknown, args: unknown): void {
810-    const payload = args as CommandEndedPayload;
811-    this.commandEndedSeen = true;
812-    this.commandEndSeenAt = this.config.now();
813-    this.endedStatus = payload.status ?? 0;
814-    this.resetStallTimer();
815-    pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "commandEnded", String(this.endedStatus), String(this.endedStatus));
816:    this.scheduleFinalizeAfterCommandEnd();
817-  }
818-
819-  private onPromptChanged(_src: unknown, args: unknown): void {
820-    const p = String((args as any).prompt || "");
821-    this.previousPrompt = this.config.session.lastPrompt || this.previousPrompt;
822-    this.config.session.lastPrompt = normalizePrompt(p);
823-    const mode = detectModeFromPrompt(this.config.session.lastPrompt);
824-    this.config.session.lastMode = mode;
825-    if (isHostMode(mode)) this.config.session.sessionKind = "host";
826-    this.promptStableSince = this.config.now();
827-    this.resetStallTimer();
828:    this.scheduleFinalizeAfterCommandEnd();
829-  }
830-
831-  private onMoreDisplayed(_src: unknown, args: unknown): void {
832-    this.config.session.pagerActive = true;
833-    this.pagerHandler.handleOutput("--More--");
834-
835-    if (this.pagerHandler.isLoop()) {
836-      this.finalizeFailure(
837-        TerminalErrors.COMMAND_END_TIMEOUT,
838-        `Pager advance limit reached (${this.config.options.maxPagerAdvances ?? 50})`,
839-      );
840-      return;
841-    }
842-
843-    pushEvent(
844-      this.config.events,
845-      this.config.session.sessionId,
846-      this.config.deviceName,
847-      "moreDisplayed",
848-      "--More--",
849-      "--More--",
850-    );
851-
852-    if (
853-      this.config.options.autoAdvancePager !== false &&
854-      this.pagerHandler.canContinue() &&
855-      this.canAdvancePagerNow()
856-    ) {
857-      this.pagerHandler.advance();
858-
859-      this.config.setTimeout!(() => {
860-        if (this.settled) return;
861-        const sent = this.sendPagerAdvance(
862-          this.config.terminal,
863-          this.config.events,
864-          this.config.session.sessionId,
865-          this.config.deviceName,
866-          "moreDisplayed",
867-        );
868-
869-        if (!sent) {
870-          this.finalizeFailure(
871-            TerminalErrors.COMMAND_END_TIMEOUT,
872-            "Pager displayed but auto-advance failed",
873-          );
874-          return;
875-        }
876-
877-        this.config.session.pagerActive = false;
878-        this.resetStallTimer();
879-      }, 50);
880-    }
881-  }
882-
883:  private scheduleFinalizeAfterCommandEnd(): void {
884-    if (this.settled) return;
885-
886-    if (this.commandEndedSeen && this.commandEndSeenAt) {
887-      const waitedAfterEnd = this.config.now() - this.commandEndSeenAt;
888-
889-      if (waitedAfterEnd >= 1000) {
890-        this.finalize(true, this.endedStatus, "command-ended-max-wait");
891-        return;
892-      }
893-    }
894-
895-    const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);
896-
897-    const snapshot = this.config.readTerminalSnapshotFn!(this.config.terminal);
898-    const diff = diffSnapshotStrict(this.config.baselineOutput, snapshot.raw);
899-    const snapshotDelta = String(diff.delta || "");
900-    const hasAnyOutput = this.outputBuffer.trim().length > 0 || snapshotDelta.trim().length > 0;
901-    const promptLooksReady = /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]\s*$/.test(String(currentPrompt || "").trim());
902-    const quietLongEnough = this.config.now() - this.lastOutputAt >= 700;
903-
904-    if (
905-      this.startedSeen &&
906-      promptLooksReady &&
907-      quietLongEnough &&
908-      !this.config.session.pagerActive &&
909-      !this.config.session.confirmPromptActive
910-    ) {
911-      if (hasAnyOutput || this.config.options.allowEmptyOutput === true || isEnableOrEndCommand(this.config.command)) {
912-        this.debug(
913-          "finalize by prompt-ready fallback prompt=" +
914-            JSON.stringify(currentPrompt) +
915-            " hasAnyOutput=" +
916-            hasAnyOutput,
917-        );
918-        this.finalize(true, this.endedStatus, "prompt-ready-fallback");
919-        return;
920-      }
921-    }
922-
923-    const verdict = shouldFinalizeCommand({
924-      state: {
925-        startedSeen: this.startedSeen,
926-        commandEndedSeen: this.commandEndedSeen,
927-        commandEndSeenAt: this.commandEndSeenAt,
928-        lastOutputAt: this.lastOutputAt,
929-        promptStableSince: this.promptStableSince,
930-        previousPrompt: this.previousPrompt,
931-      },
932-      currentPrompt,
933-      currentMode: this.config.getModeSafeFn(this.config.terminal) as TerminalMode,
934-      expectedMode: this.config.options.expectedMode,
935-      sessionKind: this.config.sessionKind,
936-      pagerActive: this.config.session.pagerActive,
937-      confirmPromptActive: this.config.session.confirmPromptActive,
938-    });
939-
940-    if (verdict.finished) {
941-      this.finalize(true, this.endedStatus, verdict.reason);
942-      return;
943-    }
944-
945-    if (this.commandEndGraceTimer) this.config.clearTimeout!(this.commandEndGraceTimer);
946-    this.commandEndGraceTimer = this.config.setTimeout!(() => {
947-      this.commandEndGraceTimer = null;
948:      this.scheduleFinalizeAfterCommandEnd();
949-    }, this.config.sessionKind === "host" ? 800 : 250);
950-  }
951-
952-  private finalize(cmdOk: boolean, status: number | null, error?: string, code?: TerminalErrorCode): void {
953-    if (this.settled) return;
954-
955-    this.debug(
956-      "finalize ok=" +
957-        cmdOk +
958-        " status=" +
959-        status +
960-        " error=" +
961-        JSON.stringify(error || "") +
962-        " code=" +
963-        JSON.stringify(code || "") +
964-        " outputLen=" +
965-        this.outputBuffer.length +
966-        " startedSeen=" +
967-        this.startedSeen +
968-        " endedSeen=" +
969-        this.commandEndedSeen,
970-    );
971-
972-    this.finalizedOk = cmdOk;
973-    if (status !== null) this.endedStatus = status;
974-    this.finalizedError = error;
975-    this.finalizedCode = code;
976-
977-    this.settled = true;
978-    this.clearTimers();
979-    this.cleanup();
980-  }
981-
982-  private finalizeFailure(code: TerminalErrorCode, message: string): void {
983-    this.debug(
984-      "finalizeFailure code=" +
985-        String(code) +
986-        " message=" +
987-        JSON.stringify(message) +
988-        " outputLen=" +
989-        this.outputBuffer.length,
990-    );
991-
992-    this.finalize(false, 1, message, code);
993-
994-    const recoverable =
995-      code === TerminalErrors.COMMAND_START_TIMEOUT ||
996-      code === TerminalErrors.COMMAND_END_TIMEOUT ||
997-      code === TerminalErrors.PROMPT_MISMATCH ||
998-      code === TerminalErrors.MODE_MISMATCH ||
999-      message.includes("No output received");
1000-
1001-    if (recoverable && this.config.terminal) {
1002-      this.config.setTimeout!(() => {
1003-        try {
1004-          const recovery = this.config.recoverTerminalSyncFn!(
1005-            this.config.terminal,
1006-            this.config.sessionKind === "host" ? "host" : "ios"
1007-          );
1008-          this.config.warnings.push(
1009-            `Recovery attempted: ${recovery.actions.join(", ")}; prompt=${recovery.prompt}; mode=${recovery.mode}`,
1010-          );
1011-        } catch {}
1012-      }, 0);
1013-    }
1014-  }
1015-}
```

### execution engine native fallback area
```ts
551-    ctx.lastMode = mode;
552-    ctx.paged = false;
553-
554-    ctx.stepResults.push({
555-      stepIndex: ctx.currentStep,
556-      stepType: step.type,
557-      command: String(step.value || ""),
558-      raw,
559-      status: 0,
560-      completedAt: Date.now(),
561-    });
562-
563-    ctx.currentStep++;
564-    ctx.error = null;
565-    ctx.errorCode = null;
566-    ctx.updatedAt = Date.now();
567-
568-    const terminalResult = {
569-      ok: true,
570-      output: raw,
571-      status: 0,
572-      session: {
573-        mode,
574-        prompt,
575-        paging: false,
576-        awaitingConfirm: false,
577-      },
578-      mode,
579-    } as unknown as TerminalResult;
580-
581-    if (!completeJobIfLastStep(job, terminalResult)) {
582-      ctx.phase = "pending";
583-      advanceJob(job.id);
584-    }
585-
586-    return true;
587-  }
588-
589-  function stripCommandEchoFromLine(line: string, command: string): string {
590-    const rawLine = String(line ?? "").trim();
591-    const rawCommand = String(command ?? "").trim();
592-
593-    if (!rawLine || !rawCommand) return rawLine;
594-
595-    if (rawLine.toLowerCase() === rawCommand.toLowerCase()) {
596-      return "";
597-    }
598-
599-    const lowerLine = rawLine.toLowerCase();
600-    const lowerCommand = rawCommand.toLowerCase();
601-
602-    const gtIndex = lowerLine.indexOf(">" + lowerCommand);
603-    if (gtIndex >= 0) return "";
604-
605-    const hashIndex = lowerLine.indexOf("#" + lowerCommand);
606-    if (hashIndex >= 0) return "";
607-
608-    return rawLine;
609-  }
610-
611:  function nativeFallbackBlockLooksComplete(block: string, command: string, prompt: string): boolean {
612-    const text = normalizeEol(block);
613-    const lines = text
614-      .split("\n")
615-      .map((line) => line.trim())
616-      .filter(Boolean);
617-
618-    if (lines.length === 0) return false;
619-
620-    const promptOk = isIosPrompt(prompt) || isIosPrompt(lastNonEmptyLine(text));
621-    if (!promptOk) return false;
622-
623-    if (outputHasPager(text)) return false;
624-
625-    const meaningfulLines = lines.filter((line) => {
626-      const stripped = stripCommandEchoFromLine(line, command);
627-      if (!stripped) return false;
628-      if (isIosPrompt(stripped)) return false;
629-      if (isPagerOnlyLine(stripped)) return false;
630-      return true;
631-    });
632-
633-    return meaningfulLines.length > 0;
634-  }
635-
636:  function nativeOutputTailHasActivePager(output: string): boolean {
637-    const tail = normalizeEol(output).slice(-800);
638-
639-    if (!tail.trim()) {
640-      return false;
641-    }
642-
643-    return /--More--\s*$/i.test(tail) || /\s--More--\s*$/i.test(tail);
644-  }
645-
646:  function getNativeInput(deviceName: string): string {
647-    try {
648-      const term = getNativeTerminalForDevice(deviceName);
649-
650-      if (term && typeof term.getCommandInput === "function") {
651-        return String(term.getCommandInput() ?? "");
652-      }
653-    } catch {}
654-
655-    return "";
656-  }
657-
658:  function nativeInputIsOnlyPagerResidue(input: string): boolean {
659-    const value = String(input ?? "");
660-
661-    if (value.length === 0) {
662-      return false;
663-    }
664-
665-    return value.replace(/\s+/g, "") === "";
666-  }
667-
668-  function clearNativeInputIfPagerResidue(deviceName: string): void {
669-    try {
670-      const term = getNativeTerminalForDevice(deviceName);
671-
672-      if (!term || typeof term.getCommandInput !== "function") {
673-        return;
674-      }
675-
676-      const input = String(term.getCommandInput() ?? "");
677-
678:      if (!nativeInputIsOnlyPagerResidue(input)) {
679-        return;
680-      }
681-
682-      if (typeof term.enterChar === "function") {
683-        term.enterChar(13, 0);
684-      }
685-    } catch {}
686-  }
687-
688-  function getNativeTerminalForDevice(device: string): any {
689-    try {
690-      const resolvedIpc = resolvePacketTracerIpc();
691-      const net = resolvedIpc && typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
692-      const dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;
693-
694-      if (!dev) return null;
695-
696-      try {
697-        if (typeof dev.getCommandLine === "function") {
698-          const term = dev.getCommandLine();
699-          if (term) return term;
700-        }
701-      } catch {}
702-
703-      try {
704-        if (
705-          typeof dev.getConsole === "function" &&
706-          dev.getConsole() &&
707-          typeof dev.getConsole().getTerminalLine === "function"
708-        ) {
709-          const term = dev.getConsole().getTerminalLine();
710-          if (term) return term;
711-        }
712-      } catch {}
713-
714-      return null;
715-    } catch {
716-      return null;
717-    }
718-  }
719-
720-  function readNativeTerminalOutput(device: string): string {
721-    const term = getNativeTerminalForDevice(device);
722-    if (!term) return "";
723-    return readTerminalTextSafe(term);
724-  }
725-
726-  function getNativePrompt(device: string, output: string): string {
727-    try {
728-      const term = getNativeTerminalForDevice(device);
729-      if (term && typeof term.getPrompt === "function") {
730-        const prompt = String(term.getPrompt() || "").trim();
731-        if (prompt) return prompt;
732-      }
733-    } catch {}
734-
735-    return inferPromptFromTerminalText(output);
736-  }
737-
738-  function getNativeMode(device: string, prompt: string): string {
739-    try {
740-      const term = getNativeTerminalForDevice(device);
741-      if (term && typeof term.getMode === "function") {
742-        const raw = String(term.getMode() || "").trim().toLowerCase();
743-
744-        if (raw === "user") return "user-exec";
745-        if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
746-        if (raw === "global" || raw === "config" || raw === "global-config") return "global-config";
747-        if (raw === "logout") return "logout";
748-      }
749-    } catch {}
750-
751-    return inferModeFromPrompt(prompt);
752-  }
753-
754-  function outputHasPager(output: string): boolean {
755-    return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
756-  }
757-
758-  function shouldTryNativeFallback(job: ActiveJob, now: number): boolean {
759-    const ctx = job.context as any;
760-
761-    if (!job || ctx.finished === true || ctx.phase === "completed" || ctx.phase === "error") {
762-      return false;
763-    }
764-
765-    const waitingPhase =
766-      ctx.phase === "waiting-command" ||
767-      ctx.phase === "waiting-ensure-mode";
768-
769-    if (!waitingPhase) {
770-      return false;
771-    }
772-
773-    if (ctx.waitingForCommandEnd !== true) {
774-      return false;
775-    }
776-
777-    const ageMs = now - Number(ctx.updatedAt || ctx.startedAt || now);
778-
779-    return ageMs > 750;
780-  }
781-
782-  function tickNativeFallback(job: ActiveJob, reason: string): boolean {
783-    const now = Date.now();
784-
785-    jobDebug(
786-      job,
787-      "native-tick reason=" +
788-        reason +
789-        " phase=" +
790-        String(job.context.phase) +
791-        " waiting=" +
792-        String(job.context.waitingForCommandEnd) +
793-        " pending=" +
794-        String(job.pendingCommand === null ? "null" : "set") +
795-        " ageMs=" +
796-        String(now - Number(job.context.startedAt || now)) +
797-        " idleMs=" +
798-        String(now - Number(job.context.updatedAt || now)),
799-    );
800-
801-    if (!shouldTryNativeFallback(job, now)) {
802-      return false;
803-    }
804-
805:    return forceCompleteFromNativeTerminal(job, reason);
806-  }
807-
808-  function jobDebug(job: ActiveJob, message: string): void {
809-    try {
810-      const ctx = job.context as any;
811-
812-      if (!ctx.debug) {
813-        ctx.debug = [];
814-      }
815-
816-      ctx.debug.push(Date.now() + " " + message);
817-
818-      if (ctx.debug.length > 100) {
819-        ctx.debug.splice(0, ctx.debug.length - 100);
820-      }
821-    } catch {}
822-
823-    try {
824-      execLog("JOB DEBUG id=" + job.id + " " + message);
825-    } catch {}
826-  }
827-
828-  function advanceNativePager(device: string): boolean {
829-    try {
830-      const term = getNativeTerminalForDevice(device);
831-      if (!term || typeof term.enterChar !== "function") return false;
832-      term.enterChar(32, 0);
833-      return true;
834-    } catch {
835-      return false;
836-    }
837-  }
838-
839-  function extractLatestCommandBlock(output: string, command: string): string {
840-    const text = normalizeEol(output);
841-    const cmd = String(command || "").trim();
842-
843-    if (!text.trim() || !cmd) return text;
844-
845-    const lines = text.split("\n");
846-    let startIndex = -1;
847-
848-    for (let i = lines.length - 1; i >= 0; i -= 1) {
849-      const line = String(lines[i] || "").trim();
850-
851-      if (line === cmd || line.endsWith(">" + cmd) || line.endsWith("#" + cmd)) {
852-        startIndex = i;
853-        break;
854-      }
855-    }
856-
857-    if (startIndex === -1) {
858-      const idx = text.lastIndexOf(cmd);
859-      if (idx >= 0) return text.slice(idx);
860-      return text;
861-    }
862-
863-    return lines.slice(startIndex).join("\n");
864-  }
865-
866:  function forceCompleteFromNativeTerminal(job: ActiveJob, reason: string): boolean {
867-    const ctx = job.context;
868-    const step = getCurrentStep(ctx);
869-    const command = String(step?.value || "");
870-
871-    if (!step || !command) return false;
872-
873-    jobDebug(job, "native-fallback-enter reason=" + reason);
874-
875-    const output = readNativeTerminalOutput(job.device);
876-    jobDebug(job, "native-output-len=" + String(output.length));
877-
878-    if (!output.trim()) {
879-      jobDebug(job, "native-no-output");
880-      return false;
881-    }
882-
883-    if (outputHasPager(output)) {
884-      const advanced = advanceNativePager(job.device);
885-      execLog(
886-        "JOB NATIVE PAGER id=" +
887-          job.id +
888-          " device=" +
889-          job.device +
890-          " advanced=" +
891-          advanced,
892-      );
893-
894-      ctx.updatedAt = Date.now();
895-      return false;
896-    }
897-
898:    if (nativeOutputTailHasActivePager(output)) {
899-      const advanced = advanceNativePager(job.device);
900-
901-      jobDebug(
902-        job,
903-        "native-active-pager advanced=" +
904-          String(advanced) +
905-          " tail=" +
906-          JSON.stringify(normalizeEol(output).slice(-300)),
907-      );
908-
909-      ctx.paged = true;
910-      ctx.updatedAt = Date.now();
911-
912-      return false;
913-    }
914-
915-    const prompt = getNativePrompt(job.device, output);
916-    const mode = getNativeMode(job.device, prompt);
917-
918:    const nativeInput = getNativeInput(job.device);
919-    jobDebug(job, "native-input=" + JSON.stringify(nativeInput));
920-
921:    if (nativeInputIsOnlyPagerResidue(nativeInput)) {
922-      clearNativeInputIfPagerResidue(job.device);
923-    }
924-
925-    if (step.type === "ensure-mode") {
926-      jobDebug(
927-        job,
928-        "native-ensure-check command=" +
929-          JSON.stringify(command) +
930-          " prompt=" +
931-          JSON.stringify(prompt) +
932-          " mode=" +
933-          JSON.stringify(mode),
934-      );
935-
936-      return completeEnsureModeFromNativeTerminal(job, step, prompt, mode);
937-    }
938-
939-    const block = extractLatestCommandBlock(output, command);
940:    const complete = nativeFallbackBlockLooksComplete(block, command, prompt);
941-
942-    jobDebug(
943-      job,
944-      "native-check command=" +
945-        JSON.stringify(command) +
946-        " prompt=" +
947-        JSON.stringify(prompt) +
948-        " mode=" +
949-        JSON.stringify(mode) +
950-        " blockLen=" +
951-        String(block.length) +
952-        " complete=" +
953-        String(complete) +
954-        " promptOk=" +
955-        String(isIosPrompt(prompt) || isIosPrompt(lastNonEmptyLine(block))) +
956-        " pager=" +
957-        String(outputHasPager(block)) +
958-        " blockHead=" +
959-        JSON.stringify(block.slice(0, 300)) +
960-        " blockTail=" +
961-        JSON.stringify(block.slice(-300)),
962-    );
963-
964-    if (!complete) {
965-      execLog(
966-        "JOB NATIVE INCOMPLETE id=" +
967-          job.id +
968-          " device=" +
969-          job.device +
970-          " command=" +
971-          command +
972-          " prompt=" +
973-          prompt +
974-          " blockTail=" +
975-          block.slice(-300),
976-      );
977-      return false;
978-    }
979-
980-    execLog(
981-      "JOB FORCE COMPLETE FROM NATIVE TERMINAL id=" +
982-        job.id +
983-        " device=" +
984-        job.device +
985-        " reason=" +
986-        reason +
987-        " prompt=" +
988-        prompt +
989-        " mode=" +
990-        mode +
991-        " blockLen=" +
992-        block.length,
993-    );
994-
995-    job.pendingCommand = null;
996-    ctx.waitingForCommandEnd = false;
997-    ctx.outputBuffer += block;
998-    ctx.lastPrompt = prompt;
999-    ctx.lastMode = mode;
1000-    ctx.paged = false;
1001-
1002-    ctx.stepResults.push({
1003-      stepIndex: ctx.currentStep,
1004-      stepType: step.type,
1005-      command,
1006-      raw: block,
1007-      status: 0,
1008-      completedAt: Date.now(),
1009-    });
1010-
1011-    ctx.currentStep++;
1012-    ctx.error = null;
1013-    ctx.errorCode = null;
1014-    ctx.updatedAt = Date.now();
1015-
1016-    const terminalResult = {
1017-      ok: true,
1018-      output: block,
1019-      status: 0,
1020-      session: {
1021-        mode,
1022-        prompt,
1023-        paging: false,
1024-        awaitingConfirm: false,
1025-      },
1026-      mode,
1027-    } as unknown as TerminalResult;
1028-
1029-    if (!completeJobIfLastStep(job, terminalResult)) {
1030-      ctx.phase = "pending";
1031-      advanceJob(job.id);
1032-    }
1033-
1034-    return true;
1035-  }
1036-
1037-  function reapStaleJobs(): void {
1038-    execLog("REAP STALE JOBS tick");
1039-    const now = Date.now();
1040-
1041-    for (const key in jobs) {
1042-      const job = jobs[key];
1043-      if (!job || job.context.finished || job.context.phase === "completed" || job.context.phase === "error") {
1044-        continue;
1045-      }
1046-
1047-      const completedFromNative = tickNativeFallback(job, "reapStaleJobs");
1048-
1049-      if (completedFromNative) {
1050-        continue;
1051-      }
1052-
1053-      if (job.pendingCommand === null) {
1054-        continue;
1055-      }
1056-
1057-      const elapsedMs = now - job.context.updatedAt;
1058-      const withinTimeout = elapsedMs <= getJobTimeoutMs(job);
1059-      const waitingForCommandEnd = job.context.waitingForCommandEnd === true;
1060-      const waitingPhase =
1061-        job.context.phase === "waiting-command" ||
1062-        job.context.phase === "waiting-ensure-mode";
1063-
1064-      if (waitingForCommandEnd && waitingPhase && elapsedMs > 500) {
1065-        try {
1066:          const completedFromNative = forceCompleteFromNativeTerminal(
1067-            job,
1068-            "reapStaleJobs elapsedMs=" + elapsedMs,
1069-          );
1070-
1071-          if (completedFromNative) {
1072-            continue;
1073-          }
1074-        } catch (error) {
1075-          execLog(
1076-            "JOB NATIVE FALLBACK ERROR id=" +
1077-              job.id +
1078-              " device=" +
1079-              job.device +
1080-              " error=" +
1081-              String(error),
1082-          );
1083-        }
1084-      }
1085-
1086-      if (withinTimeout) {
1087-        const output = String(job.context.outputBuffer ?? "");
1088-        const lastPrompt = String(job.context.lastPrompt ?? "");
1089-
1090-        const looksBackAtPrompt =
1091-          /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(lastPrompt.trim());
1092-
1093-        const hasOutput = output.trim().length > 0;
1094-
1095-        if (
1096-          waitingForCommandEnd &&
1097-          job.context.phase === "waiting-command" &&
1098-          looksBackAtPrompt &&
1099-          hasOutput &&
1100-          now - job.context.updatedAt > 750
1101-        ) {
1102-          execLog(
1103-            "JOB FORCE COMPLETE FROM PROMPT id=" +
1104-              job.id +
1105-              " device=" +
1106-              job.device +
1107-              " prompt=" +
1108-              lastPrompt,
1109-          );
1110-
1111-          job.pendingCommand = null;
1112-          job.context.waitingForCommandEnd = false;
1113-          job.context.phase = "completed";
1114-          job.context.finished = true;
1115-          job.context.error = null;
1116-          job.context.errorCode = null;
1117-          job.context.updatedAt = now;
1118-
1119-          job.context.result = {
1120-            ok: true,
1121-            output,
1122-            status: 0,
1123-            prompt: lastPrompt,
1124-            mode: job.context.lastMode,
1125-          } as any;
1126-
1127-          cleanupConfigSession(job.device, job.context.lastMode, job.context.lastPrompt);
1128-          wakePendingJobsForDevice(job.device);
1129-        }
1130-        continue;
1131-      }
1132-
1133-      execLog("JOB TIMEOUT id=" + job.id + " device=" + job.device + " phase=" + job.context.phase);
1134-      job.pendingCommand = null;
1135-      job.context.phase = "error";
1136-      job.context.finished = true;
1137-      job.context.error = "Job timed out while waiting for terminal command completion";
1138-      job.context.errorCode = "JOB_TIMEOUT";
1139-      job.context.updatedAt = now;
1140-      cleanupConfigSession(job.device, job.context.lastMode, job.context.lastPrompt);
1141-      wakePendingJobsForDevice(job.device);
1142-    }
1143-  }
1144-
1145-  function wakePendingJobsForDevice(device: string): void {
1146-    setTimeout(function () {
1147-      for (const key in jobs) {
1148-        const other = jobs[key];
1149-        if (!other) continue;
1150-        if (other.device !== device) continue;
1151-        if (isJobFinished(key)) continue;
1152-        if (other.pendingCommand !== null) continue;
1153-        advanceJob(key);
1154-      }
1155-    }, 0);
1156-  }
1157-
1158-  function modeMatches(actual: unknown, expected: unknown): boolean {
1159-    const current = String(actual ?? "").trim();
1160-    const target = String(expected ?? "").trim();
1161-
1162-    if (!target) return true;
1163-    if (current === target) return true;
1164-
1165-    if (target === "global-config") {
1166-      return current === "config" || current === "global-config";
1167-    }
1168-
1169-    if (target === "privileged-exec") {
1170-      return current === "privileged-exec";
1171-    }
1172-
1173-    return false;
1174-  }
1175-
1176-  function inferModeFromPrompt(prompt: string): string {
1177-    const value = String(prompt ?? "").trim();
1178-
1179-    if (/\(config[^)]*\)#$/.test(value)) return "config";
1180-    if (/#$/.test(value)) return "privileged-exec";
1181-    if (/>$/.test(value)) return "user-exec";
1182-
1183-    return "unknown";
1184-  }
1185-
1186-  function readSession(device: string): { mode: string; prompt: string } {
1187-    try {
1188-      const session = terminal.getSession(device) as any;
1189-      const prompt = String(session?.prompt ?? "");
1190-      const mode = String(session?.mode ?? "unknown");
1191-
1192-      return {
1193-        mode: mode === "unknown" ? inferModeFromPrompt(prompt) : mode,
1194-        prompt,
1195-      };
1196-    } catch {
1197-      return { mode: "unknown", prompt: "" };
1198-    }
1199-  }
1200-
1201-  function commandForEnsureMode(currentMode: string, targetMode: string): string | null {
1202-    if (modeMatches(currentMode, targetMode)) return null;
1203-
1204-    if (targetMode === "privileged-exec") {
1205-      if (isConfigMode(currentMode)) return "end";
1206-      return "enable";
1207-    }
1208-
1209-    if (targetMode === "global-config" || targetMode === "config") {
1210-      if (currentMode === "user-exec" || currentMode === "unknown") return "enable";
1211-      if (currentMode === "privileged-exec") return "configure terminal";
1212-    }
1213-
1214-    return null;
1215-  }
1216-
1217-  function completeJobIfLastStep(job: ActiveJob, result: TerminalResult | null): boolean {
1218-    const ctx = job.context;
1219-
1220-    if (ctx.currentStep < ctx.plan.plan.length) {
1221-      return false;
1222-    }
1223-
1224-    execLog("JOB COMPLETED id=" + job.id + " steps=" + ctx.stepResults.length);
1225-    ctx.phase = "completed";
1226-    ctx.result = result;
1227-    ctx.finished = true;
1228-    ctx.updatedAt = Date.now();
1229-    wakePendingJobsForDevice(job.device);
1230-    return true;
1231-  }
1232-
1233-  function promptMatches(prompt: string, expectedPrompt: string): boolean {
1234-    if (!expectedPrompt) return true;
1235-    if (prompt.indexOf(expectedPrompt) >= 0) return true;
1236-
1237-    try {
1238-      return new RegExp(expectedPrompt).test(prompt);
1239-    } catch {
1240-      return false;
1241-    }
1242-  }
1243-
1244-  function getCurrentStep(ctx: JobContext): DeferredStep | null {
1245-    if (ctx.currentStep >= ctx.plan.plan.length) return null;
1246-    return ctx.plan.plan[ctx.currentStep];
1247-  }
1248-
1249-  function executeCurrentStep(job: ActiveJob): void {
1250-    const ctx = job.context;
1251-    const step = getCurrentStep(ctx);
1252-
1253-    if (!step) {
1254-      execLog("JOB COMPLETE id=" + job.id + " device=" + job.device);
1255-      ctx.phase = "completed";
1256-      ctx.finished = true;
1257-      return;
1258-    }
1259-
1260-    const stepType = step.type;
1261-    const timeout = step.options?.timeoutMs ?? ctx.plan.options.commandTimeoutMs;
1262-    const stopOnError = step.options?.stopOnError ?? ctx.plan.options.stopOnError;
1263-
1264-    switch (stepType) {
1265-      case "delay": {
1266-        const delayMs = parseInt(step.value || "1000", 10);
1267-        execLog("DELAY id=" + job.id + " ms=" + delayMs);
1268-        ctx.phase = "waiting-delay";
1269-        ctx.pendingDelay = delayMs;
1270-        setTimeout(function () {
1271-          ctx.pendingDelay = null;
1272-          advanceJob(job.id);
1273-        }, delayMs);
1274-        break;
1275-      }
1276-
1277-      case "ensure-mode": {
1278-        const targetMode = String(
1279-          (step as any).expectMode ||
1280-            (step.options as any)?.expectedMode ||
1281-            step.value ||
1282-            "privileged-exec",
1283-        );
1284-
1285-        const session = readSession(job.device);
1286-        const command = commandForEnsureMode(session.mode, targetMode);
1287-
1288-        ctx.phase = "waiting-ensure-mode";
1289-        ctx.lastMode = session.mode;
1290-        ctx.lastPrompt = session.prompt;
1291-
1292-        if (!targetMode || command === null) {
1293-          if (targetMode && !modeMatches(session.mode, targetMode)) {
1294-            execLog("ENSURE MODE unsupported target=" + targetMode + " current=" + session.mode + " id=" + job.id);
1295-            if (stopOnError) {
1296-              ctx.phase = "error";
1297-              ctx.error = "Cannot ensure terminal mode " + targetMode + " from " + session.mode;
1298-              ctx.errorCode = "ENSURE_MODE_UNSUPPORTED";
1299-              ctx.finished = true;
1300-              ctx.updatedAt = Date.now();
1301-              wakePendingJobsForDevice(job.device);
1302-              return;
1303-            }
1304-          }
1305-
1306-          ctx.stepResults.push({
1307-            stepIndex: ctx.currentStep,
1308-            stepType: stepType,
1309-            command: "",
1310-            raw: "",
1311-            status: 0,
1312-            completedAt: Date.now(),
1313-          });
1314-          ctx.currentStep++;
1315-          ctx.phase = "pending";
1316-          ctx.updatedAt = Date.now();
1317-          if (!completeJobIfLastStep(job, null)) advanceJob(job.id);
1318-          return;
1319-        }
1320-
1321-        execLog(
1322-          "ENSURE MODE id=" +
1323-            job.id +
1324-            " device=" +
1325-            job.device +
1326-            " current=" +
```

## current terminal baseline
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function safe(name) {
  try {
    if (t && typeof t[name] === \"function\") return String(t[name]());
    return \"<no-method>\";
  } catch(e) {
    return \"<err:\" + String(e) + \">\";
  }
}

return JSON.stringify({
  hasDevice: !!d,
  hasTerminal: !!t,
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  outputTail: safe(\"getOutput\").slice(-1500),
  allOutputTail: safe(\"getAllOutput\").slice(-1500),
  bufferTail: safe(\"getBuffer\").slice(-1500),
  textTail: safe(\"getText\").slice(-1500),
  keys: Object.keys(t || {}).sort()
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function safe(name) {
  try {
    if (t && typeof t[name] === \"function\") return String(t[name]());
    return \"<no-method>\";
  } catch(e) {
    return \"<err:\" + String(e) + \">\";
  }
}

return JSON.stringify({
  hasDevice: !!d,
  hasTerminal: !!t,
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  outputTail: safe(\"getOutput\").slice(-1500),
  allOutputTail: safe(\"getAllOutput\").slice(-1500),
  bufferTail: safe(\"getBuffer\").slice(-1500),
  textTail: safe(\"getText\").slice(-1500),
  keys: Object.keys(t || {}).sort()
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 688,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\n\nfunction safe(name) {\n  try {\n    if (t && typeof t[name] === \"function\") return String(t[name]());\n    return \"<no-method>\";\n  } catch(e) {\n    return \"<err:\" + String(e) + \">\";\n  }\n}\n\nreturn JSON.stringify({\n  hasDevice: !!d,\n  hasTerminal: !!t,\n  prompt: safe(\"getPrompt\"),\n  mode: safe(\"getMode\"),\n  input: safe(\"getCommandInput\"),\n  outputTail: safe(\"getOutput\").slice(-150",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"hasDevice\":true,\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"outputTail\":\"ernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 90,99-100,110,120,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/6\\n!\\ninterface FastEthernet0/7\\n!\\ninterface FastEthernet0/8\\n!\\ninterface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\ninterface FastEthernet0/15\\n!\\ninterface FastEthernet0/16\\n!\\ninterface FastEthernet0/17\\n!\\ninterface FastEthernet0/18\\n!\\ninterface FastEthernet0/19\\n!\\ninterface FastEthernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\",\"allOutputTail\":\"<no-method>\",\"bufferTail\":\"<no-method>\",\"textTail\":\"<no-method>\",\"keys\":[\"_parser\"]}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018598",
      "seq": 18598,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411647047,
      "completedAt": 1777411647256,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"hasDevice\":true,\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"outputTail\":\"ernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 90,99-100,110,120,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/6\\n!\\ninterface FastEthernet0/7\\n!\\ninterface FastEthernet0/8\\n!\\ninterface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\ninterface FastEthernet0/15\\n!\\ninterface FastEthernet0/16\\n!\\ninterface FastEthernet0/17\\n!\\ninterface FastEthernet0/18\\n!\\ninterface FastEthernet0/19\\n!\\ninterface FastEthernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\",\"allOutputTail\":\"<no-method>\",\"bufferTail\":\"<no-method>\",\"textTail\":\"<no-method>\",\"keys\":[\"_parser\"]}"
      },
      "timings": {
        "sentAt": 1777411646951,
        "resultSeenAt": 1777411647315,
        "receivedAt": 1777411647315,
        "waitMs": 364,
        "completedAtMs": 1777411647256
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.4s
```

## input clear experiment
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function pause(ms){ var s = Date.now(); while(Date.now() - s < ms){} }
function safe(name) {
  try {
    if (t && typeof t[name] === \"function\") return String(t[name]());
    return \"<no-method>\";
  } catch(e) {
    return \"<err:\" + String(e) + \">\";
  }
}

var before = {
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  tail: safe(\"getOutput\").slice(-500)
};

try { t.enterChar(21, 0); } catch(e) {}
pause(150);

var afterCtrlU = {
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  tail: safe(\"getOutput\").slice(-500)
};

for (var i = 0; i < 12; i++) {
  try { t.enterChar(8, 0); } catch(e) {}
  pause(20);
}

var afterBackspace = {
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  tail: safe(\"getOutput\").slice(-500)
};

return JSON.stringify({
  before: before,
  afterCtrlU: afterCtrlU,
  afterBackspace: afterBackspace
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function pause(ms){ var s = Date.now(); while(Date.now() - s < ms){} }
function safe(name) {
  try {
    if (t && typeof t[name] === \"function\") return String(t[name]());
    return \"<no-method>\";
  } catch(e) {
    return \"<err:\" + String(e) + \">\";
  }
}

var before = {
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  tail: safe(\"getOutput\").slice(-500)
};

try { t.enterChar(21, 0); } catch(e) {}
pause(150);

var afterCtrlU = {
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  tail: safe(\"getOutput\").slice(-500)
};

for (var i = 0; i < 12; i++) {
  try { t.enterChar(8, 0); } catch(e) {}
  pause(20);
}

var afterBackspace = {
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  tail: safe(\"getOutput\").slice(-500)
};

return JSON.stringify({
  before: before,
  afterCtrlU: afterCtrlU,
  afterBackspace: afterBackspace
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 1076,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\n\nfunction pause(ms){ var s = Date.now(); while(Date.now() - s < ms){} }\nfunction safe(name) {\n  try {\n    if (t && typeof t[name] === \"function\") return String(t[name]());\n    return \"<no-method>\";\n  } catch(e) {\n    return \"<err:\" + String(e) + \">\";\n  }\n}\n\nvar before = {\n  prompt: safe(\"getPrompt\"),\n  mode: safe(\"getMode\"),\n  input: safe(\"getCommandInput\"),\n  tail: safe(\"getO",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"before\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"afterCtrlU\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"afterBackspace\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018599",
      "seq": 18599,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411647911,
      "completedAt": 1777411648371,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"before\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"afterCtrlU\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"afterBackspace\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}}"
      },
      "timings": {
        "sentAt": 1777411647799,
        "resultSeenAt": 1777411648378,
        "receivedAt": 1777411648378,
        "waitMs": 579,
        "completedAtMs": 1777411648371
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.6s
```

## clean terminal length 0 experiment
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function pause(ms){ var s = Date.now(); while(Date.now() - s < ms){} }
function safe(name) {
  try {
    if (t && typeof t[name] === \"function\") return String(t[name]());
    return \"<no-method>\";
  } catch(e) {
    return \"<err:\" + String(e) + \">\";
  }
}
function clearInput() {
  try { t.enterChar(21, 0); } catch(e) {}
  pause(100);
  for (var i = 0; i < 16; i++) {
    try { t.enterChar(8, 0); } catch(e) {}
    pause(10);
  }
}

var start = {
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  tail: safe(\"getOutput\").slice(-700)
};

clearInput();

if (String(t.getPrompt()).slice(-1) === \">\") {
  try { t.enterCommand(\"enable\"); } catch(e) {}
  pause(350);
  clearInput();
}

var beforeCommand = {
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  tail: safe(\"getOutput\").slice(-700)
};

try { t.enterCommand(\"terminal length 0\"); } catch(e) {}
pause(700);

var afterCommand = {
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  tail: safe(\"getOutput\").slice(-1200)
};

return JSON.stringify({
  start: start,
  beforeCommand: beforeCommand,
  afterCommand: afterCommand
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function pause(ms){ var s = Date.now(); while(Date.now() - s < ms){} }
function safe(name) {
  try {
    if (t && typeof t[name] === \"function\") return String(t[name]());
    return \"<no-method>\";
  } catch(e) {
    return \"<err:\" + String(e) + \">\";
  }
}
function clearInput() {
  try { t.enterChar(21, 0); } catch(e) {}
  pause(100);
  for (var i = 0; i < 16; i++) {
    try { t.enterChar(8, 0); } catch(e) {}
    pause(10);
  }
}

var start = {
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  tail: safe(\"getOutput\").slice(-700)
};

clearInput();

if (String(t.getPrompt()).slice(-1) === \">\") {
  try { t.enterCommand(\"enable\"); } catch(e) {}
  pause(350);
  clearInput();
}

var beforeCommand = {
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  tail: safe(\"getOutput\").slice(-700)
};

try { t.enterCommand(\"terminal length 0\"); } catch(e) {}
pause(700);

var afterCommand = {
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  tail: safe(\"getOutput\").slice(-1200)
};

return JSON.stringify({
  start: start,
  beforeCommand: beforeCommand,
  afterCommand: afterCommand
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 1326,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\n\nfunction pause(ms){ var s = Date.now(); while(Date.now() - s < ms){} }\nfunction safe(name) {\n  try {\n    if (t && typeof t[name] === \"function\") return String(t[name]());\n    return \"<no-method>\";\n  } catch(e) {\n    return \"<err:\" + String(e) + \">\";\n  }\n}\nfunction clearInput() {\n  try { t.enterChar(21, 0); } catch(e) {}\n  pause(100);\n  for (var i = 0; i < 16; i++) {\n    try {",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"start\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"beforeCommand\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"afterCommand\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"tEthernet0/6\\n!\\ninterface FastEthernet0/7\\n!\\ninterface FastEthernet0/8\\n!\\ninterface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\ninterface FastEthernet0/15\\n!\\ninterface FastEthernet0/16\\n!\\ninterface FastEthernet0/17\\n!\\ninterface FastEthernet0/18\\n!\\ninterface FastEthernet0/19\\n!\\ninterface FastEthernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\"}}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018600",
      "seq": 18600,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411649112,
      "completedAt": 1777411650147,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"start\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"beforeCommand\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"afterCommand\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"tEthernet0/6\\n!\\ninterface FastEthernet0/7\\n!\\ninterface FastEthernet0/8\\n!\\ninterface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\ninterface FastEthernet0/15\\n!\\ninterface FastEthernet0/16\\n!\\ninterface FastEthernet0/17\\n!\\ninterface FastEthernet0/18\\n!\\ninterface FastEthernet0/19\\n!\\ninterface FastEthernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\"}}"
      },
      "timings": {
        "sentAt": 1777411649000,
        "resultSeenAt": 1777411650153,
        "receivedAt": 1777411650153,
        "waitMs": 1153,
        "completedAtMs": 1777411650147
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 1.2s
```

## native show running-config loop experiment 1
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function pause(ms){ var s = Date.now(); while(Date.now() - s < ms){} }
function raw(){ try { return String(t.getOutput()); } catch(e) { return \"\"; } }
function input(){ try { return String(t.getCommandInput()); } catch(e) { return \"\"; } }
function prompt(){ try { return String(t.getPrompt()); } catch(e) { return \"\"; } }
function mode(){ try { return String(t.getMode()); } catch(e) { return \"\"; } }

function clearInput() {
  try { t.enterChar(21, 0); } catch(e) {}
  pause(80);
  for (var i = 0; i < 16; i++) {
    try { t.enterChar(8, 0); } catch(e) {}
    pause(8);
  }
}

function normalize(v) {
  return String(v || \"\").split(\"\\r\\n\").join(\"\\n\").split(\"\\r\").join(\"\\n\");
}

function trim(v) {
  return String(v || \"\").replace(/^[ \\t]+/, \"\").replace(/[ \\t]+\$/, \"\");
}

function lastNonEmptyLine(v) {
  var lines = normalize(v).split(\"\\n\");
  for (var i = lines.length - 1; i >= 0; i--) {
    var line = trim(lines[i]);
    if (line) return line;
  }
  return \"\";
}

function tailHasPager(v) {
  var tail = normalize(v).slice(-1000).replace(/\\s+\$/, \"\");
  return tail.indexOf(\"--More--\") >= Math.max(0, tail.length - 80) ||
    /More:\$/.test(tail) ||
    /Press any key to continue\$/.test(tail);
}

function lineIsPrompt(line) {
  return /^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\$/.test(trim(line));
}

function hasCommandEcho(v, command) {
  var text = normalize(v).toLowerCase();
  var cmd = String(command || \"\").toLowerCase();
  return text.indexOf(\">\" + cmd) >= 0 || text.indexOf(\"#\" + cmd) >= 0 || text.indexOf(\"\\n\" + cmd + \"\\n\") >= 0;
}

function extractLatestCommandBlock(v, command) {
  var text = normalize(v);
  var cmd = String(command || \"\").toLowerCase();
  var lines = text.split(\"\\n\");
  var startIndex = -1;

  for (var i = lines.length - 1; i >= 0; i--) {
    var lower = trim(lines[i]).toLowerCase();
    if (lower === cmd || lower.indexOf(\">\" + cmd) >= 0 || lower.indexOf(\"#\" + cmd) >= 0) {
      startIndex = i;
      break;
    }
  }

  return startIndex >= 0 ? lines.slice(startIndex).join(\"\\n\") : text;
}

var command = \"show running-config\";
var startedAt = Date.now();

clearInput();

if (String(prompt()).slice(-1) === \">\") {
  try { t.enterCommand(\"enable\"); } catch(e) {}
  pause(300);
  clearInput();
}

var before = {
  prompt: prompt(),
  mode: mode(),
  input: input(),
  tail: raw().slice(-500)
};

try { t.enterCommand(command); } catch(e) {}

var pagerAdvances = 0;
var samples = [];
var lastOutput = \"\";
var stableCount = 0;
var complete = false;
var reason = \"timeout\";

while (Date.now() - startedAt < 8000) {
  var out = raw();
  var tail = normalize(out).slice(-500);
  var lastLine = lastNonEmptyLine(out);
  var pager = tailHasPager(out);
  var echo = hasCommandEcho(out, command);
  var promptAtEnd = lineIsPrompt(lastLine);

  samples.push({
    t: Date.now() - startedAt,
    len: out.length,
    prompt: prompt(),
    mode: mode(),
    input: input(),
    pager: pager,
    echo: echo,
    promptAtEnd: promptAtEnd,
    lastLine: lastLine,
    tail: tail.slice(-180)
  });

  if (pager) {
    try { t.enterChar(32, 0); } catch(e) {}
    pagerAdvances++;
    pause(90);
    continue;
  }

  if (echo && promptAtEnd) {
    if (out === lastOutput) stableCount++;
    else stableCount = 0;

    if (stableCount >= 2) {
      complete = true;
      reason = \"stable-prompt\";
      break;
    }
  }

  lastOutput = out;
  pause(90);
}

var finalOutput = raw();
var block = extractLatestCommandBlock(finalOutput, command);

clearInput();

return JSON.stringify({
  elapsedMs: Date.now() - startedAt,
  complete: complete,
  reason: reason,
  pagerAdvances: pagerAdvances,
  before: before,
  after: {
    prompt: prompt(),
    mode: mode(),
    input: input(),
    tail: raw().slice(-700)
  },
  blockLen: block.length,
  blockHead: block.slice(0, 700),
  blockTail: block.slice(-700),
  samples: samples.slice(-25)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function pause(ms){ var s = Date.now(); while(Date.now() - s < ms){} }
function raw(){ try { return String(t.getOutput()); } catch(e) { return \"\"; } }
function input(){ try { return String(t.getCommandInput()); } catch(e) { return \"\"; } }
function prompt(){ try { return String(t.getPrompt()); } catch(e) { return \"\"; } }
function mode(){ try { return String(t.getMode()); } catch(e) { return \"\"; } }

function clearInput() {
  try { t.enterChar(21, 0); } catch(e) {}
  pause(80);
  for (var i = 0; i < 16; i++) {
    try { t.enterChar(8, 0); } catch(e) {}
    pause(8);
  }
}

function normalize(v) {
  return String(v || \"\").split(\"\\r\\n\").join(\"\\n\").split(\"\\r\").join(\"\\n\");
}

function trim(v) {
  return String(v || \"\").replace(/^[ \\t]+/, \"\").replace(/[ \\t]+\$/, \"\");
}

function lastNonEmptyLine(v) {
  var lines = normalize(v).split(\"\\n\");
  for (var i = lines.length - 1; i >= 0; i--) {
    var line = trim(lines[i]);
    if (line) return line;
  }
  return \"\";
}

function tailHasPager(v) {
  var tail = normalize(v).slice(-1000).replace(/\\s+\$/, \"\");
  return tail.indexOf(\"--More--\") >= Math.max(0, tail.length - 80) ||
    /More:\$/.test(tail) ||
    /Press any key to continue\$/.test(tail);
}

function lineIsPrompt(line) {
  return /^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\$/.test(trim(line));
}

function hasCommandEcho(v, command) {
  var text = normalize(v).toLowerCase();
  var cmd = String(command || \"\").toLowerCase();
  return text.indexOf(\">\" + cmd) >= 0 || text.indexOf(\"#\" + cmd) >= 0 || text.indexOf(\"\\n\" + cmd + \"\\n\") >= 0;
}

function extractLatestCommandBlock(v, command) {
  var text = normalize(v);
  var cmd = String(command || \"\").toLowerCase();
  var lines = text.split(\"\\n\");
  var startIndex = -1;

  for (var i = lines.length - 1; i >= 0; i--) {
    var lower = trim(lines[i]).toLowerCase();
    if (lower === cmd || lower.indexOf(\">\" + cmd) >= 0 || lower.indexOf(\"#\" + cmd) >= 0) {
      startIndex = i;
      break;
    }
  }

  return startIndex >= 0 ? lines.slice(startIndex).join(\"\\n\") : text;
}

var command = \"show running-config\";
var startedAt = Date.now();

clearInput();

if (String(prompt()).slice(-1) === \">\") {
  try { t.enterCommand(\"enable\"); } catch(e) {}
  pause(300);
  clearInput();
}

var before = {
  prompt: prompt(),
  mode: mode(),
  input: input(),
  tail: raw().slice(-500)
};

try { t.enterCommand(command); } catch(e) {}

var pagerAdvances = 0;
var samples = [];
var lastOutput = \"\";
var stableCount = 0;
var complete = false;
var reason = \"timeout\";

while (Date.now() - startedAt < 8000) {
  var out = raw();
  var tail = normalize(out).slice(-500);
  var lastLine = lastNonEmptyLine(out);
  var pager = tailHasPager(out);
  var echo = hasCommandEcho(out, command);
  var promptAtEnd = lineIsPrompt(lastLine);

  samples.push({
    t: Date.now() - startedAt,
    len: out.length,
    prompt: prompt(),
    mode: mode(),
    input: input(),
    pager: pager,
    echo: echo,
    promptAtEnd: promptAtEnd,
    lastLine: lastLine,
    tail: tail.slice(-180)
  });

  if (pager) {
    try { t.enterChar(32, 0); } catch(e) {}
    pagerAdvances++;
    pause(90);
    continue;
  }

  if (echo && promptAtEnd) {
    if (out === lastOutput) stableCount++;
    else stableCount = 0;

    if (stableCount >= 2) {
      complete = true;
      reason = \"stable-prompt\";
      break;
    }
  }

  lastOutput = out;
  pause(90);
}

var finalOutput = raw();
var block = extractLatestCommandBlock(finalOutput, command);

clearInput();

return JSON.stringify({
  elapsedMs: Date.now() - startedAt,
  complete: complete,
  reason: reason,
  pagerAdvances: pagerAdvances,
  before: before,
  after: {
    prompt: prompt(),
    mode: mode(),
    input: input(),
    tail: raw().slice(-700)
  },
  blockLen: block.length,
  blockHead: block.slice(0, 700),
  blockTail: block.slice(-700),
  samples: samples.slice(-25)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 3989,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\n\nfunction pause(ms){ var s = Date.now(); while(Date.now() - s < ms){} }\nfunction raw(){ try { return String(t.getOutput()); } catch(e) { return \"\"; } }\nfunction input(){ try { return String(t.getCommandInput()); } catch(e) { return \"\"; } }\nfunction prompt(){ try { return String(t.getPrompt()); } catch(e) { return \"\"; } }\nfunction mode(){ try { return String(t.getMode()); } cat",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"elapsedMs\":1092,\"complete\":true,\"reason\":\"stable-prompt\",\"pagerAdvances\":5,\"before\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\" trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\"},\"after\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"blockLen\":2127,\"blockHead\":\"SW-SRV-DIST#show running-config\\nBuilding configuration...\\n\\nCurrent configuration : 2020 bytes\\n!\\nversion 12.2\\nno service timestamps log datetime msec\\nno service timestamps debug datetime msec\\nno service password-encryption\\n!\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/2\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tre\",\"blockTail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\",\"samples\":[{\"t\":239,\"len\":9327,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n --More-- \"},{\"t\":331,\"len\":9831,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"pduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n --More-- \"},{\"t\":424,\"len\":4200,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"erface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\n --More-- \"},{\"t\":522,\"len\":4553,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\" FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n --More-- \"},{\"t\":612,\"len\":4994,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"rt mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\n --More-- \"},{\"t\":702,\"len\":5051,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":792,\"len\":5051,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":882,\"len\":5051,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}]}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018601",
      "seq": 18601,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411650914,
      "completedAt": 1777411652113,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"elapsedMs\":1092,\"complete\":true,\"reason\":\"stable-prompt\",\"pagerAdvances\":5,\"before\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\" trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\"},\"after\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"blockLen\":2127,\"blockHead\":\"SW-SRV-DIST#show running-config\\nBuilding configuration...\\n\\nCurrent configuration : 2020 bytes\\n!\\nversion 12.2\\nno service timestamps log datetime msec\\nno service timestamps debug datetime msec\\nno service password-encryption\\n!\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/2\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tre\",\"blockTail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\",\"samples\":[{\"t\":239,\"len\":9327,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n --More-- \"},{\"t\":331,\"len\":9831,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"pduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n --More-- \"},{\"t\":424,\"len\":4200,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"erface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\n --More-- \"},{\"t\":522,\"len\":4553,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\" FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n --More-- \"},{\"t\":612,\"len\":4994,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"rt mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\n --More-- \"},{\"t\":702,\"len\":5051,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":792,\"len\":5051,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":882,\"len\":5051,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}]}"
      },
      "timings": {
        "sentAt": 1777411650821,
        "resultSeenAt": 1777411652163,
        "receivedAt": 1777411652163,
        "waitMs": 1342,
        "completedAtMs": 1777411652113
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 1.4s
```

## native show running-config loop experiment 2
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function pause(ms){ var s = Date.now(); while(Date.now() - s < ms){} }
function raw(){ try { return String(t.getOutput()); } catch(e) { return \"\"; } }
function input(){ try { return String(t.getCommandInput()); } catch(e) { return \"\"; } }
function prompt(){ try { return String(t.getPrompt()); } catch(e) { return \"\"; } }
function mode(){ try { return String(t.getMode()); } catch(e) { return \"\"; } }

function clearInput() {
  try { t.enterChar(21, 0); } catch(e) {}
  pause(80);
  for (var i = 0; i < 16; i++) {
    try { t.enterChar(8, 0); } catch(e) {}
    pause(8);
  }
}

function normalize(v) {
  return String(v || \"\").split(\"\\r\\n\").join(\"\\n\").split(\"\\r\").join(\"\\n\");
}

function trim(v) {
  return String(v || \"\").replace(/^[ \\t]+/, \"\").replace(/[ \\t]+\$/, \"\");
}

function lastNonEmptyLine(v) {
  var lines = normalize(v).split(\"\\n\");
  for (var i = lines.length - 1; i >= 0; i--) {
    var line = trim(lines[i]);
    if (line) return line;
  }
  return \"\";
}

function tailHasPager(v) {
  var tail = normalize(v).slice(-1000).replace(/\\s+\$/, \"\");
  return tail.indexOf(\"--More--\") >= Math.max(0, tail.length - 80) ||
    /More:\$/.test(tail) ||
    /Press any key to continue\$/.test(tail);
}

function lineIsPrompt(line) {
  return /^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\$/.test(trim(line));
}

function hasCommandEcho(v, command) {
  var text = normalize(v).toLowerCase();
  var cmd = String(command || \"\").toLowerCase();
  return text.indexOf(\">\" + cmd) >= 0 || text.indexOf(\"#\" + cmd) >= 0 || text.indexOf(\"\\n\" + cmd + \"\\n\") >= 0;
}

function extractLatestCommandBlock(v, command) {
  var text = normalize(v);
  var cmd = String(command || \"\").toLowerCase();
  var lines = text.split(\"\\n\");
  var startIndex = -1;

  for (var i = lines.length - 1; i >= 0; i--) {
    var lower = trim(lines[i]).toLowerCase();
    if (lower === cmd || lower.indexOf(\">\" + cmd) >= 0 || lower.indexOf(\"#\" + cmd) >= 0) {
      startIndex = i;
      break;
    }
  }

  return startIndex >= 0 ? lines.slice(startIndex).join(\"\\n\") : text;
}

var command = \"show running-config\";
var startedAt = Date.now();

clearInput();

if (String(prompt()).slice(-1) === \">\") {
  try { t.enterCommand(\"enable\"); } catch(e) {}
  pause(300);
  clearInput();
}

var before = {
  prompt: prompt(),
  mode: mode(),
  input: input(),
  tail: raw().slice(-500)
};

try { t.enterCommand(command); } catch(e) {}

var pagerAdvances = 0;
var samples = [];
var lastOutput = \"\";
var stableCount = 0;
var complete = false;
var reason = \"timeout\";

while (Date.now() - startedAt < 8000) {
  var out = raw();
  var tail = normalize(out).slice(-500);
  var lastLine = lastNonEmptyLine(out);
  var pager = tailHasPager(out);
  var echo = hasCommandEcho(out, command);
  var promptAtEnd = lineIsPrompt(lastLine);

  samples.push({
    t: Date.now() - startedAt,
    len: out.length,
    prompt: prompt(),
    mode: mode(),
    input: input(),
    pager: pager,
    echo: echo,
    promptAtEnd: promptAtEnd,
    lastLine: lastLine,
    tail: tail.slice(-180)
  });

  if (pager) {
    try { t.enterChar(32, 0); } catch(e) {}
    pagerAdvances++;
    pause(90);
    continue;
  }

  if (echo && promptAtEnd) {
    if (out === lastOutput) stableCount++;
    else stableCount = 0;

    if (stableCount >= 2) {
      complete = true;
      reason = \"stable-prompt\";
      break;
    }
  }

  lastOutput = out;
  pause(90);
}

var finalOutput = raw();
var block = extractLatestCommandBlock(finalOutput, command);

clearInput();

return JSON.stringify({
  elapsedMs: Date.now() - startedAt,
  complete: complete,
  reason: reason,
  pagerAdvances: pagerAdvances,
  before: before,
  after: {
    prompt: prompt(),
    mode: mode(),
    input: input(),
    tail: raw().slice(-700)
  },
  blockLen: block.length,
  blockHead: block.slice(0, 700),
  blockTail: block.slice(-700),
  samples: samples.slice(-25)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function pause(ms){ var s = Date.now(); while(Date.now() - s < ms){} }
function raw(){ try { return String(t.getOutput()); } catch(e) { return \"\"; } }
function input(){ try { return String(t.getCommandInput()); } catch(e) { return \"\"; } }
function prompt(){ try { return String(t.getPrompt()); } catch(e) { return \"\"; } }
function mode(){ try { return String(t.getMode()); } catch(e) { return \"\"; } }

function clearInput() {
  try { t.enterChar(21, 0); } catch(e) {}
  pause(80);
  for (var i = 0; i < 16; i++) {
    try { t.enterChar(8, 0); } catch(e) {}
    pause(8);
  }
}

function normalize(v) {
  return String(v || \"\").split(\"\\r\\n\").join(\"\\n\").split(\"\\r\").join(\"\\n\");
}

function trim(v) {
  return String(v || \"\").replace(/^[ \\t]+/, \"\").replace(/[ \\t]+\$/, \"\");
}

function lastNonEmptyLine(v) {
  var lines = normalize(v).split(\"\\n\");
  for (var i = lines.length - 1; i >= 0; i--) {
    var line = trim(lines[i]);
    if (line) return line;
  }
  return \"\";
}

function tailHasPager(v) {
  var tail = normalize(v).slice(-1000).replace(/\\s+\$/, \"\");
  return tail.indexOf(\"--More--\") >= Math.max(0, tail.length - 80) ||
    /More:\$/.test(tail) ||
    /Press any key to continue\$/.test(tail);
}

function lineIsPrompt(line) {
  return /^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\$/.test(trim(line));
}

function hasCommandEcho(v, command) {
  var text = normalize(v).toLowerCase();
  var cmd = String(command || \"\").toLowerCase();
  return text.indexOf(\">\" + cmd) >= 0 || text.indexOf(\"#\" + cmd) >= 0 || text.indexOf(\"\\n\" + cmd + \"\\n\") >= 0;
}

function extractLatestCommandBlock(v, command) {
  var text = normalize(v);
  var cmd = String(command || \"\").toLowerCase();
  var lines = text.split(\"\\n\");
  var startIndex = -1;

  for (var i = lines.length - 1; i >= 0; i--) {
    var lower = trim(lines[i]).toLowerCase();
    if (lower === cmd || lower.indexOf(\">\" + cmd) >= 0 || lower.indexOf(\"#\" + cmd) >= 0) {
      startIndex = i;
      break;
    }
  }

  return startIndex >= 0 ? lines.slice(startIndex).join(\"\\n\") : text;
}

var command = \"show running-config\";
var startedAt = Date.now();

clearInput();

if (String(prompt()).slice(-1) === \">\") {
  try { t.enterCommand(\"enable\"); } catch(e) {}
  pause(300);
  clearInput();
}

var before = {
  prompt: prompt(),
  mode: mode(),
  input: input(),
  tail: raw().slice(-500)
};

try { t.enterCommand(command); } catch(e) {}

var pagerAdvances = 0;
var samples = [];
var lastOutput = \"\";
var stableCount = 0;
var complete = false;
var reason = \"timeout\";

while (Date.now() - startedAt < 8000) {
  var out = raw();
  var tail = normalize(out).slice(-500);
  var lastLine = lastNonEmptyLine(out);
  var pager = tailHasPager(out);
  var echo = hasCommandEcho(out, command);
  var promptAtEnd = lineIsPrompt(lastLine);

  samples.push({
    t: Date.now() - startedAt,
    len: out.length,
    prompt: prompt(),
    mode: mode(),
    input: input(),
    pager: pager,
    echo: echo,
    promptAtEnd: promptAtEnd,
    lastLine: lastLine,
    tail: tail.slice(-180)
  });

  if (pager) {
    try { t.enterChar(32, 0); } catch(e) {}
    pagerAdvances++;
    pause(90);
    continue;
  }

  if (echo && promptAtEnd) {
    if (out === lastOutput) stableCount++;
    else stableCount = 0;

    if (stableCount >= 2) {
      complete = true;
      reason = \"stable-prompt\";
      break;
    }
  }

  lastOutput = out;
  pause(90);
}

var finalOutput = raw();
var block = extractLatestCommandBlock(finalOutput, command);

clearInput();

return JSON.stringify({
  elapsedMs: Date.now() - startedAt,
  complete: complete,
  reason: reason,
  pagerAdvances: pagerAdvances,
  before: before,
  after: {
    prompt: prompt(),
    mode: mode(),
    input: input(),
    tail: raw().slice(-700)
  },
  blockLen: block.length,
  blockHead: block.slice(0, 700),
  blockTail: block.slice(-700),
  samples: samples.slice(-25)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 3989,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\n\nfunction pause(ms){ var s = Date.now(); while(Date.now() - s < ms){} }\nfunction raw(){ try { return String(t.getOutput()); } catch(e) { return \"\"; } }\nfunction input(){ try { return String(t.getCommandInput()); } catch(e) { return \"\"; } }\nfunction prompt(){ try { return String(t.getPrompt()); } catch(e) { return \"\"; } }\nfunction mode(){ try { return String(t.getMode()); } cat",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"elapsedMs\":1051,\"complete\":true,\"reason\":\"stable-prompt\",\"pagerAdvances\":5,\"before\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"after\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"blockLen\":2127,\"blockHead\":\"SW-SRV-DIST#show running-config\\nBuilding configuration...\\n\\nCurrent configuration : 2020 bytes\\n!\\nversion 12.2\\nno service timestamps log datetime msec\\nno service timestamps debug datetime msec\\nno service password-encryption\\n!\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/2\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tre\",\"blockTail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\",\"samples\":[{\"t\":209,\"len\":5442,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n --More-- \"},{\"t\":299,\"len\":5946,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"pduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n --More-- \"},{\"t\":389,\"len\":6315,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"erface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\n --More-- \"},{\"t\":480,\"len\":6668,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\" FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n --More-- \"},{\"t\":572,\"len\":7109,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"rt mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\n --More-- \"},{\"t\":663,\"len\":7166,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":753,\"len\":7166,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":843,\"len\":7166,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}]}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018602",
      "seq": 18602,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411652913,
      "completedAt": 1777411654042,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"elapsedMs\":1051,\"complete\":true,\"reason\":\"stable-prompt\",\"pagerAdvances\":5,\"before\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"after\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"blockLen\":2127,\"blockHead\":\"SW-SRV-DIST#show running-config\\nBuilding configuration...\\n\\nCurrent configuration : 2020 bytes\\n!\\nversion 12.2\\nno service timestamps log datetime msec\\nno service timestamps debug datetime msec\\nno service password-encryption\\n!\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/2\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tre\",\"blockTail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\",\"samples\":[{\"t\":209,\"len\":5442,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n --More-- \"},{\"t\":299,\"len\":5946,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"pduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n --More-- \"},{\"t\":389,\"len\":6315,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"erface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\n --More-- \"},{\"t\":480,\"len\":6668,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\" FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n --More-- \"},{\"t\":572,\"len\":7109,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"rt mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\n --More-- \"},{\"t\":663,\"len\":7166,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":753,\"len\":7166,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":843,\"len\":7166,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}]}"
      },
      "timings": {
        "sentAt": 1777411652883,
        "resultSeenAt": 1777411654049,
        "receivedAt": 1777411654049,
        "waitMs": 1166,
        "completedAtMs": 1777411654042
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 1.2s
```

## current pt cmd comparison

### show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "rawOutput": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "status": 0,
  "warnings": [],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777411656626,
      "resultSeenAt": 1777411657039,
      "receivedAt": 1777411657039,
      "waitMs": 413,
      "completedAtMs": 1777411657019
    }
  },
  "timings": {
    "sentAt": 1777411656626,
    "resultSeenAt": 1777411657039,
    "receivedAt": 1777411657039,
    "waitMs": 413,
    "completedAtMs": 1777411657019
  }
}
⏱ pt cmd · 1.9s
```

### show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "",
  "rawOutput": "",
  "status": 1,
  "warnings": [
    "Se filtró el eco del comando (1 línea/s).",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "IOS_EXEC_FAILED",
    "message": "Error en ejecución de comando IOS"
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 15.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## terminal after all experiments
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function safe(name) {
  try {
    if (t && typeof t[name] === \"function\") return String(t[name]());
    return \"<no-method>\";
  } catch(e) {
    return \"<err:\" + String(e) + \">\";
  }
}

return JSON.stringify({
  hasDevice: !!d,
  hasTerminal: !!t,
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  outputTail: safe(\"getOutput\").slice(-1500),
  allOutputTail: safe(\"getAllOutput\").slice(-1500),
  bufferTail: safe(\"getBuffer\").slice(-1500),
  textTail: safe(\"getText\").slice(-1500),
  keys: Object.keys(t || {}).sort()
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function safe(name) {
  try {
    if (t && typeof t[name] === \"function\") return String(t[name]());
    return \"<no-method>\";
  } catch(e) {
    return \"<err:\" + String(e) + \">\";
  }
}

return JSON.stringify({
  hasDevice: !!d,
  hasTerminal: !!t,
  prompt: safe(\"getPrompt\"),
  mode: safe(\"getMode\"),
  input: safe(\"getCommandInput\"),
  outputTail: safe(\"getOutput\").slice(-1500),
  allOutputTail: safe(\"getAllOutput\").slice(-1500),
  bufferTail: safe(\"getBuffer\").slice(-1500),
  textTail: safe(\"getText\").slice(-1500),
  keys: Object.keys(t || {}).sort()
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 688,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\n\nfunction safe(name) {\n  try {\n    if (t && typeof t[name] === \"function\") return String(t[name]());\n    return \"<no-method>\";\n  } catch(e) {\n    return \"<err:\" + String(e) + \">\";\n  }\n}\n\nreturn JSON.stringify({\n  hasDevice: !!d,\n  hasTerminal: !!t,\n  prompt: safe(\"getPrompt\"),\n  mode: safe(\"getMode\"),\n  input: safe(\"getCommandInput\"),\n  outputTail: safe(\"getOutput\").slice(-150",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"hasDevice\":true,\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"  \",\"outputTail\":\"\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST#  \",\"allOutputTail\":\"<no-method>\",\"bufferTail\":\"<no-method>\",\"textTail\":\"<no-method>\",\"keys\":[\"_parser\"]}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018610",
      "seq": 18610,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411674125,
      "completedAt": 1777411674206,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"hasDevice\":true,\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"  \",\"outputTail\":\"\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST#  \",\"allOutputTail\":\"<no-method>\",\"bufferTail\":\"<no-method>\",\"textTail\":\"<no-method>\",\"keys\":[\"_parser\"]}"
      },
      "timings": {
        "sentAt": 1777411674064,
        "resultSeenAt": 1777411674222,
        "receivedAt": 1777411674222,
        "waitMs": 158,
        "completedAtMs": 1777411674206
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.2s
```

## recent results summary
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000018610.json -----
{
  "id": "cmd_000000018610",
  "seq": 18610,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "result": "{\"hasDevice\":true,\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"  \",\"outputTail\":\"\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST#  \",\"allOutputTail\":\"<no-method>\",\"bufferTail\":\"<no-method>\",\"textTail\":\"<no-method>\",\"keys\":[\"_parser\"]}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018607.json -----
{
  "id": "cmd_000000018607",
  "seq": 18607,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "done": true,
  "ok": true,
  "status": 0,
  "result": {
    "ok": true,
    "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
    "status": 0,
    "session": {
      "mode": "privileged-exec",
      "prompt": "SW-SRV-DIST#",
      "paging": false,
      "awaitingConfirm": false
    }
  },
  "raw": "SW-SRV-DIST#terminal length 0\n                     ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#terminal length 0\n                     ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "source": "terminal",
  "session": {
    "mode": "privileged-exec",
    "prompt": "SW-SRV-DIST#",
    "paging": false,
    "awaitingConfirm": false
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018606.json -----
{
  "id": "cmd_000000018606",
  "seq": 18606,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-aadc089c",
  "done": false,
  "state": "waiting-command",
  "currentStep": 1,
  "totalSteps": 2,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "SW-SRV-DIST#terminal length 0\n                     ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#",
  "lastPrompt": "SW-SRV-DIST#",
  "lastMode": "privileged-exec",
  "waitingForCommandEnd": true,
  "updatedAt": 1777411656148,
  "ageMs": 726,
  "idleMs": 110,
  "debug": [
    "1777411655614 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=82 idleMs=82",
    "1777411655692 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=160 idleMs=160",
    "1777411655700 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=168 idleMs=168",
    "1777411655756 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=224 idleMs=224",
    "1777411655812 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=280 idleMs=280",
    "1777411656028 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=496 idleMs=496",
    "1777411656123 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=591 idleMs=591",
    "1777411656127 native-fallback-enter reason=reapStaleJobs elapsedMs=590",
    "1777411656131 native-output-len=7261",
    "1777411656139 native-check command=\"terminal length 0\" prompt=\"SW-SRV-DIST#\" mode=\"privileged-exec\" blockLen=107 complete=true promptOk=true pager=false blockHead=\"SW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\" blockTail=\"SW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\"",
    "1777411656241 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=709 idleMs=93",
    "1777411656250 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=718 idleMs=102"
  ],
  "stepResults": [
    {
      "stepIndex": 0,
      "stepType": "command",
      "command": "terminal length 0",
      "raw": "SW-SRV-DIST#terminal length 0\n                     ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#",
      "status": 0,
      "completedAt": 1777411656148
    }
  ]
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018605.json -----
{
  "id": "cmd_000000018605",
  "seq": 18605,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-aadc089c",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 2,
  "stepType": "command",
  "stepValue": "terminal length 0",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777411655532,
  "ageMs": 172,
  "idleMs": 172,
  "debug": [
    "1777411655614 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=82 idleMs=82",
    "1777411655692 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=160 idleMs=160",
    "1777411655700 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=168 idleMs=168"
  ],
  "stepResults": []
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018604.json -----
{
  "id": "cmd_000000018604",
  "seq": 18604,
  "type": "terminal.plan.run",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-aadc089c",
  "job": {
    "id": "cmd-aadc089c",
    "kind": "ios-session",
    "version": 1,
    "device": "SW-SRV-DIST",
    "plan": [
      {
        "type": "command",
        "kind": "command",
        "value": "terminal length 0",
        "command": "terminal length 0",
        "allowPager": false,
        "allowConfirm": false,
        "optional": false,
        "timeoutMs": 12000,
        "options": {
          "timeoutMs": 12000
        },
        "metadata": {
          "internal": true,
          "suppressOutput": true,
          "reason": "disable-ios-pager-before-show-command"
        }
      },
      {
        "type": "command",
        "kind": "command",
        "value": "show version",
        "command": "show version",
        "allowPager": true,
        "allowConfirm": false,
        "optional": false,
        "timeoutMs": 12000,
        "options": {
          "timeoutMs": 12000
        },
        "metadata": {}
      }
    ],
    "options": {
      "stopOnError": true,
      "commandTimeoutMs": 12000,
      "stallTimeoutMs": 15000
    },
    "payload": {
      "source": "terminal.plan.run",
      "metadata": {
        "deviceKind": "ios",
        "source": "pt-control.terminal-plan-builder",
        "lineCount": 1
      },
      "policies": {
        "autoBreakWizard": true,
        "autoAdvancePager": true,
        "maxPagerAdvances": 80,
        "maxConfirmations": 0,
        "abortOnPromptMismatch": false,
        "abortOnModeMismatch": true
      }
    }
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018602.json -----
{
  "id": "cmd_000000018602",
  "seq": 18602,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "result": "{\"elapsedMs\":1051,\"complete\":true,\"reason\":\"stable-prompt\",\"pagerAdvances\":5,\"before\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"after\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"blockLen\":2127,\"blockHead\":\"SW-SRV-DIST#show running-config\\nBuilding configuration...\\n\\nCurrent configuration : 2020 bytes\\n!\\nversion 12.2\\nno service timestamps log datetime msec\\nno service timestamps debug datetime msec\\nno service password-encryption\\n!\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/2\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tre\",\"blockTail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\",\"samples\":[{\"t\":209,\"len\":5442,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n --More-- \"},{\"t\":299,\"len\":5946,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"pduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n --More-- \"},{\"t\":389,\"len\":6315,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"erface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\n --More-- \"},{\"t\":480,\"len\":6668,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\" FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n --More-- \"},{\"t\":572,\"len\":7109,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"rt mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\n --More-- \"},{\"t\":663,\"len\":7166,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":753,\"len\":7166,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":843,\"len\":7166,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}]}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018601.json -----
{
  "id": "cmd_000000018601",
  "seq": 18601,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "result": "{\"elapsedMs\":1092,\"complete\":true,\"reason\":\"stable-prompt\",\"pagerAdvances\":5,\"before\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\" trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\"},\"after\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"blockLen\":2127,\"blockHead\":\"SW-SRV-DIST#show running-config\\nBuilding configuration...\\n\\nCurrent configuration : 2020 bytes\\n!\\nversion 12.2\\nno service timestamps log datetime msec\\nno service timestamps debug datetime msec\\nno service password-encryption\\n!\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/2\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tre\",\"blockTail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\",\"samples\":[{\"t\":239,\"len\":9327,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n --More-- \"},{\"t\":331,\"len\":9831,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"pduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n --More-- \"},{\"t\":424,\"len\":4200,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"erface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\n --More-- \"},{\"t\":522,\"len\":4553,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\" FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n --More-- \"},{\"t\":612,\"len\":4994,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"rt mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\n --More-- \"},{\"t\":702,\"len\":5051,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":792,\"len\":5051,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":882,\"len\":5051,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}]}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018600.json -----
{
  "id": "cmd_000000018600",
  "seq": 18600,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "result": "{\"start\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"beforeCommand\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"afterCommand\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"tEthernet0/6\\n!\\ninterface FastEthernet0/7\\n!\\ninterface FastEthernet0/8\\n!\\ninterface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\ninterface FastEthernet0/15\\n!\\ninterface FastEthernet0/16\\n!\\ninterface FastEthernet0/17\\n!\\ninterface FastEthernet0/18\\n!\\ninterface FastEthernet0/19\\n!\\ninterface FastEthernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\"}}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018599.json -----
{
  "id": "cmd_000000018599",
  "seq": 18599,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "result": "{\"before\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"afterCtrlU\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"afterBackspace\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018598.json -----
{
  "id": "cmd_000000018598",
  "seq": 18598,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "result": "{\"hasDevice\":true,\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"outputTail\":\"ernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 90,99-100,110,120,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/6\\n!\\ninterface FastEthernet0/7\\n!\\ninterface FastEthernet0/8\\n!\\ninterface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\ninterface FastEthernet0/15\\n!\\ninterface FastEthernet0/16\\n!\\ninterface FastEthernet0/17\\n!\\ninterface FastEthernet0/18\\n!\\ninterface FastEthernet0/19\\n!\\ninterface FastEthernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\",\"allOutputTail\":\"<no-method>\",\"bufferTail\":\"<no-method>\",\"textTail\":\"<no-method>\",\"keys\":[\"_parser\"]}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018597.json -----
{
  "id": "cmd_000000018597",
  "seq": 18597,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
}
```

## relevant logs tail
```

----- /Users/andresgaibor/pt-dev/logs/events.current.ndjson -----
{"seq":17998,"ts":1777400043439,"type":"command-enqueued","id":"cmd_000000017998","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":17999,"ts":1777400043940,"type":"command-enqueued","id":"cmd_000000017999","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18000,"ts":1777400044487,"type":"command-enqueued","id":"cmd_000000018000","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18001,"ts":1777400044950,"type":"command-enqueued","id":"cmd_000000018001","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18002,"ts":1777400045490,"type":"command-enqueued","id":"cmd_000000018002","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18003,"ts":1777400045941,"type":"command-enqueued","id":"cmd_000000018003","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18004,"ts":1777400046491,"type":"command-enqueued","id":"cmd_000000018004","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18005,"ts":1777400046954,"type":"command-enqueued","id":"cmd_000000018005","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18006,"ts":1777400047441,"type":"command-enqueued","id":"cmd_000000018006","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18007,"ts":1777400047941,"type":"command-enqueued","id":"cmd_000000018007","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18008,"ts":1777400048491,"type":"command-enqueued","id":"cmd_000000018008","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18009,"ts":1777400048948,"type":"command-enqueued","id":"cmd_000000018009","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18010,"ts":1777400049439,"type":"command-enqueued","id":"cmd_000000018010","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18011,"ts":1777400049989,"type":"command-enqueued","id":"cmd_000000018011","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18012,"ts":1777400050438,"type":"command-enqueued","id":"cmd_000000018012","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18013,"ts":1777400050990,"type":"command-enqueued","id":"cmd_000000018013","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18014,"ts":1777400051439,"type":"command-enqueued","id":"cmd_000000018014","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18015,"ts":1777400051942,"type":"command-enqueued","id":"cmd_000000018015","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053353}
{"seq":18016,"ts":1777400052490,"type":"command-enqueued","id":"cmd_000000018016","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400053489}
{"seq":18019,"ts":1777400511976,"type":"command-enqueued","id":"cmd_000000018019","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777400516967}
{"seq":18020,"ts":1777400512246,"type":"command-enqueued","id":"cmd_000000018020","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18021,"ts":1777400512802,"type":"command-enqueued","id":"cmd_000000018021","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18022,"ts":1777400513245,"type":"command-enqueued","id":"cmd_000000018022","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18023,"ts":1777400513743,"type":"command-enqueued","id":"cmd_000000018023","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18024,"ts":1777400514245,"type":"command-enqueued","id":"cmd_000000018024","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18025,"ts":1777400514745,"type":"command-enqueued","id":"cmd_000000018025","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18026,"ts":1777400515243,"type":"command-enqueued","id":"cmd_000000018026","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18027,"ts":1777400515745,"type":"command-enqueued","id":"cmd_000000018027","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18028,"ts":1777400516242,"type":"command-enqueued","id":"cmd_000000018028","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18029,"ts":1777400516743,"type":"command-enqueued","id":"cmd_000000018029","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18030,"ts":1777400517243,"type":"command-enqueued","id":"cmd_000000018030","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18031,"ts":1777400517744,"type":"command-enqueued","id":"cmd_000000018031","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18032,"ts":1777400518244,"type":"command-enqueued","id":"cmd_000000018032","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18033,"ts":1777400518742,"type":"command-enqueued","id":"cmd_000000018033","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18034,"ts":1777400519244,"type":"command-enqueued","id":"cmd_000000018034","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18035,"ts":1777400519745,"type":"command-enqueued","id":"cmd_000000018035","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18036,"ts":1777400520245,"type":"command-enqueued","id":"cmd_000000018036","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18037,"ts":1777400520744,"type":"command-enqueued","id":"cmd_000000018037","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18038,"ts":1777400521248,"type":"command-enqueued","id":"cmd_000000018038","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18039,"ts":1777400521743,"type":"command-enqueued","id":"cmd_000000018039","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18040,"ts":1777400522244,"type":"command-enqueued","id":"cmd_000000018040","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18041,"ts":1777400522744,"type":"command-enqueued","id":"cmd_000000018041","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18042,"ts":1777400523298,"type":"command-enqueued","id":"cmd_000000018042","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18043,"ts":1777400523762,"type":"command-enqueued","id":"cmd_000000018043","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18044,"ts":1777400524244,"type":"command-enqueued","id":"cmd_000000018044","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18045,"ts":1777400524747,"type":"command-enqueued","id":"cmd_000000018045","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18046,"ts":1777400525295,"type":"command-enqueued","id":"cmd_000000018046","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18047,"ts":1777400525747,"type":"command-enqueued","id":"cmd_000000018047","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18048,"ts":1777400526295,"type":"command-enqueued","id":"cmd_000000018048","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18049,"ts":1777400526759,"type":"command-enqueued","id":"cmd_000000018049","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18050,"ts":1777400527293,"type":"command-enqueued","id":"cmd_000000018050","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18051,"ts":1777400527758,"type":"command-enqueued","id":"cmd_000000018051","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18052,"ts":1777400528297,"type":"command-enqueued","id":"cmd_000000018052","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18053,"ts":1777400528760,"type":"command-enqueued","id":"cmd_000000018053","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18054,"ts":1777400529299,"type":"command-enqueued","id":"cmd_000000018054","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18055,"ts":1777400529803,"type":"command-enqueued","id":"cmd_000000018055","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18056,"ts":1777400530269,"type":"command-enqueued","id":"cmd_000000018056","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18057,"ts":1777400530801,"type":"command-enqueued","id":"cmd_000000018057","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18058,"ts":1777400531267,"type":"command-enqueued","id":"cmd_000000018058","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18059,"ts":1777400531800,"type":"command-enqueued","id":"cmd_000000018059","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18060,"ts":1777400532266,"type":"command-enqueued","id":"cmd_000000018060","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18061,"ts":1777400532801,"type":"command-enqueued","id":"cmd_000000018061","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18062,"ts":1777400533303,"type":"command-enqueued","id":"cmd_000000018062","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18063,"ts":1777400533768,"type":"command-enqueued","id":"cmd_000000018063","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18064,"ts":1777400534298,"type":"command-enqueued","id":"cmd_000000018064","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18065,"ts":1777400534760,"type":"command-enqueued","id":"cmd_000000018065","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18066,"ts":1777400535297,"type":"command-enqueued","id":"cmd_000000018066","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18067,"ts":1777400535761,"type":"command-enqueued","id":"cmd_000000018067","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18068,"ts":1777400536300,"type":"command-enqueued","id":"cmd_000000018068","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18069,"ts":1777400536766,"type":"command-enqueued","id":"cmd_000000018069","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18070,"ts":1777400537295,"type":"command-enqueued","id":"cmd_000000018070","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542243}
{"seq":18071,"ts":1777400537759,"type":"command-enqueued","id":"cmd_000000018071","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542243}
{"seq":18072,"ts":1777400538297,"type":"command-enqueued","id":"cmd_000000018072","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18073,"ts":1777400538760,"type":"command-enqueued","id":"cmd_000000018073","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18074,"ts":1777400539311,"type":"command-enqueued","id":"cmd_000000018074","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18075,"ts":1777400539882,"type":"command-enqueued","id":"cmd_000000018075","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18076,"ts":1777400540397,"type":"command-enqueued","id":"cmd_000000018076","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18077,"ts":1777400540898,"type":"command-enqueued","id":"cmd_000000018077","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542242}
{"seq":18078,"ts":1777400541404,"type":"command-enqueued","id":"cmd_000000018078","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542402}
{"seq":18079,"ts":1777400541870,"type":"command-enqueued","id":"cmd_000000018079","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400542869}
{"seq":18083,"ts":1777400808201,"type":"command-enqueued","id":"cmd_000000018083","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777400813197}
{"seq":18084,"ts":1777400808411,"type":"command-enqueued","id":"cmd_000000018084","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18085,"ts":1777400808875,"type":"command-enqueued","id":"cmd_000000018085","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838410}
{"seq":18086,"ts":1777400809340,"type":"command-enqueued","id":"cmd_000000018086","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18087,"ts":1777400809890,"type":"command-enqueued","id":"cmd_000000018087","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18088,"ts":1777400810353,"type":"command-enqueued","id":"cmd_000000018088","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18089,"ts":1777400810845,"type":"command-enqueued","id":"cmd_000000018089","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18090,"ts":1777400811347,"type":"command-enqueued","id":"cmd_000000018090","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18091,"ts":1777400811845,"type":"command-enqueued","id":"cmd_000000018091","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18092,"ts":1777400812348,"type":"command-enqueued","id":"cmd_000000018092","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18093,"ts":1777400812843,"type":"command-enqueued","id":"cmd_000000018093","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838410}
{"seq":18094,"ts":1777400813347,"type":"command-enqueued","id":"cmd_000000018094","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18095,"ts":1777400813851,"type":"command-enqueued","id":"cmd_000000018095","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18096,"ts":1777400814348,"type":"command-enqueued","id":"cmd_000000018096","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18097,"ts":1777400814847,"type":"command-enqueued","id":"cmd_000000018097","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18098,"ts":1777400815388,"type":"command-enqueued","id":"cmd_000000018098","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18099,"ts":1777400815846,"type":"command-enqueued","id":"cmd_000000018099","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18100,"ts":1777400816347,"type":"command-enqueued","id":"cmd_000000018100","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838410}
{"seq":18101,"ts":1777400816847,"type":"command-enqueued","id":"cmd_000000018101","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18102,"ts":1777400817348,"type":"command-enqueued","id":"cmd_000000018102","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18103,"ts":1777400817896,"type":"command-enqueued","id":"cmd_000000018103","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18104,"ts":1777400818353,"type":"command-enqueued","id":"cmd_000000018104","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18105,"ts":1777400818903,"type":"command-enqueued","id":"cmd_000000018105","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18106,"ts":1777400819352,"type":"command-enqueued","id":"cmd_000000018106","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18107,"ts":1777400819901,"type":"command-enqueued","id":"cmd_000000018107","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18108,"ts":1777400820365,"type":"command-enqueued","id":"cmd_000000018108","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18109,"ts":1777400820906,"type":"command-enqueued","id":"cmd_000000018109","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18110,"ts":1777400821369,"type":"command-enqueued","id":"cmd_000000018110","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18111,"ts":1777400821902,"type":"command-enqueued","id":"cmd_000000018111","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18112,"ts":1777400822365,"type":"command-enqueued","id":"cmd_000000018112","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18113,"ts":1777400822893,"type":"command-enqueued","id":"cmd_000000018113","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18114,"ts":1777400823357,"type":"command-enqueued","id":"cmd_000000018114","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18115,"ts":1777400823902,"type":"command-enqueued","id":"cmd_000000018115","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18116,"ts":1777400824367,"type":"command-enqueued","id":"cmd_000000018116","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18117,"ts":1777400824901,"type":"command-enqueued","id":"cmd_000000018117","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18118,"ts":1777400825366,"type":"command-enqueued","id":"cmd_000000018118","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18119,"ts":1777400825900,"type":"command-enqueued","id":"cmd_000000018119","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18120,"ts":1777400826403,"type":"command-enqueued","id":"cmd_000000018120","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18121,"ts":1777400826869,"type":"command-enqueued","id":"cmd_000000018121","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18122,"ts":1777400827404,"type":"command-enqueued","id":"cmd_000000018122","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18123,"ts":1777400827869,"type":"command-enqueued","id":"cmd_000000018123","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18124,"ts":1777400828403,"type":"command-enqueued","id":"cmd_000000018124","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18125,"ts":1777400828868,"type":"command-enqueued","id":"cmd_000000018125","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18126,"ts":1777400829401,"type":"command-enqueued","id":"cmd_000000018126","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18127,"ts":1777400829866,"type":"command-enqueued","id":"cmd_000000018127","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18128,"ts":1777400830401,"type":"command-enqueued","id":"cmd_000000018128","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18129,"ts":1777400830867,"type":"command-enqueued","id":"cmd_000000018129","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18130,"ts":1777400831403,"type":"command-enqueued","id":"cmd_000000018130","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18131,"ts":1777400831868,"type":"command-enqueued","id":"cmd_000000018131","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18132,"ts":1777400832400,"type":"command-enqueued","id":"cmd_000000018132","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18133,"ts":1777400832866,"type":"command-enqueued","id":"cmd_000000018133","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18134,"ts":1777400833401,"type":"command-enqueued","id":"cmd_000000018134","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18135,"ts":1777400833866,"type":"command-enqueued","id":"cmd_000000018135","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18136,"ts":1777400834402,"type":"command-enqueued","id":"cmd_000000018136","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18137,"ts":1777400834865,"type":"command-enqueued","id":"cmd_000000018137","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18138,"ts":1777400835402,"type":"command-enqueued","id":"cmd_000000018138","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18139,"ts":1777400835867,"type":"command-enqueued","id":"cmd_000000018139","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18140,"ts":1777400836402,"type":"command-enqueued","id":"cmd_000000018140","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18141,"ts":1777400836869,"type":"command-enqueued","id":"cmd_000000018141","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18142,"ts":1777400837403,"type":"command-enqueued","id":"cmd_000000018142","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400838409}
{"seq":18146,"ts":1777400947854,"type":"command-enqueued","id":"cmd_000000018146","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777400952852}
{"seq":18147,"ts":1777400948017,"type":"command-enqueued","id":"cmd_000000018147","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777400978015}
{"seq":18151,"ts":1777401429351,"type":"command-enqueued","id":"cmd_000000018151","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777401434350}
{"seq":18152,"ts":1777401429515,"type":"command-enqueued","id":"cmd_000000018152","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18153,"ts":1777401429923,"type":"command-enqueued","id":"cmd_000000018153","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18154,"ts":1777401430476,"type":"command-enqueued","id":"cmd_000000018154","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18155,"ts":1777401430996,"type":"command-enqueued","id":"cmd_000000018155","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18156,"ts":1777401431440,"type":"command-enqueued","id":"cmd_000000018156","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18157,"ts":1777401431940,"type":"command-enqueued","id":"cmd_000000018157","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18158,"ts":1777401432441,"type":"command-enqueued","id":"cmd_000000018158","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18159,"ts":1777401432941,"type":"command-enqueued","id":"cmd_000000018159","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18160,"ts":1777401433493,"type":"command-enqueued","id":"cmd_000000018160","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18161,"ts":1777401433941,"type":"command-enqueued","id":"cmd_000000018161","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18162,"ts":1777401434443,"type":"command-enqueued","id":"cmd_000000018162","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459514}
{"seq":18163,"ts":1777401435014,"type":"command-enqueued","id":"cmd_000000018163","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459515}
{"seq":18164,"ts":1777401435601,"type":"command-enqueued","id":"cmd_000000018164","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18165,"ts":1777401436058,"type":"command-enqueued","id":"cmd_000000018165","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18166,"ts":1777401436600,"type":"command-enqueued","id":"cmd_000000018166","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18167,"ts":1777401437067,"type":"command-enqueued","id":"cmd_000000018167","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18168,"ts":1777401437598,"type":"command-enqueued","id":"cmd_000000018168","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18169,"ts":1777401438063,"type":"command-enqueued","id":"cmd_000000018169","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18170,"ts":1777401438596,"type":"command-enqueued","id":"cmd_000000018170","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18171,"ts":1777401439066,"type":"command-enqueued","id":"cmd_000000018171","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18172,"ts":1777401439533,"type":"command-enqueued","id":"cmd_000000018172","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18173,"ts":1777401439998,"type":"command-enqueued","id":"cmd_000000018173","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18174,"ts":1777401440587,"type":"command-enqueued","id":"cmd_000000018174","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18175,"ts":1777401441206,"type":"command-enqueued","id":"cmd_000000018175","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18176,"ts":1777401441760,"type":"command-enqueued","id":"cmd_000000018176","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18177,"ts":1777401442297,"type":"command-enqueued","id":"cmd_000000018177","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18178,"ts":1777401442761,"type":"command-enqueued","id":"cmd_000000018178","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18179,"ts":1777401443300,"type":"command-enqueued","id":"cmd_000000018179","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18180,"ts":1777401443766,"type":"command-enqueued","id":"cmd_000000018180","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18181,"ts":1777401444301,"type":"command-enqueued","id":"cmd_000000018181","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18182,"ts":1777401444768,"type":"command-enqueued","id":"cmd_000000018182","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18183,"ts":1777401445299,"type":"command-enqueued","id":"cmd_000000018183","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18184,"ts":1777401445764,"type":"command-enqueued","id":"cmd_000000018184","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18185,"ts":1777401446294,"type":"command-enqueued","id":"cmd_000000018185","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18186,"ts":1777401446798,"type":"command-enqueued","id":"cmd_000000018186","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18187,"ts":1777401447265,"type":"command-enqueued","id":"cmd_000000018187","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18188,"ts":1777401447796,"type":"command-enqueued","id":"cmd_000000018188","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18189,"ts":1777401448261,"type":"command-enqueued","id":"cmd_000000018189","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18190,"ts":1777401448798,"type":"command-enqueued","id":"cmd_000000018190","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18191,"ts":1777401449300,"type":"command-enqueued","id":"cmd_000000018191","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18192,"ts":1777401449767,"type":"command-enqueued","id":"cmd_000000018192","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18193,"ts":1777401450302,"type":"command-enqueued","id":"cmd_000000018193","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18194,"ts":1777401450765,"type":"command-enqueued","id":"cmd_000000018194","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18195,"ts":1777401451300,"type":"command-enqueued","id":"cmd_000000018195","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18196,"ts":1777401451768,"type":"command-enqueued","id":"cmd_000000018196","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18197,"ts":1777401452302,"type":"command-enqueued","id":"cmd_000000018197","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18198,"ts":1777401452768,"type":"command-enqueued","id":"cmd_000000018198","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18199,"ts":1777401453295,"type":"command-enqueued","id":"cmd_000000018199","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18200,"ts":1777401453803,"type":"command-enqueued","id":"cmd_000000018200","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18201,"ts":1777401454271,"type":"command-enqueued","id":"cmd_000000018201","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18202,"ts":1777401454827,"type":"command-enqueued","id":"cmd_000000018202","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18203,"ts":1777401455293,"type":"command-enqueued","id":"cmd_000000018203","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18204,"ts":1777401455804,"type":"command-enqueued","id":"cmd_000000018204","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18205,"ts":1777401456266,"type":"command-enqueued","id":"cmd_000000018205","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18206,"ts":1777401456735,"type":"command-enqueued","id":"cmd_000000018206","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18207,"ts":1777401457286,"type":"command-enqueued","id":"cmd_000000018207","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18208,"ts":1777401457802,"type":"command-enqueued","id":"cmd_000000018208","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18209,"ts":1777401458266,"type":"command-enqueued","id":"cmd_000000018209","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401459513}
{"seq":18213,"ts":1777401685594,"type":"command-enqueued","id":"cmd_000000018213","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777401690592}
{"seq":18214,"ts":1777401685689,"type":"command-enqueued","id":"cmd_000000018214","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18215,"ts":1777401686091,"type":"command-enqueued","id":"cmd_000000018215","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18216,"ts":1777401686497,"type":"command-enqueued","id":"cmd_000000018216","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18217,"ts":1777401686962,"type":"command-enqueued","id":"cmd_000000018217","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18218,"ts":1777401687493,"type":"command-enqueued","id":"cmd_000000018218","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18219,"ts":1777401688045,"type":"command-enqueued","id":"cmd_000000018219","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18220,"ts":1777401688583,"type":"command-enqueued","id":"cmd_000000018220","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18221,"ts":1777401689097,"type":"command-enqueued","id":"cmd_000000018221","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18222,"ts":1777401689606,"type":"command-enqueued","id":"cmd_000000018222","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18223,"ts":1777401690174,"type":"command-enqueued","id":"cmd_000000018223","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18224,"ts":1777401690724,"type":"command-enqueued","id":"cmd_000000018224","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18225,"ts":1777401691342,"type":"command-enqueued","id":"cmd_000000018225","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18226,"ts":1777401691954,"type":"command-enqueued","id":"cmd_000000018226","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715688}
{"seq":18227,"ts":1777401692570,"type":"command-enqueued","id":"cmd_000000018227","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18228,"ts":1777401693188,"type":"command-enqueued","id":"cmd_000000018228","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18229,"ts":1777401693804,"type":"command-enqueued","id":"cmd_000000018229","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18230,"ts":1777401694425,"type":"command-enqueued","id":"cmd_000000018230","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18231,"ts":1777401695157,"type":"command-enqueued","id":"cmd_000000018231","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18232,"ts":1777401695776,"type":"command-enqueued","id":"cmd_000000018232","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18233,"ts":1777401696441,"type":"command-enqueued","id":"cmd_000000018233","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18234,"ts":1777401697108,"type":"command-enqueued","id":"cmd_000000018234","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18235,"ts":1777401697672,"type":"command-enqueued","id":"cmd_000000018235","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18236,"ts":1777401698509,"type":"command-enqueued","id":"cmd_000000018236","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715688}
{"seq":18237,"ts":1777401699276,"type":"command-enqueued","id":"cmd_000000018237","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18238,"ts":1777401699887,"type":"command-enqueued","id":"cmd_000000018238","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18239,"ts":1777401700503,"type":"command-enqueued","id":"cmd_000000018239","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18240,"ts":1777401701173,"type":"command-enqueued","id":"cmd_000000018240","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18241,"ts":1777401701791,"type":"command-enqueued","id":"cmd_000000018241","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18242,"ts":1777401702477,"type":"command-enqueued","id":"cmd_000000018242","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18243,"ts":1777401703030,"type":"command-enqueued","id":"cmd_000000018243","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18244,"ts":1777401703640,"type":"command-enqueued","id":"cmd_000000018244","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18245,"ts":1777401704308,"type":"command-enqueued","id":"cmd_000000018245","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18246,"ts":1777401704926,"type":"command-enqueued","id":"cmd_000000018246","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18247,"ts":1777401705478,"type":"command-enqueued","id":"cmd_000000018247","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18248,"ts":1777401706095,"type":"command-enqueued","id":"cmd_000000018248","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18249,"ts":1777401706642,"type":"command-enqueued","id":"cmd_000000018249","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18250,"ts":1777401707325,"type":"command-enqueued","id":"cmd_000000018250","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18251,"ts":1777401707942,"type":"command-enqueued","id":"cmd_000000018251","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18252,"ts":1777401708491,"type":"command-enqueued","id":"cmd_000000018252","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18253,"ts":1777401709164,"type":"command-enqueued","id":"cmd_000000018253","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18254,"ts":1777401709781,"type":"command-enqueued","id":"cmd_000000018254","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18255,"ts":1777401710331,"type":"command-enqueued","id":"cmd_000000018255","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18256,"ts":1777401710881,"type":"command-enqueued","id":"cmd_000000018256","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18257,"ts":1777401711430,"type":"command-enqueued","id":"cmd_000000018257","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18258,"ts":1777401712050,"type":"command-enqueued","id":"cmd_000000018258","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18259,"ts":1777401712603,"type":"command-enqueued","id":"cmd_000000018259","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18260,"ts":1777401713214,"type":"command-enqueued","id":"cmd_000000018260","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18261,"ts":1777401713937,"type":"command-enqueued","id":"cmd_000000018261","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18262,"ts":1777401714551,"type":"command-enqueued","id":"cmd_000000018262","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401715687}
{"seq":18266,"ts":1777401930082,"type":"command-enqueued","id":"cmd_000000018266","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777401935081}
{"seq":18267,"ts":1777401930333,"type":"command-enqueued","id":"cmd_000000018267","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18268,"ts":1777401930738,"type":"command-enqueued","id":"cmd_000000018268","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18269,"ts":1777401931288,"type":"command-enqueued","id":"cmd_000000018269","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18270,"ts":1777401931838,"type":"command-enqueued","id":"cmd_000000018270","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18271,"ts":1777401932396,"type":"command-enqueued","id":"cmd_000000018271","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18272,"ts":1777401932992,"type":"command-enqueued","id":"cmd_000000018272","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18273,"ts":1777401933573,"type":"command-enqueued","id":"cmd_000000018273","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18274,"ts":1777401934258,"type":"command-enqueued","id":"cmd_000000018274","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960332}
{"seq":18275,"ts":1777401934825,"type":"command-enqueued","id":"cmd_000000018275","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18276,"ts":1777401935384,"type":"command-enqueued","id":"cmd_000000018276","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18277,"ts":1777401936045,"type":"command-enqueued","id":"cmd_000000018277","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18278,"ts":1777401936704,"type":"command-enqueued","id":"cmd_000000018278","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18279,"ts":1777401937370,"type":"command-enqueued","id":"cmd_000000018279","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18280,"ts":1777401938031,"type":"command-enqueued","id":"cmd_000000018280","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18281,"ts":1777401938583,"type":"command-enqueued","id":"cmd_000000018281","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18282,"ts":1777401939247,"type":"command-enqueued","id":"cmd_000000018282","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18283,"ts":1777401939916,"type":"command-enqueued","id":"cmd_000000018283","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18284,"ts":1777401940579,"type":"command-enqueued","id":"cmd_000000018284","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18285,"ts":1777401941247,"type":"command-enqueued","id":"cmd_000000018285","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18286,"ts":1777401941865,"type":"command-enqueued","id":"cmd_000000018286","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18287,"ts":1777401942424,"type":"command-enqueued","id":"cmd_000000018287","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18288,"ts":1777401942991,"type":"command-enqueued","id":"cmd_000000018288","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18289,"ts":1777401943608,"type":"command-enqueued","id":"cmd_000000018289","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18290,"ts":1777401944175,"type":"command-enqueued","id":"cmd_000000018290","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18291,"ts":1777401944725,"type":"command-enqueued","id":"cmd_000000018291","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18292,"ts":1777401945271,"type":"command-enqueued","id":"cmd_000000018292","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18293,"ts":1777401945930,"type":"command-enqueued","id":"cmd_000000018293","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18294,"ts":1777401946625,"type":"command-enqueued","id":"cmd_000000018294","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960332}
{"seq":18295,"ts":1777401947609,"type":"command-enqueued","id":"cmd_000000018295","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18296,"ts":1777401948159,"type":"command-enqueued","id":"cmd_000000018296","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18297,"ts":1777401948708,"type":"command-enqueued","id":"cmd_000000018297","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18298,"ts":1777401949325,"type":"command-enqueued","id":"cmd_000000018298","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18299,"ts":1777401949987,"type":"command-enqueued","id":"cmd_000000018299","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18300,"ts":1777401950657,"type":"command-enqueued","id":"cmd_000000018300","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18301,"ts":1777401951326,"type":"command-enqueued","id":"cmd_000000018301","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18302,"ts":1777401951874,"type":"command-enqueued","id":"cmd_000000018302","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18303,"ts":1777401952424,"type":"command-enqueued","id":"cmd_000000018303","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18304,"ts":1777401953040,"type":"command-enqueued","id":"cmd_000000018304","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18305,"ts":1777401953720,"type":"command-enqueued","id":"cmd_000000018305","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18306,"ts":1777401954400,"type":"command-enqueued","id":"cmd_000000018306","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18307,"ts":1777401955074,"type":"command-enqueued","id":"cmd_000000018307","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18308,"ts":1777401955948,"type":"command-enqueued","id":"cmd_000000018308","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18309,"ts":1777401956616,"type":"command-enqueued","id":"cmd_000000018309","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18310,"ts":1777401957183,"type":"command-enqueued","id":"cmd_000000018310","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18311,"ts":1777401957802,"type":"command-enqueued","id":"cmd_000000018311","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960332}
{"seq":18312,"ts":1777401958482,"type":"command-enqueued","id":"cmd_000000018312","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18313,"ts":1777401959152,"type":"command-enqueued","id":"cmd_000000018313","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18316,"ts":1777402136896,"type":"command-enqueued","id":"cmd_000000018316","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777402141893}
{"seq":18317,"ts":1777402137241,"type":"command-enqueued","id":"cmd_000000018317","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18318,"ts":1777402137710,"type":"command-enqueued","id":"cmd_000000018318","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18319,"ts":1777402138369,"type":"command-enqueued","id":"cmd_000000018319","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18320,"ts":1777402138920,"type":"command-enqueued","id":"cmd_000000018320","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18321,"ts":1777402139468,"type":"command-enqueued","id":"cmd_000000018321","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18322,"ts":1777402140018,"type":"command-enqueued","id":"cmd_000000018322","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18323,"ts":1777402140626,"type":"command-enqueued","id":"cmd_000000018323","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18324,"ts":1777402141178,"type":"command-enqueued","id":"cmd_000000018324","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18325,"ts":1777402141797,"type":"command-enqueued","id":"cmd_000000018325","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18326,"ts":1777402142414,"type":"command-enqueued","id":"cmd_000000018326","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18327,"ts":1777402142965,"type":"command-enqueued","id":"cmd_000000018327","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18328,"ts":1777402143632,"type":"command-enqueued","id":"cmd_000000018328","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18329,"ts":1777402144314,"type":"command-enqueued","id":"cmd_000000018329","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18330,"ts":1777402144984,"type":"command-enqueued","id":"cmd_000000018330","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18331,"ts":1777402145654,"type":"command-enqueued","id":"cmd_000000018331","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18332,"ts":1777402146324,"type":"command-enqueued","id":"cmd_000000018332","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18333,"ts":1777402147006,"type":"command-enqueued","id":"cmd_000000018333","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18334,"ts":1777402147676,"type":"command-enqueued","id":"cmd_000000018334","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18335,"ts":1777402148289,"type":"command-enqueued","id":"cmd_000000018335","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18336,"ts":1777402148951,"type":"command-enqueued","id":"cmd_000000018336","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18337,"ts":1777402149565,"type":"command-enqueued","id":"cmd_000000018337","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18338,"ts":1777402150247,"type":"command-enqueued","id":"cmd_000000018338","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18339,"ts":1777402150799,"type":"command-enqueued","id":"cmd_000000018339","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18340,"ts":1777402151418,"type":"command-enqueued","id":"cmd_000000018340","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18341,"ts":1777402152083,"type":"command-enqueued","id":"cmd_000000018341","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18342,"ts":1777402152691,"type":"command-enqueued","id":"cmd_000000018342","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18343,"ts":1777402153407,"type":"command-enqueued","id":"cmd_000000018343","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18344,"ts":1777402154024,"type":"command-enqueued","id":"cmd_000000018344","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18345,"ts":1777402154690,"type":"command-enqueued","id":"cmd_000000018345","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18346,"ts":1777402155256,"type":"command-enqueued","id":"cmd_000000018346","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18347,"ts":1777402155872,"type":"command-enqueued","id":"cmd_000000018347","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18348,"ts":1777402156540,"type":"command-enqueued","id":"cmd_000000018348","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18349,"ts":1777402157159,"type":"command-enqueued","id":"cmd_000000018349","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18350,"ts":1777402157769,"type":"command-enqueued","id":"cmd_000000018350","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18351,"ts":1777402158430,"type":"command-enqueued","id":"cmd_000000018351","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18352,"ts":1777402159046,"type":"command-enqueued","id":"cmd_000000018352","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18353,"ts":1777402159719,"type":"command-enqueued","id":"cmd_000000018353","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18354,"ts":1777402160337,"type":"command-enqueued","id":"cmd_000000018354","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18355,"ts":1777402160955,"type":"command-enqueued","id":"cmd_000000018355","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18356,"ts":1777402161636,"type":"command-enqueued","id":"cmd_000000018356","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18357,"ts":1777402162250,"type":"command-enqueued","id":"cmd_000000018357","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18358,"ts":1777402162932,"type":"command-enqueued","id":"cmd_000000018358","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18359,"ts":1777402163601,"type":"command-enqueued","id":"cmd_000000018359","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18360,"ts":1777402164213,"type":"command-enqueued","id":"cmd_000000018360","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18361,"ts":1777402164882,"type":"command-enqueued","id":"cmd_000000018361","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18362,"ts":1777402165493,"type":"command-enqueued","id":"cmd_000000018362","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18363,"ts":1777402166045,"type":"command-enqueued","id":"cmd_000000018363","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18369,"ts":1777402801647,"type":"command-enqueued","id":"cmd_000000018369","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777402806645}
{"seq":18370,"ts":1777402801786,"type":"command-enqueued","id":"cmd_000000018370","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402831784}
{"seq":18371,"ts":1777402802339,"type":"command-enqueued","id":"cmd_000000018371","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402831784}
{"seq":18373,"ts":1777403010341,"type":"command-enqueued","id":"cmd_000000018373","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777403015339}
{"seq":18375,"ts":1777403016222,"type":"command-enqueued","id":"cmd_000000018375","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777403021220}
{"seq":18376,"ts":1777403016536,"type":"command-enqueued","id":"cmd_000000018376","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403046535}
{"seq":18377,"ts":1777403017115,"type":"command-enqueued","id":"cmd_000000018377","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403046535}
{"seq":18378,"ts":1777403017577,"type":"command-enqueued","id":"cmd_000000018378","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403046535}
{"seq":18380,"ts":1777403018430,"type":"command-enqueued","id":"cmd_000000018380","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777403023428}
{"seq":18381,"ts":1777403018741,"type":"command-enqueued","id":"cmd_000000018381","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403048739}
{"seq":18382,"ts":1777403019364,"type":"command-enqueued","id":"cmd_000000018382","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403048739}
{"seq":18383,"ts":1777403019826,"type":"command-enqueued","id":"cmd_000000018383","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403048739}
{"seq":18385,"ts":1777403020705,"type":"command-enqueued","id":"cmd_000000018385","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777403025703}
{"seq":18387,"ts":1777403567813,"type":"command-enqueued","id":"cmd_000000018387","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777403582811}
{"seq":18388,"ts":1777403567973,"type":"command-enqueued","id":"cmd_000000018388","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403597972}
{"seq":18390,"ts":1777403598838,"type":"command-enqueued","id":"cmd_000000018390","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777403613836}
{"seq":18391,"ts":1777403599088,"type":"command-enqueued","id":"cmd_000000018391","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403629087}
{"seq":18393,"ts":1777403629939,"type":"command-enqueued","id":"cmd_000000018393","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777403644938}
{"seq":18394,"ts":1777403630246,"type":"command-enqueued","id":"cmd_000000018394","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403660245}
{"seq":18395,"ts":1777403630797,"type":"command-enqueued","id":"cmd_000000018395","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403660245}
{"seq":18397,"ts":1777403631509,"type":"command-enqueued","id":"cmd_000000018397","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777403646508}
{"seq":18398,"ts":1777403631671,"type":"command-enqueued","id":"cmd_000000018398","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403691670}
{"seq":18399,"ts":1777403632132,"type":"command-enqueued","id":"cmd_000000018399","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403691670}
{"seq":18400,"ts":1777403632594,"type":"command-enqueued","id":"cmd_000000018400","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403691670}
{"seq":18402,"ts":1777403633522,"type":"command-enqueued","id":"cmd_000000018402","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777403648520}
{"seq":18403,"ts":1777403633686,"type":"command-enqueued","id":"cmd_000000018403","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403663685}
{"seq":18404,"ts":1777403634148,"type":"command-enqueued","id":"cmd_000000018404","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403663685}
{"seq":18408,"ts":1777405045158,"type":"command-enqueued","id":"cmd_000000018408","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777405060156}
{"seq":18410,"ts":1777405060801,"type":"command-enqueued","id":"cmd_000000018410","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777405075799}
{"seq":18411,"ts":1777405061133,"type":"command-enqueued","id":"cmd_000000018411","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405091131}
{"seq":18412,"ts":1777405061729,"type":"command-enqueued","id":"cmd_000000018412","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405091131}
{"seq":18413,"ts":1777405062176,"type":"command-enqueued","id":"cmd_000000018413","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405091131}
{"seq":18415,"ts":1777405063122,"type":"command-enqueued","id":"cmd_000000018415","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777405078118}
{"seq":18416,"ts":1777405063374,"type":"command-enqueued","id":"cmd_000000018416","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405093372}
{"seq":18418,"ts":1777405094213,"type":"command-enqueued","id":"cmd_000000018418","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777405109211}
{"seq":18419,"ts":1777405094472,"type":"command-enqueued","id":"cmd_000000018419","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405124470}
{"seq":18421,"ts":1777405125196,"type":"command-enqueued","id":"cmd_000000018421","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777405140195}
{"seq":18422,"ts":1777405125360,"type":"command-enqueued","id":"cmd_000000018422","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405185358}
{"seq":18423,"ts":1777405125823,"type":"command-enqueued","id":"cmd_000000018423","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405185358}
{"seq":18424,"ts":1777405126281,"type":"command-enqueued","id":"cmd_000000018424","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405185358}
{"seq":18425,"ts":1777405126795,"type":"command-enqueued","id":"cmd_000000018425","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405185358}
{"seq":18428,"ts":1777405335207,"type":"command-enqueued","id":"cmd_000000018428","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777405350205}
{"seq":18429,"ts":1777405335477,"type":"command-enqueued","id":"cmd_000000018429","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405395476}
{"seq":18430,"ts":1777405335939,"type":"command-enqueued","id":"cmd_000000018430","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405395476}
{"seq":18431,"ts":1777405336488,"type":"command-enqueued","id":"cmd_000000018431","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405395476}
{"seq":18433,"ts":1777405337415,"type":"command-enqueued","id":"cmd_000000018433","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777405352414}
{"seq":18434,"ts":1777405337666,"type":"command-enqueued","id":"cmd_000000018434","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405367664}
{"seq":18435,"ts":1777405338072,"type":"command-enqueued","id":"cmd_000000018435","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405367664}
{"seq":18436,"ts":1777405338535,"type":"command-enqueued","id":"cmd_000000018436","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405367664}
{"seq":18437,"ts":1777405339026,"type":"command-enqueued","id":"cmd_000000018437","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405367664}
{"seq":18439,"ts":1777405339929,"type":"command-enqueued","id":"cmd_000000018439","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777405354927}
{"seq":18440,"ts":1777405340252,"type":"command-enqueued","id":"cmd_000000018440","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405370251}
{"seq":18441,"ts":1777405340795,"type":"command-enqueued","id":"cmd_000000018441","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405370251}
{"seq":18443,"ts":1777405341700,"type":"command-enqueued","id":"cmd_000000018443","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777405356698}
{"seq":18444,"ts":1777405341861,"type":"command-enqueued","id":"cmd_000000018444","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405371859}
{"seq":18445,"ts":1777405342312,"type":"command-enqueued","id":"cmd_000000018445","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405371859}
{"seq":18446,"ts":1777405342779,"type":"command-enqueued","id":"cmd_000000018446","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405371860}
{"seq":18448,"ts":1777405343703,"type":"command-enqueued","id":"cmd_000000018448","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777405358701}
{"seq":18449,"ts":1777405343866,"type":"command-enqueued","id":"cmd_000000018449","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405403865}
{"seq":18454,"ts":1777405943624,"type":"command-enqueued","id":"cmd_000000018454","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777405958622}
{"seq":18455,"ts":1777405943836,"type":"command-enqueued","id":"cmd_000000018455","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406003834}
{"seq":18456,"ts":1777405944462,"type":"command-enqueued","id":"cmd_000000018456","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406003834}
{"seq":18457,"ts":1777405944924,"type":"command-enqueued","id":"cmd_000000018457","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406003834}
{"seq":18459,"ts":1777405945916,"type":"command-enqueued","id":"cmd_000000018459","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777405960915}
{"seq":18460,"ts":1777405946079,"type":"command-enqueued","id":"cmd_000000018460","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405976078}
{"seq":18461,"ts":1777405946526,"type":"command-enqueued","id":"cmd_000000018461","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405976078}
{"seq":18462,"ts":1777405946990,"type":"command-enqueued","id":"cmd_000000018462","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405976078}
{"seq":18464,"ts":1777405948017,"type":"command-enqueued","id":"cmd_000000018464","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777405963016}
{"seq":18465,"ts":1777405948179,"type":"command-enqueued","id":"cmd_000000018465","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405978177}
{"seq":18466,"ts":1777405948626,"type":"command-enqueued","id":"cmd_000000018466","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405978177}
{"seq":18467,"ts":1777405949141,"type":"command-enqueued","id":"cmd_000000018467","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405978177}
{"seq":18469,"ts":1777405950276,"type":"command-enqueued","id":"cmd_000000018469","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777405965266}
{"seq":18470,"ts":1777405950694,"type":"command-enqueued","id":"cmd_000000018470","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405980677}
{"seq":18471,"ts":1777405951267,"type":"command-enqueued","id":"cmd_000000018471","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405980677}
{"seq":18472,"ts":1777405951822,"type":"command-enqueued","id":"cmd_000000018472","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777405980677}
{"seq":18474,"ts":1777405952853,"type":"command-enqueued","id":"cmd_000000018474","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777405967852}
{"seq":18475,"ts":1777405953105,"type":"command-enqueued","id":"cmd_000000018475","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406013103}
{"seq":18477,"ts":1777406014286,"type":"command-enqueued","id":"cmd_000000018477","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406029285}
{"seq":18478,"ts":1777406014657,"type":"command-enqueued","id":"cmd_000000018478","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406074655}
{"seq":18479,"ts":1777406015275,"type":"command-enqueued","id":"cmd_000000018479","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406074655}
{"seq":18483,"ts":1777406413037,"type":"command-enqueued","id":"cmd_000000018483","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406428035}
{"seq":18484,"ts":1777406413200,"type":"command-enqueued","id":"cmd_000000018484","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406473198}
{"seq":18485,"ts":1777406413658,"type":"command-enqueued","id":"cmd_000000018485","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406473198}
{"seq":18486,"ts":1777406414171,"type":"command-enqueued","id":"cmd_000000018486","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406473198}
{"seq":18488,"ts":1777406415143,"type":"command-enqueued","id":"cmd_000000018488","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406430141}
{"seq":18490,"ts":1777406430923,"type":"command-enqueued","id":"cmd_000000018490","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406445922}
{"seq":18491,"ts":1777406431142,"type":"command-enqueued","id":"cmd_000000018491","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406491137}
{"seq":18492,"ts":1777406431681,"type":"command-enqueued","id":"cmd_000000018492","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406491137}
{"seq":18493,"ts":1777406432485,"type":"command-enqueued","id":"cmd_000000018493","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406491137}
{"seq":18495,"ts":1777406433636,"type":"command-enqueued","id":"cmd_000000018495","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406448634}
{"seq":18496,"ts":1777406433800,"type":"command-enqueued","id":"cmd_000000018496","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406493798}
{"seq":18497,"ts":1777406434262,"type":"command-enqueued","id":"cmd_000000018497","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406493798}
{"seq":18498,"ts":1777406434816,"type":"command-enqueued","id":"cmd_000000018498","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406493798}
{"seq":18500,"ts":1777406435736,"type":"command-enqueued","id":"cmd_000000018500","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406450734}
{"seq":18501,"ts":1777406435899,"type":"command-enqueued","id":"cmd_000000018501","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406495897}
{"seq":18502,"ts":1777406436363,"type":"command-enqueued","id":"cmd_000000018502","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406495897}
{"seq":18503,"ts":1777406436876,"type":"command-enqueued","id":"cmd_000000018503","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406495897}
{"seq":18507,"ts":1777406696865,"type":"command-enqueued","id":"cmd_000000018507","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406711863}
{"seq":18508,"ts":1777406697228,"type":"command-enqueued","id":"cmd_000000018508","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406757227}
{"seq":18511,"ts":1777406758885,"type":"command-enqueued","id":"cmd_000000018511","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406773883}
{"seq":18512,"ts":1777406759249,"type":"command-enqueued","id":"cmd_000000018512","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406819247}
{"seq":18513,"ts":1777406759868,"type":"command-enqueued","id":"cmd_000000018513","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406819247}
{"seq":18516,"ts":1777406762260,"type":"command-enqueued","id":"cmd_000000018516","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406777258}
{"seq":18517,"ts":1777406762625,"type":"command-enqueued","id":"cmd_000000018517","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406822623}
{"seq":18520,"ts":1777406824225,"type":"command-enqueued","id":"cmd_000000018520","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406839223}
{"seq":18523,"ts":1777406840891,"type":"command-enqueued","id":"cmd_000000018523","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406855889}
{"seq":18524,"ts":1777406841258,"type":"command-enqueued","id":"cmd_000000018524","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777406901257}
{"seq":18527,"ts":1777406903393,"type":"command-enqueued","id":"cmd_000000018527","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406918392}
{"seq":18530,"ts":1777406920974,"type":"command-enqueued","id":"cmd_000000018530","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406935971}
{"seq":18533,"ts":1777406937731,"type":"command-enqueued","id":"cmd_000000018533","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406952730}
{"seq":18536,"ts":1777406954395,"type":"command-enqueued","id":"cmd_000000018536","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406969393}
{"seq":18537,"ts":1777406954758,"type":"command-enqueued","id":"cmd_000000018537","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777407014757}
{"seq":18538,"ts":1777406955387,"type":"command-enqueued","id":"cmd_000000018538","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777407014757}
{"seq":18541,"ts":1777406957606,"type":"command-enqueued","id":"cmd_000000018541","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777406972604}
{"seq":18545,"ts":1777411002694,"type":"command-enqueued","id":"cmd_000000018545","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411017692}
{"seq":18546,"ts":1777411003016,"type":"command-enqueued","id":"cmd_000000018546","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411093015}
{"seq":18547,"ts":1777411003624,"type":"command-enqueued","id":"cmd_000000018547","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411093015}
{"seq":18548,"ts":1777411004174,"type":"command-enqueued","id":"cmd_000000018548","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411093015}
{"seq":18549,"ts":1777411004725,"type":"command-enqueued","id":"cmd_000000018549","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411093015}
{"seq":18550,"ts":1777411005532,"type":"command-enqueued","id":"cmd_000000018550","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411093015}
{"seq":18553,"ts":1777411007063,"type":"command-enqueued","id":"cmd_000000018553","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411022061}
{"seq":18556,"ts":1777411023490,"type":"command-enqueued","id":"cmd_000000018556","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411038488}
{"seq":18557,"ts":1777411023807,"type":"command-enqueued","id":"cmd_000000018557","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411113805}
{"seq":18558,"ts":1777411024357,"type":"command-enqueued","id":"cmd_000000018558","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411113805}
{"seq":18559,"ts":1777411024817,"type":"command-enqueued","id":"cmd_000000018559","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411113805}
{"seq":18560,"ts":1777411025481,"type":"command-enqueued","id":"cmd_000000018560","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411113805}
{"seq":18563,"ts":1777411027065,"type":"command-enqueued","id":"cmd_000000018563","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411042064}
{"seq":18566,"ts":1777411043688,"type":"command-enqueued","id":"cmd_000000018566","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411058687}
{"seq":18567,"ts":1777411044006,"type":"command-enqueued","id":"cmd_000000018567","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411134004}
{"seq":18568,"ts":1777411044625,"type":"command-enqueued","id":"cmd_000000018568","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411134004}
{"seq":18569,"ts":1777411045294,"type":"command-enqueued","id":"cmd_000000018569","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411134004}
{"seq":18570,"ts":1777411046568,"type":"command-enqueued","id":"cmd_000000018570","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411134004}
{"seq":18571,"ts":1777411047346,"type":"command-enqueued","id":"cmd_000000018571","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411134004}
{"seq":18574,"ts":1777411049225,"type":"command-enqueued","id":"cmd_000000018574","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411064224}
{"seq":18577,"ts":1777411065891,"type":"command-enqueued","id":"cmd_000000018577","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411080890}
{"seq":18578,"ts":1777411066259,"type":"command-enqueued","id":"cmd_000000018578","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411156257}
{"seq":18579,"ts":1777411066878,"type":"command-enqueued","id":"cmd_000000018579","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411156257}
{"seq":18580,"ts":1777411067491,"type":"command-enqueued","id":"cmd_000000018580","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411156257}
{"seq":18581,"ts":1777411068536,"type":"command-enqueued","id":"cmd_000000018581","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411156257}
{"seq":18582,"ts":1777411069218,"type":"command-enqueued","id":"cmd_000000018582","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411156257}
{"seq":18585,"ts":1777411071077,"type":"command-enqueued","id":"cmd_000000018585","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411086075}
{"seq":18586,"ts":1777411071446,"type":"command-enqueued","id":"cmd_000000018586","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411161444}
{"seq":18589,"ts":1777411163060,"type":"command-enqueued","id":"cmd_000000018589","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411178058}
{"seq":18590,"ts":1777411163633,"type":"command-enqueued","id":"cmd_000000018590","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411253632}
{"seq":18591,"ts":1777411164296,"type":"command-enqueued","id":"cmd_000000018591","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411253632}
{"seq":18592,"ts":1777411164927,"type":"command-enqueued","id":"cmd_000000018592","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411253632}
{"seq":18595,"ts":1777411166961,"type":"command-enqueued","id":"cmd_000000018595","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411181959}
{"seq":18596,"ts":1777411167448,"type":"command-enqueued","id":"cmd_000000018596","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411257446}
{"seq":18604,"ts":1777411655384,"type":"command-enqueued","id":"cmd_000000018604","commandType":"terminal.plan.run","payloadSizeBytes":773,"expiresAt":1777411670379}
{"seq":18605,"ts":1777411655608,"type":"command-enqueued","id":"cmd_000000018605","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411715606}
{"seq":18606,"ts":1777411656072,"type":"command-enqueued","id":"cmd_000000018606","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411715606}
{"seq":18607,"ts":1777411656626,"type":"command-enqueued","id":"cmd_000000018607","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777411715606}
{"seq":18609,"ts":1777411657887,"type":"command-enqueued","id":"cmd_000000018609","commandType":"terminal.plan.run","payloadSizeBytes":981,"expiresAt":1777411672885}

----- /Users/andresgaibor/pt-dev/logs/pt-debug.current.ndjson -----
{"seq":126835,"timestamp":"2026-04-28T21:27:35.452Z","scope":"queue","message":"[queue-claim] candidatos: 1 [\"000000018604-terminal.plan.run.json\"]","level":"debug"}
{"seq":126836,"timestamp":"2026-04-28T21:27:35.457Z","scope":"queue","message":"[queue-claim] claim nuevo: 000000018604-terminal.plan.run.json modo=atomic-move","level":"debug"}
{"seq":126837,"timestamp":"2026-04-28T21:27:35.464Z","scope":"queue","message":"[queue-claim] parseado OK: 000000018604-terminal.plan.run.json tipo=terminal.plan.run","level":"debug"}
{"seq":126838,"timestamp":"2026-04-28T21:27:35.469Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018604 type=terminal.plan.run","level":"info"}
{"seq":126842,"timestamp":"2026-04-28T21:27:35.623Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018605-__pollDeferred.json\"]","level":"debug"}
{"seq":126843,"timestamp":"2026-04-28T21:27:35.630Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018605-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":126844,"timestamp":"2026-04-28T21:27:35.634Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018605-__pollDeferred.json","level":"debug"}
{"seq":126846,"timestamp":"2026-04-28T21:27:35.643Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018605 type=__pollDeferred","level":"info"}
{"seq":126856,"timestamp":"2026-04-28T21:27:36.170Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018606-__pollDeferred.json\"]","level":"debug"}
{"seq":126857,"timestamp":"2026-04-28T21:27:36.174Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018606-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":126858,"timestamp":"2026-04-28T21:27:36.179Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018606-__pollDeferred.json","level":"debug"}
{"seq":126860,"timestamp":"2026-04-28T21:27:36.188Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018606 type=__pollDeferred","level":"info"}
{"seq":126870,"timestamp":"2026-04-28T21:27:36.895Z","scope":"queue","message":"[queue-claim] candidatos: 1 [\"000000018607-__pollDeferred.json\"]","level":"debug"}
{"seq":126871,"timestamp":"2026-04-28T21:27:36.901Z","scope":"queue","message":"[queue-claim] claim nuevo: 000000018607-__pollDeferred.json modo=atomic-move","level":"debug"}
{"seq":126872,"timestamp":"2026-04-28T21:27:36.907Z","scope":"queue","message":"[queue-claim] parseado OK: 000000018607-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":126873,"timestamp":"2026-04-28T21:27:36.914Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018607 type=__pollDeferred","level":"info"}
```
