# native exec drain pager final validation

Fecha: Tue Apr 28 17:42:32 -05 2026

## grep fixes
```
25-
26-function rtrim(value: unknown): string {
27-  return String(value == null ? "" : value).replace(/[ \t\r\n]+$/, "");
28-}
29-
30-function contains(haystack: unknown, needle: string): boolean {
31-  return String(haystack == null ? "" : haystack).indexOf(needle) >= 0;
32-}
33-
34-function startsWithText(value: unknown, prefix: string): boolean {
35-  const text = String(value == null ? "" : value);
36-  return text.slice(0, prefix.length) === prefix;
37-}
38-
39-function endsWithText(value: unknown, suffix: string): boolean {
40-  const text = String(value == null ? "" : value);
41-  if (suffix.length > text.length) return false;
42-  return text.slice(text.length - suffix.length) === suffix;
43-}
44-
45:function safeCallString(target: unknown, method: string): string {
46-  try {
47-    const maybe = target as Record<string, unknown> | null | undefined;
48-
49-    if (!maybe || typeof maybe[method] !== "function") {
50-      return "";
51-    }
52-
53-    // Conserva el receiver nativo para objetos QtScript/Packet Tracer.
54-    const value = (maybe[method] as () => unknown).call(maybe);
55-
56-    return String(value == null ? "" : value);
57-  } catch {}
58-
59-  return "";
60-}
61-
62-function getTerminal(api: RuntimeApi, deviceName: string): PTTerminal | null {
63-  try {
64-    const ipc = (api as any).ipc;
65-    if (!ipc) return null;
66-    const net = typeof ipc.network === "function" ? ipc.network() : null;
67-    const device = net && typeof net.getDevice === "function" ? net.getDevice(deviceName) : null;
68-
69-    if (device && typeof device.getCommandLine === "function") {
70-      return device.getCommandLine() as PTTerminal | null;
71-    }
72-  } catch {}
73-
74-  return null;
75-}
76-
77-function getTerminalOutput(term: PTTerminal): string {
78-  return (
79:    safeCallString(term, "getOutput") ||
80:    safeCallString(term, "getAllOutput") ||
81:    safeCallString(term, "getBuffer") ||
82:    safeCallString(term, "getText")
83-  );
84-}
85-
86-function clearWhitespaceInput(term: PTTerminal): void {
87:  const input = safeCallString(term, "getCommandInput");
88-
89-  if (input.length === 0) return;
90-  if (input.replace(/\s+/g, "") !== "") return;
91-
92-  try {
93-    term.enterChar(21, 0);
94-  } catch {}
95-
96-  for (let i = 0; i < Math.min(input.length + 8, 32); i += 1) {
97-    try {
98-      term.enterChar(8, 0);
99-    } catch {}
100-  }
101-}
102-
103-function lastNonEmptyLine(output: string): string {
104-  const lines = normalizeEol(output).split("\n");
105-
106-  for (let i = lines.length - 1; i >= 0; i -= 1) {
107-    const line = trimLine(lines[i]);
108-    if (line) return line;
109-  }
110-
111-  return "";
112-}
113-
114-function tailHasActivePager(output: string): boolean {
115-  const tail = normalizeEol(output).slice(-1000).replace(/\s+$/, "");
116-
117-  return (
118-    /--More--$/i.test(tail) ||
119-    /More:$/i.test(tail) ||
120-    /Press any key to continue$/i.test(tail)
121-  );
122-}
123-
124:async function drainActivePager(
125-  term: PTTerminal,
126-  maxAdvances: number,
127-  reason: string,
128-): Promise<number> {
129-  let advances = 0;
130-
131-  while (advances < maxAdvances) {
132-    const output = getTerminalOutput(term);
133-
134-    if (!tailHasActivePager(output)) {
135-      break;
136-    }
137-
138-    try {
139-      term.enterChar(32, 0);
140-      advances += 1;
141-    } catch {
142-      break;
143-    }
144-
145-    await sleep(120);
146-  }
147-
148-  return advances;
149-}
150-
151-function lineIsIosPrompt(line: string): boolean {
152-  return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(trimLine(line));
153-}
154-
155-function isPrivilegedPrompt(prompt: string): boolean {
156-  return /#$/.test(trimLine(prompt));
157-}
158-
159-function isUserPrompt(prompt: string): boolean {
160-  return />$/.test(trimLine(prompt));
161-}
162-
163-function safeMode(term: PTTerminal): string {
164:  const raw = safeCallString(term, "getMode").toLowerCase();
165-
166-  if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
167-  if (raw === "user" || raw === "user-exec") return "user-exec";
168-  if (raw === "logout") return "logout";
169-  return raw || "unknown";
170-}
171-
172-function requiresPrivilege(command: string): boolean {
173-  const cmd = normalizeEol(command).replace(/\s+/g, " ").toLowerCase();
174-
175-  return (
176-    /^show running-config\b/.test(cmd) ||
177-    /^show startup-config\b/.test(cmd) ||
178-    /^show archive\b/.test(cmd) ||
179-    /^show tech-support\b/.test(cmd) ||
180-    /^write\b/.test(cmd) ||
181-    /^copy\b/.test(cmd) ||
182-    /^erase\b/.test(cmd) ||
183-    /^reload\b/.test(cmd) ||
184-    /^clear\b/.test(cmd) ||
185-    /^debug\b/.test(cmd) ||
186-    /^undebug\b/.test(cmd)
187-  );
188-}
189-
190:async function wakeTerminal(term: PTTerminal, timeoutMs: number): Promise<void> {
191-  const startedAt = Date.now();
192-
193-  while (Date.now() - startedAt < timeoutMs) {
194:    await drainActivePager(term, 20, "wake-terminal");
195-
196:    const prompt = safeCallString(term, "getPrompt");
197-    const mode = safeMode(term);
198-
199-    if (prompt && mode !== "logout" && !tailHasActivePager(getTerminalOutput(term))) {
200-      return;
201-    }
202-
203-    try {
204-      term.enterChar(13, 0);
205-    } catch {
206-      try {
207-        term.enterCommand("");
208-      } catch {}
209-    }
210-
211-    await sleep(150);
212-  }
213-}
214-
215-async function waitForPrompt(
216-  term: PTTerminal,
217-  predicate: (prompt: string, mode: string) => boolean,
218-  timeoutMs: number,
219-): Promise<boolean> {
220-  const startedAt = Date.now();
221-
222-  while (Date.now() - startedAt < timeoutMs) {
223:    const prompt = safeCallString(term, "getPrompt");
224-    const mode = safeMode(term);
225-
226-    if (predicate(prompt, mode)) {
227-      return true;
228-    }
229-
230-    await sleep(100);
231-  }
232-
233-  return false;
234-}
235-
236:async function ensurePrivilegedIfNeeded(term: PTTerminal, command: string): Promise<boolean> {
237:  await wakeTerminal(term, 1800);
238-  clearWhitespaceInput(term);
239-
240-  if (!requiresPrivilege(command)) {
241-    return true;
242-  }
243-
244:  let prompt = safeCallString(term, "getPrompt");
245-
246-  if (isPrivilegedPrompt(prompt)) {
247-    return true;
248-  }
249-
250-  if (isUserPrompt(prompt) || safeMode(term) === "user-exec") {
251:    await drainActivePager(term, 20, "before-enable");
252-    try {
253-      term.enterCommand("enable");
254-    } catch {
255-      return false;
256-    }
257-
258-    clearWhitespaceInput(term);
259-
260-    if (await waitForPrompt(term, (currentPrompt) => isPrivilegedPrompt(currentPrompt), 1800)) {
261-      return true;
262-    }
263-  }
264-
265-  return false;
266-}
267-
268-function hasCommandEcho(output: string, command: string): boolean {
269-  const text = normalizeEol(output).toLowerCase();
270-  const cmd = String(command == null ? "" : command).replace(/^[ \t\r\n]+/, "").replace(/[ \t\r\n]+$/, "").toLowerCase();
271-
272-  return (
273-    startsWithText(text, cmd + "\n") ||
274-    startsWithText(text, cmd) ||
275-    contains(text, ">" + cmd) ||
276-    contains(text, "#" + cmd) ||
277-    contains(text, "\n" + cmd + "\n")
278-  );
279-}
280-
281-function extractLatestCommandBlock(output: string, command: string): string {
282-  const text = normalizeEol(output);
283-  const cmd = String(command == null ? "" : command).replace(/^[ \t\r\n]+/, "").replace(/[ \t\r\n]+$/, "").toLowerCase();
284-  const lines = text.split("\n");
285-
286-  let startIndex = -1;
287-
288-  for (let i = lines.length - 1; i >= 0; i -= 1) {
289-    const lower = trimLine(lines[i]).toLowerCase();
290-
291-    if (
292-      lower === cmd ||
293-      contains(lower, ">" + cmd) ||
294-      contains(lower, "#" + cmd)
295-    ) {
296-      startIndex = i;
297-      break;
298-    }
299-  }
300-
301-  return startIndex >= 0 ? lines.slice(startIndex).join("\n") : text;
302-}
303-
304-function stripFinalPromptForOutput(raw: string): string {
305-  const lines = normalizeEol(raw).split("\n");
306-
307-  while (lines.length > 0 && trimLine(lines[lines.length - 1]) === "") {
308-    lines.pop();
309-  }
310-
311-  if (lines.length > 0 && lineIsIosPrompt(lines[lines.length - 1])) {
312-    lines.pop();
313-  }
314-
315-  return rtrim(lines.join("\n"));
316-}
317-
318-function commandBlockHasIosError(output: string, command: string): boolean {
319-  const block = extractLatestCommandBlock(output, command).toLowerCase();
320-
321-  return (
322-    contains(block, "% invalid input detected") ||
323-    contains(block, "% incomplete command") ||
324-    contains(block, "% ambiguous command") ||
325-    contains(block, "% unknown command") ||
326-    contains(block, "invalid command") ||
327-    contains(block, "command not found")
328-  );
329-}
330-
331-export async function handleTerminalNativeExec(
--
334-): Promise<RuntimeResult> {
335-  const device = String(payload.device == null ? "" : payload.device).replace(/^[ \t\r\n]+/, "").replace(/[ \t\r\n]+$/, "");
336-  const command = String(payload.command == null ? "" : payload.command).replace(/^[ \t\r\n]+/, "").replace(/[ \t\r\n]+$/, "");
337-  const timeoutMs = Number(payload.timeoutMs || 8000);
338-  const maxPagerAdvances = Number(payload.maxPagerAdvances || 80);
339-  const stableSamplesRequired = Number(payload.stableSamples || 2);
340-  const sampleDelayMs = Number(payload.sampleDelayMs || 90);
341-
342-  if (!device || !command) {
343-    return createErrorResult("terminal.native.exec requiere device y command", "INVALID_NATIVE_EXEC_PAYLOAD");
344-  }
345-
346-  const term = getTerminal(api, device);
347-
348-  if (!term) {
349-    return createErrorResult("No se encontró terminal para " + device, "DEVICE_TERMINAL_NOT_FOUND");
350-  }
351-
352-  const startedAt = Date.now();
353-
354:  await wakeTerminal(term, 1800);
355-  clearWhitespaceInput(term);
356-
357:  const privilegedOk = await ensurePrivilegedIfNeeded(term, command);
358-
359-  if (!privilegedOk) {
360-    return {
361-      ok: false,
362-      code: "NATIVE_EXEC_PRIVILEGE_REQUIRED",
363-      error:
364-        "El comando " +
365-        command +
366-        " requiere modo privilegiado, pero la terminal quedó en prompt " +
367:        safeCallString(term, "getPrompt"),
368-      raw: "",
369-      output: "",
370-      status: 1,
371-      session: {
372-        modeBefore: "",
373-        modeAfter: safeMode(term),
374-        promptBefore: "",
375:        promptAfter: safeCallString(term, "getPrompt"),
376-        paging: false,
377-        awaitingConfirm: false,
378-        kind: "ios",
379-      },
380-      diagnostics: {
381-        statusCode: 1,
382-        completionReason: "privilege-required",
383-        elapsedMs: Date.now() - startedAt,
384:        input: safeCallString(term, "getCommandInput"),
385-        tail: normalizeEol(getTerminalOutput(term)).slice(-1000),
386-      },
387-    } as unknown as RuntimeResult;
388-  }
389-
390:  const beforePrompt = safeCallString(term, "getPrompt");
391-  const beforeMode = safeMode(term);
392-
393:  await drainActivePager(term, maxPagerAdvances, "before-command");
394-  clearWhitespaceInput(term);
395-
396-  try {
397:    term.enterCommand(command);
398-  } catch (error) {
399-    return createErrorResult(
400-      "terminal.native.exec no pudo enviar el comando: " + String(error),
401-      "NATIVE_EXEC_SEND_FAILED",
402-    );
403-  }
404-
405-  let pagerAdvances = 0;
406-  let lastOutput = "";
407-  let stableSamples = 0;
408-  let completed = false;
409-  let completionReason = "timeout";
410-
411-  while (Date.now() - startedAt < timeoutMs) {
412-    const output = getTerminalOutput(term);
413-    const lastLine = lastNonEmptyLine(output);
414-
415-    if (tailHasActivePager(output)) {
416-      if (pagerAdvances >= maxPagerAdvances) {
417-        completionReason = "pager-limit";
418-        break;
419-      }
420-
421-      try {
422-        term.enterChar(32, 0);
423-        pagerAdvances += 1;
424-      } catch {}
425-
426-      await sleep(sampleDelayMs);
427-      continue;
428-    }
429-
430-    if (hasCommandEcho(output, command) && commandBlockHasIosError(output, command)) {
431-      completionReason = "ios-error";
432-      break;
433-    }
434-
435-    if (hasCommandEcho(output, command) && lineIsIosPrompt(lastLine)) {
436-      if (output === lastOutput) {
437-        stableSamples += 1;
438-      } else {
439-        stableSamples = 0;
440-      }
441-
442-      if (stableSamples >= stableSamplesRequired) {
443-        completed = true;
444-        completionReason = "stable-prompt";
445-        break;
446-      }
447-    }
448-
449-    lastOutput = output;
450-    await sleep(sampleDelayMs);
451-  }
452-
453-  const finalOutput = getTerminalOutput(term);
454-  const raw = extractLatestCommandBlock(finalOutput, command);
455-  const output = stripFinalPromptForOutput(raw);
456:  const afterPrompt = safeCallString(term, "getPrompt");
457-  const afterMode = safeMode(term);
458:  const afterInput = safeCallString(term, "getCommandInput");
459-  const iosError = commandBlockHasIosError(finalOutput, command);
460-
461-  clearWhitespaceInput(term);
462-
463-  if (iosError) {
464-    return {
465-      ok: false,
466-      code: "NATIVE_EXEC_IOS_ERROR",
467-      error: "IOS rechazó el comando " + command,
468-      raw,
469-      output,
470-      status: 1,
471-      session: {
472-        modeBefore: beforeMode,
473-        modeAfter: afterMode,
474-        promptBefore: beforePrompt,
475-        promptAfter: afterPrompt,
476-        paging: pagerAdvances > 0,
477-        awaitingConfirm: false,
478-        kind: "ios",
479-      },
480-      diagnostics: {
481-        statusCode: 1,
482-        completionReason: "ios-error",
483-        pagerAdvances,
484-        elapsedMs: Date.now() - startedAt,
485-        input: afterInput,
486-      },
487-    } as unknown as RuntimeResult;
488-  }
489-
490-  if (!completed) {
491-    return {
492-      ok: false,
493-      code: completionReason === "pager-limit" ? "NATIVE_EXEC_PAGER_LIMIT" : "NATIVE_EXEC_TIMEOUT",
494-      error: "terminal.native.exec no completó " + command + " en " + timeoutMs + "ms",
495-      raw,
496-      output,
497-      status: 1,
498-      session: {
499-        modeBefore: beforeMode,
500-        modeAfter: afterMode,
501-        promptBefore: beforePrompt,
502-        promptAfter: afterPrompt,
503-        paging: pagerAdvances > 0,
504-        awaitingConfirm: false,
505-        kind: "ios",
506-      },
507-      diagnostics: {
508-        statusCode: 1,
509-        completionReason,
510-        pagerAdvances,
511-        elapsedMs: Date.now() - startedAt,
512-        input: afterInput,
513-      },
514-    } as unknown as RuntimeResult;
515-  }
516-
517-  return {
518-    ok: true,
519-    raw,
520-    output,
521-    status: 0,
522-    session: {
523-      modeBefore: beforeMode,
524-      modeAfter: afterMode,
525-      promptBefore: beforePrompt,
526-      promptAfter: afterPrompt,
527-      paging: pagerAdvances > 0,
528-      awaitingConfirm: false,
529-      kind: "ios",
530-    },
531-    diagnostics: {
532-      statusCode: 0,
533-      completionReason,
534-      pagerAdvances,
535-      elapsedMs: Date.now() - startedAt,
536-    },
537-  } as unknown as RuntimeResult;
538-}
```

