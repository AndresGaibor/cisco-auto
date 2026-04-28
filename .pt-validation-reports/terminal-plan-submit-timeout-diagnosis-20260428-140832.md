# terminal.plan.run submit timeout diagnosis

Fecha: Tue Apr 28 14:08:32 -05 2026

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
  ✓ [ℹ] Heartbeat estado: ok (3943ms)
  ✗ [⚠] Bridge ready: no
  ✗ [⚠] Topología no materializada

Resumen: 8 OK, 2 warning, 0 critical
→ Revisar warnings para mejorar la operación.

⏱ pt doctor · 0.0s
```

## queue/in-flight/dead-letter files
```

### /Users/andresgaibor/pt-dev/queue
<missing>

### /Users/andresgaibor/pt-dev/in-flight
total 0
drwxr-xr-x@  2 andresgaibor  staff    64B Apr 28 14:03 .
drwxr-xr-x@ 28 andresgaibor  staff   896B Apr 28 14:03 ..

### /Users/andresgaibor/pt-dev/dead-letter
total 0
drwxr-xr-x@  2 andresgaibor  staff    64B Apr 28 13:41 .
drwxr-xr-x@ 28 andresgaibor  staff   896B Apr 28 14:03 ..

### /Users/andresgaibor/pt-dev/deadletter
<missing>

### /Users/andresgaibor/pt-dev/results
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:45 cmd_000000018305.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:45 cmd_000000018306.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:45 cmd_000000018307.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:45 cmd_000000018308.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:45 cmd_000000018309.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:45 cmd_000000018310.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:45 cmd_000000018311.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:45 cmd_000000018312.json
-rw-r--r--@   1 andresgaibor  staff   583B Apr 28 13:45 cmd_000000018313.json
-rw-r--r--@   1 andresgaibor  staff   809B Apr 28 13:48 cmd_000000018314.json
-rw-r--r--@   1 andresgaibor  staff   285B Apr 28 13:48 cmd_000000018315.json
-rw-r--r--@   1 andresgaibor  staff   894B Apr 28 13:48 cmd_000000018316.json
-rw-r--r--@   1 andresgaibor  staff   852B Apr 28 13:48 cmd_000000018317.json
-rw-r--r--@   1 andresgaibor  staff   3.7K Apr 28 13:48 cmd_000000018318.json
-rw-r--r--@   1 andresgaibor  staff   9.3K Apr 28 13:48 cmd_000000018319.json
-rw-r--r--@   1 andresgaibor  staff    15K Apr 28 13:48 cmd_000000018320.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:48 cmd_000000018321.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018322.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018323.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018324.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018325.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018326.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018327.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018328.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018329.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018330.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018331.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018332.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018333.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018334.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018335.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018336.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018337.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018338.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018339.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018340.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018341.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018342.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018343.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018344.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018345.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018346.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018347.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018348.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018349.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018350.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018351.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018352.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018353.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018354.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018355.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018356.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018357.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018358.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018359.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018360.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018361.json
-rw-r--r--@   1 andresgaibor  staff    18K Apr 28 13:49 cmd_000000018362.json
-rw-r--r--@   1 andresgaibor  staff   583B Apr 28 13:49 cmd_000000018363.json
-rw-r--r--@   1 andresgaibor  staff   398B Apr 28 13:53 cmd_000000018364.json
-rw-r--r--@   1 andresgaibor  staff   394B Apr 28 13:56 cmd_000000018365.json
-rw-r--r--@   1 andresgaibor  staff   809B Apr 28 14:00 cmd_000000018367.json
-rw-r--r--@   1 andresgaibor  staff   285B Apr 28 14:00 cmd_000000018368.json
-rw-r--r--@   1 andresgaibor  staff   894B Apr 28 14:00 cmd_000000018369.json
-rw-r--r--@   1 andresgaibor  staff   967B Apr 28 14:00 cmd_000000018370.json
-rw-r--r--@   1 andresgaibor  staff   4.8K Apr 28 14:00 cmd_000000018371.json
-rw-r--r--@   1 andresgaibor  staff   285B Apr 28 14:03 cmd_000000018372.json
-rw-r--r--@   1 andresgaibor  staff   285B Apr 28 14:03 cmd_000000018374.json
-rw-r--r--@   1 andresgaibor  staff   916B Apr 28 14:03 cmd_000000018375.json
-rw-r--r--@   1 andresgaibor  staff   978B Apr 28 14:03 cmd_000000018376.json
-rw-r--r--@   1 andresgaibor  staff   1.7K Apr 28 14:03 cmd_000000018377.json
-rw-r--r--@   1 andresgaibor  staff   7.3K Apr 28 14:03 cmd_000000018378.json
-rw-r--r--@   1 andresgaibor  staff   285B Apr 28 14:03 cmd_000000018379.json
-rw-r--r--@   1 andresgaibor  staff   900B Apr 28 14:03 cmd_000000018380.json
-rw-r--r--@   1 andresgaibor  staff   970B Apr 28 14:03 cmd_000000018381.json
-rw-r--r--@   1 andresgaibor  staff   1.7K Apr 28 14:03 cmd_000000018382.json
-rw-r--r--@   1 andresgaibor  staff   5.3K Apr 28 14:03 cmd_000000018383.json
-rw-r--r--@   1 andresgaibor  staff   285B Apr 28 14:03 cmd_000000018384.json
-rw-r--r--@   1 andresgaibor  staff   319B Apr 28 13:41 reload-1777401668403.json
-rw-r--r--@   1 andresgaibor  staff   319B Apr 28 13:59 reload-1777402783249.json
```

## queued command payloads
```json
```

## recent result ids around submit timeout
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000018384.json -----
{
  "id": "cmd_000000018384",
  "seq": 18384,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018383.json -----
{
  "id": "cmd_000000018383",
  "seq": 18383,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "done": true,
  "ok": true,
  "status": 0,
  "result": {
    "ok": true,
    "raw": "SW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST> ",
    "status": 0,
    "session": {
      "mode": "user-exec",
      "prompt": "SW-SRV-DIST>",
      "paging": false,
      "awaitingConfirm": false
    }
  },
  "raw": "SW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    

----- /Users/andresgaibor/pt-dev/results/cmd_000000018382.json -----
{
  "id": "cmd_000000018382",
  "seq": 18382,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-9d3ac393",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show vlan brief",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777403019188,
  "ageMs": 823,
  "idleMs": 269,
  "debug": [
    "1777403018717 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=83 idleMs=83",
    "1777403018896 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=262 idleMs=262",
    "1777403018968 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=334 idleMs=334",
    "1777403018977 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=343 idleMs=343",
    "1777403019028 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=394 idleMs=394",
    "1777403019151 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=516 idleMs=516",
    "1777403019156 native-fallback-enter reason=reapStaleJobs elapsedMs=516",
    "1777403019162 native-output-len=4825",
    "1777403019246 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=612 idleMs=58",
    "1777403019373 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=739 idleMs=185",
    "1777403019443 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=809 idleMs=255",
    "1777403019452 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=818 idleMs=264"
  ],
  "stepResults": []
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018381.json -----
{
  "id": "cmd_000000018381",
  "seq": 18381,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-9d3ac393",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show vlan brief",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777403018634,
  "ageMs": 348,
  "idleMs": 348,
  "debug": [
    "1777403018717 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=83 idleMs=83",
    "1777403018896 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=262 idleMs=262",
    "1777403018968 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=334 idleMs=334",
    "1777403018977 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=343 idleMs=343"
  ],
  "stepResults": []
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018380.json -----
{
  "id": "cmd_000000018380",
  "seq": 18380,
  "type": "terminal.plan.run",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-9d3ac393",
  "job": {
    "id": "cmd-9d3ac393",
    "kind": "ios-session",
    "version": 1,
    "device": "SW-SRV-DIST",
    "plan": [
      {
        "type": "command",
        "kind": "command",
        "value": "show vlan brief",
        "command": "show vlan brief",
        "allowPager": true,
        "allowConfirm": false,
        "optional": false,
        "timeoutMs": 12000,
        "options": {
          "timeoutMs": 12000
        },
        "metadata": {}
      }
    ],
    "options": {
      "stopOnError": true,
      "commandTimeoutMs": 12000,
      "stallTimeoutMs": 15000
    },
    "payload": {
      "source": "terminal.plan.run",
      "metadata": {
        "deviceKind": "ios",
        "source": "pt-control.terminal-plan-builder",
        "lineCount": 1
      },
      "policies": {
        "autoBreakWizard": true,
        "autoAdvancePager": true,
        "maxPagerAdvances": 80,
        "maxConfirmations": 0,
        "abortOnPromptMismatch": false,
        "abortOnModeMismatch": true
      }
    }
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018379.json -----
{
  "id": "cmd_000000018379",
  "seq": 18379,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018378.json -----
{
  "id": "cmd_000000018378",
  "seq": 18378,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "done": true,
  "ok": true,
  "status": 0,
  "result": {
    "ok": true,
    "raw": "SW-SRV-DIST>show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nFastEthernet0/1        unassigned      YES manual up                    up \nFastEthernet0/2        unassigned      YES manual up                    up \nFastEthernet0/3        unassigned      YES manual up                    up \nFastEthernet0/4        unassigned      YES manual up                    up \nFastEthernet0/5        unassigned      YES manual up                    up \nFastEthernet0/6        unassigned      YES manual down                  down \nFastEthernet0/7        unassigned      YES manual down                  down \nFastEthernet0/8        unassigned      YES manual down                  down \nFastEthernet0/9        unassigned      YES manual down                  down \nFastEthernet0/10       unassigned      YES manual down                  down \nFastEthernet0/11       unassigned      YES manual down                  down \nFastEthernet0/12       unassigned      YES manual down                  down \nFastEthernet0/13       unassigned      YES manual down                  down \nFastEthernet0/14       unassigned      YES manual down                  down \nFastEthernet0/15       unassigned      YES manual down                  down \nFastEthernet0/16       unassigned      YES manual down                  down \nFastEthernet0/17       unassigned      YES manual down                  down \nFastEthernet0/18       unassigned      YES manual down                  down \nFastEthernet0/19       unassigned      YES manual down                  down \nFastEthernet0/20       unassigned      YES manual down                  down \nFastEthernet0/21       unassigned      YES manual down                  down \nFastEthernet0/22       unassigned      YES manual down                  down \nFastEthernet0/23       unassigned      YES manual down                  down \nFastEthernet0/24       unassigned      YES manual down                  down \nGigabitEthernet0/1     unassigned      YES manual up                    up \nGigabitEthernet0/2     unassigned      YES manual up                    up \nVlan1                  unassigned      YES manual administratively down down \nVlan99                 192.168.99.6    YES manual up                    up\nSW-SRV-DIST> ",
    "status": 0,
    "session": {
      "mode": "user-exec",
      "prompt": "SW

----- /Users/andresgaibor/pt-dev/results/cmd_000000018377.json -----
{
  "id": "cmd_000000018377",
  "seq": 18377,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-989618ce",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show ip interface brief",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777403016991,
  "ageMs": 798,
  "idleMs": 245,
  "debug": [
    "1777403016521 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=83 idleMs=83",
    "1777403016699 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=261 idleMs=261",
    "1777403016770 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=332 idleMs=332",
    "1777403016778 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=340 idleMs=340",
    "1777403016826 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=388 idleMs=388",
    "1777403016956 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=518 idleMs=518",
    "1777403016961 native-fallback-enter reason=reapStaleJobs elapsedMs=518",
    "1777403016965 native-output-len=9033",
    "1777403017041 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=603 idleMs=50",
    "1777403017162 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=724 idleMs=171",
    "1777403017224 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=786 idleMs=233",
    "1777403017232 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=794 idleMs=241"
  ],
  "stepResults": []
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018376.json -----
{
  "id": "cmd_000000018376",
  "seq": 18376,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-989618ce",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 1,
  "stepType": "command",
  "stepValue": "show ip interface brief",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777403016438,
  "ageMs": 345,
  "idleMs": 345,
  "debug": [
    "1777403016521 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=83 idleMs=83",
    "1777403016699 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=261 idleMs=261",
    "1777403016770 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=332 idleMs=332",
    "1777403016778 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=340 idleMs=340"
  ],
  "stepResults": []
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018375.json -----
{
  "id": "cmd_000000018375",
  "seq": 18375,
  "type": "terminal.plan.run",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-989618ce",
  "job": {
    "id": "cmd-989618ce",
    "kind": "ios-session",
    "version": 1,
    "device": "SW-SRV-DIST",
    "plan": [
      {
        "type": "command",
        "kind": "command",
        "value": "show ip interface brief",
        "command": "show ip interface brief",
        "allowPager": true,
        "allowConfirm": false,
        "optional": false,
        "timeoutMs": 12000,
        "options": {
          "timeoutMs": 12000
        },
        "metadata": {}
      }
    ],
    "options": {
      "stopOnError": true,
      "commandTimeoutMs": 12000,
      "stallTimeoutMs": 15000
    },
    "payload": {
      "source": "terminal.plan.run",
      "metadata": {
        "deviceKind": "ios",
        "source": "pt-control.terminal-plan-builder",
        "lineCount": 1
      },
      "policies": {
        "autoBreakWizard": true,
        "autoAdvancePager": true,
        "maxPagerAdvances": 80,
        "maxConfirmations": 0,
        "abortOnPromptMismatch": false,
        "abortOnModeMismatch": true
      }
    }
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018374.json -----
{
  "id": "cmd_000000018374",
  "seq": 18374,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018372.json -----
{
  "id": "cmd_000000018372",
  "seq": 18372,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018371.json -----
{
  "id": "cmd_000000018371",
  "seq": 18371,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "done": true,
  "ok": true,
  "status": 0,
  "result": {
    "ok": true,
    "raw": "SW-SRV-DIST>show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST>",
    "status": 0,
    "session": {
      "mode": "user-exec",
      "prompt": "SW-SRV-DIST>",
      "paging": false,
      "awaitingConfirm": false
    }
  },
  "raw": "SW-SRV-DIST>show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248M

----- /Users/andresgaibor/pt-dev/results/cmd_000000018370.json -----
{
  "id": "cmd_000000018370",
  "seq": 18370,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-19128083",
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
  "updatedAt": 1777402801720,
  "ageMs": 291,
  "idleMs": 291,
  "debug": [
    "1777402801777 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=57 idleMs=57",
    "1777402801951 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=231 idleMs=231",
    "1777402802006 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=286 idleMs=286",
    "1777402802009 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=289 idleMs=289"
  ],
  "stepResults": []
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018369.json -----
{
  "id": "cmd_000000018369",
  "seq": 18369,
  "type": "terminal.plan.run",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-19128083",
  "job": {
    "id": "cmd-19128083",
    "kind": "ios-session",
    "version": 1,
    "device": "SW-SRV-DIST",
    "plan": [
      {
        "type": "command",
        "kind": "command",
        "value": "show version",
        "command": "show version",
        "allowPager": true,
        "allowConfirm": false,
        "optional": false,
        "timeoutMs": 12000,
        "options": {
          "timeoutMs": 12000
        },
        "metadata": {}
      }
    ],
    "options": {
      "stopOnError": true,
      "commandTimeoutMs": 12000,
      "stallTimeoutMs": 15000
    },
    "payload": {
      "source": "terminal.plan.run",
      "metadata": {
        "deviceKind": "ios",
        "source": "pt-control.terminal-plan-builder",
        "lineCount": 1
      },
      "policies": {
        "autoBreakWizard": true,
        "autoAdvancePager": true,
        "maxPagerAdvances": 80,
        "maxConfirmations": 0,
        "abortOnPromptMismatch": false,
        "abortOnModeMismatch": true
      }
    }
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018368.json -----
{
  "id": "cmd_000000018368",
  "seq": 18368,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "device": {
    "name": "SW-SRV-DIST",
    "model": "2960-24TT",
    "type": 1,
    "power": true,
    "hasCommandLine": true
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018367.json -----
{
  "id": "cmd_000000018367",
  "seq": 18367,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"       : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/reload-1777402783249.json -----
{
  "id": "reload-1777402783249",
  "seq": 18367,
  "type": "__ping",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "DEVICE_NOT_FOUND",
    "message": "Device not found",
    "phase": "execution"
  },
  "bridgeTimeoutDetails": null
}
{
  "ok": false,
  "error": "Device not found",
  "code": "DEVICE_NOT_FOUND"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018365.json -----
{
  "id": "cmd_000000018365",
  "seq": 18365,
  "type": "omni.evaluate.raw",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EVALUATION_FAILED",
    "message": "EVAL_ERROR: Unterminated regular expression class",
    "phase": "execution"
  },
  "bridgeTimeoutDetails": null
}
{
  "ok": false,
  "error": "EVAL_ERROR: Unterminated regular expression class",
  "code": "EVALUATION_FAILED"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018364.json -----
{
  "id": "cmd_000000018364",
  "seq": 18364,
  "type": "omni.evaluate.raw",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EVALUATION_FAILED",
    "message": "EVAL_ERROR: Unterminated regular expression literal",
    "phase": "execution"
  },
  "bridgeTimeoutDetails": null
}
{
  "ok": false,
  "error": "EVAL_ERROR: Unterminated regular expression literal",
  "code": "EVALUATION_FAILED"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018363.json -----
{
  "id": "cmd_000000018363",
  "seq": 18363,
  "type": "__pollDeferred",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "JOB_TIMEOUT",
    "message": "Job timed out while waiting for terminal command completion",
    "phase": "execution"
  },
  "bridgeTimeoutDetails": null
}
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018362.json -----
{
  "id": "cmd_000000018362",
  "seq": 18362,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402164175 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018361.json -----
{
  "id": "cmd_000000018361",
  "seq": 18361,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402163621 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018360.json -----
{
  "id": "cmd_000000018360",
  "seq": 18360,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402162835 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018359.json -----
{
  "id": "cmd_000000018359",
  "seq": 18359,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402162110 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018358.json -----
{
  "id": "cmd_000000018358",
  "seq": 18358,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402161521 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018357.json -----
{
  "id": "cmd_000000018357",
  "seq": 18357,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402160924 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018356.json -----
{
  "id": "cmd_000000018356",
  "seq": 18356,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402160212 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018355.json -----
{
  "id": "cmd_000000018355",
  "seq": 18355,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402159623 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018354.json -----
{
  "id": "cmd_000000018354",
  "seq": 18354,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402158916 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018353.json -----
{
  "id": "cmd_000000018353",
  "seq": 18353,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402158330 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018352.json -----
{
  "id": "cmd_000000018352",
  "seq": 18352,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402157741 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018351.json -----
{
  "id": "cmd_000000018351",
  "seq": 18351,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402157049 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018350.json -----
{
  "id": "cmd_000000018350",
  "seq": 18350,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402156427 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018349.json -----
{
  "id": "cmd_000000018349",
  "seq": 18349,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402155731 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018348.json -----
{
  "id": "cmd_000000018348",
  "seq": 18348,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402155150 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018347.json -----
{
  "id": "cmd_000000018347",
  "seq": 18347,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402154572 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018346.json -----
{
  "id": "cmd_000000018346",
  "seq": 18346,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402153872 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018345.json -----
{
  "id": "cmd_000000018345",
  "seq": 18345,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402153317 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve

----- /Users/andresgaibor/pt-dev/results/cmd_000000018344.json -----
{
  "id": "cmd_000000018344",
  "seq": 18344,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null,
  "bridgeTimeoutDetails": null
}
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
    "1777402152667 native-check command=\"show version\" prompt=\"SW-SRV-DIST>\" mode=\"user-exec\" blockLen=1432 complete=false blockTail=\"\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Ve
```

