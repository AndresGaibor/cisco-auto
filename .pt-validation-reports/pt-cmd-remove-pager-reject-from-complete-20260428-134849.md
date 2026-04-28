# pt cmd remove pager reject from outputLooksComplete

Fecha: Tue Apr 28 13:48:49 -05 2026

## grep source outputLooksComplete
```ts
463-    //   Switch(config)#interface vlan 10
464-    const promptEchoPattern = new RegExp(
465-      "^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*" +
466-        rawCommand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
467-        "\\s*$",
468-      "i",
469-    );
470-
471-    return promptEchoPattern.test(rawLine);
472-  }
473-
474-  function isPagerOnlyLine(line: string): boolean {
475-    return /^--More--$/i.test(String(line ?? "").trim());
476-  }
477-
478:  function outputLooksComplete(output: string, command: string): boolean {
479-    const text = normalizeEol(output);
480-    const cmd = String(command ?? "").trim();
481-
482-    if (!text.trim()) return false;
483-
484-    const lines = text
485-      .split("\n")
486-      .map((line) => line.trim())
487-      .filter(Boolean);
488-
489-    const hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));
490-
491-    if (!hasPromptAtEnd) {
492-      return false;
493-    }
494-
495-    const hasCommandEcho =
496-      cmd.length === 0 || lines.some((line) => lineContainsCommandEcho(line, cmd));
497-
498-    const hasMeaningfulBody = lines.some((line) => {
499-      if (!line) return false;
500-      if (lineContainsCommandEcho(line, cmd)) return false;
501-      if (isIosPrompt(line)) return false;
502-      if (isPagerOnlyLine(line)) return false;
503-      return true;
504-    });
505-
506-    return hasCommandEcho && hasMeaningfulBody;
507-  }
508-
509-  function getNativeTerminalForDevice(device: string): any {
510-    try {
511-      const resolvedIpc = resolvePacketTracerIpc();
512-      const net = resolvedIpc && typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
513-      const dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;
514-
515-      if (!dev) return null;
516-
517-      try {
518-        if (typeof dev.getCommandLine === "function") {
519-          const term = dev.getCommandLine();
520-          if (term) return term;
521-        }
522-      } catch {}
523-
524-      try {
525-        if (
526-          typeof dev.getConsole === "function" &&
527-          dev.getConsole() &&
528-          typeof dev.getConsole().getTerminalLine === "function"
529-        ) {
530-          const term = dev.getConsole().getTerminalLine();
531-          if (term) return term;
532-        }
533-      } catch {}
534-
535-      return null;
536-    } catch {
537-      return null;
538-    }
539-  }
540-
541-  function readNativeTerminalOutput(device: string): string {
542-    const term = getNativeTerminalForDevice(device);
543-    if (!term) return "";
544-    return readTerminalTextSafe(term);
545-  }
546-
547-  function getNativePrompt(device: string, output: string): string {
548-    try {
```

## verify forbidden outputHasPager inside outputLooksComplete manually
```
```

## tests
```
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
```

## generate deploy
```
Generated: dist-qtscript/
Deployed to: /Users/andresgaibor/pt-dev
```

## grep deployed outputLooksComplete
```js
1783-        if (lowerLine === lowerCommand) {
1784-            return true;
1785-}
1786-        // Packet Tracer suele dejar el eco como:
1787-        //   SW-SRV-DIST>show version
1788-        //   Router#show ip interface brief
1789-        //   Switch(config)#interface vlan 10
1790-        var promptEchoPattern = new RegExp("^[A-Za-z0-9._-]+(?:\\(config[^)]*\\))?[>#]\\s*" +
1791-            rawCommand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
1792-            "\\s*$", "i");
1793-        return promptEchoPattern.test(rawLine);
1794-}
1795-    function isPagerOnlyLine(line) {
1796-        return /^--More--$/i.test(String(line !== null && line !== void 0 ? line : "").trim());
1797-}
1798:    function outputLooksComplete(output, command) {
1799-        var text = normalizeEol(output);
1800-        var cmd = String(command !== null && command !== void 0 ? command : "").trim();
1801-        if (!text.trim())
1802-            return false;
1803-        var lines = text
1804-            .split("\n")
1805-            .map(function (line) { return line.trim(); })
1806-            .filter(Boolean);
1807-        var hasPromptAtEnd = isIosPrompt(lastNonEmptyLine(text));
1808-        if (!hasPromptAtEnd) {
1809-            return false;
1810-}
1811-        var hasCommandEcho = cmd.length === 0 || lines.some(function (line) { return lineContainsCommandEcho(line, cmd); });
1812-        var hasMeaningfulBody = lines.some(function (line) {
1813-            if (!line)
1814-                return false;
1815-            if (lineContainsCommandEcho(line, cmd))
1816-                return false;
1817-            if (isIosPrompt(line))
1818-                return false;
1819-            if (isPagerOnlyLine(line))
1820-                return false;
1821-            return true;
1822-        });
1823-        return hasCommandEcho && hasMeaningfulBody;
1824-}
1825-    function getNativeTerminalForDevice(device) {
1826-        try {
1827-            var resolvedIpc = resolvePacketTracerIpc();
1828-            var net = resolvedIpc && typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
1829-            var dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;
1830-            if (!dev)
1831-                return null;
1832-            try {
1833-                if (typeof dev.getCommandLine === "function") {
1834-                    var term = dev.getCommandLine();
1835-                    if (term)
1836-                        return term;
1837-}
1838-}
1839-            catch (_a) { }
1840-            try {
1841-                if (typeof dev.getConsole === "function" &&
1842-                    dev.getConsole() &&
1843-                    typeof dev.getConsole().getTerminalLine === "function") {
1844-                    var term = dev.getConsole().getTerminalLine();
1845-                    if (term)
1846-                        return term;
1847-}
1848-}
1849-            catch (_b) { }
1850-            return null;
1851-}
1852-        catch (_c) {
1853-            return null;
1854-}
1855-}
1856-    function readNativeTerminalOutput(device) {
1857-        var term = getNativeTerminalForDevice(device);
1858-        if (!term)
1859-            return "";
1860-        return readTerminalTextSafe(term);
1861-}
1862-    function getNativePrompt(device, output) {
1863-        try {
1864-            var term = getNativeTerminalForDevice(device);
1865-            if (term && typeof term.getPrompt === "function") {
1866-                var prompt = String(term.getPrompt() || "").trim();
1867-                if (prompt)
1868-                    return prompt;
```

## quarantine queue artifacts
```
/Users/andresgaibor/pt-dev/quarantine-outputlookscomplete-pager-fix-20260428-134854
```

