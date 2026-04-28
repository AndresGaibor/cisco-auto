# pt cmd reap native fallback fix

Fecha: Tue Apr 28 12:59:40 -05 2026

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
      "id": "cmd_000000017750",
      "seq": 17750,
      "type": "omni.evaluate.raw",
      "startedAt": 1777399188357,
      "completedAt": 1777399188722,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"tail\":\"       : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777399188221,
        "resultSeenAt": 1777399188748,
        "receivedAt": 1777399188748,
        "waitMs": 527,
        "completedAtMs": 1777399188722
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

## pt cmd
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000017752","seq":17752,"type":"terminal.plan.run","startedAt":1777399190080,"completedAt":1777399190333,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","job":{"id":"cmd-2c1eb4f9","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}},"timings":{"sentAt":1777399190051,"resultSeenAt":1777399190370,"receivedAt":1777399190370,"waitMs":319,"completedAtMs":1777399190333}}
[terminal-plan-run-debug] submitValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","job":{"id":"cmd-2c1eb4f9","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}
[terminal-plan-run-debug] isDeferredValue=true
[terminal-plan-run-debug] ENTER deferred polling ticket=cmd-2c1eb4f9
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=0
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":416,"idleMs":416,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=528
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":840,"idleMs":840,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=935
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":1223,"idleMs":1223,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=1343
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":1734,"idleMs":1734,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=1870
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":2231,"idleMs":2231,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=2333
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":2630,"idleMs":2630,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=2742
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":3132,"idleMs":3132,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=3264
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":3633,"idleMs":3633,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=3730
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":4023,"idleMs":4023,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=4141
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":4429,"idleMs":4429,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=4549
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":4928,"idleMs":4928,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=5015
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":5331,"idleMs":5331,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=5425
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":5732,"idleMs":5732,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=5833
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":6127,"idleMs":6127,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=6240
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":6525,"idleMs":6525,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=6610
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":6929,"idleMs":6929,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=7015
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":7324,"idleMs":7324,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=7411
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":7728,"idleMs":7728,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=7819
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":8125,"idleMs":8125,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=8228
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":8530,"idleMs":8530,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=8639
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":8929,"idleMs":8929,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=9047
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":9432,"idleMs":9432,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=9568
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":9929,"idleMs":9929,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=10031
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":10326,"idleMs":10326,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=10440
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":10727,"idleMs":10727,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=10847
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":11232,"idleMs":11232,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=11366
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":11735,"idleMs":11735,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=11830
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":12129,"idleMs":12129,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=12242
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":12529,"idleMs":12529,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=12649
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":13035,"idleMs":13035,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=13169
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":13531,"idleMs":13531,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=13635
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":13931,"idleMs":13931,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=14044
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":14431,"idleMs":14431,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=14565
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":14932,"idleMs":14932,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=15034
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":15357,"idleMs":15357,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=15450
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":15834,"idleMs":15834,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=15917
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":16237,"idleMs":16237,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=16332
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":16637,"idleMs":16637,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=16741
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":17034,"idleMs":17034,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=17148
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":17533,"idleMs":17533,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=17665
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":18029,"idleMs":18029,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=18132
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":18433,"idleMs":18433,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=18541
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":18830,"idleMs":18830,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=18950
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":19336,"idleMs":19336,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=19467
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":19833,"idleMs":19833,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=19932
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":20228,"idleMs":20228,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=20339
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":20629,"idleMs":20629,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=20750
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":21151,"idleMs":21151,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=21261
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":21643,"idleMs":21643,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=21772
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":22138,"idleMs":22138,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=22241
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":22533,"idleMs":22533,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=22649
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":23052,"idleMs":23052,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=23164
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":23538,"idleMs":23538,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=23630
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":23946,"idleMs":23946,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=24062
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":24446,"idleMs":24446,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=24564
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":24943,"idleMs":24943,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=25033
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":25332,"idleMs":25332,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=25442
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":25833,"idleMs":25833,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=25965
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":26334,"idleMs":26334,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=26433
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":26737,"idleMs":26737,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=26845
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":27243,"idleMs":27243,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=27363
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":27736,"idleMs":27736,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=27831
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":28130,"idleMs":28130,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=28241
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-2c1eb4f9","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399190137,"ageMs":28535,"idleMs":28535,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-2c1eb4f9 elapsedMs=28649
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
⏱ pt cmd · 29.5s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## latest result summaries
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000017817.json -----
{'id': 'cmd_000000017817', 'seq': 17817, 'type': '__pollDeferred', 'status': 'failed', 'ok': False}
value= {'done': True, 'ok': False, 'status': 1, 'result': None, 'error': 'Job timed out while waiting for terminal command completion', 'code': 'JOB_TIMEOUT', 'errorCode': 'JOB_TIMEOUT', 'raw': '', 'output': '', 'source': 'terminal', 'session': {'mode': 'unknown', 'prompt': '', 'paging': False, 'awaitingConfirm': False}}
error= {'code': 'JOB_TIMEOUT', 'message': 'Job timed out while waiting for terminal command completion', 'phase': 'execution'}