## event logs relevant tail
```

----- /Users/andresgaibor/pt-dev/logs/events.current.ndjson -----
{"seq":8523,"ts":1776507036291,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8536,"ts":1776507102484,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8540,"ts":1776507123195,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8560,"ts":1776507332894,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8590,"ts":1776508624334,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8595,"ts":1776508761267,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8600,"ts":1776509544732,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8603,"ts":1776510568839,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8608,"ts":1776517207365,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8617,"ts":1776523967201,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8798,"ts":1776544637838,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8799,"ts":1776544646327,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8801,"ts":1776544917181,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8802,"ts":1776544917203,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8806,"ts":1776544927063,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8832,"ts":1776545220839,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8833,"ts":1776545220845,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8869,"ts":1776545576204,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":8870,"ts":1776545576230,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":9252,"ts":1776744623831,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":9262,"ts":1776744709654,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":9318,"ts":1776745249650,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":9869,"ts":1776852030071,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":9870,"ts":1776852030075,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":9871,"ts":1776852037204,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10060,"ts":1776869963497,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10076,"ts":1776871030894,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10077,"ts":1776871030902,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10326,"ts":1776879731035,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10327,"ts":1776879731046,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10329,"ts":1776879731110,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10330,"ts":1776879731120,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10331,"ts":1776879731179,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10332,"ts":1776879731186,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10336,"ts":1776879763803,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10337,"ts":1776879763808,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10338,"ts":1776879763811,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10339,"ts":1776879763815,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10340,"ts":1776879777935,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10343,"ts":1776896949434,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10344,"ts":1776896949436,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10345,"ts":1776896949450,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10346,"ts":1776896949460,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10348,"ts":1776897006916,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10349,"ts":1776897006922,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10351,"ts":1776897021065,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10355,"ts":1776897372737,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10361,"ts":1776898202033,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10367,"ts":1776898302336,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10369,"ts":1776898371277,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10373,"ts":1776898412942,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10377,"ts":1776898506192,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10383,"ts":1776898732533,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10384,"ts":1776898732543,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10386,"ts":1776898743270,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10462,"ts":1776915317519,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10476,"ts":1776915779711,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":10488,"ts":1776915872976,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":11300,"ts":1776962162154,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":11301,"ts":1776962174357,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":11797,"ts":1777012017429,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":11799,"ts":1777012027849,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":11963,"ts":1777047179205,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12127,"ts":1777053081962,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12132,"ts":1777053089897,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12135,"ts":1777053116663,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12145,"ts":1777053168730,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12153,"ts":1777053319498,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12247,"ts":1777055451599,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12248,"ts":1777055451617,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12249,"ts":1777055451625,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12266,"ts":1777055512569,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12267,"ts":1777055512730,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12268,"ts":1777055512733,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12269,"ts":1777055523350,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12279,"ts":1777055565860,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12283,"ts":1777055584727,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12340,"ts":1777067404211,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12341,"ts":1777067404524,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12342,"ts":1777067404563,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12343,"ts":1777067404574,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12370,"ts":1777068119337,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12389,"ts":1777068149771,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12404,"ts":1777068601832,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12412,"ts":1777068618770,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12421,"ts":1777068720512,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12611,"ts":1777092105167,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":12612,"ts":1777092114071,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":13529,"ts":1777226086194,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":13536,"ts":1777227906990,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":13537,"ts":1777227906995,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":13559,"ts":1777232612806,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":13560,"ts":1777232612825,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":13561,"ts":1777232612853,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":13566,"ts":1777233387761,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":13589,"ts":1777248903579,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":13591,"ts":1777248949767,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":13616,"ts":1777252043326,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":14160,"ts":1777290288072,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":14161,"ts":1777290295334,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15363,"ts":1777308108626,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15364,"ts":1777308108632,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15378,"ts":1777310640769,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15379,"ts":1777310640779,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15383,"ts":1777310808134,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15384,"ts":1777310808168,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15390,"ts":1777314490341,"type":"command-enqueued","id":"cmd_000000015390","commandType":"terminal.plan.run","payloadSizeBytes":241,"expiresAt":1777314535325}
{"seq":15395,"ts":1777314879396,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15401,"ts":1777315582416,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15410,"ts":1777316290642,"type":"command-enqueued","id":"cmd_000000015410","commandType":"terminal.plan.run","payloadSizeBytes":458,"expiresAt":1777316335637}
{"seq":15411,"ts":1777316626166,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15413,"ts":1777316627325,"type":"command-enqueued","id":"cmd_000000015413","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777316672323}
{"seq":15414,"ts":1777316664614,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15427,"ts":1777317017003,"type":"command-enqueued","id":"cmd_000000015427","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777317061998}
{"seq":15431,"ts":1777317202150,"type":"command-enqueued","id":"cmd_000000015431","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777317247149}
{"seq":15435,"ts":1777317331631,"type":"command-enqueued","id":"cmd_000000015435","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777317376629}
{"seq":15478,"ts":1777329969725,"type":"command-enqueued","id":"cmd_000000015478","commandType":"terminal.plan.run","payloadSizeBytes":546,"expiresAt":1777330014723}
{"seq":15485,"ts":1777330139314,"type":"command-enqueued","id":"cmd_000000015485","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777330184311}
{"seq":15488,"ts":1777330142480,"type":"command-enqueued","id":"cmd_000000015488","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777330187476}
{"seq":15493,"ts":1777330714584,"type":"command-enqueued","id":"cmd_000000015493","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777330759581}
{"seq":15496,"ts":1777330717567,"type":"command-enqueued","id":"cmd_000000015496","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777330762565}
{"seq":15499,"ts":1777330916593,"type":"command-enqueued","id":"cmd_000000015499","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777330961591}
{"seq":15502,"ts":1777330919559,"type":"command-enqueued","id":"cmd_000000015502","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777330964555}
{"seq":15510,"ts":1777331214076,"type":"command-enqueued","id":"cmd_000000015510","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777331259071}
{"seq":15513,"ts":1777331218051,"type":"command-enqueued","id":"cmd_000000015513","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777331263049}
{"seq":15516,"ts":1777331295978,"type":"command-enqueued","id":"cmd_000000015516","commandType":"terminal.plan.run","payloadSizeBytes":561,"expiresAt":1777331340975}
{"seq":15519,"ts":1777331299953,"type":"command-enqueued","id":"cmd_000000015519","commandType":"terminal.plan.run","payloadSizeBytes":561,"expiresAt":1777331344952}
{"seq":15522,"ts":1777331303955,"type":"command-enqueued","id":"cmd_000000015522","commandType":"terminal.plan.run","payloadSizeBytes":552,"expiresAt":1777331348953}
{"seq":15531,"ts":1777331650460,"type":"command-enqueued","id":"cmd_000000015531","commandType":"terminal.plan.run","payloadSizeBytes":556,"expiresAt":1777331695457}
{"seq":15534,"ts":1777331654430,"type":"command-enqueued","id":"cmd_000000015534","commandType":"terminal.plan.run","payloadSizeBytes":557,"expiresAt":1777331699428}
{"seq":15537,"ts":1777331737505,"type":"command-enqueued","id":"cmd_000000015537","commandType":"terminal.plan.run","payloadSizeBytes":557,"expiresAt":1777331782503}
{"seq":15540,"ts":1777331741445,"type":"command-enqueued","id":"cmd_000000015540","commandType":"terminal.plan.run","payloadSizeBytes":553,"expiresAt":1777331786442}
{"seq":15543,"ts":1777331745435,"type":"command-enqueued","id":"cmd_000000015543","commandType":"terminal.plan.run","payloadSizeBytes":559,"expiresAt":1777331790432}
{"seq":15546,"ts":1777331749505,"type":"command-enqueued","id":"cmd_000000015546","commandType":"terminal.plan.run","payloadSizeBytes":565,"expiresAt":1777331794503}
{"seq":15549,"ts":1777331868547,"type":"command-enqueued","id":"cmd_000000015549","commandType":"terminal.plan.run","payloadSizeBytes":545,"expiresAt":1777331913537}
{"seq":15552,"ts":1777331873779,"type":"command-enqueued","id":"cmd_000000015552","commandType":"terminal.plan.run","payloadSizeBytes":557,"expiresAt":1777331918767}
{"seq":15555,"ts":1777331879513,"type":"command-enqueued","id":"cmd_000000015555","commandType":"terminal.plan.run","payloadSizeBytes":552,"expiresAt":1777331924511}
{"seq":15558,"ts":1777331887538,"type":"command-enqueued","id":"cmd_000000015558","commandType":"terminal.plan.run","payloadSizeBytes":560,"expiresAt":1777331932534}
{"seq":15561,"ts":1777331891505,"type":"command-enqueued","id":"cmd_000000015561","commandType":"terminal.plan.run","payloadSizeBytes":552,"expiresAt":1777331936502}
{"seq":15565,"ts":1777333013053,"type":"command-enqueued","id":"cmd_000000015565","commandType":"terminal.plan.run","payloadSizeBytes":758,"expiresAt":1777333058051}
{"seq":15568,"ts":1777333018005,"type":"command-enqueued","id":"cmd_000000015568","commandType":"terminal.plan.run","payloadSizeBytes":758,"expiresAt":1777333063003}
{"seq":15571,"ts":1777333024008,"type":"command-enqueued","id":"cmd_000000015571","commandType":"terminal.plan.run","payloadSizeBytes":757,"expiresAt":1777333069006}
{"seq":15574,"ts":1777333119395,"type":"command-enqueued","id":"cmd_000000015574","commandType":"terminal.plan.run","payloadSizeBytes":1036,"expiresAt":1777333164392}
{"seq":15577,"ts":1777333125320,"type":"command-enqueued","id":"cmd_000000015577","commandType":"terminal.plan.run","payloadSizeBytes":783,"expiresAt":1777333170316}
{"seq":15582,"ts":1777334233496,"type":"command-enqueued","id":"cmd_000000015582","commandType":"terminal.plan.run","payloadSizeBytes":1136,"expiresAt":1777334278494}
{"seq":15585,"ts":1777334239476,"type":"command-enqueued","id":"cmd_000000015585","commandType":"terminal.plan.run","payloadSizeBytes":783,"expiresAt":1777334284474}
{"seq":15588,"ts":1777334366796,"type":"command-enqueued","id":"cmd_000000015588","commandType":"terminal.plan.run","payloadSizeBytes":757,"expiresAt":1777334411793}
{"seq":15591,"ts":1777334374726,"type":"command-enqueued","id":"cmd_000000015591","commandType":"terminal.plan.run","payloadSizeBytes":786,"expiresAt":1777334419724}
{"seq":15594,"ts":1777334382850,"type":"command-enqueued","id":"cmd_000000015594","commandType":"terminal.plan.run","payloadSizeBytes":568,"expiresAt":1777334427845}
{"seq":15597,"ts":1777334598827,"type":"command-enqueued","id":"cmd_000000015597","commandType":"terminal.plan.run","payloadSizeBytes":561,"expiresAt":1777334643825}
{"seq":15600,"ts":1777334603866,"type":"command-enqueued","id":"cmd_000000015600","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777334648857}
{"seq":15603,"ts":1777334607957,"type":"command-enqueued","id":"cmd_000000015603","commandType":"terminal.plan.run","payloadSizeBytes":553,"expiresAt":1777334652952}
{"seq":15606,"ts":1777334654848,"type":"command-enqueued","id":"cmd_000000015606","commandType":"terminal.plan.run","payloadSizeBytes":568,"expiresAt":1777334699841}
{"seq":15609,"ts":1777334658925,"type":"command-enqueued","id":"cmd_000000015609","commandType":"terminal.plan.run","payloadSizeBytes":556,"expiresAt":1777334703921}
{"seq":15612,"ts":1777334671832,"type":"command-enqueued","id":"cmd_000000015612","commandType":"terminal.plan.run","payloadSizeBytes":560,"expiresAt":1777334716829}
{"seq":15615,"ts":1777334676057,"type":"command-enqueued","id":"cmd_000000015615","commandType":"terminal.plan.run","payloadSizeBytes":552,"expiresAt":1777334721055}
{"seq":15617,"ts":1777334722554,"type":"command-enqueued","id":"cmd_000000015617","commandType":"terminal.plan.run","payloadSizeBytes":568,"expiresAt":1777334767549}
{"seq":15620,"ts":1777334726545,"type":"command-enqueued","id":"cmd_000000015620","commandType":"terminal.plan.run","payloadSizeBytes":786,"expiresAt":1777334771541}
{"seq":15623,"ts":1777334731540,"type":"command-enqueued","id":"cmd_000000015623","commandType":"terminal.plan.run","payloadSizeBytes":549,"expiresAt":1777334776537}
{"seq":15626,"ts":1777335011890,"type":"command-enqueued","id":"cmd_000000015626","commandType":"terminal.plan.run","payloadSizeBytes":560,"expiresAt":1777335056887}
{"seq":15629,"ts":1777335058568,"type":"command-enqueued","id":"cmd_000000015629","commandType":"terminal.plan.run","payloadSizeBytes":552,"expiresAt":1777335103563}
{"seq":15632,"ts":1777335063590,"type":"command-enqueued","id":"cmd_000000015632","commandType":"terminal.plan.run","payloadSizeBytes":568,"expiresAt":1777335108587}
{"seq":15635,"ts":1777335067996,"type":"command-enqueued","id":"cmd_000000015635","commandType":"terminal.plan.run","payloadSizeBytes":786,"expiresAt":1777335112979}
{"seq":15638,"ts":1777335072553,"type":"command-enqueued","id":"cmd_000000015638","commandType":"terminal.plan.run","payloadSizeBytes":549,"expiresAt":1777335117550}
{"seq":15666,"ts":1777341051530,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15667,"ts":1777341051533,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15668,"ts":1777341051534,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15677,"ts":1777341440551,"type":"command-enqueued","id":"cmd_000000015677","commandType":"terminal.plan.run","payloadSizeBytes":568,"expiresAt":1777341485549}
{"seq":15680,"ts":1777341453560,"type":"command-enqueued","id":"cmd_000000015680","commandType":"terminal.plan.run","payloadSizeBytes":568,"expiresAt":1777341498559}
{"seq":15683,"ts":1777341603574,"type":"command-enqueued","id":"cmd_000000015683","commandType":"terminal.plan.run","payloadSizeBytes":568,"expiresAt":1777341648573}
{"seq":15692,"ts":1777342369194,"type":"command-enqueued","id":"cmd_000000015692","commandType":"terminal.plan.run","payloadSizeBytes":568,"expiresAt":1777342414191}
{"seq":15697,"ts":1777342979282,"type":"command-enqueued","id":"cmd_000000015697","commandType":"terminal.plan.run","payloadSizeBytes":563,"expiresAt":1777343024280}
{"seq":15722,"ts":1777347158403,"type":"command-enqueued","id":"cmd_000000015722","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777347203401}
{"seq":15725,"ts":1777352857680,"type":"command-enqueued","id":"cmd_000000015725","commandType":"terminal.plan.run","payloadSizeBytes":546,"expiresAt":1777352902678}
{"seq":15752,"ts":1777354994445,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":15867,"ts":1777358175507,"type":"command-enqueued","id":"cmd_000000015867","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777358220506}
{"seq":15870,"ts":1777358179386,"type":"command-enqueued","id":"cmd_000000015870","commandType":"terminal.plan.run","payloadSizeBytes":561,"expiresAt":1777358224381}
{"seq":15878,"ts":1777358324001,"type":"command-enqueued","id":"cmd_000000015878","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777358368998}
{"seq":15881,"ts":1777358370258,"type":"command-enqueued","id":"cmd_000000015881","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777358415253}
{"seq":15884,"ts":1777358372754,"type":"command-enqueued","id":"cmd_000000015884","commandType":"terminal.plan.run","payloadSizeBytes":561,"expiresAt":1777358417749}
{"seq":15887,"ts":1777358375281,"type":"command-enqueued","id":"cmd_000000015887","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777358420279}
{"seq":15890,"ts":1777358378230,"type":"command-enqueued","id":"cmd_000000015890","commandType":"terminal.plan.run","payloadSizeBytes":556,"expiresAt":1777358423228}
{"seq":15898,"ts":1777358446380,"type":"command-enqueued","id":"cmd_000000015898","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777358491379}
{"seq":15900,"ts":1777358492204,"type":"command-enqueued","id":"cmd_000000015900","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777358537203}
{"seq":15903,"ts":1777358494193,"type":"command-enqueued","id":"cmd_000000015903","commandType":"terminal.plan.run","payloadSizeBytes":561,"expiresAt":1777358539191}
{"seq":15906,"ts":1777358496617,"type":"command-enqueued","id":"cmd_000000015906","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777358541616}
{"seq":15909,"ts":1777358498830,"type":"command-enqueued","id":"cmd_000000015909","commandType":"terminal.plan.run","payloadSizeBytes":556,"expiresAt":1777358543828}
{"seq":15921,"ts":1777359056308,"type":"command-enqueued","id":"cmd_000000015921","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777359061306}
{"seq":15924,"ts":1777359059013,"type":"command-enqueued","id":"cmd_000000015924","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777359064011}
{"seq":15927,"ts":1777359060900,"type":"command-enqueued","id":"cmd_000000015927","commandType":"terminal.plan.run","payloadSizeBytes":561,"expiresAt":1777359065898}
{"seq":15930,"ts":1777359063245,"type":"command-enqueued","id":"cmd_000000015930","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777359068244}
{"seq":15933,"ts":1777359065449,"type":"command-enqueued","id":"cmd_000000015933","commandType":"terminal.plan.run","payloadSizeBytes":556,"expiresAt":1777359070448}
{"seq":15940,"ts":1777359376733,"type":"command-enqueued","id":"cmd_000000015940","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777359381731}
{"seq":15942,"ts":1777359382066,"type":"command-enqueued","id":"cmd_000000015942","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777359387060}
{"seq":15948,"ts":1777359622913,"type":"command-enqueued","id":"cmd_000000015948","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777359667911}
{"seq":15951,"ts":1777359625124,"type":"command-enqueued","id":"cmd_000000015951","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777359670120}
{"seq":15954,"ts":1777359628078,"type":"command-enqueued","id":"cmd_000000015954","commandType":"terminal.plan.run","payloadSizeBytes":556,"expiresAt":1777359673077}
{"seq":15959,"ts":1777359973956,"type":"command-enqueued","id":"cmd_000000015959","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777360018953}
{"seq":15963,"ts":1777360410778,"type":"command-enqueued","id":"cmd_000000015963","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777360455773}
{"seq":15968,"ts":1777360735279,"type":"command-enqueued","id":"cmd_000000015968","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777360780271}
{"seq":15972,"ts":1777360741495,"type":"command-enqueued","id":"cmd_000000015972","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777360786494}
{"seq":15977,"ts":1777361619503,"type":"command-enqueued","id":"cmd_000000015977","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777361664501}
{"seq":15980,"ts":1777361621635,"type":"command-enqueued","id":"cmd_000000015980","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777361666634}
{"seq":15983,"ts":1777361623802,"type":"command-enqueued","id":"cmd_000000015983","commandType":"terminal.plan.run","payloadSizeBytes":561,"expiresAt":1777361668800}
{"seq":15986,"ts":1777361858132,"type":"command-enqueued","id":"cmd_000000015986","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777361903130}
{"seq":15989,"ts":1777361861328,"type":"command-enqueued","id":"cmd_000000015989","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777361906326}
{"seq":15992,"ts":1777361909807,"type":"command-enqueued","id":"cmd_000000015992","commandType":"terminal.plan.run","payloadSizeBytes":561,"expiresAt":1777361954799}
{"seq":15995,"ts":1777361913337,"type":"command-enqueued","id":"cmd_000000015995","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777361958333}
{"seq":15998,"ts":1777361967376,"type":"command-enqueued","id":"cmd_000000015998","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777362012374}
{"seq":16001,"ts":1777362013401,"type":"command-enqueued","id":"cmd_000000016001","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777362058399}
{"seq":16004,"ts":1777362059728,"type":"command-enqueued","id":"cmd_000000016004","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777362104726}
{"seq":16007,"ts":1777362106347,"type":"command-enqueued","id":"cmd_000000016007","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777362151345}
{"seq":16010,"ts":1777362778065,"type":"command-enqueued","id":"cmd_000000016010","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777362783063}
{"seq":16013,"ts":1777362780995,"type":"command-enqueued","id":"cmd_000000016013","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777362785993}
{"seq":16016,"ts":1777362783746,"type":"command-enqueued","id":"cmd_000000016016","commandType":"terminal.plan.run","payloadSizeBytes":561,"expiresAt":1777362788745}
{"seq":16018,"ts":1777362789700,"type":"command-enqueued","id":"cmd_000000016018","commandType":"terminal.plan.run","payloadSizeBytes":556,"expiresAt":1777362794699}
{"seq":16021,"ts":1777363411290,"type":"command-enqueued","id":"cmd_000000016021","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777363416288}
{"seq":16024,"ts":1777363413659,"type":"command-enqueued","id":"cmd_000000016024","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777363418657}
{"seq":16027,"ts":1777363415971,"type":"command-enqueued","id":"cmd_000000016027","commandType":"terminal.plan.run","payloadSizeBytes":561,"expiresAt":1777363420970}
{"seq":16030,"ts":1777363418372,"type":"command-enqueued","id":"cmd_000000016030","commandType":"terminal.plan.run","payloadSizeBytes":556,"expiresAt":1777363423369}
{"seq":16033,"ts":1777363447551,"type":"command-enqueued","id":"cmd_000000016033","commandType":"terminal.plan.run","payloadSizeBytes":550,"expiresAt":1777363452549}
{"seq":16044,"ts":1777364712888,"type":"command-enqueued","id":"cmd_000000016044","commandType":"terminal.plan.run","payloadSizeBytes":546,"expiresAt":1777364717886}
{"seq":16052,"ts":1777365192634,"type":"command-enqueued","id":"cmd_000000016052","commandType":"terminal.plan.run","payloadSizeBytes":546,"expiresAt":1777365197627}
{"seq":16060,"ts":1777365768264,"type":"command-enqueued","id":"cmd_000000016060","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777365773263}
{"seq":16063,"ts":1777365852087,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16064,"ts":1777365859938,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16065,"ts":1777365862735,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16071,"ts":1777367450313,"type":"command-enqueued","id":"cmd_000000016071","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777367455311}
{"seq":16139,"ts":1777368766382,"type":"command-enqueued","id":"cmd_000000016139","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777368771381}
{"seq":16143,"ts":1777368926012,"type":"command-enqueued","id":"cmd_000000016143","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777368931010}
{"seq":16215,"ts":1777369486457,"type":"command-enqueued","id":"cmd_000000016215","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777369491456}
{"seq":16217,"ts":1777369505899,"type":"command-enqueued","id":"cmd_000000016217","commandType":"terminal.plan.run","payloadSizeBytes":621,"expiresAt":1777369510895}
{"seq":16270,"ts":1777369617321,"type":"command-enqueued","id":"cmd_000000016270","commandType":"terminal.plan.run","payloadSizeBytes":621,"expiresAt":1777369622320}
{"seq":16330,"ts":1777369645532,"type":"command-enqueued","id":"cmd_000000016330","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777369650530}
{"seq":16408,"ts":1777369713938,"type":"command-enqueued","id":"cmd_000000016408","commandType":"terminal.plan.run","payloadSizeBytes":621,"expiresAt":1777369718936}
{"seq":16429,"ts":1777369978372,"type":"command-enqueued","id":"cmd_000000016429","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777369983369}
{"seq":16502,"ts":1777370031547,"type":"command-enqueued","id":"cmd_000000016502","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777370036546}
{"seq":16574,"ts":1777370176191,"type":"command-enqueued","id":"cmd_000000016574","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777370181190}
{"seq":16641,"ts":1777370356231,"type":"command-enqueued","id":"cmd_000000016641","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777370361226}
{"seq":16704,"ts":1777370395617,"type":"command-enqueued","id":"cmd_000000016704","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777370400615}
{"seq":16779,"ts":1777370561012,"type":"command-enqueued","id":"cmd_000000016779","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777370566010}
{"seq":16783,"ts":1777371171824,"type":"command-enqueued","id":"cmd_000000016783","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777371176821}
{"seq":16825,"ts":1777371193432,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16826,"ts":1777371193436,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16827,"ts":1777371193475,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16828,"ts":1777371193530,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16829,"ts":1777371193635,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16830,"ts":1777371193840,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16831,"ts":1777371194096,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16832,"ts":1777371194351,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16833,"ts":1777371194607,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16834,"ts":1777371194864,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16835,"ts":1777371195121,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16836,"ts":1777371195377,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16837,"ts":1777371195634,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16838,"ts":1777371195891,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16839,"ts":1777371196150,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16840,"ts":1777371196405,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16841,"ts":1777371196660,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16842,"ts":1777371196915,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16843,"ts":1777371197172,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16844,"ts":1777371197428,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16845,"ts":1777371197683,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16846,"ts":1777371197938,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16847,"ts":1777371198193,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16848,"ts":1777371198448,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16849,"ts":1777371198706,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16850,"ts":1777371198970,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16851,"ts":1777371199226,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16852,"ts":1777371199484,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16853,"ts":1777371199744,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16854,"ts":1777371200007,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16855,"ts":1777371200080,"type":"command-enqueued","id":"cmd_000000016855","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777371205076}
{"seq":16856,"ts":1777371200268,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16858,"ts":1777371200530,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16859,"ts":1777371200787,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16861,"ts":1777371201043,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16863,"ts":1777371201299,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16864,"ts":1777371201554,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16866,"ts":1777371201810,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16867,"ts":1777371202065,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16869,"ts":1777371202320,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16870,"ts":1777371202576,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16872,"ts":1777371202833,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16873,"ts":1777371203091,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16875,"ts":1777371203349,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16877,"ts":1777371203607,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16878,"ts":1777371203868,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16880,"ts":1777371204126,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16881,"ts":1777371204384,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16883,"ts":1777371204642,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16884,"ts":1777371204900,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16886,"ts":1777371205157,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16887,"ts":1777371205414,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16889,"ts":1777371205671,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16890,"ts":1777371205927,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16892,"ts":1777371206182,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16893,"ts":1777371206437,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16895,"ts":1777371206691,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16897,"ts":1777371206945,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16898,"ts":1777371207200,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16900,"ts":1777371207455,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16901,"ts":1777371207712,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16903,"ts":1777371207969,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16905,"ts":1777371208223,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16906,"ts":1777371208477,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16908,"ts":1777371208733,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16910,"ts":1777371208990,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16911,"ts":1777371209249,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16913,"ts":1777371209503,"type":"lease-denied","note":"Another bridge instance holds the lease"}
{"seq":16932,"ts":1777371258144,"type":"command-enqueued","id":"cmd_000000016932","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777371263142}
{"seq":16934,"ts":1777371269975,"type":"command-enqueued","id":"cmd_000000016934","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777371274973}
{"seq":16969,"ts":1777371298399,"type":"command-enqueued","id":"cmd_000000016969","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777371303397}
{"seq":17004,"ts":1777371838757,"type":"command-enqueued","id":"cmd_000000017004","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777371843748}
{"seq":17042,"ts":1777372053930,"type":"command-enqueued","id":"cmd_000000017042","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777372058928}
{"seq":17075,"ts":1777383458021,"type":"command-enqueued","id":"cmd_000000017075","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777383463019}
{"seq":17119,"ts":1777387317542,"type":"command-enqueued","id":"cmd_000000017119","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777387322540}
{"seq":17164,"ts":1777388032633,"type":"command-enqueued","id":"cmd_000000017164","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777388037631}
{"seq":17208,"ts":1777388062010,"type":"command-enqueued","id":"cmd_000000017208","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777388067007}
{"seq":17211,"ts":1777388091348,"type":"command-enqueued","id":"cmd_000000017211","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777388096343}
{"seq":17214,"ts":1777388120650,"type":"command-enqueued","id":"cmd_000000017214","commandType":"terminal.plan.run","payloadSizeBytes":865,"expiresAt":1777388125645}
{"seq":17255,"ts":1777388149954,"type":"command-enqueued","id":"cmd_000000017255","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777388154952}
{"seq":17298,"ts":1777388384782,"type":"command-enqueued","id":"cmd_000000017298","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777388389780}
{"seq":17300,"ts":1777388390479,"type":"command-enqueued","id":"cmd_000000017300","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777388395477}
{"seq":17303,"ts":1777388421123,"type":"command-enqueued","id":"cmd_000000017303","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777388426113}
{"seq":17338,"ts":1777390414068,"type":"command-enqueued","id":"cmd_000000017338","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777390419066}
{"seq":17342,"ts":1777391166833,"type":"command-enqueued","id":"cmd_000000017342","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777391171832}
{"seq":17403,"ts":1777391538952,"type":"command-enqueued","id":"cmd_000000017403","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777391543950}
{"seq":17482,"ts":1777397942164,"type":"command-enqueued","id":"cmd_000000017482","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777397947161}
{"seq":17531,"ts":1777397986551,"type":"command-enqueued","id":"cmd_000000017531","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777397991549}
{"seq":17603,"ts":1777398263181,"type":"command-enqueued","id":"cmd_000000017603","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777398268179}
{"seq":17677,"ts":1777398567146,"type":"command-enqueued","id":"cmd_000000017677","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777398572143}
{"seq":17681,"ts":1777398835933,"type":"command-enqueued","id":"cmd_000000017681","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777398840930}
{"seq":17752,"ts":1777399190050,"type":"command-enqueued","id":"cmd_000000017752","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777399195046}
{"seq":17820,"ts":1777399337905,"type":"command-enqueued","id":"cmd_000000017820","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777399342894}
{"seq":17886,"ts":1777399775355,"type":"command-enqueued","id":"cmd_000000017886","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777399780352}
{"seq":17955,"ts":1777400023193,"type":"command-enqueued","id":"cmd_000000017955","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777400028190}
{"seq":18019,"ts":1777400511976,"type":"command-enqueued","id":"cmd_000000018019","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777400516967}
{"seq":18083,"ts":1777400808201,"type":"command-enqueued","id":"cmd_000000018083","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777400813197}
{"seq":18146,"ts":1777400947854,"type":"command-enqueued","id":"cmd_000000018146","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777400952852}
{"seq":18151,"ts":1777401429351,"type":"command-enqueued","id":"cmd_000000018151","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777401434350}
{"seq":18213,"ts":1777401685594,"type":"command-enqueued","id":"cmd_000000018213","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777401690592}
{"seq":18266,"ts":1777401930082,"type":"command-enqueued","id":"cmd_000000018266","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777401935081}
{"seq":18316,"ts":1777402136896,"type":"command-enqueued","id":"cmd_000000018316","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777402141893}
{"seq":18369,"ts":1777402801647,"type":"command-enqueued","id":"cmd_000000018369","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777402806645}
{"seq":18373,"ts":1777403010341,"type":"command-enqueued","id":"cmd_000000018373","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777403015339}
{"seq":18375,"ts":1777403016222,"type":"command-enqueued","id":"cmd_000000018375","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777403021220}
{"seq":18380,"ts":1777403018430,"type":"command-enqueued","id":"cmd_000000018380","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777403023428}
{"seq":18385,"ts":1777403020705,"type":"command-enqueued","id":"cmd_000000018385","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777403025703}

----- /Users/andresgaibor/pt-dev/logs/pt-debug.current.ndjson -----
{"seq":10049,"timestamp":"2026-04-28T19:08:10.517Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10050,"timestamp":"2026-04-28T19:08:10.529Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10051,"timestamp":"2026-04-28T19:08:10.626Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10052,"timestamp":"2026-04-28T19:08:10.636Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10053,"timestamp":"2026-04-28T19:08:10.722Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10054,"timestamp":"2026-04-28T19:08:10.730Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10055,"timestamp":"2026-04-28T19:08:10.825Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10056,"timestamp":"2026-04-28T19:08:10.837Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10057,"timestamp":"2026-04-28T19:08:10.922Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10058,"timestamp":"2026-04-28T19:08:10.935Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10059,"timestamp":"2026-04-28T19:08:11.028Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10060,"timestamp":"2026-04-28T19:08:11.042Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10061,"timestamp":"2026-04-28T19:08:11.123Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10062,"timestamp":"2026-04-28T19:08:11.135Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10063,"timestamp":"2026-04-28T19:08:11.218Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10064,"timestamp":"2026-04-28T19:08:11.227Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10065,"timestamp":"2026-04-28T19:08:11.317Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10066,"timestamp":"2026-04-28T19:08:11.328Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10067,"timestamp":"2026-04-28T19:08:11.424Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10068,"timestamp":"2026-04-28T19:08:11.435Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10069,"timestamp":"2026-04-28T19:08:11.519Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10070,"timestamp":"2026-04-28T19:08:11.530Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10071,"timestamp":"2026-04-28T19:08:11.619Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10072,"timestamp":"2026-04-28T19:08:11.627Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10073,"timestamp":"2026-04-28T19:08:11.716Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10074,"timestamp":"2026-04-28T19:08:11.723Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10075,"timestamp":"2026-04-28T19:08:11.819Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10076,"timestamp":"2026-04-28T19:08:11.827Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10077,"timestamp":"2026-04-28T19:08:11.919Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10078,"timestamp":"2026-04-28T19:08:11.926Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10079,"timestamp":"2026-04-28T19:08:12.021Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10080,"timestamp":"2026-04-28T19:08:12.029Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10081,"timestamp":"2026-04-28T19:08:12.117Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10082,"timestamp":"2026-04-28T19:08:12.137Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10083,"timestamp":"2026-04-28T19:08:12.224Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10084,"timestamp":"2026-04-28T19:08:12.236Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10085,"timestamp":"2026-04-28T19:08:12.316Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10086,"timestamp":"2026-04-28T19:08:12.324Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10087,"timestamp":"2026-04-28T19:08:12.420Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10088,"timestamp":"2026-04-28T19:08:12.429Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10089,"timestamp":"2026-04-28T19:08:12.517Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10090,"timestamp":"2026-04-28T19:08:12.528Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10091,"timestamp":"2026-04-28T19:08:12.626Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10092,"timestamp":"2026-04-28T19:08:12.635Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10093,"timestamp":"2026-04-28T19:08:12.716Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10094,"timestamp":"2026-04-28T19:08:12.724Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10095,"timestamp":"2026-04-28T19:08:12.819Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10096,"timestamp":"2026-04-28T19:08:12.829Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10097,"timestamp":"2026-04-28T19:08:12.914Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10098,"timestamp":"2026-04-28T19:08:12.919Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10099,"timestamp":"2026-04-28T19:08:13.019Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10100,"timestamp":"2026-04-28T19:08:13.024Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10101,"timestamp":"2026-04-28T19:08:13.115Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10102,"timestamp":"2026-04-28T19:08:13.121Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10103,"timestamp":"2026-04-28T19:08:13.219Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10104,"timestamp":"2026-04-28T19:08:13.225Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10105,"timestamp":"2026-04-28T19:08:13.322Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10106,"timestamp":"2026-04-28T19:08:13.328Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10107,"timestamp":"2026-04-28T19:08:13.417Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10108,"timestamp":"2026-04-28T19:08:13.423Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10109,"timestamp":"2026-04-28T19:08:13.518Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10110,"timestamp":"2026-04-28T19:08:13.524Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10111,"timestamp":"2026-04-28T19:08:13.616Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10112,"timestamp":"2026-04-28T19:08:13.623Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10113,"timestamp":"2026-04-28T19:08:13.715Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10114,"timestamp":"2026-04-28T19:08:13.721Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10115,"timestamp":"2026-04-28T19:08:13.819Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10116,"timestamp":"2026-04-28T19:08:13.827Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10117,"timestamp":"2026-04-28T19:08:13.925Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10118,"timestamp":"2026-04-28T19:08:13.933Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10119,"timestamp":"2026-04-28T19:08:14.024Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10120,"timestamp":"2026-04-28T19:08:14.034Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10121,"timestamp":"2026-04-28T19:08:14.117Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10122,"timestamp":"2026-04-28T19:08:14.123Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10123,"timestamp":"2026-04-28T19:08:14.220Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10124,"timestamp":"2026-04-28T19:08:14.234Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10125,"timestamp":"2026-04-28T19:08:14.319Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10126,"timestamp":"2026-04-28T19:08:14.329Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10127,"timestamp":"2026-04-28T19:08:14.421Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10128,"timestamp":"2026-04-28T19:08:14.433Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10129,"timestamp":"2026-04-28T19:08:14.524Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10130,"timestamp":"2026-04-28T19:08:14.537Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10131,"timestamp":"2026-04-28T19:08:14.625Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10132,"timestamp":"2026-04-28T19:08:14.635Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10133,"timestamp":"2026-04-28T19:08:14.723Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10134,"timestamp":"2026-04-28T19:08:14.735Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10135,"timestamp":"2026-04-28T19:08:14.822Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10136,"timestamp":"2026-04-28T19:08:14.830Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10137,"timestamp":"2026-04-28T19:08:14.922Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10138,"timestamp":"2026-04-28T19:08:14.935Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10139,"timestamp":"2026-04-28T19:08:15.028Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10140,"timestamp":"2026-04-28T19:08:15.041Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10141,"timestamp":"2026-04-28T19:08:15.123Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10142,"timestamp":"2026-04-28T19:08:15.134Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10143,"timestamp":"2026-04-28T19:08:15.225Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10144,"timestamp":"2026-04-28T19:08:15.237Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10145,"timestamp":"2026-04-28T19:08:15.323Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10146,"timestamp":"2026-04-28T19:08:15.334Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10147,"timestamp":"2026-04-28T19:08:15.433Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10148,"timestamp":"2026-04-28T19:08:15.441Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10149,"timestamp":"2026-04-28T19:08:15.522Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10150,"timestamp":"2026-04-28T19:08:15.535Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10151,"timestamp":"2026-04-28T19:08:15.628Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10152,"timestamp":"2026-04-28T19:08:15.641Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10153,"timestamp":"2026-04-28T19:08:15.716Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10154,"timestamp":"2026-04-28T19:08:15.728Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10155,"timestamp":"2026-04-28T19:08:15.816Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10156,"timestamp":"2026-04-28T19:08:15.823Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10157,"timestamp":"2026-04-28T19:08:15.918Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10158,"timestamp":"2026-04-28T19:08:15.929Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10159,"timestamp":"2026-04-28T19:08:16.025Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10160,"timestamp":"2026-04-28T19:08:16.037Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10161,"timestamp":"2026-04-28T19:08:16.119Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10162,"timestamp":"2026-04-28T19:08:16.131Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10163,"timestamp":"2026-04-28T19:08:16.218Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10164,"timestamp":"2026-04-28T19:08:16.228Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10165,"timestamp":"2026-04-28T19:08:16.314Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10166,"timestamp":"2026-04-28T19:08:16.321Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10167,"timestamp":"2026-04-28T19:08:16.429Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10168,"timestamp":"2026-04-28T19:08:16.435Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10169,"timestamp":"2026-04-28T19:08:16.522Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10170,"timestamp":"2026-04-28T19:08:16.532Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10171,"timestamp":"2026-04-28T19:08:16.624Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10172,"timestamp":"2026-04-28T19:08:16.634Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10173,"timestamp":"2026-04-28T19:08:16.715Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10174,"timestamp":"2026-04-28T19:08:16.723Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10175,"timestamp":"2026-04-28T19:08:16.818Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10176,"timestamp":"2026-04-28T19:08:16.826Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10177,"timestamp":"2026-04-28T19:08:16.915Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10178,"timestamp":"2026-04-28T19:08:16.923Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10179,"timestamp":"2026-04-28T19:08:17.021Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10180,"timestamp":"2026-04-28T19:08:17.030Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10181,"timestamp":"2026-04-28T19:08:17.117Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10182,"timestamp":"2026-04-28T19:08:17.125Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10183,"timestamp":"2026-04-28T19:08:17.219Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10184,"timestamp":"2026-04-28T19:08:17.228Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10185,"timestamp":"2026-04-28T19:08:17.356Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10186,"timestamp":"2026-04-28T19:08:17.367Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10187,"timestamp":"2026-04-28T19:08:17.419Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10188,"timestamp":"2026-04-28T19:08:17.427Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10189,"timestamp":"2026-04-28T19:08:17.516Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10190,"timestamp":"2026-04-28T19:08:17.524Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10191,"timestamp":"2026-04-28T19:08:17.617Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10192,"timestamp":"2026-04-28T19:08:17.626Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10193,"timestamp":"2026-04-28T19:08:17.715Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10194,"timestamp":"2026-04-28T19:08:17.726Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10195,"timestamp":"2026-04-28T19:08:17.821Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10196,"timestamp":"2026-04-28T19:08:17.835Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10197,"timestamp":"2026-04-28T19:08:17.918Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10198,"timestamp":"2026-04-28T19:08:17.932Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10199,"timestamp":"2026-04-28T19:08:18.021Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10200,"timestamp":"2026-04-28T19:08:18.030Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10201,"timestamp":"2026-04-28T19:08:18.122Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10202,"timestamp":"2026-04-28T19:08:18.133Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10203,"timestamp":"2026-04-28T19:08:18.220Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10204,"timestamp":"2026-04-28T19:08:18.233Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10205,"timestamp":"2026-04-28T19:08:18.317Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10206,"timestamp":"2026-04-28T19:08:18.325Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10207,"timestamp":"2026-04-28T19:08:18.420Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10208,"timestamp":"2026-04-28T19:08:18.432Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10209,"timestamp":"2026-04-28T19:08:18.519Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10210,"timestamp":"2026-04-28T19:08:18.526Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10211,"timestamp":"2026-04-28T19:08:18.636Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10212,"timestamp":"2026-04-28T19:08:18.646Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10213,"timestamp":"2026-04-28T19:08:18.719Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10214,"timestamp":"2026-04-28T19:08:18.727Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10215,"timestamp":"2026-04-28T19:08:18.825Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10216,"timestamp":"2026-04-28T19:08:18.835Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10217,"timestamp":"2026-04-28T19:08:18.923Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10218,"timestamp":"2026-04-28T19:08:18.935Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10219,"timestamp":"2026-04-28T19:08:19.052Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10220,"timestamp":"2026-04-28T19:08:19.066Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10221,"timestamp":"2026-04-28T19:08:19.122Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10222,"timestamp":"2026-04-28T19:08:19.140Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10223,"timestamp":"2026-04-28T19:08:19.221Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10224,"timestamp":"2026-04-28T19:08:19.232Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10225,"timestamp":"2026-04-28T19:08:19.319Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10226,"timestamp":"2026-04-28T19:08:19.331Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10227,"timestamp":"2026-04-28T19:08:19.422Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10228,"timestamp":"2026-04-28T19:08:19.433Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10229,"timestamp":"2026-04-28T19:08:19.523Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10230,"timestamp":"2026-04-28T19:08:19.536Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10231,"timestamp":"2026-04-28T19:08:19.625Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10232,"timestamp":"2026-04-28T19:08:19.640Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10233,"timestamp":"2026-04-28T19:08:19.723Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10234,"timestamp":"2026-04-28T19:08:19.730Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10235,"timestamp":"2026-04-28T19:08:19.819Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10236,"timestamp":"2026-04-28T19:08:19.826Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10237,"timestamp":"2026-04-28T19:08:19.923Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10238,"timestamp":"2026-04-28T19:08:19.935Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10239,"timestamp":"2026-04-28T19:08:20.026Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10240,"timestamp":"2026-04-28T19:08:20.037Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10241,"timestamp":"2026-04-28T19:08:20.120Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10242,"timestamp":"2026-04-28T19:08:20.133Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10243,"timestamp":"2026-04-28T19:08:20.225Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10244,"timestamp":"2026-04-28T19:08:20.237Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10245,"timestamp":"2026-04-28T19:08:20.320Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10246,"timestamp":"2026-04-28T19:08:20.331Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10247,"timestamp":"2026-04-28T19:08:20.427Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10248,"timestamp":"2026-04-28T19:08:20.439Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10249,"timestamp":"2026-04-28T19:08:20.525Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10250,"timestamp":"2026-04-28T19:08:20.539Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10251,"timestamp":"2026-04-28T19:08:20.618Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10252,"timestamp":"2026-04-28T19:08:20.629Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10253,"timestamp":"2026-04-28T19:08:20.721Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10254,"timestamp":"2026-04-28T19:08:20.730Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10255,"timestamp":"2026-04-28T19:08:20.826Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10256,"timestamp":"2026-04-28T19:08:20.836Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10257,"timestamp":"2026-04-28T19:08:20.922Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10258,"timestamp":"2026-04-28T19:08:20.934Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10259,"timestamp":"2026-04-28T19:08:21.024Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10260,"timestamp":"2026-04-28T19:08:21.036Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10261,"timestamp":"2026-04-28T19:08:21.122Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10262,"timestamp":"2026-04-28T19:08:21.134Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10263,"timestamp":"2026-04-28T19:08:21.224Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10264,"timestamp":"2026-04-28T19:08:21.236Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10265,"timestamp":"2026-04-28T19:08:21.323Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10266,"timestamp":"2026-04-28T19:08:21.335Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10267,"timestamp":"2026-04-28T19:08:21.426Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10268,"timestamp":"2026-04-28T19:08:21.437Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10269,"timestamp":"2026-04-28T19:08:21.520Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10270,"timestamp":"2026-04-28T19:08:21.528Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10271,"timestamp":"2026-04-28T19:08:21.617Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10272,"timestamp":"2026-04-28T19:08:21.629Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10273,"timestamp":"2026-04-28T19:08:21.722Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10274,"timestamp":"2026-04-28T19:08:21.732Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10275,"timestamp":"2026-04-28T19:08:21.832Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10276,"timestamp":"2026-04-28T19:08:21.844Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10277,"timestamp":"2026-04-28T19:08:21.936Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10278,"timestamp":"2026-04-28T19:08:21.950Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10279,"timestamp":"2026-04-28T19:08:22.028Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10280,"timestamp":"2026-04-28T19:08:22.040Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10281,"timestamp":"2026-04-28T19:08:22.123Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10282,"timestamp":"2026-04-28T19:08:22.135Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10283,"timestamp":"2026-04-28T19:08:22.225Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10284,"timestamp":"2026-04-28T19:08:22.237Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10285,"timestamp":"2026-04-28T19:08:22.320Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10286,"timestamp":"2026-04-28T19:08:22.327Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10287,"timestamp":"2026-04-28T19:08:22.425Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10288,"timestamp":"2026-04-28T19:08:22.437Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10289,"timestamp":"2026-04-28T19:08:22.526Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10290,"timestamp":"2026-04-28T19:08:22.539Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10291,"timestamp":"2026-04-28T19:08:22.622Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10292,"timestamp":"2026-04-28T19:08:22.631Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10293,"timestamp":"2026-04-28T19:08:22.718Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10294,"timestamp":"2026-04-28T19:08:22.725Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10295,"timestamp":"2026-04-28T19:08:22.817Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10296,"timestamp":"2026-04-28T19:08:22.824Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10297,"timestamp":"2026-04-28T19:08:22.919Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10298,"timestamp":"2026-04-28T19:08:22.932Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10299,"timestamp":"2026-04-28T19:08:23.022Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10300,"timestamp":"2026-04-28T19:08:23.034Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10301,"timestamp":"2026-04-28T19:08:23.134Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10302,"timestamp":"2026-04-28T19:08:23.147Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10303,"timestamp":"2026-04-28T19:08:23.224Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10304,"timestamp":"2026-04-28T19:08:23.232Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10305,"timestamp":"2026-04-28T19:08:23.318Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10306,"timestamp":"2026-04-28T19:08:23.331Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10307,"timestamp":"2026-04-28T19:08:23.429Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10308,"timestamp":"2026-04-28T19:08:23.441Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10309,"timestamp":"2026-04-28T19:08:23.524Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10310,"timestamp":"2026-04-28T19:08:23.537Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10311,"timestamp":"2026-04-28T19:08:23.623Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10312,"timestamp":"2026-04-28T19:08:23.635Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10313,"timestamp":"2026-04-28T19:08:23.721Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10314,"timestamp":"2026-04-28T19:08:23.731Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10315,"timestamp":"2026-04-28T19:08:23.817Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10316,"timestamp":"2026-04-28T19:08:23.830Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10317,"timestamp":"2026-04-28T19:08:23.918Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10318,"timestamp":"2026-04-28T19:08:23.928Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10319,"timestamp":"2026-04-28T19:08:24.027Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10320,"timestamp":"2026-04-28T19:08:24.039Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10321,"timestamp":"2026-04-28T19:08:24.119Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10322,"timestamp":"2026-04-28T19:08:24.129Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10323,"timestamp":"2026-04-28T19:08:24.233Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10324,"timestamp":"2026-04-28T19:08:24.244Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10325,"timestamp":"2026-04-28T19:08:24.316Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10326,"timestamp":"2026-04-28T19:08:24.325Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10327,"timestamp":"2026-04-28T19:08:24.424Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10328,"timestamp":"2026-04-28T19:08:24.436Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10329,"timestamp":"2026-04-28T19:08:24.525Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10330,"timestamp":"2026-04-28T19:08:24.538Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10331,"timestamp":"2026-04-28T19:08:24.623Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10332,"timestamp":"2026-04-28T19:08:24.630Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10333,"timestamp":"2026-04-28T19:08:24.720Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10334,"timestamp":"2026-04-28T19:08:24.728Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10335,"timestamp":"2026-04-28T19:08:24.818Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10336,"timestamp":"2026-04-28T19:08:24.825Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10337,"timestamp":"2026-04-28T19:08:24.918Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10338,"timestamp":"2026-04-28T19:08:24.968Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10339,"timestamp":"2026-04-28T19:08:25.052Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10340,"timestamp":"2026-04-28T19:08:25.085Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10341,"timestamp":"2026-04-28T19:08:25.125Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10342,"timestamp":"2026-04-28T19:08:25.134Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10343,"timestamp":"2026-04-28T19:08:25.316Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10344,"timestamp":"2026-04-28T19:08:25.323Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10345,"timestamp":"2026-04-28T19:08:25.347Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10346,"timestamp":"2026-04-28T19:08:25.367Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10347,"timestamp":"2026-04-28T19:08:25.435Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10348,"timestamp":"2026-04-28T19:08:25.448Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10349,"timestamp":"2026-04-28T19:08:25.533Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10350,"timestamp":"2026-04-28T19:08:25.568Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10351,"timestamp":"2026-04-28T19:08:25.622Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10352,"timestamp":"2026-04-28T19:08:25.630Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10353,"timestamp":"2026-04-28T19:08:25.722Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10354,"timestamp":"2026-04-28T19:08:25.732Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10355,"timestamp":"2026-04-28T19:08:25.821Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10356,"timestamp":"2026-04-28T19:08:25.832Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10357,"timestamp":"2026-04-28T19:08:25.923Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10358,"timestamp":"2026-04-28T19:08:25.935Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10359,"timestamp":"2026-04-28T19:08:26.022Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10360,"timestamp":"2026-04-28T19:08:26.030Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10361,"timestamp":"2026-04-28T19:08:26.122Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10362,"timestamp":"2026-04-28T19:08:26.135Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10363,"timestamp":"2026-04-28T19:08:26.224Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10364,"timestamp":"2026-04-28T19:08:26.237Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10365,"timestamp":"2026-04-28T19:08:26.319Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10366,"timestamp":"2026-04-28T19:08:26.327Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10367,"timestamp":"2026-04-28T19:08:26.425Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10368,"timestamp":"2026-04-28T19:08:26.437Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10369,"timestamp":"2026-04-28T19:08:26.524Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10370,"timestamp":"2026-04-28T19:08:26.561Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10371,"timestamp":"2026-04-28T19:08:26.623Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10372,"timestamp":"2026-04-28T19:08:26.630Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10373,"timestamp":"2026-04-28T19:08:26.723Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10374,"timestamp":"2026-04-28T19:08:26.733Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10375,"timestamp":"2026-04-28T19:08:26.819Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10376,"timestamp":"2026-04-28T19:08:26.832Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10377,"timestamp":"2026-04-28T19:08:26.924Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10378,"timestamp":"2026-04-28T19:08:26.937Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10379,"timestamp":"2026-04-28T19:08:27.026Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10380,"timestamp":"2026-04-28T19:08:27.033Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10381,"timestamp":"2026-04-28T19:08:27.122Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10382,"timestamp":"2026-04-28T19:08:27.134Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10383,"timestamp":"2026-04-28T19:08:27.220Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10384,"timestamp":"2026-04-28T19:08:27.237Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10385,"timestamp":"2026-04-28T19:08:27.317Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10386,"timestamp":"2026-04-28T19:08:27.331Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10387,"timestamp":"2026-04-28T19:08:27.430Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10388,"timestamp":"2026-04-28T19:08:27.442Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10389,"timestamp":"2026-04-28T19:08:27.523Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10390,"timestamp":"2026-04-28T19:08:27.536Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10391,"timestamp":"2026-04-28T19:08:27.618Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10392,"timestamp":"2026-04-28T19:08:27.625Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10393,"timestamp":"2026-04-28T19:08:27.716Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10394,"timestamp":"2026-04-28T19:08:27.723Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10395,"timestamp":"2026-04-28T19:08:27.822Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10396,"timestamp":"2026-04-28T19:08:27.835Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10397,"timestamp":"2026-04-28T19:08:27.923Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10398,"timestamp":"2026-04-28T19:08:27.935Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10399,"timestamp":"2026-04-28T19:08:28.024Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10400,"timestamp":"2026-04-28T19:08:28.034Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10401,"timestamp":"2026-04-28T19:08:28.121Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10402,"timestamp":"2026-04-28T19:08:28.130Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10403,"timestamp":"2026-04-28T19:08:28.225Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10404,"timestamp":"2026-04-28T19:08:28.237Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10405,"timestamp":"2026-04-28T19:08:28.323Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10406,"timestamp":"2026-04-28T19:08:28.330Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10407,"timestamp":"2026-04-28T19:08:28.425Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10408,"timestamp":"2026-04-28T19:08:28.436Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10409,"timestamp":"2026-04-28T19:08:28.523Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10410,"timestamp":"2026-04-28T19:08:28.536Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10411,"timestamp":"2026-04-28T19:08:28.622Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10412,"timestamp":"2026-04-28T19:08:28.630Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10413,"timestamp":"2026-04-28T19:08:28.721Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10414,"timestamp":"2026-04-28T19:08:28.728Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10415,"timestamp":"2026-04-28T19:08:28.820Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10416,"timestamp":"2026-04-28T19:08:28.828Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10417,"timestamp":"2026-04-28T19:08:28.920Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10418,"timestamp":"2026-04-28T19:08:28.929Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10419,"timestamp":"2026-04-28T19:08:29.027Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10420,"timestamp":"2026-04-28T19:08:29.039Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10421,"timestamp":"2026-04-28T19:08:29.123Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10422,"timestamp":"2026-04-28T19:08:29.136Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10423,"timestamp":"2026-04-28T19:08:29.222Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10424,"timestamp":"2026-04-28T19:08:29.232Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10425,"timestamp":"2026-04-28T19:08:29.322Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10426,"timestamp":"2026-04-28T19:08:29.334Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10427,"timestamp":"2026-04-28T19:08:29.426Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10428,"timestamp":"2026-04-28T19:08:29.437Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10429,"timestamp":"2026-04-28T19:08:29.524Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10430,"timestamp":"2026-04-28T19:08:29.538Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10431,"timestamp":"2026-04-28T19:08:29.618Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10432,"timestamp":"2026-04-28T19:08:29.629Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10433,"timestamp":"2026-04-28T19:08:29.865Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10434,"timestamp":"2026-04-28T19:08:29.962Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10435,"timestamp":"2026-04-28T19:08:30.137Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10436,"timestamp":"2026-04-28T19:08:30.147Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10437,"timestamp":"2026-04-28T19:08:30.226Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10438,"timestamp":"2026-04-28T19:08:30.233Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10439,"timestamp":"2026-04-28T19:08:30.322Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10440,"timestamp":"2026-04-28T19:08:30.330Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10441,"timestamp":"2026-04-28T19:08:30.420Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10442,"timestamp":"2026-04-28T19:08:30.429Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10443,"timestamp":"2026-04-28T19:08:30.519Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10444,"timestamp":"2026-04-28T19:08:30.526Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10445,"timestamp":"2026-04-28T19:08:30.624Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10446,"timestamp":"2026-04-28T19:08:30.656Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10447,"timestamp":"2026-04-28T19:08:30.720Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10448,"timestamp":"2026-04-28T19:08:30.729Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10449,"timestamp":"2026-04-28T19:08:30.816Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10450,"timestamp":"2026-04-28T19:08:30.824Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10451,"timestamp":"2026-04-28T19:08:30.918Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10452,"timestamp":"2026-04-28T19:08:30.927Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10453,"timestamp":"2026-04-28T19:08:31.021Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10454,"timestamp":"2026-04-28T19:08:31.034Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10455,"timestamp":"2026-04-28T19:08:31.120Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10456,"timestamp":"2026-04-28T19:08:31.131Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10457,"timestamp":"2026-04-28T19:08:31.252Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10458,"timestamp":"2026-04-28T19:08:31.260Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10459,"timestamp":"2026-04-28T19:08:31.325Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10460,"timestamp":"2026-04-28T19:08:31.340Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10461,"timestamp":"2026-04-28T19:08:31.416Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10462,"timestamp":"2026-04-28T19:08:31.425Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10463,"timestamp":"2026-04-28T19:08:31.514Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10464,"timestamp":"2026-04-28T19:08:31.518Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10465,"timestamp":"2026-04-28T19:08:31.613Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10466,"timestamp":"2026-04-28T19:08:31.617Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10467,"timestamp":"2026-04-28T19:08:31.714Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10468,"timestamp":"2026-04-28T19:08:31.719Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10469,"timestamp":"2026-04-28T19:08:31.817Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10470,"timestamp":"2026-04-28T19:08:31.821Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10471,"timestamp":"2026-04-28T19:08:31.920Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10472,"timestamp":"2026-04-28T19:08:31.923Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10473,"timestamp":"2026-04-28T19:08:32.017Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10474,"timestamp":"2026-04-28T19:08:32.022Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10475,"timestamp":"2026-04-28T19:08:32.115Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10476,"timestamp":"2026-04-28T19:08:32.119Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10477,"timestamp":"2026-04-28T19:08:32.222Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10478,"timestamp":"2026-04-28T19:08:32.229Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10479,"timestamp":"2026-04-28T19:08:32.325Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10480,"timestamp":"2026-04-28T19:08:32.333Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10481,"timestamp":"2026-04-28T19:08:32.422Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10482,"timestamp":"2026-04-28T19:08:32.434Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10483,"timestamp":"2026-04-28T19:08:32.526Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10484,"timestamp":"2026-04-28T19:08:32.541Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10485,"timestamp":"2026-04-28T19:08:32.630Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10486,"timestamp":"2026-04-28T19:08:32.641Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10487,"timestamp":"2026-04-28T19:08:32.728Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10488,"timestamp":"2026-04-28T19:08:32.737Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10489,"timestamp":"2026-04-28T19:08:32.817Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10490,"timestamp":"2026-04-28T19:08:32.831Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10491,"timestamp":"2026-04-28T19:08:32.923Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10492,"timestamp":"2026-04-28T19:08:32.935Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10493,"timestamp":"2026-04-28T19:08:33.025Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10494,"timestamp":"2026-04-28T19:08:33.036Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10495,"timestamp":"2026-04-28T19:08:33.121Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10496,"timestamp":"2026-04-28T19:08:33.128Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10497,"timestamp":"2026-04-28T19:08:33.217Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10498,"timestamp":"2026-04-28T19:08:33.224Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10499,"timestamp":"2026-04-28T19:08:33.318Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10500,"timestamp":"2026-04-28T19:08:33.326Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10501,"timestamp":"2026-04-28T19:08:33.416Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10502,"timestamp":"2026-04-28T19:08:33.423Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10503,"timestamp":"2026-04-28T19:08:33.527Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10504,"timestamp":"2026-04-28T19:08:33.534Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10505,"timestamp":"2026-04-28T19:08:33.619Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10506,"timestamp":"2026-04-28T19:08:33.629Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10507,"timestamp":"2026-04-28T19:08:33.724Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10508,"timestamp":"2026-04-28T19:08:33.731Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10509,"timestamp":"2026-04-28T19:08:33.817Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10510,"timestamp":"2026-04-28T19:08:33.824Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10511,"timestamp":"2026-04-28T19:08:33.918Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10512,"timestamp":"2026-04-28T19:08:33.925Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10513,"timestamp":"2026-04-28T19:08:34.021Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10514,"timestamp":"2026-04-28T19:08:34.028Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10515,"timestamp":"2026-04-28T19:08:34.122Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10516,"timestamp":"2026-04-28T19:08:34.134Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10517,"timestamp":"2026-04-28T19:08:34.216Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10518,"timestamp":"2026-04-28T19:08:34.225Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10519,"timestamp":"2026-04-28T19:08:34.318Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10520,"timestamp":"2026-04-28T19:08:34.327Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10521,"timestamp":"2026-04-28T19:08:34.418Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10522,"timestamp":"2026-04-28T19:08:34.426Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10523,"timestamp":"2026-04-28T19:08:34.530Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10524,"timestamp":"2026-04-28T19:08:34.542Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10525,"timestamp":"2026-04-28T19:08:34.620Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10526,"timestamp":"2026-04-28T19:08:34.629Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10527,"timestamp":"2026-04-28T19:08:34.723Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10528,"timestamp":"2026-04-28T19:08:34.731Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10529,"timestamp":"2026-04-28T19:08:34.817Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10530,"timestamp":"2026-04-28T19:08:34.825Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10531,"timestamp":"2026-04-28T19:08:34.925Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10532,"timestamp":"2026-04-28T19:08:34.935Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10533,"timestamp":"2026-04-28T19:08:35.020Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10534,"timestamp":"2026-04-28T19:08:35.027Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10535,"timestamp":"2026-04-28T19:08:35.121Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10536,"timestamp":"2026-04-28T19:08:35.133Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10537,"timestamp":"2026-04-28T19:08:35.219Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10538,"timestamp":"2026-04-28T19:08:35.233Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10539,"timestamp":"2026-04-28T19:08:35.322Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10540,"timestamp":"2026-04-28T19:08:35.330Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10541,"timestamp":"2026-04-28T19:08:35.423Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10542,"timestamp":"2026-04-28T19:08:35.432Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10543,"timestamp":"2026-04-28T19:08:35.532Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10544,"timestamp":"2026-04-28T19:08:35.546Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10545,"timestamp":"2026-04-28T19:08:35.632Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10546,"timestamp":"2026-04-28T19:08:35.640Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10547,"timestamp":"2026-04-28T19:08:35.717Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
{"seq":10548,"timestamp":"2026-04-28T19:08:35.728Z","scope":"queue","message":"[queue-claim] candidatos vistos: 0","level":"debug"}
```

