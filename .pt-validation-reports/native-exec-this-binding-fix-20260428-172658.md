# native exec this binding fix

Fecha: Tue Apr 28 17:26:58 -05 2026

## grep safeCallString
```
41-  if (suffix.length > text.length) return false;
42-  return text.slice(text.length - suffix.length) === suffix;
43-}
44-
45:function safeCallString(target: unknown, method: string): string {
46-  try {
47-    const maybe = target as Record<string, unknown> | null | undefined;
48-
49-    if (!maybe || typeof maybe[method] !== "function") {
50-      return "";
51-    }
52-
53-    // Conserva el receiver nativo para objetos QtScript/Packet Tracer.
54-    const value = (maybe[method] as () => unknown).call(maybe);
55-
56-    return String(value == null ? "" : value);
57-  } catch {}
58-
59-  return "";
60-}
61-
62-function getTerminal(api: RuntimeApi, deviceName: string): PTTerminal | null {
63-  try {
64-    const ipc = (api as any).ipc;
65-    if (!ipc) return null;
66-    const net = typeof ipc.network === "function" ? ipc.network() : null;
67-    const device = net && typeof net.getDevice === "function" ? net.getDevice(deviceName) : null;
```

## tests
```
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
[0m[1mbun test [0m[2mv1.3.10 (30e609e0)[0m
```

## generate deploy
```
Generated: dist-qtscript/
Deployed to: /Users/andresgaibor/pt-dev
```

## wake terminal
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }
try { t.enterChar(13,0); } catch(e) {}
pause(300);
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }
try { t.enterChar(13,0); } catch(e) {}
pause(300);
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 411,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nfunction pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }\ntry { t.enterChar(13,0); } catch(e) {}\npause(300);\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"mulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\n --More-- \"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018705",
      "seq": 18705,
      "type": "omni.evaluate.raw",
      "startedAt": 1777415230258,
      "completedAt": 1777415230685,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"mulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\n --More-- \"}"
      },
      "timings": {
        "sentAt": 1777415230219,
        "resultSeenAt": 1777415230702,
        "receivedAt": 1777415230702,
        "waitMs": 483,
        "completedAtMs": 1777415230685
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.6s
```


## show running-config attempt 1
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
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
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal quedó en prompt SW-SRV-DIST>"
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 3.0s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### terminal state after attempt 1
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"rboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\n\\nSW-SRV-DIST>nable\\nTranslating \\\"nable\\\"\\n% Unknown command or computer name, or unable to find computer address\\n\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018708",
      "seq": 18708,
      "type": "omni.evaluate.raw",
      "startedAt": 1777415236045,
      "completedAt": 1777415236395,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"rboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\n\\nSW-SRV-DIST>nable\\nTranslating \\\"nable\\\"\\n% Unknown command or computer name, or unable to find computer address\\n\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777415235924,
        "resultSeenAt": 1777415236454,
        "receivedAt": 1777415236454,
        "waitMs": 530,
        "completedAtMs": 1777415236395
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

## show running-config attempt 2
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show running-config" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show running-config" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show running-config",
  "output": "",
  "rawOutput": "",
  "status": null,
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
⏱ pt cmd · 12.6s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### terminal state after attempt 2
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"rboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\n\\nSW-SRV-DIST>nable\\nTranslating \\\"nable\\\"\\n% Unknown command or computer name, or unable to find computer address\\n\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018711",
      "seq": 18711,
      "type": "omni.evaluate.raw",
      "startedAt": 1777415252536,
      "completedAt": 1777415252687,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"rboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\n\\nSW-SRV-DIST>nable\\nTranslating \\\"nable\\\"\\n% Unknown command or computer name, or unable to find computer address\\n\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777415252370,
        "resultSeenAt": 1777415252736,
        "receivedAt": 1777415252736,
        "waitMs": 366,
        "completedAtMs": 1777415252687
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

## show running-config attempt 3
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
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777415254859,
      "resultSeenAt": 1777415255883,
      "receivedAt": 1777415255883,
      "waitMs": 1024,
      "completedAtMs": 1777415255846
    }
  },
  "timings": {
    "sentAt": 1777415254859,
    "resultSeenAt": 1777415255883,
    "receivedAt": 1777415255883,
    "waitMs": 1024,
    "completedAtMs": 1777415255846
  }
}
⏱ pt cmd · 1.6s
```

### terminal state after attempt 3
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018714",
      "seq": 18714,
      "type": "omni.evaluate.raw",
      "startedAt": 1777415256962,
      "completedAt": 1777415257064,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
      },
      "timings": {
        "sentAt": 1777415256868,
        "resultSeenAt": 1777415257085,
        "receivedAt": 1777415257085,
        "waitMs": 217,
        "completedAtMs": 1777415257064
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

## show running-config attempt 4
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
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777415258290,
      "resultSeenAt": 1777415259179,
      "receivedAt": 1777415259179,
      "waitMs": 889,
      "completedAtMs": 1777415259141
    }
  },
  "timings": {
    "sentAt": 1777415258290,
    "resultSeenAt": 1777415259179,
    "receivedAt": 1777415259179,
    "waitMs": 889,
    "completedAtMs": 1777415259141
  }
}
⏱ pt cmd · 1.2s
```

### terminal state after attempt 4
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018717",
      "seq": 18717,
      "type": "omni.evaluate.raw",
      "startedAt": 1777415260157,
      "completedAt": 1777415260235,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
      },
      "timings": {
        "sentAt": 1777415260068,
        "resultSeenAt": 1777415260248,
        "receivedAt": 1777415260248,
        "waitMs": 180,
        "completedAtMs": 1777415260235
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

## show running-config attempt 5
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
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "warnings": [
    "El comando \"show running-config\" activó paginación"
  ],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777415261306,
      "resultSeenAt": 1777415262192,
      "receivedAt": 1777415262192,
      "waitMs": 886,
      "completedAtMs": 1777415262156
    }
  },
  "timings": {
    "sentAt": 1777415261306,
    "resultSeenAt": 1777415262192,
    "receivedAt": 1777415262192,
    "waitMs": 886,
    "completedAtMs": 1777415262156
  }
}
⏱ pt cmd · 1.2s
```

