# pager priority source dump

Fecha: Tue Apr 28 14:59:40 -05 2026

## execution-engine pager/native blocks
```ts
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
636-  function nativeOutputTailHasActivePager(output: string): boolean {
637-    const tail = normalizeEol(output).slice(-800);
638-
639-    if (!tail.trim()) {
640-      return false;
641-    }
642-
643-    return /--More--\s*$/i.test(tail) || /\s--More--\s*$/i.test(tail);
644-  }
645-
646-  function getNativeInput(deviceName: string): string {
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
658-  function nativeInputIsOnlyPagerResidue(input: string): boolean {
659-    return String(input ?? "").replace(/\s+/g, "") === "";
660-  }
661-
662:  function clearNativeInputIfPagerResidue(deviceName: string): void {
663-    try {
664-      const term = getNativeTerminalForDevice(deviceName);
665-
666-      if (!term || typeof term.getCommandInput !== "function") {
667-        return;
668-      }
669-
670-      const input = String(term.getCommandInput() ?? "");
671-
672-      if (!nativeInputIsOnlyPagerResidue(input)) {
673-        return;
674-      }
675-
676-      if (typeof term.enterChar === "function") {
677-        term.enterChar(13, 0);
678-      }
679-    } catch {}
680-  }
681-
682-  function getNativeTerminalForDevice(device: string): any {
683-    try {
684-      const resolvedIpc = resolvePacketTracerIpc();
685-      const net = resolvedIpc && typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
686-      const dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;
687-
688-      if (!dev) return null;
689-
690-      try {
691-        if (typeof dev.getCommandLine === "function") {
692-          const term = dev.getCommandLine();
693-          if (term) return term;
694-        }
695-      } catch {}
696-
697-      try {
698-        if (
699-          typeof dev.getConsole === "function" &&
700-          dev.getConsole() &&
701-          typeof dev.getConsole().getTerminalLine === "function"
702-        ) {
703-          const term = dev.getConsole().getTerminalLine();
704-          if (term) return term;
705-        }
706-      } catch {}
707-
708-      return null;
709-    } catch {
710-      return null;
711-    }
712-  }
713-
714-  function readNativeTerminalOutput(device: string): string {
715-    const term = getNativeTerminalForDevice(device);
716-    if (!term) return "";
717-    return readTerminalTextSafe(term);
718-  }
719-
720-  function getNativePrompt(device: string, output: string): string {
721-    try {
722-      const term = getNativeTerminalForDevice(device);
723-      if (term && typeof term.getPrompt === "function") {
724-        const prompt = String(term.getPrompt() || "").trim();
725-        if (prompt) return prompt;
726-      }
727-    } catch {}
728-
729-    return inferPromptFromTerminalText(output);
730-  }
731-
732-  function getNativeMode(device: string, prompt: string): string {
733-    try {
734-      const term = getNativeTerminalForDevice(device);
735-      if (term && typeof term.getMode === "function") {
736-        const raw = String(term.getMode() || "").trim().toLowerCase();
737-
738-        if (raw === "user") return "user-exec";
739-        if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
740-        if (raw === "global" || raw === "config" || raw === "global-config") return "global-config";
741-        if (raw === "logout") return "logout";
742-      }
743-    } catch {}
744-
745-    return inferModeFromPrompt(prompt);
746-  }
747-
748:  function outputHasPager(output: string): boolean {
749-    return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
750-  }
751-
752-  function shouldTryNativeFallback(job: ActiveJob, now: number): boolean {
753-    const ctx = job.context as any;
754-
755-    if (!job || ctx.finished === true || ctx.phase === "completed" || ctx.phase === "error") {
756-      return false;
757-    }
758-
759-    const waitingPhase =
760-      ctx.phase === "waiting-command" ||
761-      ctx.phase === "waiting-ensure-mode";
762-
763-    if (!waitingPhase) {
764-      return false;
765-    }
766-
767-    if (ctx.waitingForCommandEnd !== true) {
768-      return false;
769-    }
770-
771-    const ageMs = now - Number(ctx.updatedAt || ctx.startedAt || now);
772-
773-    return ageMs > 750;
774-  }
775-
776-  function tickNativeFallback(job: ActiveJob, reason: string): boolean {
777-    const now = Date.now();
778-
779-    jobDebug(
780-      job,
781-      "native-tick reason=" +
782-        reason +
783-        " phase=" +
784-        String(job.context.phase) +
785-        " waiting=" +
786-        String(job.context.waitingForCommandEnd) +
787-        " pending=" +
788-        String(job.pendingCommand === null ? "null" : "set") +
789-        " ageMs=" +
790-        String(now - Number(job.context.startedAt || now)) +
791-        " idleMs=" +
792-        String(now - Number(job.context.updatedAt || now)),
793-    );
794-
795-    if (!shouldTryNativeFallback(job, now)) {
796-      return false;
797-    }
798-
799-    return forceCompleteFromNativeTerminal(job, reason);
800-  }
801-
802-  function jobDebug(job: ActiveJob, message: string): void {
803-    try {
804-      const ctx = job.context as any;
805-
806-      if (!ctx.debug) {
807-        ctx.debug = [];
808-      }
809-
810-      ctx.debug.push(Date.now() + " " + message);
811-
812-      if (ctx.debug.length > 100) {
813-        ctx.debug.splice(0, ctx.debug.length - 100);
814-      }
815-    } catch {}
816-
817-    try {
818-      execLog("JOB DEBUG id=" + job.id + " " + message);
819-    } catch {}
820-  }
821-
822-  function advanceNativePager(device: string): boolean {
823-    try {
824-      const term = getNativeTerminalForDevice(device);
825-      if (!term || typeof term.enterChar !== "function") return false;
826-      term.enterChar(32, 0);
827-      return true;
828-    } catch {
829-      return false;
830-    }
831-  }
832-
833-  function extractLatestCommandBlock(output: string, command: string): string {
834-    const text = normalizeEol(output);
835-    const cmd = String(command || "").trim();
836-
837-    if (!text.trim() || !cmd) return text;
838-
839-    const lines = text.split("\n");
840-    let startIndex = -1;
841-
842-    for (let i = lines.length - 1; i >= 0; i -= 1) {
843-      const line = String(lines[i] || "").trim();
844-
845-      if (line === cmd || line.endsWith(">" + cmd) || line.endsWith("#" + cmd)) {
846-        startIndex = i;
847-        break;
848-      }
849-    }
850-
851-    if (startIndex === -1) {
852-      const idx = text.lastIndexOf(cmd);
853-      if (idx >= 0) return text.slice(idx);
854-      return text;
855-    }
856-
857-    return lines.slice(startIndex).join("\n");
858-  }
859-
860:  function forceCompleteFromNativeTerminal(job: ActiveJob, reason: string): boolean {
861-    const ctx = job.context;
862-    const step = getCurrentStep(ctx);
863-    const command = String(step?.value || "");
864-
865-    if (!step || !command) return false;
866-
867-    jobDebug(job, "native-fallback-enter reason=" + reason);
868-
869-    const output = readNativeTerminalOutput(job.device);
870-    jobDebug(job, "native-output-len=" + String(output.length));
871-
872-    if (!output.trim()) {
873-      jobDebug(job, "native-no-output");
874-      return false;
875-    }
876-
877-    if (outputHasPager(output)) {
878-      const advanced = advanceNativePager(job.device);
879-      execLog(
880-        "JOB NATIVE PAGER id=" +
881-          job.id +
882-          " device=" +
883-          job.device +
884-          " advanced=" +
885-          advanced,
886-      );
887-
888-      ctx.updatedAt = Date.now();
889-      return false;
890-    }
891-
892-    if (nativeOutputTailHasActivePager(output)) {
893-      const advanced = advanceNativePager(job.device);
894-
895-      jobDebug(
896-        job,
897-        "native-active-pager advanced=" +
898-          String(advanced) +
899-          " tail=" +
900-          JSON.stringify(normalizeEol(output).slice(-300)),
901-      );
902-
903-      ctx.paged = true;
904-      ctx.updatedAt = Date.now();
905-
906-      return false;
907-    }
908-
909-    const prompt = getNativePrompt(job.device, output);
910-    const mode = getNativeMode(job.device, prompt);
911-
912-    const nativeInput = getNativeInput(job.device);
913-    jobDebug(job, "native-input=" + JSON.stringify(nativeInput));
914-
915-    if (nativeInputIsOnlyPagerResidue(nativeInput)) {
916-      clearNativeInputIfPagerResidue(job.device);
917-    }
918-
919-    if (step.type === "ensure-mode") {
920-      jobDebug(
921-        job,
922-        "native-ensure-check command=" +
923-          JSON.stringify(command) +
924-          " prompt=" +
925-          JSON.stringify(prompt) +
926-          " mode=" +
927-          JSON.stringify(mode),
928-      );
929-
930-      return completeEnsureModeFromNativeTerminal(job, step, prompt, mode);
931-    }
932-
933-    const block = extractLatestCommandBlock(output, command);
934-    const complete = nativeFallbackBlockLooksComplete(block, command, prompt);
935-
936-    jobDebug(
937-      job,
938-      "native-check command=" +
939-        JSON.stringify(command) +
940-        " prompt=" +
941-        JSON.stringify(prompt) +
942-        " mode=" +
943-        JSON.stringify(mode) +
944-        " blockLen=" +
945-        String(block.length) +
946-        " complete=" +
947-        String(complete) +
948-        " promptOk=" +
949-        String(isIosPrompt(prompt) || isIosPrompt(lastNonEmptyLine(block))) +
950-        " pager=" +
951-        String(outputHasPager(block)) +
952-        " blockHead=" +
953-        JSON.stringify(block.slice(0, 300)) +
954-        " blockTail=" +
955-        JSON.stringify(block.slice(-300)),
956-    );
957-
958-    if (!complete) {
959-      execLog(
960-        "JOB NATIVE INCOMPLETE id=" +
961-          job.id +
962-          " device=" +
963-          job.device +
964-          " command=" +
965-          command +
966-          " prompt=" +
967-          prompt +
968-          " blockTail=" +
969-          block.slice(-300),
970-      );
971-      return false;
972-    }
973-
974-    execLog(
975-      "JOB FORCE COMPLETE FROM NATIVE TERMINAL id=" +
976-        job.id +
977-        " device=" +
978-        job.device +
979-        " reason=" +
980-        reason +
```

