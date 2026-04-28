# pt cmd after manual main reload

Fecha: Tue Apr 28 13:13:40 -05 2026

## deployed markers
```
1898:    function forceCompleteFromNativeTerminal(job, reason) {
1907:        debugCtx.debug.push("native-fallback-enter reason=" + reason);
1998:        execLog("REAP STALE JOBS tick");
2015:                    var completedFromNative = forceCompleteFromNativeTerminal(job, "reapStaleJobs elapsedMs=" + elapsedMs);
2545:            execLog("GET JOB STATE id=" + id + " invoking reapStaleJobs");
2550:            execLog("GET JOB STATE id=" + id + " invoking reapStaleJobs");
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
return JSON.stringify({ prompt: safe(\"getPrompt\"), mode: safe(\"getMode\"), tail: safe(\"getOutput\").slice(-500) });
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
return JSON.stringify({ prompt: safe(\"getPrompt\"), mode: safe(\"getMode\"), tail: safe(\"getOutput\").slice(-500) });
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 641,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nfunction safe(name){ try { if(t && typeof t[name] === \"function\") return String(t[name]()); return \"\"; } catch(e) { return \"\"; } }\nfunction pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }\nfor (var i=0;i<30;i++) {\n  var out = safe(\"getOutput\");\n  if (out.indexOf(\"--More--\") < 0) break;\n  try { t.enterChar(32,0); } catch(e) {}\n  pause(150);\n}\ntry { t.enterChar(13,0); } c",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"tail\":\"       : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000017953",
      "seq": 17953,
      "type": "omni.evaluate.raw",
      "startedAt": 1777400021631,
      "completedAt": 1777400021946,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"tail\":\"       : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777400021539,
        "resultSeenAt": 1777400021953,
        "receivedAt": 1777400021953,
        "waitMs": 414,
        "completedAtMs": 1777400021946
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.5s
```

## doctor
```
$ bun run --cwd apps/pt-cli start doctor --json
$ bun run src/index.ts doctor --json

═══ Diagnóstico del sistema ═══

  ✓ [ℹ] Directorio pt-dev accesible: /Users/andresgaibor/pt-dev
  ✓ [ℹ] Directorio de logs accesible: /Users/andresgaibor/pt-dev/logs
  ✓ [ℹ] Directorio de historial accesible: /Users/andresgaibor/pt-dev/history
  ✓ [ℹ] Directorio de resultados accesible: /Users/andresgaibor/pt-dev/results
  ✓ [ℹ] Archivos de runtime presentes: main.js, runtime.js
  ✗ [🔴] Queue: 1 queued / 0 in-flight / 22 dead-letter
  ✓ [ℹ] Heartbeat encontrado
  ✓ [ℹ] Heartbeat estado: ok (69ms)
  ✗ [⚠] Bridge ready: no
  ✗ [⚠] Topología no materializada

Resumen: 7 OK, 2 warning, 1 critical
→ Acción requerida: hay problemas críticos.

⏱ pt doctor · 0.0s
```

