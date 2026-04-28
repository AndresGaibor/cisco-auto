# pt-control deferred branch debug

Fecha: Tue Apr 28 12:53:54 -05 2026

## pt cmd show version with stderr debug
```
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000017681","seq":17681,"type":"terminal.plan.run","startedAt":1777398835967,"completedAt":1777398836127,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-d23971bc","job":{"id":"cmd-d23971bc","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}},"timings":{"sentAt":1777398835933,"resultSeenAt":1777398836140,"receivedAt":1777398836140,"waitMs":207,"completedAtMs":1777398836127}}
[terminal-plan-run-debug] submitValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","job":{"id":"cmd-d23971bc","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}
[terminal-plan-run-debug] isDeferredValue=true
[terminal-plan-run-debug] ENTER deferred polling ticket=cmd-d23971bc
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=0
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":199,"idleMs":199,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=412
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":680,"idleMs":680,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=881
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":1164,"idleMs":1164,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=1344
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":1562,"idleMs":1562,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=1754
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":1969,"idleMs":1969,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=2161
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":2368,"idleMs":2368,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=2572
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":2867,"idleMs":2867,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=3096
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":3364,"idleMs":3364,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=3566
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":3801,"idleMs":3801,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=4034
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":4260,"idleMs":4260,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=4441
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":4663,"idleMs":4663,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=4849
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":5064,"idleMs":5064,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=5244
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":5464,"idleMs":5464,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=5652
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":5864,"idleMs":5864,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=6047
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":6265,"idleMs":6265,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=6455
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":6663,"idleMs":6663,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=6864
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":7065,"idleMs":7065,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=7272
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":7561,"idleMs":7561,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=7743
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":7965,"idleMs":7965,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=8150
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":8362,"idleMs":8362,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=8559
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":8760,"idleMs":8760,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=8942
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":9167,"idleMs":9167,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=9350
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":9565,"idleMs":9565,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=9759
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":9964,"idleMs":9964,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=10167
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":10366,"idleMs":10366,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=10578
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":10866,"idleMs":10866,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=11044
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":11268,"idleMs":11268,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=11451
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":11669,"idleMs":11669,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=11860
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":12064,"idleMs":12064,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=12267
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":12468,"idleMs":12468,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=12677
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":12969,"idleMs":12969,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=13197
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":13464,"idleMs":13464,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=13665
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":13866,"idleMs":13866,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=14071
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":14266,"idleMs":14266,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=14478
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":14767,"idleMs":14767,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=14942
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":15165,"idleMs":15165,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=15352
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":15567,"idleMs":15567,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=15760
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":15965,"idleMs":15965,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=16166
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":16366,"idleMs":16366,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=16576
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":16865,"idleMs":16865,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=17042
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":17266,"idleMs":17266,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=17450
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":17664,"idleMs":17664,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=17857
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":18065,"idleMs":18065,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=18262
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":18463,"idleMs":18463,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=18646
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":18864,"idleMs":18864,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=19054
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":19266,"idleMs":19266,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=19462
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":19660,"idleMs":19660,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=19868
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":20066,"idleMs":20066,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=20277
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":20571,"idleMs":20571,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=20794
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":21067,"idleMs":21067,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=21259
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":21465,"idleMs":21465,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=21668
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":21906,"idleMs":21906,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=22136
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":22375,"idleMs":22375,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=22588
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":22874,"idleMs":22874,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=23054
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":23264,"idleMs":23264,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=23461
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":23667,"idleMs":23667,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=23869
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":24068,"idleMs":24068,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=24276
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":24568,"idleMs":24568,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=24795
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":25066,"idleMs":25066,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=25260
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":25464,"idleMs":25464,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=25685
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":26099,"idleMs":26099,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=26317
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":26691,"idleMs":26691,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=26900
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":27201,"idleMs":27201,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=27394
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":27668,"idleMs":27668,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=27861
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":28063,"idleMs":28063,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=28268
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":28470,"idleMs":28470,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=28676
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-d23971bc","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398836000,"ageMs":28973,"idleMs":28973,"debug":[],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-d23971bc elapsedMs=29196
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
⏱ pt cmd · 30.0s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## latest result files
```
total 592
-rw-r--r--@ 1 andresgaibor  staff   583 Apr 28 12:54 cmd_000000017749.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017748.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017747.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017746.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017745.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017744.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017743.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017742.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017741.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017740.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017739.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017738.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017737.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017736.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017735.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017734.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017733.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017732.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017731.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017730.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017729.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017728.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017727.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017726.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017725.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017724.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017723.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017722.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017721.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017720.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017719.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017718.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017717.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017716.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017715.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017714.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017713.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017712.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017711.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017710.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017709.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017708.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017707.json
-rw-r--r--@ 1 andresgaibor  staff   508 Apr 28 12:54 cmd_000000017706.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017705.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017704.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017703.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017702.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017701.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017700.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017699.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017698.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017697.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017696.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017695.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017694.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017693.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017692.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:54 cmd_000000017691.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:53 cmd_000000017690.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:53 cmd_000000017689.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:53 cmd_000000017688.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:53 cmd_000000017687.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:53 cmd_000000017686.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:53 cmd_000000017685.json
-rw-r--r--@ 1 andresgaibor  staff   506 Apr 28 12:53 cmd_000000017684.json
-rw-r--r--@ 1 andresgaibor  staff   504 Apr 28 12:53 cmd_000000017683.json
-rw-r--r--@ 1 andresgaibor  staff   504 Apr 28 12:53 cmd_000000017682.json
-rw-r--r--@ 1 andresgaibor  staff   894 Apr 28 12:53 cmd_000000017681.json
-rw-r--r--@ 1 andresgaibor  staff   285 Apr 28 12:53 cmd_000000017680.json
-rw-r--r--@ 1 andresgaibor  staff  1975 Apr 28 12:49 cmd_000000017679.json
-rw-r--r--@ 1 andresgaibor  staff   894 Apr 28 12:49 cmd_000000017677.json
-rw-r--r--@ 1 andresgaibor  staff   285 Apr 28 12:49 cmd_000000017676.json
-rw-r--r--@ 1 andresgaibor  staff   794 Apr 28 12:49 cmd_000000017675.json
```

## result summaries
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000017749.json -----
{'id': 'cmd_000000017749', 'seq': 17749, 'type': '__pollDeferred', 'status': 'failed', 'ok': False}
value= {'done': True, 'ok': False, 'status': 1, 'result': None, 'error': 'Job timed out while waiting for terminal command completion', 'code': 'JOB_TIMEOUT', 'errorCode': 'JOB_TIMEOUT', 'raw': '', 'output': '', 'source': 'terminal', 'session': {'mode': 'unknown', 'prompt': '', 'paging': False, 'awaitingConfirm': False}}
error= {'code': 'JOB_TIMEOUT', 'message': 'Job timed out while waiting for terminal command completion', 'phase': 'execution'}

----- /Users/andresgaibor/pt-dev/results/cmd_000000017748.json -----
{'id': 'cmd_000000017748', 'seq': 17748, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 28973, 'idleMs': 28973, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017747.json -----
{'id': 'cmd_000000017747', 'seq': 17747, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 28470, 'idleMs': 28470, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017746.json -----
{'id': 'cmd_000000017746', 'seq': 17746, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 28063, 'idleMs': 28063, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017745.json -----
{'id': 'cmd_000000017745', 'seq': 17745, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 27668, 'idleMs': 27668, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017744.json -----
{'id': 'cmd_000000017744', 'seq': 17744, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 27201, 'idleMs': 27201, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017743.json -----
{'id': 'cmd_000000017743', 'seq': 17743, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 26691, 'idleMs': 26691, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017742.json -----
{'id': 'cmd_000000017742', 'seq': 17742, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 26099, 'idleMs': 26099, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017741.json -----
{'id': 'cmd_000000017741', 'seq': 17741, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 25464, 'idleMs': 25464, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017740.json -----
{'id': 'cmd_000000017740', 'seq': 17740, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 25066, 'idleMs': 25066, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017739.json -----
{'id': 'cmd_000000017739', 'seq': 17739, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 24568, 'idleMs': 24568, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017738.json -----
{'id': 'cmd_000000017738', 'seq': 17738, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 24068, 'idleMs': 24068, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017737.json -----
{'id': 'cmd_000000017737', 'seq': 17737, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 23667, 'idleMs': 23667, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017736.json -----
{'id': 'cmd_000000017736', 'seq': 17736, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 23264, 'idleMs': 23264, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017735.json -----
{'id': 'cmd_000000017735', 'seq': 17735, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 22874, 'idleMs': 22874, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017734.json -----
{'id': 'cmd_000000017734', 'seq': 17734, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 22375, 'idleMs': 22375, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017733.json -----
{'id': 'cmd_000000017733', 'seq': 17733, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 21906, 'idleMs': 21906, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017732.json -----
{'id': 'cmd_000000017732', 'seq': 17732, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 21465, 'idleMs': 21465, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017731.json -----
{'id': 'cmd_000000017731', 'seq': 17731, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 21067, 'idleMs': 21067, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017730.json -----
{'id': 'cmd_000000017730', 'seq': 17730, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 20571, 'idleMs': 20571, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017729.json -----
{'id': 'cmd_000000017729', 'seq': 17729, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 20066, 'idleMs': 20066, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017728.json -----
{'id': 'cmd_000000017728', 'seq': 17728, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 19660, 'idleMs': 19660, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017727.json -----
{'id': 'cmd_000000017727', 'seq': 17727, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 19266, 'idleMs': 19266, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017726.json -----
{'id': 'cmd_000000017726', 'seq': 17726, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 18864, 'idleMs': 18864, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017725.json -----
{'id': 'cmd_000000017725', 'seq': 17725, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 18463, 'idleMs': 18463, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017724.json -----
{'id': 'cmd_000000017724', 'seq': 17724, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 18065, 'idleMs': 18065, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017723.json -----
{'id': 'cmd_000000017723', 'seq': 17723, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 17664, 'idleMs': 17664, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017722.json -----
{'id': 'cmd_000000017722', 'seq': 17722, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 17266, 'idleMs': 17266, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017721.json -----
{'id': 'cmd_000000017721', 'seq': 17721, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 16865, 'idleMs': 16865, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017720.json -----
{'id': 'cmd_000000017720', 'seq': 17720, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 16366, 'idleMs': 16366, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017719.json -----
{'id': 'cmd_000000017719', 'seq': 17719, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 15965, 'idleMs': 15965, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017718.json -----
{'id': 'cmd_000000017718', 'seq': 17718, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 15567, 'idleMs': 15567, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017717.json -----
{'id': 'cmd_000000017717', 'seq': 17717, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 15165, 'idleMs': 15165, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017716.json -----
{'id': 'cmd_000000017716', 'seq': 17716, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 14767, 'idleMs': 14767, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017715.json -----
{'id': 'cmd_000000017715', 'seq': 17715, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 14266, 'idleMs': 14266, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017714.json -----
{'id': 'cmd_000000017714', 'seq': 17714, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 13866, 'idleMs': 13866, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017713.json -----
{'id': 'cmd_000000017713', 'seq': 17713, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 13464, 'idleMs': 13464, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017712.json -----
{'id': 'cmd_000000017712', 'seq': 17712, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 12969, 'idleMs': 12969, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017711.json -----
{'id': 'cmd_000000017711', 'seq': 17711, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 12468, 'idleMs': 12468, 'debug': [], 'stepResults': []}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017710.json -----
{'id': 'cmd_000000017710', 'seq': 17710, 'type': '__pollDeferred', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-d23971bc', 'done': False, 'state': 'waiting-command', 'currentStep': 0, 'totalSteps': 1, 'stepType': 'command', 'stepValue': 'show version', 'outputTail': '', 'lastPrompt': '', 'lastMode': 'unknown', 'waitingForCommandEnd': True, 'updatedAt': 1777398836000, 'ageMs': 12064, 'idleMs': 12064, 'debug': [], 'stepResults': []}
error= None
```

