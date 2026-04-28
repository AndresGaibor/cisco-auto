# pt cmd getJobState reap fix

Fecha: Tue Apr 28 13:09:26 -05 2026

## grep source
```
69:  getJobState(jobId: string): JobContext | null;
692:  function reapStaleJobs(): void {
693:    execLog("REAP STALE JOBS tick");
717:            "reapStaleJobs elapsedMs=" + elapsedMs,
1311:      execLog("GET JOB STATE id=" + id + " invoking reapStaleJobs");
1312:      reapStaleJobs();
1315:    getJobState: function (id: string) {
1316:      execLog("GET JOB STATE id=" + id + " invoking reapStaleJobs");
1317:      reapStaleJobs();
1321:      reapStaleJobs();
```

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
      "id": "cmd_000000017884",
      "seq": 17884,
      "type": "omni.evaluate.raw",
      "startedAt": 1777399773815,
      "completedAt": 1777399774277,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"tail\":\"       : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777399773652,
        "resultSeenAt": 1777399774315,
        "receivedAt": 1777399774315,
        "waitMs": 663,
        "completedAtMs": 1777399774277
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
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000017886","seq":17886,"type":"terminal.plan.run","startedAt":1777399775388,"completedAt":1777399775553,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","job":{"id":"cmd-723ae5f0","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}},"timings":{"sentAt":1777399775355,"resultSeenAt":1777399775569,"receivedAt":1777399775569,"waitMs":214,"completedAtMs":1777399775553}}
[terminal-plan-run-debug] submitValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","job":{"id":"cmd-723ae5f0","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}
[terminal-plan-run-debug] isDeferredValue=true
[terminal-plan-run-debug] ENTER deferred polling ticket=cmd-723ae5f0
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=0
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":308,"idleMs":308,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=529
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":764,"idleMs":764,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=992
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":1246,"idleMs":1246,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=1458
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":1744,"idleMs":1744,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=1922
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":2149,"idleMs":2149,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=2370
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":2648,"idleMs":2648,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=2835
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":3046,"idleMs":3046,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=3244
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":3456,"idleMs":3456,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=3654
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":3943,"idleMs":3943,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=4171
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":4448,"idleMs":4448,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=4638
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":4845,"idleMs":4845,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=5043
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":5244,"idleMs":5244,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=5449
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":5644,"idleMs":5644,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=5855
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":6151,"idleMs":6151,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=6376
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":6648,"idleMs":6648,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=6843
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":7047,"idleMs":7047,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=7253
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":7616,"idleMs":7616,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=7828
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":8050,"idleMs":8050,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=8236
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":8451,"idleMs":8451,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=8646
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":8844,"idleMs":8844,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=9054
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":9350,"idleMs":9350,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=9577
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":9845,"idleMs":9845,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=10045
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":10244,"idleMs":10244,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=10453
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":10646,"idleMs":10646,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=10860
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":11149,"idleMs":11149,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=11374
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":11647,"idleMs":11647,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=11840
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":12046,"idleMs":12046,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=12247
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":12443,"idleMs":12443,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=12654
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":12949,"idleMs":12949,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=13175
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":13450,"idleMs":13450,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=13642
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":13847,"idleMs":13847,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=14050
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":14247,"idleMs":14247,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=14455
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":14749,"idleMs":14749,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=14974
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":15247,"idleMs":15247,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=15438
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":15645,"idleMs":15645,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=15849
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":16046,"idleMs":16046,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=16256
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":16553,"idleMs":16553,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=16777
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":17049,"idleMs":17049,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=17245
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":17446,"idleMs":17446,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=17649
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":17845,"idleMs":17845,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=18057
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":18347,"idleMs":18347,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=18572
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":18855,"idleMs":18855,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=19037
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":19247,"idleMs":19247,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=19443
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":19646,"idleMs":19646,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=19854
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":20149,"idleMs":20149,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=20373
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":20651,"idleMs":20651,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=20838
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":21047,"idleMs":21047,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=21245
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":21445,"idleMs":21445,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=21653
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":21949,"idleMs":21949,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=22172
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":22448,"idleMs":22448,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=22638
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":22848,"idleMs":22848,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=23043
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":23246,"idleMs":23246,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=23452
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":23750,"idleMs":23750,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=24015
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":24259,"idleMs":24259,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=24469
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":24752,"idleMs":24752,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=24936
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":25155,"idleMs":25155,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=25344
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":25573,"idleMs":25573,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=25759
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":26048,"idleMs":26048,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=26271
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":26551,"idleMs":26551,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=26735
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":26945,"idleMs":26945,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=27141
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":27346,"idleMs":27346,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=27550
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":27745,"idleMs":27745,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=27956
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":28250,"idleMs":28250,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=28475
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-723ae5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777399775429,"ageMs":28748,"idleMs":28748,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-723ae5f0 elapsedMs=28942
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000017951.json -----
{'id': 'cmd_000000017951', 'seq': 17951, 'type': '__pollDeferred', 'status': 'failed', 'ok': False}
value= {'done': True, 'ok': False, 'status': 1, 'result': None, 'error': 'Job timed out while waiting for terminal command completion', 'code': 'JOB_TIMEOUT', 'errorCode': 'JOB_TIMEOUT', 'raw': '', 'output': '', 'source': 'terminal', 'session': {'mode': 'unknown', 'prompt': '', 'paging': False, 'awaitingConfirm': False}}
error= {'code': 'JOB_TIMEOUT', 'message': 'Job timed out while waiting for terminal command completion', 'phase': 'execution'}

