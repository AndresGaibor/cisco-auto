# output completion functions dump

Fecha: Tue Apr 28 13:43:02 -05 2026

## grep functions
```
packages/pt-runtime/src/pt/kernel/execution-engine.ts:207:  function inferPromptFromTerminalText(text: string): string {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:243:        return inferPromptFromTerminalText(readTerminalTextSafe(term));
packages/pt-runtime/src/pt/kernel/execution-engine.ts:253:        const prompt = inferPromptFromTerminalText(readTerminalTextSafe(term));
packages/pt-runtime/src/pt/kernel/execution-engine.ts:447:  function outputLooksComplete(output: string, command: string): boolean {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:513:    return inferPromptFromTerminalText(output);
packages/pt-runtime/src/pt/kernel/execution-engine.ts:533:    return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
packages/pt-runtime/src/pt/kernel/execution-engine.ts:617:  function extractLatestCommandBlock(output: string, command: string): string {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:678:    const block = extractLatestCommandBlock(output, command);
packages/pt-runtime/src/pt/kernel/execution-engine.ts:679:    const complete = outputLooksComplete(block, command);
packages/pt-runtime/src/terminal/command-output-extractor.ts:150:    /---\s*More\s*---/gi,
packages/pt-runtime/src/terminal/command-output-extractor.ts:151:    /--More--/gi,
packages/pt-runtime/src/terminal/command-output-extractor.ts:152:    /\bMore\b/gi,
packages/pt-runtime/src/terminal/pager-handler.ts:2:// Pager Handler - Maneja --More-- y paginación
packages/pt-runtime/src/terminal/pager-handler.ts:26:  return /--More--\s*$/i.test(text) || /--More--/i.test(text);
packages/pt-runtime/src/terminal/prompt-detector.ts:136:  if (/--more--/i.test(p) || /\bMore\b/i.test(p)) return "pager";
packages/pt-runtime/src/terminal/prompt-detector.ts:215: * Detecta si el output contiene paging (--More--).
packages/pt-runtime/src/terminal/prompt-detector.ts:223:  return /--More--/i.test(text) || /\bMore\b/i.test(text);
packages/pt-runtime/src/terminal/terminal-utils.ts:28: * Verifica si el terminal tiene paging activo (--More--).
packages/pt-runtime/src/terminal/terminal-utils.ts:45:    return /--More--/i.test(String(output));
packages/pt-runtime/src/terminal/ios-evidence.ts:72:  if (output.includes("--More--") && pagerAdvances === 0) {
packages/pt-runtime/src/terminal/engine/terminal-observability.ts:103:    hasPager: /--More--/i.test(output),
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:198:  private readonly onMoreDisplayedHandler: (src: unknown, args: unknown) => void;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:235:    this.onMoreDisplayedHandler = this.onMoreDisplayed.bind(this);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:443:      const hasPager = /--More--/i.test(finalOutput) || /--More--/i.test(this.outputBuffer);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:515:      terminal.registerEvent?.("moreDisplayed", null, this.onMoreDisplayedHandler);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:527:      terminal.unregisterEvent?.("moreDisplayed", null, this.onMoreDisplayedHandler);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:536:      const pagerVisible = /--More--|More:|Press RETURN to get started|Press any key to continue/i.test(rawTail);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:728:        const hasPager = /--More--/i.test(chunk);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:800:  private onMoreDisplayed(_src: unknown, args: unknown): void {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:802:    this.pagerHandler.handleOutput("--More--");
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:817:      "--More--",
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:818:      "--More--",
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:20:  const isPaged = trimmed.includes("--More--");
packages/pt-runtime/src/pt/terminal/terminal-events.ts:39:export interface MoreDisplayedEvent extends TerminalEvent {
packages/pt-runtime/src/pt/terminal/terminal-events.ts:50:  | MoreDisplayedEvent;
packages/pt-runtime/src/value-objects/session-mode.ts:161:        return "--More--";
packages/pt-runtime/src/terminal/command-output-extractor.ts:150:    /---\s*More\s*---/gi,
packages/pt-runtime/src/terminal/command-output-extractor.ts:151:    /--More--/gi,
packages/pt-runtime/src/terminal/command-output-extractor.ts:152:    /\bMore\b/gi,
packages/pt-runtime/src/terminal/pager-handler.ts:2:// Pager Handler - Maneja --More-- y paginación
packages/pt-runtime/src/terminal/pager-handler.ts:26:  return /--More--\s*$/i.test(text) || /--More--/i.test(text);
packages/pt-runtime/src/terminal/prompt-detector.ts:136:  if (/--more--/i.test(p) || /\bMore\b/i.test(p)) return "pager";
packages/pt-runtime/src/terminal/prompt-detector.ts:215: * Detecta si el output contiene paging (--More--).
packages/pt-runtime/src/terminal/prompt-detector.ts:223:  return /--More--/i.test(text) || /\bMore\b/i.test(text);
packages/pt-runtime/src/terminal/terminal-utils.ts:28: * Verifica si el terminal tiene paging activo (--More--).
packages/pt-runtime/src/terminal/terminal-utils.ts:45:    return /--More--/i.test(String(output));
packages/pt-runtime/src/terminal/ios-evidence.ts:72:  if (output.includes("--More--") && pagerAdvances === 0) {
packages/pt-runtime/src/terminal/engine/terminal-observability.ts:103:    hasPager: /--More--/i.test(output),
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:198:  private readonly onMoreDisplayedHandler: (src: unknown, args: unknown) => void;
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:235:    this.onMoreDisplayedHandler = this.onMoreDisplayed.bind(this);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:443:      const hasPager = /--More--/i.test(finalOutput) || /--More--/i.test(this.outputBuffer);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:515:      terminal.registerEvent?.("moreDisplayed", null, this.onMoreDisplayedHandler);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:527:      terminal.unregisterEvent?.("moreDisplayed", null, this.onMoreDisplayedHandler);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:536:      const pagerVisible = /--More--|More:|Press RETURN to get started|Press any key to continue/i.test(rawTail);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:728:        const hasPager = /--More--/i.test(chunk);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:800:  private onMoreDisplayed(_src: unknown, args: unknown): void {
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:802:    this.pagerHandler.handleOutput("--More--");
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:817:      "--More--",
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:818:      "--More--",
packages/pt-runtime/src/pt-api/registry/all-types.ts:398:export interface PTMoreDisplayedArgs {
packages/pt-runtime/src/pt-api/registry/cli-api.ts:44:export interface PTMoreDisplayedArgs {
packages/pt-runtime/src/pt/terminal/prompt-parser.ts:20:  const isPaged = trimmed.includes("--More--");
packages/pt-runtime/src/pt/terminal/terminal-events.ts:39:export interface MoreDisplayedEvent extends TerminalEvent {
packages/pt-runtime/src/pt/terminal/terminal-events.ts:50:  | MoreDisplayedEvent;
packages/pt-runtime/src/pt/kernel/execution-engine.ts:207:  function inferPromptFromTerminalText(text: string): string {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:243:        return inferPromptFromTerminalText(readTerminalTextSafe(term));
packages/pt-runtime/src/pt/kernel/execution-engine.ts:253:        const prompt = inferPromptFromTerminalText(readTerminalTextSafe(term));
packages/pt-runtime/src/pt/kernel/execution-engine.ts:447:  function outputLooksComplete(output: string, command: string): boolean {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:513:    return inferPromptFromTerminalText(output);
packages/pt-runtime/src/pt/kernel/execution-engine.ts:533:    return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
packages/pt-runtime/src/pt/kernel/execution-engine.ts:617:  function extractLatestCommandBlock(output: string, command: string): string {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:678:    const block = extractLatestCommandBlock(output, command);
packages/pt-runtime/src/pt/kernel/execution-engine.ts:679:    const complete = outputLooksComplete(block, command);
packages/pt-runtime/src/__tests__/terminal/command-state-machine.test.ts:142:      const snapshot = { raw: "show version\n--More--", source: "poll" };
packages/pt-runtime/src/__tests__/terminal/terminal-utils.test.ts:52:  test("detects --More-- in output", () => {
packages/pt-runtime/src/__tests__/terminal/terminal-utils.test.ts:54:      getOutput: () => "Interface Status\r\nGigabitEthernet0/0 --More--",
packages/pt-runtime/src/__tests__/terminal/terminal-utils.test.ts:59:  test("detects --More-- case insensitive", () => {
packages/pt-runtime/src/__tests__/terminal/terminal-utils.test.ts:76:      getAllOutput: () => "something --More-- here",
packages/pt-runtime/src/__tests__/terminal/terminal-utils.test.ts:85:      getBuffer: () => "buffer --More-- content",
packages/pt-runtime/src/__tests__/prompt-state-contract.test.ts:3:  IOS_PROMPT_PATTERNS,
packages/pt-runtime/src/__tests__/prompt-state-contract.test.ts:24:  ["--More--", "paging"],
packages/pt-runtime/src/__tests__/prompt-state-contract.test.ts:61:  test("keeps recoverable states and prompt regexes available", () => {
packages/pt-runtime/src/__tests__/prompt-state-contract.test.ts:68:    expect(IOS_PROMPT_PATTERNS.resolvingHostname.test('Translating "shwo"....domain server')).toBe(true);
packages/pt-runtime/src/__tests__/prompt-state-contract.test.ts:69:    expect(IOS_PROMPT_PATTERNS.copyDestination.test("Destination filename [startup-config]?")) .toBe(true);
packages/pt-runtime/src/__tests__/prompt-state-contract.test.ts:70:    expect(IOS_PROMPT_PATTERNS.reloadConfirm.test("Proceed with reload? [confirm]")).toBe(true);
packages/pt-runtime/src/__tests__/prompt-state-contract.test.ts:71:    expect(IOS_PROMPT_PATTERNS.eraseConfirm.test("Delete filename [startup-config]?")) .toBe(true);
packages/pt-runtime/src/__tests__/pt-api-registry.test.ts:34:  PTMoreDisplayedArgs,
packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts:100:    const result = parsePrompt("Router# --More-- ");
packages/pt-runtime/src/__tests__/handlers/ios-output-classifier.test.ts:24:    expect(classifyCommandOutput("output\n--More--")).toBe("paging");
packages/pt-runtime/src/__tests__/handlers/ios-output-classifier.test.ts:25:    expect(classifyCommandOutput("--More--")).toBe("paging");
packages/pt-runtime/src/__tests__/handlers/ios-session-helpers.test.ts:44:    updateSessionFromOutput(session, "some output\n--More--\n");
packages/pt-runtime/src/build/ast-pt-safe-validator.ts:120:        // More precise: look for patterns like: () =>, x =>
packages/pt-runtime/src/handlers/LIMITATIONS.md:104:- `--More--` pagination requiere manejo explícito
packages/pt-runtime/src/handlers/ios-engine.ts:301:    if (output.includes("--More--")) return "dismiss-continue-dialog";
packages/pt-runtime/src/handlers/ios-session.ts:44: * Detecta paging (--More--), confirm prompts, passwords, y DNS lookups.
packages/pt-runtime/src/handlers/ios-session.ts:51:  session.paging = output.includes("--More--");
packages/pt-runtime/src/handlers/ios-session.ts:59:    if (line && !line.includes("--More--") && !line.startsWith("%")) {
packages/pt-runtime/src/handlers/ios-output-classifier.ts:33:  if (trimmed.includes("--More--") || trimmed.endsWith("--More--")) {
```