## tests
```
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
```

## generate deploy
```
Generated: dist-qtscript/
Deployed to: /Users/andresgaibor/pt-dev
```

## force terminal into pager/user-ish condition
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }

// Baja a user para probar que native.exec pueda volver a enable.
try { t.enterCommand(\"disable\"); } catch(e) {}
pause(300);

// Genera un output con pager si PT lo activa.
try { t.enterCommand(\"show version\"); } catch(e) {}
pause(500);

return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-700)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }

// Baja a user para probar que native.exec pueda volver a enable.
try { t.enterCommand(\"disable\"); } catch(e) {}
pause(300);

// Genera un output con pager si PT lo activa.
try { t.enterCommand(\"show version\"); } catch(e) {}
pause(500);

return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-700)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 599,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nfunction pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }\n\n// Baja a user para probar que native.exec pueda volver a enable.\ntry { t.enterCommand(\"disable\"); } catch(e) {}\npause(300);\n\n// Genera un output con pager si PT lo activa.\ntry { t.enterCommand(\"show version\"); } catch(e) {}\npause(500);\n\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.g",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"E SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018727",
      "seq": 18727,
      "type": "omni.evaluate.raw",
      "startedAt": 1777416162195,
      "completedAt": 1777416163145,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"E SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \"}"
      },
      "timings": {
        "sentAt": 1777416162118,
        "resultSeenAt": 1777416163185,
        "receivedAt": 1777416163185,
        "waitMs": 1067,
        "completedAtMs": 1777416163145
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


## show running-config attempt 1
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416164002,
      "resultSeenAt": 1777416165109,
      "receivedAt": 1777416165109,
      "waitMs": 1107,
      "completedAtMs": 1777416165066
    }
  },
  "timings": {
    "sentAt": 1777416164002,
    "resultSeenAt": 1777416165109,
    "receivedAt": 1777416165109,
    "waitMs": 1107,
    "completedAtMs": 1777416165066
  }
}
⏱ pt cmd · 1.4s
```

### terminal state after attempt 1
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-700)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-700)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-700)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018730",
      "seq": 18730,
      "type": "omni.evaluate.raw",
      "startedAt": 1777416165609,
      "completedAt": 1777416165689,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
      },
      "timings": {
        "sentAt": 1777416165554,
        "resultSeenAt": 1777416165715,
        "receivedAt": 1777416165715,
        "waitMs": 161,
        "completedAtMs": 1777416165689
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

## show running-config attempt 2
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416166422,
      "resultSeenAt": 1777416167309,
      "receivedAt": 1777416167309,
      "waitMs": 887,
      "completedAtMs": 1777416167269
    }
  },
  "timings": {
    "sentAt": 1777416166422,
    "resultSeenAt": 1777416167309,
    "receivedAt": 1777416167309,
    "waitMs": 887,
    "completedAtMs": 1777416167269
  }
}
⏱ pt cmd · 1.1s
```

### terminal state after attempt 2
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-700)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-700)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-700)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018733",
      "seq": 18733,
      "type": "omni.evaluate.raw",
      "startedAt": 1777416167902,
      "completedAt": 1777416167976,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
      },
      "timings": {
        "sentAt": 1777416167757,
        "resultSeenAt": 1777416168018,
        "receivedAt": 1777416168018,
        "waitMs": 261,
        "completedAtMs": 1777416167976
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.3s
```

## show running-config attempt 3
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416168711,
      "resultSeenAt": 1777416169606,
      "receivedAt": 1777416169606,
      "waitMs": 895,
      "completedAtMs": 1777416169566
    }
  },
  "timings": {
    "sentAt": 1777416168711,
    "resultSeenAt": 1777416169606,
    "receivedAt": 1777416169606,
    "waitMs": 895,
    "completedAtMs": 1777416169566
  }
}
⏱ pt cmd · 1.1s
```

### terminal state after attempt 3
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-700)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-700)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-700)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018736",
      "seq": 18736,
      "type": "omni.evaluate.raw",
      "startedAt": 1777416170198,
      "completedAt": 1777416170281,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
      },
      "timings": {
        "sentAt": 1777416170069,
        "resultSeenAt": 1777416170332,
        "receivedAt": 1777416170332,
        "waitMs": 263,
        "completedAtMs": 1777416170281
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.3s
```

## show running-config attempt 4
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416171004,
      "resultSeenAt": 1777416171908,
      "receivedAt": 1777416171908,
      "waitMs": 904,
      "completedAtMs": 1777416171867
    }
  },
  "timings": {
    "sentAt": 1777416171004,
    "resultSeenAt": 1777416171908,
    "receivedAt": 1777416171908,
    "waitMs": 904,
    "completedAtMs": 1777416171867
  }
}
⏱ pt cmd · 1.1s
```

### terminal state after attempt 4
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-700)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-700)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-700)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018739",
      "seq": 18739,
      "type": "omni.evaluate.raw",
      "startedAt": 1777416172498,
      "completedAt": 1777416172585,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
      },
      "timings": {
        "sentAt": 1777416172363,
        "resultSeenAt": 1777416172620,
        "receivedAt": 1777416172620,
        "waitMs": 257,
        "completedAtMs": 1777416172585
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.3s
```

## show running-config attempt 5
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777416173429,
      "resultSeenAt": 1777416174310,
      "receivedAt": 1777416174310,
      "waitMs": 881,
      "completedAtMs": 1777416174273
    }
  },
  "timings": {
    "sentAt": 1777416173429,
    "resultSeenAt": 1777416174310,
    "receivedAt": 1777416174310,
    "waitMs": 881,
    "completedAtMs": 1777416174273
  }
}
⏱ pt cmd · 1.2s
```

### terminal state after attempt 5
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-700)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-700)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-700)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018742",
      "seq": 18742,
      "type": "omni.evaluate.raw",
      "startedAt": 1777416175307,
      "completedAt": 1777416175398,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
      },
      "timings": {
        "sentAt": 1777416175212,
        "resultSeenAt": 1777416175420,
        "receivedAt": 1777416175420,
        "waitMs": 208,
        "completedAtMs": 1777416175398
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.3s
```

## show version sanity
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "",
  "rawOutput": "",
  "status": null,
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
⏱ pt cmd · 12.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## recent native results
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000018742.json -----
{
  "id": "cmd_000000018742",
  "seq": 18742,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018741.json -----
{
  "id": "cmd_000000018741",
  "seq": 18741,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 728
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018739.json -----
{
  "id": "cmd_000000018739",
  "seq": 18739,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018738.json -----
{
  "id": "cmd_000000018738",
  "seq": 18738,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 762
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018736.json -----
{
  "id": "cmd_000000018736",
  "seq": 18736,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018735.json -----
{
  "id": "cmd_000000018735",
  "seq": 18735,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 744
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018733.json -----
{
  "id": "cmd_000000018733",
  "seq": 18733,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018732.json -----
{
  "id": "cmd_000000018732",
  "seq": 18732,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 744
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018730.json -----
{
  "id": "cmd_000000018730",
  "seq": 18730,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018729.json -----
{
  "id": "cmd_000000018729",
  "seq": 18729,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 978
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018726.json -----
{
  "id": "cmd_000000018726",
  "seq": 18726,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 454
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018724.json -----
{
  "id": "cmd_000000018724",
  "seq": 18724,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 384
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018722.json -----
{
  "id": "cmd_000000018722",
  "seq": 18722,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 374
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018720.json -----
{
  "id": "cmd_000000018720",
  "seq": 18720,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018719.json -----
{
  "id": "cmd_000000018719",
  "seq": 18719,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 715
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018717.json -----
{
  "id": "cmd_000000018717",
  "seq": 18717,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018716.json -----
{
  "id": "cmd_000000018716",
  "seq": 18716,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 714
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018714.json -----
{
  "id": "cmd_000000018714",
  "seq": 18714,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018713.json -----
{
  "id": "cmd_000000018713",
  "seq": 18713,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 817
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018711.json -----
{
  "id": "cmd_000000018711",
  "seq": 18711,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"rboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\n\\nSW-SRV-DIST>nable\\nTranslating \\\"nable\\\"\\n% Unknown command or computer name, or unable to find computer address\\n\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018708.json -----
{
  "id": "cmd_000000018708",
  "seq": 18708,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"rboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\n\\nSW-SRV-DIST>nable\\nTranslating \\\"nable\\\"\\n% Unknown command or computer name, or unable to find computer address\\n\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018707.json -----
{
  "id": "cmd_000000018707",
  "seq": 18707,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt SW-SRV-DIST>",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt SW-SRV-DIST>",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "user-exec",
    "promptBefore": "",
    "promptAfter": "SW-SRV-DIST>",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 2181,
    "input": "",
    "tail": "OM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\n\nSW-SRV-DIST>nable\nTranslating \"nable\"\n% Unknown command or computer name, or unable to find computer address\n\nSW-SRV-DIST>"
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018702.json -----
{
  "id": "cmd_000000018702",
  "seq": 18702,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_TIMEOUT",
    "message": "terminal.native.exec no complet\u00f3 show version en 12000ms",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_TIMEOUT",
  "error": "terminal.native.exec no complet\u00f3 show version en 12000ms",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "unknown",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "timeout",
    "pagerAdvances": 0,
    "elapsedMs": 12069,
    "input": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018699.json -----
{
  "id": "cmd_000000018699",
  "seq": 18699,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 9,
    "input": "",
    "tail": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018696.json -----
{
  "id": "cmd_000000018696",
  "seq": 18696,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 8,
    "input": "",
    "tail": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018693.json -----
{
  "id": "cmd_000000018693",
  "seq": 18693,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 15,
    "input": "",
    "tail": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018687.json -----
{
  "id": "cmd_000000018687",
  "seq": 18687,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 58,
    "input": "",
    "tail": ""
  }
}

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
```
