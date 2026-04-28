# pt cmd reap native fallback fix

Fecha: Tue Apr 28 13:02:08 -05 2026

## tests
```
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
1898:    function forceCompleteFromNativeTerminal(job, reason) {
1907:        debugCtx.debug.push("native-fallback-enter reason=" + reason);
1936:            execLog("JOB NATIVE INCOMPLETE id=" +
2014:                    var completedFromNative = forceCompleteFromNativeTerminal(job, "reapStaleJobs elapsedMs=" + elapsedMs);
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
      "id": "cmd_000000017818",
      "seq": 17818,
      "type": "omni.evaluate.raw",
      "startedAt": 1777399335546,
      "completedAt": 1777399335881,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"tail\":\"       : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777399335477,
        "resultSeenAt": 1777399335884,
        "receivedAt": 1777399335884,
        "waitMs": 407,
        "completedAtMs": 1777399335881
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

## pt cmd
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000017820","seq":17820,"type":"terminal.plan.run","startedAt":1777399338001,"completedAt":1777399338262,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","job":{"id":"cmd-b8a2b3ea","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}},"timings":{"sentAt":1777399337905,"resultSeenAt":1777399338297,"receivedAt":1777399338297,"waitMs":392,"completedAtMs":1777399338262}}
[terminal-plan-run-debug] submitValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","job":{"id":"cmd-b8a2b3ea","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}
[terminal-plan-run-debug] isDeferredValue=true
[terminal-plan-run-debug] ENTER deferred polling ticket=cmd-b8a2b3ea
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=0
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":412,"idleMs":412,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=521
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":914,"idleMs":914,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=1041
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":1406,"idleMs":1406,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=1506
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":1806,"idleMs":1806,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=1914
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":2201,"idleMs":2201,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=2282
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":2604,"idleMs":2604,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=2690
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":3011,"idleMs":3011,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=3101
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":3422,"idleMs":3422,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=3517
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":4107,"idleMs":4107,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=4247
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":4601,"idleMs":4601,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=4731
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":5153,"idleMs":5153,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=5266
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":5617,"idleMs":5617,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=5735
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":6107,"idleMs":6107,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=6202
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":6509,"idleMs":6509,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=6609
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":6926,"idleMs":6926,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=7019
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":7407,"idleMs":7407,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=7532
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":7935,"idleMs":7935,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=8146
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":8521,"idleMs":8521,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=8613
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":8906,"idleMs":8906,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=9023
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":9405,"idleMs":9405,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=9486
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":9802,"idleMs":9802,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=9895
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":10212,"idleMs":10212,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=10304
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":10632,"idleMs":10632,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=10739
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":11212,"idleMs":11212,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=11401
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":11965,"idleMs":11965,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=12098
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":12439,"idleMs":12439,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=12530
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":12905,"idleMs":12905,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=12993
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":13306,"idleMs":13306,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=13400
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":13706,"idleMs":13706,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=13807
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":14104,"idleMs":14104,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=14214
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":14506,"idleMs":14506,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=14620
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":15012,"idleMs":15012,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=15140
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":15509,"idleMs":15509,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=15604
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":15908,"idleMs":15908,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=16011
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":16308,"idleMs":16308,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=16418
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":16809,"idleMs":16809,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=16942
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":17305,"idleMs":17305,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=17408
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":17705,"idleMs":17705,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=17815
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":18102,"idleMs":18102,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=18222
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":18609,"idleMs":18609,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=18742
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":19108,"idleMs":19108,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=19209
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":19504,"idleMs":19504,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=19619
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":20010,"idleMs":20010,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=20139
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":20504,"idleMs":20504,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=20606
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":20904,"idleMs":20904,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=21016
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":21408,"idleMs":21408,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=21536
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":21905,"idleMs":21905,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=22002
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":22307,"idleMs":22307,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=22408
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":22705,"idleMs":22705,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=22817
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":23209,"idleMs":23209,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=23344
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":23704,"idleMs":23704,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=23809
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":24106,"idleMs":24106,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=24219
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":24608,"idleMs":24608,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=24738
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":25108,"idleMs":25108,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=25206
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":25507,"idleMs":25507,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=25615
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":25905,"idleMs":25905,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=26023
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":26410,"idleMs":26410,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=26544
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":26910,"idleMs":26910,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=27009
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":27305,"idleMs":27305,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=27419
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":27809,"idleMs":27809,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=27939
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":28306,"idleMs":28306,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=28408
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-b8a2b3ea","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399338063,"ageMs":28708,"idleMs":28708,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-b8a2b3ea elapsedMs=28817
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
⏱ pt cmd · 29.7s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## latest result summaries
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000017883.json -----
{'id': 'cmd_000000017883', 'seq': 17883, 'type': '__pollDeferred', 'status': 'failed', 'ok': False}
value= {'done': True, 'ok': False, 'status': 1, 'result': None, 'error': 'Job timed out while waiting for terminal command completion', 'code': 'JOB_TIMEOUT', 'errorCode': 'JOB_TIMEOUT', 'raw': '', 'output': '', 'source': 'terminal', 'session': {'mode': 'unknown', 'prompt': '', 'paging': False, 'awaitingConfirm': False}}
error= {'code': 'JOB_TIMEOUT', 'message': 'Job timed out while waiting for terminal command completion', 'phase': 'execution'}

----- /Users/andresgaibor/pt-dev/results/cmd_000000017882.json -----
{'id': 'cmd_000000017882', 'seq': 17882, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 28708, 'idleMs': 28708, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017881.json -----
{'id': 'cmd_000000017881', 'seq': 17881, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 28306, 'idleMs': 28306, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017880.json -----
{'id': 'cmd_000000017880', 'seq': 17880, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 27809, 'idleMs': 27809, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017879.json -----
{'id': 'cmd_000000017879', 'seq': 17879, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 27305, 'idleMs': 27305, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017878.json -----
{'id': 'cmd_000000017878', 'seq': 17878, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 26910, 'idleMs': 26910, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017877.json -----
{'id': 'cmd_000000017877', 'seq': 17877, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 26410, 'idleMs': 26410, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017876.json -----
{'id': 'cmd_000000017876', 'seq': 17876, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 25905, 'idleMs': 25905, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017875.json -----
{'id': 'cmd_000000017875', 'seq': 17875, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 25507, 'idleMs': 25507, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017874.json -----
{'id': 'cmd_000000017874', 'seq': 17874, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 25108, 'idleMs': 25108, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017873.json -----
{'id': 'cmd_000000017873', 'seq': 17873, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 24608, 'idleMs': 24608, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017872.json -----
{'id': 'cmd_000000017872', 'seq': 17872, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 24106, 'idleMs': 24106, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017871.json -----
{'id': 'cmd_000000017871', 'seq': 17871, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 23704, 'idleMs': 23704, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017870.json -----
{'id': 'cmd_000000017870', 'seq': 17870, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 23209, 'idleMs': 23209, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017869.json -----
{'id': 'cmd_000000017869', 'seq': 17869, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 22705, 'idleMs': 22705, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017868.json -----
{'id': 'cmd_000000017868', 'seq': 17868, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 22307, 'idleMs': 22307, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017867.json -----
{'id': 'cmd_000000017867', 'seq': 17867, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 21905, 'idleMs': 21905, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017866.json -----
{'id': 'cmd_000000017866', 'seq': 17866, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 21408, 'idleMs': 21408, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017865.json -----
{'id': 'cmd_000000017865', 'seq': 17865, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 20904, 'idleMs': 20904, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017864.json -----
{'id': 'cmd_000000017864', 'seq': 17864, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 20504, 'idleMs': 20504, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017863.json -----
{'id': 'cmd_000000017863', 'seq': 17863, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 20010, 'idleMs': 20010, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017862.json -----
{'id': 'cmd_000000017862', 'seq': 17862, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 19504, 'idleMs': 19504, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017861.json -----
{'id': 'cmd_000000017861', 'seq': 17861, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 19108, 'idleMs': 19108, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017860.json -----
{'id': 'cmd_000000017860', 'seq': 17860, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 18609, 'idleMs': 18609, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017859.json -----
{'id': 'cmd_000000017859', 'seq': 17859, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 18102, 'idleMs': 18102, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017858.json -----
{'id': 'cmd_000000017858', 'seq': 17858, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 17705, 'idleMs': 17705, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017857.json -----
{'id': 'cmd_000000017857', 'seq': 17857, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 17305, 'idleMs': 17305, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017856.json -----
{'id': 'cmd_000000017856', 'seq': 17856, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 16809, 'idleMs': 16809, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017855.json -----
{'id': 'cmd_000000017855', 'seq': 17855, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 16308, 'idleMs': 16308, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017854.json -----
{'id': 'cmd_000000017854', 'seq': 17854, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-b8a2b3ea', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399338063, 'ageMs': 15908, 'idleMs': 15908, 'debug': [], 'stepResults': []}
error= None
```

