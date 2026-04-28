# pt cmd deferred trace

Fecha: Tue Apr 28 12:44:20 -05 2026

## pre-clean pager
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice('SW-SRV-DIST');
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function safe(name){ try { if(t && typeof t[name] === 'function') return String(t[name]()); return ''; } catch(e) { return ''; } }
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }
for (var i=0;i<30;i++) {
  var out = safe('getOutput');
  if (out.indexOf('--More--') < 0) break;
  try { t.enterChar(32,0); } catch(e) {}
  pause(150);
}
try { t.enterChar(13,0); } catch(e) {}
pause(250);
return JSON.stringify({ prompt: safe('getPrompt'), mode: safe('getMode'), tail: safe('getOutput').slice(-800) });
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice('SW-SRV-DIST');
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function safe(name){ try { if(t && typeof t[name] === 'function') return String(t[name]()); return ''; } catch(e) { return ''; } }
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }
for (var i=0;i<30;i++) {
  var out = safe('getOutput');
  if (out.indexOf('--More--') < 0) break;
  try { t.enterChar(32,0); } catch(e) {}
  pause(150);
}
try { t.enterChar(13,0); } catch(e) {}
pause(250);
return JSON.stringify({ prompt: safe('getPrompt'), mode: safe('getMode'), tail: safe('getOutput').slice(-800) });
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 641,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice('SW-SRV-DIST');\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nfunction safe(name){ try { if(t && typeof t[name] === 'function') return String(t[name]()); return ''; } catch(e) { return ''; } }\nfunction pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }\nfor (var i=0;i<30;i++) {\n  var out = safe('getOutput');\n  if (out.indexOf('--More--') < 0) break;\n  try { t.enterChar(32,0); } catch(e) {}\n  pause(150);\n}\ntry { t.enterChar(13,0); } c",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"tail\":\"  : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000017601",
      "seq": 17601,
      "type": "omni.evaluate.raw",
      "startedAt": 1777398261635,
      "completedAt": 1777398261954,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"tail\":\"  : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777398261541,
        "resultSeenAt": 1777398261960,
        "receivedAt": 1777398261960,
        "waitMs": 419,
        "completedAtMs": 1777398261954
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.5s
```

## doctor before
```
$ bun run --cwd apps/pt-cli start doctor --json
$ bun run src/index.ts doctor --json

═══ Diagnóstico del sistema ═══

  ✓ [ℹ] Directorio pt-dev accesible: /Users/andresgaibor/pt-dev
  ✓ [ℹ] Directorio de logs accesible: /Users/andresgaibor/pt-dev/logs
  ✓ [ℹ] Directorio de historial accesible: /Users/andresgaibor/pt-dev/history
  ✓ [ℹ] Directorio de resultados accesible: /Users/andresgaibor/pt-dev/results
  ✓ [ℹ] Archivos de runtime presentes: main.js, runtime.js
  ✗ [🔴] Queue: 1 queued / 0 in-flight / 22 dead-letter
  ✓ [ℹ] Heartbeat encontrado
  ✓ [ℹ] Heartbeat estado: ok (4029ms)
  ✗ [⚠] Bridge ready: no
  ✗ [⚠] Topología no materializada

Resumen: 7 OK, 2 warning, 1 critical
→ Acción requerida: hay problemas críticos.

⏱ pt doctor · 0.0s
```

## pt cmd show version
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

## terminal after
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice('SW-SRV-DIST');
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function safe(name){ try { if(t && typeof t[name] === 'function') return String(t[name]()); return '<no-method>'; } catch(e) { return '<err:' + String(e) + '>'; } }
return JSON.stringify({ prompt: safe('getPrompt'), mode: safe('getMode'), input: safe('getCommandInput'), outputTail: safe('getOutput').slice(-2200) });
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice('SW-SRV-DIST');
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function safe(name){ try { if(t && typeof t[name] === 'function') return String(t[name]()); return '<no-method>'; } catch(e) { return '<err:' + String(e) + '>'; } }
return JSON.stringify({ prompt: safe('getPrompt'), mode: safe('getMode'), input: safe('getCommandInput'), outputTail: safe('getOutput').slice(-2200) });
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 443,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice('SW-SRV-DIST');\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nfunction safe(name){ try { if(t && typeof t[name] === 'function') return String(t[name]()); return '<no-method>'; } catch(e) { return '<err:' + String(e) + '>'; } }\nreturn JSON.stringify({ prompt: safe('getPrompt'), mode: safe('getMode'), input: safe('getCommandInput'), outputTail: safe('getOutput').slice(-2200) });\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputTail\":\" supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000017673",
      "seq": 17673,
      "type": "omni.evaluate.raw",
      "startedAt": 1777398293330,
      "completedAt": 1777398293376,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputTail\":\" supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777398293248,
        "resultSeenAt": 1777398293414,
        "receivedAt": 1777398293414,
        "waitMs": 166,
        "completedAtMs": 1777398293376
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.3s
```

