# pt cmd final cross validation

Fecha: Tue Apr 28 14:03:22 -05 2026

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

## commands
### show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000018373","seq":18373,"completedAt":1777403015535,"status":"timeout","ok":false,"bridgeTimeoutDetails":{"commandId":"cmd_000000018373","seq":18373,"timeoutMs":5000,"timedOutAt":1777403015535,"location":"unknown","exists":false},"timings":{"sentAt":1777403010341,"resultSeenAt":1777403015535,"receivedAt":1777403015535,"waitMs":5194,"completedAtMs":1777403015535}}
[terminal-plan-run-debug] submitValue={"protocolVersion":2,"id":"cmd_000000018373","seq":18373,"completedAt":1777403015535,"status":"timeout","ok":false,"bridgeTimeoutDetails":{"commandId":"cmd_000000018373","seq":18373,"timeoutMs":5000,"timedOutAt":1777403015535,"location":"unknown","exists":false},"timings":{"sentAt":1777403010341,"resultSeenAt":1777403015535,"receivedAt":1777403015535,"waitMs":5194,"completedAtMs":1777403015535}}
[terminal-plan-run-debug] isDeferredValue=false
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
⏱ pt cmd · 5.7s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### show ip interface brief
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show ip interface brief" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show ip interface brief" --json
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000018375","seq":18375,"type":"terminal.plan.run","startedAt":1777403016390,"completedAt":1777403016499,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-989618ce","job":{"id":"cmd-989618ce","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show ip interface brief","command":"show ip interface brief","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}},"timings":{"sentAt":1777403016222,"resultSeenAt":1777403016534,"receivedAt":1777403016534,"waitMs":312,"completedAtMs":1777403016499}}
[terminal-plan-run-debug] submitValue={"ok":true,"deferred":true,"ticket":"cmd-989618ce","job":{"id":"cmd-989618ce","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show ip interface brief","command":"show ip interface brief","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}
[terminal-plan-run-debug] isDeferredValue=true
[terminal-plan-run-debug] ENTER deferred polling ticket=cmd-989618ce
[terminal-plan-run-debug] POLL ticket=cmd-989618ce elapsedMs=0
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-989618ce","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show ip interface brief","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777403016438,"ageMs":345,"idleMs":345,"debug":["1777403016521 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=83 idleMs=83","1777403016699 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=261 idleMs=261","1777403016770 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=332 idleMs=332","1777403016778 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=340 idleMs=340"],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-989618ce elapsedMs=578
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-989618ce","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show ip interface brief","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777403016991,"ageMs":798,"idleMs":245,"debug":["1777403016521 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=83 idleMs=83","1777403016699 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=261 idleMs=261","1777403016770 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=332 idleMs=332","1777403016778 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=340 idleMs=340","1777403016826 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=388 idleMs=388","1777403016956 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=518 idleMs=518","1777403016961 native-fallback-enter reason=reapStaleJobs elapsedMs=518","1777403016965 native-output-len=9033","1777403017041 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=603 idleMs=50","1777403017162 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=724 idleMs=171","1777403017224 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=786 idleMs=233","1777403017232 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=794 idleMs=241"],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-989618ce elapsedMs=1040
[terminal-plan-run-debug] pollValue={"done":true,"ok":true,"status":0,"result":{"ok":true,"raw":"SW-SRV-DIST>show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nFastEthernet0/1        unassigned      YES manual up                    up \nFastEthernet0/2        unassigned      YES manual up                    up \nFastEthernet0/3        unassigned      YES manual up                    up \nFastEthernet0/4        unassigned      YES manual up                    up \nFastEthernet0/5        unassigned      YES manual up                    up \nFastEthernet0/6        unassigned      YES manual down                  down \nFastEthernet0/7        unassigned      YES manual down                  down \nFastEthernet0/8        unassigned      YES manual down                  down \nFastEthernet0/9        unassigned      YES manual down                  down \nFastEthernet0/10       unassigned      YES manual down                  down \nFastEthernet0/11       unassigned      YES manual down                  down \nFastEthernet0/12       unassigned      YES manual down                  down \nFastEthernet0/13       unassigned      YES manual down                  down \nFastEthernet0/14       unassigned      YES manual down                  down \nFastEthernet0/15       unassigned      YES manual down                  down \nFastEthernet0/16       unassigned      YES manual down                  down \nFastEthernet0/17       unassigned      YES manual down                  down \nFastEthernet0/18       unassigned      YES manual down                  down \nFastEthernet0/19       unassigned      YES manual down                  down \nFastEthernet0/20       unassigned      YES manual down                  down \nFastEthernet0/21       unassigned      YES manual down                  down \nFastEthernet0/22       unassigned      YES manual down                  down \nFastEthernet0/23       unassigned      YES manual down                  down \nFastEthernet
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show ip interface brief",
  "output": "SW-SRV-DIST>show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nFastEthernet0/1        unassigned      YES manual up                    up \nFastEthernet0/2        unassigned      YES manual up                    up \nFastEthernet0/3        unassigned      YES manual up                    up \nFastEthernet0/4        unassigned      YES manual up                    up \nFastEthernet0/5        unassigned      YES manual up                    up \nFastEthernet0/6        unassigned      YES manual down                  down \nFastEthernet0/7        unassigned      YES manual down                  down \nFastEthernet0/8        unassigned      YES manual down                  down \nFastEthernet0/9        unassigned      YES manual down                  down \nFastEthernet0/10       unassigned      YES manual down                  down \nFastEthernet0/11       unassigned      YES manual down                  down \nFastEthernet0/12       unassigned      YES manual down                  down \nFastEthernet0/13       unassigned      YES manual down                  down \nFastEthernet0/14       unassigned      YES manual down                  down \nFastEthernet0/15       unassigned      YES manual down                  down \nFastEthernet0/16       unassigned      YES manual down                  down \nFastEthernet0/17       unassigned      YES manual down                  down \nFastEthernet0/18       unassigned      YES manual down                  down \nFastEthernet0/19       unassigned      YES manual down                  down \nFastEthernet0/20       unassigned      YES manual down                  down \nFastEthernet0/21       unassigned      YES manual down                  down \nFastEthernet0/22       unassigned      YES manual down                  down \nFastEthernet0/23       unassigned      YES manual down                  down \nFastEthernet0/24       unassigned      YES manual down                  down \nGigabitEthernet0/1     unassigned      YES manual up                    up \nGigabitEthernet0/2     unassigned      YES manual up                    up \nVlan1                  unassigned      YES manual administratively down down \nVlan99                 192.168.99.6    YES manual up                    up",
  "rawOutput": "SW-SRV-DIST>show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nFastEthernet0/1        unassigned      YES manual up                    up \nFastEthernet0/2        unassigned      YES manual up                    up \nFastEthernet0/3        unassigned      YES manual up                    up \nFastEthernet0/4        unassigned      YES manual up                    up \nFastEthernet0/5        unassigned      YES manual up                    up \nFastEthernet0/6        unassigned      YES manual down                  down \nFastEthernet0/7        unassigned      YES manual down                  down \nFastEthernet0/8        unassigned      YES manual down                  down \nFastEthernet0/9        unassigned      YES manual down                  down \nFastEthernet0/10       unassigned      YES manual down                  down \nFastEthernet0/11       unassigned      YES manual down                  down \nFastEthernet0/12       unassigned      YES manual down                  down \nFastEthernet0/13       unassigned      YES manual down                  down \nFastEthernet0/14       unassigned      YES manual down                  down \nFastEthernet0/15       unassigned      YES manual down                  down \nFastEthernet0/16       unassigned      YES manual down                  down \nFastEthernet0/17       unassigned      YES manual down                  down \nFastEthernet0/18       unassigned      YES manual down                  down \nFastEthernet0/19       unassigned      YES manual down                  down \nFastEthernet0/20       unassigned      YES manual down                  down \nFastEthernet0/21       unassigned      YES manual down                  down \nFastEthernet0/22       unassigned      YES manual down                  down \nFastEthernet0/23       unassigned      YES manual down                  down \nFastEthernet0/24       unassigned      YES manual down                  down \nGigabitEthernet0/1     unassigned      YES manual up                    up \nGigabitEthernet0/2     unassigned      YES manual up                    up \nVlan1                  unassigned      YES manual administratively down down \nVlan99                 192.168.99.6    YES manual up                    up\nSW-SRV-DIST>",
  "status": 0,
  "warnings": [],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777403017577,
      "resultSeenAt": 1777403017735,
      "receivedAt": 1777403017735,
      "waitMs": 158,
      "completedAtMs": 1777403017691
    }
  },
  "timings": {
    "sentAt": 1777403017577,
    "resultSeenAt": 1777403017735,
    "receivedAt": 1777403017735,
    "waitMs": 158,
    "completedAtMs": 1777403017691
  }
}
⏱ pt cmd · 1.7s
```

### show vlan brief
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show vlan brief" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show vlan brief" --json
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000018380","seq":18380,"type":"terminal.plan.run","startedAt":1777403018591,"completedAt":1777403018697,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9d3ac393","job":{"id":"cmd-9d3ac393","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show vlan brief","command":"show vlan brief","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}},"timings":{"sentAt":1777403018430,"resultSeenAt":1777403018739,"receivedAt":1777403018739,"waitMs":309,"completedAtMs":1777403018697}}
[terminal-plan-run-debug] submitValue={"ok":true,"deferred":true,"ticket":"cmd-9d3ac393","job":{"id":"cmd-9d3ac393","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show vlan brief","command":"show vlan brief","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}
[terminal-plan-run-debug] isDeferredValue=true
[terminal-plan-run-debug] ENTER deferred polling ticket=cmd-9d3ac393
[terminal-plan-run-debug] POLL ticket=cmd-9d3ac393 elapsedMs=0
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-9d3ac393","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show vlan brief","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777403018634,"ageMs":348,"idleMs":348,"debug":["1777403018717 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=83 idleMs=83","1777403018896 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=262 idleMs=262","1777403018968 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=334 idleMs=334","1777403018977 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=343 idleMs=343"],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-9d3ac393 elapsedMs=623
[terminal-plan-run-debug] pollValue={"ok":true,"deferred":true,"ticket":"cmd-9d3ac393","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show vlan brief","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777403019188,"ageMs":823,"idleMs":269,"debug":["1777403018717 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=83 idleMs=83","1777403018896 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=262 idleMs=262","1777403018968 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=334 idleMs=334","1777403018977 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=343 idleMs=343","1777403019028 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=394 idleMs=394","1777403019151 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=516 idleMs=516","1777403019156 native-fallback-enter reason=reapStaleJobs elapsedMs=516","1777403019162 native-output-len=4825","1777403019246 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=612 idleMs=58","1777403019373 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=739 idleMs=185","1777403019443 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=809 idleMs=255","1777403019452 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=818 idleMs=264"],"stepResults":[]}
[terminal-plan-run-debug] POLL ticket=cmd-9d3ac393 elapsedMs=1086
[terminal-plan-run-debug] pollValue={"done":true,"ok":true,"status":0,"result":{"ok":true,"raw":"SW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST> ","status":0,"session":{"mode":"user-exec","prompt":"SW-SRV-DIST>","paging":false,"awaitingConfirm":false}},"raw":"SW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default        
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show vlan brief",
  "output": "SW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active",
  "rawOutput": "SW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>",
  "status": 0,
  "warnings": [],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777403019826,
      "resultSeenAt": 1777403020019,
      "receivedAt": 1777403020019,
      "waitMs": 193,
      "completedAtMs": 1777403019993
    }
  },
  "timings": {
    "sentAt": 1777403019826,
    "resultSeenAt": 1777403020019,
    "receivedAt": 1777403020019,
    "waitMs": 193,
    "completedAtMs": 1777403019993
  }
}
⏱ pt cmd · 1.8s
```

### show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
[terminal-plan-run-debug] submitResult={"protocolVersion":2,"id":"cmd_000000018385","seq":18385,"completedAt":1777403025907,"status":"timeout","ok":false,"bridgeTimeoutDetails":{"commandId":"cmd_000000018385","seq":18385,"timeoutMs":5000,"timedOutAt":1777403025907,"location":"unknown","exists":false},"timings":{"sentAt":1777403020705,"resultSeenAt":1777403025907,"receivedAt":1777403025907,"waitMs":5202,"completedAtMs":1777403025907}}
[terminal-plan-run-debug] submitValue={"protocolVersion":2,"id":"cmd_000000018385","seq":18385,"completedAt":1777403025907,"status":"timeout","ok":false,"bridgeTimeoutDetails":{"commandId":"cmd_000000018385","seq":18385,"timeoutMs":5000,"timedOutAt":1777403025907,"location":"unknown","exists":false},"timings":{"sentAt":1777403020705,"resultSeenAt":1777403025907,"receivedAt":1777403025907,"waitMs":5202,"completedAtMs":1777403025907}}
[terminal-plan-run-debug] isDeferredValue=false
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "",
  "rawOutput": "",
  "status": 1,
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
⏱ pt cmd · 5.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
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
  ✓ [ℹ] Queue: 1 queued / 0 in-flight / 0 dead-letter
  ✓ [ℹ] Heartbeat encontrado
  ✓ [ℹ] Heartbeat estado: ok (1828ms)
  ✗ [⚠] Bridge ready: no
  ✗ [⚠] Topología no materializada

Resumen: 8 OK, 2 warning, 0 critical
→ Revisar warnings para mejorar la operación.

⏱ pt doctor · 0.0s
```