## execution-engine relevant block
```ts
407-
408-  function cleanupConfigSession(device: string, mode: string | null | undefined, prompt: string | null | undefined): void {
409-    if (!isConfigMode(mode) && !/\(config[^)]*\)#\s*$/.test(String(prompt ?? ""))) {
410-      return;
411-    }
412-
413-    execLog("CLEANUP config session device=" + device);
414-    void terminal
415-      .executeCommand(device, "end", {
416-        commandTimeoutMs: 5000,
417-        allowPager: false,
418-        autoConfirm: false,
419-      })
420-      .catch(function (error) {
421-        execLog("CLEANUP failed device=" + device + " error=" + String(error));
422-      });
423-  }
424-
425-  // ============================================================================
426-  // Helpers para detección de prompt y output completo
427-  // ============================================================================
428-
429-  function normalizeEol(value: unknown): string {
430-    return String(value ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
431-  }
432-
433-  function isIosPrompt(value: unknown): boolean {
434-    const line = String(value ?? "").trim();
435-    return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line);
436-  }
437-
438-  function lastNonEmptyLine(value: unknown): string {
439-    const lines = normalizeEol(value)
440-      .split("\n")
441-      .map((line) => line.trim())
442-      .filter(Boolean);
443-
444-    return lines.length > 0 ? lines[lines.length - 1] : "";
445-  }
446-
447:  function outputLooksComplete(output: string, command: string): boolean {
448-    const text = normalizeEol(output);
449-    const cmd = String(command ?? "").trim().toLowerCase();
450-
451-    if (!text.trim()) return false;
452-
453-    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
454-    const hasCommandEcho = cmd.length > 0 && lines.some((line) => line.toLowerCase() === cmd);
455-    const hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));
456-    const hasMeaningfulBody = lines.some((line) => {
457-      if (!line) return false;
458-      if (cmd && line.toLowerCase() === cmd) return false;
459-      if (isIosPrompt(line)) return false;
460-      return true;
461-    });
462-
463-    return hasCommandEcho && hasPromptAtEnd && hasMeaningfulBody;
464-  }
465-
466-  function getNativeTerminalForDevice(device: string): any {
467-    try {
468-      const resolvedIpc = resolvePacketTracerIpc();
469-      const net = resolvedIpc && typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
470-      const dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;
471-
472-      if (!dev) return null;
473-
474-      try {
475-        if (typeof dev.getCommandLine === "function") {
476-          const term = dev.getCommandLine();
477-          if (term) return term;
478-        }
479-      } catch {}
480-
481-      try {
482-        if (
483-          typeof dev.getConsole === "function" &&
484-          dev.getConsole() &&
485-          typeof dev.getConsole().getTerminalLine === "function"
486-        ) {
487-          const term = dev.getConsole().getTerminalLine();
488-          if (term) return term;
489-        }
490-      } catch {}
491-
492-      return null;
493-    } catch {
494-      return null;
495-    }
496-  }
497-
498-  function readNativeTerminalOutput(device: string): string {
499-    const term = getNativeTerminalForDevice(device);
500-    if (!term) return "";
501-    return readTerminalTextSafe(term);
502-  }
503-
504-  function getNativePrompt(device: string, output: string): string {
505-    try {
506-      const term = getNativeTerminalForDevice(device);
507-      if (term && typeof term.getPrompt === "function") {
508-        const prompt = String(term.getPrompt() || "").trim();
509-        if (prompt) return prompt;
510-      }
511-    } catch {}
512-
513-    return inferPromptFromTerminalText(output);
514-  }
515-
516-  function getNativeMode(device: string, prompt: string): string {
517-    try {
518-      const term = getNativeTerminalForDevice(device);
519-      if (term && typeof term.getMode === "function") {
520-        const raw = String(term.getMode() || "").trim().toLowerCase();
521-
522-        if (raw === "user") return "user-exec";
523-        if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
524-        if (raw === "global" || raw === "config" || raw === "global-config") return "global-config";
525-        if (raw === "logout") return "logout";
526-      }
527-    } catch {}
528-
529-    return inferModeFromPrompt(prompt);
530-  }
531-
532-  function outputHasPager(output: string): boolean {
533-    return /--More--|More:|Press any key to continue/i.test(String(output || "").slice(-1000));
534-  }
535-
536-  function shouldTryNativeFallback(job: ActiveJob, now: number): boolean {
537-    const ctx = job.context as any;
```

