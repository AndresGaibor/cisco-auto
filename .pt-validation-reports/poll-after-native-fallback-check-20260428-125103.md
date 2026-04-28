# poll after native fallback check

Fecha: Tue Apr 28 12:51:03 -05 2026

## latest result files
```
total 32
-rw-r--r--@ 1 andresgaibor  staff  1975 Apr 28 12:49 cmd_000000017679.json
-rw-r--r--@ 1 andresgaibor  staff   894 Apr 28 12:49 cmd_000000017677.json
-rw-r--r--@ 1 andresgaibor  staff   285 Apr 28 12:49 cmd_000000017676.json
-rw-r--r--@ 1 andresgaibor  staff   794 Apr 28 12:49 cmd_000000017675.json
```

## last 80 result summaries
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000017679.json -----
{'id': 'cmd_000000017679', 'seq': 17679, 'type': 'omni.evaluate.raw', 'status': 'completed', 'ok': True}
value= {'ok': True, 'result': '{"prompt":"SW-SRV-DIST>","mode":"user","outputTail":"            ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>","input":""}'}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017677.json -----
{'id': 'cmd_000000017677', 'seq': 17677, 'type': 'terminal.plan.run', 'status': 'completed', 'ok': True}
value= {'ok': True, 'deferred': True, 'ticket': 'cmd-464e65b9', 'job': {'id': 'cmd-464e65b9', 'kind': 'ios-session', 'version': 1, 'device': 'SW-SRV-DIST', 'plan': [{'type': 'command', 'kind': 'command', 'value': 'show version', 'command': 'show version', 'allowPager': True, 'allowConfirm': False, 'optional': False, 'timeoutMs': 12000, 'options': {'timeoutMs': 12000}, 'metadata': {}}], 'options': {'stopOnError': True, 'commandTimeoutMs': 12000, 'stallTimeoutMs': 15000}, 'payload': {'source': 'terminal.plan.run', 'metadata': {'deviceKind': 'ios', 'source': 'pt-control.terminal-plan-builder', 'lineCount': 1}, 'policies': {'autoBreakWizard': True, 'autoAdvancePager': True, 'maxPagerAdvances': 80, 'maxConfirmations': 0, 'abortOnPromptMismatch': False, 'abortOnModeMismatch': True}}}}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017676.json -----
{'id': 'cmd_000000017676', 'seq': 17676, 'type': 'inspectDeviceFast', 'status': 'completed', 'ok': True}
value= {'ok': True, 'device': {'name': 'SW-SRV-DIST', 'model': '2960-24TT', 'type': 1, 'power': True, 'hasCommandLine': True}}
error= None

----- /Users/andresgaibor/pt-dev/results/cmd_000000017675.json -----
{'id': 'cmd_000000017675', 'seq': 17675, 'type': 'omni.evaluate.raw', 'status': 'completed', 'ok': True}
value= {'ok': True, 'result': '{"prompt":"SW-SRV-DIST>","mode":"user","tail":"       : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>"}'}
error= None
```