## clear terminal
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function safe(name){ try { if(t && typeof t[name] === \"function\") return String(t[name]()); return \"\"; } catch(e) { return \"\"; } }
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }
for (var i=0;i<30;i++) {
  var out = safe(\"getOutput\");
  if (out.indexOf(\"--More--\") < 0) break;
  try { t.enterChar(32,0); } catch(e) {}
  pause(150);
}
try { t.enterChar(13,0); } catch(e) {}
pause(250);
return JSON.stringify({ prompt: safe(\"getPrompt\"), mode: safe(\"getMode\"), input: safe(\"getCommandInput\"), tail: safe(\"getOutput\").slice(-500) });
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function safe(name){ try { if(t && typeof t[name] === \"function\") return String(t[name]()); return \"\"; } catch(e) { return \"\"; } }
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }
for (var i=0;i<30;i++) {
  var out = safe(\"getOutput\");
  if (out.indexOf(\"--More--\") < 0) break;
  try { t.enterChar(32,0); } catch(e) {}
  pause(150);
}
try { t.enterChar(13,0); } catch(e) {}
pause(250);
return JSON.stringify({ prompt: safe(\"getPrompt\"), mode: safe(\"getMode\"), input: safe(\"getCommandInput\"), tail: safe(\"getOutput\").slice(-500) });
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 673,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nfunction safe(name){ try { if(t && typeof t[name] === \"function\") return String(t[name]()); return \"\"; } catch(e) { return \"\"; } }\nfunction pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }\nfor (var i=0;i<30;i++) {\n  var out = safe(\"getOutput\");\n  if (out.indexOf(\"--More--\") < 0) break;\n  try { t.enterChar(32,0); } catch(e) {}\n  pause(150);\n}\ntry { t.enterChar(13,0); } c",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"       : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018314",
      "seq": 18314,
      "type": "omni.evaluate.raw",
      "startedAt": 1777402135422,
      "completedAt": 1777402135826,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"       : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777402135193,
        "resultSeenAt": 1777402135833,
        "receivedAt": 1777402135833,
        "waitMs": 640,
        "completedAtMs": 1777402135826
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.8s
```

## pt cmd show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000018316","seq":18316,"type":"terminal.plan.run","startedAt":1777402137051,"completedAt":1777402137196,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","job":{"id":"cmd-fcbcbba8","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}},"timings":{"sentAt":1777402136896,"resultSeenAt":1777402137236,"receivedAt":1777402137236,"waitMs":340,"completedAtMs":1777402137196}}
[terminal-plan-run-debug] submitValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","job":{"id":"cmd-fcbcbba8","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}
[terminal-plan-run-debug] isDeferredValue=true
[terminal-plan-run-debug] ENTER deferred polling ticket=cmd-fcbcbba8
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=1
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":247,"idleMs":247,"debug":["1777402137230 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=125 idleMs=125","1777402137331 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=226 idleMs=226","1777402137342 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=237 idleMs=237"],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=469
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":898,"idleMs":898,"debug":["1777402137230 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=125 idleMs=125","1777402137331 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=226 idleMs=226","1777402137342 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=237 idleMs=237","1777402137404 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=299 idleMs=299","1777402137439 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=334 idleMs=334","1777402137560 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=455 idleMs=455","1777402137747 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=642 idleMs=642","1777402137754 native-fallback-enter reason=reapStaleJobs elapsedMs=642","1777402137763 native-output-len=5830","1777402137772 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402137902 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=797 idleMs=797","1777402137908 native-fallback-enter reason=getJobState","1777402137917 native-output-len=5830","1777402137924 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"use
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=1128
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":1476,"idleMs":1476,"debug":["1777402137230 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=125 idleMs=125","1777402137331 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=226 idleMs=226","1777402137342 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=237 idleMs=237","1777402137404 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=299 idleMs=299","1777402137439 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=334 idleMs=334","1777402137560 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=455 idleMs=455","1777402137747 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=642 idleMs=642","1777402137754 native-fallback-enter reason=reapStaleJobs elapsedMs=642","1777402137763 native-output-len=5830","1777402137772 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402137902 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=797 idleMs=797","1777402137908 native-fallback-enter reason=getJobState","1777402137917 native-output-len=5830","1777402137924 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"u
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=1681
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":1996,"idleMs":1996,"debug":["1777402137230 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=125 idleMs=125","1777402137331 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=226 idleMs=226","1777402137342 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=237 idleMs=237","1777402137404 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=299 idleMs=299","1777402137439 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=334 idleMs=334","1777402137560 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=455 idleMs=455","1777402137747 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=642 idleMs=642","1777402137754 native-fallback-enter reason=reapStaleJobs elapsedMs=642","1777402137763 native-output-len=5830","1777402137772 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402137902 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=797 idleMs=797","1777402137908 native-fallback-enter reason=getJobState","1777402137917 native-output-len=5830","1777402137924 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"u
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=2229
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":2546,"idleMs":2546,"debug":["1777402137965 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402137977 native-fallback-enter reason=reapStaleJobs elapsedMs=836","1777402137984 native-output-len=5830","1777402137991 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402138064 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=959 idleMs=959","1777402138069 native-fallback-enter reason=reapStaleJobs","1777402138074 native-output-len=5830","1777402138080 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=2780
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":3183,"idleMs":3183,"debug":["1777402138658 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402138672 native-fallback-enter reason=reapStaleJobs elapsedMs=1538","1777402138677 native-output-len=5830","1777402138683 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402138771 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=1666 idleMs=1666","1777402138775 native-fallback-enter reason=reapStaleJobs","1777402138783 native-output-len=5830","1777402138788 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register 
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=3386
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":3719,"idleMs":3719,"debug":["1777402139162 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402139171 native-fallback-enter reason=reapStaleJobs elapsedMs=2041","1777402139176 native-output-len=5830","1777402139185 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402139263 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=2158 idleMs=2158","1777402139268 native-fallback-enter reason=reapStaleJobs","1777402139274 native-output-len=5830","1777402139284 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register 
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=3940
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":4337,"idleMs":4337,"debug":["1777402139823 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402139833 native-fallback-enter reason=reapStaleJobs elapsedMs=2701","1777402139839 native-output-len=5830","1777402139848 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402139925 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=2820 idleMs=2820","1777402139930 native-fallback-enter reason=reapStaleJobs","1777402139939 native-output-len=5830","1777402139945 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register 
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=4558
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":4964,"idleMs":4964,"debug":["1777402140471 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402140483 native-fallback-enter reason=reapStaleJobs elapsedMs=3345","1777402140489 native-output-len=5830","1777402140500 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402140588 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=3483 idleMs=3483","1777402140595 native-fallback-enter reason=reapStaleJobs","1777402140605 native-output-len=5830","1777402140612 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register 
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=5175
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":5524,"idleMs":5524,"debug":["1777402140997 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402141010 native-fallback-enter reason=reapStaleJobs elapsedMs=3868","1777402141018 native-output-len=5830","1777402141025 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402141070 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=3965 idleMs=3965","1777402141077 native-fallback-enter reason=reapStaleJobs","1777402141088 native-output-len=5830","1777402141095 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register 
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=5726
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":6159,"idleMs":6159,"debug":["1777402141525 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402141540 native-fallback-enter reason=reapStaleJobs elapsedMs=4395","1777402141547 native-output-len=5830","1777402141558 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402141597 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=4492 idleMs=4492","1777402141607 native-fallback-enter reason=reapStaleJobs","1777402141613 native-output-len=5830","1777402141622 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register 
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=6393
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":6867,"idleMs":6867,"debug":["1777402142157 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402142173 native-fallback-enter reason=reapStaleJobs elapsedMs=5026","1777402142181 native-output-len=5830","1777402142193 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402142236 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=5131 idleMs=5131","1777402142247 native-fallback-enter reason=reapStaleJobs","1777402142254 native-output-len=5830","1777402142263 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register 
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=7075
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":7501,"idleMs":7501,"debug":["1777402142720 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402142736 native-fallback-enter reason=reapStaleJobs elapsedMs=5587","1777402142748 native-output-len=5830","1777402142757 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402142803 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=5698 idleMs=5698","1777402142811 native-fallback-enter reason=reapStaleJobs","1777402142824 native-output-len=5830","1777402142835 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register 
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=7745
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":8157,"idleMs":8157,"debug":["1777402143467 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402143483 native-fallback-enter reason=reapStaleJobs elapsedMs=6335","1777402143494 native-output-len=5830","1777402143502 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402143544 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=6439 idleMs=6439","1777402143552 native-fallback-enter reason=reapStaleJobs","1777402143564 native-output-len=5830","1777402143572 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register 
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=8415
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":8834,"idleMs":8834,"debug":["1777402144210 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402144233 native-fallback-enter reason=reapStaleJobs elapsedMs=7076","1777402144243 native-output-len=5830","1777402144253 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402144301 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=7196 idleMs=7196","1777402144313 native-fallback-enter reason=reapStaleJobs","1777402144321 native-output-len=5830","1777402144330 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register 
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=9086
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":9545,"idleMs":9545,"debug":["1777402144897 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402144912 native-fallback-enter reason=reapStaleJobs elapsedMs=7765","1777402144920 native-output-len=5830","1777402144928 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402144984 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=7879 idleMs=7879","1777402144992 native-fallback-enter reason=reapStaleJobs","1777402145004 native-output-len=5830","1777402145013 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register 
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=9767
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":10211,"idleMs":10211,"debug":["1777402145467 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402145486 native-fallback-enter reason=reapStaleJobs elapsedMs=8338","1777402145495 native-output-len=5830","1777402145503 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402145548 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=8443 idleMs=8443","1777402145560 native-fallback-enter reason=reapStaleJobs","1777402145567 native-output-len=5830","1777402145575 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration registe
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=10437
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":10827,"idleMs":10827,"debug":["1777402146034 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402146051 native-fallback-enter reason=reapStaleJobs elapsedMs=8899","1777402146059 native-output-len=5830","1777402146072 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402146119 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=9014 idleMs=9014","1777402146127 native-fallback-enter reason=reapStaleJobs","1777402146136 native-output-len=5830","1777402146145 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration registe
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=11050
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":11495,"idleMs":11495,"debug":["1777402146749 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402146765 native-fallback-enter reason=reapStaleJobs elapsedMs=9613","1777402146774 native-output-len=5830","1777402146787 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402146834 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=9729 idleMs=9729","1777402146842 native-fallback-enter reason=reapStaleJobs","1777402146852 native-output-len=5830","1777402146861 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration registe
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=11712
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":12076,"idleMs":12076,"debug":["1777402147424 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402147444 native-fallback-enter reason=reapStaleJobs elapsedMs=10289","1777402147454 native-output-len=5830","1777402147470 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402147520 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=10415 idleMs=10415","1777402147530 native-fallback-enter reason=reapStaleJobs","1777402147540 native-output-len=5830","1777402147550 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=12326
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":12768,"idleMs":12768,"debug":["1777402148119 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402148134 native-fallback-enter reason=reapStaleJobs elapsedMs=10990","1777402148141 native-output-len=5830","1777402148149 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402148191 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=11086 idleMs=11086","1777402148199 native-fallback-enter reason=reapStaleJobs","1777402148211 native-output-len=5830","1777402148219 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=13008
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":13359,"idleMs":13359,"debug":["1777402148698 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402148718 native-fallback-enter reason=reapStaleJobs elapsedMs=11562","1777402148727 native-output-len=5830","1777402148737 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402148782 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=11677 idleMs=11677","1777402148790 native-fallback-enter reason=reapStaleJobs","1777402148802 native-output-len=5830","1777402148810 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=13560
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":13940,"idleMs":13940,"debug":["1777402149278 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402149295 native-fallback-enter reason=reapStaleJobs elapsedMs=12143","1777402149303 native-output-len=5830","1777402149316 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402149362 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=12257 idleMs=12257","1777402149371 native-fallback-enter reason=reapStaleJobs","1777402149380 native-output-len=5830","1777402149388 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=14179
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":14634,"idleMs":14634,"debug":["1777402149966 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402149982 native-fallback-enter reason=reapStaleJobs elapsedMs=12833","1777402149990 native-output-len=5830","1777402150003 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402150051 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=12946 idleMs=12946","1777402150059 native-fallback-enter reason=reapStaleJobs","1777402150068 native-output-len=5830","1777402150077 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=14844
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":15216,"idleMs":15216,"debug":["1777402150560 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402150575 native-fallback-enter reason=reapStaleJobs elapsedMs=13426","1777402150583 native-output-len=5830","1777402150596 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402150643 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=13538 idleMs=13538","1777402150650 native-fallback-enter reason=reapStaleJobs","1777402150658 native-output-len=5830","1777402150666 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=15452
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":15959,"idleMs":15959,"debug":["1777402151245 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402151265 native-fallback-enter reason=reapStaleJobs elapsedMs=14114","1777402151274 native-output-len=5830","1777402151283 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402151329 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14224 idleMs=14224","1777402151341 native-fallback-enter reason=reapStaleJobs","1777402151349 native-output-len=5830","1777402151358 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=16168
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":16534,"idleMs":16534,"debug":["1777402151832 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402151848 native-fallback-enter reason=reapStaleJobs elapsedMs=14698","1777402151857 native-output-len=5830","1777402151869 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402151916 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14811 idleMs=14811","1777402151924 native-fallback-enter reason=reapStaleJobs","1777402151932 native-output-len=5830","1777402151941 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=16785
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":17225,"idleMs":17225,"debug":["1777402152515 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402152536 native-fallback-enter reason=reapStaleJobs elapsedMs=15384","1777402152543 native-output-len=5830","1777402152552 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402152598 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=15493 idleMs=15493","1777402152610 native-fallback-enter reason=reapStaleJobs","1777402152619 native-output-len=5830","1777402152628 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=17451
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":17808,"idleMs":17808,"debug":["1777402153166 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402153182 native-fallback-enter reason=reapStaleJobs elapsedMs=16030","1777402153191 native-output-len=5830","1777402153204 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402153252 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16147 idleMs=16147","1777402153260 native-fallback-enter reason=reapStaleJobs","1777402153269 native-output-len=5830","1777402153278 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=18017
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":18388,"idleMs":18388,"debug":["1777402153728 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402153744 native-fallback-enter reason=reapStaleJobs elapsedMs=16594","1777402153751 native-output-len=5830","1777402153764 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402153810 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16705 idleMs=16705","1777402153819 native-fallback-enter reason=reapStaleJobs","1777402153827 native-output-len=5830","1777402153835 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=18633
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":19079,"idleMs":19079,"debug":["1777402154425 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402154440 native-fallback-enter reason=reapStaleJobs elapsedMs=17291","1777402154448 native-output-len=5830","1777402154462 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402154507 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17402 idleMs=17402","1777402154515 native-fallback-enter reason=reapStaleJobs","1777402154524 native-output-len=5830","1777402154533 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=19301
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":19690,"idleMs":19690,"debug":["1777402155003 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402155019 native-fallback-enter reason=reapStaleJobs elapsedMs=17869","1777402155028 native-output-len=5830","1777402155041 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402155088 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17983 idleMs=17983","1777402155097 native-fallback-enter reason=reapStaleJobs","1777402155106 native-output-len=5830","1777402155114 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=19920
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":20281,"idleMs":20281,"debug":["1777402155586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402155602 native-fallback-enter reason=reapStaleJobs elapsedMs=18452","1777402155609 native-output-len=5830","1777402155622 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402155668 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18563 idleMs=18563","1777402155676 native-fallback-enter reason=reapStaleJobs","1777402155685 native-output-len=5830","1777402155694 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=20530
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":20985,"idleMs":20985,"debug":["1777402156278 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402156294 native-fallback-enter reason=reapStaleJobs elapsedMs=19143","1777402156303 native-output-len=5830","1777402156316 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402156360 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19255 idleMs=19255","1777402156369 native-fallback-enter reason=reapStaleJobs","1777402156377 native-output-len=5830","1777402156386 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=21191
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":21576,"idleMs":21576,"debug":["1777402156892 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402156909 native-fallback-enter reason=reapStaleJobs elapsedMs=19756","1777402156922 native-output-len=5830","1777402156931 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402156979 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19874 idleMs=19874","1777402156987 native-fallback-enter reason=reapStaleJobs","1777402157001 native-output-len=5830","1777402157010 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=21807
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":22271,"idleMs":22271,"debug":["1777402157594 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402157615 native-fallback-enter reason=reapStaleJobs elapsedMs=20463","1777402157624 native-output-len=5830","1777402157632 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402157678 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20573 idleMs=20573","1777402157690 native-fallback-enter reason=reapStaleJobs","1777402157698 native-output-len=5830","1777402157706 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=22481
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":22859,"idleMs":22859,"debug":["1777402158184 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402158200 native-fallback-enter reason=reapStaleJobs elapsedMs=21051","1777402158208 native-output-len=5830","1777402158220 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402158265 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21160 idleMs=21160","1777402158273 native-fallback-enter reason=reapStaleJobs","1777402158282 native-output-len=5830","1777402158291 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=23098
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":23461,"idleMs":23461,"debug":["1777402158772 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402158789 native-fallback-enter reason=reapStaleJobs elapsedMs=21637","1777402158801 native-output-len=5830","1777402158809 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402158852 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21747 idleMs=21747","1777402158859 native-fallback-enter reason=reapStaleJobs","1777402158871 native-output-len=5830","1777402158880 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=23717
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":24168,"idleMs":24168,"debug":["1777402159472 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402159490 native-fallback-enter reason=reapStaleJobs elapsedMs=22339","1777402159498 native-output-len=5830","1777402159512 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402159560 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22455 idleMs=22455","1777402159568 native-fallback-enter reason=reapStaleJobs","1777402159577 native-output-len=5830","1777402159586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=24398
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":24762,"idleMs":24762,"debug":["1777402160060 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402160077 native-fallback-enter reason=reapStaleJobs elapsedMs=22924","1777402160090 native-output-len=5830","1777402160098 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402160145 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23040 idleMs=23040","1777402160154 native-fallback-enter reason=reapStaleJobs","1777402160167 native-output-len=5830","1777402160175 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=25012
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":25475,"idleMs":25475,"debug":["1777402160773 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402160793 native-fallback-enter reason=reapStaleJobs elapsedMs=23643","1777402160801 native-output-len=5830","1777402160809 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402160855 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23750 idleMs=23750","1777402160866 native-fallback-enter reason=reapStaleJobs","1777402160875 native-output-len=5830","1777402160885 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=25693
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":26154,"idleMs":26154,"debug":["1777402161375 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402161392 native-fallback-enter reason=reapStaleJobs elapsedMs=24239","1777402161400 native-output-len=5830","1777402161414 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402161458 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24353 idleMs=24353","1777402161465 native-fallback-enter reason=reapStaleJobs","1777402161474 native-output-len=5830","1777402161482 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=26363
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":26730,"idleMs":26730,"debug":["1777402161958 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402161974 native-fallback-enter reason=reapStaleJobs elapsedMs=24823","1777402161987 native-output-len=5830","1777402161995 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402162044 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24939 idleMs=24939","1777402162052 native-fallback-enter reason=reapStaleJobs","1777402162066 native-output-len=5830","1777402162075 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=26974
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":27392,"idleMs":27392,"debug":["1777402162679 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402162697 native-fallback-enter reason=reapStaleJobs elapsedMs=25545","1777402162705 native-output-len=5830","1777402162719 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402162768 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25663 idleMs=25663","1777402162777 native-fallback-enter reason=reapStaleJobs","1777402162786 native-output-len=5830","1777402162795 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=27644
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":28049,"idleMs":28049,"debug":["1777402163477 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402163492 native-fallback-enter reason=reapStaleJobs elapsedMs=26340","1777402163500 native-output-len=5830","1777402163508 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402163558 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26453 idleMs=26453","1777402163566 native-fallback-enter reason=reapStaleJobs","1777402163578 native-output-len=5830","1777402163586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=28254
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-fcbcbba8","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777402137105,"ageMs":28600,"idleMs":28600,"debug":["1777402164036 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402164057 native-fallback-enter reason=reapStaleJobs elapsedMs=26906","1777402164065 native-output-len=5830","1777402164074 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"","1777402164116 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27011 idleMs=27011","1777402164124 native-fallback-enter reason=reapStaleJobs","1777402164132 native-output-len=5830","1777402164140 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration regi
[terminal-plan-run-debug] POLL ticket=cmd-fcbcbba8 elapsedMs=28806
[terminal-plan-run-debug] pollValue={"done":true,"ok":false,"status":1,"result":null,"error":"Job timed out while waiting for terminal command completion","code":"JOB_TIMEOUT","errorCode":"JOB_TIMEOUT","raw":"","output":"","source":"terminal","session":{"mode":"unknown","prompt":"","paging":false,"awaitingConfirm":false}}
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "",
  "rawOutput": "",
  "status": 1,
  "warnings": [
    "Job timed out while waiting for terminal command completion",
    "Se filtró el eco del comando (1 línea/s).",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "JOB_TIMEOUT",
    "message": "Job timed out while waiting for terminal command completion"
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 29.6s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## latest poll results
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000018363.json -----
{
  "done": true,
  "ok": false,
  "status": 1,
  "result": null,
  "error": "Job timed out while waiting for terminal command completion",
  "code": "JOB_TIMEOUT",
  "errorCode": "JOB_TIMEOUT",
  "raw": "",
  "output": "",
  "source": "terminal",
  "session": {
    "mode": "unknown",
    "prompt": "",
    "paging": false,
    "awaitingConfirm": false
  }
}
error= {'code': 'JOB_TIMEOUT', 'message': 'Job timed out while waiting for terminal command completion', 'phase': 'execution'}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018362.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 28600,
  "idleMs": 28600,
  "debug": [
    "1777402164036 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164057 native-fallback-enter reason=reapStaleJobs elapsedMs=26906",
    "1777402164065 native-output-len=5830",
    "1777402164074 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164116 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27011 idleMs=27011",
    "1777402164124 native-fallback-enter reason=reapStaleJobs",
    "1777402164132 native-output-len=5830",
    "1777402164140 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164160 native-fallback-enter reason=reapStaleJobs elapsedMs=27011",
    "1777402164167 native-output-len=5830",
    "1777402164175 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164217 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27112 idleMs=27112",
    "1777402164225 native-fallback-enter reason=reapStaleJobs",
    "1777402164237 native-output-len=5830",
    "1777402164245 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164262 native-fallback-enter reason=reapStaleJobs elapsedMs=27112",
    "1777402164270 native-output-len=5830",
    "1777402164279 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164372 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=27267 idleMs=27267",
    "1777402164380 native-fallback-enter reason=getJobState",
    "1777402164389 native-output-len=5830",
    "1777402164397 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164420 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27315 idleMs=27315",
    "1777402164432 native-fallback-enter reason=reapStaleJobs",
    "1777402164441 native-output-len=5830",
    "1777402164450 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164465 native-fallback-enter reason=reapStaleJobs elapsedMs=27315",
    "1777402164473 native-output-len=5830",
    "1777402164481 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164563 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27458 idleMs=27458",
    "1777402164572 native-fallback-enter reason=reapStaleJobs",
    "1777402164581 native-output-len=5830",
    "1777402164590 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164604 native-fallback-enter reason=reapStaleJobs elapsedMs=27458",
    "1777402164612 native-output-len=5830",
    "1777402164626 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164667 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27562 idleMs=27562",
    "1777402164676 native-fallback-enter reason=reapStaleJobs",
    "1777402164684 native-output-len=5830",
    "1777402164692 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164708 native-fallback-enter reason=reapStaleJobs elapsedMs=27562",
    "1777402164721 native-output-len=5830",
    "1777402164730 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164772 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27667 idleMs=27667",
    "1777402164779 native-fallback-enter reason=reapStaleJobs",
    "1777402164787 native-output-len=5830",
    "1777402164795 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018361.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 28049,
  "idleMs": 28049,
  "debug": [
    "1777402163477 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163492 native-fallback-enter reason=reapStaleJobs elapsedMs=26340",
    "1777402163500 native-output-len=5830",
    "1777402163508 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163558 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26453 idleMs=26453",
    "1777402163566 native-fallback-enter reason=reapStaleJobs",
    "1777402163578 native-output-len=5830",
    "1777402163586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163601 native-fallback-enter reason=reapStaleJobs elapsedMs=26453",
    "1777402163613 native-output-len=5830",
    "1777402163621 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163711 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=26606 idleMs=26606",
    "1777402163718 native-fallback-enter reason=getJobState",
    "1777402163726 native-output-len=5830",
    "1777402163734 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163758 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26653 idleMs=26653",
    "1777402163765 native-fallback-enter reason=reapStaleJobs",
    "1777402163778 native-output-len=5830",
    "1777402163787 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163801 native-fallback-enter reason=reapStaleJobs elapsedMs=26653",
    "1777402163810 native-output-len=5830",
    "1777402163819 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163904 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26799 idleMs=26799",
    "1777402163911 native-fallback-enter reason=reapStaleJobs",
    "1777402163919 native-output-len=5830",
    "1777402163928 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163943 native-fallback-enter reason=reapStaleJobs elapsedMs=26799",
    "1777402163951 native-output-len=5830",
    "1777402163965 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164011 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26906 idleMs=26906",
    "1777402164019 native-fallback-enter reason=reapStaleJobs",
    "1777402164027 native-output-len=5830",
    "1777402164036 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164057 native-fallback-enter reason=reapStaleJobs elapsedMs=26906",
    "1777402164065 native-output-len=5830",
    "1777402164074 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164116 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27011 idleMs=27011",
    "1777402164124 native-fallback-enter reason=reapStaleJobs",
    "1777402164132 native-output-len=5830",
    "1777402164140 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164160 native-fallback-enter reason=reapStaleJobs elapsedMs=27011",
    "1777402164167 native-output-len=5830",
    "1777402164175 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402164217 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=27112 idleMs=27112",
    "1777402164225 native-fallback-enter reason=reapStaleJobs",
    "1777402164237 native-output-len=5830",
    "1777402164245 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018360.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 27392,
  "idleMs": 27392,
  "debug": [
    "1777402162679 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162697 native-fallback-enter reason=reapStaleJobs elapsedMs=25545",
    "1777402162705 native-output-len=5830",
    "1777402162719 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162768 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25663 idleMs=25663",
    "1777402162777 native-fallback-enter reason=reapStaleJobs",
    "1777402162786 native-output-len=5830",
    "1777402162795 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162816 native-fallback-enter reason=reapStaleJobs elapsedMs=25663",
    "1777402162825 native-output-len=5830",
    "1777402162835 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162884 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25779 idleMs=25779",
    "1777402162897 native-fallback-enter reason=reapStaleJobs",
    "1777402162905 native-output-len=5830",
    "1777402162915 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162937 native-fallback-enter reason=reapStaleJobs elapsedMs=25779",
    "1777402162947 native-output-len=5830",
    "1777402162959 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163082 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=25977 idleMs=25977",
    "1777402163094 native-fallback-enter reason=getJobState",
    "1777402163105 native-output-len=5830",
    "1777402163123 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163157 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26052 idleMs=26052",
    "1777402163171 native-fallback-enter reason=reapStaleJobs",
    "1777402163181 native-output-len=5830",
    "1777402163192 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163216 native-fallback-enter reason=reapStaleJobs elapsedMs=26052",
    "1777402163226 native-output-len=5830",
    "1777402163237 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163325 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26220 idleMs=26220",
    "1777402163334 native-fallback-enter reason=reapStaleJobs",
    "1777402163347 native-output-len=5830",
    "1777402163356 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163373 native-fallback-enter reason=reapStaleJobs elapsedMs=26220",
    "1777402163386 native-output-len=5830",
    "1777402163396 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163445 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26340 idleMs=26340",
    "1777402163454 native-fallback-enter reason=reapStaleJobs",
    "1777402163467 native-output-len=5830",
    "1777402163477 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163492 native-fallback-enter reason=reapStaleJobs elapsedMs=26340",
    "1777402163500 native-output-len=5830",
    "1777402163508 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402163558 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=26453 idleMs=26453",
    "1777402163566 native-fallback-enter reason=reapStaleJobs",
    "1777402163578 native-output-len=5830",
    "1777402163586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018359.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 26730,
  "idleMs": 26730,
  "debug": [
    "1777402161958 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161974 native-fallback-enter reason=reapStaleJobs elapsedMs=24823",
    "1777402161987 native-output-len=5830",
    "1777402161995 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162044 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24939 idleMs=24939",
    "1777402162052 native-fallback-enter reason=reapStaleJobs",
    "1777402162066 native-output-len=5830",
    "1777402162075 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162092 native-fallback-enter reason=reapStaleJobs elapsedMs=24939",
    "1777402162101 native-output-len=5830",
    "1777402162110 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162158 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25053 idleMs=25053",
    "1777402162166 native-fallback-enter reason=reapStaleJobs",
    "1777402162179 native-output-len=5830",
    "1777402162188 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162203 native-fallback-enter reason=reapStaleJobs elapsedMs=25053",
    "1777402162214 native-output-len=5830",
    "1777402162223 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162269 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25164 idleMs=25164",
    "1777402162277 native-fallback-enter reason=reapStaleJobs",
    "1777402162291 native-output-len=5830",
    "1777402162299 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162316 native-fallback-enter reason=reapStaleJobs elapsedMs=25164",
    "1777402162329 native-output-len=5830",
    "1777402162338 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162438 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=25333 idleMs=25333",
    "1777402162445 native-fallback-enter reason=getJobState",
    "1777402162454 native-output-len=5830",
    "1777402162462 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162492 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25387 idleMs=25387",
    "1777402162501 native-fallback-enter reason=reapStaleJobs",
    "1777402162514 native-output-len=5830",
    "1777402162523 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162540 native-fallback-enter reason=reapStaleJobs elapsedMs=25387",
    "1777402162554 native-output-len=5830",
    "1777402162563 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162650 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25545 idleMs=25545",
    "1777402162659 native-fallback-enter reason=reapStaleJobs",
    "1777402162667 native-output-len=5830",
    "1777402162679 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162697 native-fallback-enter reason=reapStaleJobs elapsedMs=25545",
    "1777402162705 native-output-len=5830",
    "1777402162719 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162768 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25663 idleMs=25663",
    "1777402162777 native-fallback-enter reason=reapStaleJobs",
    "1777402162786 native-output-len=5830",
    "1777402162795 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018358.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 26154,
  "idleMs": 26154,
  "debug": [
    "1777402161375 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161392 native-fallback-enter reason=reapStaleJobs elapsedMs=24239",
    "1777402161400 native-output-len=5830",
    "1777402161414 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161458 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24353 idleMs=24353",
    "1777402161465 native-fallback-enter reason=reapStaleJobs",
    "1777402161474 native-output-len=5830",
    "1777402161482 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161503 native-fallback-enter reason=reapStaleJobs elapsedMs=24353",
    "1777402161513 native-output-len=5830",
    "1777402161521 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161566 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24461 idleMs=24461",
    "1777402161578 native-fallback-enter reason=reapStaleJobs",
    "1777402161587 native-output-len=5830",
    "1777402161595 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161615 native-fallback-enter reason=reapStaleJobs elapsedMs=24461",
    "1777402161622 native-output-len=5830",
    "1777402161632 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161728 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=24623 idleMs=24623",
    "1777402161736 native-fallback-enter reason=getJobState",
    "1777402161745 native-output-len=5830",
    "1777402161758 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161782 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24677 idleMs=24677",
    "1777402161793 native-fallback-enter reason=reapStaleJobs",
    "1777402161801 native-output-len=5830",
    "1777402161811 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161830 native-fallback-enter reason=reapStaleJobs elapsedMs=24677",
    "1777402161838 native-output-len=5830",
    "1777402161847 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161928 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24823 idleMs=24823",
    "1777402161937 native-fallback-enter reason=reapStaleJobs",
    "1777402161949 native-output-len=5830",
    "1777402161958 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161974 native-fallback-enter reason=reapStaleJobs elapsedMs=24823",
    "1777402161987 native-output-len=5830",
    "1777402161995 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162044 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24939 idleMs=24939",
    "1777402162052 native-fallback-enter reason=reapStaleJobs",
    "1777402162066 native-output-len=5830",
    "1777402162075 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162092 native-fallback-enter reason=reapStaleJobs elapsedMs=24939",
    "1777402162101 native-output-len=5830",
    "1777402162110 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402162158 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=25053 idleMs=25053",
    "1777402162166 native-fallback-enter reason=reapStaleJobs",
    "1777402162179 native-output-len=5830",
    "1777402162188 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018357.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 25475,
  "idleMs": 25475,
  "debug": [
    "1777402160773 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160793 native-fallback-enter reason=reapStaleJobs elapsedMs=23643",
    "1777402160801 native-output-len=5830",
    "1777402160809 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160855 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23750 idleMs=23750",
    "1777402160866 native-fallback-enter reason=reapStaleJobs",
    "1777402160875 native-output-len=5830",
    "1777402160885 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160906 native-fallback-enter reason=reapStaleJobs elapsedMs=23750",
    "1777402160915 native-output-len=5830",
    "1777402160924 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160971 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23866 idleMs=23866",
    "1777402160979 native-fallback-enter reason=reapStaleJobs",
    "1777402160992 native-output-len=5830",
    "1777402161001 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161018 native-fallback-enter reason=reapStaleJobs elapsedMs=23866",
    "1777402161031 native-output-len=5830",
    "1777402161040 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161137 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=24032 idleMs=24032",
    "1777402161145 native-fallback-enter reason=getJobState",
    "1777402161153 native-output-len=5830",
    "1777402161162 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161189 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24084 idleMs=24084",
    "1777402161197 native-fallback-enter reason=reapStaleJobs",
    "1777402161210 native-output-len=5830",
    "1777402161219 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161235 native-fallback-enter reason=reapStaleJobs elapsedMs=24084",
    "1777402161248 native-output-len=5830",
    "1777402161256 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161344 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24239 idleMs=24239",
    "1777402161353 native-fallback-enter reason=reapStaleJobs",
    "1777402161361 native-output-len=5830",
    "1777402161375 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161392 native-fallback-enter reason=reapStaleJobs elapsedMs=24239",
    "1777402161400 native-output-len=5830",
    "1777402161414 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161458 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24353 idleMs=24353",
    "1777402161465 native-fallback-enter reason=reapStaleJobs",
    "1777402161474 native-output-len=5830",
    "1777402161482 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161503 native-fallback-enter reason=reapStaleJobs elapsedMs=24353",
    "1777402161513 native-output-len=5830",
    "1777402161521 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402161566 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=24461 idleMs=24461",
    "1777402161578 native-fallback-enter reason=reapStaleJobs",
    "1777402161587 native-output-len=5830",
    "1777402161595 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018356.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 24762,
  "idleMs": 24762,
  "debug": [
    "1777402160060 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160077 native-fallback-enter reason=reapStaleJobs elapsedMs=22924",
    "1777402160090 native-output-len=5830",
    "1777402160098 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160145 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23040 idleMs=23040",
    "1777402160154 native-fallback-enter reason=reapStaleJobs",
    "1777402160167 native-output-len=5830",
    "1777402160175 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160191 native-fallback-enter reason=reapStaleJobs elapsedMs=23040",
    "1777402160204 native-output-len=5830",
    "1777402160212 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160258 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23153 idleMs=23153",
    "1777402160266 native-fallback-enter reason=reapStaleJobs",
    "1777402160280 native-output-len=5830",
    "1777402160289 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160304 native-fallback-enter reason=reapStaleJobs elapsedMs=23153",
    "1777402160319 native-output-len=5830",
    "1777402160328 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160424 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=23319 idleMs=23319",
    "1777402160431 native-fallback-enter reason=getJobState",
    "1777402160440 native-output-len=5830",
    "1777402160449 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160478 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23373 idleMs=23373",
    "1777402160486 native-fallback-enter reason=reapStaleJobs",
    "1777402160500 native-output-len=5830",
    "1777402160509 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160526 native-fallback-enter reason=reapStaleJobs elapsedMs=23373",
    "1777402160539 native-output-len=5830",
    "1777402160549 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160635 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23530 idleMs=23530",
    "1777402160644 native-fallback-enter reason=reapStaleJobs",
    "1777402160652 native-output-len=5830",
    "1777402160665 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160682 native-fallback-enter reason=reapStaleJobs elapsedMs=23530",
    "1777402160690 native-output-len=5830",
    "1777402160703 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160748 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23643 idleMs=23643",
    "1777402160756 native-fallback-enter reason=reapStaleJobs",
    "1777402160765 native-output-len=5830",
    "1777402160773 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160793 native-fallback-enter reason=reapStaleJobs elapsedMs=23643",
    "1777402160801 native-output-len=5830",
    "1777402160809 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160855 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23750 idleMs=23750",
    "1777402160866 native-fallback-enter reason=reapStaleJobs",
    "1777402160875 native-output-len=5830",
    "1777402160885 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018355.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 24168,
  "idleMs": 24168,
  "debug": [
    "1777402159472 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159490 native-fallback-enter reason=reapStaleJobs elapsedMs=22339",
    "1777402159498 native-output-len=5830",
    "1777402159512 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159560 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22455 idleMs=22455",
    "1777402159568 native-fallback-enter reason=reapStaleJobs",
    "1777402159577 native-output-len=5830",
    "1777402159586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159606 native-fallback-enter reason=reapStaleJobs elapsedMs=22455",
    "1777402159615 native-output-len=5830",
    "1777402159623 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159667 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22562 idleMs=22562",
    "1777402159678 native-fallback-enter reason=reapStaleJobs",
    "1777402159686 native-output-len=5830",
    "1777402159695 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159716 native-fallback-enter reason=reapStaleJobs elapsedMs=22562",
    "1777402159723 native-output-len=5830",
    "1777402159732 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159827 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=22722 idleMs=22722",
    "1777402159835 native-fallback-enter reason=getJobState",
    "1777402159842 native-output-len=5830",
    "1777402159856 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159880 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22775 idleMs=22775",
    "1777402159893 native-fallback-enter reason=reapStaleJobs",
    "1777402159901 native-output-len=5830",
    "1777402159909 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159928 native-fallback-enter reason=reapStaleJobs elapsedMs=22775",
    "1777402159936 native-output-len=5830",
    "1777402159945 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160029 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22924 idleMs=22924",
    "1777402160038 native-fallback-enter reason=reapStaleJobs",
    "1777402160051 native-output-len=5830",
    "1777402160060 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160077 native-fallback-enter reason=reapStaleJobs elapsedMs=22924",
    "1777402160090 native-output-len=5830",
    "1777402160098 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160145 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23040 idleMs=23040",
    "1777402160154 native-fallback-enter reason=reapStaleJobs",
    "1777402160167 native-output-len=5830",
    "1777402160175 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160191 native-fallback-enter reason=reapStaleJobs elapsedMs=23040",
    "1777402160204 native-output-len=5830",
    "1777402160212 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402160258 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=23153 idleMs=23153",
    "1777402160266 native-fallback-enter reason=reapStaleJobs",
    "1777402160280 native-output-len=5830",
    "1777402160289 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018354.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 23461,
  "idleMs": 23461,
  "debug": [
    "1777402158772 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158789 native-fallback-enter reason=reapStaleJobs elapsedMs=21637",
    "1777402158801 native-output-len=5830",
    "1777402158809 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158852 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21747 idleMs=21747",
    "1777402158859 native-fallback-enter reason=reapStaleJobs",
    "1777402158871 native-output-len=5830",
    "1777402158880 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158896 native-fallback-enter reason=reapStaleJobs elapsedMs=21747",
    "1777402158908 native-output-len=5830",
    "1777402158916 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158960 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21855 idleMs=21855",
    "1777402158969 native-fallback-enter reason=reapStaleJobs",
    "1777402158981 native-output-len=5830",
    "1777402158989 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159005 native-fallback-enter reason=reapStaleJobs elapsedMs=21855",
    "1777402159018 native-output-len=5830",
    "1777402159027 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159081 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21976 idleMs=21976",
    "1777402159089 native-fallback-enter reason=reapStaleJobs",
    "1777402159102 native-output-len=5830",
    "1777402159110 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159125 native-fallback-enter reason=reapStaleJobs elapsedMs=21976",
    "1777402159138 native-output-len=5830",
    "1777402159147 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159240 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=22135 idleMs=22135",
    "1777402159247 native-fallback-enter reason=getJobState",
    "1777402159255 native-output-len=5830",
    "1777402159263 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159293 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22188 idleMs=22188",
    "1777402159301 native-fallback-enter reason=reapStaleJobs",
    "1777402159312 native-output-len=5830",
    "1777402159321 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159337 native-fallback-enter reason=reapStaleJobs elapsedMs=22188",
    "1777402159350 native-output-len=5830",
    "1777402159359 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159444 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22339 idleMs=22339",
    "1777402159452 native-fallback-enter reason=reapStaleJobs",
    "1777402159459 native-output-len=5830",
    "1777402159472 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159490 native-fallback-enter reason=reapStaleJobs elapsedMs=22339",
    "1777402159498 native-output-len=5830",
    "1777402159512 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402159560 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=22455 idleMs=22455",
    "1777402159568 native-fallback-enter reason=reapStaleJobs",
    "1777402159577 native-output-len=5830",
    "1777402159586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018353.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 22859,
  "idleMs": 22859,
  "debug": [
    "1777402158184 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158200 native-fallback-enter reason=reapStaleJobs elapsedMs=21051",
    "1777402158208 native-output-len=5830",
    "1777402158220 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158265 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21160 idleMs=21160",
    "1777402158273 native-fallback-enter reason=reapStaleJobs",
    "1777402158282 native-output-len=5830",
    "1777402158291 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158312 native-fallback-enter reason=reapStaleJobs elapsedMs=21160",
    "1777402158321 native-output-len=5830",
    "1777402158330 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158377 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21272 idleMs=21272",
    "1777402158389 native-fallback-enter reason=reapStaleJobs",
    "1777402158398 native-output-len=5830",
    "1777402158407 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158428 native-fallback-enter reason=reapStaleJobs elapsedMs=21272",
    "1777402158436 native-output-len=5830",
    "1777402158445 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158541 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=21436 idleMs=21436",
    "1777402158549 native-fallback-enter reason=getJobState",
    "1777402158556 native-output-len=5830",
    "1777402158570 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158592 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21487 idleMs=21487",
    "1777402158605 native-fallback-enter reason=reapStaleJobs",
    "1777402158613 native-output-len=5830",
    "1777402158621 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158642 native-fallback-enter reason=reapStaleJobs elapsedMs=21487",
    "1777402158650 native-output-len=5830",
    "1777402158660 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158742 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21637 idleMs=21637",
    "1777402158750 native-fallback-enter reason=reapStaleJobs",
    "1777402158763 native-output-len=5830",
    "1777402158772 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158789 native-fallback-enter reason=reapStaleJobs elapsedMs=21637",
    "1777402158801 native-output-len=5830",
    "1777402158809 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158852 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21747 idleMs=21747",
    "1777402158859 native-fallback-enter reason=reapStaleJobs",
    "1777402158871 native-output-len=5830",
    "1777402158880 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158896 native-fallback-enter reason=reapStaleJobs elapsedMs=21747",
    "1777402158908 native-output-len=5830",
    "1777402158916 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158960 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21855 idleMs=21855",
    "1777402158969 native-fallback-enter reason=reapStaleJobs",
    "1777402158981 native-output-len=5830",
    "1777402158989 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018352.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 22271,
  "idleMs": 22271,
  "debug": [
    "1777402157594 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157615 native-fallback-enter reason=reapStaleJobs elapsedMs=20463",
    "1777402157624 native-output-len=5830",
    "1777402157632 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157678 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20573 idleMs=20573",
    "1777402157690 native-fallback-enter reason=reapStaleJobs",
    "1777402157698 native-output-len=5830",
    "1777402157706 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157725 native-fallback-enter reason=reapStaleJobs elapsedMs=20573",
    "1777402157733 native-output-len=5830",
    "1777402157741 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157789 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20684 idleMs=20684",
    "1777402157796 native-fallback-enter reason=reapStaleJobs",
    "1777402157808 native-output-len=5830",
    "1777402157816 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157832 native-fallback-enter reason=reapStaleJobs elapsedMs=20684",
    "1777402157845 native-output-len=5830",
    "1777402157854 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157950 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=20845 idleMs=20845",
    "1777402157957 native-fallback-enter reason=getJobState",
    "1777402157966 native-output-len=5830",
    "1777402157975 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158004 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20899 idleMs=20899",
    "1777402158012 native-fallback-enter reason=reapStaleJobs",
    "1777402158025 native-output-len=5830",
    "1777402158034 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158051 native-fallback-enter reason=reapStaleJobs elapsedMs=20899",
    "1777402158064 native-output-len=5830",
    "1777402158073 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158156 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21051 idleMs=21051",
    "1777402158164 native-fallback-enter reason=reapStaleJobs",
    "1777402158171 native-output-len=5830",
    "1777402158184 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158200 native-fallback-enter reason=reapStaleJobs elapsedMs=21051",
    "1777402158208 native-output-len=5830",
    "1777402158220 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158265 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21160 idleMs=21160",
    "1777402158273 native-fallback-enter reason=reapStaleJobs",
    "1777402158282 native-output-len=5830",
    "1777402158291 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158312 native-fallback-enter reason=reapStaleJobs elapsedMs=21160",
    "1777402158321 native-output-len=5830",
    "1777402158330 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402158377 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=21272 idleMs=21272",
    "1777402158389 native-fallback-enter reason=reapStaleJobs",
    "1777402158398 native-output-len=5830",
    "1777402158407 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018351.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 21576,
  "idleMs": 21576,
  "debug": [
    "1777402156892 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156909 native-fallback-enter reason=reapStaleJobs elapsedMs=19756",
    "1777402156922 native-output-len=5830",
    "1777402156931 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156979 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19874 idleMs=19874",
    "1777402156987 native-fallback-enter reason=reapStaleJobs",
    "1777402157001 native-output-len=5830",
    "1777402157010 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157027 native-fallback-enter reason=reapStaleJobs elapsedMs=19874",
    "1777402157040 native-output-len=5830",
    "1777402157049 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157095 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19990 idleMs=19990",
    "1777402157103 native-fallback-enter reason=reapStaleJobs",
    "1777402157115 native-output-len=5830",
    "1777402157123 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157139 native-fallback-enter reason=reapStaleJobs elapsedMs=19990",
    "1777402157151 native-output-len=5830",
    "1777402157159 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157249 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=20144 idleMs=20144",
    "1777402157257 native-fallback-enter reason=getJobState",
    "1777402157266 native-output-len=5830",
    "1777402157275 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157305 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20200 idleMs=20200",
    "1777402157313 native-fallback-enter reason=reapStaleJobs",
    "1777402157325 native-output-len=5830",
    "1777402157334 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157350 native-fallback-enter reason=reapStaleJobs elapsedMs=20200",
    "1777402157362 native-output-len=5830",
    "1777402157371 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157450 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20345 idleMs=20345",
    "1777402157459 native-fallback-enter reason=reapStaleJobs",
    "1777402157468 native-output-len=5830",
    "1777402157481 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157498 native-fallback-enter reason=reapStaleJobs elapsedMs=20345",
    "1777402157507 native-output-len=5830",
    "1777402157520 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157568 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20463 idleMs=20463",
    "1777402157576 native-fallback-enter reason=reapStaleJobs",
    "1777402157585 native-output-len=5830",
    "1777402157594 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157615 native-fallback-enter reason=reapStaleJobs elapsedMs=20463",
    "1777402157624 native-output-len=5830",
    "1777402157632 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157678 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=20573 idleMs=20573",
    "1777402157690 native-fallback-enter reason=reapStaleJobs",
    "1777402157698 native-output-len=5830",
    "1777402157706 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018350.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 20985,
  "idleMs": 20985,
  "debug": [
    "1777402156278 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156294 native-fallback-enter reason=reapStaleJobs elapsedMs=19143",
    "1777402156303 native-output-len=5830",
    "1777402156316 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156360 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19255 idleMs=19255",
    "1777402156369 native-fallback-enter reason=reapStaleJobs",
    "1777402156377 native-output-len=5830",
    "1777402156386 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156407 native-fallback-enter reason=reapStaleJobs elapsedMs=19255",
    "1777402156416 native-output-len=5830",
    "1777402156427 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156476 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19371 idleMs=19371",
    "1777402156490 native-fallback-enter reason=reapStaleJobs",
    "1777402156499 native-output-len=5830",
    "1777402156508 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156529 native-fallback-enter reason=reapStaleJobs elapsedMs=19371",
    "1777402156538 native-output-len=5830",
    "1777402156548 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156647 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=19542 idleMs=19542",
    "1777402156656 native-fallback-enter reason=getJobState",
    "1777402156665 native-output-len=5830",
    "1777402156679 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156704 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19599 idleMs=19599",
    "1777402156717 native-fallback-enter reason=reapStaleJobs",
    "1777402156725 native-output-len=5830",
    "1777402156734 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156755 native-fallback-enter reason=reapStaleJobs elapsedMs=19599",
    "1777402156764 native-output-len=5830",
    "1777402156773 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156861 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19756 idleMs=19756",
    "1777402156870 native-fallback-enter reason=reapStaleJobs",
    "1777402156883 native-output-len=5830",
    "1777402156892 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156909 native-fallback-enter reason=reapStaleJobs elapsedMs=19756",
    "1777402156922 native-output-len=5830",
    "1777402156931 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156979 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19874 idleMs=19874",
    "1777402156987 native-fallback-enter reason=reapStaleJobs",
    "1777402157001 native-output-len=5830",
    "1777402157010 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157027 native-fallback-enter reason=reapStaleJobs elapsedMs=19874",
    "1777402157040 native-output-len=5830",
    "1777402157049 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402157095 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19990 idleMs=19990",
    "1777402157103 native-fallback-enter reason=reapStaleJobs",
    "1777402157115 native-output-len=5830",
    "1777402157123 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018349.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 20281,
  "idleMs": 20281,
  "debug": [
    "1777402155586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155602 native-fallback-enter reason=reapStaleJobs elapsedMs=18452",
    "1777402155609 native-output-len=5830",
    "1777402155622 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155668 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18563 idleMs=18563",
    "1777402155676 native-fallback-enter reason=reapStaleJobs",
    "1777402155685 native-output-len=5830",
    "1777402155694 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155714 native-fallback-enter reason=reapStaleJobs elapsedMs=18563",
    "1777402155722 native-output-len=5830",
    "1777402155731 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155778 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18673 idleMs=18673",
    "1777402155789 native-fallback-enter reason=reapStaleJobs",
    "1777402155797 native-output-len=5830",
    "1777402155805 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155824 native-fallback-enter reason=reapStaleJobs elapsedMs=18673",
    "1777402155832 native-output-len=5830",
    "1777402155841 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155887 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18782 idleMs=18782",
    "1777402155895 native-fallback-enter reason=reapStaleJobs",
    "1777402155908 native-output-len=5830",
    "1777402155917 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155932 native-fallback-enter reason=reapStaleJobs elapsedMs=18782",
    "1777402155944 native-output-len=5830",
    "1777402155953 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156051 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=18946 idleMs=18946",
    "1777402156059 native-fallback-enter reason=getJobState",
    "1777402156066 native-output-len=5830",
    "1777402156076 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156104 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18999 idleMs=18999",
    "1777402156111 native-fallback-enter reason=reapStaleJobs",
    "1777402156123 native-output-len=5830",
    "1777402156132 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156149 native-fallback-enter reason=reapStaleJobs elapsedMs=18999",
    "1777402156161 native-output-len=5830",
    "1777402156169 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156248 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19143 idleMs=19143",
    "1777402156256 native-fallback-enter reason=reapStaleJobs",
    "1777402156265 native-output-len=5830",
    "1777402156278 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156294 native-fallback-enter reason=reapStaleJobs elapsedMs=19143",
    "1777402156303 native-output-len=5830",
    "1777402156316 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402156360 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=19255 idleMs=19255",
    "1777402156369 native-fallback-enter reason=reapStaleJobs",
    "1777402156377 native-output-len=5830",
    "1777402156386 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018348.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 19690,
  "idleMs": 19690,
  "debug": [
    "1777402155003 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155019 native-fallback-enter reason=reapStaleJobs elapsedMs=17869",
    "1777402155028 native-output-len=5830",
    "1777402155041 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155088 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17983 idleMs=17983",
    "1777402155097 native-fallback-enter reason=reapStaleJobs",
    "1777402155106 native-output-len=5830",
    "1777402155114 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155133 native-fallback-enter reason=reapStaleJobs elapsedMs=17983",
    "1777402155142 native-output-len=5830",
    "1777402155150 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155192 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18087 idleMs=18087",
    "1777402155204 native-fallback-enter reason=reapStaleJobs",
    "1777402155212 native-output-len=5830",
    "1777402155221 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155240 native-fallback-enter reason=reapStaleJobs elapsedMs=18087",
    "1777402155247 native-output-len=5830",
    "1777402155256 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155353 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=18248 idleMs=18248",
    "1777402155361 native-fallback-enter reason=getJobState",
    "1777402155369 native-output-len=5830",
    "1777402155382 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155407 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18302 idleMs=18302",
    "1777402155419 native-fallback-enter reason=reapStaleJobs",
    "1777402155427 native-output-len=5830",
    "1777402155437 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155457 native-fallback-enter reason=reapStaleJobs elapsedMs=18302",
    "1777402155465 native-output-len=5830",
    "1777402155473 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155557 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18452 idleMs=18452",
    "1777402155565 native-fallback-enter reason=reapStaleJobs",
    "1777402155573 native-output-len=5830",
    "1777402155586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155602 native-fallback-enter reason=reapStaleJobs elapsedMs=18452",
    "1777402155609 native-output-len=5830",
    "1777402155622 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155668 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18563 idleMs=18563",
    "1777402155676 native-fallback-enter reason=reapStaleJobs",
    "1777402155685 native-output-len=5830",
    "1777402155694 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155714 native-fallback-enter reason=reapStaleJobs elapsedMs=18563",
    "1777402155722 native-output-len=5830",
    "1777402155731 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155778 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18673 idleMs=18673",
    "1777402155789 native-fallback-enter reason=reapStaleJobs",
    "1777402155797 native-output-len=5830",
    "1777402155805 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018347.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 19079,
  "idleMs": 19079,
  "debug": [
    "1777402154425 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154440 native-fallback-enter reason=reapStaleJobs elapsedMs=17291",
    "1777402154448 native-output-len=5830",
    "1777402154462 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154507 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17402 idleMs=17402",
    "1777402154515 native-fallback-enter reason=reapStaleJobs",
    "1777402154524 native-output-len=5830",
    "1777402154533 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154554 native-fallback-enter reason=reapStaleJobs elapsedMs=17402",
    "1777402154563 native-output-len=5830",
    "1777402154572 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154617 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17512 idleMs=17512",
    "1777402154628 native-fallback-enter reason=reapStaleJobs",
    "1777402154636 native-output-len=5830",
    "1777402154646 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154666 native-fallback-enter reason=reapStaleJobs elapsedMs=17512",
    "1777402154674 native-output-len=5830",
    "1777402154684 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154775 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=17670 idleMs=17670",
    "1777402154782 native-fallback-enter reason=getJobState",
    "1777402154790 native-output-len=5830",
    "1777402154803 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154825 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17720 idleMs=17720",
    "1777402154837 native-fallback-enter reason=reapStaleJobs",
    "1777402154846 native-output-len=5830",
    "1777402154855 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154874 native-fallback-enter reason=reapStaleJobs elapsedMs=17720",
    "1777402154882 native-output-len=5830",
    "1777402154892 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154974 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17869 idleMs=17869",
    "1777402154982 native-fallback-enter reason=reapStaleJobs",
    "1777402154989 native-output-len=5830",
    "1777402155003 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155019 native-fallback-enter reason=reapStaleJobs elapsedMs=17869",
    "1777402155028 native-output-len=5830",
    "1777402155041 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155088 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17983 idleMs=17983",
    "1777402155097 native-fallback-enter reason=reapStaleJobs",
    "1777402155106 native-output-len=5830",
    "1777402155114 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155133 native-fallback-enter reason=reapStaleJobs elapsedMs=17983",
    "1777402155142 native-output-len=5830",
    "1777402155150 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402155192 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=18087 idleMs=18087",
    "1777402155204 native-fallback-enter reason=reapStaleJobs",
    "1777402155212 native-output-len=5830",
    "1777402155221 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018346.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 18388,
  "idleMs": 18388,
  "debug": [
    "1777402153728 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153744 native-fallback-enter reason=reapStaleJobs elapsedMs=16594",
    "1777402153751 native-output-len=5830",
    "1777402153764 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153810 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16705 idleMs=16705",
    "1777402153819 native-fallback-enter reason=reapStaleJobs",
    "1777402153827 native-output-len=5830",
    "1777402153835 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153855 native-fallback-enter reason=reapStaleJobs elapsedMs=16705",
    "1777402153863 native-output-len=5830",
    "1777402153872 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153917 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16812 idleMs=16812",
    "1777402153930 native-fallback-enter reason=reapStaleJobs",
    "1777402153937 native-output-len=5830",
    "1777402153946 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153966 native-fallback-enter reason=reapStaleJobs elapsedMs=16812",
    "1777402153973 native-output-len=5830",
    "1777402153982 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154030 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16925 idleMs=16925",
    "1777402154039 native-fallback-enter reason=reapStaleJobs",
    "1777402154052 native-output-len=5830",
    "1777402154061 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154078 native-fallback-enter reason=reapStaleJobs elapsedMs=16925",
    "1777402154091 native-output-len=5830",
    "1777402154100 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154194 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=17089 idleMs=17089",
    "1777402154202 native-fallback-enter reason=getJobState",
    "1777402154209 native-output-len=5830",
    "1777402154218 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154247 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17142 idleMs=17142",
    "1777402154254 native-fallback-enter reason=reapStaleJobs",
    "1777402154266 native-output-len=5830",
    "1777402154275 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154292 native-fallback-enter reason=reapStaleJobs elapsedMs=17142",
    "1777402154304 native-output-len=5830",
    "1777402154313 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154396 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17291 idleMs=17291",
    "1777402154404 native-fallback-enter reason=reapStaleJobs",
    "1777402154412 native-output-len=5830",
    "1777402154425 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154440 native-fallback-enter reason=reapStaleJobs elapsedMs=17291",
    "1777402154448 native-output-len=5830",
    "1777402154462 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402154507 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=17402 idleMs=17402",
    "1777402154515 native-fallback-enter reason=reapStaleJobs",
    "1777402154524 native-output-len=5830",
    "1777402154533 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018345.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 17808,
  "idleMs": 17808,
  "debug": [
    "1777402153166 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153182 native-fallback-enter reason=reapStaleJobs elapsedMs=16030",
    "1777402153191 native-output-len=5830",
    "1777402153204 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153252 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16147 idleMs=16147",
    "1777402153260 native-fallback-enter reason=reapStaleJobs",
    "1777402153269 native-output-len=5830",
    "1777402153278 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153299 native-fallback-enter reason=reapStaleJobs elapsedMs=16147",
    "1777402153308 native-output-len=5830",
    "1777402153317 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153359 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16254 idleMs=16254",
    "1777402153371 native-fallback-enter reason=reapStaleJobs",
    "1777402153378 native-output-len=5830",
    "1777402153386 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153405 native-fallback-enter reason=reapStaleJobs elapsedMs=16254",
    "1777402153412 native-output-len=5830",
    "1777402153421 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153507 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=16402 idleMs=16402",
    "1777402153514 native-fallback-enter reason=getJobState",
    "1777402153522 native-output-len=5830",
    "1777402153535 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153557 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16452 idleMs=16452",
    "1777402153569 native-fallback-enter reason=reapStaleJobs",
    "1777402153577 native-output-len=5830",
    "1777402153585 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153604 native-fallback-enter reason=reapStaleJobs elapsedMs=16452",
    "1777402153611 native-output-len=5830",
    "1777402153620 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153699 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16594 idleMs=16594",
    "1777402153707 native-fallback-enter reason=reapStaleJobs",
    "1777402153715 native-output-len=5830",
    "1777402153728 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153744 native-fallback-enter reason=reapStaleJobs elapsedMs=16594",
    "1777402153751 native-output-len=5830",
    "1777402153764 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153810 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16705 idleMs=16705",
    "1777402153819 native-fallback-enter reason=reapStaleJobs",
    "1777402153827 native-output-len=5830",
    "1777402153835 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153855 native-fallback-enter reason=reapStaleJobs elapsedMs=16705",
    "1777402153863 native-output-len=5830",
    "1777402153872 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153917 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16812 idleMs=16812",
    "1777402153930 native-fallback-enter reason=reapStaleJobs",
    "1777402153937 native-output-len=5830",
    "1777402153946 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018344.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 17225,
  "idleMs": 17225,
  "debug": [
    "1777402152515 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152536 native-fallback-enter reason=reapStaleJobs elapsedMs=15384",
    "1777402152543 native-output-len=5830",
    "1777402152552 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152598 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=15493 idleMs=15493",
    "1777402152610 native-fallback-enter reason=reapStaleJobs",
    "1777402152619 native-output-len=5830",
    "1777402152628 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152649 native-fallback-enter reason=reapStaleJobs elapsedMs=15493",
    "1777402152657 native-output-len=5830",
    "1777402152667 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152717 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=15612 idleMs=15612",
    "1777402152725 native-fallback-enter reason=reapStaleJobs",
    "1777402152738 native-output-len=5830",
    "1777402152747 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152764 native-fallback-enter reason=reapStaleJobs elapsedMs=15612",
    "1777402152776 native-output-len=5830",
    "1777402152786 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152903 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=15798 idleMs=15798",
    "1777402152914 native-fallback-enter reason=getJobState",
    "1777402152923 native-output-len=5830",
    "1777402152934 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152968 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=15863 idleMs=15863",
    "1777402152977 native-fallback-enter reason=reapStaleJobs",
    "1777402152991 native-output-len=5830",
    "1777402153001 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153020 native-fallback-enter reason=reapStaleJobs elapsedMs=15862",
    "1777402153034 native-output-len=5830",
    "1777402153045 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153135 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16030 idleMs=16030",
    "1777402153144 native-fallback-enter reason=reapStaleJobs",
    "1777402153152 native-output-len=5830",
    "1777402153166 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153182 native-fallback-enter reason=reapStaleJobs elapsedMs=16030",
    "1777402153191 native-output-len=5830",
    "1777402153204 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153252 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16147 idleMs=16147",
    "1777402153260 native-fallback-enter reason=reapStaleJobs",
    "1777402153269 native-output-len=5830",
    "1777402153278 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153299 native-fallback-enter reason=reapStaleJobs elapsedMs=16147",
    "1777402153308 native-output-len=5830",
    "1777402153317 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402153359 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=16254 idleMs=16254",
    "1777402153371 native-fallback-enter reason=reapStaleJobs",
    "1777402153378 native-output-len=5830",
    "1777402153386 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018343.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 16534,
  "idleMs": 16534,
  "debug": [
    "1777402151832 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151848 native-fallback-enter reason=reapStaleJobs elapsedMs=14698",
    "1777402151857 native-output-len=5830",
    "1777402151869 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151916 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14811 idleMs=14811",
    "1777402151924 native-fallback-enter reason=reapStaleJobs",
    "1777402151932 native-output-len=5830",
    "1777402151941 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151959 native-fallback-enter reason=reapStaleJobs elapsedMs=14811",
    "1777402151968 native-output-len=5830",
    "1777402151977 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152023 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14918 idleMs=14918",
    "1777402152036 native-fallback-enter reason=reapStaleJobs",
    "1777402152044 native-output-len=5830",
    "1777402152054 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152073 native-fallback-enter reason=reapStaleJobs elapsedMs=14918",
    "1777402152081 native-output-len=5830",
    "1777402152089 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152180 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=15075 idleMs=15075",
    "1777402152188 native-fallback-enter reason=getJobState",
    "1777402152196 native-output-len=5830",
    "1777402152208 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152232 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=15127 idleMs=15127",
    "1777402152244 native-fallback-enter reason=reapStaleJobs",
    "1777402152252 native-output-len=5830",
    "1777402152262 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152282 native-fallback-enter reason=reapStaleJobs elapsedMs=15127",
    "1777402152291 native-output-len=5830",
    "1777402152300 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152382 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=15277 idleMs=15277",
    "1777402152390 native-fallback-enter reason=reapStaleJobs",
    "1777402152397 native-output-len=5830",
    "1777402152410 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152427 native-fallback-enter reason=reapStaleJobs elapsedMs=15277",
    "1777402152434 native-output-len=5830",
    "1777402152446 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152489 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=15384 idleMs=15384",
    "1777402152497 native-fallback-enter reason=reapStaleJobs",
    "1777402152506 native-output-len=5830",
    "1777402152515 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152536 native-fallback-enter reason=reapStaleJobs elapsedMs=15384",
    "1777402152543 native-output-len=5830",
    "1777402152552 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152598 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=15493 idleMs=15493",
    "1777402152610 native-fallback-enter reason=reapStaleJobs",
    "1777402152619 native-output-len=5830",
    "1777402152628 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018342.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 15959,
  "idleMs": 15959,
  "debug": [
    "1777402151245 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151265 native-fallback-enter reason=reapStaleJobs elapsedMs=14114",
    "1777402151274 native-output-len=5830",
    "1777402151283 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151329 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14224 idleMs=14224",
    "1777402151341 native-fallback-enter reason=reapStaleJobs",
    "1777402151349 native-output-len=5830",
    "1777402151358 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151377 native-fallback-enter reason=reapStaleJobs elapsedMs=14224",
    "1777402151385 native-output-len=5830",
    "1777402151395 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151443 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14338 idleMs=14338",
    "1777402151451 native-fallback-enter reason=reapStaleJobs",
    "1777402151463 native-output-len=5830",
    "1777402151472 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151488 native-fallback-enter reason=reapStaleJobs elapsedMs=14338",
    "1777402151500 native-output-len=5830",
    "1777402151509 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151607 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=14502 idleMs=14502",
    "1777402151615 native-fallback-enter reason=getJobState",
    "1777402151623 native-output-len=5830",
    "1777402151632 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151660 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14555 idleMs=14555",
    "1777402151668 native-fallback-enter reason=reapStaleJobs",
    "1777402151680 native-output-len=5830",
    "1777402151688 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151703 native-fallback-enter reason=reapStaleJobs elapsedMs=14555",
    "1777402151715 native-output-len=5830",
    "1777402151723 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151803 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14698 idleMs=14698",
    "1777402151811 native-fallback-enter reason=reapStaleJobs",
    "1777402151819 native-output-len=5830",
    "1777402151832 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151848 native-fallback-enter reason=reapStaleJobs elapsedMs=14698",
    "1777402151857 native-output-len=5830",
    "1777402151869 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151916 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14811 idleMs=14811",
    "1777402151924 native-fallback-enter reason=reapStaleJobs",
    "1777402151932 native-output-len=5830",
    "1777402151941 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151959 native-fallback-enter reason=reapStaleJobs elapsedMs=14811",
    "1777402151968 native-output-len=5830",
    "1777402151977 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402152023 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14918 idleMs=14918",
    "1777402152036 native-fallback-enter reason=reapStaleJobs",
    "1777402152044 native-output-len=5830",
    "1777402152054 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018341.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 15216,
  "idleMs": 15216,
  "debug": [
    "1777402150560 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150575 native-fallback-enter reason=reapStaleJobs elapsedMs=13426",
    "1777402150583 native-output-len=5830",
    "1777402150596 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150643 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=13538 idleMs=13538",
    "1777402150650 native-fallback-enter reason=reapStaleJobs",
    "1777402150658 native-output-len=5830",
    "1777402150666 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150686 native-fallback-enter reason=reapStaleJobs elapsedMs=13538",
    "1777402150695 native-output-len=5830",
    "1777402150703 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150749 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=13644 idleMs=13644",
    "1777402150761 native-fallback-enter reason=reapStaleJobs",
    "1777402150770 native-output-len=5830",
    "1777402150779 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150799 native-fallback-enter reason=reapStaleJobs elapsedMs=13644",
    "1777402150807 native-output-len=5830",
    "1777402150815 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150908 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=13803 idleMs=13803",
    "1777402150915 native-fallback-enter reason=getJobState",
    "1777402150923 native-output-len=5830",
    "1777402150935 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150957 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=13852 idleMs=13852",
    "1777402150969 native-fallback-enter reason=reapStaleJobs",
    "1777402150976 native-output-len=5830",
    "1777402150985 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151006 native-fallback-enter reason=reapStaleJobs elapsedMs=13852",
    "1777402151014 native-output-len=5830",
    "1777402151024 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151108 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14003 idleMs=14003",
    "1777402151116 native-fallback-enter reason=reapStaleJobs",
    "1777402151124 native-output-len=5830",
    "1777402151137 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151154 native-fallback-enter reason=reapStaleJobs elapsedMs=14003",
    "1777402151162 native-output-len=5830",
    "1777402151175 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151219 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14114 idleMs=14114",
    "1777402151227 native-fallback-enter reason=reapStaleJobs",
    "1777402151236 native-output-len=5830",
    "1777402151245 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151265 native-fallback-enter reason=reapStaleJobs elapsedMs=14114",
    "1777402151274 native-output-len=5830",
    "1777402151283 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402151329 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=14224 idleMs=14224",
    "1777402151341 native-fallback-enter reason=reapStaleJobs",
    "1777402151349 native-output-len=5830",
    "1777402151358 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018340.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 14634,
  "idleMs": 14634,
  "debug": [
    "1777402149966 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149982 native-fallback-enter reason=reapStaleJobs elapsedMs=12833",
    "1777402149990 native-output-len=5830",
    "1777402150003 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150051 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=12946 idleMs=12946",
    "1777402150059 native-fallback-enter reason=reapStaleJobs",
    "1777402150068 native-output-len=5830",
    "1777402150077 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150098 native-fallback-enter reason=reapStaleJobs elapsedMs=12946",
    "1777402150107 native-output-len=5830",
    "1777402150116 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150161 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=13056 idleMs=13056",
    "1777402150174 native-fallback-enter reason=reapStaleJobs",
    "1777402150182 native-output-len=5830",
    "1777402150192 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150212 native-fallback-enter reason=reapStaleJobs elapsedMs=13056",
    "1777402150221 native-output-len=5830",
    "1777402150231 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150324 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=13219 idleMs=13219",
    "1777402150331 native-fallback-enter reason=getJobState",
    "1777402150339 native-output-len=5830",
    "1777402150352 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150377 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=13272 idleMs=13272",
    "1777402150389 native-fallback-enter reason=reapStaleJobs",
    "1777402150398 native-output-len=5830",
    "1777402150407 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150426 native-fallback-enter reason=reapStaleJobs elapsedMs=13272",
    "1777402150434 native-output-len=5830",
    "1777402150443 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150531 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=13426 idleMs=13426",
    "1777402150539 native-fallback-enter reason=reapStaleJobs",
    "1777402150547 native-output-len=5830",
    "1777402150560 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150575 native-fallback-enter reason=reapStaleJobs elapsedMs=13426",
    "1777402150583 native-output-len=5830",
    "1777402150596 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150643 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=13538 idleMs=13538",
    "1777402150650 native-fallback-enter reason=reapStaleJobs",
    "1777402150658 native-output-len=5830",
    "1777402150666 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150686 native-fallback-enter reason=reapStaleJobs elapsedMs=13538",
    "1777402150695 native-output-len=5830",
    "1777402150703 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150749 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=13644 idleMs=13644",
    "1777402150761 native-fallback-enter reason=reapStaleJobs",
    "1777402150770 native-output-len=5830",
    "1777402150779 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018339.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 13940,
  "idleMs": 13940,
  "debug": [
    "1777402149278 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149295 native-fallback-enter reason=reapStaleJobs elapsedMs=12143",
    "1777402149303 native-output-len=5830",
    "1777402149316 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149362 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=12257 idleMs=12257",
    "1777402149371 native-fallback-enter reason=reapStaleJobs",
    "1777402149380 native-output-len=5830",
    "1777402149388 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149409 native-fallback-enter reason=reapStaleJobs elapsedMs=12257",
    "1777402149418 native-output-len=5830",
    "1777402149426 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149468 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=12363 idleMs=12363",
    "1777402149480 native-fallback-enter reason=reapStaleJobs",
    "1777402149488 native-output-len=5830",
    "1777402149497 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149516 native-fallback-enter reason=reapStaleJobs elapsedMs=12363",
    "1777402149523 native-output-len=5830",
    "1777402149532 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149582 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=12477 idleMs=12477",
    "1777402149590 native-fallback-enter reason=reapStaleJobs",
    "1777402149602 native-output-len=5830",
    "1777402149611 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149628 native-fallback-enter reason=reapStaleJobs elapsedMs=12477",
    "1777402149640 native-output-len=5830",
    "1777402149649 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149744 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=12639 idleMs=12639",
    "1777402149751 native-fallback-enter reason=getJobState",
    "1777402149759 native-output-len=5830",
    "1777402149768 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149794 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=12689 idleMs=12689",
    "1777402149802 native-fallback-enter reason=reapStaleJobs",
    "1777402149813 native-output-len=5830",
    "1777402149822 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149837 native-fallback-enter reason=reapStaleJobs elapsedMs=12689",
    "1777402149849 native-output-len=5830",
    "1777402149857 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149938 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=12833 idleMs=12833",
    "1777402149946 native-fallback-enter reason=reapStaleJobs",
    "1777402149954 native-output-len=5830",
    "1777402149966 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149982 native-fallback-enter reason=reapStaleJobs elapsedMs=12833",
    "1777402149990 native-output-len=5830",
    "1777402150003 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402150051 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=12946 idleMs=12946",
    "1777402150059 native-fallback-enter reason=reapStaleJobs",
    "1777402150068 native-output-len=5830",
    "1777402150077 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018338.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 13359,
  "idleMs": 13359,
  "debug": [
    "1777402148698 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148718 native-fallback-enter reason=reapStaleJobs elapsedMs=11562",
    "1777402148727 native-output-len=5830",
    "1777402148737 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148782 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=11677 idleMs=11677",
    "1777402148790 native-fallback-enter reason=reapStaleJobs",
    "1777402148802 native-output-len=5830",
    "1777402148810 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148826 native-fallback-enter reason=reapStaleJobs elapsedMs=11677",
    "1777402148838 native-output-len=5830",
    "1777402148847 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148892 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=11787 idleMs=11787",
    "1777402148900 native-fallback-enter reason=reapStaleJobs",
    "1777402148911 native-output-len=5830",
    "1777402148919 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148935 native-fallback-enter reason=reapStaleJobs elapsedMs=11787",
    "1777402148947 native-output-len=5830",
    "1777402148956 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149051 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=11946 idleMs=11946",
    "1777402149059 native-fallback-enter reason=getJobState",
    "1777402149067 native-output-len=5830",
    "1777402149076 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149103 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=11998 idleMs=11998",
    "1777402149110 native-fallback-enter reason=reapStaleJobs",
    "1777402149122 native-output-len=5830",
    "1777402149130 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149146 native-fallback-enter reason=reapStaleJobs elapsedMs=11998",
    "1777402149158 native-output-len=5830",
    "1777402149167 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149248 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=12143 idleMs=12143",
    "1777402149256 native-fallback-enter reason=reapStaleJobs",
    "1777402149265 native-output-len=5830",
    "1777402149278 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149295 native-fallback-enter reason=reapStaleJobs elapsedMs=12143",
    "1777402149303 native-output-len=5830",
    "1777402149316 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149362 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=12257 idleMs=12257",
    "1777402149371 native-fallback-enter reason=reapStaleJobs",
    "1777402149380 native-output-len=5830",
    "1777402149388 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149409 native-fallback-enter reason=reapStaleJobs elapsedMs=12257",
    "1777402149418 native-output-len=5830",
    "1777402149426 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402149468 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=12363 idleMs=12363",
    "1777402149480 native-fallback-enter reason=reapStaleJobs",
    "1777402149488 native-output-len=5830",
    "1777402149497 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018337.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 12768,
  "idleMs": 12768,
  "debug": [
    "1777402148119 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148134 native-fallback-enter reason=reapStaleJobs elapsedMs=10990",
    "1777402148141 native-output-len=5830",
    "1777402148149 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148191 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=11086 idleMs=11086",
    "1777402148199 native-fallback-enter reason=reapStaleJobs",
    "1777402148211 native-output-len=5830",
    "1777402148219 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148235 native-fallback-enter reason=reapStaleJobs elapsedMs=11086",
    "1777402148247 native-output-len=5830",
    "1777402148256 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148304 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=11199 idleMs=11199",
    "1777402148312 native-fallback-enter reason=reapStaleJobs",
    "1777402148324 native-output-len=5830",
    "1777402148332 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148348 native-fallback-enter reason=reapStaleJobs elapsedMs=11199",
    "1777402148360 native-output-len=5830",
    "1777402148368 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148458 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=11353 idleMs=11353",
    "1777402148470 native-fallback-enter reason=getJobState",
    "1777402148479 native-output-len=5830",
    "1777402148488 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148517 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=11412 idleMs=11412",
    "1777402148525 native-fallback-enter reason=reapStaleJobs",
    "1777402148534 native-output-len=5830",
    "1777402148547 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148562 native-fallback-enter reason=reapStaleJobs elapsedMs=11412",
    "1777402148570 native-output-len=5830",
    "1777402148583 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148667 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=11562 idleMs=11562",
    "1777402148680 native-fallback-enter reason=reapStaleJobs",
    "1777402148689 native-output-len=5830",
    "1777402148698 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148718 native-fallback-enter reason=reapStaleJobs elapsedMs=11562",
    "1777402148727 native-output-len=5830",
    "1777402148737 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148782 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=11677 idleMs=11677",
    "1777402148790 native-fallback-enter reason=reapStaleJobs",
    "1777402148802 native-output-len=5830",
    "1777402148810 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148826 native-fallback-enter reason=reapStaleJobs elapsedMs=11677",
    "1777402148838 native-output-len=5830",
    "1777402148847 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148892 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=11787 idleMs=11787",
    "1777402148900 native-fallback-enter reason=reapStaleJobs",
    "1777402148911 native-output-len=5830",
    "1777402148919 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018336.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 12076,
  "idleMs": 12076,
  "debug": [
    "1777402147424 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147444 native-fallback-enter reason=reapStaleJobs elapsedMs=10289",
    "1777402147454 native-output-len=5830",
    "1777402147470 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147520 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=10415 idleMs=10415",
    "1777402147530 native-fallback-enter reason=reapStaleJobs",
    "1777402147540 native-output-len=5830",
    "1777402147550 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147568 native-fallback-enter reason=reapStaleJobs elapsedMs=10415",
    "1777402147581 native-output-len=5830",
    "1777402147590 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147633 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=10528 idleMs=10528",
    "1777402147642 native-fallback-enter reason=reapStaleJobs",
    "1777402147650 native-output-len=5830",
    "1777402147659 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147683 native-fallback-enter reason=reapStaleJobs elapsedMs=10528",
    "1777402147693 native-output-len=5830",
    "1777402147704 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147797 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=10692 idleMs=10692",
    "1777402147809 native-fallback-enter reason=getJobState",
    "1777402147818 native-output-len=5830",
    "1777402147826 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147851 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=10746 idleMs=10746",
    "1777402147859 native-fallback-enter reason=reapStaleJobs",
    "1777402147868 native-output-len=5830",
    "1777402147877 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147897 native-fallback-enter reason=reapStaleJobs elapsedMs=10746",
    "1777402147905 native-output-len=5830",
    "1777402147915 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147992 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=10887 idleMs=10887",
    "1777402148004 native-fallback-enter reason=reapStaleJobs",
    "1777402148013 native-output-len=5830",
    "1777402148021 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148038 native-fallback-enter reason=reapStaleJobs elapsedMs=10887",
    "1777402148045 native-output-len=5830",
    "1777402148053 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148095 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=10990 idleMs=10990",
    "1777402148103 native-fallback-enter reason=reapStaleJobs",
    "1777402148111 native-output-len=5830",
    "1777402148119 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148134 native-fallback-enter reason=reapStaleJobs elapsedMs=10990",
    "1777402148141 native-output-len=5830",
    "1777402148149 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402148191 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=11086 idleMs=11086",
    "1777402148199 native-fallback-enter reason=reapStaleJobs",
    "1777402148211 native-output-len=5830",
    "1777402148219 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Bo
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018335.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 11495,
  "idleMs": 11495,
  "debug": [
    "1777402146749 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146765 native-fallback-enter reason=reapStaleJobs elapsedMs=9613",
    "1777402146774 native-output-len=5830",
    "1777402146787 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146834 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=9729 idleMs=9729",
    "1777402146842 native-fallback-enter reason=reapStaleJobs",
    "1777402146852 native-output-len=5830",
    "1777402146861 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146882 native-fallback-enter reason=reapStaleJobs elapsedMs=9729",
    "1777402146891 native-output-len=5830",
    "1777402146899 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146949 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=9844 idleMs=9844",
    "1777402146963 native-fallback-enter reason=reapStaleJobs",
    "1777402146973 native-output-len=5830",
    "1777402146985 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147008 native-fallback-enter reason=reapStaleJobs elapsedMs=9844",
    "1777402147018 native-output-len=5830",
    "1777402147029 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147142 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=10037 idleMs=10037",
    "1777402147151 native-fallback-enter reason=getJobState",
    "1777402147162 native-output-len=5830",
    "1777402147177 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147210 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=10105 idleMs=10105",
    "1777402147225 native-fallback-enter reason=reapStaleJobs",
    "1777402147236 native-output-len=5830",
    "1777402147247 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147271 native-fallback-enter reason=reapStaleJobs elapsedMs=10105",
    "1777402147281 native-output-len=5830",
    "1777402147292 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147394 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=10289 idleMs=10289",
    "1777402147404 native-fallback-enter reason=reapStaleJobs",
    "1777402147414 native-output-len=5830",
    "1777402147424 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147444 native-fallback-enter reason=reapStaleJobs elapsedMs=10289",
    "1777402147454 native-output-len=5830",
    "1777402147470 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147520 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=10415 idleMs=10415",
    "1777402147530 native-fallback-enter reason=reapStaleJobs",
    "1777402147540 native-output-len=5830",
    "1777402147550 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147568 native-fallback-enter reason=reapStaleJobs elapsedMs=10415",
    "1777402147581 native-output-len=5830",
    "1777402147590 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402147633 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=10528 idleMs=10528",
    "1777402147642 native-fallback-enter reason=reapStaleJobs",
    "1777402147650 native-output-len=5830",
    "1777402147659 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Rev
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018334.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 10827,
  "idleMs": 10827,
  "debug": [
    "1777402146034 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146051 native-fallback-enter reason=reapStaleJobs elapsedMs=8899",
    "1777402146059 native-output-len=5830",
    "1777402146072 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146119 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=9014 idleMs=9014",
    "1777402146127 native-fallback-enter reason=reapStaleJobs",
    "1777402146136 native-output-len=5830",
    "1777402146145 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146165 native-fallback-enter reason=reapStaleJobs elapsedMs=9014",
    "1777402146174 native-output-len=5830",
    "1777402146183 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146229 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=9124 idleMs=9124",
    "1777402146241 native-fallback-enter reason=reapStaleJobs",
    "1777402146249 native-output-len=5830",
    "1777402146259 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146279 native-fallback-enter reason=reapStaleJobs elapsedMs=9124",
    "1777402146288 native-output-len=5830",
    "1777402146297 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146346 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=9241 idleMs=9241",
    "1777402146354 native-fallback-enter reason=reapStaleJobs",
    "1777402146367 native-output-len=5830",
    "1777402146376 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146393 native-fallback-enter reason=reapStaleJobs elapsedMs=9241",
    "1777402146405 native-output-len=5830",
    "1777402146414 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146511 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=9406 idleMs=9406",
    "1777402146519 native-fallback-enter reason=getJobState",
    "1777402146527 native-output-len=5830",
    "1777402146537 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146566 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=9461 idleMs=9461",
    "1777402146574 native-fallback-enter reason=reapStaleJobs",
    "1777402146586 native-output-len=5830",
    "1777402146595 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146612 native-fallback-enter reason=reapStaleJobs elapsedMs=9461",
    "1777402146624 native-output-len=5830",
    "1777402146634 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146718 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=9613 idleMs=9613",
    "1777402146727 native-fallback-enter reason=reapStaleJobs",
    "1777402146735 native-output-len=5830",
    "1777402146749 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146765 native-fallback-enter reason=reapStaleJobs elapsedMs=9613",
    "1777402146774 native-output-len=5830",
    "1777402146787 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146834 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=9729 idleMs=9729",
    "1777402146842 native-fallback-enter reason=reapStaleJobs",
    "1777402146852 native-output-len=5830",
    "1777402146861 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number 
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018333.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 10211,
  "idleMs": 10211,
  "debug": [
    "1777402145467 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145486 native-fallback-enter reason=reapStaleJobs elapsedMs=8338",
    "1777402145495 native-output-len=5830",
    "1777402145503 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145548 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=8443 idleMs=8443",
    "1777402145560 native-fallback-enter reason=reapStaleJobs",
    "1777402145567 native-output-len=5830",
    "1777402145575 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145594 native-fallback-enter reason=reapStaleJobs elapsedMs=8443",
    "1777402145603 native-output-len=5830",
    "1777402145612 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145659 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=8554 idleMs=8554",
    "1777402145666 native-fallback-enter reason=reapStaleJobs",
    "1777402145678 native-output-len=5830",
    "1777402145686 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145702 native-fallback-enter reason=reapStaleJobs elapsedMs=8554",
    "1777402145715 native-output-len=5830",
    "1777402145723 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145811 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=8706 idleMs=8706",
    "1777402145818 native-fallback-enter reason=getJobState",
    "1777402145826 native-output-len=5830",
    "1777402145834 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145860 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=8755 idleMs=8755",
    "1777402145867 native-fallback-enter reason=reapStaleJobs",
    "1777402145879 native-output-len=5830",
    "1777402145887 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145903 native-fallback-enter reason=reapStaleJobs elapsedMs=8755",
    "1777402145915 native-output-len=5830",
    "1777402145924 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146004 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=8899 idleMs=8899",
    "1777402146013 native-fallback-enter reason=reapStaleJobs",
    "1777402146021 native-output-len=5830",
    "1777402146034 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146051 native-fallback-enter reason=reapStaleJobs elapsedMs=8899",
    "1777402146059 native-output-len=5830",
    "1777402146072 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146119 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=9014 idleMs=9014",
    "1777402146127 native-fallback-enter reason=reapStaleJobs",
    "1777402146136 native-output-len=5830",
    "1777402146145 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146165 native-fallback-enter reason=reapStaleJobs elapsedMs=9014",
    "1777402146174 native-output-len=5830",
    "1777402146183 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402146229 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=9124 idleMs=9124",
    "1777402146241 native-fallback-enter reason=reapStaleJobs",
    "1777402146249 native-output-len=5830",
    "1777402146259 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number 
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018332.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 9545,
  "idleMs": 9545,
  "debug": [
    "1777402144897 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144912 native-fallback-enter reason=reapStaleJobs elapsedMs=7765",
    "1777402144920 native-output-len=5830",
    "1777402144928 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144984 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=7879 idleMs=7879",
    "1777402144992 native-fallback-enter reason=reapStaleJobs",
    "1777402145004 native-output-len=5830",
    "1777402145013 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145029 native-fallback-enter reason=reapStaleJobs elapsedMs=7879",
    "1777402145037 native-output-len=5830",
    "1777402145046 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145131 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=8026 idleMs=8026",
    "1777402145140 native-fallback-enter reason=getJobState",
    "1777402145148 native-output-len=5830",
    "1777402145157 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145184 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=8079 idleMs=8079",
    "1777402145193 native-fallback-enter reason=reapStaleJobs",
    "1777402145201 native-output-len=5830",
    "1777402145211 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145228 native-fallback-enter reason=reapStaleJobs elapsedMs=8079",
    "1777402145237 native-output-len=5830",
    "1777402145246 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145330 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=8225 idleMs=8225",
    "1777402145339 native-fallback-enter reason=reapStaleJobs",
    "1777402145347 native-output-len=5830",
    "1777402145360 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145376 native-fallback-enter reason=reapStaleJobs elapsedMs=8225",
    "1777402145385 native-output-len=5830",
    "1777402145398 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145443 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=8338 idleMs=8338",
    "1777402145450 native-fallback-enter reason=reapStaleJobs",
    "1777402145458 native-output-len=5830",
    "1777402145467 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145486 native-fallback-enter reason=reapStaleJobs elapsedMs=8338",
    "1777402145495 native-output-len=5830",
    "1777402145503 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145548 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=8443 idleMs=8443",
    "1777402145560 native-fallback-enter reason=reapStaleJobs",
    "1777402145567 native-output-len=5830",
    "1777402145575 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145594 native-fallback-enter reason=reapStaleJobs elapsedMs=8443",
    "1777402145603 native-output-len=5830",
    "1777402145612 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402145659 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=8554 idleMs=8554",
    "1777402145666 native-fallback-enter reason=reapStaleJobs",
    "1777402145678 native-output-len=5830",
    "1777402145686 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  :
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018331.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 8834,
  "idleMs": 8834,
  "debug": [
    "1777402144210 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144233 native-fallback-enter reason=reapStaleJobs elapsedMs=7076",
    "1777402144243 native-output-len=5830",
    "1777402144253 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144301 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=7196 idleMs=7196",
    "1777402144313 native-fallback-enter reason=reapStaleJobs",
    "1777402144321 native-output-len=5830",
    "1777402144330 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144351 native-fallback-enter reason=reapStaleJobs elapsedMs=7196",
    "1777402144359 native-output-len=5830",
    "1777402144369 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144463 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=7358 idleMs=7358",
    "1777402144472 native-fallback-enter reason=getJobState",
    "1777402144480 native-output-len=5830",
    "1777402144493 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144518 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=7413 idleMs=7413",
    "1777402144530 native-fallback-enter reason=reapStaleJobs",
    "1777402144538 native-output-len=5830",
    "1777402144548 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144568 native-fallback-enter reason=reapStaleJobs elapsedMs=7413",
    "1777402144577 native-output-len=5830",
    "1777402144586 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144669 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=7564 idleMs=7564",
    "1777402144677 native-fallback-enter reason=reapStaleJobs",
    "1777402144688 native-output-len=5830",
    "1777402144696 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144711 native-fallback-enter reason=reapStaleJobs elapsedMs=7564",
    "1777402144722 native-output-len=5830",
    "1777402144730 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144771 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=7666 idleMs=7666",
    "1777402144778 native-fallback-enter reason=reapStaleJobs",
    "1777402144789 native-output-len=5830",
    "1777402144797 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144812 native-fallback-enter reason=reapStaleJobs elapsedMs=7666",
    "1777402144819 native-output-len=5830",
    "1777402144827 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144870 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=7765 idleMs=7765",
    "1777402144877 native-fallback-enter reason=reapStaleJobs",
    "1777402144889 native-output-len=5830",
    "1777402144897 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144912 native-fallback-enter reason=reapStaleJobs elapsedMs=7765",
    "1777402144920 native-output-len=5830",
    "1777402144928 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144984 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=7879 idleMs=7879",
    "1777402144992 native-fallback-enter reason=reapStaleJobs",
    "1777402145004 native-output-len=5830",
    "1777402145013 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  :
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018330.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 8157,
  "idleMs": 8157,
  "debug": [
    "1777402143467 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143483 native-fallback-enter reason=reapStaleJobs elapsedMs=6335",
    "1777402143494 native-output-len=5830",
    "1777402143502 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143544 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=6439 idleMs=6439",
    "1777402143552 native-fallback-enter reason=reapStaleJobs",
    "1777402143564 native-output-len=5830",
    "1777402143572 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143587 native-fallback-enter reason=reapStaleJobs elapsedMs=6439",
    "1777402143599 native-output-len=5830",
    "1777402143608 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143658 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=6553 idleMs=6553",
    "1777402143666 native-fallback-enter reason=reapStaleJobs",
    "1777402143679 native-output-len=5830",
    "1777402143688 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143705 native-fallback-enter reason=reapStaleJobs elapsedMs=6553",
    "1777402143718 native-output-len=5830",
    "1777402143727 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143823 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=6718 idleMs=6718",
    "1777402143831 native-fallback-enter reason=getJobState",
    "1777402143840 native-output-len=5830",
    "1777402143849 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143887 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=6782 idleMs=6782",
    "1777402143895 native-fallback-enter reason=reapStaleJobs",
    "1777402143908 native-output-len=5830",
    "1777402143917 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143934 native-fallback-enter reason=reapStaleJobs elapsedMs=6782",
    "1777402143946 native-output-len=5830",
    "1777402143955 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144047 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=6942 idleMs=6942",
    "1777402144057 native-fallback-enter reason=reapStaleJobs",
    "1777402144066 native-output-len=5830",
    "1777402144081 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144100 native-fallback-enter reason=reapStaleJobs elapsedMs=6942",
    "1777402144110 native-output-len=5830",
    "1777402144125 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144181 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=7076 idleMs=7076",
    "1777402144190 native-fallback-enter reason=reapStaleJobs",
    "1777402144200 native-output-len=5830",
    "1777402144210 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144233 native-fallback-enter reason=reapStaleJobs elapsedMs=7076",
    "1777402144243 native-output-len=5830",
    "1777402144253 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402144301 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=7196 idleMs=7196",
    "1777402144313 native-fallback-enter reason=reapStaleJobs",
    "1777402144321 native-output-len=5830",
    "1777402144330 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  :
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018329.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-fcbcbba8",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777402137105,
  "ageMs": 7501,
  "idleMs": 7501,
  "debug": [
    "1777402142720 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402142736 native-fallback-enter reason=reapStaleJobs elapsedMs=5587",
    "1777402142748 native-output-len=5830",
    "1777402142757 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402142803 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=5698 idleMs=5698",
    "1777402142811 native-fallback-enter reason=reapStaleJobs",
    "1777402142824 native-output-len=5830",
    "1777402142835 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402142854 native-fallback-enter reason=reapStaleJobs elapsedMs=5698",
    "1777402142868 native-output-len=5830",
    "1777402142880 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402142940 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=5835 idleMs=5835",
    "1777402142951 native-fallback-enter reason=reapStaleJobs",
    "1777402142961 native-output-len=5830",
    "1777402142975 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402142995 native-fallback-enter reason=reapStaleJobs elapsedMs=5835",
    "1777402143005 native-output-len=5830",
    "1777402143019 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143120 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=6015 idleMs=6015",
    "1777402143132 native-fallback-enter reason=getJobState",
    "1777402143141 native-output-len=5830",
    "1777402143150 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143179 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=6074 idleMs=6074",
    "1777402143187 native-fallback-enter reason=reapStaleJobs",
    "1777402143196 native-output-len=5830",
    "1777402143208 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143225 native-fallback-enter reason=reapStaleJobs elapsedMs=6074",
    "1777402143234 native-output-len=5830",
    "1777402143247 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143329 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=6224 idleMs=6224",
    "1777402143341 native-fallback-enter reason=reapStaleJobs",
    "1777402143350 native-output-len=5830",
    "1777402143359 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143379 native-fallback-enter reason=reapStaleJobs elapsedMs=6224",
    "1777402143388 native-output-len=5830",
    "1777402143397 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143440 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=6335 idleMs=6335",
    "1777402143448 native-fallback-enter reason=reapStaleJobs",
    "1777402143459 native-output-len=5830",
    "1777402143467 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143483 native-fallback-enter reason=reapStaleJobs elapsedMs=6335",
    "1777402143494 native-output-len=5830",
    "1777402143502 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"",
    "1777402143544 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=6439 idleMs=6439",
    "1777402143552 native-fallback-enter reason=reapStaleJobs",
    "1777402143564 native-output-len=5830",
    "1777402143572 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  :
error= None
```