----- /Users/andresgaibor/pt-dev/results/cmd_000000017950.json -----
{'id': 'cmd_000000017950', 'seq': 17950, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 28748, 'idleMs': 28748, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017949.json -----
{'id': 'cmd_000000017949', 'seq': 17949, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 28250, 'idleMs': 28250, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017948.json -----
{'id': 'cmd_000000017948', 'seq': 17948, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 27745, 'idleMs': 27745, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017947.json -----
{'id': 'cmd_000000017947', 'seq': 17947, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 27346, 'idleMs': 27346, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017946.json -----
{'id': 'cmd_000000017946', 'seq': 17946, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 26945, 'idleMs': 26945, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017945.json -----
{'id': 'cmd_000000017945', 'seq': 17945, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 26551, 'idleMs': 26551, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017944.json -----
{'id': 'cmd_000000017944', 'seq': 17944, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 26048, 'idleMs': 26048, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017943.json -----
{'id': 'cmd_000000017943', 'seq': 17943, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 25573, 'idleMs': 25573, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017942.json -----
{'id': 'cmd_000000017942', 'seq': 17942, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 25155, 'idleMs': 25155, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017941.json -----
{'id': 'cmd_000000017941', 'seq': 17941, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 24752, 'idleMs': 24752, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017940.json -----
{'id': 'cmd_000000017940', 'seq': 17940, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 24259, 'idleMs': 24259, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017939.json -----
{'id': 'cmd_000000017939', 'seq': 17939, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 23750, 'idleMs': 23750, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017938.json -----
{'id': 'cmd_000000017938', 'seq': 17938, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 23246, 'idleMs': 23246, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017937.json -----
{'id': 'cmd_000000017937', 'seq': 17937, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 22848, 'idleMs': 22848, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017936.json -----
{'id': 'cmd_000000017936', 'seq': 17936, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 22448, 'idleMs': 22448, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017935.json -----
{'id': 'cmd_000000017935', 'seq': 17935, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 21949, 'idleMs': 21949, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017934.json -----
{'id': 'cmd_000000017934', 'seq': 17934, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 21445, 'idleMs': 21445, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017933.json -----
{'id': 'cmd_000000017933', 'seq': 17933, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 21047, 'idleMs': 21047, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017932.json -----
{'id': 'cmd_000000017932', 'seq': 17932, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 20651, 'idleMs': 20651, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017931.json -----
{'id': 'cmd_000000017931', 'seq': 17931, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 20149, 'idleMs': 20149, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017930.json -----
{'id': 'cmd_000000017930', 'seq': 17930, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 19646, 'idleMs': 19646, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017929.json -----
{'id': 'cmd_000000017929', 'seq': 17929, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 19247, 'idleMs': 19247, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017928.json -----
{'id': 'cmd_000000017928', 'seq': 17928, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 18855, 'idleMs': 18855, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017927.json -----
{'id': 'cmd_000000017927', 'seq': 17927, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-723ae5f0', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777399775429, 'ageMs': 18347, 'idleMs': 18347, 'debug': [], 'stepResults': []}
error= None
```

## logs relevant
```
{"seq":68595,"timestamp":"2026-04-28T18:09:50.631Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017920-__pollDeferred.json\"]","level":"debug"}
{"seq":68596,"timestamp":"2026-04-28T18:09:50.635Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017920-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68597,"timestamp":"2026-04-28T18:09:50.639Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017920-__pollDeferred.json","level":"debug"}
{"seq":68599,"timestamp":"2026-04-28T18:09:50.647Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017920 type=__pollDeferred","level":"info"}
{"seq":68609,"timestamp":"2026-04-28T18:09:51.027Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017921-__pollDeferred.json\"]","level":"debug"}
{"seq":68610,"timestamp":"2026-04-28T18:09:51.031Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017921-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68611,"timestamp":"2026-04-28T18:09:51.037Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017921-__pollDeferred.json","level":"debug"}
{"seq":68613,"timestamp":"2026-04-28T18:09:51.045Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017921 type=__pollDeferred","level":"info"}
{"seq":68623,"timestamp":"2026-04-28T18:09:51.428Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017922-__pollDeferred.json\"]","level":"debug"}
{"seq":68624,"timestamp":"2026-04-28T18:09:51.432Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017922-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68625,"timestamp":"2026-04-28T18:09:51.435Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017922-__pollDeferred.json","level":"debug"}
{"seq":68627,"timestamp":"2026-04-28T18:09:51.444Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017922 type=__pollDeferred","level":"info"}
{"seq":68639,"timestamp":"2026-04-28T18:09:51.934Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017923-__pollDeferred.json\"]","level":"debug"}
{"seq":68640,"timestamp":"2026-04-28T18:09:51.938Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017923-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68641,"timestamp":"2026-04-28T18:09:51.942Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017923-__pollDeferred.json","level":"debug"}
{"seq":68643,"timestamp":"2026-04-28T18:09:51.951Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017923 type=__pollDeferred","level":"info"}
{"seq":68655,"timestamp":"2026-04-28T18:09:52.433Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017924-__pollDeferred.json\"]","level":"debug"}
{"seq":68656,"timestamp":"2026-04-28T18:09:52.437Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017924-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68657,"timestamp":"2026-04-28T18:09:52.441Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017924-__pollDeferred.json","level":"debug"}
{"seq":68659,"timestamp":"2026-04-28T18:09:52.449Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017924 type=__pollDeferred","level":"info"}
{"seq":68669,"timestamp":"2026-04-28T18:09:52.827Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017925-__pollDeferred.json\"]","level":"debug"}
{"seq":68670,"timestamp":"2026-04-28T18:09:52.831Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017925-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68671,"timestamp":"2026-04-28T18:09:52.837Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017925-__pollDeferred.json","level":"debug"}
{"seq":68673,"timestamp":"2026-04-28T18:09:52.845Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017925 type=__pollDeferred","level":"info"}
{"seq":68683,"timestamp":"2026-04-28T18:09:53.227Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017926-__pollDeferred.json\"]","level":"debug"}
{"seq":68684,"timestamp":"2026-04-28T18:09:53.231Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017926-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68685,"timestamp":"2026-04-28T18:09:53.235Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017926-__pollDeferred.json","level":"debug"}
{"seq":68687,"timestamp":"2026-04-28T18:09:53.243Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017926 type=__pollDeferred","level":"info"}
{"seq":68699,"timestamp":"2026-04-28T18:09:53.729Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017927-__pollDeferred.json\"]","level":"debug"}
{"seq":68700,"timestamp":"2026-04-28T18:09:53.733Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017927-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68701,"timestamp":"2026-04-28T18:09:53.737Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017927-__pollDeferred.json","level":"debug"}
{"seq":68703,"timestamp":"2026-04-28T18:09:53.745Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017927 type=__pollDeferred","level":"info"}
{"seq":68715,"timestamp":"2026-04-28T18:09:54.239Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017928-__pollDeferred.json\"]","level":"debug"}
{"seq":68716,"timestamp":"2026-04-28T18:09:54.243Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017928-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68717,"timestamp":"2026-04-28T18:09:54.247Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017928-__pollDeferred.json","level":"debug"}
{"seq":68719,"timestamp":"2026-04-28T18:09:54.256Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017928 type=__pollDeferred","level":"info"}
{"seq":68729,"timestamp":"2026-04-28T18:09:54.628Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017929-__pollDeferred.json\"]","level":"debug"}
{"seq":68730,"timestamp":"2026-04-28T18:09:54.632Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017929-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68731,"timestamp":"2026-04-28T18:09:54.639Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017929-__pollDeferred.json","level":"debug"}
{"seq":68733,"timestamp":"2026-04-28T18:09:54.647Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017929 type=__pollDeferred","level":"info"}
{"seq":68743,"timestamp":"2026-04-28T18:09:55.028Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017930-__pollDeferred.json\"]","level":"debug"}
{"seq":68744,"timestamp":"2026-04-28T18:09:55.032Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017930-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68745,"timestamp":"2026-04-28T18:09:55.036Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017930-__pollDeferred.json","level":"debug"}
{"seq":68747,"timestamp":"2026-04-28T18:09:55.044Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017930 type=__pollDeferred","level":"info"}
{"seq":68759,"timestamp":"2026-04-28T18:09:55.531Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017931-__pollDeferred.json\"]","level":"debug"}
{"seq":68760,"timestamp":"2026-04-28T18:09:55.535Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017931-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68761,"timestamp":"2026-04-28T18:09:55.539Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017931-__pollDeferred.json","level":"debug"}
{"seq":68763,"timestamp":"2026-04-28T18:09:55.547Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017931 type=__pollDeferred","level":"info"}
{"seq":68775,"timestamp":"2026-04-28T18:09:56.034Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017932-__pollDeferred.json\"]","level":"debug"}
{"seq":68776,"timestamp":"2026-04-28T18:09:56.038Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017932-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68777,"timestamp":"2026-04-28T18:09:56.042Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017932-__pollDeferred.json","level":"debug"}
{"seq":68779,"timestamp":"2026-04-28T18:09:56.051Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017932 type=__pollDeferred","level":"info"}
{"seq":68789,"timestamp":"2026-04-28T18:09:56.428Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017933-__pollDeferred.json\"]","level":"debug"}
{"seq":68790,"timestamp":"2026-04-28T18:09:56.432Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017933-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68791,"timestamp":"2026-04-28T18:09:56.439Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017933-__pollDeferred.json","level":"debug"}
{"seq":68793,"timestamp":"2026-04-28T18:09:56.447Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017933 type=__pollDeferred","level":"info"}
{"seq":68803,"timestamp":"2026-04-28T18:09:56.827Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017934-__pollDeferred.json\"]","level":"debug"}
{"seq":68804,"timestamp":"2026-04-28T18:09:56.831Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017934-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68805,"timestamp":"2026-04-28T18:09:56.835Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017934-__pollDeferred.json","level":"debug"}
{"seq":68807,"timestamp":"2026-04-28T18:09:56.843Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017934 type=__pollDeferred","level":"info"}
{"seq":68819,"timestamp":"2026-04-28T18:09:57.330Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017935-__pollDeferred.json\"]","level":"debug"}
{"seq":68820,"timestamp":"2026-04-28T18:09:57.334Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017935-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68821,"timestamp":"2026-04-28T18:09:57.338Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017935-__pollDeferred.json","level":"debug"}
{"seq":68823,"timestamp":"2026-04-28T18:09:57.347Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017935 type=__pollDeferred","level":"info"}
{"seq":68835,"timestamp":"2026-04-28T18:09:57.832Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017936-__pollDeferred.json\"]","level":"debug"}
{"seq":68836,"timestamp":"2026-04-28T18:09:57.836Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017936-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68837,"timestamp":"2026-04-28T18:09:57.840Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017936-__pollDeferred.json","level":"debug"}
{"seq":68839,"timestamp":"2026-04-28T18:09:57.849Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017936 type=__pollDeferred","level":"info"}
{"seq":68849,"timestamp":"2026-04-28T18:09:58.230Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017937-__pollDeferred.json\"]","level":"debug"}
{"seq":68850,"timestamp":"2026-04-28T18:09:58.234Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017937-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68851,"timestamp":"2026-04-28T18:09:58.240Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017937-__pollDeferred.json","level":"debug"}
{"seq":68853,"timestamp":"2026-04-28T18:09:58.248Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017937 type=__pollDeferred","level":"info"}
{"seq":68863,"timestamp":"2026-04-28T18:09:58.628Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017938-__pollDeferred.json\"]","level":"debug"}
{"seq":68864,"timestamp":"2026-04-28T18:09:58.632Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017938-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68865,"timestamp":"2026-04-28T18:09:58.636Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017938-__pollDeferred.json","level":"debug"}
{"seq":68867,"timestamp":"2026-04-28T18:09:58.644Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017938 type=__pollDeferred","level":"info"}
{"seq":68879,"timestamp":"2026-04-28T18:09:59.131Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017939-__pollDeferred.json\"]","level":"debug"}
{"seq":68880,"timestamp":"2026-04-28T18:09:59.135Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017939-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68881,"timestamp":"2026-04-28T18:09:59.139Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017939-__pollDeferred.json","level":"debug"}
{"seq":68883,"timestamp":"2026-04-28T18:09:59.147Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017939 type=__pollDeferred","level":"info"}
{"seq":68895,"timestamp":"2026-04-28T18:09:59.634Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017940-__pollDeferred.json\"]","level":"debug"}
{"seq":68896,"timestamp":"2026-04-28T18:09:59.639Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017940-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68897,"timestamp":"2026-04-28T18:09:59.643Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017940-__pollDeferred.json","level":"debug"}
{"seq":68899,"timestamp":"2026-04-28T18:09:59.653Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017940 type=__pollDeferred","level":"info"}
{"seq":68911,"timestamp":"2026-04-28T18:10:00.133Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017941-__pollDeferred.json\"]","level":"debug"}
{"seq":68912,"timestamp":"2026-04-28T18:10:00.138Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017941-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68913,"timestamp":"2026-04-28T18:10:00.142Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017941-__pollDeferred.json","level":"debug"}
{"seq":68915,"timestamp":"2026-04-28T18:10:00.151Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017941 type=__pollDeferred","level":"info"}
{"seq":68925,"timestamp":"2026-04-28T18:10:00.528Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017942-__pollDeferred.json\"]","level":"debug"}
{"seq":68926,"timestamp":"2026-04-28T18:10:00.533Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017942-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68927,"timestamp":"2026-04-28T18:10:00.540Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017942-__pollDeferred.json","level":"debug"}
{"seq":68929,"timestamp":"2026-04-28T18:10:00.550Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017942 type=__pollDeferred","level":"info"}
{"seq":68939,"timestamp":"2026-04-28T18:10:00.940Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017943-__pollDeferred.json\"]","level":"debug"}
{"seq":68940,"timestamp":"2026-04-28T18:10:00.946Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017943-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68941,"timestamp":"2026-04-28T18:10:00.951Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017943-__pollDeferred.json","level":"debug"}
{"seq":68943,"timestamp":"2026-04-28T18:10:00.961Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017943 type=__pollDeferred","level":"info"}
{"seq":68955,"timestamp":"2026-04-28T18:10:01.428Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017944-__pollDeferred.json\"]","level":"debug"}
{"seq":68956,"timestamp":"2026-04-28T18:10:01.433Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017944-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68957,"timestamp":"2026-04-28T18:10:01.437Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017944-__pollDeferred.json","level":"debug"}
{"seq":68959,"timestamp":"2026-04-28T18:10:01.445Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017944 type=__pollDeferred","level":"info"}
{"seq":68971,"timestamp":"2026-04-28T18:10:01.934Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017945-__pollDeferred.json\"]","level":"debug"}
{"seq":68972,"timestamp":"2026-04-28T18:10:01.938Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017945-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68973,"timestamp":"2026-04-28T18:10:01.942Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017945-__pollDeferred.json","level":"debug"}
{"seq":68975,"timestamp":"2026-04-28T18:10:01.951Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017945 type=__pollDeferred","level":"info"}
{"seq":68985,"timestamp":"2026-04-28T18:10:02.326Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017946-__pollDeferred.json\"]","level":"debug"}
{"seq":68986,"timestamp":"2026-04-28T18:10:02.330Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017946-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":68987,"timestamp":"2026-04-28T18:10:02.337Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017946-__pollDeferred.json","level":"debug"}
{"seq":68989,"timestamp":"2026-04-28T18:10:02.345Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017946 type=__pollDeferred","level":"info"}
{"seq":68999,"timestamp":"2026-04-28T18:10:02.727Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017947-__pollDeferred.json\"]","level":"debug"}
{"seq":69000,"timestamp":"2026-04-28T18:10:02.731Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017947-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":69001,"timestamp":"2026-04-28T18:10:02.735Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017947-__pollDeferred.json","level":"debug"}
{"seq":69003,"timestamp":"2026-04-28T18:10:02.744Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017947 type=__pollDeferred","level":"info"}
{"seq":69013,"timestamp":"2026-04-28T18:10:03.127Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017948-__pollDeferred.json\"]","level":"debug"}
{"seq":69014,"timestamp":"2026-04-28T18:10:03.133Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017948-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":69015,"timestamp":"2026-04-28T18:10:03.137Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017948-__pollDeferred.json","level":"debug"}
{"seq":69017,"timestamp":"2026-04-28T18:10:03.145Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017948 type=__pollDeferred","level":"info"}
{"seq":69029,"timestamp":"2026-04-28T18:10:03.631Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017949-__pollDeferred.json\"]","level":"debug"}
{"seq":69030,"timestamp":"2026-04-28T18:10:03.636Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017949-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":69031,"timestamp":"2026-04-28T18:10:03.639Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017949-__pollDeferred.json","level":"debug"}
{"seq":69033,"timestamp":"2026-04-28T18:10:03.650Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017949 type=__pollDeferred","level":"info"}
{"seq":69045,"timestamp":"2026-04-28T18:10:04.130Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017950-__pollDeferred.json\"]","level":"debug"}
{"seq":69046,"timestamp":"2026-04-28T18:10:04.134Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017950-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":69047,"timestamp":"2026-04-28T18:10:04.138Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017950-__pollDeferred.json","level":"debug"}
{"seq":69049,"timestamp":"2026-04-28T18:10:04.148Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017950 type=__pollDeferred","level":"info"}
{"seq":69059,"timestamp":"2026-04-28T18:10:04.536Z","scope":"queue","message":"[queue-claim] candidatos: 1 [\"000000017951-__pollDeferred.json\"]","level":"debug"}
{"seq":69060,"timestamp":"2026-04-28T18:10:04.540Z","scope":"queue","message":"[queue-claim] claim nuevo: 000000017951-__pollDeferred.json modo=atomic-move","level":"debug"}
{"seq":69061,"timestamp":"2026-04-28T18:10:04.544Z","scope":"queue","message":"[queue-claim] parseado OK: 000000017951-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":69062,"timestamp":"2026-04-28T18:10:04.549Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017951 type=__pollDeferred","level":"info"}
```
