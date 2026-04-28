# pt cmd fix getActiveJobs safe

Fecha: Tue Apr 28 13:37:01 -05 2026

## quarantine stale queue
```
/Users/andresgaibor/pt-dev/quarantine-20260428-133701
```

## grep source
```
1414:    getActiveJobs: function () {
1418:          tickNativeFallback(job, "getActiveJobs");
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

## grep deployed
```
2620:        getActiveJobs: function () {
2624:                    tickNativeFallback(job, "getActiveJobs");
3062:        getActiveJobs: function () {
```

## doctor after clean
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
  ✓ [ℹ] Heartbeat estado: ok (4423ms)
  ✗ [⚠] Bridge ready: no
  ✗ [⚠] Topología no materializada

Resumen: 7 OK, 2 warning, 1 critical
→ Acción requerida: hay problemas críticos.

⏱ pt doctor · 0.0s
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
      "id": "cmd_000000018149",
      "seq": 18149,
      "type": "omni.evaluate.raw",
      "startedAt": 1777401427980,
      "completedAt": 1777401428462,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"       : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777401427602,
        "resultSeenAt": 1777401428507,
        "receivedAt": 1777401428507,
        "waitMs": 905,
        "completedAtMs": 1777401428462
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 1.0s
```

## pt cmd
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000018151","seq":18151,"type":"terminal.plan.run","startedAt":1777401429374,"completedAt":1777401429463,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-34ef7394","job":{"id":"cmd-34ef7394","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}},"timings":{"sentAt":1777401429352,"resultSeenAt":1777401429513,"receivedAt":1777401429513,"waitMs":161,"completedAtMs":1777401429463}}
[terminal-plan-run-debug] submitValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","job":{"id":"cmd-34ef7394","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}
[terminal-plan-run-debug] isDeferredValue=true
[terminal-plan-run-debug] ENTER deferred polling ticket=cmd-34ef7394
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=0
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":187,"idleMs":187,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=407
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":678,"idleMs":678,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=961
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":1212,"idleMs":1212,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=1481
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":1699,"idleMs":1699,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=1925
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":2200,"idleMs":2200,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=2426
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":2700,"idleMs":2700,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=2926
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":3202,"idleMs":3202,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=3426
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":3717,"idleMs":3717,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=3978
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":4203,"idleMs":4203,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=4427
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":4704,"idleMs":4704,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=4928
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":5207,"idleMs":5207,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=5488
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":5815,"idleMs":5815,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=6085
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":6288,"idleMs":6288,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=6544
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":6811,"idleMs":6811,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=7085
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":7315,"idleMs":7315,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=7551
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":7816,"idleMs":7816,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=8083
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":8318,"idleMs":8318,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=8548
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":8839,"idleMs":8839,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=9081
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":9325,"idleMs":9325,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=9551
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":9788,"idleMs":9788,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=10017
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":10243,"idleMs":10243,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=10484
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":10722,"idleMs":10722,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=11035
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":11403,"idleMs":11403,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=11691
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":11975,"idleMs":11975,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=12245
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":12518,"idleMs":12518,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=12783
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":13017,"idleMs":13017,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=13247
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":13530,"idleMs":13530,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=13785
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":14018,"idleMs":14018,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=14252
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":14521,"idleMs":14521,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=14787
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":15021,"idleMs":15021,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=15254
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":15527,"idleMs":15527,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=15785
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":16022,"idleMs":16022,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=16250
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":16520,"idleMs":16520,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=16780
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":17028,"idleMs":17028,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=17284
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":17522,"idleMs":17522,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=17751
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":18020,"idleMs":18020,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=18282
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":18521,"idleMs":18521,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=18747
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":19019,"idleMs":19019,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=19280
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":19529,"idleMs":19529,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=19785
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":20018,"idleMs":20018,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=20252
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":20520,"idleMs":20520,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=20787
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":21020,"idleMs":21020,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=21251
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":21521,"idleMs":21521,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=21785
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":22031,"idleMs":22031,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=22253
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":22526,"idleMs":22526,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=22787
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":23021,"idleMs":23021,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=23253
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":23534,"idleMs":23534,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=23781
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":24030,"idleMs":24030,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=24289
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":24521,"idleMs":24521,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=24756
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":25069,"idleMs":25069,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=25313
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":25536,"idleMs":25536,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=25778
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":26046,"idleMs":26046,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=26289
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":26511,"idleMs":26511,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=26751
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":26996,"idleMs":26996,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=27221
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":27520,"idleMs":27520,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=27772
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":28028,"idleMs":28028,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=28287
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-34ef7394","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777401429409,"ageMs":28526,"idleMs":28526,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-34ef7394 elapsedMs=28751
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
⏱ pt cmd · 29.4s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## latest result summaries
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000018209.json -----
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018208.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 28526,
  "idleMs": 28526,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018207.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 28028,
  "idleMs": 28028,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018206.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 27520,
  "idleMs": 27520,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018205.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 26996,
  "idleMs": 26996,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018204.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 26511,
  "idleMs": 26511,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018203.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 26046,
  "idleMs": 26046,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018202.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 25536,
  "idleMs": 25536,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018201.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 25069,
  "idleMs": 25069,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018200.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 24521,
  "idleMs": 24521,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018199.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 24030,
  "idleMs": 24030,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018198.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 23534,
  "idleMs": 23534,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018197.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 23021,
  "idleMs": 23021,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018196.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 22526,
  "idleMs": 22526,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018195.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 22031,
  "idleMs": 22031,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018194.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 21521,
  "idleMs": 21521,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018193.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 21020,
  "idleMs": 21020,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018192.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 20520,
  "idleMs": 20520,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018191.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 20018,
  "idleMs": 20018,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018190.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 19529,
  "idleMs": 19529,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018189.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 19019,
  "idleMs": 19019,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018188.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 18521,
  "idleMs": 18521,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018187.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 18020,
  "idleMs": 18020,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018186.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 17522,
  "idleMs": 17522,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018185.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 17028,
  "idleMs": 17028,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018184.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 16520,
  "idleMs": 16520,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018183.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 16022,
  "idleMs": 16022,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018182.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 15527,
  "idleMs": 15527,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018181.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 15021,
  "idleMs": 15021,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018180.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 14521,
  "idleMs": 14521,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018179.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 14018,
  "idleMs": 14018,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018178.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 13530,
  "idleMs": 13530,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018177.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 13017,
  "idleMs": 13017,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018176.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 12518,
  "idleMs": 12518,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018175.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 11975,
  "idleMs": 11975,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018174.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 11403,
  "idleMs": 11403,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018173.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 10722,
  "idleMs": 10722,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018172.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 10243,
  "idleMs": 10243,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018171.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 9788,
  "idleMs": 9788,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018170.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 9325,
  "idleMs": 9325,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018169.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 8839,
  "idleMs": 8839,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018168.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 8318,
  "idleMs": 8318,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018167.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 7816,
  "idleMs": 7816,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018166.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 7315,
  "idleMs": 7315,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018165.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-34ef7394",
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
  "updatedAt": 1777401429409,
  "ageMs": 6811,
  "idleMs": 6811,
  "debug": [],
  "stepResults": []
}
error= None
```