----- /Users/andresgaibor/pt-dev/results/cmd_000000017816.json -----
{'id': 'cmd_000000017816', 'seq': 17816, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 28535, 'idleMs': 28535, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017815.json -----
{'id': 'cmd_000000017815', 'seq': 17815, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 28130, 'idleMs': 28130, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017814.json -----
{'id': 'cmd_000000017814', 'seq': 17814, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 27736, 'idleMs': 27736, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017813.json -----
{'id': 'cmd_000000017813', 'seq': 17813, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 27243, 'idleMs': 27243, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017812.json -----
{'id': 'cmd_000000017812', 'seq': 17812, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 26737, 'idleMs': 26737, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017811.json -----
{'id': 'cmd_000000017811', 'seq': 17811, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 26334, 'idleMs': 26334, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017810.json -----
{'id': 'cmd_000000017810', 'seq': 17810, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 25833, 'idleMs': 25833, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017809.json -----
{'id': 'cmd_000000017809', 'seq': 17809, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 25332, 'idleMs': 25332, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017808.json -----
{'id': 'cmd_000000017808', 'seq': 17808, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 24943, 'idleMs': 24943, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017807.json -----
{'id': 'cmd_000000017807', 'seq': 17807, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 24446, 'idleMs': 24446, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017806.json -----
{'id': 'cmd_000000017806', 'seq': 17806, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 23946, 'idleMs': 23946, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017805.json -----
{'id': 'cmd_000000017805', 'seq': 17805, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 23538, 'idleMs': 23538, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017804.json -----
{'id': 'cmd_000000017804', 'seq': 17804, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 23052, 'idleMs': 23052, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017803.json -----
{'id': 'cmd_000000017803', 'seq': 17803, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 22533, 'idleMs': 22533, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017802.json -----
{'id': 'cmd_000000017802', 'seq': 17802, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 22138, 'idleMs': 22138, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017801.json -----
{'id': 'cmd_000000017801', 'seq': 17801, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 21643, 'idleMs': 21643, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017800.json -----
{'id': 'cmd_000000017800', 'seq': 17800, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 21151, 'idleMs': 21151, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017799.json -----
{'id': 'cmd_000000017799', 'seq': 17799, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 20629, 'idleMs': 20629, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017798.json -----
{'id': 'cmd_000000017798', 'seq': 17798, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 20228, 'idleMs': 20228, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017797.json -----
{'id': 'cmd_000000017797', 'seq': 17797, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 19833, 'idleMs': 19833, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017796.json -----
{'id': 'cmd_000000017796', 'seq': 17796, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 19336, 'idleMs': 19336, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017795.json -----
{'id': 'cmd_000000017795', 'seq': 17795, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 18830, 'idleMs': 18830, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017794.json -----
{'id': 'cmd_000000017794', 'seq': 17794, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 18433, 'idleMs': 18433, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017793.json -----
{'id': 'cmd_000000017793', 'seq': 17793, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 18029, 'idleMs': 18029, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017792.json -----
{'id': 'cmd_000000017792', 'seq': 17792, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 17533, 'idleMs': 17533, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017791.json -----
{'id': 'cmd_000000017791', 'seq': 17791, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 17034, 'idleMs': 17034, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017790.json -----
{'id': 'cmd_000000017790', 'seq': 17790, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 16637, 'idleMs': 16637, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017789.json -----
{'id': 'cmd_000000017789', 'seq': 17789, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 16237, 'idleMs': 16237, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017788.json -----
{'id': 'cmd_000000017788', 'seq': 17788, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-2c1eb4f9', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399190137, 'ageMs': 15834, 'idleMs': 15834, 'debug': [], 'stepResults': []}
error= None
```

## logs relevant
```
{"seq":56173,"timestamp":"2026-04-28T18:00:05.421Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017787-__pollDeferred.json\"]","level":"debug"}
{"seq":56174,"timestamp":"2026-04-28T18:00:05.428Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017787-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56175,"timestamp":"2026-04-28T18:00:05.439Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017787-__pollDeferred.json","level":"debug"}
{"seq":56177,"timestamp":"2026-04-28T18:00:05.457Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017787 type=__pollDeferred","level":"info"}
{"seq":56189,"timestamp":"2026-04-28T18:00:05.925Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017788-__pollDeferred.json\"]","level":"debug"}
{"seq":56190,"timestamp":"2026-04-28T18:00:05.930Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017788-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56191,"timestamp":"2026-04-28T18:00:05.934Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017788-__pollDeferred.json","level":"debug"}
{"seq":56193,"timestamp":"2026-04-28T18:00:05.942Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017788 type=__pollDeferred","level":"info"}
{"seq":56203,"timestamp":"2026-04-28T18:00:06.320Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017789-__pollDeferred.json\"]","level":"debug"}
{"seq":56204,"timestamp":"2026-04-28T18:00:06.328Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017789-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56205,"timestamp":"2026-04-28T18:00:06.333Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017789-__pollDeferred.json","level":"debug"}
{"seq":56207,"timestamp":"2026-04-28T18:00:06.345Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017789 type=__pollDeferred","level":"info"}
{"seq":56217,"timestamp":"2026-04-28T18:00:06.720Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017790-__pollDeferred.json\"]","level":"debug"}
{"seq":56218,"timestamp":"2026-04-28T18:00:06.726Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017790-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56219,"timestamp":"2026-04-28T18:00:06.733Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017790-__pollDeferred.json","level":"debug"}
{"seq":56221,"timestamp":"2026-04-28T18:00:06.742Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017790 type=__pollDeferred","level":"info"}
{"seq":56231,"timestamp":"2026-04-28T18:00:07.122Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017791-__pollDeferred.json\"]","level":"debug"}
{"seq":56232,"timestamp":"2026-04-28T18:00:07.127Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017791-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56233,"timestamp":"2026-04-28T18:00:07.131Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017791-__pollDeferred.json","level":"debug"}
{"seq":56235,"timestamp":"2026-04-28T18:00:07.142Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017791 type=__pollDeferred","level":"info"}
{"seq":56247,"timestamp":"2026-04-28T18:00:07.624Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017792-__pollDeferred.json\"]","level":"debug"}
{"seq":56248,"timestamp":"2026-04-28T18:00:07.628Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017792-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56249,"timestamp":"2026-04-28T18:00:07.632Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017792-__pollDeferred.json","level":"debug"}
{"seq":56251,"timestamp":"2026-04-28T18:00:07.642Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017792 type=__pollDeferred","level":"info"}
{"seq":56263,"timestamp":"2026-04-28T18:00:08.122Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017793-__pollDeferred.json\"]","level":"debug"}
{"seq":56264,"timestamp":"2026-04-28T18:00:08.127Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017793-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56265,"timestamp":"2026-04-28T18:00:08.131Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017793-__pollDeferred.json","level":"debug"}
{"seq":56267,"timestamp":"2026-04-28T18:00:08.140Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017793 type=__pollDeferred","level":"info"}
{"seq":56277,"timestamp":"2026-04-28T18:00:08.523Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017794-__pollDeferred.json\"]","level":"debug"}
{"seq":56278,"timestamp":"2026-04-28T18:00:08.527Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017794-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56279,"timestamp":"2026-04-28T18:00:08.533Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017794-__pollDeferred.json","level":"debug"}
{"seq":56281,"timestamp":"2026-04-28T18:00:08.541Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017794 type=__pollDeferred","level":"info"}
{"seq":56291,"timestamp":"2026-04-28T18:00:08.925Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017795-__pollDeferred.json\"]","level":"debug"}
{"seq":56292,"timestamp":"2026-04-28T18:00:08.929Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017795-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56293,"timestamp":"2026-04-28T18:00:08.933Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017795-__pollDeferred.json","level":"debug"}
{"seq":56295,"timestamp":"2026-04-28T18:00:08.941Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017795 type=__pollDeferred","level":"info"}
{"seq":56307,"timestamp":"2026-04-28T18:00:09.425Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017796-__pollDeferred.json\"]","level":"debug"}
{"seq":56308,"timestamp":"2026-04-28T18:00:09.429Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017796-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56309,"timestamp":"2026-04-28T18:00:09.433Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017796-__pollDeferred.json","level":"debug"}
{"seq":56311,"timestamp":"2026-04-28T18:00:09.444Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017796 type=__pollDeferred","level":"info"}
{"seq":56323,"timestamp":"2026-04-28T18:00:09.926Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017797-__pollDeferred.json\"]","level":"debug"}
{"seq":56324,"timestamp":"2026-04-28T18:00:09.932Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017797-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56325,"timestamp":"2026-04-28T18:00:09.936Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017797-__pollDeferred.json","level":"debug"}
{"seq":56327,"timestamp":"2026-04-28T18:00:09.945Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017797 type=__pollDeferred","level":"info"}
{"seq":56337,"timestamp":"2026-04-28T18:00:10.319Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017798-__pollDeferred.json\"]","level":"debug"}
{"seq":56338,"timestamp":"2026-04-28T18:00:10.323Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017798-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56339,"timestamp":"2026-04-28T18:00:10.329Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017798-__pollDeferred.json","level":"debug"}
{"seq":56341,"timestamp":"2026-04-28T18:00:10.338Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017798 type=__pollDeferred","level":"info"}
{"seq":56351,"timestamp":"2026-04-28T18:00:10.724Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017799-__pollDeferred.json\"]","level":"debug"}
{"seq":56352,"timestamp":"2026-04-28T18:00:10.728Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017799-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56353,"timestamp":"2026-04-28T18:00:10.732Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017799-__pollDeferred.json","level":"debug"}
{"seq":56355,"timestamp":"2026-04-28T18:00:10.740Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017799 type=__pollDeferred","level":"info"}
{"seq":56367,"timestamp":"2026-04-28T18:00:11.226Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017800-__pollDeferred.json\"]","level":"debug"}
{"seq":56368,"timestamp":"2026-04-28T18:00:11.230Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017800-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56369,"timestamp":"2026-04-28T18:00:11.235Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017800-__pollDeferred.json","level":"debug"}
{"seq":56371,"timestamp":"2026-04-28T18:00:11.250Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017800 type=__pollDeferred","level":"info"}
{"seq":56383,"timestamp":"2026-04-28T18:00:11.720Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017801-__pollDeferred.json\"]","level":"debug"}
{"seq":56384,"timestamp":"2026-04-28T18:00:11.728Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017801-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56385,"timestamp":"2026-04-28T18:00:11.733Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017801-__pollDeferred.json","level":"debug"}
{"seq":56387,"timestamp":"2026-04-28T18:00:11.745Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017801 type=__pollDeferred","level":"info"}
{"seq":56399,"timestamp":"2026-04-28T18:00:12.226Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017802-__pollDeferred.json\"]","level":"debug"}
{"seq":56400,"timestamp":"2026-04-28T18:00:12.230Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017802-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56401,"timestamp":"2026-04-28T18:00:12.235Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017802-__pollDeferred.json","level":"debug"}
{"seq":56403,"timestamp":"2026-04-28T18:00:12.246Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017802 type=__pollDeferred","level":"info"}
{"seq":56413,"timestamp":"2026-04-28T18:00:12.623Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017803-__pollDeferred.json\"]","level":"debug"}
{"seq":56414,"timestamp":"2026-04-28T18:00:12.627Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017803-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56415,"timestamp":"2026-04-28T18:00:12.632Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017803-__pollDeferred.json","level":"debug"}
{"seq":56417,"timestamp":"2026-04-28T18:00:12.642Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017803 type=__pollDeferred","level":"info"}
{"seq":56429,"timestamp":"2026-04-28T18:00:13.121Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017804-__pollDeferred.json\"]","level":"debug"}
{"seq":56430,"timestamp":"2026-04-28T18:00:13.130Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017804-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56431,"timestamp":"2026-04-28T18:00:13.136Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017804-__pollDeferred.json","level":"debug"}
{"seq":56433,"timestamp":"2026-04-28T18:00:13.149Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017804 type=__pollDeferred","level":"info"}
{"seq":56445,"timestamp":"2026-04-28T18:00:13.628Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017805-__pollDeferred.json\"]","level":"debug"}
{"seq":56446,"timestamp":"2026-04-28T18:00:13.632Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017805-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56447,"timestamp":"2026-04-28T18:00:13.636Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017805-__pollDeferred.json","level":"debug"}
{"seq":56449,"timestamp":"2026-04-28T18:00:13.647Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017805 type=__pollDeferred","level":"info"}
{"seq":56459,"timestamp":"2026-04-28T18:00:14.024Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017806-__pollDeferred.json\"]","level":"debug"}
{"seq":56460,"timestamp":"2026-04-28T18:00:14.029Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017806-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56461,"timestamp":"2026-04-28T18:00:14.034Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017806-__pollDeferred.json","level":"debug"}
{"seq":56463,"timestamp":"2026-04-28T18:00:14.046Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017806 type=__pollDeferred","level":"info"}
{"seq":56475,"timestamp":"2026-04-28T18:00:14.522Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017807-__pollDeferred.json\"]","level":"debug"}
{"seq":56476,"timestamp":"2026-04-28T18:00:14.530Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017807-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56477,"timestamp":"2026-04-28T18:00:14.535Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017807-__pollDeferred.json","level":"debug"}
{"seq":56479,"timestamp":"2026-04-28T18:00:14.548Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017807 type=__pollDeferred","level":"info"}
{"seq":56491,"timestamp":"2026-04-28T18:00:15.023Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017808-__pollDeferred.json\"]","level":"debug"}
{"seq":56492,"timestamp":"2026-04-28T18:00:15.029Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017808-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56493,"timestamp":"2026-04-28T18:00:15.034Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017808-__pollDeferred.json","level":"debug"}
{"seq":56495,"timestamp":"2026-04-28T18:00:15.045Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017808 type=__pollDeferred","level":"info"}
{"seq":56505,"timestamp":"2026-04-28T18:00:15.421Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017809-__pollDeferred.json\"]","level":"debug"}
{"seq":56506,"timestamp":"2026-04-28T18:00:15.426Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017809-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56507,"timestamp":"2026-04-28T18:00:15.430Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017809-__pollDeferred.json","level":"debug"}
{"seq":56509,"timestamp":"2026-04-28T18:00:15.440Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017809 type=__pollDeferred","level":"info"}
{"seq":56521,"timestamp":"2026-04-28T18:00:15.924Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017810-__pollDeferred.json\"]","level":"debug"}
{"seq":56522,"timestamp":"2026-04-28T18:00:15.931Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017810-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56523,"timestamp":"2026-04-28T18:00:15.935Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017810-__pollDeferred.json","level":"debug"}
{"seq":56525,"timestamp":"2026-04-28T18:00:15.944Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017810 type=__pollDeferred","level":"info"}
{"seq":56537,"timestamp":"2026-04-28T18:00:16.424Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017811-__pollDeferred.json\"]","level":"debug"}
{"seq":56538,"timestamp":"2026-04-28T18:00:16.428Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017811-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56539,"timestamp":"2026-04-28T18:00:16.432Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017811-__pollDeferred.json","level":"debug"}
{"seq":56541,"timestamp":"2026-04-28T18:00:16.442Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017811 type=__pollDeferred","level":"info"}
{"seq":56551,"timestamp":"2026-04-28T18:00:16.821Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017812-__pollDeferred.json\"]","level":"debug"}
{"seq":56552,"timestamp":"2026-04-28T18:00:16.826Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017812-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56553,"timestamp":"2026-04-28T18:00:16.830Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017812-__pollDeferred.json","level":"debug"}
{"seq":56555,"timestamp":"2026-04-28T18:00:16.841Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017812 type=__pollDeferred","level":"info"}
{"seq":56567,"timestamp":"2026-04-28T18:00:17.321Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017813-__pollDeferred.json\"]","level":"debug"}
{"seq":56568,"timestamp":"2026-04-28T18:00:17.329Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017813-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56569,"timestamp":"2026-04-28T18:00:17.334Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017813-__pollDeferred.json","level":"debug"}
{"seq":56571,"timestamp":"2026-04-28T18:00:17.346Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017813 type=__pollDeferred","level":"info"}
{"seq":56583,"timestamp":"2026-04-28T18:00:17.826Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017814-__pollDeferred.json\"]","level":"debug"}
{"seq":56584,"timestamp":"2026-04-28T18:00:17.830Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017814-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56585,"timestamp":"2026-04-28T18:00:17.834Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017814-__pollDeferred.json","level":"debug"}
{"seq":56587,"timestamp":"2026-04-28T18:00:17.844Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017814 type=__pollDeferred","level":"info"}
{"seq":56597,"timestamp":"2026-04-28T18:00:18.221Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017815-__pollDeferred.json\"]","level":"debug"}
{"seq":56598,"timestamp":"2026-04-28T18:00:18.225Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017815-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56599,"timestamp":"2026-04-28T18:00:18.229Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017815-__pollDeferred.json","level":"debug"}
{"seq":56601,"timestamp":"2026-04-28T18:00:18.239Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017815 type=__pollDeferred","level":"info"}
{"seq":56611,"timestamp":"2026-04-28T18:00:18.624Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017816-__pollDeferred.json\"]","level":"debug"}
{"seq":56612,"timestamp":"2026-04-28T18:00:18.629Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017816-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56613,"timestamp":"2026-04-28T18:00:18.633Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017816-__pollDeferred.json","level":"debug"}
{"seq":56615,"timestamp":"2026-04-28T18:00:18.643Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017816 type=__pollDeferred","level":"info"}
{"seq":56627,"timestamp":"2026-04-28T18:00:19.123Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017817-__pollDeferred.json\"]","level":"debug"}
{"seq":56628,"timestamp":"2026-04-28T18:00:19.129Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017817-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":56629,"timestamp":"2026-04-28T18:00:19.133Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017817-__pollDeferred.json","level":"debug"}
{"seq":56631,"timestamp":"2026-04-28T18:00:19.142Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017817 type=__pollDeferred","level":"info"}
```
