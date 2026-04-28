# pt cmd native debug visible

Fecha: Tue Apr 28 13:21:44 -05 2026

## grep source
```
packages/pt-runtime/src/pt/kernel/execution-engine.ts:108:      debug: [],
packages/pt-runtime/src/pt/kernel/execution-engine.ts:536:  function jobDebug(job: ActiveJob, message: string): void {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:601:    jobDebug(job, "native-fallback-enter reason=" + reason);
packages/pt-runtime/src/pt/kernel/execution-engine.ts:604:    jobDebug(job, "native-output-len=" + String(output.length));
packages/pt-runtime/src/pt/kernel/execution-engine.ts:607:      jobDebug(job, "native-no-output");
packages/pt-runtime/src/pt/kernel/execution-engine.ts:631:    jobDebug(
packages/pt-runtime/src/pt/kernel/execution-engine.ts:633:      "native-check command=" +
packages/pt-runtime/src/pt/kernel/execution-engine.ts:1343:    getJobState: function (id: string) {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:1374:    debug: (ctx as any).debug || [],
packages/pt-runtime/src/pt/kernel/runtime-api.ts:109:    getJobState: function (id: string) {
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
1924:        jobDebug(job, "native-output-len=" + String(output.length));
1926:            jobDebug(job, "native-no-output");
1944:        jobDebug(job, "native-check command=" +
2570:        getJobState: function (id) {
2599:        debug: ctx.debug || [],
3001:        getJobState: function (id) {
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
      "id": "cmd_000000018017",
      "seq": 18017,
      "type": "omni.evaluate.raw",
      "startedAt": 1777400510201,
      "completedAt": 1777400510750,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"tail\":\"       : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777400510112,
        "resultSeenAt": 1777400510765,
        "receivedAt": 1777400510765,
        "waitMs": 653,
        "completedAtMs": 1777400510750
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.9s
```