## command state machine pager blocks
```ts
1-// ============================================================================
2-// Command State Machine - Máquina de estados para ejecución de comandos
3-// ============================================================================
4-// Extraído de command-executor.ts (líneas 266-787) como clase testeable.
5-// No realiza llamadas directas a la PT API - recibe las dependencias via config.
6-
7-import type { TerminalMode, TerminalSessionKind } from "../session-state";
8-import type { TerminalEventRecord } from "../../pt/terminal/terminal-events";
9-import type { TerminalErrorCode } from "../terminal-errors";
10-import type { CommandEndedPayload } from "../../pt/terminal/terminal-events";
11-
12-function isEnableOrEndCommand(command: string): boolean {
13-  const cmd = command.trim().toLowerCase();
14-  return cmd === "enable" || cmd === "end" || cmd === "exit";
15-}
16-
17-import {
18-  detectConfirmPrompt,
19-  detectPager,
20-  detectHostBusy,
21-  detectDnsLookup,
22-  detectAuthPrompt,
23-  detectModeFromPrompt,
24-  isHostMode,
25-  normalizePrompt,
26-  readTerminalSnapshot,
27-  diffSnapshotStrict,
28:} from "../prompt-detector";
29:import { createPagerHandler } from "../pager-handler";
30-import { createConfirmHandler } from "../confirm-handler";
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
49-import { detectWizardFromOutput, sleep, terminalOutputHasPager } from "../terminal-utils";
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
70:  promptBefore: string;
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
84:  sendPagerAdvanceFn?: (terminal: PTCommandLine, events: TerminalEventRecord[], sessionId: string, deviceName: string, source: string) => boolean;
85-}
86-
87-export interface SendPagerAdvanceFn {
88-  (terminal: PTCommandLine, events: TerminalEventRecord[], sessionId: string, deviceName: string, source: string): boolean;
89-}
90-
91-function defaultSendPagerAdvance(
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
109:    sent ? "pagerAdvance" : "pagerAdvanceFailed",
110-    "SPACE",
111:    sent ? `SPACE sent to pager from ${source}` : `Failed to send SPACE to pager from ${source}`,
112-  );
113-
114-  setTimeout(() => {
115-    try {
116-      if (!terminalOutputHasPager(terminal)) return;
117-
118-      terminal.enterCommand?.(" ");
119-
120-      pushEvent(
121-        events,
122-        sessionId,
123-        deviceName,
124:        "pagerAdvanceFallback",
125-        "SPACE",
126:        `Fallback SPACE command sent to pager from ${source}`,
127-      );
128-    } catch {
129-      pushEvent(
130-        events,
131-        sessionId,
132-        deviceName,
133:        "pagerAdvanceFallbackFailed",
134-        "SPACE",
135-        `Fallback SPACE command failed from ${source}`,
136-      );
137-    }
138-  }, 150);
139-
140-  return sent;
141-}
142-
143-/**
144- * CommandStateMachine - Clase que gestiona el ciclo de vida de un comando terminal.
145- *
146- * Maneja:
147- * - Envío del comando
148: * - Eventos de output, fin de comando, cambio de prompt, pager
149- * - Timeouts (stall, global, start)
150- * - Finalización del comando
151- *
152- * No realiza llamadas directas a PT API - todas las interacciones van via terminal
153- * pasado en el constructor, lo que permite testing con mocks.
154- */
155-export class CommandStateMachine {
156-  private readonly config: Required<CommandStateMachineConfig>;
157:  private readonly sendPagerAdvance: SendPagerAdvanceFn;
158-
159-  // State
160-  private settled = false;
161-  private startedSeen = false;
162-  private commandEndedSeen = false;
163-  private commandEndSeenAt: number | null = null;
164-  private endedStatus: number | null = null;
165-  private wizardDismissed = false;
166-  private hostBusy = false;
167-  private outputBuffer = "";
168-  private outputEventsCount = 0;
169-  private lastTerminalSnapshot: { raw: string; source: string };
170:  private promptFirstSeenAt: number | null = null;
171-  private finalizedOk = true;
172-  private finalizedError: string | undefined;
173-  private finalizedCode: TerminalErrorCode | undefined;
174-
175-  // Timers
176-  private commandEndGraceTimer: ReturnType<typeof setTimeout> | null = null;
177-  private stallTimer: ReturnType<typeof setTimeout> | null = null;
178-  private globalTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
179-  private startTimer: ReturnType<typeof setTimeout> | null = null;
180-  private outputPollTimer: ReturnType<typeof setInterval> | null = null;
181-
182-  // Time tracking
183-  private readonly startedAt: number;
184-  private lastOutputAt: number;
185-  private previousPrompt: string;
186:  private promptStableSince: number | null = null;
187-  private lastPagerAdvanceAt = 0;
188-
189-  // Handlers
190:  private readonly pagerHandler;
191-  private readonly confirmHandler;
192-
193-  // Callbacks bound for unregistering
194-  private readonly onOutputHandler: (src: unknown, args: unknown) => void;
195-  private readonly onStartedHandler: () => void;
196-  private readonly onEndedHandler: (src: unknown, args: unknown) => void;
197-  private readonly onPromptChangedHandler: (src: unknown, args: unknown) => void;
198-  private readonly onMoreDisplayedHandler: (src: unknown, args: unknown) => void;
199-
200-  constructor(config: CommandStateMachineConfig) {
201-    this.config = {
202-      now: function() { return Date.now(); },
203-      setTimeout: setTimeout,
204-      clearTimeout: clearTimeout,
205-      setInterval: setInterval,
206-      clearInterval: clearInterval,
207-      readTerminalSnapshotFn: readTerminalSnapshot,
208-      getPromptSafeFn: getPromptSafe,
209-      getModeSafeFn: getModeSafe,
210-      recoverTerminalSyncFn: recoverTerminalSync,
211:      sendPagerAdvanceFn: defaultSendPagerAdvance,
212-      ...config,
213-    };
214-
215:    this.sendPagerAdvance = this.config.sendPagerAdvanceFn;
216-
217-    this.startedAt = this.config.now();
218-    this.lastOutputAt = this.config.now();
219:    this.previousPrompt = this.config.promptBefore;
220-    this.lastTerminalSnapshot = this.config.baselineSnapshot;
221-
222:    this.pagerHandler = createPagerHandler({
223-      maxAdvances: this.config.options.maxPagerAdvances ?? 50,
224-    });
225-
226-    this.confirmHandler = createConfirmHandler({
227-      autoConfirm: this.config.options.autoConfirm ?? true,
228-    });
229-
230-    // Bind handlers once to avoid issues with unregistration
231-    this.onOutputHandler = this.onOutput.bind(this);
232-    this.onStartedHandler = this.onStarted.bind(this);
233-    this.onEndedHandler = this.onEnded.bind(this);
234-    this.onPromptChangedHandler = this.onPromptChanged.bind(this);
235-    this.onMoreDisplayedHandler = this.onMoreDisplayed.bind(this);
236-  }
237-
238-  private debug(message: string): void {
239-    try {
240-      dprint(
241-        "[cmd-sm] device=" +
242-          this.config.deviceName +
243-          " command=" +
244-          JSON.stringify(this.config.command) +
245-          " " +
246-          message,
247-      );
248-    } catch {}
249-  }
250-
251-  private wakeTerminalIfNeeded(): void {
252-    const terminal = this.config.terminal;
253-
254-    try {
255:      const prompt = this.config.getPromptSafeFn(terminal);
256-      let mode = "";
257-
258-      try {
259-        if (typeof (terminal as any).getMode === "function") {
260-          mode = String((terminal as any).getMode() || "");
261-        }
262-      } catch {}
263-
264-      const needsWake =
265:        !prompt ||
266-        mode.toLowerCase() === "logout" ||
267-        String(this.config.session.lastMode || "") === "logout" ||
268-        this.config.session.lastMode === "unknown";
269-
270-      if (!needsWake) return;
271-
272-      this.debug(
273:        "wake begin prompt=" +
274:          JSON.stringify(prompt) +
275-          " mode=" +
276-          JSON.stringify(mode) +
277-          " sessionMode=" +
278-          JSON.stringify(this.config.session.lastMode),
279-      );
280-
281-      try {
282-        terminal.enterChar(13, 0);
283-      } catch {
284-        try {
285-          terminal.enterCommand("");
286-        } catch {}
287-      }
288-
289-      this.lastOutputAt = this.config.now();
290-      this.config.session.lastActivityAt = this.config.now();
291-      this.debug("wake sent enter");
292-    } catch (error) {
293-      this.debug("wake failed error=" + String(error));
294-    }
295-  }
296-
297-  /**
298-   * Ejecuta el comando y retorna el resultado.
299-   */
300-  async run(): Promise<CommandExecutionResult> {
301-    const { terminal, session, sessionKind, options } = this.config;
302-    const commandTimeoutMs = options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT;
303-    const stallTimeoutMs = options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;
304-
305-    // Ensure terminal ready
306-    const readyResult = ensureTerminalReadySync(terminal, sessionKind, {
307-      maxRetries: 3,
308-      wakeUpOnFail: options.sendEnterFallback ?? true,
309-      ensurePrivileged: options.ensurePrivileged ?? false,
310-    });
311-
312-    if (!readyResult.ready) {
313:      this.config.warnings.push("Terminal not ready after retries: " + readyResult.prompt);
314-    }
315-
316-    this.debug(
317:      "run start promptBefore=" +
318:        JSON.stringify(this.config.promptBefore) +
319-        " modeBefore=" +
320-        JSON.stringify(this.config.modeBefore) +
321-        " timeoutMs=" +
322-        commandTimeoutMs +
323-        " stallMs=" +
324-        stallTimeoutMs,
325-    );
326-
327-    this.setupHandlers();
328-    this.debug("handlers setup complete");
329-
330-    // Start output polling fallback
331-    this.startOutputPolling();
332-
333-    // Set global timeout
334-    this.globalTimeoutTimer = this.config.setTimeout(() => {
335-      if (this.settled) return;
336-      this.finalizeFailure(TerminalErrors.COMMAND_END_TIMEOUT, `Global timeout reached (${commandTimeoutMs}ms)`);
337-    }, commandTimeoutMs);
338-
339-    // Set start detection timeout
340-    this.startTimer = this.config.setTimeout(() => {
341-      if (!this.startedSeen && !this.settled) {
342-        const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);
343-        if (currentPrompt) {
344-          this.startedSeen = true;
345-          this.scheduleFinalizeAfterCommandEnd();
346-        } else {
347-          this.finalizeFailure(TerminalErrors.COMMAND_START_TIMEOUT, "Command did not start");
348-        }
349-      }
350-    }, 2000);
351-
352-    // Send the command
353-    this.wakeTerminalIfNeeded();
354-
355-    sleep(250).then(() => {
356-      if (this.settled) return;
357-
358-      try {
359-        this.debug("enterCommand begin");
360-        terminal.enterCommand(this.config.command);
361-        this.startedSeen = true;
362-        this.resetStallTimer();
363-        this.debug("enterCommand sent");
364-
365-        sleep(100).then(() => {
366-          if (!this.settled) {
367-            this.scheduleFinalizeAfterCommandEnd();
368-          }
369-        });
370-      } catch (e) {
371-        this.finalizeFailure(TerminalErrors.UNKNOWN_STATE, "Failed to send command: " + String(e));
372-      }
373-    });
374-
375-    // Return promise that resolves when settled
376-    return new Promise((resolve) => {
377-      const checkSettled = () => {
378-        if (this.settled) {
379-          resolve(this.buildResult());
380-        } else {
381-          this.config.setTimeout!(checkSettled, 50);
382-        }
383-      };
384-      checkSettled();
385-    });
386-  }
387-
388-  /**
389-   * Build the final result object.
390-   * Called after settled=true.
391-   */
392-  private buildResult(): CommandExecutionResult {
393-    const { session, sessionKind, options } = this.config;
394-    const endedAt = this.config.now();
395:    const promptAfter = this.config.getPromptSafeFn(this.config.terminal);
396-    const modeAfter = this.config.getModeSafeFn(this.config.terminal);
397-
398-    const snapshotAfter = this.config.readTerminalSnapshotFn!(this.config.terminal);
399-    const { delta: snapshotDelta } = diffSnapshotStrict(this.config.baselineOutput, snapshotAfter.raw);
400-
401-    const extractResult = extractCommandOutput({
402-      command: this.config.command,
403-      sessionKind: sessionKind === "unknown" ? "ios" : sessionKind,
404:      promptBefore: this.config.promptBefore,
405:      promptAfter,
406-      eventOutput: this.outputBuffer,
407-      snapshotDelta: snapshotDelta,
408-      snapshotAfter: snapshotAfter,
409-      commandEndedSeen: this.commandEndedSeen,
410-      outputEventsCount: this.outputEventsCount,
411-    });
412-
413-    let finalOutput = extractResult.output;
414-    let finalRaw = extractResult.raw;
415-
416-    if (sessionKind === "host" && detectHostBusy(finalOutput)) {
417-      this.hostBusy = true;
418-    }
419-
420:    const promptMatched = !options.expectedPromptPattern || promptAfter.includes(options.expectedPromptPattern);
421-    const modeMatched = !options.expectedMode || modeAfter === options.expectedMode;
422-
423-    let finalError: string | undefined = this.finalizedError;
424-    let finalCode: TerminalErrorCode | undefined = this.finalizedCode;
425-
426-    const semantic = sessionKind === "host"
427-      ? verifyHostOutput(finalOutput)
428-      : verifyIosOutput(finalOutput);
429-
430-    let cmdOk = this.finalizedOk && (this.endedStatus === null ? true : this.endedStatus === 0);
431-
432-    if (!semantic.ok) {
433-      cmdOk = false;
434-      this.endedStatus = semantic.status;
435-      finalError = semantic.message || finalError;
436-      finalCode = (semantic.code as TerminalErrorCode) || finalCode;
437-      this.config.warnings.push(...semantic.warnings);
438-    } else if (!cmdOk && this.endedStatus === null) {
439-      this.endedStatus = guessFailureStatus(finalOutput);
440-    }
441-
442-    if (sessionKind !== "ios" && sessionKind !== "unknown") {
443:      const hasPager = /--More--/i.test(finalOutput) || /--More--/i.test(this.outputBuffer);
444-      if (hasPager) {
445:        this.config.warnings.push("Output truncated (pager detected, auto-advance disabled)");
446-      }
447-    }
448-
449:    const isOnlyPromptResult = isOnlyPrompt(finalOutput, promptAfter);
450-    const emptyWithoutEnded = !finalOutput.trim() && !this.commandEndedSeen;
451-    if (!options.allowEmptyOutput && (isOnlyPromptResult || emptyWithoutEnded)) {
452-      cmdOk = false;
453-      if (!this.config.warnings.includes("No output received")) {
454-        this.config.warnings.push("No output received");
455-      }
456-    }
457-
458-    const confidence = computeConfidenceString(
459-      cmdOk,
460-      this.config.warnings,
461-      finalOutput,
462-      modeMatched,
463:      promptMatched,
464-      this.startedSeen,
465-      this.commandEndedSeen,
466-      this.outputEventsCount
467-    );
468-
469-    session.lastActivityAt = endedAt;
470-    session.lastCommandEndedAt = endedAt;
471-    session.pendingCommand = null;
472:    session.lastPrompt = promptAfter;
473-    session.lastMode = modeAfter as TerminalMode;
474-    session.outputBuffer = finalOutput;
475:    session.pagerActive = false;
476-    session.confirmPromptActive = false;
477-
478-    session.history.push({ command: this.config.command, output: finalOutput, timestamp: endedAt });
479-    if (session.history.length > 100) session.history.splice(0, 20);
480-
481-    if (!cmdOk) session.health = "desynced";
482-
483-    return {
484:      ok: cmdOk && promptMatched && modeMatched,
485-      command: this.config.command,
486-      output: finalOutput,
487-      rawOutput: finalRaw,
488-      status: this.endedStatus,
489-      startedAt: this.startedAt,
490-      endedAt,
491-      durationMs: Math.max(0, endedAt - this.startedAt),
492:      promptBefore: this.config.promptBefore,
493:      promptAfter,
494-      modeBefore: this.config.modeBefore,
495-      modeAfter,
496-      startedSeen: this.startedSeen,
497-      endedSeen: this.commandEndedSeen,
498-      outputEvents: this.outputEventsCount,
499-      confidence,
500-      warnings: [...this.config.warnings, ...extractResult.warnings],
501-      events: compactTerminalEvents(this.config.events),
502-      error: finalError,
503-      code: finalCode,
504-    };
505-  }
506-
507-  private setupHandlers(): void {
508-    const { terminal } = this.config;
509-
510-    try {
511-      terminal.registerEvent?.("commandStarted", null, this.onStartedHandler);
512-      terminal.registerEvent?.("outputWritten", null, this.onOutputHandler);
513-      terminal.registerEvent?.("commandEnded", null, this.onEndedHandler);
514:      terminal.registerEvent?.("promptChanged", null, this.onPromptChangedHandler);
515-      terminal.registerEvent?.("moreDisplayed", null, this.onMoreDisplayedHandler);
516-    } catch {}
517-  }
518-
519-  private cleanup(): void {
520-    const { terminal } = this.config;
521-
522-    try {
523-      terminal.unregisterEvent?.("commandStarted", null, this.onStartedHandler);
524-      terminal.unregisterEvent?.("outputWritten", null, this.onOutputHandler);
525-      terminal.unregisterEvent?.("commandEnded", null, this.onEndedHandler);
526:      terminal.unregisterEvent?.("promptChanged", null, this.onPromptChangedHandler);
527-      terminal.unregisterEvent?.("moreDisplayed", null, this.onMoreDisplayedHandler);
528-    } catch {}
529-  }
530-
531-  private startOutputPolling(): void {
532-    const poll = (): void => {
533-      if (this.settled) return;
534-      const currentRaw = this.config.readTerminalSnapshotFn!(this.config.terminal);
535-      const rawTail = String(currentRaw.raw || "").slice(-500);
536:      const pagerVisible = /--More--|More:|Press RETURN to get started|Press any key to continue/i.test(rawTail);
537-
538:      if (pagerVisible) {
539:        this.config.session.pagerActive = true;
540:        this.debug("poll pager visible tail=" + JSON.stringify(rawTail.slice(-120)));
541-
542-        if (this.config.options.autoAdvancePager !== false) {
543-          try {
544-            this.config.terminal.enterChar(32, 0);
545:            this.debug("poll pager advanced with space");
546:            this.config.session.pagerActive = false;
547-            this.lastOutputAt = this.config.now();
548-            this.config.session.lastActivityAt = this.config.now();
549-          } catch (error) {
550:            this.debug("poll pager advance failed error=" + String(error));
551-          }
552-        }
553-      }
554-
555-      // Handle buffer reset/rotation
556-      if (currentRaw.raw.length < this.lastTerminalSnapshot.raw.length) {
557-        this.lastTerminalSnapshot = { raw: "", source: "reset" };
558-      }
559-
560-      try {
561:        const prompt = this.config.getPromptSafeFn(this.config.terminal);
562:        if (prompt && prompt !== this.previousPrompt) {
563:          this.previousPrompt = prompt;
564:          this.promptStableSince = this.config.now();
565-
566:          const mode = detectModeFromPrompt(normalizePrompt(prompt));
567:          this.config.session.lastPrompt = normalizePrompt(prompt);
568-          this.config.session.lastMode = mode;
569-
570:          this.debug("poll prompt=" + JSON.stringify(prompt) + " mode=" + mode);
571-          this.scheduleFinalizeAfterCommandEnd();
572-        }
573-      } catch {}
574-
575-      if (currentRaw.raw.length > this.lastTerminalSnapshot.raw.length) {
576-        const delta = currentRaw.raw.substring(this.lastTerminalSnapshot.raw.length);
577-        this.lastTerminalSnapshot = currentRaw;
578-        this.debug("poll output deltaLen=" + delta.length);
579-        this.onOutput(null, { chunk: delta, newOutput: delta });
580-      }
581-    };
582-
583-    poll();
584-    this.outputPollTimer = this.config.setInterval!(poll, 250) as unknown as ReturnType<typeof setInterval>;
585-  }
586-
587-  private clearTimers(): void {
588-    if (this.commandEndGraceTimer) this.config.clearTimeout!(this.commandEndGraceTimer);
589-    if (this.stallTimer) this.config.clearTimeout!(this.stallTimer);
590-    if (this.globalTimeoutTimer) this.config.clearTimeout!(this.globalTimeoutTimer);
591-    if (this.startTimer) this.config.clearTimeout!(this.startTimer);
592-    if (this.outputPollTimer) {
593-      if (this.config.clearInterval) {
594-        this.config.clearInterval(this.outputPollTimer);
595-      } else {
596-        this.config.clearTimeout!(this.outputPollTimer as unknown as ReturnType<typeof setTimeout>);
597-      }
598-      this.outputPollTimer = null;
599-    }
600-  }
601-
602-  private canAdvancePagerNow(): boolean {
603-    const now = this.config.now();
604-    if (now - this.lastPagerAdvanceAt < 120) {
605-      return false;
606-    }
607-    this.lastPagerAdvanceAt = now;
608-    return true;
609-  }
610-
611-  private resetStallTimer(): void {
612-    if (this.stallTimer) this.config.clearTimeout!(this.stallTimer);
613-
614-    const stallTimeoutMs = this.config.options.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;
615-
616-    this.stallTimer = this.config.setTimeout!(() => {
617-      if (this.settled) return;
618-
619-      const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);
620-      const currentMode = this.config.getModeSafeFn(this.config.terminal) as TerminalMode;
621-      const now = this.config.now();
622-
623-      if (currentPrompt !== this.previousPrompt) {
624-        this.previousPrompt = currentPrompt;
625:        this.promptStableSince = now;
626-      }
627-
628-      const verdict = shouldFinalizeCommand({
629-        state: {
630-          startedSeen: this.startedSeen,
631-          commandEndedSeen: this.commandEndedSeen,
632-          commandEndSeenAt: this.commandEndSeenAt,
633-          lastOutputAt: this.lastOutputAt,
634:          promptStableSince: this.promptStableSince,
635-          previousPrompt: this.previousPrompt,
636-        },
637-        currentPrompt,
638-        currentMode,
639-        expectedMode: this.config.options.expectedMode,
640-        sessionKind: this.config.sessionKind,
641:        pagerActive: this.config.session.pagerActive,
642-        confirmPromptActive: this.config.session.confirmPromptActive,
643-      });
644-
645-      if (verdict.finished) {
646-        this.finalize(true, this.endedStatus, verdict.reason);
647-        return;
648-      }
649-
650-      this.finalizeFailure(
651-        TerminalErrors.COMMAND_END_TIMEOUT,
652-        "Command stalled before completion",
653-      );
654-    }, stallTimeoutMs);
655-  }
656-
657-  private onOutput(_src: unknown, args: unknown): void {
658-    const payload = args as any;
659-    const chunk = String(payload?.newOutput ?? payload?.data ?? payload?.output ?? payload?.chunk ?? "");
660-    if (!chunk) return;
661-
662-    this.outputEventsCount++;
663-    this.outputBuffer += chunk;
664-    this.lastOutputAt = this.config.now();
665-
666-    const currentRaw = this.config.readTerminalSnapshotFn!(this.config.terminal);
667-    if (currentRaw.raw.length >= this.lastTerminalSnapshot.raw.length) {
668-      this.lastTerminalSnapshot = currentRaw;
669-    }
670-
671-    pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "outputWritten", chunk, chunk.trim());
672-
673-    if (detectDnsLookup(chunk)) {
674-      try {
675-        this.config.terminal.enterChar(3, 0);
676-        this.config.warnings.push("DNS Hangup detected (Translating...). Breaking with Ctrl+C");
677-        pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "dnsBreak", "Ctrl+C", "Ctrl+C");
678-      } catch (e) {}
679-    }
680-
681-    if (detectWizardFromOutput(chunk)) {
682-      this.config.session.wizardDetected = true;
683-      if (this.config.options.autoDismissWizard !== false && !this.wizardDismissed) {
684-        this.wizardDismissed = true;
685-        try { this.config.terminal.enterCommand("no"); this.resetStallTimer(); } catch {}
686-      }
687-    }
688-
689-    if (detectConfirmPrompt(chunk)) {
690-      this.config.session.confirmPromptActive = true;
691-      this.confirmHandler.handleOutput(chunk);
692-      if (this.config.options.autoConfirm && this.confirmHandler.shouldAutoConfirm()) {
693-        try {
694-          const lower = chunk.toLowerCase();
695-          if (lower.indexOf("[yes/no]") !== -1 || lower.indexOf("(y/n)") !== -1) {
696-            this.config.terminal.enterCommand("y");
697-          } else {
698-            this.config.terminal.enterChar(13, 0);
699-          }
700-          this.confirmHandler.confirm();
701-          this.resetStallTimer();
702-        } catch {}
703-      }
704-    }
705-
706-    if (detectAuthPrompt(chunk)) {
707-      this.config.warnings.push("Authentication required");
708-      if (this.commandEndGraceTimer) this.config.clearTimeout!(this.commandEndGraceTimer);
709-      this.commandEndGraceTimer = this.config.setTimeout!(() => {
710-        if (!this.settled) this.finalize(true, 0);
711-      }, 900);
712-      return;
713-    }
714-
715-    if (detectPager(chunk)) {
716:      this.config.session.pagerActive = true;
717:      this.pagerHandler.handleOutput(chunk);
718-
719:      if (this.pagerHandler.isLoop()) {
720-        this.finalizeFailure(
721-          TerminalErrors.COMMAND_END_TIMEOUT,
722-          `Pager advance limit reached (${this.config.options.maxPagerAdvances ?? 50})`,
723-        );
724-        return;
725-      }
726-
727-      if (this.config.sessionKind !== "ios" && this.config.sessionKind !== "unknown") {
728:        const hasPager = /--More--/i.test(chunk);
729-        if (hasPager) {
730-          this.finalize(true, this.endedStatus, "Pager detected in non-IOS session");
731-          return;
732-        }
733-      }
734-
735-      if (
736-        this.config.options.autoAdvancePager !== false &&
737:        this.pagerHandler.canContinue() &&
738-        this.canAdvancePagerNow()
739-      ) {
740:        this.pagerHandler.advance();
741-
742-        this.config.setTimeout!(() => {
743-          if (this.settled) return;
744:          const sent = this.sendPagerAdvance(
745-            this.config.terminal,
746-            this.config.events,
747-            this.config.session.sessionId,
748-            this.config.deviceName,
749:            "pagerHandler",
750-          );
751-
752-          if (!sent) {
753-            this.finalizeFailure(
754-              TerminalErrors.COMMAND_END_TIMEOUT,
755-              "Pager detected but auto-advance failed",
756-            );
757-            return;
758-          }
759-
760:          this.config.session.pagerActive = false;
761-          this.resetStallTimer();
762-        }, 50);
763-      }
764-    }
765-
766-    this.resetStallTimer();
767-    this.scheduleFinalizeAfterCommandEnd();
768-  }
769-
770-  private onStarted(): void {
771-    this.startedSeen = true;
772-    if (this.startTimer) { this.config.clearTimeout!(this.startTimer); this.startTimer = null; }
773-    this.config.session.lastActivityAt = this.config.now();
774-    this.resetStallTimer();
775-    pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "commandStarted", this.config.command, this.config.command);
776-  }
777-
778-  private onEnded(_src: unknown, args: unknown): void {
779-    const payload = args as CommandEndedPayload;
780-    this.commandEndedSeen = true;
781-    this.commandEndSeenAt = this.config.now();
782-    this.endedStatus = payload.status ?? 0;
783-    this.resetStallTimer();
784-    pushEvent(this.config.events, this.config.session.sessionId, this.config.deviceName, "commandEnded", String(this.endedStatus), String(this.endedStatus));
785-    this.scheduleFinalizeAfterCommandEnd();
786-  }
787-
788-  private onPromptChanged(_src: unknown, args: unknown): void {
789:    const p = String((args as any).prompt || "");
790-    this.previousPrompt = this.config.session.lastPrompt || this.previousPrompt;
791-    this.config.session.lastPrompt = normalizePrompt(p);
792-    const mode = detectModeFromPrompt(this.config.session.lastPrompt);
793-    this.config.session.lastMode = mode;
794-    if (isHostMode(mode)) this.config.session.sessionKind = "host";
795:    this.promptStableSince = this.config.now();
796-    this.resetStallTimer();
797-    this.scheduleFinalizeAfterCommandEnd();
798-  }
799-
800-  private onMoreDisplayed(_src: unknown, args: unknown): void {
801:    this.config.session.pagerActive = true;
802:    this.pagerHandler.handleOutput("--More--");
803-
804:    if (this.pagerHandler.isLoop()) {
805-      this.finalizeFailure(
806-        TerminalErrors.COMMAND_END_TIMEOUT,
807-        `Pager advance limit reached (${this.config.options.maxPagerAdvances ?? 50})`,
808-      );
809-      return;
810-    }
811-
812-    pushEvent(
813-      this.config.events,
814-      this.config.session.sessionId,
815-      this.config.deviceName,
816-      "moreDisplayed",
817:      "--More--",
818:      "--More--",
819-    );
820-
821-    if (
822-      this.config.options.autoAdvancePager !== false &&
823:      this.pagerHandler.canContinue() &&
824-      this.canAdvancePagerNow()
825-    ) {
826:      this.pagerHandler.advance();
827-
828-      this.config.setTimeout!(() => {
829-        if (this.settled) return;
830:        const sent = this.sendPagerAdvance(
831-          this.config.terminal,
832-          this.config.events,
833-          this.config.session.sessionId,
834-          this.config.deviceName,
835-          "moreDisplayed",
836-        );
837-
838-        if (!sent) {
839-          this.finalizeFailure(
840-            TerminalErrors.COMMAND_END_TIMEOUT,
841-            "Pager displayed but auto-advance failed",
842-          );
843-          return;
844-        }
845-
846:        this.config.session.pagerActive = false;
847-        this.resetStallTimer();
848-      }, 50);
849-    }
850-  }
851-
852-  private scheduleFinalizeAfterCommandEnd(): void {
853-    if (this.settled) return;
854-
855-    if (this.commandEndedSeen && this.commandEndSeenAt) {
856-      const waitedAfterEnd = this.config.now() - this.commandEndSeenAt;
857-
858-      if (waitedAfterEnd >= 1000) {
859-        this.finalize(true, this.endedStatus, "command-ended-max-wait");
860-        return;
861-      }
862-    }
863-
864-    const currentPrompt = this.config.getPromptSafeFn(this.config.terminal);
865-
866-    const snapshot = this.config.readTerminalSnapshotFn!(this.config.terminal);
867-    const diff = diffSnapshotStrict(this.config.baselineOutput, snapshot.raw);
868-    const snapshotDelta = String(diff.delta || "");
869-    const hasAnyOutput = this.outputBuffer.trim().length > 0 || snapshotDelta.trim().length > 0;
870:    const promptLooksReady = /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]\s*$/.test(String(currentPrompt || "").trim());
871-    const quietLongEnough = this.config.now() - this.lastOutputAt >= 700;
872-
873-    if (
874-      this.startedSeen &&
875:      promptLooksReady &&
876-      quietLongEnough &&
877:      !this.config.session.pagerActive &&
878-      !this.config.session.confirmPromptActive
879-    ) {
880-      if (hasAnyOutput || this.config.options.allowEmptyOutput === true || isEnableOrEndCommand(this.config.command)) {
881-        this.debug(
882:          "finalize by prompt-ready fallback prompt=" +
883-            JSON.stringify(currentPrompt) +
884-            " hasAnyOutput=" +
885-            hasAnyOutput,
886-        );
887:        this.finalize(true, this.endedStatus, "prompt-ready-fallback");
888-        return;
889-      }
890-    }
891-
892-    const verdict = shouldFinalizeCommand({
893-      state: {
894-        startedSeen: this.startedSeen,
895-        commandEndedSeen: this.commandEndedSeen,
896-        commandEndSeenAt: this.commandEndSeenAt,
897-        lastOutputAt: this.lastOutputAt,
898:        promptStableSince: this.promptStableSince,
899-        previousPrompt: this.previousPrompt,
900-      },
901-      currentPrompt,
902-      currentMode: this.config.getModeSafeFn(this.config.terminal) as TerminalMode,
903-      expectedMode: this.config.options.expectedMode,
904-      sessionKind: this.config.sessionKind,
905:      pagerActive: this.config.session.pagerActive,
906-      confirmPromptActive: this.config.session.confirmPromptActive,
907-    });
908-
909-    if (verdict.finished) {
910-      this.finalize(true, this.endedStatus, verdict.reason);
911-      return;
912-    }
913-
914-    if (this.commandEndGraceTimer) this.config.clearTimeout!(this.commandEndGraceTimer);
915-    this.commandEndGraceTimer = this.config.setTimeout!(() => {
916-      this.commandEndGraceTimer = null;
917-      this.scheduleFinalizeAfterCommandEnd();
918-    }, this.config.sessionKind === "host" ? 800 : 250);
919-  }
920-
921-  private finalize(cmdOk: boolean, status: number | null, error?: string, code?: TerminalErrorCode): void {
922-    if (this.settled) return;
923-
924-    this.debug(
925-      "finalize ok=" +
926-        cmdOk +
927-        " status=" +
928-        status +
929-        " error=" +
930-        JSON.stringify(error || "") +
931-        " code=" +
932-        JSON.stringify(code || "") +
933-        " outputLen=" +
934-        this.outputBuffer.length +
935-        " startedSeen=" +
936-        this.startedSeen +
937-        " endedSeen=" +
938-        this.commandEndedSeen,
939-    );
940-
941-    this.finalizedOk = cmdOk;
942-    if (status !== null) this.endedStatus = status;
943-    this.finalizedError = error;
944-    this.finalizedCode = code;
945-
946-    this.settled = true;
947-    this.clearTimers();
948-    this.cleanup();
949-  }
950-
951-  private finalizeFailure(code: TerminalErrorCode, message: string): void {
952-    this.debug(
953-      "finalizeFailure code=" +
954-        String(code) +
955-        " message=" +
956-        JSON.stringify(message) +
957-        " outputLen=" +
958-        this.outputBuffer.length,
959-    );
960-
961-    this.finalize(false, 1, message, code);
962-
963-    const recoverable =
964-      code === TerminalErrors.COMMAND_START_TIMEOUT ||
965-      code === TerminalErrors.COMMAND_END_TIMEOUT ||
966-      code === TerminalErrors.PROMPT_MISMATCH ||
967-      code === TerminalErrors.MODE_MISMATCH ||
968-      message.includes("No output received");
969-
970-    if (recoverable && this.config.terminal) {
971-      this.config.setTimeout!(() => {
972-        try {
973-          const recovery = this.config.recoverTerminalSyncFn!(
974-            this.config.terminal,
975-            this.config.sessionKind === "host" ? "host" : "ios"
976-          );
977-          this.config.warnings.push(
978:            `Recovery attempted: ${recovery.actions.join(", ")}; prompt=${recovery.prompt}; mode=${recovery.mode}`,
979-          );
980-        } catch {}
981-      }, 0);
982-    }
983-  }
984-}
```