## pt cmd
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000017955","seq":17955,"type":"terminal.plan.run","startedAt":1777400023245,"completedAt":1777400023313,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","job":{"id":"cmd-0a9e23e5","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}},"timings":{"sentAt":1777400023193,"resultSeenAt":1777400023353,"receivedAt":1777400023353,"waitMs":160,"completedAtMs":1777400023313}}
[terminal-plan-run-debug] submitValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","job":{"id":"cmd-0a9e23e5","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}
[terminal-plan-run-debug] isDeferredValue=true
[terminal-plan-run-debug] ENTER deferred polling ticket=cmd-0a9e23e5
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=0
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":197,"idleMs":197,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=472
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":693,"idleMs":693,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=938
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":1093,"idleMs":1093,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=1345
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":1490,"idleMs":1490,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=1752
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":1893,"idleMs":1893,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=2159
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":2293,"idleMs":2293,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=2566
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":2698,"idleMs":2698,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=2974
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":3218,"idleMs":3218,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=3485
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":3825,"idleMs":3825,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=4124
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":4379,"idleMs":4379,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=4640
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":4805,"idleMs":4805,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=5048
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":5208,"idleMs":5208,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=5456
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":5610,"idleMs":5610,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=5867
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":6017,"idleMs":6017,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=6272
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":6413,"idleMs":6413,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=6679
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":6916,"idleMs":6916,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=7185
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":7418,"idleMs":7418,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=7682
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":7921,"idleMs":7921,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=8183
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":8422,"idleMs":8422,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=8683
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":8925,"idleMs":8925,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=9184
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":9426,"idleMs":9426,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=9684
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":9929,"idleMs":9929,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=10184
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":10430,"idleMs":10430,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=10684
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":10864,"idleMs":10864,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=11122
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":11330,"idleMs":11330,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=11585
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":11832,"idleMs":11832,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=12084
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":12329,"idleMs":12329,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=12584
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":12831,"idleMs":12831,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=13085
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":13333,"idleMs":13333,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=13589
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":13830,"idleMs":13830,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=14085
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":14331,"idleMs":14331,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=14585
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":14831,"idleMs":14831,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=15085
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":15331,"idleMs":15331,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=15583
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":15830,"idleMs":15830,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=16085
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":16332,"idleMs":16332,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=16584
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":16832,"idleMs":16832,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=17085
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":17331,"idleMs":17331,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=17585
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":17832,"idleMs":17832,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=18084
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":18332,"idleMs":18332,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=18584
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":18832,"idleMs":18832,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=19087
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":19332,"idleMs":19332,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=19584
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":19833,"idleMs":19833,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=20084
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":20332,"idleMs":20332,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=20585
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":20833,"idleMs":20833,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=21132
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":21332,"idleMs":21332,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=21595
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":21834,"idleMs":21834,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=22135
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":22333,"idleMs":22333,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=22586
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":22834,"idleMs":22834,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=23137
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":23333,"idleMs":23333,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=23600
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":23834,"idleMs":23834,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=24086
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":24334,"idleMs":24334,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=24587
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":24834,"idleMs":24834,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=25137
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":25338,"idleMs":25338,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=25594
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":25833,"idleMs":25833,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=26084
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":26337,"idleMs":26337,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=26635
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":26833,"idleMs":26833,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=27084
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":27335,"idleMs":27335,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=27635
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":27833,"idleMs":27833,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=28085
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":28335,"idleMs":28335,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=28587
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-0a9e23e5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400023278,"ageMs":28833,"idleMs":28833,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-0a9e23e5 elapsedMs=29136
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