## pt cmd
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000018019","seq":18019,"type":"terminal.plan.run","startedAt":1777400512004,"completedAt":1777400512177,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-d8812d83","job":{"id":"cmd-d8812d83","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}},"timings":{"sentAt":1777400511976,"resultSeenAt":1777400512241,"receivedAt":1777400512241,"waitMs":265,"completedAtMs":1777400512177}}
[terminal-plan-run-debug] submitValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","job":{"id":"cmd-d8812d83","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}
[terminal-plan-run-debug] isDeferredValue=true
[terminal-plan-run-debug] ENTER deferred polling ticket=cmd-d8812d83
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=0
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512071,"ageMs":394,"idleMs":394,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=559
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":827,"idleMs":259,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=1002
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":1330,"idleMs":762,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=1500
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":1833,"idleMs":1265,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=1999
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":2338,"idleMs":1770,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=2501
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":2843,"idleMs":2275,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=3000
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":3336,"idleMs":2768,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=3502
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":3835,"idleMs":3267,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=3998
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":4335,"idleMs":3767,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=4499
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":4836,"idleMs":4268,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=5000
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":5333,"idleMs":4765,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=5500
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":5838,"idleMs":5270,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=6000
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":6334,"idleMs":5766,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=6499
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":6834,"idleMs":6266,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=7001
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":7336,"idleMs":6768,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=7501
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":7840,"idleMs":7272,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=8001
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":8336,"idleMs":7768,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=8500
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":8840,"idleMs":8272,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=9004
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":9337,"idleMs":8769,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=9499
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":9845,"idleMs":9277,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=10001
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":10342,"idleMs":9774,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=10500
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":10854,"idleMs":10286,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=11054
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":11349,"idleMs":10781,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=11518
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":11844,"idleMs":11276,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=12000
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":12345,"idleMs":11777,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=12504
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":12847,"idleMs":12279,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=13051
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":13348,"idleMs":12780,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=13503
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":13847,"idleMs":13279,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=14051
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":14351,"idleMs":13783,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=14516
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":14848,"idleMs":14280,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=15050
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":15349,"idleMs":14781,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=15514
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":15848,"idleMs":15280,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=16053
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":16352,"idleMs":15784,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=16516
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":16851,"idleMs":16283,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=17055
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":17388,"idleMs":16820,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=17559
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":17863,"idleMs":17295,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=18025
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":18355,"idleMs":17787,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=18557
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":18850,"idleMs":18282,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=19023
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":19353,"idleMs":18785,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=19557
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":19858,"idleMs":19290,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=20022
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":20353,"idleMs":19785,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=20556
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":20896,"idleMs":20328,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=21058
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":21357,"idleMs":20789,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=21523
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":21850,"idleMs":21282,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=22054
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":22353,"idleMs":21785,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=22517
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":22851,"idleMs":22283,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=23054
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":23351,"idleMs":22783,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=23517
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":23853,"idleMs":23285,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=24056
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":24352,"idleMs":23784,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=24523
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":24851,"idleMs":24283,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=25051
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":25352,"idleMs":24784,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=25515
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":25852,"idleMs":25284,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=26054
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":26353,"idleMs":25785,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=26517
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":26870,"idleMs":26302,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=27061
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":27457,"idleMs":26889,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=27638
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":27969,"idleMs":27401,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=28153
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":28467,"idleMs":27899,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=28654
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":28965,"idleMs":28397,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=29160
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d8812d83","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400512639,"ageMs":29457,"idleMs":28889,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d8812d83 elapsedMs=29627
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
⏱ pt cmd · 30.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## latest poll results
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000018079.json -----
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018078.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 29457,
  "idleMs": 28889,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018077.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 28965,
  "idleMs": 28397,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018076.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 28467,
  "idleMs": 27899,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018075.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 27969,
  "idleMs": 27401,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018074.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 27457,
  "idleMs": 26889,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018073.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 26870,
  "idleMs": 26302,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018072.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 26353,
  "idleMs": 25785,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018071.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 25852,
  "idleMs": 25284,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018070.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 25352,
  "idleMs": 24784,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018069.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 24851,
  "idleMs": 24283,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018068.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 24352,
  "idleMs": 23784,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018067.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 23853,
  "idleMs": 23285,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018066.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 23351,
  "idleMs": 22783,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018065.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 22851,
  "idleMs": 22283,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018064.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 22353,
  "idleMs": 21785,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018063.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 21850,
  "idleMs": 21282,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018062.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 21357,
  "idleMs": 20789,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018061.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 20896,
  "idleMs": 20328,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018060.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 20353,
  "idleMs": 19785,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018059.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 19858,
  "idleMs": 19290,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018058.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 19353,
  "idleMs": 18785,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018057.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 18850,
  "idleMs": 18282,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018056.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 18355,
  "idleMs": 17787,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018055.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 17863,
  "idleMs": 17295,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018054.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 17388,
  "idleMs": 16820,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018053.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 16851,
  "idleMs": 16283,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018052.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 16352,
  "idleMs": 15784,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018051.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 15848,
  "idleMs": 15280,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018050.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 15349,
  "idleMs": 14781,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018049.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 14848,
  "idleMs": 14280,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018048.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 14351,
  "idleMs": 13783,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018047.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 13847,
  "idleMs": 13279,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018046.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 13348,
  "idleMs": 12780,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018045.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-d8812d83",
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
  "updatedAt": 1777400512639,
  "ageMs": 12847,
  "idleMs": 12279,
  "debug": [],
  "stepResults": []
}
error= None
```

## terminal after
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function safe(name){ try { if(t && typeof t[name] === \"function\") return String(t[name]()); return \"<no-method>\"; } catch(e) { return \"<err:\" + String(e) + \">\"; } }
return JSON.stringify({ prompt: safe(\"getPrompt\"), mode: safe(\"getMode\"), input: safe(\"getCommandInput\"), outputTail: safe(\"getOutput\").slice(-2200) });
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function safe(name){ try { if(t && typeof t[name] === \"function\") return String(t[name]()); return \"<no-method>\"; } catch(e) { return \"<err:\" + String(e) + \">\"; } }
return JSON.stringify({ prompt: safe(\"getPrompt\"), mode: safe(\"getMode\"), input: safe(\"getCommandInput\"), outputTail: safe(\"getOutput\").slice(-2200) });
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 443,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nfunction safe(name){ try { if(t && typeof t[name] === \"function\") return String(t[name]()); return \"<no-method>\"; } catch(e) { return \"<err:\" + String(e) + \">\"; } }\nreturn JSON.stringify({ prompt: safe(\"getPrompt\"), mode: safe(\"getMode\"), input: safe(\"getCommandInput\"), outputTail: safe(\"getOutput\").slice(-2200) });\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\" \",\"outputTail\":\"umber        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST> \"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018080",
      "seq": 18080,
      "type": "omni.evaluate.raw",
      "startedAt": 1777400544557,
      "completedAt": 1777400544624,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\" \",\"outputTail\":\"umber        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST> \"}"
      },
      "timings": {
        "sentAt": 1777400544436,
        "resultSeenAt": 1777400544646,
        "receivedAt": 1777400544646,
        "waitMs": 210,
        "completedAtMs": 1777400544624
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
