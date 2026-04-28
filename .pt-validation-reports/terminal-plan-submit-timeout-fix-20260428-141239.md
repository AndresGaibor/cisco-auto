# terminal.plan.run submit timeout fix

Fecha: Tue Apr 28 14:12:39 -05 2026

## grep adapter fix
```
287-    const commandTimeoutMs = Number(planTimeouts?.commandTimeoutMs ?? requestedTimeoutMs ?? 30000);
288-    const stallTimeoutMs = Number(planTimeouts?.stallTimeoutMs ?? 15000);
289-    const stepCount = Math.max(plan.steps.length, 1);
290-
291-    const perStepBudgetMs = commandTimeoutMs + stallTimeoutMs + 3000;
292-    const totalBudgetMs = perStepBudgetMs * stepCount;
293-
294-    return Math.max(requestedTimeoutMs, totalBudgetMs, 25000);
295-  }
296-
297:  function computeTerminalPlanSubmitTimeoutMs(plan: TerminalPlan, requestedTimeoutMs: number): number {
298-    const firstStepTimeoutMs = Number(plan.steps[0]?.timeout ?? requestedTimeoutMs ?? 30000);
299-
300-    // terminal.plan.run solo debe crear el ticket; no ejecuta todo el comando.
301-    // Pero Packet Tracer puede tardar en reclamar archivos si el kernel está ocupado,
302-    // hay polling activo, o el filesystem compartido va lento.
303-    return Math.max(
304-      15000,
305-      Math.min(firstStepTimeoutMs, 30000),
306-    );
307-  }
308-
309-  async function executeTerminalPlanRun(
310-    plan: TerminalPlan,
311-    timeoutMs: number,
312-  ): Promise<TerminalPortResult | null> {
313:    const submitTimeoutMs = computeTerminalPlanSubmitTimeoutMs(plan, timeoutMs);
314-    const submitResult = await bridge.sendCommandAndWait(
315-      "terminal.plan.run",
316-      { plan, options: { timeoutMs } },
317:      submitTimeoutMs,
318-      { resolveDeferred: false },
319-    );
320-    let finalTimings: unknown = submitResult.timings;
321-
322-    if (isUnsupportedTerminalPlanRun(submitResult)) {
323-      return null;
324-    }
325-
326-    const submitValue = normalizeBridgeValue(submitResult);
327-
328-    if (
329-      submitValue &&
330-      typeof submitValue === "object" &&
331-      (submitValue as { ok?: unknown }).ok === false
332-    ) {
333-      const parsed = responseParser.parseCommandResponse(submitValue, {
334-        stepIndex: 0,
335-        isHost: false,
336-        command: "terminal.plan.run",
337-      });
338-
339-      return {
340-        ok: false,
341-        output: parsed.raw.trim(),
342-        status: parsed.status || 1,
343-        promptBefore: parsed.promptBefore,
344-        promptAfter: parsed.promptAfter,
345-        modeBefore: parsed.modeBefore,
346-        modeAfter: parsed.modeAfter,
347-        events: [
```

## verify debug removed
```
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

## doctor before commands
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
  ✓ [ℹ] Heartbeat estado: ok (2378ms)
  ✗ [⚠] Bridge ready: no
  ✗ [⚠] Topología no materializada

Resumen: 8 OK, 2 warning, 0 critical
→ Revisar warnings para mejorar la operación.

⏱ pt doctor · 0.0s
```

## command stress