## logs relevant
```
{"seq":59490,"timestamp":"2026-04-28T18:02:33.026Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017852-__pollDeferred.json\"]","level":"debug"}
{"seq":59491,"timestamp":"2026-04-28T18:02:33.031Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017852-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59492,"timestamp":"2026-04-28T18:02:33.035Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017852-__pollDeferred.json","level":"debug"}
{"seq":59494,"timestamp":"2026-04-28T18:02:33.044Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017852 type=__pollDeferred","level":"info"}
{"seq":59506,"timestamp":"2026-04-28T18:02:33.526Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017853-__pollDeferred.json\"]","level":"debug"}
{"seq":59507,"timestamp":"2026-04-28T18:02:33.530Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017853-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59508,"timestamp":"2026-04-28T18:02:33.534Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017853-__pollDeferred.json","level":"debug"}
{"seq":59510,"timestamp":"2026-04-28T18:02:33.545Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017853 type=__pollDeferred","level":"info"}
{"seq":59520,"timestamp":"2026-04-28T18:02:33.925Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017854-__pollDeferred.json\"]","level":"debug"}
{"seq":59521,"timestamp":"2026-04-28T18:02:33.929Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017854-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59522,"timestamp":"2026-04-28T18:02:33.933Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017854-__pollDeferred.json","level":"debug"}
{"seq":59524,"timestamp":"2026-04-28T18:02:33.942Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017854 type=__pollDeferred","level":"info"}
{"seq":59534,"timestamp":"2026-04-28T18:02:34.321Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017855-__pollDeferred.json\"]","level":"debug"}
{"seq":59535,"timestamp":"2026-04-28T18:02:34.326Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017855-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59536,"timestamp":"2026-04-28T18:02:34.330Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017855-__pollDeferred.json","level":"debug"}
{"seq":59538,"timestamp":"2026-04-28T18:02:34.339Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017855 type=__pollDeferred","level":"info"}
{"seq":59550,"timestamp":"2026-04-28T18:02:34.829Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017856-__pollDeferred.json\"]","level":"debug"}
{"seq":59551,"timestamp":"2026-04-28T18:02:34.833Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017856-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59552,"timestamp":"2026-04-28T18:02:34.837Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017856-__pollDeferred.json","level":"debug"}
{"seq":59554,"timestamp":"2026-04-28T18:02:34.845Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017856 type=__pollDeferred","level":"info"}
{"seq":59566,"timestamp":"2026-04-28T18:02:35.321Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017857-__pollDeferred.json\"]","level":"debug"}
{"seq":59567,"timestamp":"2026-04-28T18:02:35.326Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017857-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59568,"timestamp":"2026-04-28T18:02:35.330Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017857-__pollDeferred.json","level":"debug"}
{"seq":59570,"timestamp":"2026-04-28T18:02:35.340Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017857 type=__pollDeferred","level":"info"}
{"seq":59580,"timestamp":"2026-04-28T18:02:35.724Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017858-__pollDeferred.json\"]","level":"debug"}
{"seq":59581,"timestamp":"2026-04-28T18:02:35.728Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017858-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59582,"timestamp":"2026-04-28T18:02:35.732Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017858-__pollDeferred.json","level":"debug"}
{"seq":59584,"timestamp":"2026-04-28T18:02:35.741Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017858 type=__pollDeferred","level":"info"}
{"seq":59594,"timestamp":"2026-04-28T18:02:36.120Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017859-__pollDeferred.json\"]","level":"debug"}
{"seq":59595,"timestamp":"2026-04-28T18:02:36.124Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017859-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59596,"timestamp":"2026-04-28T18:02:36.128Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017859-__pollDeferred.json","level":"debug"}
{"seq":59598,"timestamp":"2026-04-28T18:02:36.136Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017859 type=__pollDeferred","level":"info"}
{"seq":59610,"timestamp":"2026-04-28T18:02:36.629Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017860-__pollDeferred.json\"]","level":"debug"}
{"seq":59611,"timestamp":"2026-04-28T18:02:36.633Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017860-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59612,"timestamp":"2026-04-28T18:02:36.637Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017860-__pollDeferred.json","level":"debug"}
{"seq":59614,"timestamp":"2026-04-28T18:02:36.645Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017860 type=__pollDeferred","level":"info"}
{"seq":59626,"timestamp":"2026-04-28T18:02:37.126Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017861-__pollDeferred.json\"]","level":"debug"}
{"seq":59627,"timestamp":"2026-04-28T18:02:37.130Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017861-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59628,"timestamp":"2026-04-28T18:02:37.134Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017861-__pollDeferred.json","level":"debug"}
{"seq":59630,"timestamp":"2026-04-28T18:02:37.144Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017861 type=__pollDeferred","level":"info"}
{"seq":59640,"timestamp":"2026-04-28T18:02:37.523Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017862-__pollDeferred.json\"]","level":"debug"}
{"seq":59641,"timestamp":"2026-04-28T18:02:37.527Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017862-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59642,"timestamp":"2026-04-28T18:02:37.531Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017862-__pollDeferred.json","level":"debug"}
{"seq":59644,"timestamp":"2026-04-28T18:02:37.540Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017862 type=__pollDeferred","level":"info"}
{"seq":59656,"timestamp":"2026-04-28T18:02:38.026Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017863-__pollDeferred.json\"]","level":"debug"}
{"seq":59657,"timestamp":"2026-04-28T18:02:38.031Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017863-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59658,"timestamp":"2026-04-28T18:02:38.035Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017863-__pollDeferred.json","level":"debug"}
{"seq":59660,"timestamp":"2026-04-28T18:02:38.045Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017863 type=__pollDeferred","level":"info"}
{"seq":59672,"timestamp":"2026-04-28T18:02:38.521Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017864-__pollDeferred.json\"]","level":"debug"}
{"seq":59673,"timestamp":"2026-04-28T18:02:38.525Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017864-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59674,"timestamp":"2026-04-28T18:02:38.529Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017864-__pollDeferred.json","level":"debug"}
{"seq":59676,"timestamp":"2026-04-28T18:02:38.537Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017864 type=__pollDeferred","level":"info"}
{"seq":59686,"timestamp":"2026-04-28T18:02:38.921Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017865-__pollDeferred.json\"]","level":"debug"}
{"seq":59687,"timestamp":"2026-04-28T18:02:38.925Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017865-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59688,"timestamp":"2026-04-28T18:02:38.931Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017865-__pollDeferred.json","level":"debug"}
{"seq":59690,"timestamp":"2026-04-28T18:02:38.939Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017865 type=__pollDeferred","level":"info"}
{"seq":59702,"timestamp":"2026-04-28T18:02:39.426Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017866-__pollDeferred.json\"]","level":"debug"}
{"seq":59703,"timestamp":"2026-04-28T18:02:39.430Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017866-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59704,"timestamp":"2026-04-28T18:02:39.434Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017866-__pollDeferred.json","level":"debug"}
{"seq":59706,"timestamp":"2026-04-28T18:02:39.444Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017866 type=__pollDeferred","level":"info"}
{"seq":59718,"timestamp":"2026-04-28T18:02:39.922Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017867-__pollDeferred.json\"]","level":"debug"}
{"seq":59719,"timestamp":"2026-04-28T18:02:39.927Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017867-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59720,"timestamp":"2026-04-28T18:02:39.930Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017867-__pollDeferred.json","level":"debug"}
{"seq":59722,"timestamp":"2026-04-28T18:02:39.939Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017867 type=__pollDeferred","level":"info"}
{"seq":59732,"timestamp":"2026-04-28T18:02:40.323Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017868-__pollDeferred.json\"]","level":"debug"}
{"seq":59733,"timestamp":"2026-04-28T18:02:40.328Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017868-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59734,"timestamp":"2026-04-28T18:02:40.334Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017868-__pollDeferred.json","level":"debug"}
{"seq":59736,"timestamp":"2026-04-28T18:02:40.342Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017868 type=__pollDeferred","level":"info"}
{"seq":59746,"timestamp":"2026-04-28T18:02:40.723Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017869-__pollDeferred.json\"]","level":"debug"}
{"seq":59747,"timestamp":"2026-04-28T18:02:40.727Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017869-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59748,"timestamp":"2026-04-28T18:02:40.731Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017869-__pollDeferred.json","level":"debug"}
{"seq":59750,"timestamp":"2026-04-28T18:02:40.739Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017869 type=__pollDeferred","level":"info"}
{"seq":59762,"timestamp":"2026-04-28T18:02:41.228Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017870-__pollDeferred.json\"]","level":"debug"}
{"seq":59763,"timestamp":"2026-04-28T18:02:41.233Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017870-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59764,"timestamp":"2026-04-28T18:02:41.237Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017870-__pollDeferred.json","level":"debug"}
{"seq":59766,"timestamp":"2026-04-28T18:02:41.245Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017870 type=__pollDeferred","level":"info"}
{"seq":59778,"timestamp":"2026-04-28T18:02:41.722Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017871-__pollDeferred.json\"]","level":"debug"}
{"seq":59779,"timestamp":"2026-04-28T18:02:41.726Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017871-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59780,"timestamp":"2026-04-28T18:02:41.730Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017871-__pollDeferred.json","level":"debug"}
{"seq":59782,"timestamp":"2026-04-28T18:02:41.740Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017871 type=__pollDeferred","level":"info"}
{"seq":59792,"timestamp":"2026-04-28T18:02:42.125Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017872-__pollDeferred.json\"]","level":"debug"}
{"seq":59793,"timestamp":"2026-04-28T18:02:42.130Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017872-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59794,"timestamp":"2026-04-28T18:02:42.134Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017872-__pollDeferred.json","level":"debug"}
{"seq":59796,"timestamp":"2026-04-28T18:02:42.142Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017872 type=__pollDeferred","level":"info"}
{"seq":59808,"timestamp":"2026-04-28T18:02:42.625Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017873-__pollDeferred.json\"]","level":"debug"}
{"seq":59809,"timestamp":"2026-04-28T18:02:42.629Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017873-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59810,"timestamp":"2026-04-28T18:02:42.633Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017873-__pollDeferred.json","level":"debug"}
{"seq":59812,"timestamp":"2026-04-28T18:02:42.643Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017873 type=__pollDeferred","level":"info"}
{"seq":59824,"timestamp":"2026-04-28T18:02:43.125Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017874-__pollDeferred.json\"]","level":"debug"}
{"seq":59825,"timestamp":"2026-04-28T18:02:43.129Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017874-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59826,"timestamp":"2026-04-28T18:02:43.133Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017874-__pollDeferred.json","level":"debug"}
{"seq":59828,"timestamp":"2026-04-28T18:02:43.141Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017874 type=__pollDeferred","level":"info"}
{"seq":59838,"timestamp":"2026-04-28T18:02:43.524Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017875-__pollDeferred.json\"]","level":"debug"}
{"seq":59839,"timestamp":"2026-04-28T18:02:43.528Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017875-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59840,"timestamp":"2026-04-28T18:02:43.534Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017875-__pollDeferred.json","level":"debug"}
{"seq":59842,"timestamp":"2026-04-28T18:02:43.542Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017875 type=__pollDeferred","level":"info"}
{"seq":59852,"timestamp":"2026-04-28T18:02:43.922Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017876-__pollDeferred.json\"]","level":"debug"}
{"seq":59853,"timestamp":"2026-04-28T18:02:43.926Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017876-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59854,"timestamp":"2026-04-28T18:02:43.930Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017876-__pollDeferred.json","level":"debug"}
{"seq":59856,"timestamp":"2026-04-28T18:02:43.938Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017876 type=__pollDeferred","level":"info"}
{"seq":59868,"timestamp":"2026-04-28T18:02:44.429Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017877-__pollDeferred.json\"]","level":"debug"}
{"seq":59869,"timestamp":"2026-04-28T18:02:44.433Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017877-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59870,"timestamp":"2026-04-28T18:02:44.437Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017877-__pollDeferred.json","level":"debug"}
{"seq":59872,"timestamp":"2026-04-28T18:02:44.445Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017877 type=__pollDeferred","level":"info"}
{"seq":59884,"timestamp":"2026-04-28T18:02:44.927Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017878-__pollDeferred.json\"]","level":"debug"}
{"seq":59885,"timestamp":"2026-04-28T18:02:44.931Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017878-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59886,"timestamp":"2026-04-28T18:02:44.935Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017878-__pollDeferred.json","level":"debug"}
{"seq":59888,"timestamp":"2026-04-28T18:02:44.945Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017878 type=__pollDeferred","level":"info"}
{"seq":59898,"timestamp":"2026-04-28T18:02:45.324Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017879-__pollDeferred.json\"]","level":"debug"}
{"seq":59899,"timestamp":"2026-04-28T18:02:45.328Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017879-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59900,"timestamp":"2026-04-28T18:02:45.332Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017879-__pollDeferred.json","level":"debug"}
{"seq":59902,"timestamp":"2026-04-28T18:02:45.340Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017879 type=__pollDeferred","level":"info"}
{"seq":59914,"timestamp":"2026-04-28T18:02:45.826Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017880-__pollDeferred.json\"]","level":"debug"}
{"seq":59915,"timestamp":"2026-04-28T18:02:45.830Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017880-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59916,"timestamp":"2026-04-28T18:02:45.835Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017880-__pollDeferred.json","level":"debug"}
{"seq":59918,"timestamp":"2026-04-28T18:02:45.845Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017880 type=__pollDeferred","level":"info"}
{"seq":59930,"timestamp":"2026-04-28T18:02:46.323Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017881-__pollDeferred.json\"]","level":"debug"}
{"seq":59931,"timestamp":"2026-04-28T18:02:46.327Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017881-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59932,"timestamp":"2026-04-28T18:02:46.331Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017881-__pollDeferred.json","level":"debug"}
{"seq":59934,"timestamp":"2026-04-28T18:02:46.339Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017881 type=__pollDeferred","level":"info"}
{"seq":59944,"timestamp":"2026-04-28T18:02:46.724Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017882-__pollDeferred.json\"]","level":"debug"}
{"seq":59945,"timestamp":"2026-04-28T18:02:46.728Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017882-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59946,"timestamp":"2026-04-28T18:02:46.734Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017882-__pollDeferred.json","level":"debug"}
{"seq":59948,"timestamp":"2026-04-28T18:02:46.743Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017882 type=__pollDeferred","level":"info"}
{"seq":59958,"timestamp":"2026-04-28T18:02:47.125Z","scope":"queue","message":"[queue-claim] candidatos: 1 [\"000000017883-__pollDeferred.json\"]","level":"debug"}
{"seq":59959,"timestamp":"2026-04-28T18:02:47.129Z","scope":"queue","message":"[queue-claim] claim nuevo: 000000017883-__pollDeferred.json modo=atomic-move","level":"debug"}
{"seq":59960,"timestamp":"2026-04-28T18:02:47.133Z","scope":"queue","message":"[queue-claim] parseado OK: 000000017883-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":59961,"timestamp":"2026-04-28T18:02:47.137Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017883 type=__pollDeferred","level":"info"}
```