## source grep queue/poller wiring
```
packages/generated/runtime.js:40:    phase: "queued",
packages/generated/runtime.js:44:    state: "queued",
packages/generated/runtime.js:364:      queue: [],
packages/generated/runtime.js:1255:  var HEARTBEAT_FILE = payload && payload.heartbeatFile;
packages/generated/runtime.js:1256:  if (!HEARTBEAT_FILE) return { ok: false, error: "Missing heartbeatFile" };
packages/generated/runtime.js:5166:      case "__pollDeferred": return handlePollDeferred(payload);
packages/generated/main.js:15:var IN_FLIGHT_DIR = DEV_DIR + "/in-flight";
packages/generated/main.js:17:var DEAD_LETTER_DIR = DEV_DIR + "/dead-letter";
packages/generated/main.js:35:var heartbeatInterval = null;
packages/generated/main.js:367:    dprint("[queue] list error: " + String(e));
packages/generated/main.js:381:function claimNextCommand() {
packages/generated/main.js:409:            claimedAt: Date.now()
packages/generated/main.js:444:    dprint("[PT] Moved to dead-letter: " + basename);
packages/generated/main.js:460:  var claimed = claimNextCommand();
packages/generated/main.js:461:  if (!claimed) return;
packages/generated/main.js:463:  activeCommand = claimed.command;
packages/generated/main.js:464:  lastCommandId = claimed.command.id;
packages/generated/main.js:480:      queueStateAtStart: { pending: countQueueFiles() }
packages/generated/main.js:510:      queueStateAtEnd: { pending: countQueueFiles() }
packages/generated/main.js:523:  writeResultEnvelope(cmd.id, {
packages/generated/main.js:891:function writeResultEnvelope(id, envelope) {
packages/generated/main.js:944:    markCleanup("clear-heartbeat");
packages/generated/main.js:945:    if (heartbeatInterval) {
packages/generated/main.js:946:      clearInterval(heartbeatInterval);
packages/generated/main.js:947:      heartbeatInterval = null;
packages/file-bridge/tests/crash-recovery.test.ts:19:    mkdirSync(join(tempDir, "in-flight"), { recursive: true });
packages/file-bridge/tests/crash-recovery.test.ts:22:    mkdirSync(join(tempDir, "dead-letter"), { recursive: true });
packages/file-bridge/tests/crash-recovery.test.ts:32:    const inFlightDir = join(tempDir, "in-flight");
packages/file-bridge/tests/crash-recovery.test.ts:35:    // Command in in-flight
packages/file-bridge/tests/crash-recovery.test.ts:70:    const inFlightDir = join(tempDir, "in-flight");
packages/file-bridge/tests/crash-recovery.test.ts:99:  test("requeued command has incremented attempt counter", async () => {
packages/file-bridge/tests/crash-recovery.test.ts:100:    const inFlightDir = join(tempDir, "in-flight");
packages/file-bridge/tests/crash-recovery.test.ts:118:    // Check requeued command
packages/file-bridge/tests/crash-recovery.test.ts:122:    const requeued: BridgeCommandEnvelope = JSON.parse(
packages/file-bridge/tests/crash-recovery.test.ts:126:    expect(requeued.attempt).toBe(2);
packages/file-bridge/tests/crash-recovery.test.ts:130:    const inFlightDir = join(tempDir, "in-flight");
packages/file-bridge/tests/crash-recovery.test.ts:153:    // All should be requeued
packages/file-bridge/tests/crash-recovery.test.ts:164:    const inFlightDir = join(tempDir, "in-flight");
packages/file-bridge/tests/crash-recovery.test.ts:180:    // Before start, file is in in-flight
packages/file-bridge/tests/crash-recovery.test.ts:186:    // After start, file should be in commands (requeued)
packages/file-bridge/tests/file-bridge-v2.test.ts:35:      expect(existsSync(join(testDir, "in-flight"))).toBe(true);
packages/file-bridge/tests/file-bridge-v2.test.ts:39:      expect(existsSync(join(testDir, "dead-letter"))).toBe(true);
packages/file-bridge/tests/file-bridge-v2.test.ts:85:  describe("sendCommandAndWait", () => {
packages/file-bridge/tests/file-bridge-v2.test.ts:88:      const result = await bridge.sendCommandAndWait("addDevice", { name: "R1" }, 100);
packages/file-bridge/tests/file-bridge-v2.test.ts:128:        if (type === "__pollDeferred") {
packages/file-bridge/tests/file-bridge-v2.test.ts:152:      const result = await bridge.sendCommandAndWait("execPc", { device: "PC1", command: "ping" });
packages/file-bridge/tests/file-bridge-v2.test.ts:154:      expect(sentTypes).toEqual(["execPc", "__pollDeferred"]);
packages/file-bridge/tests/file-bridge-v2.test.ts:199:        if (type === "__pollDeferred") {
packages/file-bridge/tests/file-bridge-v2.test.ts:223:      const result = await (bridge as any).sendCommandAndWait(
packages/file-bridge/tests/file-bridge-v2.test.ts:250:        const result = await bridge.sendCommandAndWait("addDevice", { name: "R1" }, 100);
packages/file-bridge/tests/file-bridge-v2.test.ts:267:      expect(diag.queues).toBeDefined();
packages/file-bridge/tests/file-bridge-v2.test.ts:278:      expect(diag.queues.pendingCommands).toBeGreaterThanOrEqual(2);
packages/file-bridge/tests/file-bridge-v2.test.ts:285:      // no heartbeat yet
packages/file-bridge/tests/file-bridge-v2.test.ts:288:      // create heartbeat file
packages/file-bridge/tests/file-bridge-v2.test.ts:290:      const hbPath = join(testDir, "heartbeat.json");
packages/file-bridge/tests/file-bridge-v2.test.ts:304:      const hbPath = join(testDir, "heartbeat.json");
packages/file-bridge/tests/file-bridge-v2.test.ts:327:      expect(typeof s.queueIndexDrift).toBe("boolean");
packages/file-bridge/tests/file-bridge-v2.test.ts:328:      expect(s.claimMode).toBe("unknown");
packages/file-bridge/tests/file-bridge-v2.test.ts:355:    it("should requeue in-flight commands without results on start", () => {
packages/file-bridge/tests/file-bridge-v2.test.ts:356:      // Simulate: write a command to in-flight without a result
packages/file-bridge/tests/file-bridge-v2.test.ts:360:      // Manually move to in-flight (simulating crash)
packages/file-bridge/tests/file-bridge-v2.test.ts:368:        "in-flight",
packages/file-bridge/tests/file-bridge-v2.test.ts:375:      // Write directly to in-flight (as if PT was processing but crashed)
packages/file-bridge/tests/file-bridge-v2.test.ts:378:      // Restart - should detect in-flight without result and requeue
packages/file-bridge/tests/file-bridge-v2.test.ts:382:      // Command should be requeued (attempt incremented)
packages/file-bridge/tests/file-bridge-v2.test.ts:444:  it("sendCommandAndWait no llama waitForCapacity antes de sendCommand", async () => {
packages/file-bridge/tests/file-bridge-v2.test.ts:455:    const resultPromise = bridge.sendCommandAndWait("addDevice", { name: "R1" }, 50);
packages/file-bridge/tests/file-bridge-v2.test.ts:464:describe("sendCommandAndWait", () => {
packages/file-bridge/tests/file-bridge-v2.test.ts:517:      if (type === "__pollDeferred") {
packages/file-bridge/tests/file-bridge-v2.test.ts:542:    const result = await bridge.sendCommandAndWait("execPc", { device: "PC1", command: "ping" });
packages/file-bridge/tests/garbage-collection.test.ts:21:    mkdirSync(join(tempDir, "in-flight"), { recursive: true });
packages/file-bridge/tests/garbage-collection.test.ts:51:  test("gc does not delete in-flight commands", () => {
packages/file-bridge/tests/garbage-collection.test.ts:52:    const inFlightDir = join(tempDir, "in-flight");
packages/file-bridge/tests/garbage-collection.test.ts:54:    // Create old in-flight command (should NOT be deleted by gc)
packages/file-bridge/tests/command-processor-fase8.test.ts:35:  it("Test 1: Should pick next command from queue", () => {
packages/file-bridge/tests/command-processor-fase8.test.ts:67:  it("Test 2: Should move command to in-flight atomically", () => {
packages/file-bridge/tests/command-processor-fase8.test.ts:94:    // Command file should be moved to in-flight
packages/file-bridge/tests/command-processor-fase8.test.ts:255:    // Bad file should be moved to dead-letter
packages/file-bridge/tests/command-processor-fase8.test.ts:261:  it("Test 8: Should handle empty queue gracefully", () => {
packages/file-bridge/tests/queue-index.test.ts:8:  test("sendCommand registra el filename en _queue.json", () => {
packages/file-bridge/tests/queue-index.test.ts:9:    const root = mkdtempSync(join(tmpdir(), "queue-index-"));
packages/file-bridge/tests/queue-index.test.ts:14:      const queuePath = join(root, "commands", "_queue.json");
packages/file-bridge/tests/queue-index.test.ts:15:      const queue = JSON.parse(readFileSync(queuePath, "utf8"));
packages/file-bridge/tests/queue-index.test.ts:18:      expect(Array.isArray(queue)).toBe(true);
packages/file-bridge/tests/queue-index.test.ts:19:      expect(queue).toContain(`${String(envelope.seq).padStart(12, "0")}-listDevices.json`);
packages/file-bridge/tests/log-rotation.test.ts:35:        type: "command-enqueued",
packages/file-bridge/tests/log-rotation.test.ts:83:        type: "command-enqueued",
packages/file-bridge/tests/log-rotation.test.ts:120:        type: "command-enqueued",
packages/file-bridge/tests/log-rotation.test.ts:153:        type: "command-enqueued",
packages/file-bridge/tests/log-rotation.test.ts:190:      type: "command-enqueued",
packages/file-bridge/tests/backpressure.test.ts:3: * Verifies queue limits and wait-for-capacity behavior.
packages/file-bridge/tests/backpressure.test.ts:31:  test("allows sending when queue is empty", () => {
packages/file-bridge/tests/backpressure.test.ts:35:  test("throws BackpressureError when queue is full", () => {
packages/file-bridge/tests/backpressure.test.ts:36:    // Fill the queue
packages/file-bridge/tests/backpressure.test.ts:48:    // Fill the queue
packages/file-bridge/tests/backpressure.test.ts:64:        expect(err.message).toContain("queue full");
packages/file-bridge/tests/backpressure.test.ts:69:  test("counts both commands and in-flight files", () => {
packages/file-bridge/tests/backpressure.test.ts:70:    // Add 5 in commands, 3 in-flight
packages/file-bridge/tests/backpressure.test.ts:96:    // Fill queue
packages/file-bridge/tests/backpressure.test.ts:118:    // Fill queue and never free space
packages/file-bridge/docs/runtime-complete-guide.md:47:│  │  ├─ commands/             ← Command queue (advanced)    │   │
packages/file-bridge/docs/runtime-complete-guide.md:48:│  │  ├─ in-flight/            ← Commands being processed    │   │
packages/file-bridge/docs/runtime-complete-guide.md:109:  sendCommandAndWait<T, R>(type: string, payload: T, timeoutMs?: number): Promise<BridgeResultEnvelope<R>>
packages/file-bridge/docs/runtime-complete-guide.md:204:1. Counts files in `commands/` and `in-flight/` directories
packages/file-bridge/docs/runtime-complete-guide.md:232:2. `pickNextCommand()` moves it to `in-flight/`
packages/file-bridge/docs/runtime-complete-guide.md:246:    // 1. Move in-flight commands back to commands queue
packages/file-bridge/docs/runtime-complete-guide.md:254:1. On `start()`, scan `in-flight/` directory
packages/file-bridge/docs/runtime-complete-guide.md:301:- `command-enqueued` - Command queued
packages/file-bridge/docs/runtime-complete-guide.md:329:7. Maintain heartbeat for session management
packages/file-bridge/docs/runtime-complete-guide.md:672:│     await bridge.sendCommandAndWait("addDevice", {           │
packages/file-bridge/docs/runtime-complete-guide.md:796:│     const result = await bridge.sendCommandAndWait(...);     │
packages/file-bridge/docs/runtime-complete-guide.md:810:{"seq":3,"ts":1711234567890,"type":"command-enqueued","id":"cmd_000000000042","commandType":"addDevice"}
packages/file-bridge/docs/runtime-complete-guide.md:834:│  └─ heartbeat.json            # Session heartbeat
packages/file-bridge/docs/runtime-complete-guide.md:835:├─ commands/                    # Command queue (advanced usage)
packages/file-bridge/docs/runtime-complete-guide.md:838:├─ in-flight/                   # Commands being processed
packages/file-bridge/docs/runtime-complete-guide.md:849:└─ dead-letter/                 # Corrupted commands
packages/file-bridge/docs/runtime-complete-guide.md:988:    phase: "queue" | "execution" | "validation";
packages/file-bridge/docs/runtime-complete-guide.md:1126:  resultTimeoutMs?: number;  // Timeout for sendCommandAndWait (default: 120000)
packages/file-bridge/docs/runtime-complete-guide.md:1157:const result = await bridge.sendCommandAndWait("addDevice", {
packages/file-bridge/docs/runtime-complete-guide.md:1410:3. **Command queuing priorities**: High-priority commands jump queue
packages/file-bridge/docs/real-files.md:15:// Bridge V2 Layout: Uses command.json, in-flight/, results/, logs/
packages/file-bridge/docs/real-files.md:30: * - in-flight/: Commands currently being processed
packages/file-bridge/docs/real-files.md:46:var HEARTBEAT_PATH = DEV_DIR + "/sessions/heartbeat.json";
packages/file-bridge/docs/real-files.md:113:    try { dprint("[WARN] Failed to write heartbeat: " + String(e)); } catch (_) {}
packages/file-bridge/docs/real-files.md:124:    var heartbeatContent = null;
packages/file-bridge/docs/real-files.md:128:      heartbeatContent = fm.getFileContents(HEARTBEAT_PATH);
packages/file-bridge/docs/real-files.md:129:      var heartbeat = JSON.parse(heartbeatContent);
packages/file-bridge/docs/real-files.md:130:      var age = Date.now() - heartbeat.ts;
packages/file-bridge/docs/real-files.md:131:      isStale = age > 15000; // Consider stale if no heartbeat for > 15 seconds
packages/file-bridge/docs/real-files.md:137:      if (heartbeatContent) {
packages/file-bridge/docs/real-files.md:1131:      type: "command-enqueued",
packages/file-bridge/docs/real-files.md:1139:  async sendCommandAndWait<TPayload = unknown, TResult = unknown>(
packages/file-bridge/docs/real-files.md:1392:    "phase": "queue"
packages/file-bridge/docs/real-files.md:1397:### 4.5 Ejemplo: command.json en in-flight/ (Durante procesamiento)
packages/file-bridge/docs/real-files.md:1399:**Archivo**: `~/pt-dev/in-flight/000000000045-configIos.json`
packages/file-bridge/docs/real-files.md:1489:{"seq":3,"ts":1711234567890,"type":"command-enqueued","id":"cmd_000000000042","commandType":"addDevice"}
packages/file-bridge/docs/real-files.md:1495:{"seq":9,"ts":1711234568200,"type":"command-enqueued","id":"cmd_000000000043","commandType":"configIos"}
packages/file-bridge/docs/real-files.md:1499:{"seq":13,"ts":1711234569000,"type":"heartbeat","ts":1711234569000,"pid":"main"}
packages/file-bridge/docs/real-files.md:1517:│  └─ heartbeat.json                # Heartbeat para detectar sesiones stale
packages/file-bridge/docs/real-files.md:1521:├─ in-flight/                       # Comandos siendo procesados
packages/file-bridge/docs/real-files.md:1533:└─ dead-letter/                     # Comandos corruptos
packages/file-bridge/src/backpressure-manager.ts:5: * máxima de comandos pending (en cola + in-flight) para evitar que PT se
packages/file-bridge/src/backpressure-manager.ts:10: * 1. getPendingCount() = count(commands/*.json) + count(in-flight/*.json)
packages/file-bridge/src/backpressure-manager.ts:23:  /** Maximum number of pending commands (commands + in-flight) */
packages/file-bridge/src/backpressure-manager.ts:25:  /** How often to check queue size (ms) */
packages/file-bridge/src/backpressure-manager.ts:72:        `Command queue full: ${pending}/${this.config.maxPending} pending. ` +
packages/file-bridge/src/backpressure-manager.ts:102:      `Timeout waiting for command queue capacity after ${timeoutMs ?? this.config.maxWaitMs}ms. ` +
packages/file-bridge/src/backpressure-manager.ts:110:   * Cuenta comandos pending = comandos en cola + comandos in-flight.
packages/file-bridge/src/backpressure-manager.ts:111:   * Excluye _queue.json (índice auxiliar).
packages/file-bridge/src/backpressure-manager.ts:120:        (f) => f.endsWith(".json") && f !== "_queue.json",
packages/file-bridge/src/backpressure-manager.ts:123:        (f) => f.endsWith(".json") && f !== "_queue.json",
packages/file-bridge/src/backpressure-manager.ts:161:   * Obtiene métricas detalladas separando comandos en cola e in-flight.
packages/file-bridge/src/backpressure-manager.ts:167:    queuedCount: number;
packages/file-bridge/src/backpressure-manager.ts:174:      const queuedCount = readdirSync(this.paths.commandsDir()).filter(
packages/file-bridge/src/backpressure-manager.ts:175:        (f) => f.endsWith(".json") && f !== "_queue.json",
packages/file-bridge/src/backpressure-manager.ts:178:        (f) => f.endsWith(".json") && f !== "_queue.json",
packages/file-bridge/src/backpressure-manager.ts:180:      const totalPending = queuedCount + inFlightCount;
packages/file-bridge/src/backpressure-manager.ts:184:        queuedCount,
packages/file-bridge/src/backpressure-manager.ts:193:        queuedCount: 0,
packages/file-bridge/src/backpressure-manager.test.ts:2: * Tests for BackpressureManager - queue overflow prevention
packages/file-bridge/src/shared/local-types.ts:52: * Recovery info para comandos in-flight encontrados tras crash.
packages/file-bridge/src/shared/local-types.ts:67:  /** Acción tomada: requeued, completed, o dead-letter */
packages/file-bridge/src/shared/local-types.ts:68:  action: "requeued" | "completed" | "dead-letter";
packages/file-bridge/src/shared/local-types.ts:72:export type CommandStatus = "queued" | "picked" | "started" | "completed" | "failed";
packages/file-bridge/src/shared/path-layout.ts:8: *   - in-flight/*.json: comandos en proceso por PT (claim via rename)
packages/file-bridge/src/shared/path-layout.ts:10: *   - dead-letter/*.json: comandos corruptos que no se pudieron procesar
packages/file-bridge/src/shared/path-layout.ts:72:    return join(this.root, "in-flight");
packages/file-bridge/src/shared/path-layout.ts:107:    return join(this.root, "dead-letter");
packages/file-bridge/src/shared/path-layout.ts:139:  /** Path completo a archivo de comando en in-flight/ */
packages/file-bridge/src/shared/path-layout.test.ts:64:      expect(deadLetter).toBe(join(TEST_ROOT, 'dead-letter'));
packages/file-bridge/src/shared/path-layout.test.ts:69:      expect(dlFile).toContain('dead-letter');
packages/file-bridge/src/v2/monitoring-service.ts:18:  /** Callback para enviar comandos a PT (sendCommandAndWait) */
packages/file-bridge/src/v2/monitoring-service.ts:19:  sendCommandAndWait: <TPayload = unknown, TResult = unknown>(
packages/file-bridge/src/v2/monitoring-service.ts:39:  /** Intervalo para monitoreo de heartbeat de PT (default: 2000ms) */
packages/file-bridge/src/v2/monitoring-service.ts:40:  heartbeatIntervalMs?: number;
packages/file-bridge/src/v2/monitoring-service.ts:43:  /** Umbral de edad del heartbeat para considerarse stale (default: 10000ms) */
packages/file-bridge/src/v2/monitoring-service.ts:44:  heartbeatStaleThresholdMs?: number;
packages/file-bridge/src/v2/monitoring-service.ts:69:  heartbeatActive: boolean;
packages/file-bridge/src/v2/monitoring-service.ts:82:  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
packages/file-bridge/src/v2/monitoring-service.ts:96:      heartbeatIntervalMs: options.heartbeatIntervalMs ?? 2_000,
packages/file-bridge/src/v2/monitoring-service.ts:98:      heartbeatStaleThresholdMs: options.heartbeatStaleThresholdMs ?? 10_000,
packages/file-bridge/src/v2/monitoring-service.ts:106:      isRunning: this.autoSnapshotTimer !== null || this.heartbeatTimer !== null || this.autoGcTimer !== null,
packages/file-bridge/src/v2/monitoring-service.ts:108:      heartbeatActive: this.heartbeatTimer !== null,
packages/file-bridge/src/v2/monitoring-service.ts:116:    const heartbeatFile = join(this.paths.root, "heartbeat.json");
packages/file-bridge/src/v2/monitoring-service.ts:121:      const stats = statSync(heartbeatFile);
packages/file-bridge/src/v2/monitoring-service.ts:123:      const isStale = ageMs > this.options.heartbeatStaleThresholdMs;
packages/file-bridge/src/v2/monitoring-service.ts:125:      let heartbeat: Record<string, unknown> | null = null;
packages/file-bridge/src/v2/monitoring-service.ts:127:        const content = readFileSync(heartbeatFile, "utf8");
packages/file-bridge/src/v2/monitoring-service.ts:128:        heartbeat = JSON.parse(content);
packages/file-bridge/src/v2/monitoring-service.ts:149:      const content = readFileSync(join(this.paths.root, "heartbeat.json"), "utf8");
packages/file-bridge/src/v2/monitoring-service.ts:175:        const result = await this.callbacks.sendCommandAndWait<{}, Snapshot>("snapshot", {}, 10_000);
packages/file-bridge/src/v2/monitoring-service.ts:214:    if (this.heartbeatTimer) return;
packages/file-bridge/src/v2/monitoring-service.ts:216:    this.heartbeatTimer = setInterval(() => {
packages/file-bridge/src/v2/monitoring-service.ts:218:      const heartbeatFile = join(this.paths.root, "heartbeat.json");
packages/file-bridge/src/v2/monitoring-service.ts:221:        const stats = statSync(heartbeatFile);
packages/file-bridge/src/v2/monitoring-service.ts:224:        if (age > this.options.heartbeatStaleThresholdMs) {
packages/file-bridge/src/v2/monitoring-service.ts:228:            type: "pt-heartbeat-stale",
packages/file-bridge/src/v2/monitoring-service.ts:234:            const content = readFileSync(heartbeatFile, "utf8");
packages/file-bridge/src/v2/monitoring-service.ts:235:            const heartbeat = JSON.parse(content);
packages/file-bridge/src/v2/monitoring-service.ts:239:              type: "pt-heartbeat-ok",
packages/file-bridge/src/v2/monitoring-service.ts:240:              heartbeat,
packages/file-bridge/src/v2/monitoring-service.ts:247:              type: "pt-heartbeat-ok",
packages/file-bridge/src/v2/monitoring-service.ts:258:            type: "pt-heartbeat-missing",
packages/file-bridge/src/v2/monitoring-service.ts:264:            type: "pt-heartbeat-error",
packages/file-bridge/src/v2/monitoring-service.ts:269:    }, this.options.heartbeatIntervalMs);
packages/file-bridge/src/v2/monitoring-service.ts:298:    if (this.heartbeatTimer) {
packages/file-bridge/src/v2/monitoring-service.ts:299:      clearInterval(this.heartbeatTimer);
packages/file-bridge/src/v2/monitoring-service.ts:300:      this.heartbeatTimer = null;
packages/file-bridge/src/v2/crash-recovery.test.ts:45:  test("no mueve _queue.json a dead-letter", () => {
packages/file-bridge/src/v2/crash-recovery.test.ts:47:      join(paths.commandsDir(), "_queue.json"),
packages/file-bridge/src/v2/crash-recovery.test.ts:61:    expect(existsSync(join(paths.commandsDir(), "_queue.json"))).toBe(true);
packages/file-bridge/src/v2/command-processor.test.ts:100:  test("ignora _queue.json y procesa el siguiente comando válido", () => {
packages/file-bridge/src/v2/command-processor.test.ts:105:      join(paths.commandsDir(), "_queue.json"),
packages/file-bridge/src/v2/command-processor.test.ts:120:    expect(existsSync(join(paths.commandsDir(), "_queue.json"))).toBe(true);
packages/file-bridge/src/v2/command-processor.test.ts:124:    const cmd = commandEnvelope(3, "terminal.plan.run");
packages/file-bridge/src/v2/command-processor.test.ts:135:    expect(parsed.type).toBe("terminal.plan.run");
packages/file-bridge/src/v2/command-processor.ts:8: * El rename atómico de commands/ -> in-flight/ es la operación clave que
packages/file-bridge/src/v2/command-processor.ts:34:  queuedAt: number;
packages/file-bridge/src/v2/command-processor.ts:35:  claimedAt: number;
packages/file-bridge/src/v2/command-processor.ts:37:  queueLatencyMs: number;
packages/file-bridge/src/v2/command-processor.ts:39:  claimedFile?: string;
packages/file-bridge/src/v2/command-processor.ts:65:   * Hace claim atómico via rename de commands/ -> in-flight/.
packages/file-bridge/src/v2/command-processor.ts:98:      const envelope = this.claimAndReadEnvelope<T>(file, sourcePath, parsed, cmdId);
packages/file-bridge/src/v2/command-processor.ts:105:  private claimAndReadEnvelope<T>(
packages/file-bridge/src/v2/command-processor.ts:111:    const claimResult = this.claimCommandFile(filename);
packages/file-bridge/src/v2/command-processor.ts:112:    if (!claimResult.ok || !claimResult.path) return null;
packages/file-bridge/src/v2/command-processor.ts:117:      type: "command-claimed",
packages/file-bridge/src/v2/command-processor.ts:123:      const content = readFileSync(claimResult.path, "utf8");
packages/file-bridge/src/v2/command-processor.ts:134:            phase: "queue",
packages/file-bridge/src/v2/command-processor.ts:150:              phase: "queue",
packages/file-bridge/src/v2/command-processor.ts:167:      this.moveToDeadLetter(claimResult.path, err);
packages/file-bridge/src/v2/command-processor.ts:176:  private claimCommandFile(filename: string): ClaimResult {
packages/file-bridge/src/v2/command-processor.ts:187:        return { ok: false, path: null, reason: "file-not-found-or-already-claimed", errorCode: error.code };
packages/file-bridge/src/v2/command-processor.ts:193:        type: "command-claim-error",
packages/file-bridge/src/v2/command-processor.ts:202:   * Publica el resultado de un comando y limpia el archivo in-flight.
packages/file-bridge/src/v2/command-processor.ts:205:   * Agrega metadata de latencias (queue y exec).
packages/file-bridge/src/v2/command-processor.ts:207:   * Finalmente limpia el archivo in-flight.
packages/file-bridge/src/v2/command-processor.ts:221:      queuedAt?: number;
packages/file-bridge/src/v2/command-processor.ts:222:      claimedAt?: number;
packages/file-bridge/src/v2/command-processor.ts:224:      queueLatencyMs?: number;
packages/file-bridge/src/v2/command-processor.ts:226:      claimedFile?: string;
packages/file-bridge/src/v2/command-processor.ts:239:        queuedAt: result.queuedAt ?? cmd.createdAt,
packages/file-bridge/src/v2/command-processor.ts:240:        claimedAt: result.claimedAt ?? completedAtMs,
packages/file-bridge/src/v2/command-processor.ts:242:        queueLatencyMs: result.queueLatencyMs ?? (result.claimedAt ?? completedAtMs) - (result.queuedAt ?? cmd.createdAt),
packages/file-bridge/src/v2/command-processor.ts:243:        execLatencyMs: result.execLatencyMs ?? completedAtMs - (result.claimedAt ?? completedAtMs),
packages/file-bridge/src/v2/command-processor.ts:244:        claimedFile: result.claimedFile,
packages/file-bridge/src/v2/command-processor.ts:267:   * Mueve un archivo corrupto a dead-letter con metadata de error.
packages/file-bridge/src/v2/command-processor.ts:303:    const queueFilePath = join(this.paths.commandsDir(), "_queue.json");
packages/file-bridge/src/v2/command-processor.ts:304:    let queue: string[] = [];
packages/file-bridge/src/v2/command-processor.ts:307:      const existing = readFileSync(queueFilePath, "utf8");
packages/file-bridge/src/v2/command-processor.ts:311:          queue = parsed
packages/file-bridge/src/v2/command-processor.ts:313:            .filter((entry) => entry !== "" && entry !== "_queue.json" && entry.endsWith(".json"));
packages/file-bridge/src/v2/command-processor.ts:317:      queue = [];
packages/file-bridge/src/v2/command-processor.ts:320:    if (!queue.includes(filename)) {
packages/file-bridge/src/v2/command-processor.ts:321:      queue.push(filename);
packages/file-bridge/src/v2/command-processor.ts:324:    queue.sort();
packages/file-bridge/src/v2/command-processor.ts:325:    atomicWriteFile(queueFilePath, JSON.stringify(queue));
packages/file-bridge/src/v2/command-processor.ts:338:    const queueFilePath = join(root, "commands", "_queue.json");
packages/file-bridge/src/v2/command-processor.ts:341:      const existing = readFileSync(queueFilePath, "utf8");
packages/file-bridge/src/v2/command-processor.ts:348:      atomicWriteFile(queueFilePath, JSON.stringify(filtered));
packages/file-bridge/src/v2/diagnostics.ts:7: * - Commands stuck in-flight (>10 commands)
packages/file-bridge/src/v2/diagnostics.ts:9: * - Drift entre queue index y archivos físicos
packages/file-bridge/src/v2/diagnostics.ts:10: * - Comandos oldest in-flight/pending (>5 min)
packages/file-bridge/src/v2/diagnostics.ts:27:  queues: {
packages/file-bridge/src/v2/diagnostics.ts:32:    queueIndexEntries: number;
packages/file-bridge/src/v2/diagnostics.ts:33:    queueIndexDrift: boolean;
packages/file-bridge/src/v2/diagnostics.ts:34:    queueIndexMissingEntries: number;
packages/file-bridge/src/v2/diagnostics.ts:35:    queueIndexExtraEntries: number;
packages/file-bridge/src/v2/diagnostics.ts:97:    const queueIndex = this.readQueueIndex();
packages/file-bridge/src/v2/diagnostics.ts:99:    const queueIndexDrift = this.hasQueueIndexDrift(queueIndex, commandFiles);
packages/file-bridge/src/v2/diagnostics.ts:100:    const queueIndexMissingEntries = this.countQueueIndexMissingEntries(queueIndex, commandFiles);
packages/file-bridge/src/v2/diagnostics.ts:101:    const queueIndexExtraEntries = this.countQueueIndexExtraEntries(queueIndex, commandFiles);
packages/file-bridge/src/v2/diagnostics.ts:109:    if (inFlight > 10) issues.push(`${inFlight} commands stuck in-flight`);
packages/file-bridge/src/v2/diagnostics.ts:110:    if (pendingCommands > 100) issues.push(`Command queue backing up: ${pendingCommands} pending`);
packages/file-bridge/src/v2/diagnostics.ts:111:    if (queueIndexDrift) {
packages/file-bridge/src/v2/diagnostics.ts:113:        `Queue index drift detected (missing=${queueIndexMissingEntries}, extra=${queueIndexExtraEntries})`,
packages/file-bridge/src/v2/diagnostics.ts:117:      issues.push(`Oldest in-flight command is ${oldestInFlightAgeMs}ms old`);
packages/file-bridge/src/v2/diagnostics.ts:120:      issues.push(`Oldest queued command is ${oldestPendingAgeMs}ms old`);
packages/file-bridge/src/v2/diagnostics.ts:143:      queues: {
packages/file-bridge/src/v2/diagnostics.ts:148:        queueIndexEntries: queueIndex.length,
packages/file-bridge/src/v2/diagnostics.ts:149:        queueIndexDrift,
packages/file-bridge/src/v2/diagnostics.ts:150:        queueIndexMissingEntries,
packages/file-bridge/src/v2/diagnostics.ts:151:        queueIndexExtraEntries,
packages/file-bridge/src/v2/diagnostics.ts:167:      return readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "_queue.json").length;
packages/file-bridge/src/v2/diagnostics.ts:176:        .filter((f) => f.endsWith(".json") && f !== "_queue.json")
packages/file-bridge/src/v2/diagnostics.ts:185:      const queueFile = join(this.paths.commandsDir(), "_queue.json");
packages/file-bridge/src/v2/diagnostics.ts:186:      if (!existsSync(queueFile)) return [];
packages/file-bridge/src/v2/diagnostics.ts:187:      const raw = JSON.parse(readFileSync(queueFile, "utf8"));
packages/file-bridge/src/v2/diagnostics.ts:191:        .filter((entry) => entry !== "" && entry !== "_queue.json" && entry.endsWith(".json"))
packages/file-bridge/src/v2/diagnostics.ts:234:      const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "_queue.json");
packages/file-bridge/src/v2/crash-recovery.ts:10: * 1. Commands queued: verifica que no existan resultados (dedup)
packages/file-bridge/src/v2/crash-recovery.ts:11: * 2. Commands in-flight: si hay resultado, limpia; si no, re-queue o falla
packages/file-bridge/src/v2/crash-recovery.ts:12: * 3. Archivos con formato inválido van a dead-letter
packages/file-bridge/src/v2/crash-recovery.ts:41:   * @param maxAttempts - Máximo de reintentos para comandos in-flight (default: 3)
packages/file-bridge/src/v2/crash-recovery.ts:55:   * Procesa commands/ y in-flight/ para dejar el estado consistente.
packages/file-bridge/src/v2/crash-recovery.ts:85:      if (file === "_queue.json") {
packages/file-bridge/src/v2/crash-recovery.ts:114:          note: "result already existed for queued command",
packages/file-bridge/src/v2/crash-recovery.ts:142:        this.moveToDeadLetter(filePath, new Error("Invalid in-flight filename"));
packages/file-bridge/src/v2/crash-recovery.ts:148:          note: "invalid in-flight filename",
packages/file-bridge/src/v2/crash-recovery.ts:163:          note: "result existed, in-flight cleaned",
packages/file-bridge/src/v2/crash-recovery.ts:170:        this.moveToDeadLetter(filePath, new Error("Corrupted in-flight JSON"));
packages/file-bridge/src/v2/crash-recovery.ts:176:          note: "could not parse in-flight JSON",
packages/file-bridge/src/v2/crash-recovery.ts:193:            note: "duplicate in-flight vs commands/",
packages/file-bridge/src/v2/crash-recovery.ts:197:          this.moveToDeadLetter(filePath, new Error("ID conflict between in-flight and commands/"));
packages/file-bridge/src/v2/crash-recovery.ts:217:          type: "command-requeued",
packages/file-bridge/src/shared-result-watcher.ts:5: * en lugar de uno por cada sendCommandAndWait(). Múltiples listeners
packages/file-bridge/src/file-bridge-v2.ts:11: * - in-flight/*.json: comandos en proceso por PT (claim via atomic rename)
packages/file-bridge/src/file-bridge-v2.ts:13: * - dead-letter/*.json: comandos corruptos que no se pudieron procesar
packages/file-bridge/src/file-bridge-v2.ts:18: * 2. PT hace claim con rename atómico -> in-flight/<seq>-<type>.json
packages/file-bridge/src/file-bridge-v2.ts:20: * 4. CLI lee resultado, borra in-flight
packages/file-bridge/src/file-bridge-v2.ts:22: * El índice _queue.json es auxiliar (legacy fallback para PT que no puede
packages/file-bridge/src/file-bridge-v2.ts:77:  /** Intervalo para monitoreo de heartbeat de PT (default: 2000ms) */
packages/file-bridge/src/file-bridge-v2.ts:78:  heartbeatIntervalMs?: number;
packages/file-bridge/src/file-bridge-v2.ts:79:  /** Si true, omite escritura de _queue.json (fs es fuente primary) */
packages/file-bridge/src/file-bridge-v2.ts:145:        sendCommandAndWait: async <TPayload = unknown, TResult = unknown>(
packages/file-bridge/src/file-bridge-v2.ts:150:          return this.sendCommandAndWait<TPayload, TResult>(type, payload, timeoutMs);
packages/file-bridge/src/file-bridge-v2.ts:158:        heartbeatIntervalMs: options.heartbeatIntervalMs ?? 2_000,
packages/file-bridge/src/file-bridge-v2.ts:353:    // _queue.json es legacy fallback — no escribir si skipQueueIndex=true
packages/file-bridge/src/file-bridge-v2.ts:358:      } catch (queueErr) {
packages/file-bridge/src/file-bridge-v2.ts:359:        console.warn(`[bridge] failed to update queue index: ${String(queueErr)}`);
packages/file-bridge/src/file-bridge-v2.ts:370:      type: "command-enqueued",
packages/file-bridge/src/file-bridge-v2.ts:413:  async sendCommandAndWait<TPayload = unknown, TResult = unknown>(
packages/file-bridge/src/file-bridge-v2.ts:420:      `sendCommandAndWait type=${type} timeoutMs=${String(timeoutMs ?? this.options.resultTimeoutMs ?? 120_000)}`,
packages/file-bridge/src/file-bridge-v2.ts:498:        queueLatencyMs?: number;
packages/file-bridge/src/file-bridge-v2.ts:508:      queueLatencyMs: resultMeta?.queueLatencyMs,
packages/file-bridge/src/file-bridge-v2.ts:521:      const followUp = await this.sendCommandAndWait(
packages/file-bridge/src/file-bridge-v2.ts:522:        "__pollDeferred",
packages/file-bridge/src/file-bridge-v2.ts:541:          queueLatencyMs: followUpTimings?.queueLatencyMs ?? timings.queueLatencyMs,
packages/file-bridge/src/file-bridge-v2.ts:569:    queueIndexHasCommand: boolean;
packages/file-bridge/src/file-bridge-v2.ts:585:    let queueIndexHasCommand = false;
packages/file-bridge/src/file-bridge-v2.ts:587:      const queuePath = join(this.paths.commandsDir(), "_queue.json");
packages/file-bridge/src/file-bridge-v2.ts:588:      if (existsSync(queuePath)) {
packages/file-bridge/src/file-bridge-v2.ts:589:        const parsed = JSON.parse(readFileSync(queuePath, "utf8"));
packages/file-bridge/src/file-bridge-v2.ts:591:          queueIndexHasCommand = parsed.some((entry) => String(entry).includes(commandId));
packages/file-bridge/src/file-bridge-v2.ts:595:      queueIndexHasCommand = false;
packages/file-bridge/src/file-bridge-v2.ts:604:      queueIndexHasCommand,
packages/file-bridge/src/file-bridge-v2.ts:619:    else if (artifact.inFlightFile) location = "in-flight";
packages/file-bridge/src/file-bridge-v2.ts:621:    else if (artifact.deadLetterFile) location = "dead-letter";
packages/file-bridge/src/file-bridge-v2.ts:623:    const bridgeTimeoutDetails: BridgeTimeoutDetails = {
packages/file-bridge/src/file-bridge-v2.ts:639:      bridgeTimeoutDetails,
packages/file-bridge/src/file-bridge-v2.ts:668:   * Hace claim atómico via rename de commands/ -> in-flight/.
packages/file-bridge/src/file-bridge-v2.ts:678:   * Escribe results/<id>.json y limpia el archivo in-flight.
packages/file-bridge/src/file-bridge-v2.ts:764:   * Inicia monitoreo de heartbeat.json.
packages/file-bridge/src/file-bridge-v2.ts:780:   * Para auto-snapshot y heartbeat monitoring.
packages/file-bridge/src/file-bridge-v2.ts:788:   * Obtiene el contenido del heartbeat de PT.
packages/file-bridge/src/file-bridge-v2.ts:789:   * El heartbeat es escrito por PT para indicar que sigue vivo.
packages/file-bridge/src/file-bridge-v2.ts:791:   * @returns El JSON parseado del heartbeat o null si no existe/válido
packages/file-bridge/src/file-bridge-v2.ts:798:   * Evalúa la salud del heartbeat de PT basado en la edad del archivo.
packages/file-bridge/src/file-bridge-v2.ts:831:    queuedCount?: number;
packages/file-bridge/src/file-bridge-v2.ts:833:    queueIndexDrift?: boolean;
packages/file-bridge/src/file-bridge-v2.ts:834:    claimMode?: "atomic-move" | "copy-delete" | "unknown" | string;
packages/file-bridge/src/file-bridge-v2.ts:848:    let queuedCount = 0;
packages/file-bridge/src/file-bridge-v2.ts:852:      queuedCount = stats.queuedCount;
packages/file-bridge/src/file-bridge-v2.ts:858:    let queueIndexDrift = false;
packages/file-bridge/src/file-bridge-v2.ts:861:      queueIndexDrift = health.queues.queueIndexDrift;
packages/file-bridge/src/file-bridge-v2.ts:862:      if (queueIndexDrift) {
packages/file-bridge/src/file-bridge-v2.ts:864:          `Queue index drift detected (missing=${health.queues.queueIndexMissingEntries}, extra=${health.queues.queueIndexExtraEntries})`,
packages/file-bridge/src/file-bridge-v2.ts:875:      queuedCount,
packages/file-bridge/src/file-bridge-v2.ts:877:      queueIndexDrift,
packages/file-bridge/src/file-bridge-v2.ts:878:      claimMode: "unknown",
packages/file-bridge/src/file-bridge-v2.ts:887:   * @returns Contexto con bridgeReady, lifecycleState, y estado de heartbeat
packages/file-bridge/src/file-bridge-v2.ts:892:    heartbeat: {
packages/file-bridge/src/file-bridge-v2.ts:901:      heartbeat: this.getHeartbeatHealth(),
packages/file-bridge/src/file-bridge-v2-commands.ts:92:    const result = await bridge.sendCommandAndWait<
packages/file-bridge/src/file-bridge-v2-commands.ts:139:    const result = await bridge.sendCommandAndWait<
packages/file-bridge/src/shared-result-watcher.test.ts:128:        deadLetterDir: () => '/path/results/dead-letter'
packages/file-bridge/src/shared-result-watcher.test.ts:131:      expect(paths_.deadLetterDir()).toContain('dead-letter');
packages/types/src/schemas/bridge.ts:59:  location: "commands" | "in-flight" | "results" | "dead-letter" | "unknown";
packages/types/src/schemas/bridge.ts:74:  bridgeTimeoutDetails?: BridgeTimeoutDetails;
packages/types/src/schemas/bridge.ts:85:  queueLatencyMs?: number;
packages/types/src/schemas/bridge.ts:97:  phase?: "queue" | "pickup" | "execute" | "result";
packages/types/src/schemas/bridge.ts:244:  queued: number;
packages/types/src/pt-api/validate-catalog-consistency.ts:44:  "__pollDeferred",
packages/types/src/command-catalog.ts:361:    type: '__pollDeferred',
packages/network-intent/src/model/lab-spec.ts:383:      const queue = [deviceId];
packages/network-intent/src/model/lab-spec.ts:384:      while (queue.length > 0) {
packages/network-intent/src/model/lab-spec.ts:385:        const current = queue.shift()!;
packages/network-intent/src/model/lab-spec.ts:390:            queue.push(neighbor);
packages/pt-runtime/generated/runtime/index.js:62:        if (payload.type === "__pollDeferred") {
packages/pt-runtime/generated/runtime/index.js:63:            var pollLog = log.withCommand("__pollDeferred");
packages/pt-runtime/generated/runtime/index.js:64:            pollLog.debug("Runtime entrada __pollDeferred", {
packages/pt-runtime/generated/runtime/index.js:68:            pollLog.debug("Runtime resultado __pollDeferred", {
packages/pt-runtime/generated/runtime/index.js:162:    if (!api.getActiveJobs) {
packages/pt-runtime/generated/runtime/index.js:165:    var jobs = api.getActiveJobs();
packages/pt-runtime/generated/pt-api/pt-results.js:29:    DISPATCH_ERROR: "DISPATCH_ERROR",
packages/pt-runtime/generated/handlers/dispatcher.js:75:            code: "DISPATCH_ERROR",
packages/pt-runtime/generated/handlers/runtime-handlers.js:200:registerHandler("__pollDeferred", handleDeferredPoll);
packages/pt-runtime/generated/handlers/ios-engine.js:18:                phase: "queued",
packages/pt-runtime/generated/handlers/ios-engine.js:19:                state: "queued",
packages/pt-runtime/generated/handlers/ios-engine.js:46:        if (record.job.phase === "queued") {
packages/pt-runtime/generated/handlers/ios-engine.js:81:    IosSessionEngine.prototype.getActiveJobs = function () {
packages/pt-runtime/out:53:        fm.__claimMode = "atomic-move";
packages/pt-runtime/out:54:      } catch(_claimModeErr) {}
packages/pt-runtime/out:63:          __claimMode: "copy-delete",
packages/pt-runtime/out:464:        claimMode: "unknown",
packages/pt-runtime/out:472:        claimMode: mode,
packages/pt-runtime/out:626:            if (name === "_queue.json")
packages/pt-runtime/out:647:    var queuePath = commandsDir + "/_queue.json";
packages/pt-runtime/out:653:            if (!s.fm.fileExists(queuePath))
packages/pt-runtime/out:655:            var content = s.fm.getFileContents(queuePath);
packages/pt-runtime/out:662:            dprint("[queue-index] read error: " + String(e));
packages/pt-runtime/out:672:            s.fm.writePlainTextToFile(queuePath, JSON.stringify(normalized));
packages/pt-runtime/out:675:            dprint("[queue-index] write error: " + String(e));
packages/pt-runtime/out:707:            dprint("[queue-index] removed: " + filename);
packages/pt-runtime/out:710:            dprint("[queue-index] remove error: " + String(e));
packages/pt-runtime/out:717:            if (!name || name === "_queue.json" || name.indexOf(".json") === -1)
packages/pt-runtime/out:736:            dprint("[queue-index] added: " + name);
packages/pt-runtime/out:739:            dprint("[queue-index] add error: " + String(e));
packages/pt-runtime/out:745:            dprint("[queue-index] rebuilt from commands scan (" + String(files.length) + " files)");
packages/pt-runtime/out:748:            dprint("[queue-index] rebuild error: " + String(e));
packages/pt-runtime/out:770:                        if (name === "_queue.json")
packages/pt-runtime/out:790:            dprint("[queue-discovery] scan error: " + String(e));
packages/pt-runtime/out:807:            var modo = s.claimMode;
packages/pt-runtime/out:813:                        dprint("[dead-letter] copy-delete falló: " + basename);
packages/pt-runtime/out:818:                            dprint("[dead-letter] source residue tras copy-delete: " + filePath);
packages/pt-runtime/out:823:                    dprint("[dead-letter] copy-delete error: " + String(e));
packages/pt-runtime/out:831:                    dprint("[dead-letter] move error: " + String(e));
packages/pt-runtime/out:839:                claimMode: modo,
packages/pt-runtime/out:843:            dprint("[dead-letter] movido: " + basename + " modo=" + modo + " sourceAlive=" + sourceAlive);
packages/pt-runtime/out:846:            dprint("[dead-letter] error: " + String(e));
packages/pt-runtime/out:851:function createQueueCleanup(commandsDir, inFlightDir, queueIndex) {
packages/pt-runtime/out:867:                    if (name === "_queue.json")
packages/pt-runtime/out:907:            dprint("[queue-cleanup] removed " + label + ": " + path);
packages/pt-runtime/out:910:            dprint("[queue-cleanup] remove " + label + " error: " + String(e));
packages/pt-runtime/out:920:        var indexedFiles = queueIndex.read();
packages/pt-runtime/out:973:                    queueIndex.remove(filename);
packages/pt-runtime/out:974:                    dprint("[queue-cleanup] removed stale in-flight: " + filename);
packages/pt-runtime/out:977:                    dprint("[queue-cleanup] stale in-flight error: " + String(e));
packages/pt-runtime/out:996:                    queueIndex.remove(filename);
packages/pt-runtime/out:997:                    dprint("[queue-cleanup] removed stale command: " + filename);
packages/pt-runtime/out:1000:                    dprint("[queue-cleanup] stale command error: " + String(e));
packages/pt-runtime/out:1016:                queueIndex.add(filename);
packages/pt-runtime/out:1017:                dprint("[queue-cleanup] reindexed missing queue entry: " + filename);
packages/pt-runtime/out:1034:                queueIndex.remove(filename);
packages/pt-runtime/out:1035:                dprint("[queue-cleanup] pruned stale index entry: " + filename);
packages/pt-runtime/out:1053:        removeFileIfExists(fm, inFlightPath, "in-flight");
packages/pt-runtime/out:1055:        queueIndex.remove(filename);
packages/pt-runtime/out:1060:// --- pt/kernel/queue-claim.ts ---
packages/pt-runtime/out:1061:// packages/pt-runtime/src/pt/kernel/queue-claim.ts
packages/pt-runtime/out:1062:// Lógica de claim atómico: mover commands -> in-flight y reclamar huérfanos
packages/pt-runtime/out:1065:// _queue.json es legacy fallback, NO fuente primaria.
packages/pt-runtime/out:1069:function createQueueClaim(commandsDir, inFlightDir, queueIndex, queueDiscovery, deadLetter) {
packages/pt-runtime/out:1071:        writeDebugLog("queue", message);
packages/pt-runtime/out:1079:            for (var _c = __values(queueDiscovery.scan()), _d = _c.next(); !_d.done; _d = _c.next()) {
packages/pt-runtime/out:1094:        // Legacy fallback: _queue.json (solo si flag habilitado)
packages/pt-runtime/out:1098:                for (var _e = __values(queueIndex.read()), _f = _e.next(); !_f.done; _f = _e.next()) {
packages/pt-runtime/out:1115:        logQueue("[queue-claim] candidatos vistos: " + files.length);
packages/pt-runtime/out:1128:            logQueue("[queue-claim] archivo vacío: " + filename);
packages/pt-runtime/out:1137:            logQueue("[queue-claim] JSON corrupto: " + filename + " - " + String(e));
packages/pt-runtime/out:1142:            logQueue("[queue-claim] envelope inválido: falta id/seq en " + filename);
packages/pt-runtime/out:1147:            logQueue("[queue-claim] envelope inválido: falta type en " + filename);
packages/pt-runtime/out:1152:            logQueue("[queue-claim] envelope inválido: falta payload en " + filename);
packages/pt-runtime/out:1156:        logQueue("[queue-claim] parseado OK: " + filename + " tipo=" + cmd.type);
packages/pt-runtime/out:1159:    function reclaimFromInFlight(filename, dstPath) {
packages/pt-runtime/out:1160:        logQueue("[queue-claim] reclaim in-flight: " + filename);
packages/pt-runtime/out:1163:            logQueue("[queue-claim] reclaim exitoso: " + filename);
packages/pt-runtime/out:1167:    function claimFromCommands(filename, srcPath, dstPath) {
packages/pt-runtime/out:1168:        logQueue("[queue-claim] claim desde commands: " + filename);
packages/pt-runtime/out:1177:            logQueue("[queue-claim] source vacío: " + filename);
packages/pt-runtime/out:1185:            logQueue("[queue-claim] source JSON corrupto: " + filename + " - " + String(e));
packages/pt-runtime/out:1189:            logQueue("[queue-claim] source envelope inválido: " + filename);
packages/pt-runtime/out:1192:        var modo = s.claimMode;
packages/pt-runtime/out:1193:        logQueue("[queue-claim] modo de claim: " + modo);
packages/pt-runtime/out:1197:                logQueue("[queue-claim] copy-delete falló: " + filename);
packages/pt-runtime/out:1201:                logQueue("[queue-claim] source residue tras copy-delete: " + filename);
packages/pt-runtime/out:1213:                logQueue("[queue-claim] move atómico falló: " + String(e));
packages/pt-runtime/out:1219:            logQueue("[queue-claim] claimFromCommands parse falló: " + filename);
packages/pt-runtime/out:1224:        logQueue("[queue-claim] envelope inválido: " + filename + " razón=" + reasonDetail);
packages/pt-runtime/out:1231:            logQueue("[queue-claim] FM no disponible");
packages/pt-runtime/out:1237:            logQueue("[queue-claim] candidatos: " + files.length + " " + JSON.stringify(files.slice(0, 3)));
packages/pt-runtime/out:1245:                    logQueue("[queue-claim] destino existe, reclaim: " + filename);
packages/pt-runtime/out:1246:                    var cmd_1 = reclaimFromInFlight(filename, dstPath);
packages/pt-runtime/out:1249:                    logQueue("[queue-claim] reclaim fallback: " + filename);
packages/pt-runtime/out:1250:                    var fallback = claimFromCommands(filename, srcPath, dstPath);
packages/pt-runtime/out:1258:                var modo = s.claimMode;
packages/pt-runtime/out:1259:                logQueue("[queue-claim] claim nuevo: " + filename + " modo=" + modo);
packages/pt-runtime/out:1263:                        logQueue("[queue-claim] claim copy-delete falló: " + filename);
packages/pt-runtime/out:1267:                        logQueue("[queue-claim] source residue post-claim: " + filename);
packages/pt-runtime/out:1279:                        logQueue("[queue-claim] claim move falló: " + filename + " - " + String(e));
packages/pt-runtime/out:1300:    var queueIndex = createQueueIndex(config.commandsDir);
packages/pt-runtime/out:1301:    var queueDiscovery = createQueueDiscovery(config.commandsDir);
packages/pt-runtime/out:1303:    var cleanup = createQueueCleanup(config.commandsDir, config.inFlightDir, queueIndex);
packages/pt-runtime/out:1304:    var claim = createQueueClaim(config.commandsDir, config.inFlightDir, queueIndex, queueDiscovery, deadLetter);
packages/pt-runtime/out:1306:        poll: function () { return claim.poll(); },
packages/pt-runtime/out:1308:        count: function () { return claim.count(); },
packages/pt-runtime/out:1556:        getActiveJobs: function () {
packages/pt-runtime/out:1690:// --- pt/kernel/heartbeat.ts ---
packages/pt-runtime/out:1691:// packages/pt-runtime/src/pt/kernel/heartbeat.ts
packages/pt-runtime/out:1715:    var queuedCount = 0;
packages/pt-runtime/out:1717:        debugLog("[heartbeat] setActiveCommand: " + (id || "null"));
packages/pt-runtime/out:1722:        queuedCount = count;
packages/pt-runtime/out:1728:                debugLog("[heartbeat] fm unavailable — skipping write");
packages/pt-runtime/out:1731:            var hbPath = config.devDir + "/heartbeat.json";
packages/pt-runtime/out:1745:                queued: queuedCount,
packages/pt-runtime/out:1747:            debugLog("[heartbeat] WRITE path=" +
packages/pt-runtime/out:1754:            debugLog("[heartbeat] WRITE OK");
packages/pt-runtime/out:1757:            debugLog("[heartbeat] WRITE ERROR: " + String(e));
packages/pt-runtime/out:1761:        debugLog("[heartbeat] START interval=" + config.intervalMs + "ms");
packages/pt-runtime/out:1767:        debugLog("[heartbeat] STOP");
packages/pt-runtime/out:1963:        getActiveJobs: function () {
packages/pt-runtime/out:1964:            return executionEngine.getActiveJobs().map(function (j) {
packages/pt-runtime/out:1994:        subsystems.kernelLogSubsystem("queue", "finishActiveCommand: no active command");
packages/pt-runtime/out:2024:                subsystems.kernelLogSubsystem("queue", "Cleaning up " + state.activeCommandFilename);
packages/pt-runtime/out:2025:                subsystems.queue.cleanup(state.activeCommandFilename);
packages/pt-runtime/out:2026:                subsystems.heartbeat.setQueuedCount(subsystems.queue.count());
packages/pt-runtime/out:2038:    subsystems.heartbeat.setActiveCommand(null);
packages/pt-runtime/out:2040:// --- pt/kernel/queue-poller.ts ---
packages/pt-runtime/out:2041:// packages/pt-runtime/src/pt/kernel/queue-poller.ts
packages/pt-runtime/out:2045:    var queue = subsystems.queue, runtimeLoader = subsystems.runtimeLoader, executionEngine = subsystems.executionEngine, terminal = subsystems.terminal, heartbeat = subsystems.heartbeat, config = subsystems.config, kernelLog = subsystems.kernelLog, kernelLogSubsystem = subsystems.kernelLogSubsystem;
packages/pt-runtime/out:2046:    kernelLogSubsystem("queue", "poll tick: isRunning=" +
packages/pt-runtime/out:2055:        kernelLogSubsystem("queue", "Skipping poll: command already active=" + state.activeCommand.id);
packages/pt-runtime/out:2058:    var activeJobs = executionEngine.getActiveJobs();
packages/pt-runtime/out:2064:        kernelLogSubsystem("queue", "System busy, skipping poll. Active jobs=" + activeJobs.length);
packages/pt-runtime/out:2067:    var claimed = queue.poll();
packages/pt-runtime/out:2068:    kernelLogSubsystem("queue", "Poll result: claimed=" + (claimed ? claimed.id : "null"));
packages/pt-runtime/out:2069:    if (!claimed) {
packages/pt-runtime/out:2070:        kernelLogSubsystem("queue", "No command claimed, checking files...");
packages/pt-runtime/out:2071:        heartbeat.setQueuedCount(queue.count());
packages/pt-runtime/out:2074:    state.activeCommand = claimed;
packages/pt-runtime/out:2075:    state.activeCommandFilename = (_a = claimed.filename) !== null && _a !== void 0 ? _a : null;
packages/pt-runtime/out:2076:    heartbeat.setActiveCommand(claimed.id);
packages/pt-runtime/out:2077:    kernelLog(">>> DISPATCH: " + claimed.id + " type=" + (claimed.type || "unknown"), "info");
packages/pt-runtime/out:2090:        var result = runtimeFn(claimed.payload, runtimeApi);
packages/pt-runtime/out:2103:    var dirs = subsystems.dirs, queue = subsystems.queue, runtimeLoader = subsystems.runtimeLoader, heartbeat = subsystems.heartbeat, executionEngine = subsystems.executionEngine, terminal = subsystems.terminal, lease = subsystems.lease, config = subsystems.config, kernelLog = subsystems.kernelLog, kernelLogSubsystem = subsystems.kernelLogSubsystem;
packages/pt-runtime/out:2115:            kernelLogSubsystem("queue", "Initializing command queue...");
packages/pt-runtime/out:2116:            kernelLogSubsystem("queue", "Queue ready, count=" + queue.count());
packages/pt-runtime/out:2117:            kernelLogSubsystem("queue", "Paths commandsDir=" +
packages/pt-runtime/out:2130:                kernelLogSubsystem("queue", "Forcing immediate poll...");
packages/pt-runtime/out:2131:                kernelLogSubsystem("queue", " Pre-poll: count=" +
packages/pt-runtime/out:2132:                    queue.count() +
packages/pt-runtime/out:2136:                heartbeat.setQueuedCount(queue.count());
packages/pt-runtime/out:2137:                kernelLogSubsystem("queue", "Post-poll: claimed=" +
packages/pt-runtime/out:2141:                kernelLogSubsystem("heartbeat", "Starting heartbeat (" + config.heartbeatIntervalMs + "ms)...");
packages/pt-runtime/out:2142:                heartbeat.start();
packages/pt-runtime/out:2143:                heartbeat.write();
packages/pt-runtime/out:2174:        var activeJobs = executionEngine.getActiveJobs();
packages/pt-runtime/out:2186:        kernelLogSubsystem("heartbeat", "Stopping heartbeat...");
packages/pt-runtime/out:2187:        heartbeat.stop();
packages/pt-runtime/out:2844:    var queue = createCommandQueue({
packages/pt-runtime/out:2850:    var heartbeat = createHeartbeat({
packages/pt-runtime/out:2852:        intervalMs: config.heartbeatIntervalMs,
packages/pt-runtime/out:2880:        queue: queue,
packages/pt-runtime/out:2882:        heartbeat: heartbeat,
packages/pt-runtime/out:3013:        inFlightDir:            devDir + "/in-flight",
packages/pt-runtime/out:3015:        deadLetterDir:          devDir + "/dead-letter",
packages/pt-runtime/out:3020:        heartbeatIntervalMs:    5000,
packages/pt-runtime/tests/config-handler.test.ts:44:      getActiveJobs: () => [],
packages/pt-runtime/tests/config-handler.test.ts:59:        state: "queued",
packages/pt-runtime/tests/config-handler.test.ts:133:      const result = handleDeferredPoll({ type: "__pollDeferred", ticket: "nonexistent" }, deps);
packages/pt-runtime/tests/config-handler.test.ts:141:      const result = handleDeferredPoll({ type: "__pollDeferred", ticket }, deps);
packages/pt-runtime/tests/config-handler.test.ts:155:      const result = handleDeferredPoll({ type: "__pollDeferred", ticket }, deps);
packages/pt-runtime/tests/config-handler.test.ts:170:      const result = handleDeferredPoll({ type: "__pollDeferred", ticket }, deps);
packages/pt-runtime/tests/config-handler.test.ts:184:      const result = handleDeferredPoll({ type: "__pollDeferred", ticket }, deps);
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:11:    // PT-safe main.js with proper queue pattern, interval cleanup, and lease validation
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:14:var heartbeatInterval = null;
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:41:    heartbeatInterval = setInterval(writeHeartbeat, 5000);
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:55:  if (heartbeatInterval) clearInterval(heartbeatInterval);
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:70:function pollCommandQueue() { var cmds = listQueuedCommandFiles(COMMANDS_DIR); claimNextCommand(cmds, COMMANDS_DIR, IN_FLIGHT_DIR, RESULTS_DIR); }
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:72:function recoverInFlightOnStartup() { dprint("[PT] Recover in-flight"); }
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:77:function claimNextCommand(cmds, dir, inflight, results) { return null; }
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:89:    // Complete PT-safe main.js with queue pattern
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:91:var heartbeatInterval = null;
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:101:  heartbeatInterval = setInterval(writeHeartbeat, 5000);
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:109:  if (heartbeatInterval) clearInterval(heartbeatInterval);
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:131:function pollCommandQueue() { var cmds = listQueuedCommandFiles(COMMANDS_DIR); claimNextCommand(cmds, COMMANDS_DIR, IN_FLIGHT_DIR, RESULTS_DIR); }
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:138:function claimNextCommand(cmds, dir, inflight, results) { return null; }
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:224:    // Complete PT-safe main.js with queue pattern and proper cleanup
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:226:var heartbeatInterval = null;
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:245:  heartbeatInterval = setInterval(writeHeartbeat, 5000);
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:253:  if (heartbeatInterval) clearInterval(heartbeatInterval);
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:258:function pollCommandQueue() { var cmds = listQueuedCommandFiles(COMMANDS_DIR); claimNextCommand(cmds, COMMANDS_DIR, IN_FLIGHT_DIR, RESULTS_DIR); }
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:265:function claimNextCommand(cmds, dir, inflight, results) { return null; }
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:275:    // Complete PT-safe main.js with queue pattern and proper cleanup
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:277:var heartbeatInterval = null;
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:297:  heartbeatInterval = setInterval(writeHeartbeat, 5000);
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:305:  if (heartbeatInterval) clearInterval(heartbeatInterval);
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:310:function pollCommandQueue() { var cmds = listQueuedCommandFiles(COMMANDS_DIR); claimNextCommand(cmds, COMMANDS_DIR, IN_FLIGHT_DIR, RESULTS_DIR); }
packages/pt-runtime/tests/runtime-validator-fase8.test.ts:317:function claimNextCommand(cmds, dir, inflight, results) { return null; }
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:7:// PIPELINE DURABLE: commands/, in-flight/, results/, dead-letter/, journal NDJSON
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:16: * 2. Claim por move (mover de commands/ a in-flight/)
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:22: * 8. Limpieza de stale in-flight en startup (la autoridad de recovery es el bridge)
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:32:var IN_FLIGHT_DIR = DEV_DIR + "/in-flight";
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:34:var DEAD_LETTER_DIR = DEV_DIR + "/dead-letter";
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:37:var HEARTBEAT_FILE = DEV_DIR + "/heartbeat.json";
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:47:var heartbeatInterval = null;
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:158:  if (commandPollInterval || deferredPollInterval || heartbeatInterval) {
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:169:  heartbeatInterval = setInterval(writeHeartbeat, 5000);
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:461:      queue: countQueueFiles()
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:528:    dprint("[queue] list error: " + String(e));
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:534: * Reclama el siguiente comando moviéndolo de commands/ a in-flight/
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:537:function claimNextCommand() {
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:545:    // Intentar claim por move
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:551:      // Mover a in-flight/
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:565:        // PT-side trace: claimed
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:571:            claimedAt: Date.now()
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:578:        // Mover a dead-letter
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:588: * Mueve un archivo a dead-letter/
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:603:    // PT-side trace: dead-letter
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:612:    dprint("[PT] Moved to dead-letter: " + basename);
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:624:      dprint("[PT] No stale in-flight files");
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:640:          dprint("[PT] Removed stale in-flight (result exists): " + filename);
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:642:          dprint("[PT] Failed removing stale in-flight: " + String(e1));
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:645:        dprint("[PT] Stale in-flight detected (bridge should recover it): " + filename);
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:694:  var claimed = claimNextCommand();
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:695:  if (!claimed) return;
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:697:  activeCommand = claimed.command;
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:698:  lastCommandId = claimed.command.id;
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:723:      queueStateAtStart: { pending: countQueueFiles() }
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:752:      queueStateAtEnd: { pending: countQueueFiles() }
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:758:      writeResultEnvelope(cmd.id, {
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:794:  writeResultEnvelope(cmd.id, {
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:814:function writeResultEnvelope(id, envelope) {
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:858:        ? runtimeFn({ type: "__pollDeferred", ticket: pending.ticket }, ipc, dprint)
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:885:    writeResultEnvelope(pending.id, envelope);
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:926:    phase: "queued",
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:930:    state: "queued",
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:1068://   queued -> ensure-privileged -> ensure-config -> run-config -> exit-config -> save-config -> done
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:1069://   queued -> ensure-privileged -> run-exec -> done
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:1648:    markCleanup("clear-heartbeat");
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:1649:    if (heartbeatInterval) {
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:1650:      clearInterval(heartbeatInterval);
packages/pt-runtime/tests/__snapshots__/main-template.test.ts.snap:1651:      heartbeatInterval = null;
packages/pt-runtime/docs/migration-summary.md:44:- src/pt/kernel/queue.ts, heartbeat.ts, runtime-loader.ts, cleanup.ts, main.ts, index.ts, job-state-machine.ts
packages/pt-runtime/docs/debug-context.md:37:### Error previo en dead-letter
packages/pt-runtime/docs/debug-context.md:169:- `sendCommandAndWait()` espera resultados con timeout.
packages/pt-runtime/docs/ios-jobs-analysis.md:38:  phase: "queued",      // Current execution phase
packages/pt-runtime/docs/ios-jobs-analysis.md:42:  state: "queued",       // Same as phase (duplicated for convenience)
packages/pt-runtime/docs/ios-jobs-analysis.md:129:1. **`queued`** - Initial state when job is created but not yet started
packages/pt-runtime/docs/ios-jobs-analysis.md:186:queued → ensure-privileged → ensure-config → run-config → exit-config → [save-config] → completed
packages/pt-runtime/docs/ios-jobs-analysis.md:191:queued → ensure-privileged → run-exec → completed
packages/pt-runtime/docs/contract.md:193:| `__pollDeferred` | `handleDeferredPoll` | Poll deferred job status |
packages/pt-runtime/docs/contract.md:214:3. **Runtime polls job status** via `__pollDeferred` with ticket
packages/pt-runtime/docs/api-exploration/dynamic-api-discoveries.md:7:- **Race Conditions:** Se requiere borrar físicamente archivos en `commands/` y `in-flight/` para liberar el semáforo del Bridge externo.
packages/pt-runtime/docs/pt-runtime-migration-diff.md:47:3. No lifecycle management (filesystem, queue, intervals)
packages/pt-runtime/docs/BUILD.md:50:- Command queue polling
packages/pt-runtime/docs/BUILD.md:143:- `pt/kernel/command-queue.ts`
packages/pt-runtime/docs/BUILD.md:148:- `pt/kernel/heartbeat.ts`
packages/pt-runtime/docs/PT9-Debugging.md:137:- `[kernel]` — Kernel lifecycle, dispatch, command queue
packages/pt-runtime/docs/PT9-Debugging.md:139:- `[queue-claim]` — Command claim operations
packages/pt-runtime/docs/superpowers/plans/2026-04-15-pt-runtime-full-api-extractor.md:393:- [x] Verification is included and produces evidence before claims.
packages/pt-runtime/docs/superpowers/plans/2026-04-11-ios-session-guard-implementation.md:365:      sendCommandAndWait: mockSendCommandAndWait,
packages/pt-runtime/docs/superpowers/plans/2026-04-11-ios-session-guard-implementation.md:491:    const result = await this.bridge.sendCommandAndWait<any>("execInteractive", {
packages/pt-runtime/docs/superpowers/plans/2026-04-11-ios-session-guard-implementation.md:500:    await this.bridge.sendCommandAndWait("execInteractive", {
packages/pt-runtime/docs/superpowers/specs/2026-04-12-pt-stack-v2-architecture.md:48:│  │ - queue jobs   │  │ - exec→config  │                  │
packages/pt-runtime/docs/superpowers/specs/2026-04-12-pt-stack-v2-architecture.md:50:│  │ - heartbeat    │  │ - intf→subif   │                  │
packages/pt-runtime/docs/superpowers/specs/2026-04-11-ios-session-guard-design.md:169:Bridge.sendCommandAndWait("execInteractive", {device, command, ...})
packages/pt-runtime/README.md:9:PT Runtime is the bridge between the PT CLI (`pt`) and Cisco Packet Tracer. It transforms TypeScript source into artifacts that PT's scripting engine can execute. The CLI sends commands to the kernel via a queue directory; the kernel dispatches to handlers; handlers return `DeferredJobPlan` objects; the kernel executes them asynchronously via PT's TerminalLine API.
packages/pt-runtime/README.md:12:- Kernel lifecycle (boot, shutdown, lease, heartbeat)
packages/pt-runtime/README.md:14:- Command queue polling y claim
packages/pt-runtime/README.md:48:| `main.js` | ~45 KB | `src/kernel/` + `src/pt/kernel/` | Kernel bootstrap: queue polling, terminal lifecycle, job execution, hot-reload, heartbeat, lease |
packages/pt-runtime/README.md:113:├── in-flight/    → kernel atomically claims files here
packages/pt-runtime/README.md:115:├── dead-letter/  → corrupt files moved here
packages/pt-runtime/README.md:116:├── logs/         → heartbeat for bridge monitoring
packages/pt-runtime/README.md:122:**Key rule**: `main.js` owns lifecycle (queue, terminal, events). `runtime.js` owns business logic (validation, handlers, plan building). They never cross.
packages/pt-runtime/scripts/pt-full-api-dump.js:787:    var writeResult = writeFiles(jsonText, txtText);
packages/pt-runtime/scripts/pt-full-api-dump.js:794:      if (writeResult.ok) {
packages/pt-runtime/scripts/pt-full-api-dump.js:795:        log("json=" + writeResult.jsonPath);
packages/pt-runtime/scripts/pt-full-api-dump.js:796:        log("txt=" + writeResult.txtPath);
packages/pt-runtime/AGENTS.md:16:│   ├── kernel/           # Boot, execution engine, kernel state, command queue, lease manager
packages/pt-runtime/AGENTS.md:477:  heartbeatIntervalMs: number;
packages/pt-runtime/AGENTS.md:514:  getActiveJobs(): Array<{ id: string; device: string; finished: boolean; state: string }>;
packages/pt-runtime/AGENTS.md:576:  getActiveJobs(): ActiveJob[];
packages/pt-runtime/AGENTS.md:586:### pt/kernel/command-queue.ts
packages/pt-runtime/AGENTS.md:629:### pt/kernel/heartbeat.ts
packages/pt-runtime/AGENTS.md:1157:- `src/pt/kernel/queue-claim.ts` — `dprint()` directo para claim operations
packages/pt-runtime/src/runtime/contracts.ts:143:  getActiveJobs(): Array<{ id: string; device: string; finished: boolean; state: string }>;
packages/pt-runtime/src/runtime/contracts.ts:254:// Command Envelope - Structure for command queue files
packages/pt-runtime/src/runtime/contracts.ts:257:/** Command payload from queue */
packages/pt-runtime/src/runtime/contracts.ts:295:    phase: "queue" | "execution" | "validation";
packages/pt-runtime/src/runtime/contracts.ts:313:  type: "__pollDeferred";
packages/pt-runtime/src/runtime/index.ts:106:    if (payload.type === "__pollDeferred") {
packages/pt-runtime/src/runtime/index.ts:107:      var pollLog = log.withCommand("__pollDeferred");
packages/pt-runtime/src/runtime/index.ts:108:      pollLog.debug("Runtime entrada __pollDeferred", {
packages/pt-runtime/src/runtime/index.ts:115:        pollLog.debug("Runtime resultado __pollDeferred", {
packages/pt-runtime/src/runtime/index.ts:236:  if (!api.getActiveJobs) {
packages/pt-runtime/src/runtime/index.ts:240:  const jobs = api.getActiveJobs();
packages/pt-runtime/src/pt-api/pt-results.ts:31:  DISPATCH_ERROR: "DISPATCH_ERROR",
packages/pt-runtime/src/pt-api/pt-deps.ts:45:  getActiveJobs(): JobStateSnapshot[];
packages/pt-runtime/src/pt/kernel/safe-fm.ts:2:// Safe FileManager wrapper — detecta el backend y expone claimMode
packages/pt-runtime/src/pt/kernel/safe-fm.ts:8:  claimMode: ClaimMode;
packages/pt-runtime/src/pt/kernel/safe-fm.ts:78:    claimMode: "unknown",
packages/pt-runtime/src/pt/kernel/safe-fm.ts:87:    claimMode: mode,
packages/pt-runtime/src/pt/kernel/queue-poller.ts:1:// packages/pt-runtime/src/pt/kernel/queue-poller.ts
packages/pt-runtime/src/pt/kernel/queue-poller.ts:11:    queue,
packages/pt-runtime/src/pt/kernel/queue-poller.ts:15:    heartbeat,
packages/pt-runtime/src/pt/kernel/queue-poller.ts:22:    "queue",
packages/pt-runtime/src/pt/kernel/queue-poller.ts:33:    kernelLogSubsystem("queue", "Skipping poll: command already active=" + state.activeCommand.id);
packages/pt-runtime/src/pt/kernel/queue-poller.ts:37:  const activeJobs = executionEngine.getActiveJobs();
packages/pt-runtime/src/pt/kernel/queue-poller.ts:44:  let claimed = null as ReturnType<typeof queue.poll>;
packages/pt-runtime/src/pt/kernel/queue-poller.ts:47:    claimed =
packages/pt-runtime/src/pt/kernel/queue-poller.ts:48:      typeof (queue as any).pollAllowedTypes === "function"
packages/pt-runtime/src/pt/kernel/queue-poller.ts:49:        ? (queue as any).pollAllowedTypes(["__pollDeferred", "__ping"])
packages/pt-runtime/src/pt/kernel/queue-poller.ts:52:    if (!claimed) {
packages/pt-runtime/src/pt/kernel/queue-poller.ts:54:        "queue",
packages/pt-runtime/src/pt/kernel/queue-poller.ts:60:      heartbeat.setQueuedCount(queue.count());
packages/pt-runtime/src/pt/kernel/queue-poller.ts:65:      "queue",
packages/pt-runtime/src/pt/kernel/queue-poller.ts:67:        claimed.id +
packages/pt-runtime/src/pt/kernel/queue-poller.ts:69:        String((claimed as any).type),
packages/pt-runtime/src/pt/kernel/queue-poller.ts:72:    claimed = queue.poll();
packages/pt-runtime/src/pt/kernel/queue-poller.ts:74:  kernelLogSubsystem("queue", "Poll result: claimed=" + (claimed ? claimed.id : "null"));
```