## extractLatestCommandBlock block
```ts
577-    );
578-
579-    if (!shouldTryNativeFallback(job, now)) {
580-      return false;
581-    }
582-
583-    return forceCompleteFromNativeTerminal(job, reason);
584-  }
585-
586-  function jobDebug(job: ActiveJob, message: string): void {
587-    try {
588-      const ctx = job.context as any;
589-
590-      if (!ctx.debug) {
591-        ctx.debug = [];
592-      }
593-
594-      ctx.debug.push(Date.now() + " " + message);
595-
596-      if (ctx.debug.length > 100) {
597-        ctx.debug.splice(0, ctx.debug.length - 100);
598-      }
599-    } catch {}
600-
601-    try {
602-      execLog("JOB DEBUG id=" + job.id + " " + message);
603-    } catch {}
604-  }
605-
606-  function advanceNativePager(device: string): boolean {
607-    try {
608-      const term = getNativeTerminalForDevice(device);
609-      if (!term || typeof term.enterChar !== "function") return false;
610-      term.enterChar(32, 0);
611-      return true;
612-    } catch {
613-      return false;
614-    }
615-  }
616-
617:  function extractLatestCommandBlock(output: string, command: string): string {
618-    const text = normalizeEol(output);
619-    const cmd = String(command || "").trim();
620-
621-    if (!text.trim() || !cmd) return text;
622-
623-    const lines = text.split("\n");
624-    let startIndex = -1;
625-
626-    for (let i = lines.length - 1; i >= 0; i -= 1) {
627-      const line = String(lines[i] || "").trim();
628-
629-      if (line === cmd || line.endsWith(">" + cmd) || line.endsWith("#" + cmd)) {
630-        startIndex = i;
631-        break;
632-      }
633-    }
634-
635-    if (startIndex === -1) {
636-      const idx = text.lastIndexOf(cmd);
637-      if (idx >= 0) return text.slice(idx);
638-      return text;
639-    }
640-
641-    return lines.slice(startIndex).join("\n");
642-  }
643-
644-  function forceCompleteFromNativeTerminal(job: ActiveJob, reason: string): boolean {
645-    const ctx = job.context;
646-    const step = getCurrentStep(ctx);
647-    const command = String(step?.value || "");
648-
649-    if (!step || !command) return false;
650-
651-    jobDebug(job, "native-fallback-enter reason=" + reason);
652-
653-    const output = readNativeTerminalOutput(job.device);
654-    jobDebug(job, "native-output-len=" + String(output.length));
655-
656-    if (!output.trim()) {
657-      jobDebug(job, "native-no-output");
658-      return false;
659-    }
660-
661-    if (outputHasPager(output)) {
662-      const advanced = advanceNativePager(job.device);
663-      execLog(
664-        "JOB NATIVE PAGER id=" +
665-          job.id +
666-          " device=" +
667-          job.device +
668-          " advanced=" +
669-          advanced,
670-      );
671-
672-      ctx.updatedAt = Date.now();
673-      return false;
674-    }
675-
676-    const prompt = getNativePrompt(job.device, output);
677-    const mode = getNativeMode(job.device, prompt);
678-    const block = extractLatestCommandBlock(output, command);
679-    const complete = outputLooksComplete(block, command);
680-
681-    jobDebug(
682-      job,
683-      "native-check command=" +
684-        JSON.stringify(command) +
685-        " prompt=" +
686-        JSON.stringify(prompt) +
687-        " mode=" +
688-        JSON.stringify(mode) +
689-        " blockLen=" +
690-        String(block.length) +
691-        " complete=" +
692-        String(complete) +
693-        " blockTail=" +
694-        JSON.stringify(block.slice(-300)),
695-    );
696-
697-    if (!complete) {
698-      execLog(
699-        "JOB NATIVE INCOMPLETE id=" +
700-          job.id +
701-          " device=" +
702-          job.device +
703-          " command=" +
704-          command +
705-          " prompt=" +
706-          prompt +
707-          " blockTail=" +
```