### show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
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
⏱ pt cmd · 30.8s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### show ip interface brief
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show ip interface brief" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show ip interface brief" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show ip interface brief",
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
⏱ pt cmd · 30.7s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### show vlan brief
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show vlan brief" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show vlan brief" --json
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
      "sentAt": 1777403630798,
      "resultSeenAt": 1777403630903,
      "receivedAt": 1777403630903,
      "waitMs": 105,
      "completedAtMs": 1777403630895
    }
  },
  "timings": {
    "sentAt": 1777403630798,
    "resultSeenAt": 1777403630903,
    "receivedAt": 1777403630903,
    "waitMs": 105,
    "completedAtMs": 1777403630895
  }
}
⏱ pt cmd · 1.2s
```

### show running-config
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "Motherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST>\nSW-SRV-DIST>show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nFastEthernet0/1        unassigned      YES manual up                    up \nFastEthernet0/2        unassigned      YES manual up                    up \nFastEthernet0/3        unassigned      YES manual up                    up \nFastEthernet0/4        unassigned      YES manual up                    up \nFastEthernet0/5        unassigned      YES manual up                    up \nFastEthernet0/6        unassigned      YES manual down                  down \nFastEthernet0/7        unassigned      YES manual down                  down \nFastEthernet0/8        unassigned      YES manual down                  down \nFastEthernet0/9        unassigned      YES manual down                  down \nFastEthernet0/10       unassigned      YES manual down                  down \nFastEthernet0/11       unassigned      YES manual down                  down \nFastEthernet0/12       unassigned      YES manual down                  down \nFastEthernet0/13       unassigned      YES manual down                  down \nFastEthernet0/14       unassigned      YES manual down                  down \nFastEthernet0/15       unassigned      YES manual down                  down \nFastEthernet0/16       unassigned      YES manual down                  down \nFastEthernet0/17       unassigned      YES manual down                  down \nFastEthernet0/18       unassigned      YES manual down                  down \nFastEthernet0/19       unassigned      YES manual down                  down \nFastEthernet0/20       unassigned      YES manual down                  down \nFastEthernet0/21       unassigned      YES manual down                  down \nFastEthernet0/22       unassigned      YES manual down                  down \nFastEthernet0/23       unassigned      YES manual down                  down \nFastEthernet0/24       unassigned      YES manual down                  down \nGigabitEthernet0/1     unassigned      YES manual up                    up \nGigabitEthernet0/2     unassigned      YES manual up                    up \nVlan1                  unassigned      YES manual administratively down down \nVlan99                 192.168.99.6    YES manual up                    up\nSW-SRV-DIST>\nSW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>\nSW-SRV-DIST>enable\nSW-SRV-DIST#SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70",
  "rawOutput": "Motherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST>\nSW-SRV-DIST>show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nFastEthernet0/1        unassigned      YES manual up                    up \nFastEthernet0/2        unassigned      YES manual up                    up \nFastEthernet0/3        unassigned      YES manual up                    up \nFastEthernet0/4        unassigned      YES manual up                    up \nFastEthernet0/5        unassigned      YES manual up                    up \nFastEthernet0/6        unassigned      YES manual down                  down \nFastEthernet0/7        unassigned      YES manual down                  down \nFastEthernet0/8        unassigned      YES manual down                  down \nFastEthernet0/9        unassigned      YES manual down                  down \nFastEthernet0/10       unassigned      YES manual down                  down \nFastEthernet0/11       unassigned      YES manual down                  down \nFastEthernet0/12       unassigned      YES manual down                  down \nFastEthernet0/13       unassigned      YES manual down                  down \nFastEthernet0/14       unassigned      YES manual down                  down \nFastEthernet0/15       unassigned      YES manual down                  down \nFastEthernet0/16       unassigned      YES manual down                  down \nFastEthernet0/17       unassigned      YES manual down                  down \nFastEthernet0/18       unassigned      YES manual down                  down \nFastEthernet0/19       unassigned      YES manual down                  down \nFastEthernet0/20       unassigned      YES manual down                  down \nFastEthernet0/21       unassigned      YES manual down                  down \nFastEthernet0/22       unassigned      YES manual down                  down \nFastEthernet0/23       unassigned      YES manual down                  down \nFastEthernet0/24       unassigned      YES manual down                  down \nGigabitEthernet0/1     unassigned      YES manual up                    up \nGigabitEthernet0/2     unassigned      YES manual up                    up \nVlan1                  unassigned      YES manual administratively down down \nVlan99                 192.168.99.6    YES manual up                    up\nSW-SRV-DIST>\nSW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>\nSW-SRV-DIST>enable\nSW-SRV-DIST#SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n\nSW-SRV-DIST#\nSW-SRV-DIST#",
  "status": 0,
  "warnings": [],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777403632594,
      "resultSeenAt": 1777403632802,
      "receivedAt": 1777403632802,
      "waitMs": 208,
      "completedAtMs": 1777403632763
    }
  },
  "timings": {
    "sentAt": 1777403632594,
    "resultSeenAt": 1777403632802,
    "receivedAt": 1777403632802,
    "waitMs": 208,
    "completedAtMs": 1777403632763
  }
}
⏱ pt cmd · 1.5s
```