## events current tail
```
{"seq":17590,"ts":1777398011566,"type":"command-enqueued","id":"cmd_000000017590","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398016765}
{"seq":17591,"ts":1777398011974,"type":"command-enqueued","id":"cmd_000000017591","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398016765}
{"seq":17592,"ts":1777398012383,"type":"command-enqueued","id":"cmd_000000017592","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398016765}
{"seq":17593,"ts":1777398012765,"type":"command-enqueued","id":"cmd_000000017593","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398016765}
{"seq":17594,"ts":1777398013178,"type":"command-enqueued","id":"cmd_000000017594","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398016766}
{"seq":17595,"ts":1777398013647,"type":"command-enqueued","id":"cmd_000000017595","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398016765}
{"seq":17596,"ts":1777398014112,"type":"command-enqueued","id":"cmd_000000017596","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398016765}
{"seq":17597,"ts":1777398014568,"type":"command-enqueued","id":"cmd_000000017597","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398016765}
{"seq":17598,"ts":1777398014966,"type":"command-enqueued","id":"cmd_000000017598","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398016765}
{"seq":17599,"ts":1777398015417,"type":"command-enqueued","id":"cmd_000000017599","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398016765}
{"seq":17600,"ts":1777398015889,"type":"command-enqueued","id":"cmd_000000017600","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398016886}
{"seq":17601,"ts":1777398261540,"type":"command-enqueued","id":"cmd_000000017601","commandType":"omni.evaluate.raw","payloadSizeBytes":666,"expiresAt":1777398271535}
{"seq":17602,"ts":1777398263008,"type":"command-enqueued","id":"cmd_000000017602","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777398323006}
{"seq":17603,"ts":1777398263181,"type":"command-enqueued","id":"cmd_000000017603","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777398268179}
{"seq":17604,"ts":1777398263433,"type":"command-enqueued","id":"cmd_000000017604","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17605,"ts":1777398263901,"type":"command-enqueued","id":"cmd_000000017605","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17606,"ts":1777398264309,"type":"command-enqueued","id":"cmd_000000017606","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17607,"ts":1777398264781,"type":"command-enqueued","id":"cmd_000000017607","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17608,"ts":1777398265187,"type":"command-enqueued","id":"cmd_000000017608","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17609,"ts":1777398265596,"type":"command-enqueued","id":"cmd_000000017609","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17610,"ts":1777398266005,"type":"command-enqueued","id":"cmd_000000017610","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17611,"ts":1777398266369,"type":"command-enqueued","id":"cmd_000000017611","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17612,"ts":1777398266776,"type":"command-enqueued","id":"cmd_000000017612","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17613,"ts":1777398267183,"type":"command-enqueued","id":"cmd_000000017613","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17614,"ts":1777398267592,"type":"command-enqueued","id":"cmd_000000017614","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17615,"ts":1777398267976,"type":"command-enqueued","id":"cmd_000000017615","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17616,"ts":1777398268384,"type":"command-enqueued","id":"cmd_000000017616","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17617,"ts":1777398268793,"type":"command-enqueued","id":"cmd_000000017617","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17618,"ts":1777398269182,"type":"command-enqueued","id":"cmd_000000017618","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17619,"ts":1777398269591,"type":"command-enqueued","id":"cmd_000000017619","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17620,"ts":1777398269999,"type":"command-enqueued","id":"cmd_000000017620","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17621,"ts":1777398270380,"type":"command-enqueued","id":"cmd_000000017621","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17622,"ts":1777398270788,"type":"command-enqueued","id":"cmd_000000017622","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17623,"ts":1777398271195,"type":"command-enqueued","id":"cmd_000000017623","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17624,"ts":1777398271603,"type":"command-enqueued","id":"cmd_000000017624","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17625,"ts":1777398272011,"type":"command-enqueued","id":"cmd_000000017625","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17626,"ts":1777398272506,"type":"command-enqueued","id":"cmd_000000017626","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17627,"ts":1777398272877,"type":"command-enqueued","id":"cmd_000000017627","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17628,"ts":1777398273288,"type":"command-enqueued","id":"cmd_000000017628","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17629,"ts":1777398273700,"type":"command-enqueued","id":"cmd_000000017629","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17630,"ts":1777398274143,"type":"command-enqueued","id":"cmd_000000017630","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17631,"ts":1777398274740,"type":"command-enqueued","id":"cmd_000000017631","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17632,"ts":1777398275152,"type":"command-enqueued","id":"cmd_000000017632","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17633,"ts":1777398275638,"type":"command-enqueued","id":"cmd_000000017633","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17634,"ts":1777398276189,"type":"command-enqueued","id":"cmd_000000017634","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17635,"ts":1777398276613,"type":"command-enqueued","id":"cmd_000000017635","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293432}
{"seq":17636,"ts":1777398277129,"type":"command-enqueued","id":"cmd_000000017636","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17637,"ts":1777398277594,"type":"command-enqueued","id":"cmd_000000017637","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17638,"ts":1777398278004,"type":"command-enqueued","id":"cmd_000000017638","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17639,"ts":1777398278412,"type":"command-enqueued","id":"cmd_000000017639","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17640,"ts":1777398278891,"type":"command-enqueued","id":"cmd_000000017640","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293432}
{"seq":17641,"ts":1777398279302,"type":"command-enqueued","id":"cmd_000000017641","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17642,"ts":1777398279710,"type":"command-enqueued","id":"cmd_000000017642","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17643,"ts":1777398280174,"type":"command-enqueued","id":"cmd_000000017643","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17644,"ts":1777398280582,"type":"command-enqueued","id":"cmd_000000017644","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17645,"ts":1777398280992,"type":"command-enqueued","id":"cmd_000000017645","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17646,"ts":1777398281402,"type":"command-enqueued","id":"cmd_000000017646","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17647,"ts":1777398281823,"type":"command-enqueued","id":"cmd_000000017647","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17648,"ts":1777398282288,"type":"command-enqueued","id":"cmd_000000017648","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17649,"ts":1777398282698,"type":"command-enqueued","id":"cmd_000000017649","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17650,"ts":1777398283129,"type":"command-enqueued","id":"cmd_000000017650","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17651,"ts":1777398283594,"type":"command-enqueued","id":"cmd_000000017651","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17652,"ts":1777398284000,"type":"command-enqueued","id":"cmd_000000017652","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17653,"ts":1777398284408,"type":"command-enqueued","id":"cmd_000000017653","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17654,"ts":1777398284777,"type":"command-enqueued","id":"cmd_000000017654","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17655,"ts":1777398285184,"type":"command-enqueued","id":"cmd_000000017655","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17656,"ts":1777398285593,"type":"command-enqueued","id":"cmd_000000017656","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17657,"ts":1777398286001,"type":"command-enqueued","id":"cmd_000000017657","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293432}
{"seq":17658,"ts":1777398286406,"type":"command-enqueued","id":"cmd_000000017658","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17659,"ts":1777398286784,"type":"command-enqueued","id":"cmd_000000017659","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17660,"ts":1777398287194,"type":"command-enqueued","id":"cmd_000000017660","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17661,"ts":1777398287601,"type":"command-enqueued","id":"cmd_000000017661","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17662,"ts":1777398288007,"type":"command-enqueued","id":"cmd_000000017662","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17663,"ts":1777398288530,"type":"command-enqueued","id":"cmd_000000017663","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17664,"ts":1777398288996,"type":"command-enqueued","id":"cmd_000000017664","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17665,"ts":1777398289406,"type":"command-enqueued","id":"cmd_000000017665","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17666,"ts":1777398289815,"type":"command-enqueued","id":"cmd_000000017666","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17667,"ts":1777398290281,"type":"command-enqueued","id":"cmd_000000017667","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17668,"ts":1777398290688,"type":"command-enqueued","id":"cmd_000000017668","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17669,"ts":1777398291096,"type":"command-enqueued","id":"cmd_000000017669","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17670,"ts":1777398291502,"type":"command-enqueued","id":"cmd_000000017670","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17671,"ts":1777398291911,"type":"command-enqueued","id":"cmd_000000017671","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293431}
{"seq":17672,"ts":1777398292433,"type":"command-enqueued","id":"cmd_000000017672","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398293432}
{"seq":17673,"ts":1777398293247,"type":"command-enqueued","id":"cmd_000000017673","commandType":"omni.evaluate.raw","payloadSizeBytes":459,"expiresAt":1777398303245}
{"seq":17674,"ts":1777398302358,"type":"command-enqueued","id":"cmd_000000017674","commandType":"omni.evaluate.raw","payloadSizeBytes":1846,"expiresAt":1777398312355}
{"seq":17675,"ts":1777398561516,"type":"command-enqueued","id":"cmd_000000017675","commandType":"omni.evaluate.raw","payloadSizeBytes":684,"expiresAt":1777398571504}
{"seq":17676,"ts":1777398566979,"type":"command-enqueued","id":"cmd_000000017676","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777398626976}
{"seq":17677,"ts":1777398567146,"type":"command-enqueued","id":"cmd_000000017677","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777398572143}
{"seq":17678,"ts":1777398567360,"type":"command-enqueued","id":"cmd_000000017678","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398597357}
{"seq":17679,"ts":1777398597915,"type":"command-enqueued","id":"cmd_000000017679","commandType":"omni.evaluate.raw","payloadSizeBytes":477,"expiresAt":1777398607913}
{"seq":17680,"ts":1777398835754,"type":"command-enqueued","id":"cmd_000000017680","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777398895749}
{"seq":17681,"ts":1777398835933,"type":"command-enqueued","id":"cmd_000000017681","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777398840930}
{"seq":17682,"ts":1777398836145,"type":"command-enqueued","id":"cmd_000000017682","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17683,"ts":1777398836556,"type":"command-enqueued","id":"cmd_000000017683","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17684,"ts":1777398837025,"type":"command-enqueued","id":"cmd_000000017684","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17685,"ts":1777398837487,"type":"command-enqueued","id":"cmd_000000017685","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17686,"ts":1777398837897,"type":"command-enqueued","id":"cmd_000000017686","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17687,"ts":1777398838304,"type":"command-enqueued","id":"cmd_000000017687","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17688,"ts":1777398838716,"type":"command-enqueued","id":"cmd_000000017688","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17689,"ts":1777398839238,"type":"command-enqueued","id":"cmd_000000017689","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17690,"ts":1777398839709,"type":"command-enqueued","id":"cmd_000000017690","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17691,"ts":1777398840176,"type":"command-enqueued","id":"cmd_000000017691","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17692,"ts":1777398840584,"type":"command-enqueued","id":"cmd_000000017692","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17693,"ts":1777398840993,"type":"command-enqueued","id":"cmd_000000017693","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17694,"ts":1777398841387,"type":"command-enqueued","id":"cmd_000000017694","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17695,"ts":1777398841795,"type":"command-enqueued","id":"cmd_000000017695","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17696,"ts":1777398842190,"type":"command-enqueued","id":"cmd_000000017696","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17697,"ts":1777398842598,"type":"command-enqueued","id":"cmd_000000017697","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17698,"ts":1777398843006,"type":"command-enqueued","id":"cmd_000000017698","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17699,"ts":1777398843415,"type":"command-enqueued","id":"cmd_000000017699","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17700,"ts":1777398843885,"type":"command-enqueued","id":"cmd_000000017700","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17701,"ts":1777398844293,"type":"command-enqueued","id":"cmd_000000017701","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17702,"ts":1777398844701,"type":"command-enqueued","id":"cmd_000000017702","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17703,"ts":1777398845084,"type":"command-enqueued","id":"cmd_000000017703","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17704,"ts":1777398845492,"type":"command-enqueued","id":"cmd_000000017704","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17705,"ts":1777398845902,"type":"command-enqueued","id":"cmd_000000017705","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17706,"ts":1777398846309,"type":"command-enqueued","id":"cmd_000000017706","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17707,"ts":1777398846721,"type":"command-enqueued","id":"cmd_000000017707","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17708,"ts":1777398847186,"type":"command-enqueued","id":"cmd_000000017708","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17709,"ts":1777398847594,"type":"command-enqueued","id":"cmd_000000017709","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17710,"ts":1777398848003,"type":"command-enqueued","id":"cmd_000000017710","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17711,"ts":1777398848409,"type":"command-enqueued","id":"cmd_000000017711","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17712,"ts":1777398848820,"type":"command-enqueued","id":"cmd_000000017712","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17713,"ts":1777398849340,"type":"command-enqueued","id":"cmd_000000017713","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17714,"ts":1777398849808,"type":"command-enqueued","id":"cmd_000000017714","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17715,"ts":1777398850214,"type":"command-enqueued","id":"cmd_000000017715","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17716,"ts":1777398850620,"type":"command-enqueued","id":"cmd_000000017716","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17717,"ts":1777398851085,"type":"command-enqueued","id":"cmd_000000017717","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866142}
{"seq":17718,"ts":1777398851495,"type":"command-enqueued","id":"cmd_000000017718","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17719,"ts":1777398851903,"type":"command-enqueued","id":"cmd_000000017719","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17720,"ts":1777398852309,"type":"command-enqueued","id":"cmd_000000017720","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17721,"ts":1777398852718,"type":"command-enqueued","id":"cmd_000000017721","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17722,"ts":1777398853185,"type":"command-enqueued","id":"cmd_000000017722","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17723,"ts":1777398853593,"type":"command-enqueued","id":"cmd_000000017723","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17724,"ts":1777398854000,"type":"command-enqueued","id":"cmd_000000017724","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17725,"ts":1777398854405,"type":"command-enqueued","id":"cmd_000000017725","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17726,"ts":1777398854789,"type":"command-enqueued","id":"cmd_000000017726","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17727,"ts":1777398855197,"type":"command-enqueued","id":"cmd_000000017727","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17728,"ts":1777398855604,"type":"command-enqueued","id":"cmd_000000017728","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17729,"ts":1777398856011,"type":"command-enqueued","id":"cmd_000000017729","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17730,"ts":1777398856420,"type":"command-enqueued","id":"cmd_000000017730","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17731,"ts":1777398856936,"type":"command-enqueued","id":"cmd_000000017731","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17732,"ts":1777398857402,"type":"command-enqueued","id":"cmd_000000017732","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17733,"ts":1777398857811,"type":"command-enqueued","id":"cmd_000000017733","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17734,"ts":1777398858283,"type":"command-enqueued","id":"cmd_000000017734","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17735,"ts":1777398858731,"type":"command-enqueued","id":"cmd_000000017735","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17736,"ts":1777398859196,"type":"command-enqueued","id":"cmd_000000017736","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17737,"ts":1777398859604,"type":"command-enqueued","id":"cmd_000000017737","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17738,"ts":1777398860012,"type":"command-enqueued","id":"cmd_000000017738","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17739,"ts":1777398860419,"type":"command-enqueued","id":"cmd_000000017739","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17740,"ts":1777398860937,"type":"command-enqueued","id":"cmd_000000017740","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17741,"ts":1777398861403,"type":"command-enqueued","id":"cmd_000000017741","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17742,"ts":1777398861874,"type":"command-enqueued","id":"cmd_000000017742","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17743,"ts":1777398862591,"type":"command-enqueued","id":"cmd_000000017743","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866152}
{"seq":17744,"ts":1777398863043,"type":"command-enqueued","id":"cmd_000000017744","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17745,"ts":1777398863538,"type":"command-enqueued","id":"cmd_000000017745","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17746,"ts":1777398864003,"type":"command-enqueued","id":"cmd_000000017746","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17747,"ts":1777398864411,"type":"command-enqueued","id":"cmd_000000017747","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17748,"ts":1777398864819,"type":"command-enqueued","id":"cmd_000000017748","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866141}
{"seq":17749,"ts":1777398865340,"type":"command-enqueued","id":"cmd_000000017749","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777398866338}
```
