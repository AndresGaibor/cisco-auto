# invalid ios command fast error

Fecha: Tue Apr 28 18:32:11 -05 2026

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

## invalid command: show version2
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version2" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version2" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version2",
  "output": "SW-SRV-DIST>show version2\n                        ^\n% Invalid input detected at '^' marker.",
  "rawOutput": "SW-SRV-DIST>show version2\n                        ^\n% Invalid input detected at '^' marker.",
  "status": 1,
  "warnings": [
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "IOS_INVALID_INPUT",
    "message": "SW-SRV-DIST>show version2\n                        ^\n% Invalid input detected at '^' marker."
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 1.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## invalid command: show version 2
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version 2" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version 2" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version 2",
  "output": "SW-SRV-DIST>show version 2\n                         ^\n% Invalid input detected at '^' marker.",
  "rawOutput": "SW-SRV-DIST>show version 2\n                         ^\n% Invalid input detected at '^' marker.",
  "status": 1,
  "warnings": [
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta."
  ],
  "error": {
    "code": "IOS_INVALID_INPUT",
    "message": "SW-SRV-DIST>show version 2\n                         ^\n% Invalid input detected at '^' marker."
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 0.5s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## valid sanity
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
  "output": "SW-SRV-DIST>show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "rawOutput": "SW-SRV-DIST>show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "warnings": [
    "El comando \"show version\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777419148079,
      "resultSeenAt": 1777419149193,
      "receivedAt": 1777419149193,
      "waitMs": 1114,
      "completedAtMs": 1777419149175
    }
  },
  "timings": {
    "sentAt": 1777419148079,
    "resultSeenAt": 1777419149193,
    "receivedAt": 1777419149193,
    "waitMs": 1114,
    "completedAtMs": 1777419149175
  }
}
⏱ pt cmd · 1.4s
```

## recent native results
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000018807.json -----
{
  "id": "cmd_000000018807",
  "seq": 18807,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST>show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST>",
  "output": "SW-SRV-DIST>show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "user-exec",
    "modeAfter": "user-exec",
    "promptBefore": "SW-SRV-DIST>",
    "promptAfter": "SW-SRV-DIST>",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 775
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018805.json -----
{
  "id": "cmd_000000018805",
  "seq": 18805,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_IOS_ERROR",
    "message": "IOS rechaz\u00f3 el comando show version 2",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_IOS_ERROR",
  "error": "IOS rechaz\u00f3 el comando show version 2",
  "raw": "SW-SRV-DIST>show version 2\n                         ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST>",
  "output": "SW-SRV-DIST>show version 2\n                         ^\n% Invalid input detected at '^' marker.",
  "status": 1,
  "session": {
    "modeBefore": "user-exec",
    "modeAfter": "user-exec",
    "promptBefore": "SW-SRV-DIST>",
    "promptAfter": "SW-SRV-DIST>",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "ios-error",
    "pagerAdvances": 0,
    "elapsedMs": 46,
    "input": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018803.json -----
{
  "id": "cmd_000000018803",
  "seq": 18803,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_IOS_ERROR",
    "message": "IOS rechaz\u00f3 el comando show version2",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_IOS_ERROR",
  "error": "IOS rechaz\u00f3 el comando show version2",
  "raw": "SW-SRV-DIST>show version2\n                        ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST>",
  "output": "SW-SRV-DIST>show version2\n                        ^\n% Invalid input detected at '^' marker.",
  "status": 1,
  "session": {
    "modeBefore": "user-exec",
    "modeAfter": "user-exec",
    "promptBefore": "SW-SRV-DIST>",
    "promptAfter": "SW-SRV-DIST>",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "ios-error",
    "pagerAdvances": 0,
    "elapsedMs": 91,
    "input": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018801.json -----
{
  "id": "cmd_000000018801",
  "seq": 18801,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST>show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST>",
  "output": "SW-SRV-DIST>show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "user-exec",
    "modeAfter": "user-exec",
    "promptBefore": "SW-SRV-DIST>",
    "promptAfter": "SW-SRV-DIST>",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 334
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018799.json -----
{
  "id": "cmd_000000018799",
  "seq": 18799,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_IOS_ERROR",
    "message": "IOS rechaz\u00f3 el comando show version 2",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_IOS_ERROR",
  "error": "IOS rechaz\u00f3 el comando show version 2",
  "raw": "SW-SRV-DIST>show version 2\n                         ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST>",
  "output": "SW-SRV-DIST>show version 2\n                         ^\n% Invalid input detected at '^' marker.",
  "status": 1,
  "session": {
    "modeBefore": "user-exec",
    "modeAfter": "user-exec",
    "promptBefore": "SW-SRV-DIST>",
    "promptAfter": "SW-SRV-DIST>",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "ios-error",
    "pagerAdvances": 0,
    "elapsedMs": 15,
    "input": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018797.json -----
{
  "id": "cmd_000000018797",
  "seq": 18797,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_IOS_ERROR",
    "message": "IOS rechaz\u00f3 el comando show version2",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_IOS_ERROR",
  "error": "IOS rechaz\u00f3 el comando show version2",
  "raw": "SW-SRV-DIST>show version2\n                        ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST>",
  "output": "SW-SRV-DIST>show version2\n                        ^\n% Invalid input detected at '^' marker.",
  "status": 1,
  "session": {
    "modeBefore": "user-exec",
    "modeAfter": "user-exec",
    "promptBefore": "SW-SRV-DIST>",
    "promptAfter": "SW-SRV-DIST>",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "ios-error",
    "pagerAdvances": 0,
    "elapsedMs": 21,
    "input": ""
  }
}
```
