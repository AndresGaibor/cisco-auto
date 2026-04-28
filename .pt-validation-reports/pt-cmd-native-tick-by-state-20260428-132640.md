# pt cmd native tick by state

Fecha: Tue Apr 28 13:26:40 -05 2026

## grep source
```
536:  function shouldTryNativeFallback(job: ActiveJob, now: number): boolean {
560:  function tickNativeFallback(job: ActiveJob, reason: string): boolean {
565:      "native-tick reason=" +
579:    if (!shouldTryNativeFallback(job, now)) {
780:      const completedFromNative = tickNativeFallback(job, "reapStaleJobs");
1394:    getJob: function (id) {
1398:        tickNativeFallback(job, "getJob");
1404:    getJobState: function (id: string) {
1408:        tickNativeFallback(job, "getJobState");
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
1865:    function shouldTryNativeFallback(job, now) {
1881:    function tickNativeFallback(job, reason) {
1883:        jobDebug(job, "native-tick reason=" +
1895:        if (!shouldTryNativeFallback(job, now)) {
1957:        jobDebug(job, "native-fallback-enter reason=" + reason);
1979:        jobDebug(job, "native-check command=" +
2061:            var completedFromNative = tickNativeFallback(job, "reapStaleJobs");
2607:                tickNativeFallback(job, "getJob");
2615:                tickNativeFallback(job, "getJobState");
2624:                    tickNativeFallback(job, "getActiveJobs");
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
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"tail\":\"      : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST> \\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018081",
      "seq": 18081,
      "type": "omni.evaluate.raw",
      "startedAt": 1777400806137,
      "completedAt": 1777400806546,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"tail\":\"      : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST> \\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777400806043,
        "resultSeenAt": 1777400806587,
        "receivedAt": 1777400806587,
        "waitMs": 544,
        "completedAtMs": 1777400806546
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.7s
```