## queue poller control command block
```ts
// packages/pt-runtime/src/pt/kernel/queue-poller.ts
// Poll de la cola de comandos

import { finishActiveCommand } from "./command-finalizer";
import { createRuntimeApi } from "./runtime-api";
import type { KernelSubsystems } from "./kernel-lifecycle";
import type { KernelState } from "./kernel-state";

export function pollCommandQueue(subsystems: KernelSubsystems, state: KernelState): void {
  const {
    queue,
    runtimeLoader,
    executionEngine,
    terminal,
    heartbeat,
    config,
    kernelLog,
    kernelLogSubsystem,
  } = subsystems;

  kernelLogSubsystem(
    "queue",
    "poll tick: isRunning=" +
      state.isRunning +
      " isShuttingDown=" +
      state.isShuttingDown +
      " active=" +
      (state.activeCommand ? state.activeCommand.id : "null"),
  );
  if (!state.isRunning || state.isShuttingDown) return;

  if (state.activeCommand) {
    kernelLogSubsystem("queue", "Skipping poll: command already active=" + state.activeCommand.id);
    return;
  }

  function isControlCommand(type: string): boolean {
    return (
      type === "__pollDeferred" ||
      type === "__ping" ||
      type === "inspectDeviceFast" ||
      type === "readTerminal" ||
      type === "omni.evaluate.raw" ||
      type === "__evaluate"
    );
  }

  const activeJobs = executionEngine.getActiveJobs();
  const terminalIsBusy =
    typeof (terminal as any).isAnyBusy === "function" ? (terminal as any).isAnyBusy() : false;
  const isBusy = activeJobs.length > 0 || terminalIsBusy;
  kernelLogSubsystem("loader", "Checking runtime reload... busy=" + isBusy);
  runtimeLoader.reloadIfNeeded(() => isBusy);

  let claimed = null as ReturnType<typeof queue.poll>;

  if (isBusy) {
    claimed =
      typeof (queue as any).pollAllowedTypes === "function"
        ? (queue as any).pollAllowedTypes([
            "__pollDeferred",
            "__ping",
            "inspectDeviceFast",
            "readTerminal",
            "omni.evaluate.raw",
            "__evaluate",
          ].filter(isControlCommand))
        : null;

    if (!claimed) {
      kernelLogSubsystem(
        "queue",
        "System busy, skipping non-control poll. Active jobs=" +
          activeJobs.length +
          " terminalBusy=" +
          terminalIsBusy,
      );
      heartbeat.setQueuedCount(queue.count());
      return;
    }

    kernelLogSubsystem(
      "queue",
      "System busy, but processing control command=" +
        claimed.id +
        " type=" +
        String((claimed as any).type),
    );
  } else {
    claimed = queue.poll();
  }
  kernelLogSubsystem("queue", "Poll result: claimed=" + (claimed ? claimed.id : "null"));
  if (!claimed) {
    kernelLogSubsystem("queue", "No command claimed, checking files...");
    heartbeat.setQueuedCount(queue.count());
    return;
  }

  state.activeCommand = { ...claimed, startedAt: Date.now() };
  state.activeCommandFilename = (claimed as any).filename ?? null;
  heartbeat.setActiveCommand(claimed.id);
  kernelLog(
    ">>> DISPATCH: " + claimed.id + " type=" + ((claimed as any).type || "unknown"),
    "info",
  );

  try {
    const runtimeFn = runtimeLoader.getRuntimeFn();
    if (!runtimeFn) {
      kernelLog("RUNTIME NOT LOADED - rejecting command", "error");
      finishActiveCommand(subsystems, state, {
        ok: false,
        error: "Runtime not loaded",
        code: "RUNTIME_NOT_FOUND",
      });
      return;
    }

    const runtimeApi = createRuntimeApi(subsystems);
    Promise.resolve(runtimeFn(claimed.payload, runtimeApi))
      .then((result) => {
        try {
          const keys = result && typeof result === "object" ? Object.keys(result as Record<string, unknown>) : [];
          kernelLogSubsystem(
            "queue",
            "runtime result resolved type=" +
              typeof result +
              " keys=" +
              keys.join(",") +
              " ok=" +
```