### show version
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
  "output": "Cisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "rawOutput": "show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "status": 0,
  "warnings": [
    "Se filtró el eco del comando (1 línea/s)."
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777403634148,
      "resultSeenAt": 1777403634252,
      "receivedAt": 1777403634252,
      "waitMs": 104,
      "completedAtMs": 1777403634244
    }
  },
  "timings": {
    "sentAt": 1777403634148,
    "resultSeenAt": 1777403634252,
    "receivedAt": 1777403634252,
    "waitMs": 104,
    "completedAtMs": 1777403634244
  }
}
⏱ pt cmd · 0.9s
```

## final dirs
```

### /Users/andresgaibor/pt-dev/commands
total 8
drwxr-xr-x@  3 andresgaibor  staff    96B Apr 28 14:13 .
drwxr-xr-x@ 28 andresgaibor  staff   896B Apr 28 14:13 ..
-rw-r--r--@  1 andresgaibor  staff     2B Apr 28 14:13 _queue.json

### /Users/andresgaibor/pt-dev/in-flight
total 0
drwxr-xr-x@  2 andresgaibor  staff    64B Apr 28 14:13 .
drwxr-xr-x@ 28 andresgaibor  staff   896B Apr 28 14:13 ..

### /Users/andresgaibor/pt-dev/dead-letter
total 0
drwxr-xr-x@  2 andresgaibor  staff    64B Apr 28 13:41 .
drwxr-xr-x@ 28 andresgaibor  staff   896B Apr 28 14:13 ..