## pt cmd
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000018083","seq":18083,"type":"terminal.plan.run","startedAt":1777400808259,"completedAt":1777400808377,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","job":{"id":"cmd-6acaa2a5","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}},"timings":{"sentAt":1777400808202,"resultSeenAt":1777400808408,"receivedAt":1777400808408,"waitMs":206,"completedAtMs":1777400808377}}
[terminal-plan-run-debug] submitValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","job":{"id":"cmd-6acaa2a5","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}
[terminal-plan-run-debug] isDeferredValue=true
[terminal-plan-run-debug] ENTER deferred polling ticket=cmd-6acaa2a5
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=0
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":209,"idleMs":209,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=464
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":669,"idleMs":669,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=930
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":1210,"idleMs":1210,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=1479
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":1711,"idleMs":1711,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=1942
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":2201,"idleMs":2201,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=2435
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":2696,"idleMs":2696,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=2936
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":3202,"idleMs":3202,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=3435
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":3697,"idleMs":3697,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=3937
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":4204,"idleMs":4204,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=4432
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":4705,"idleMs":4705,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=4937
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":5209,"idleMs":5209,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=5440
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":5704,"idleMs":5704,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=5937
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":6204,"idleMs":6204,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=6436
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":6705,"idleMs":6705,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=6978
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":7206,"idleMs":7206,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=7435
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":7707,"idleMs":7707,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=7936
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":8208,"idleMs":8208,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=8437
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":8705,"idleMs":8705,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=8937
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":9209,"idleMs":9209,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=9485
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":9710,"idleMs":9710,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=9942
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":10211,"idleMs":10211,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=10490
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":10712,"idleMs":10712,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=10941
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":11213,"idleMs":11213,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=11490
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":11714,"idleMs":11714,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=11954
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":12219,"idleMs":12219,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=12496
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":12715,"idleMs":12715,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=12959
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":13216,"idleMs":13216,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=13491
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":13718,"idleMs":13718,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=13955
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":14216,"idleMs":14216,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=14483
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":14718,"idleMs":14718,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=14946
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":15218,"idleMs":15218,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=15491
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":15718,"idleMs":15718,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=15956
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":16217,"idleMs":16217,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=16490
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":16718,"idleMs":16718,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=16955
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":17231,"idleMs":17231,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=17489
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":17730,"idleMs":17730,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=17992
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":18217,"idleMs":18217,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=18458
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":18718,"idleMs":18718,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=18993
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":19218,"idleMs":19218,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=19459
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":19719,"idleMs":19719,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=19992
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":20218,"idleMs":20218,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=20457
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":20719,"idleMs":20719,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=20990
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":21219,"idleMs":21219,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=21456
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":21720,"idleMs":21720,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=21991
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":22218,"idleMs":22218,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=22456
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":22719,"idleMs":22719,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=22993
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":23218,"idleMs":23218,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=23457
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":23718,"idleMs":23718,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=23990
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":24219,"idleMs":24219,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=24455
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":24731,"idleMs":24731,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=24991
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":25219,"idleMs":25219,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=25456
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":25721,"idleMs":25721,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=25991
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":26219,"idleMs":26219,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=26454
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":26734,"idleMs":26734,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=26991
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":27219,"idleMs":27219,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=27457
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":27721,"idleMs":27721,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=27991
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":28219,"idleMs":28219,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=28458
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-6acaa2a5","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777400808311,"ageMs":28720,"idleMs":28720,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-6acaa2a5 elapsedMs=28992
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018142.json -----
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018141.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 28720,
  "idleMs": 28720,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018140.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 28219,
  "idleMs": 28219,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018139.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 27721,
  "idleMs": 27721,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018138.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 27219,
  "idleMs": 27219,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018137.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 26734,
  "idleMs": 26734,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018136.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 26219,
  "idleMs": 26219,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018135.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 25721,
  "idleMs": 25721,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018134.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 25219,
  "idleMs": 25219,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018133.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 24731,
  "idleMs": 24731,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018132.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 24219,
  "idleMs": 24219,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018131.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 23718,
  "idleMs": 23718,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018130.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 23218,
  "idleMs": 23218,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018129.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 22719,
  "idleMs": 22719,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018128.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 22218,
  "idleMs": 22218,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018127.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 21720,
  "idleMs": 21720,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018126.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 21219,
  "idleMs": 21219,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018125.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 20719,
  "idleMs": 20719,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018124.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 20218,
  "idleMs": 20218,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018123.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 19719,
  "idleMs": 19719,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018122.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 19218,
  "idleMs": 19218,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018121.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 18718,
  "idleMs": 18718,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018120.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 18217,
  "idleMs": 18217,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018119.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 17730,
  "idleMs": 17730,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018118.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 17231,
  "idleMs": 17231,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018117.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 16718,
  "idleMs": 16718,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018116.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 16217,
  "idleMs": 16217,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018115.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 15718,
  "idleMs": 15718,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018114.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 15218,
  "idleMs": 15218,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018113.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 14718,
  "idleMs": 14718,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018112.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 14216,
  "idleMs": 14216,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018111.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 13718,
  "idleMs": 13718,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018110.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 13216,
  "idleMs": 13216,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018109.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 12715,
  "idleMs": 12715,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018108.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 12219,
  "idleMs": 12219,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018107.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 11714,
  "idleMs": 11714,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018106.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 11213,
  "idleMs": 11213,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018105.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 10712,
  "idleMs": 10712,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018104.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 10211,
  "idleMs": 10211,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018103.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 9710,
  "idleMs": 9710,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018102.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 9209,
  "idleMs": 9209,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018101.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 8705,
  "idleMs": 8705,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018100.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 8208,
  "idleMs": 8208,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018099.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 7707,
  "idleMs": 7707,
  "debug": [],
  "stepResults": []
}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000018098.json -----
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-6acaa2a5",
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
  "updatedAt": 1777400808311,
  "ageMs": 7206,
  "idleMs": 7206,
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
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputTail\":\"umber        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST> \\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018143",
      "seq": 18143,
      "type": "omni.evaluate.raw",
      "startedAt": 1777400840460,
      "completedAt": 1777400840532,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputTail\":\"umber        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST> \\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777400840375,
        "resultSeenAt": 1777400840544,
        "receivedAt": 1777400840544,
        "waitMs": 169,
        "completedAtMs": 1777400840532
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