## recent results terminal.plan.run / poll
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000017673.json -----
{"protocolVersion":2,"id":"cmd_000000017673","seq":17673,"type":"omni.evaluate.raw","startedAt":1777398293330,"completedAt":1777398293376,"status":"completed","ok":true,"value":{"ok":true,"result":"{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputTail\":\" supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"}"}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017672.json -----
{"protocolVersion":2,"id":"cmd_000000017672","seq":17672,"type":"__pollDeferred","startedAt":1777398292528,"completedAt":1777398292567,"status":"failed","ok":false,"value":{"done":true,"ok":false,"status":1,"result":null,"error":"Job timed out while waiting for terminal command completion","code":"JOB_TIMEOUT","errorCode":"JOB_TIMEOUT","raw":"","output":"","source":"terminal","session":{"mode":"unknown","prompt":"","paging":false,"awaitingConfirm":false}},"error":{"code":"JOB_TIMEOUT","message":"Job timed out while waiting for terminal command completion","phase":"execution"}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017671.json -----
{"protocolVersion":2,"id":"cmd_000000017671","seq":17671,"type":"__pollDeferred","startedAt":1777398292036,"completedAt":1777398292075,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":28804,"idleMs":28804}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017670.json -----
{"protocolVersion":2,"id":"cmd_000000017670","seq":17670,"type":"__pollDeferred","startedAt":1777398291532,"completedAt":1777398291572,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":28300,"idleMs":28300}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017669.json -----
{"protocolVersion":2,"id":"cmd_000000017669","seq":17669,"type":"__pollDeferred","startedAt":1777398291132,"completedAt":1777398291172,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":27900,"idleMs":27900}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017668.json -----
{"protocolVersion":2,"id":"cmd_000000017668","seq":17668,"type":"__pollDeferred","startedAt":1777398290731,"completedAt":1777398290772,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":27500,"idleMs":27500}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017667.json -----
{"protocolVersion":2,"id":"cmd_000000017667","seq":17667,"type":"__pollDeferred","startedAt":1777398290331,"completedAt":1777398290371,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":27099,"idleMs":27099}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017666.json -----
{"protocolVersion":2,"id":"cmd_000000017666","seq":17666,"type":"__pollDeferred","startedAt":1777398289930,"completedAt":1777398289970,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":26697,"idleMs":26697}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017665.json -----
{"protocolVersion":2,"id":"cmd_000000017665","seq":17665,"type":"__pollDeferred","startedAt":1777398289436,"completedAt":1777398289475,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":26204,"idleMs":26204}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017664.json -----
{"protocolVersion":2,"id":"cmd_000000017664","seq":17664,"type":"__pollDeferred","startedAt":1777398289033,"completedAt":1777398289073,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":25801,"idleMs":25801}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017663.json -----
{"protocolVersion":2,"id":"cmd_000000017663","seq":17663,"type":"__pollDeferred","startedAt":1777398288633,"completedAt":1777398288671,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":25400,"idleMs":25400}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017662.json -----
{"protocolVersion":2,"id":"cmd_000000017662","seq":17662,"type":"__pollDeferred","startedAt":1777398288133,"completedAt":1777398288173,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":24901,"idleMs":24901}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017661.json -----
{"protocolVersion":2,"id":"cmd_000000017661","seq":17661,"type":"__pollDeferred","startedAt":1777398287635,"completedAt":1777398287675,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":24402,"idleMs":24402}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017660.json -----
{"protocolVersion":2,"id":"cmd_000000017660","seq":17660,"type":"__pollDeferred","startedAt":1777398287231,"completedAt":1777398287270,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":23999,"idleMs":23999}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017659.json -----
{"protocolVersion":2,"id":"cmd_000000017659","seq":17659,"type":"__pollDeferred","startedAt":1777398286832,"completedAt":1777398286871,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":23599,"idleMs":23599}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017658.json -----
{"protocolVersion":2,"id":"cmd_000000017658","seq":17658,"type":"__pollDeferred","startedAt":1777398286434,"completedAt":1777398286473,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":23202,"idleMs":23202}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017657.json -----
{"protocolVersion":2,"id":"cmd_000000017657","seq":17657,"type":"__pollDeferred","startedAt":1777398286034,"completedAt":1777398286073,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":22801,"idleMs":22801}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017656.json -----
{"protocolVersion":2,"id":"cmd_000000017656","seq":17656,"type":"__pollDeferred","startedAt":1777398285636,"completedAt":1777398285674,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":22404,"idleMs":22404}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017655.json -----
{"protocolVersion":2,"id":"cmd_000000017655","seq":17655,"type":"__pollDeferred","startedAt":1777398285233,"completedAt":1777398285272,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":22000,"idleMs":22000}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017654.json -----
{"protocolVersion":2,"id":"cmd_000000017654","seq":17654,"type":"__pollDeferred","startedAt":1777398284835,"completedAt":1777398284874,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":21603,"idleMs":21603}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017653.json -----
{"protocolVersion":2,"id":"cmd_000000017653","seq":17653,"type":"__pollDeferred","startedAt":1777398284433,"completedAt":1777398284473,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":21200,"idleMs":21200}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017652.json -----
{"protocolVersion":2,"id":"cmd_000000017652","seq":17652,"type":"__pollDeferred","startedAt":1777398284032,"completedAt":1777398284070,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":20800,"idleMs":20800}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017651.json -----
{"protocolVersion":2,"id":"cmd_000000017651","seq":17651,"type":"__pollDeferred","startedAt":1777398283634,"completedAt":1777398283675,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":20402,"idleMs":20402}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017650.json -----
{"protocolVersion":2,"id":"cmd_000000017650","seq":17650,"type":"__pollDeferred","startedAt":1777398283235,"completedAt":1777398283273,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":20002,"idleMs":20002}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017649.json -----
{"protocolVersion":2,"id":"cmd_000000017649","seq":17649,"type":"__pollDeferred","startedAt":1777398282739,"completedAt":1777398282810,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":19525,"idleMs":19525}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017648.json -----
{"protocolVersion":2,"id":"cmd_000000017648","seq":17648,"type":"__pollDeferred","startedAt":1777398282330,"completedAt":1777398282370,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":19097,"idleMs":19097}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017647.json -----
{"protocolVersion":2,"id":"cmd_000000017647","seq":17647,"type":"__pollDeferred","startedAt":1777398281938,"completedAt":1777398281985,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":18711,"idleMs":18711}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017646.json -----
{"protocolVersion":2,"id":"cmd_000000017646","seq":17646,"type":"__pollDeferred","startedAt":1777398281434,"completedAt":1777398281474,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":18202,"idleMs":18202}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017645.json -----
{"protocolVersion":2,"id":"cmd_000000017645","seq":17645,"type":"__pollDeferred","startedAt":1777398281032,"completedAt":1777398281072,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":17799,"idleMs":17799}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017644.json -----
{"protocolVersion":2,"id":"cmd_000000017644","seq":17644,"type":"__pollDeferred","startedAt":1777398280632,"completedAt":1777398280671,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":17399,"idleMs":17399}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017643.json -----
{"protocolVersion":2,"id":"cmd_000000017643","seq":17643,"type":"__pollDeferred","startedAt":1777398280232,"completedAt":1777398280272,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":17000,"idleMs":17000}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017642.json -----
{"protocolVersion":2,"id":"cmd_000000017642","seq":17642,"type":"__pollDeferred","startedAt":1777398279829,"completedAt":1777398279867,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":16597,"idleMs":16597}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017641.json -----
{"protocolVersion":2,"id":"cmd_000000017641","seq":17641,"type":"__pollDeferred","startedAt":1777398279337,"completedAt":1777398279389,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":16112,"idleMs":16112}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017640.json -----
{"protocolVersion":2,"id":"cmd_000000017640","seq":17640,"type":"__pollDeferred","startedAt":1777398278933,"completedAt":1777398278974,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":15701,"idleMs":15701}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017639.json -----
{"protocolVersion":2,"id":"cmd_000000017639","seq":17639,"type":"__pollDeferred","startedAt":1777398278535,"completedAt":1777398278575,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":15303,"idleMs":15303}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017638.json -----
{"protocolVersion":2,"id":"cmd_000000017638","seq":17638,"type":"__pollDeferred","startedAt":1777398278034,"completedAt":1777398278075,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":14802,"idleMs":14802}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017637.json -----
{"protocolVersion":2,"id":"cmd_000000017637","seq":17637,"type":"__pollDeferred","startedAt":1777398277630,"completedAt":1777398277672,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":14399,"idleMs":14399}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017636.json -----
{"protocolVersion":2,"id":"cmd_000000017636","seq":17636,"type":"__pollDeferred","startedAt":1777398277233,"completedAt":1777398277272,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":14001,"idleMs":14001}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017635.json -----
{"protocolVersion":2,"id":"cmd_000000017635","seq":17635,"type":"__pollDeferred","startedAt":1777398276735,"completedAt":1777398276779,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":13506,"idleMs":13506}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017634.json -----
{"protocolVersion":2,"id":"cmd_000000017634","seq":17634,"type":"__pollDeferred","startedAt":1777398276239,"completedAt":1777398276288,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":13014,"idleMs":13014}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017633.json -----
{"protocolVersion":2,"id":"cmd_000000017633","seq":17633,"type":"__pollDeferred","startedAt":1777398275765,"completedAt":1777398275863,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":12573,"idleMs":12573}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017632.json -----
{"protocolVersion":2,"id":"cmd_000000017632","seq":17632,"type":"__pollDeferred","startedAt":1777398275231,"completedAt":1777398275270,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":11998,"idleMs":11998}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017631.json -----
{"protocolVersion":2,"id":"cmd_000000017631","seq":17631,"type":"__pollDeferred","startedAt":1777398274782,"completedAt":1777398274847,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":11565,"idleMs":11565}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017630.json -----
{"protocolVersion":2,"id":"cmd_000000017630","seq":17630,"type":"__pollDeferred","startedAt":1777398274302,"completedAt":1777398274404,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":11083,"idleMs":11083}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017629.json -----
{"protocolVersion":2,"id":"cmd_000000017629","seq":17629,"type":"__pollDeferred","startedAt":1777398273748,"completedAt":1777398273808,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":10528,"idleMs":10528}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017628.json -----
{"protocolVersion":2,"id":"cmd_000000017628","seq":17628,"type":"__pollDeferred","startedAt":1777398273334,"completedAt":1777398273380,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":10103,"idleMs":10103}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017627.json -----
{"protocolVersion":2,"id":"cmd_000000017627","seq":17627,"type":"__pollDeferred","startedAt":1777398272936,"completedAt":1777398272976,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":9703,"idleMs":9703}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017626.json -----
{"protocolVersion":2,"id":"cmd_000000017626","seq":17626,"type":"__pollDeferred","startedAt":1777398272533,"completedAt":1777398272573,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":9301,"idleMs":9301}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017625.json -----
{"protocolVersion":2,"id":"cmd_000000017625","seq":17625,"type":"__pollDeferred","startedAt":1777398272138,"completedAt":1777398272187,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":8911,"idleMs":8911}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017624.json -----
{"protocolVersion":2,"id":"cmd_000000017624","seq":17624,"type":"__pollDeferred","startedAt":1777398271631,"completedAt":1777398271671,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":8398,"idleMs":8398}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017623.json -----
{"protocolVersion":2,"id":"cmd_000000017623","seq":17623,"type":"__pollDeferred","startedAt":1777398271234,"completedAt":1777398271273,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":8001,"idleMs":8001}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017622.json -----
{"protocolVersion":2,"id":"cmd_000000017622","seq":17622,"type":"__pollDeferred","startedAt":1777398270833,"completedAt":1777398270872,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":7600,"idleMs":7600}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017621.json -----
{"protocolVersion":2,"id":"cmd_000000017621","seq":17621,"type":"__pollDeferred","startedAt":1777398270433,"completedAt":1777398270473,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":7201,"idleMs":7201}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017620.json -----
{"protocolVersion":2,"id":"cmd_000000017620","seq":17620,"type":"__pollDeferred","startedAt":1777398270032,"completedAt":1777398270071,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":6799,"idleMs":6799}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017619.json -----
{"protocolVersion":2,"id":"cmd_000000017619","seq":17619,"type":"__pollDeferred","startedAt":1777398269629,"completedAt":1777398269668,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":6396,"idleMs":6396}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017618.json -----
{"protocolVersion":2,"id":"cmd_000000017618","seq":17618,"type":"__pollDeferred","startedAt":1777398269233,"completedAt":1777398269272,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":6000,"idleMs":6000}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017617.json -----
{"protocolVersion":2,"id":"cmd_000000017617","seq":17617,"type":"__pollDeferred","startedAt":1777398268835,"completedAt":1777398268870,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":5600,"idleMs":5600}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017616.json -----
{"protocolVersion":2,"id":"cmd_000000017616","seq":17616,"type":"__pollDeferred","startedAt":1777398268434,"completedAt":1777398268473,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":5202,"idleMs":5202}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017615.json -----
{"protocolVersion":2,"id":"cmd_000000017615","seq":17615,"type":"__pollDeferred","startedAt":1777398268035,"completedAt":1777398268074,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":4802,"idleMs":4802}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017614.json -----
{"protocolVersion":2,"id":"cmd_000000017614","seq":17614,"type":"__pollDeferred","startedAt":1777398267628,"completedAt":1777398267666,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":4394,"idleMs":4394}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017613.json -----
{"protocolVersion":2,"id":"cmd_000000017613","seq":17613,"type":"__pollDeferred","startedAt":1777398267232,"completedAt":1777398267271,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":3999,"idleMs":3999}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017612.json -----
{"protocolVersion":2,"id":"cmd_000000017612","seq":17612,"type":"__pollDeferred","startedAt":1777398266834,"completedAt":1777398266878,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":3604,"idleMs":3604}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017611.json -----
{"protocolVersion":2,"id":"cmd_000000017611","seq":17611,"type":"__pollDeferred","startedAt":1777398266434,"completedAt":1777398266473,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":3201,"idleMs":3201}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017610.json -----
{"protocolVersion":2,"id":"cmd_000000017610","seq":17610,"type":"__pollDeferred","startedAt":1777398266027,"completedAt":1777398266065,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":2794,"idleMs":2794}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017609.json -----
{"protocolVersion":2,"id":"cmd_000000017609","seq":17609,"type":"__pollDeferred","startedAt":1777398265631,"completedAt":1777398265669,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":2398,"idleMs":2398}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017608.json -----
{"protocolVersion":2,"id":"cmd_000000017608","seq":17608,"type":"__pollDeferred","startedAt":1777398265238,"completedAt":1777398265277,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":2005,"idleMs":2005}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017607.json -----
{"protocolVersion":2,"id":"cmd_000000017607","seq":17607,"type":"__pollDeferred","startedAt":1777398264832,"completedAt":1777398264870,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":1598,"idleMs":1598}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017606.json -----
{"protocolVersion":2,"id":"cmd_000000017606","seq":17606,"type":"__pollDeferred","startedAt":1777398264433,"completedAt":1777398264472,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":1200,"idleMs":1200}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017605.json -----
{"protocolVersion":2,"id":"cmd_000000017605","seq":17605,"type":"__pollDeferred","startedAt":1777398263930,"completedAt":1777398263969,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":697,"idleMs":697}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017604.json -----
{"protocolVersion":2,"id":"cmd_000000017604","seq":17604,"type":"__pollDeferred","startedAt":1777398263530,"completedAt":1777398263573,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777398263257,"ageMs":299,"idleMs":299}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017603.json -----
{"protocolVersion":2,"id":"cmd_000000017603","seq":17603,"type":"terminal.plan.run","startedAt":1777398263225,"completedAt":1777398263383,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-3958e5f0","job":{"id":"cmd-3958e5f0","kind":"ios-session","version":1,"device":"SW-SRV-DIST","plan":[{"type":"command","kind":"command","value":"show version","command":"show version","allowPager":true,"allowConfirm":false,"optional":false,"timeoutMs":12000,"options":{"timeoutMs":12000},"metadata":{}}],"options":{"stopOnError":true,"commandTimeoutMs":12000,"stallTimeoutMs":15000},"payload":{"source":"terminal.plan.run","metadata":{"deviceKind":"ios","source":"pt-control.terminal-plan-builder","lineCount":1},"policies":{"autoBreakWizard":true,"autoAdvancePager":true,"maxPagerAdvances":80,"maxConfirmations":0,"abortOnPromptMismatch":false,"abortOnModeMismatch":true}}}}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017600.json -----
{"protocolVersion":2,"id":"cmd_000000017600","seq":17600,"type":"__pollDeferred","startedAt":1777398015930,"completedAt":1777398016004,"status":"failed","ok":false,"value":{"done":true,"ok":false,"status":1,"result":null,"error":"Job timed out while waiting for terminal command completion","code":"JOB_TIMEOUT","errorCode":"JOB_TIMEOUT","raw":"","output":"","source":"terminal","session":{"mode":"unknown","prompt":"","paging":false,"awaitingConfirm":false}},"error":{"code":"JOB_TIMEOUT","message":"Job timed out while waiting for terminal command completion","phase":"execution"}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017599.json -----
{"protocolVersion":2,"id":"cmd_000000017599","seq":17599,"type":"__pollDeferred","startedAt":1777398015522,"completedAt":1777398015566,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":28933,"idleMs":28933}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017598.json -----
{"protocolVersion":2,"id":"cmd_000000017598","seq":17598,"type":"__pollDeferred","startedAt":1777398015025,"completedAt":1777398015076,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":28440,"idleMs":28440}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017597.json -----
{"protocolVersion":2,"id":"cmd_000000017597","seq":17597,"type":"__pollDeferred","startedAt":1777398014619,"completedAt":1777398014661,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":28028,"idleMs":28028}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017596.json -----
{"protocolVersion":2,"id":"cmd_000000017596","seq":17596,"type":"__pollDeferred","startedAt":1777398014222,"completedAt":1777398014259,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":27629,"idleMs":27629}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017595.json -----
{"protocolVersion":2,"id":"cmd_000000017595","seq":17595,"type":"__pollDeferred","startedAt":1777398013724,"completedAt":1777398013770,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":27137,"idleMs":27137}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017594.json -----
{"protocolVersion":2,"id":"cmd_000000017594","seq":17594,"type":"__pollDeferred","startedAt":1777398013243,"completedAt":1777398013322,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":26679,"idleMs":26679}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017593.json -----
{"protocolVersion":2,"id":"cmd_000000017593","seq":17593,"type":"__pollDeferred","startedAt":1777398012819,"completedAt":1777398012857,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":26227,"idleMs":26227}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017592.json -----
{"protocolVersion":2,"id":"cmd_000000017592","seq":17592,"type":"__pollDeferred","startedAt":1777398012419,"completedAt":1777398012457,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":25826,"idleMs":25826}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017591.json -----
{"protocolVersion":2,"id":"cmd_000000017591","seq":17591,"type":"__pollDeferred","startedAt":1777398012019,"completedAt":1777398012057,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":25426,"idleMs":25426}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017590.json -----
{"protocolVersion":2,"id":"cmd_000000017590","seq":17590,"type":"__pollDeferred","startedAt":1777398011615,"completedAt":1777398011653,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":25022,"idleMs":25022}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017589.json -----
{"protocolVersion":2,"id":"cmd_000000017589","seq":17589,"type":"__pollDeferred","startedAt":1777398011216,"completedAt":1777398011256,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":24623,"idleMs":24623}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017588.json -----
{"protocolVersion":2,"id":"cmd_000000017588","seq":17588,"type":"__pollDeferred","startedAt":1777398010813,"completedAt":1777398010852,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":24221,"idleMs":24221}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017587.json -----
{"protocolVersion":2,"id":"cmd_000000017587","seq":17587,"type":"__pollDeferred","startedAt":1777398010419,"completedAt":1777398010456,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":23826,"idleMs":23826}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017586.json -----
{"protocolVersion":2,"id":"cmd_000000017586","seq":17586,"type":"__pollDeferred","startedAt":1777398010017,"completedAt":1777398010054,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":23424,"idleMs":23424}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017585.json -----
{"protocolVersion":2,"id":"cmd_000000017585","seq":17585,"type":"__pollDeferred","startedAt":1777398009518,"completedAt":1777398009562,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":22929,"idleMs":22929}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017584.json -----
{"protocolVersion":2,"id":"cmd_000000017584","seq":17584,"type":"__pollDeferred","startedAt":1777398009121,"completedAt":1777398009163,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":22531,"idleMs":22531}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017583.json -----
{"protocolVersion":2,"id":"cmd_000000017583","seq":17583,"type":"__pollDeferred","startedAt":1777398008625,"completedAt":1777398008667,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":22036,"idleMs":22036}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017582.json -----
{"protocolVersion":2,"id":"cmd_000000017582","seq":17582,"type":"__pollDeferred","startedAt":1777398008118,"completedAt":1777398008158,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":21527,"idleMs":21527}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017581.json -----
{"protocolVersion":2,"id":"cmd_000000017581","seq":17581,"type":"__pollDeferred","startedAt":1777398007620,"completedAt":1777398007667,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":21032,"idleMs":21032}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017580.json -----
{"protocolVersion":2,"id":"cmd_000000017580","seq":17580,"type":"__pollDeferred","startedAt":1777398007125,"completedAt":1777398007187,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":20548,"idleMs":20548}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017579.json -----
{"protocolVersion":2,"id":"cmd_000000017579","seq":17579,"type":"__pollDeferred","startedAt":1777398006641,"completedAt":1777398006712,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":20070,"idleMs":20070}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017578.json -----
{"protocolVersion":2,"id":"cmd_000000017578","seq":17578,"type":"__pollDeferred","startedAt":1777398006118,"completedAt":1777398006180,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":19539,"idleMs":19539}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017577.json -----
{"protocolVersion":2,"id":"cmd_000000017577","seq":17577,"type":"__pollDeferred","startedAt":1777398005295,"completedAt":1777398005607,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":18832,"idleMs":18832}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017576.json -----
{"protocolVersion":2,"id":"cmd_000000017576","seq":17576,"type":"__pollDeferred","startedAt":1777398004715,"completedAt":1777398004864,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":18130,"idleMs":18130}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017575.json -----
{"protocolVersion":2,"id":"cmd_000000017575","seq":17575,"type":"__pollDeferred","startedAt":1777398004311,"completedAt":1777398004349,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":17718,"idleMs":17718}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017574.json -----
{"protocolVersion":2,"id":"cmd_000000017574","seq":17574,"type":"__pollDeferred","startedAt":1777398003908,"completedAt":1777398003944,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":17315,"idleMs":17315}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017573.json -----
{"protocolVersion":2,"id":"cmd_000000017573","seq":17573,"type":"__pollDeferred","startedAt":1777398003408,"completedAt":1777398003446,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":16816,"idleMs":16816}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017572.json -----
{"protocolVersion":2,"id":"cmd_000000017572","seq":17572,"type":"__pollDeferred","startedAt":1777398002922,"completedAt":1777398003009,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":16357,"idleMs":16357}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017571.json -----
{"protocolVersion":2,"id":"cmd_000000017571","seq":17571,"type":"__pollDeferred","startedAt":1777398002410,"completedAt":1777398002448,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":15818,"idleMs":15818}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017570.json -----
{"protocolVersion":2,"id":"cmd_000000017570","seq":17570,"type":"__pollDeferred","startedAt":1777398002004,"completedAt":1777398002041,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":15411,"idleMs":15411}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017569.json -----
{"protocolVersion":2,"id":"cmd_000000017569","seq":17569,"type":"__pollDeferred","startedAt":1777398001608,"completedAt":1777398001645,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":15015,"idleMs":15015}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017568.json -----
{"protocolVersion":2,"id":"cmd_000000017568","seq":17568,"type":"__pollDeferred","startedAt":1777398001206,"completedAt":1777398001243,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":14613,"idleMs":14613}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017567.json -----
{"protocolVersion":2,"id":"cmd_000000017567","seq":17567,"type":"__pollDeferred","startedAt":1777398000806,"completedAt":1777398000843,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":14213,"idleMs":14213}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017566.json -----
{"protocolVersion":2,"id":"cmd_000000017566","seq":17566,"type":"__pollDeferred","startedAt":1777398000405,"completedAt":1777398000442,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":13812,"idleMs":13812}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017565.json -----
{"protocolVersion":2,"id":"cmd_000000017565","seq":17565,"type":"__pollDeferred","startedAt":1777398000004,"completedAt":1777398000042,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":13411,"idleMs":13411}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017564.json -----
{"protocolVersion":2,"id":"cmd_000000017564","seq":17564,"type":"__pollDeferred","startedAt":1777397999604,"completedAt":1777397999641,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":13011,"idleMs":13011}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017563.json -----
{"protocolVersion":2,"id":"cmd_000000017563","seq":17563,"type":"__pollDeferred","startedAt":1777397999204,"completedAt":1777397999241,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":12611,"idleMs":12611}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017562.json -----
{"protocolVersion":2,"id":"cmd_000000017562","seq":17562,"type":"__pollDeferred","startedAt":1777397998804,"completedAt":1777397998841,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":12211,"idleMs":12211}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017561.json -----
{"protocolVersion":2,"id":"cmd_000000017561","seq":17561,"type":"__pollDeferred","startedAt":1777397998404,"completedAt":1777397998441,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":11810,"idleMs":11810}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017560.json -----
{"protocolVersion":2,"id":"cmd_000000017560","seq":17560,"type":"__pollDeferred","startedAt":1777397997999,"completedAt":1777397998035,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":11406,"idleMs":11406}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017559.json -----
{"protocolVersion":2,"id":"cmd_000000017559","seq":17559,"type":"__pollDeferred","startedAt":1777397997599,"completedAt":1777397997635,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":11005,"idleMs":11005}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017558.json -----
{"protocolVersion":2,"id":"cmd_000000017558","seq":17558,"type":"__pollDeferred","startedAt":1777397997201,"completedAt":1777397997240,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":10608,"idleMs":10608}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017557.json -----
{"protocolVersion":2,"id":"cmd_000000017557","seq":17557,"type":"__pollDeferred","startedAt":1777397996803,"completedAt":1777397996840,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":10210,"idleMs":10210}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017556.json -----
{"protocolVersion":2,"id":"cmd_000000017556","seq":17556,"type":"__pollDeferred","startedAt":1777397996404,"completedAt":1777397996440,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":9810,"idleMs":9810}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017555.json -----
{"protocolVersion":2,"id":"cmd_000000017555","seq":17555,"type":"__pollDeferred","startedAt":1777397996002,"completedAt":1777397996039,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":9409,"idleMs":9409}}
----- /Users/andresgaibor/pt-dev/results/cmd_000000017554.json -----
{"protocolVersion":2,"id":"cmd_000000017554","seq":17554,"type":"__pollDeferred","startedAt":1777397995599,"completedAt":1777397995635,"status":"completed","ok":true,"value":{"ok":true,"deferred":true,"ticket":"cmd-9e62cb92","done":false,"state":"waiting-command","currentStep":0,"totalSteps":1,"stepType":"command","stepValue":"show version","outputTail":"","lastPrompt":"","lastMode":"unknown","waitingForCommandEnd":true,"updatedAt":1777397986616,"ageMs":9005,"idleMs":9005}}```

## logs relevantes
```
{"seq":37102,"timestamp":"2026-04-28T17:44:40.214Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017643-__pollDeferred.json\"]","level":"debug"}
{"seq":37103,"timestamp":"2026-04-28T17:44:40.218Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017643-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37104,"timestamp":"2026-04-28T17:44:40.224Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017643-__pollDeferred.json","level":"debug"}
{"seq":37106,"timestamp":"2026-04-28T17:44:40.232Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017643 type=__pollDeferred","level":"info"}
{"seq":37116,"timestamp":"2026-04-28T17:44:40.614Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017644-__pollDeferred.json\"]","level":"debug"}
{"seq":37117,"timestamp":"2026-04-28T17:44:40.618Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017644-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37118,"timestamp":"2026-04-28T17:44:40.623Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017644-__pollDeferred.json","level":"debug"}
{"seq":37120,"timestamp":"2026-04-28T17:44:40.632Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017644 type=__pollDeferred","level":"info"}
{"seq":37130,"timestamp":"2026-04-28T17:44:41.014Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017645-__pollDeferred.json\"]","level":"debug"}
{"seq":37131,"timestamp":"2026-04-28T17:44:41.018Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017645-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37132,"timestamp":"2026-04-28T17:44:41.024Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017645-__pollDeferred.json","level":"debug"}
{"seq":37134,"timestamp":"2026-04-28T17:44:41.032Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017645 type=__pollDeferred","level":"info"}
{"seq":37144,"timestamp":"2026-04-28T17:44:41.416Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017646-__pollDeferred.json\"]","level":"debug"}
{"seq":37145,"timestamp":"2026-04-28T17:44:41.420Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017646-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37146,"timestamp":"2026-04-28T17:44:41.426Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017646-__pollDeferred.json","level":"debug"}
{"seq":37148,"timestamp":"2026-04-28T17:44:41.434Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017646 type=__pollDeferred","level":"info"}
{"seq":37160,"timestamp":"2026-04-28T17:44:41.917Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017647-__pollDeferred.json\"]","level":"debug"}
{"seq":37161,"timestamp":"2026-04-28T17:44:41.922Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017647-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37162,"timestamp":"2026-04-28T17:44:41.927Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017647-__pollDeferred.json","level":"debug"}
{"seq":37164,"timestamp":"2026-04-28T17:44:41.938Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017647 type=__pollDeferred","level":"info"}
{"seq":37174,"timestamp":"2026-04-28T17:44:42.311Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017648-__pollDeferred.json\"]","level":"debug"}
{"seq":37175,"timestamp":"2026-04-28T17:44:42.316Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017648-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37176,"timestamp":"2026-04-28T17:44:42.321Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017648-__pollDeferred.json","level":"debug"}
{"seq":37178,"timestamp":"2026-04-28T17:44:42.330Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017648 type=__pollDeferred","level":"info"}
{"seq":37188,"timestamp":"2026-04-28T17:44:42.712Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017649-__pollDeferred.json\"]","level":"debug"}
{"seq":37189,"timestamp":"2026-04-28T17:44:42.718Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017649-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37190,"timestamp":"2026-04-28T17:44:42.726Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017649-__pollDeferred.json","level":"debug"}
{"seq":37192,"timestamp":"2026-04-28T17:44:42.739Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017649 type=__pollDeferred","level":"info"}
{"seq":37204,"timestamp":"2026-04-28T17:44:43.216Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017650-__pollDeferred.json\"]","level":"debug"}
{"seq":37205,"timestamp":"2026-04-28T17:44:43.221Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017650-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37206,"timestamp":"2026-04-28T17:44:43.225Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017650-__pollDeferred.json","level":"debug"}
{"seq":37208,"timestamp":"2026-04-28T17:44:43.235Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017650 type=__pollDeferred","level":"info"}
{"seq":37218,"timestamp":"2026-04-28T17:44:43.616Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017651-__pollDeferred.json\"]","level":"debug"}
{"seq":37219,"timestamp":"2026-04-28T17:44:43.620Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017651-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37220,"timestamp":"2026-04-28T17:44:43.626Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017651-__pollDeferred.json","level":"debug"}
{"seq":37222,"timestamp":"2026-04-28T17:44:43.634Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017651 type=__pollDeferred","level":"info"}
{"seq":37232,"timestamp":"2026-04-28T17:44:44.013Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017652-__pollDeferred.json\"]","level":"debug"}
{"seq":37233,"timestamp":"2026-04-28T17:44:44.017Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017652-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37234,"timestamp":"2026-04-28T17:44:44.022Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017652-__pollDeferred.json","level":"debug"}
{"seq":37236,"timestamp":"2026-04-28T17:44:44.032Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017652 type=__pollDeferred","level":"info"}
{"seq":37246,"timestamp":"2026-04-28T17:44:44.415Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017653-__pollDeferred.json\"]","level":"debug"}
{"seq":37247,"timestamp":"2026-04-28T17:44:44.419Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017653-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37248,"timestamp":"2026-04-28T17:44:44.424Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017653-__pollDeferred.json","level":"debug"}
{"seq":37250,"timestamp":"2026-04-28T17:44:44.433Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017653 type=__pollDeferred","level":"info"}
{"seq":37260,"timestamp":"2026-04-28T17:44:44.817Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017654-__pollDeferred.json\"]","level":"debug"}
{"seq":37261,"timestamp":"2026-04-28T17:44:44.821Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017654-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37262,"timestamp":"2026-04-28T17:44:44.825Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017654-__pollDeferred.json","level":"debug"}
{"seq":37264,"timestamp":"2026-04-28T17:44:44.835Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017654 type=__pollDeferred","level":"info"}
{"seq":37274,"timestamp":"2026-04-28T17:44:45.215Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017655-__pollDeferred.json\"]","level":"debug"}
{"seq":37275,"timestamp":"2026-04-28T17:44:45.221Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017655-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37276,"timestamp":"2026-04-28T17:44:45.225Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017655-__pollDeferred.json","level":"debug"}
{"seq":37278,"timestamp":"2026-04-28T17:44:45.233Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017655 type=__pollDeferred","level":"info"}
{"seq":37288,"timestamp":"2026-04-28T17:44:45.618Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017656-__pollDeferred.json\"]","level":"debug"}
{"seq":37289,"timestamp":"2026-04-28T17:44:45.622Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017656-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37290,"timestamp":"2026-04-28T17:44:45.626Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017656-__pollDeferred.json","level":"debug"}
{"seq":37292,"timestamp":"2026-04-28T17:44:45.636Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017656 type=__pollDeferred","level":"info"}
{"seq":37302,"timestamp":"2026-04-28T17:44:46.016Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017657-__pollDeferred.json\"]","level":"debug"}
{"seq":37303,"timestamp":"2026-04-28T17:44:46.021Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017657-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37304,"timestamp":"2026-04-28T17:44:46.025Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017657-__pollDeferred.json","level":"debug"}
{"seq":37306,"timestamp":"2026-04-28T17:44:46.034Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017657 type=__pollDeferred","level":"info"}
{"seq":37316,"timestamp":"2026-04-28T17:44:46.416Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017658-__pollDeferred.json\"]","level":"debug"}
{"seq":37317,"timestamp":"2026-04-28T17:44:46.420Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017658-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37318,"timestamp":"2026-04-28T17:44:46.424Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017658-__pollDeferred.json","level":"debug"}
{"seq":37320,"timestamp":"2026-04-28T17:44:46.434Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017658 type=__pollDeferred","level":"info"}
{"seq":37330,"timestamp":"2026-04-28T17:44:46.814Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017659-__pollDeferred.json\"]","level":"debug"}
{"seq":37331,"timestamp":"2026-04-28T17:44:46.819Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017659-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37332,"timestamp":"2026-04-28T17:44:46.823Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017659-__pollDeferred.json","level":"debug"}
{"seq":37334,"timestamp":"2026-04-28T17:44:46.832Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017659 type=__pollDeferred","level":"info"}
{"seq":37344,"timestamp":"2026-04-28T17:44:47.213Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017660-__pollDeferred.json\"]","level":"debug"}
{"seq":37345,"timestamp":"2026-04-28T17:44:47.217Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017660-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37346,"timestamp":"2026-04-28T17:44:47.221Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017660-__pollDeferred.json","level":"debug"}
{"seq":37348,"timestamp":"2026-04-28T17:44:47.231Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017660 type=__pollDeferred","level":"info"}
{"seq":37358,"timestamp":"2026-04-28T17:44:47.616Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017661-__pollDeferred.json\"]","level":"debug"}
{"seq":37359,"timestamp":"2026-04-28T17:44:47.622Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017661-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37360,"timestamp":"2026-04-28T17:44:47.626Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017661-__pollDeferred.json","level":"debug"}
{"seq":37362,"timestamp":"2026-04-28T17:44:47.635Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017661 type=__pollDeferred","level":"info"}
{"seq":37374,"timestamp":"2026-04-28T17:44:48.115Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017662-__pollDeferred.json\"]","level":"debug"}
{"seq":37375,"timestamp":"2026-04-28T17:44:48.119Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017662-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37376,"timestamp":"2026-04-28T17:44:48.125Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017662-__pollDeferred.json","level":"debug"}
{"seq":37378,"timestamp":"2026-04-28T17:44:48.133Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017662 type=__pollDeferred","level":"info"}
{"seq":37390,"timestamp":"2026-04-28T17:44:48.615Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017663-__pollDeferred.json\"]","level":"debug"}
{"seq":37391,"timestamp":"2026-04-28T17:44:48.619Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017663-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37392,"timestamp":"2026-04-28T17:44:48.623Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017663-__pollDeferred.json","level":"debug"}
{"seq":37394,"timestamp":"2026-04-28T17:44:48.633Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017663 type=__pollDeferred","level":"info"}
{"seq":37404,"timestamp":"2026-04-28T17:44:49.015Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017664-__pollDeferred.json\"]","level":"debug"}
{"seq":37405,"timestamp":"2026-04-28T17:44:49.021Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017664-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37406,"timestamp":"2026-04-28T17:44:49.025Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017664-__pollDeferred.json","level":"debug"}
{"seq":37408,"timestamp":"2026-04-28T17:44:49.033Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017664 type=__pollDeferred","level":"info"}
{"seq":37418,"timestamp":"2026-04-28T17:44:49.418Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017665-__pollDeferred.json\"]","level":"debug"}
{"seq":37419,"timestamp":"2026-04-28T17:44:49.422Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017665-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37420,"timestamp":"2026-04-28T17:44:49.426Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017665-__pollDeferred.json","level":"debug"}
{"seq":37422,"timestamp":"2026-04-28T17:44:49.436Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017665 type=__pollDeferred","level":"info"}
{"seq":37434,"timestamp":"2026-04-28T17:44:49.912Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017666-__pollDeferred.json\"]","level":"debug"}
{"seq":37435,"timestamp":"2026-04-28T17:44:49.916Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017666-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37436,"timestamp":"2026-04-28T17:44:49.921Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017666-__pollDeferred.json","level":"debug"}
{"seq":37438,"timestamp":"2026-04-28T17:44:49.930Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017666 type=__pollDeferred","level":"info"}
{"seq":37448,"timestamp":"2026-04-28T17:44:50.313Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017667-__pollDeferred.json\"]","level":"debug"}
{"seq":37449,"timestamp":"2026-04-28T17:44:50.317Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017667-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37450,"timestamp":"2026-04-28T17:44:50.323Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017667-__pollDeferred.json","level":"debug"}
{"seq":37452,"timestamp":"2026-04-28T17:44:50.331Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017667 type=__pollDeferred","level":"info"}
{"seq":37462,"timestamp":"2026-04-28T17:44:50.713Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017668-__pollDeferred.json\"]","level":"debug"}
{"seq":37463,"timestamp":"2026-04-28T17:44:50.718Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017668-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37464,"timestamp":"2026-04-28T17:44:50.723Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017668-__pollDeferred.json","level":"debug"}
{"seq":37466,"timestamp":"2026-04-28T17:44:50.731Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017668 type=__pollDeferred","level":"info"}
{"seq":37476,"timestamp":"2026-04-28T17:44:51.114Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017669-__pollDeferred.json\"]","level":"debug"}
{"seq":37477,"timestamp":"2026-04-28T17:44:51.118Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017669-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37478,"timestamp":"2026-04-28T17:44:51.124Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017669-__pollDeferred.json","level":"debug"}
{"seq":37480,"timestamp":"2026-04-28T17:44:51.132Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017669 type=__pollDeferred","level":"info"}
{"seq":37490,"timestamp":"2026-04-28T17:44:51.514Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017670-__pollDeferred.json\"]","level":"debug"}
{"seq":37491,"timestamp":"2026-04-28T17:44:51.519Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017670-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37492,"timestamp":"2026-04-28T17:44:51.524Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017670-__pollDeferred.json","level":"debug"}
{"seq":37494,"timestamp":"2026-04-28T17:44:51.532Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017670 type=__pollDeferred","level":"info"}
{"seq":37506,"timestamp":"2026-04-28T17:44:52.018Z","scope":"queue","message":"[queue-claim] control candidatos: 1 [\"000000017671-__pollDeferred.json\"]","level":"debug"}
{"seq":37507,"timestamp":"2026-04-28T17:44:52.022Z","scope":"queue","message":"[queue-claim] control claim permitido: 000000017671-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37508,"timestamp":"2026-04-28T17:44:52.026Z","scope":"queue","message":"[queue-claim] claim desde commands: 000000017671-__pollDeferred.json","level":"debug"}
{"seq":37510,"timestamp":"2026-04-28T17:44:52.036Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017671 type=__pollDeferred","level":"info"}
{"seq":37522,"timestamp":"2026-04-28T17:44:52.515Z","scope":"queue","message":"[queue-claim] candidatos: 1 [\"000000017672-__pollDeferred.json\"]","level":"debug"}
{"seq":37523,"timestamp":"2026-04-28T17:44:52.519Z","scope":"queue","message":"[queue-claim] claim nuevo: 000000017672-__pollDeferred.json modo=atomic-move","level":"debug"}
{"seq":37524,"timestamp":"2026-04-28T17:44:52.524Z","scope":"queue","message":"[queue-claim] parseado OK: 000000017672-__pollDeferred.json tipo=__pollDeferred","level":"debug"}
{"seq":37525,"timestamp":"2026-04-28T17:44:52.528Z","scope":"kernel","message":">>> DISPATCH: cmd_000000017672 type=__pollDeferred","level":"info"}
```