## forceCompleteFromNativeTerminal block
```ts
604-  }
605-
606-  function advanceNativePager(device: string): boolean {
607-    try {
608-      const term = getNativeTerminalForDevice(device);
609-      if (!term || typeof term.enterChar !== "function") return false;
610-      term.enterChar(32, 0);
611-      return true;
612-    } catch {
613-      return false;
614-    }
615-  }
616-
617-  function extractLatestCommandBlock(output: string, command: string): string {
618-    const text = normalizeEol(output);
619-    const cmd = String(command || "").trim();
620-
621-    if (!text.trim() || !cmd) return text;
622-
623-    const lines = text.split("\n");
624-    let startIndex = -1;
625-
626-    for (let i = lines.length - 1; i >= 0; i -= 1) {
627-      const line = String(lines[i] || "").trim();
628-
629-      if (line === cmd || line.endsWith(">" + cmd) || line.endsWith("#" + cmd)) {
630-        startIndex = i;
631-        break;
632-      }
633-    }
634-
635-    if (startIndex === -1) {
636-      const idx = text.lastIndexOf(cmd);
637-      if (idx >= 0) return text.slice(idx);
638-      return text;
639-    }
640-
641-    return lines.slice(startIndex).join("\n");
642-  }
643-
644:  function forceCompleteFromNativeTerminal(job: ActiveJob, reason: string): boolean {
645-    const ctx = job.context;
646-    const step = getCurrentStep(ctx);
647-    const command = String(step?.value || "");
648-
649-    if (!step || !command) return false;
650-
651-    jobDebug(job, "native-fallback-enter reason=" + reason);
652-
653-    const output = readNativeTerminalOutput(job.device);
654-    jobDebug(job, "native-output-len=" + String(output.length));
655-
656-    if (!output.trim()) {
657-      jobDebug(job, "native-no-output");
658-      return false;
659-    }
660-
661-    if (outputHasPager(output)) {
662-      const advanced = advanceNativePager(job.device);
663-      execLog(
664-        "JOB NATIVE PAGER id=" +
665-          job.id +
666-          " device=" +
667-          job.device +
668-          " advanced=" +
669-          advanced,
670-      );
671-
672-      ctx.updatedAt = Date.now();
673-      return false;
674-    }
675-
676-    const prompt = getNativePrompt(job.device, output);
677-    const mode = getNativeMode(job.device, prompt);
678-    const block = extractLatestCommandBlock(output, command);
679-    const complete = outputLooksComplete(block, command);
680-
681-    jobDebug(
682-      job,
683-      "native-check command=" +
684-        JSON.stringify(command) +
685-        " prompt=" +
686-        JSON.stringify(prompt) +
687-        " mode=" +
688-        JSON.stringify(mode) +
689-        " blockLen=" +
690-        String(block.length) +
691-        " complete=" +
692-        String(complete) +
693-        " blockTail=" +
694-        JSON.stringify(block.slice(-300)),
695-    );
696-
697-    if (!complete) {
698-      execLog(
699-        "JOB NATIVE INCOMPLETE id=" +
700-          job.id +
701-          " device=" +
702-          job.device +
703-          " command=" +
704-          command +
705-          " prompt=" +
706-          prompt +
707-          " blockTail=" +
708-          block.slice(-300),
709-      );
710-      return false;
711-    }
712-
713-    execLog(
714-      "JOB FORCE COMPLETE FROM NATIVE TERMINAL id=" +
715-        job.id +
716-        " device=" +
717-        job.device +
718-        " reason=" +
719-        reason +
720-        " prompt=" +
721-        prompt +
722-        " mode=" +
723-        mode +
724-        " blockLen=" +
725-        block.length,
726-    );
727-
728-    job.pendingCommand = null;
729-    ctx.waitingForCommandEnd = false;
730-    ctx.outputBuffer += block;
731-    ctx.lastPrompt = prompt;
732-    ctx.lastMode = mode;
733-    ctx.paged = false;
734-
735-    ctx.stepResults.push({
736-      stepIndex: ctx.currentStep,
737-      stepType: step.type,
738-      command,
739-      raw: block,
740-      status: 0,
741-      completedAt: Date.now(),
742-    });
743-
744-    ctx.currentStep++;
745-    ctx.error = null;
746-    ctx.errorCode = null;
747-    ctx.updatedAt = Date.now();
748-
749-    const terminalResult = {
750-      ok: true,
751-      output: block,
752-      status: 0,
753-      session: {
754-        mode,
755-        prompt,
756-        paging: false,
757-        awaitingConfirm: false,
758-      },
759-      mode,
760-    } as unknown as TerminalResult;
761-
762-    if (!completeJobIfLastStep(job, terminalResult)) {
763-      ctx.phase = "pending";
764-      advanceJob(job.id);
765-    }
766-
767-    return true;
768-  }
769-
770-  function reapStaleJobs(): void {
771-    execLog("REAP STALE JOBS tick");
772-    const now = Date.now();
773-
774-    for (const key in jobs) {
775-      const job = jobs[key];
776-      if (!job || job.context.finished || job.context.phase === "completed" || job.context.phase === "error") {
777-        continue;
778-      }
779-
780-      const completedFromNative = tickNativeFallback(job, "reapStaleJobs");
781-
782-      if (completedFromNative) {
783-        continue;
784-      }
```