### /Users/andresgaibor/pt-dev/results
total 160
drwxr-xr-x@ 17 andresgaibor  staff   544B Apr 28 14:13 .
drwxr-xr-x@ 28 andresgaibor  staff   896B Apr 28 14:13 ..
-rw-r--r--@  1 andresgaibor  staff   285B Apr 28 14:13 cmd_000000018389.json
-rw-r--r--@  1 andresgaibor  staff   916B Apr 28 14:13 cmd_000000018390.json
-rw-r--r--@  1 andresgaibor  staff   285B Apr 28 14:13 cmd_000000018392.json
-rw-r--r--@  1 andresgaibor  staff   900B Apr 28 14:13 cmd_000000018393.json
-rw-r--r--@  1 andresgaibor  staff   1.1K Apr 28 14:13 cmd_000000018394.json
-rw-r--r--@  1 andresgaibor  staff   5.3K Apr 28 14:13 cmd_000000018395.json
-rw-r--r--@  1 andresgaibor  staff   285B Apr 28 14:13 cmd_000000018396.json
-rw-r--r--@  1 andresgaibor  staff   1.1K Apr 28 14:13 cmd_000000018397.json
-rw-r--r--@  1 andresgaibor  staff   887B Apr 28 14:13 cmd_000000018398.json
-rw-r--r--@  1 andresgaibor  staff   7.7K Apr 28 14:13 cmd_000000018399.json
-rw-r--r--@  1 andresgaibor  staff    11K Apr 28 14:13 cmd_000000018400.json
-rw-r--r--@  1 andresgaibor  staff   285B Apr 28 14:13 cmd_000000018401.json
-rw-r--r--@  1 andresgaibor  staff   894B Apr 28 14:13 cmd_000000018402.json
-rw-r--r--@  1 andresgaibor  staff   967B Apr 28 14:13 cmd_000000018403.json
-rw-r--r--@  1 andresgaibor  staff   4.8K Apr 28 14:13 cmd_000000018404.json
```

## recent terminal.plan.run events
```
{"seq":18284,"ts":1777401940579,"type":"command-enqueued","id":"cmd_000000018284","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18285,"ts":1777401941247,"type":"command-enqueued","id":"cmd_000000018285","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18286,"ts":1777401941865,"type":"command-enqueued","id":"cmd_000000018286","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18287,"ts":1777401942424,"type":"command-enqueued","id":"cmd_000000018287","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18288,"ts":1777401942991,"type":"command-enqueued","id":"cmd_000000018288","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18289,"ts":1777401943608,"type":"command-enqueued","id":"cmd_000000018289","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18290,"ts":1777401944175,"type":"command-enqueued","id":"cmd_000000018290","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18291,"ts":1777401944725,"type":"command-enqueued","id":"cmd_000000018291","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18292,"ts":1777401945271,"type":"command-enqueued","id":"cmd_000000018292","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18293,"ts":1777401945930,"type":"command-enqueued","id":"cmd_000000018293","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18294,"ts":1777401946625,"type":"command-enqueued","id":"cmd_000000018294","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960332}
{"seq":18295,"ts":1777401947609,"type":"command-enqueued","id":"cmd_000000018295","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18296,"ts":1777401948159,"type":"command-enqueued","id":"cmd_000000018296","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18297,"ts":1777401948708,"type":"command-enqueued","id":"cmd_000000018297","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18298,"ts":1777401949325,"type":"command-enqueued","id":"cmd_000000018298","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18299,"ts":1777401949987,"type":"command-enqueued","id":"cmd_000000018299","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18300,"ts":1777401950657,"type":"command-enqueued","id":"cmd_000000018300","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18301,"ts":1777401951326,"type":"command-enqueued","id":"cmd_000000018301","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18302,"ts":1777401951874,"type":"command-enqueued","id":"cmd_000000018302","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18303,"ts":1777401952424,"type":"command-enqueued","id":"cmd_000000018303","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18304,"ts":1777401953040,"type":"command-enqueued","id":"cmd_000000018304","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18305,"ts":1777401953720,"type":"command-enqueued","id":"cmd_000000018305","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18306,"ts":1777401954400,"type":"command-enqueued","id":"cmd_000000018306","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18307,"ts":1777401955074,"type":"command-enqueued","id":"cmd_000000018307","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18308,"ts":1777401955948,"type":"command-enqueued","id":"cmd_000000018308","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18309,"ts":1777401956616,"type":"command-enqueued","id":"cmd_000000018309","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18310,"ts":1777401957183,"type":"command-enqueued","id":"cmd_000000018310","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18311,"ts":1777401957802,"type":"command-enqueued","id":"cmd_000000018311","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960332}
{"seq":18312,"ts":1777401958482,"type":"command-enqueued","id":"cmd_000000018312","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18313,"ts":1777401959152,"type":"command-enqueued","id":"cmd_000000018313","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777401960331}
{"seq":18314,"ts":1777402135192,"type":"command-enqueued","id":"cmd_000000018314","commandType":"omni.evaluate.raw","payloadSizeBytes":718,"expiresAt":1777402145184}
{"seq":18315,"ts":1777402136728,"type":"command-enqueued","id":"cmd_000000018315","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777402196725}
{"seq":18316,"ts":1777402136896,"type":"command-enqueued","id":"cmd_000000018316","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777402141893}
{"seq":18317,"ts":1777402137241,"type":"command-enqueued","id":"cmd_000000018317","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18318,"ts":1777402137710,"type":"command-enqueued","id":"cmd_000000018318","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18319,"ts":1777402138369,"type":"command-enqueued","id":"cmd_000000018319","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18320,"ts":1777402138920,"type":"command-enqueued","id":"cmd_000000018320","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18321,"ts":1777402139468,"type":"command-enqueued","id":"cmd_000000018321","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18322,"ts":1777402140018,"type":"command-enqueued","id":"cmd_000000018322","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18323,"ts":1777402140626,"type":"command-enqueued","id":"cmd_000000018323","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18324,"ts":1777402141178,"type":"command-enqueued","id":"cmd_000000018324","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18325,"ts":1777402141797,"type":"command-enqueued","id":"cmd_000000018325","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18326,"ts":1777402142414,"type":"command-enqueued","id":"cmd_000000018326","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18327,"ts":1777402142965,"type":"command-enqueued","id":"cmd_000000018327","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18328,"ts":1777402143632,"type":"command-enqueued","id":"cmd_000000018328","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18329,"ts":1777402144314,"type":"command-enqueued","id":"cmd_000000018329","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18330,"ts":1777402144984,"type":"command-enqueued","id":"cmd_000000018330","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18331,"ts":1777402145654,"type":"command-enqueued","id":"cmd_000000018331","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18332,"ts":1777402146324,"type":"command-enqueued","id":"cmd_000000018332","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18333,"ts":1777402147006,"type":"command-enqueued","id":"cmd_000000018333","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18334,"ts":1777402147676,"type":"command-enqueued","id":"cmd_000000018334","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18335,"ts":1777402148289,"type":"command-enqueued","id":"cmd_000000018335","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18336,"ts":1777402148951,"type":"command-enqueued","id":"cmd_000000018336","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18337,"ts":1777402149565,"type":"command-enqueued","id":"cmd_000000018337","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18338,"ts":1777402150247,"type":"command-enqueued","id":"cmd_000000018338","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18339,"ts":1777402150799,"type":"command-enqueued","id":"cmd_000000018339","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18340,"ts":1777402151418,"type":"command-enqueued","id":"cmd_000000018340","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18341,"ts":1777402152083,"type":"command-enqueued","id":"cmd_000000018341","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18342,"ts":1777402152691,"type":"command-enqueued","id":"cmd_000000018342","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18343,"ts":1777402153407,"type":"command-enqueued","id":"cmd_000000018343","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18344,"ts":1777402154024,"type":"command-enqueued","id":"cmd_000000018344","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18345,"ts":1777402154690,"type":"command-enqueued","id":"cmd_000000018345","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18346,"ts":1777402155256,"type":"command-enqueued","id":"cmd_000000018346","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18347,"ts":1777402155872,"type":"command-enqueued","id":"cmd_000000018347","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18348,"ts":1777402156540,"type":"command-enqueued","id":"cmd_000000018348","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18349,"ts":1777402157159,"type":"command-enqueued","id":"cmd_000000018349","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18350,"ts":1777402157769,"type":"command-enqueued","id":"cmd_000000018350","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18351,"ts":1777402158430,"type":"command-enqueued","id":"cmd_000000018351","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18352,"ts":1777402159046,"type":"command-enqueued","id":"cmd_000000018352","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18353,"ts":1777402159719,"type":"command-enqueued","id":"cmd_000000018353","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18354,"ts":1777402160337,"type":"command-enqueued","id":"cmd_000000018354","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18355,"ts":1777402160955,"type":"command-enqueued","id":"cmd_000000018355","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18356,"ts":1777402161636,"type":"command-enqueued","id":"cmd_000000018356","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18357,"ts":1777402162250,"type":"command-enqueued","id":"cmd_000000018357","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18358,"ts":1777402162932,"type":"command-enqueued","id":"cmd_000000018358","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18359,"ts":1777402163601,"type":"command-enqueued","id":"cmd_000000018359","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18360,"ts":1777402164213,"type":"command-enqueued","id":"cmd_000000018360","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18361,"ts":1777402164882,"type":"command-enqueued","id":"cmd_000000018361","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18362,"ts":1777402165493,"type":"command-enqueued","id":"cmd_000000018362","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18363,"ts":1777402166045,"type":"command-enqueued","id":"cmd_000000018363","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402167237}
{"seq":18364,"ts":1777402419138,"type":"command-enqueued","id":"cmd_000000018364","commandType":"omni.evaluate.raw","payloadSizeBytes":4583,"expiresAt":1777402429134}
{"seq":18365,"ts":1777402581529,"type":"command-enqueued","id":"cmd_000000018365","commandType":"omni.evaluate.raw","payloadSizeBytes":4990,"expiresAt":1777402591524}
{"seq":18367,"ts":1777402800501,"type":"command-enqueued","id":"cmd_000000018367","commandType":"omni.evaluate.raw","payloadSizeBytes":718,"expiresAt":1777402810497}
{"seq":18368,"ts":1777402801533,"type":"command-enqueued","id":"cmd_000000018368","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777402861531}
{"seq":18369,"ts":1777402801647,"type":"command-enqueued","id":"cmd_000000018369","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777402806645}
{"seq":18370,"ts":1777402801786,"type":"command-enqueued","id":"cmd_000000018370","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402831784}
{"seq":18371,"ts":1777402802339,"type":"command-enqueued","id":"cmd_000000018371","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777402831784}
{"seq":18372,"ts":1777403010007,"type":"command-enqueued","id":"cmd_000000018372","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403070000}
{"seq":18373,"ts":1777403010341,"type":"command-enqueued","id":"cmd_000000018373","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777403015339}
{"seq":18374,"ts":1777403016050,"type":"command-enqueued","id":"cmd_000000018374","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403076047}
{"seq":18375,"ts":1777403016222,"type":"command-enqueued","id":"cmd_000000018375","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777403021220}
{"seq":18376,"ts":1777403016536,"type":"command-enqueued","id":"cmd_000000018376","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403046535}
{"seq":18377,"ts":1777403017115,"type":"command-enqueued","id":"cmd_000000018377","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403046535}
{"seq":18378,"ts":1777403017577,"type":"command-enqueued","id":"cmd_000000018378","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403046535}
{"seq":18379,"ts":1777403018264,"type":"command-enqueued","id":"cmd_000000018379","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403078261}
{"seq":18380,"ts":1777403018430,"type":"command-enqueued","id":"cmd_000000018380","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777403023428}
{"seq":18381,"ts":1777403018741,"type":"command-enqueued","id":"cmd_000000018381","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403048739}
{"seq":18382,"ts":1777403019364,"type":"command-enqueued","id":"cmd_000000018382","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403048739}
{"seq":18383,"ts":1777403019826,"type":"command-enqueued","id":"cmd_000000018383","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403048739}
{"seq":18384,"ts":1777403020590,"type":"command-enqueued","id":"cmd_000000018384","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403080588}
{"seq":18385,"ts":1777403020705,"type":"command-enqueued","id":"cmd_000000018385","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777403025703}
{"seq":18386,"ts":1777403567496,"type":"command-enqueued","id":"cmd_000000018386","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403627492}
{"seq":18387,"ts":1777403567813,"type":"command-enqueued","id":"cmd_000000018387","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777403582811}
{"seq":18388,"ts":1777403567973,"type":"command-enqueued","id":"cmd_000000018388","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403597972}
{"seq":18389,"ts":1777403598623,"type":"command-enqueued","id":"cmd_000000018389","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403658621}
{"seq":18390,"ts":1777403598838,"type":"command-enqueued","id":"cmd_000000018390","commandType":"terminal.plan.run","payloadSizeBytes":562,"expiresAt":1777403613836}
{"seq":18391,"ts":1777403599088,"type":"command-enqueued","id":"cmd_000000018391","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403629087}
{"seq":18392,"ts":1777403629771,"type":"command-enqueued","id":"cmd_000000018392","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403689769}
{"seq":18393,"ts":1777403629939,"type":"command-enqueued","id":"cmd_000000018393","commandType":"terminal.plan.run","payloadSizeBytes":554,"expiresAt":1777403644938}
{"seq":18394,"ts":1777403630246,"type":"command-enqueued","id":"cmd_000000018394","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403660245}
{"seq":18395,"ts":1777403630797,"type":"command-enqueued","id":"cmd_000000018395","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403660245}
{"seq":18396,"ts":1777403631331,"type":"command-enqueued","id":"cmd_000000018396","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403691328}
{"seq":18397,"ts":1777403631509,"type":"command-enqueued","id":"cmd_000000018397","commandType":"terminal.plan.run","payloadSizeBytes":759,"expiresAt":1777403646508}
{"seq":18398,"ts":1777403631671,"type":"command-enqueued","id":"cmd_000000018398","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403691670}
{"seq":18399,"ts":1777403632132,"type":"command-enqueued","id":"cmd_000000018399","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403691670}
{"seq":18400,"ts":1777403632594,"type":"command-enqueued","id":"cmd_000000018400","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403691670}
{"seq":18401,"ts":1777403633403,"type":"command-enqueued","id":"cmd_000000018401","commandType":"inspectDeviceFast","payloadSizeBytes":55,"expiresAt":1777403693401}
{"seq":18402,"ts":1777403633522,"type":"command-enqueued","id":"cmd_000000018402","commandType":"terminal.plan.run","payloadSizeBytes":551,"expiresAt":1777403648520}
{"seq":18403,"ts":1777403633686,"type":"command-enqueued","id":"cmd_000000018403","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403663685}
{"seq":18404,"ts":1777403634148,"type":"command-enqueued","id":"cmd_000000018404","commandType":"__pollDeferred","payloadSizeBytes":25,"expiresAt":1777403663685}
```