### terminal state after attempt 5
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
return JSON.stringify({
  prompt: String(t.getPrompt()),
  mode: String(t.getMode()),
  input: String(t.getCommandInput()),
  tail: String(t.getOutput()).slice(-500)
});
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 295,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018720",
      "seq": 18720,
      "type": "omni.evaluate.raw",
      "startedAt": 1777415263267,
      "completedAt": 1777415263349,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
      },
      "timings": {
        "sentAt": 1777415263155,
        "resultSeenAt": 1777415263380,
        "receivedAt": 1777415263380,
        "waitMs": 225,
        "completedAtMs": 1777415263349
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

## show version sanity
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
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "rawOutput": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
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
      "sentAt": 1777415264187,
      "resultSeenAt": 1777415264680,
      "receivedAt": 1777415264680,
      "waitMs": 493,
      "completedAtMs": 1777415264656
    }
  },
  "timings": {
    "sentAt": 1777415264187,
    "resultSeenAt": 1777415264680,
    "receivedAt": 1777415264680,
    "waitMs": 493,
    "completedAtMs": 1777415264656
  }
}
⏱ pt cmd · 0.8s
```

## recent native results
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000018722.json -----
{
  "id": "cmd_000000018722",
  "seq": 18722,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 1,
    "elapsedMs": 374
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018719.json -----
{
  "id": "cmd_000000018719",
  "seq": 18719,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 715
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018716.json -----
{
  "id": "cmd_000000018716",
  "seq": 18716,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 714
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018713.json -----
{
  "id": "cmd_000000018713",
  "seq": 18713,
  "type": "terminal.native.exec",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "status": 0,
  "session": {
    "modeBefore": "privileged-exec",
    "modeAfter": "privileged-exec",
    "promptBefore": "SW-SRV-DIST#",
    "promptAfter": "SW-SRV-DIST#",
    "paging": true,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 0,
    "completionReason": "stable-prompt",
    "pagerAdvances": 5,
    "elapsedMs": 817
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018707.json -----
{
  "id": "cmd_000000018707",
  "seq": 18707,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt SW-SRV-DIST>",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt SW-SRV-DIST>",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "user-exec",
    "promptBefore": "",
    "promptAfter": "SW-SRV-DIST>",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 2181,
    "input": "",
    "tail": "OM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\n\nSW-SRV-DIST>nable\nTranslating \"nable\"\n% Unknown command or computer name, or unable to find computer address\n\nSW-SRV-DIST>"
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018702.json -----
{
  "id": "cmd_000000018702",
  "seq": 18702,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_TIMEOUT",
    "message": "terminal.native.exec no complet\u00f3 show version en 12000ms",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_TIMEOUT",
  "error": "terminal.native.exec no complet\u00f3 show version en 12000ms",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "unknown",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "timeout",
    "pagerAdvances": 0,
    "elapsedMs": 12069,
    "input": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018699.json -----
{
  "id": "cmd_000000018699",
  "seq": 18699,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 9,
    "input": "",
    "tail": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018696.json -----
{
  "id": "cmd_000000018696",
  "seq": 18696,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 8,
    "input": "",
    "tail": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018693.json -----
{
  "id": "cmd_000000018693",
  "seq": 18693,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 15,
    "input": "",
    "tail": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018687.json -----
{
  "id": "cmd_000000018687",
  "seq": 18687,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
    "message": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
    "phase": "execution"
  }
}
{
  "ok": false,
  "code": "NATIVE_EXEC_PRIVILEGE_REQUIRED",
  "error": "El comando show running-config requiere modo privilegiado, pero la terminal qued\u00f3 en prompt ",
  "raw": "",
  "output": "",
  "status": 1,
  "session": {
    "modeBefore": "",
    "modeAfter": "unknown",
    "promptBefore": "",
    "promptAfter": "",
    "paging": false,
    "awaitingConfirm": false,
    "kind": "ios"
  },
  "diagnostics": {
    "statusCode": 1,
    "completionReason": "privilege-required",
    "elapsedMs": 58,
    "input": "",
    "tail": ""
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018684.json -----
{
  "id": "cmd_000000018684",
  "seq": 18684,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018680.json -----
{
  "id": "cmd_000000018680",
  "seq": 18680,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018677.json -----
{
  "id": "cmd_000000018677",
  "seq": 18677,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018676.json -----
{
  "id": "cmd_000000018676",
  "seq": 18676,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018674.json -----
{
  "id": "cmd_000000018674",
  "seq": 18674,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018673.json -----
{
  "id": "cmd_000000018673",
  "seq": 18673,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018671.json -----
{
  "id": "cmd_000000018671",
  "seq": 18671,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\" changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018670.json -----
{
  "id": "cmd_000000018670",
  "seq": 18670,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018668.json -----
{
  "id": "cmd_000000018668",
  "seq": 18668,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"net0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018667.json -----
{
  "id": "cmd_000000018667",
  "seq": 18667,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018665.json -----
{
  "id": "cmd_000000018665",
  "seq": 18665,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"tocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018664.json -----
{
  "id": "cmd_000000018664",
  "seq": 18664,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018662.json -----
{
  "id": "cmd_000000018662",
  "seq": 18662,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018661.json -----
{
  "id": "cmd_000000018661",
  "seq": 18661,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018659.json -----
{
  "id": "cmd_000000018659",
  "seq": 18659,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"o up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018658.json -----
{
  "id": "cmd_000000018658",
  "seq": 18658,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018652.json -----
{
  "id": "cmd_000000018652",
  "seq": 18652,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "EXEC_ERROR",
    "message": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Runtime async error: TypeError: Property 'trimEnd' of object  is not a function",
  "code": "EXEC_ERROR"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018649.json -----
{
  "id": "cmd_000000018649",
  "seq": 18649,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018643.json -----
{
  "id": "cmd_000000018643",
  "seq": 18643,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018640.json -----
{
  "id": "cmd_000000018640",
  "seq": 18640,
  "type": "terminal.native.exec",
  "status": "failed",
  "ok": false,
  "error": {
    "code": "UNKNOWN_COMMAND",
    "message": "Unknown command type: terminal.native.exec",
    "phase": "execution"
  }
}
{
  "ok": false,
  "error": "Unknown command type: terminal.native.exec",
  "code": "UNKNOWN_COMMAND",
  "source": "synthetic"
}
```