## latest result summaries
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000018016.json -----
{'id': 'cmd_000000018016', 'seq': 18016, 'type': '__pollDeferred', 'status': 'failed', 'ok': False}
value= {'done': True, 'ok': False, 'status': 1, 'result': None, 'error': 'Job timed out while waiting for terminal command completion', 'code': 'JOB_TIMEOUT', 'errorCode': 'JOB_TIMEOUT', 'raw': '', 'output': '', 'source': 'terminal', 'session': {'mode': 'unknown', 'prompt': '', 'paging': False, 'awaitingConfirm': False}}
error= {'code': 'JOB_TIMEOUT', 'message': 'Job timed out while waiting for terminal command completion', 'phase': 'execution'}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018015.json -----
{'id': 'cmd_000000018015', 'seq': 18015, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 28833, 'idleMs': 28833, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018014.json -----
{'id': 'cmd_000000018014', 'seq': 18014, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 28335, 'idleMs': 28335, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018013.json -----
{'id': 'cmd_000000018013', 'seq': 18013, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 27833, 'idleMs': 27833, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018012.json -----
{'id': 'cmd_000000018012', 'seq': 18012, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 27335, 'idleMs': 27335, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018011.json -----
{'id': 'cmd_000000018011', 'seq': 18011, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 26833, 'idleMs': 26833, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018010.json -----
{'id': 'cmd_000000018010', 'seq': 18010, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 26337, 'idleMs': 26337, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018009.json -----
{'id': 'cmd_000000018009', 'seq': 18009, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 25833, 'idleMs': 25833, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018008.json -----
{'id': 'cmd_000000018008', 'seq': 18008, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 25338, 'idleMs': 25338, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018007.json -----
{'id': 'cmd_000000018007', 'seq': 18007, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 24834, 'idleMs': 24834, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018006.json -----
{'id': 'cmd_000000018006', 'seq': 18006, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 24334, 'idleMs': 24334, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018005.json -----
{'id': 'cmd_000000018005', 'seq': 18005, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 23834, 'idleMs': 23834, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018004.json -----
{'id': 'cmd_000000018004', 'seq': 18004, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 23333, 'idleMs': 23333, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018003.json -----
{'id': 'cmd_000000018003', 'seq': 18003, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 22834, 'idleMs': 22834, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018002.json -----
{'id': 'cmd_000000018002', 'seq': 18002, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 22333, 'idleMs': 22333, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018001.json -----
{'id': 'cmd_000000018001', 'seq': 18001, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 21834, 'idleMs': 21834, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018000.json -----
{'id': 'cmd_000000018000', 'seq': 18000, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 21332, 'idleMs': 21332, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017999.json -----
{'id': 'cmd_000000017999', 'seq': 17999, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 20833, 'idleMs': 20833, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017998.json -----
{'id': 'cmd_000000017998', 'seq': 17998, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 20332, 'idleMs': 20332, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017997.json -----
{'id': 'cmd_000000017997', 'seq': 17997, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 19833, 'idleMs': 19833, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017996.json -----
{'id': 'cmd_000000017996', 'seq': 17996, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 19332, 'idleMs': 19332, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017995.json -----
{'id': 'cmd_000000017995', 'seq': 17995, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 18832, 'idleMs': 18832, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017994.json -----
{'id': 'cmd_000000017994', 'seq': 17994, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 18332, 'idleMs': 18332, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017993.json -----
{'id': 'cmd_000000017993', 'seq': 17993, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 17832, 'idleMs': 17832, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017992.json -----
{'id': 'cmd_000000017992', 'seq': 17992, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-0a9e23e5', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777400023278, 'ageMs': 17331, 'idleMs': 17331, 'debug': [], 'stepResults': []}
error= None
```

## logs relevant
```
{"seq":731,"timestamp":"2026-04-28T18:13:58.038Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017987-__pollDeferred.json\"]","level":"debug"}
{"seq":732,"timestamp":"2026-04-28T18:13:58.043Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017987-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":733,"timestamp":"2026-04-28T18:13:58.047Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017987-__pollDeferred.json","level":"debug"}
{"seq":735,"timestamp":"2026-04-28T18:13:58.055Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017987 type=__pollDeferred","level":"info"}
{"seq":747,"timestamp":"2026-04-28T18:13:58.538Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017988-__pollDeferred.json\"]","level":"debug"}
{"seq":748,"timestamp":"2026-04-28T18:13:58.542Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017988-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":749,"timestamp":"2026-04-28T18:13:58.546Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017988-__pollDeferred.json","level":"debug"}
{"seq":751,"timestamp":"2026-04-28T18:13:58.555Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017988 type=__pollDeferred","level":"info"}
{"seq":763,"timestamp":"2026-04-28T18:13:59.037Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017989-__pollDeferred.json\"]","level":"debug"}
{"seq":764,"timestamp":"2026-04-28T18:13:59.041Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017989-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":765,"timestamp":"2026-04-28T18:13:59.045Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017989-__pollDeferred.json","level":"debug"}
{"seq":767,"timestamp":"2026-04-28T18:13:59.053Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017989 type=__pollDeferred","level":"info"}
{"seq":779,"timestamp":"2026-04-28T18:13:59.539Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017990-__pollDeferred.json\"]","level":"debug"}
{"seq":780,"timestamp":"2026-04-28T18:13:59.543Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017990-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":781,"timestamp":"2026-04-28T18:13:59.547Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017990-__pollDeferred.json","level":"debug"}
{"seq":783,"timestamp":"2026-04-28T18:13:59.555Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017990 type=__pollDeferred","level":"info"}
{"seq":795,"timestamp":"2026-04-28T18:14:00.039Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017991-__pollDeferred.json\"]","level":"debug"}
{"seq":796,"timestamp":"2026-04-28T18:14:00.043Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017991-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":797,"timestamp":"2026-04-28T18:14:00.046Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017991-__pollDeferred.json","level":"debug"}
{"seq":799,"timestamp":"2026-04-28T18:14:00.055Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017991 type=__pollDeferred","level":"info"}
{"seq":811,"timestamp":"2026-04-28T18:14:00.536Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017992-__pollDeferred.json\"]","level":"debug"}
{"seq":812,"timestamp":"2026-04-28T18:14:00.542Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017992-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":813,"timestamp":"2026-04-28T18:14:00.546Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017992-__pollDeferred.json","level":"debug"}
{"seq":815,"timestamp":"2026-04-28T18:14:00.554Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017992 type=__pollDeferred","level":"info"}
{"seq":827,"timestamp":"2026-04-28T18:14:01.037Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017993-__pollDeferred.json\"]","level":"debug"}
{"seq":828,"timestamp":"2026-04-28T18:14:01.043Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017993-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":829,"timestamp":"2026-04-28T18:14:01.046Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017993-__pollDeferred.json","level":"debug"}
{"seq":831,"timestamp":"2026-04-28T18:14:01.055Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017993 type=__pollDeferred","level":"info"}
{"seq":843,"timestamp":"2026-04-28T18:14:01.538Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017994-__pollDeferred.json\"]","level":"debug"}
{"seq":844,"timestamp":"2026-04-28T18:14:01.542Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017994-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":845,"timestamp":"2026-04-28T18:14:01.546Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017994-__pollDeferred.json","level":"debug"}
{"seq":847,"timestamp":"2026-04-28T18:14:01.554Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017994 type=__pollDeferred","level":"info"}
{"seq":859,"timestamp":"2026-04-28T18:14:02.038Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017995-__pollDeferred.json\"]","level":"debug"}
{"seq":860,"timestamp":"2026-04-28T18:14:02.042Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017995-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":861,"timestamp":"2026-04-28T18:14:02.046Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017995-__pollDeferred.json","level":"debug"}
{"seq":863,"timestamp":"2026-04-28T18:14:02.055Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017995 type=__pollDeferred","level":"info"}
{"seq":875,"timestamp":"2026-04-28T18:14:02.537Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017996-__pollDeferred.json\"]","level":"debug"}
{"seq":876,"timestamp":"2026-04-28T18:14:02.540Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017996-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":877,"timestamp":"2026-04-28T18:14:02.546Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017996-__pollDeferred.json","level":"debug"}
{"seq":879,"timestamp":"2026-04-28T18:14:02.554Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017996 type=__pollDeferred","level":"info"}
{"seq":891,"timestamp":"2026-04-28T18:14:03.039Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017997-__pollDeferred.json\"]","level":"debug"}
{"seq":892,"timestamp":"2026-04-28T18:14:03.043Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017997-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":893,"timestamp":"2026-04-28T18:14:03.047Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017997-__pollDeferred.json","level":"debug"}
{"seq":895,"timestamp":"2026-04-28T18:14:03.055Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017997 type=__pollDeferred","level":"info"}
{"seq":907,"timestamp":"2026-04-28T18:14:03.539Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017998-__pollDeferred.json\"]","level":"debug"}
{"seq":908,"timestamp":"2026-04-28T18:14:03.543Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017998-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":909,"timestamp":"2026-04-28T18:14:03.547Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017998-__pollDeferred.json","level":"debug"}
{"seq":911,"timestamp":"2026-04-28T18:14:03.555Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017998 type=__pollDeferred","level":"info"}
{"seq":923,"timestamp":"2026-04-28T18:14:04.037Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017999-__pollDeferred.json\"]","level":"debug"}
{"seq":924,"timestamp":"2026-04-28T18:14:04.042Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017999-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":925,"timestamp":"2026-04-28T18:14:04.047Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017999-__pollDeferred.json","level":"debug"}
{"seq":927,"timestamp":"2026-04-28T18:14:04.055Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017999 type=__pollDeferred","level":"info"}
{"seq":939,"timestamp":"2026-04-28T18:14:04.538Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018000-__pollDeferred.json\"]","level":"debug"}
{"seq":940,"timestamp":"2026-04-28T18:14:04.543Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018000-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":941,"timestamp":"2026-04-28T18:14:04.547Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018000-__pollDeferred.json","level":"debug"}
{"seq":943,"timestamp":"2026-04-28T18:14:04.555Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018000 type=__pollDeferred","level":"info"}
{"seq":955,"timestamp":"2026-04-28T18:14:05.038Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018001-__pollDeferred.json\"]","level":"debug"}
{"seq":956,"timestamp":"2026-04-28T18:14:05.042Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018001-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":957,"timestamp":"2026-04-28T18:14:05.047Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018001-__pollDeferred.json","level":"debug"}
{"seq":959,"timestamp":"2026-04-28T18:14:05.055Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018001 type=__pollDeferred","level":"info"}
{"seq":971,"timestamp":"2026-04-28T18:14:05.539Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018002-__pollDeferred.json\"]","level":"debug"}
{"seq":972,"timestamp":"2026-04-28T18:14:05.543Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018002-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":973,"timestamp":"2026-04-28T18:14:05.547Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018002-__pollDeferred.json","level":"debug"}
{"seq":975,"timestamp":"2026-04-28T18:14:05.555Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018002 type=__pollDeferred","level":"info"}
{"seq":987,"timestamp":"2026-04-28T18:14:06.037Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018003-__pollDeferred.json\"]","level":"debug"}
{"seq":988,"timestamp":"2026-04-28T18:14:06.041Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018003-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":989,"timestamp":"2026-04-28T18:14:06.047Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018003-__pollDeferred.json","level":"debug"}
{"seq":991,"timestamp":"2026-04-28T18:14:06.055Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018003 type=__pollDeferred","level":"info"}
{"seq":1003,"timestamp":"2026-04-28T18:14:06.538Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018004-__pollDeferred.json\"]","level":"debug"}
{"seq":1004,"timestamp":"2026-04-28T18:14:06.543Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018004-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1005,"timestamp":"2026-04-28T18:14:06.547Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018004-__pollDeferred.json","level":"debug"}
{"seq":1007,"timestamp":"2026-04-28T18:14:06.555Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018004 type=__pollDeferred","level":"info"}
{"seq":1019,"timestamp":"2026-04-28T18:14:07.038Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018005-__pollDeferred.json\"]","level":"debug"}
{"seq":1020,"timestamp":"2026-04-28T18:14:07.042Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018005-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1021,"timestamp":"2026-04-28T18:14:07.048Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018005-__pollDeferred.json","level":"debug"}
{"seq":1023,"timestamp":"2026-04-28T18:14:07.056Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018005 type=__pollDeferred","level":"info"}
{"seq":1035,"timestamp":"2026-04-28T18:14:07.540Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018006-__pollDeferred.json\"]","level":"debug"}
{"seq":1036,"timestamp":"2026-04-28T18:14:07.544Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018006-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1037,"timestamp":"2026-04-28T18:14:07.548Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018006-__pollDeferred.json","level":"debug"}
{"seq":1039,"timestamp":"2026-04-28T18:14:07.556Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018006 type=__pollDeferred","level":"info"}
{"seq":1051,"timestamp":"2026-04-28T18:14:08.040Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018007-__pollDeferred.json\"]","level":"debug"}
{"seq":1052,"timestamp":"2026-04-28T18:14:08.044Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018007-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1053,"timestamp":"2026-04-28T18:14:08.048Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018007-__pollDeferred.json","level":"debug"}
{"seq":1055,"timestamp":"2026-04-28T18:14:08.056Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018007 type=__pollDeferred","level":"info"}
{"seq":1067,"timestamp":"2026-04-28T18:14:08.538Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018008-__pollDeferred.json\"]","level":"debug"}
{"seq":1068,"timestamp":"2026-04-28T18:14:08.543Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018008-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1069,"timestamp":"2026-04-28T18:14:08.547Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018008-__pollDeferred.json","level":"debug"}
{"seq":1071,"timestamp":"2026-04-28T18:14:08.555Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018008 type=__pollDeferred","level":"info"}
{"seq":1083,"timestamp":"2026-04-28T18:14:09.038Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018009-__pollDeferred.json\"]","level":"debug"}
{"seq":1084,"timestamp":"2026-04-28T18:14:09.042Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018009-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1085,"timestamp":"2026-04-28T18:14:09.046Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018009-__pollDeferred.json","level":"debug"}
{"seq":1087,"timestamp":"2026-04-28T18:14:09.055Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018009 type=__pollDeferred","level":"info"}
{"seq":1099,"timestamp":"2026-04-28T18:14:09.539Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018010-__pollDeferred.json\"]","level":"debug"}
{"seq":1100,"timestamp":"2026-04-28T18:14:09.543Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018010-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1101,"timestamp":"2026-04-28T18:14:09.547Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018010-__pollDeferred.json","level":"debug"}
{"seq":1103,"timestamp":"2026-04-28T18:14:09.556Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018010 type=__pollDeferred","level":"info"}
{"seq":1115,"timestamp":"2026-04-28T18:14:10.038Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018011-__pollDeferred.json\"]","level":"debug"}
{"seq":1116,"timestamp":"2026-04-28T18:14:10.042Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018011-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1117,"timestamp":"2026-04-28T18:14:10.046Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018011-__pollDeferred.json","level":"debug"}
{"seq":1119,"timestamp":"2026-04-28T18:14:10.055Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018011 type=__pollDeferred","level":"info"}
{"seq":1131,"timestamp":"2026-04-28T18:14:10.539Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018012-__pollDeferred.json\"]","level":"debug"}
{"seq":1132,"timestamp":"2026-04-28T18:14:10.543Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018012-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1133,"timestamp":"2026-04-28T18:14:10.547Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018012-__pollDeferred.json","level":"debug"}
{"seq":1135,"timestamp":"2026-04-28T18:14:10.557Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018012 type=__pollDeferred","level":"info"}
{"seq":1147,"timestamp":"2026-04-28T18:14:11.039Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018013-__pollDeferred.json\"]","level":"debug"}
{"seq":1148,"timestamp":"2026-04-28T18:14:11.043Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018013-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1149,"timestamp":"2026-04-28T18:14:11.047Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018013-__pollDeferred.json","level":"debug"}
{"seq":1151,"timestamp":"2026-04-28T18:14:11.055Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018013 type=__pollDeferred","level":"info"}
{"seq":1163,"timestamp":"2026-04-28T18:14:11.539Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018014-__pollDeferred.json\"]","level":"debug"}
{"seq":1164,"timestamp":"2026-04-28T18:14:11.543Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018014-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1165,"timestamp":"2026-04-28T18:14:11.547Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018014-__pollDeferred.json","level":"debug"}
{"seq":1167,"timestamp":"2026-04-28T18:14:11.557Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018014 type=__pollDeferred","level":"info"}
{"seq":1179,"timestamp":"2026-04-28T18:14:12.038Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000018015-__pollDeferred.json\"]","level":"debug"}
{"seq":1180,"timestamp":"2026-04-28T18:14:12.042Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000018015-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1181,"timestamp":"2026-04-28T18:14:12.045Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000018015-__pollDeferred.json","level":"debug"}
{"seq":1183,"timestamp":"2026-04-28T18:14:12.054Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018015 type=__pollDeferred","level":"info"}
{"seq":1195,"timestamp":"2026-04-28T18:14:12.532Z","scope":"queue","message":"[queue-claim] candidatos: 1 [\"000000018016-__pollDeferred.json\"]","level":"debug"}
{"seq":1196,"timestamp":"2026-04-28T18:14:12.536Z","scope":"queue","message":"[queue-claim] claim nuevo: 000000018016-__pollDeferred.json modo=atomic-move","level":"debug"}
{"seq":1197,"timestamp":"2026-04-28T18:14:12.540Z","scope":"queue","message":"[queue-claim] parseado OK: 000000018016-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":1198,"timestamp":"2026-04-28T18:14:12.544Z","scope":"kernel","message":">>> DISPATCH: cmd_000000018016 type=__pollDeferred","level":"info"}
```
