# terminal length zero pager final validation

Fecha: Tue Apr 28 16:16:33 -05 2026

## grep fixes
```
packages/pt-runtime/scripts/pt-lab-automation.js:104:    cli.enterCommand("terminal length 0");
packages/pt-runtime/scripts/pt-lab-automation.js:177:      cli.enterCommand("terminal length 0");
packages/pt-runtime/scripts/pt-ultimate-tester.js:336:    cli.enterCommand("terminal length 0");
packages/pt-runtime/src/terminal/standard-plans.ts:187:    createCommandStep("terminal length 0", { expectMode: "privileged-exec" }),
packages/pt-control/generated/runtime.js:10417:        createCommandStep("terminal length 0", { expectMode: "privileged-exec" }),
packages/pt-control/src/pt/terminal/standard-terminal-plans.ts:15:    command: "terminal length 0",
packages/pt-control/src/pt/terminal/standard-terminal-plans.ts:21:      suppressOutput: true,
packages/pt-control/src/pt/terminal/standard-terminal-plans.ts:22:      reason: "disable-ios-pager-before-show-command",
packages/pt-control/src/application/services/terminal-plan-builder.test.ts:107:      command: "terminal length 0",
packages/pt-control/src/application/services/terminal-plan-builder.test.ts:110:        suppressOutput: true,
packages/pt-control/src/application/services/terminal-plan-builder.test.ts:139:      command: "terminal length 0",
packages/pt-control/src/application/services/terminal-plan-builder.test.ts:143:        suppressOutput: true,
packages/pt-control/src/application/services/terminal-plan-builder.test.ts:147:      "terminal length 0",
packages/pt-control/src/application/services/terminal-plan-builder.test.ts:156:      "terminal length 0",
packages/pt-control/src/application/services/terminal-plan-builder.test.ts:161:      command: "terminal length 0",
packages/pt-control/src/application/services/terminal-plan-builder.test.ts:165:        suppressOutput: true,
packages/pt-control/src/application/services/terminal-plan-builder.ts:196:      command: "terminal length 0",
packages/pt-control/src/application/services/terminal-plan-builder.ts:202:        suppressOutput: true,
packages/pt-control/src/application/services/terminal-plan-builder.ts:203:        reason: "disable-ios-pager-before-show-command",
```

## tests
```
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

## reset terminal
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }
for (var i = 0; i < 40; i++) {
  var out = String(t.getOutput());
  if (out.indexOf(\"--More--\") < 0) break;
  try { t.enterChar(32,0); } catch(e) {}
  pause(150);
}
try { t.enterChar(21,0); } catch(e) {}
try { t.enterChar(13,0); } catch(e) {}
pause(250);
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
for (var i = 0; i < 40; i++) {
  var out = String(t.getOutput());
  if (out.indexOf(\"--More--\") < 0) break;
  try { t.enterChar(32,0); } catch(e) {}
  pause(150);
}
try { t.enterChar(21,0); } catch(e) {}
try { t.enterChar(13,0); } catch(e) {}
pause(250);
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
    "codeBytes": 615,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nfunction pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }\nfor (var i = 0; i < 40; i++) {\n  var out = String(t.getOutput());\n  if (out.indexOf(\"--More--\") < 0) break;\n  try { t.enterChar(32,0); } catch(e) {}\n  pause(150);\n}\ntry { t.enterChar(21,0); } catch(e) {}\ntry { t.enterChar(13,0); } catch(e) {}\npause(250);\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  ",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"nterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#  \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018543",
      "seq": 18543,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411001391,
      "completedAt": 1777411001806,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"nterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#  \\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST con0 is now available\\n\\n\\n\\n\\n\\n\\nPress RETURN to get started.\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\n\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777411001270,
        "resultSeenAt": 1777411001808,
        "receivedAt": 1777411001808,
        "waitMs": 538,
        "completedAtMs": 1777411001806
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


## show running-config attempt 1
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
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#  \n\n\n\n\n\n\n\n\nSW-SRV-DIST con0 is now available\n\n\n\n\n\n\nPress RETURN to get started.\n\n\n\n\n\n\n\n\n\n\n\n\n\nSW-SRV-DIST>\nSW-SRV-DIST>enable\nSW-SRV-DIST#   terminal length 0\n                        ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#   show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#  \n\n\n\n\n\n\n\n\nSW-SRV-DIST con0 is now available\n\n\n\n\n\n\nPress RETURN to get started.\n\n\n\n\n\n\n\n\n\n\n\n\n\nSW-SRV-DIST>\nSW-SRV-DIST>enable\nSW-SRV-DIST#   terminal length 0\n                        ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#   show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "status": 0,
  "warnings": [],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777411005532,
      "resultSeenAt": 1777411005694,
      "receivedAt": 1777411005694,
      "waitMs": 162,
      "completedAtMs": 1777411005683
    }
  },
  "timings": {
    "sentAt": 1777411005532,
    "resultSeenAt": 1777411005694,
    "receivedAt": 1777411005694,
    "waitMs": 162,
    "completedAtMs": 1777411005683
  }
}
⏱ pt cmd · 3.2s
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
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"    \",\"tail\":\"trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#    \"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018551",
      "seq": 18551,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411006307,
      "completedAt": 1777411006393,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"    \",\"tail\":\"trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#    \"}"
      },
      "timings": {
        "sentAt": 1777411006274,
        "resultSeenAt": 1777411006431,
        "receivedAt": 1777411006431,
        "waitMs": 157,
        "completedAtMs": 1777411006393
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
⏱ pt cmd · 15.2s
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
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"    \",\"tail\":\"trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#    \"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018554",
      "seq": 18554,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411022683,
      "completedAt": 1777411022763,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"    \",\"tail\":\"trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#    \"}"
      },
      "timings": {
        "sentAt": 1777411022627,
        "resultSeenAt": 1777411022787,
        "receivedAt": 1777411022787,
        "waitMs": 160,
        "completedAtMs": 1777411022763
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
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "status": 0,
  "warnings": [],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777411025481,
      "resultSeenAt": 1777411025685,
      "receivedAt": 1777411025685,
      "waitMs": 204,
      "completedAtMs": 1777411025650
    }
  },
  "timings": {
    "sentAt": 1777411025481,
    "resultSeenAt": 1777411025685,
    "receivedAt": 1777411025685,
    "waitMs": 204,
    "completedAtMs": 1777411025650
  }
}
⏱ pt cmd · 2.4s
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
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"  \",\"tail\":\"t trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#  \"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018561",
      "seq": 18561,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411026278,
      "completedAt": 1777411026356,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"  \",\"tail\":\"t trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#  \"}"
      },
      "timings": {
        "sentAt": 1777411026226,
        "resultSeenAt": 1777411026385,
        "receivedAt": 1777411026385,
        "waitMs": 159,
        "completedAtMs": 1777411026356
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

## show running-config attempt 4
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
    "code": "IOS_EXEC_FAILED",
    "message": "Error en ejecución de comando IOS"
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 15.2s
error: script "start" exited with code 1
error: script "pt" exited with code 1
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
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"  \",\"tail\":\"t trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#  \"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018564",
      "seq": 18564,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411042703,
      "completedAt": 1777411042886,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"  \",\"tail\":\"t trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#  \"}"
      },
      "timings": {
        "sentAt": 1777411042626,
        "resultSeenAt": 1777411042940,
        "receivedAt": 1777411042940,
        "waitMs": 314,
        "completedAtMs": 1777411042886
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
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "status": 0,
  "warnings": [],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777411047347,
      "resultSeenAt": 1777411047688,
      "receivedAt": 1777411047688,
      "waitMs": 341,
      "completedAtMs": 1777411047634
    }
  },
  "timings": {
    "sentAt": 1777411047347,
    "resultSeenAt": 1777411047688,
    "receivedAt": 1777411047688,
    "waitMs": 341,
    "completedAtMs": 1777411047634
  }
}
⏱ pt cmd · 4.4s
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
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"   \",\"tail\":\" trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#   \"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018572",
      "seq": 18572,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411048329,
      "completedAt": 1777411048499,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"   \",\"tail\":\" trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#   \"}"
      },
      "timings": {
        "sentAt": 1777411048116,
        "resultSeenAt": 1777411048541,
        "receivedAt": 1777411048541,
        "waitMs": 425,
        "completedAtMs": 1777411048499
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

## show running-config attempt 6
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
    "code": "IOS_EXEC_FAILED",
    "message": "Error en ejecución de comando IOS"
  },
  "nextSteps": [
    "pt doctor",
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ]
}
⏱ pt cmd · 15.4s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### terminal state after attempt 6
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
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"   \",\"tail\":\" trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#   \"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018575",
      "seq": 18575,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411064909,
      "completedAt": 1777411065091,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"   \",\"tail\":\" trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#   \"}"
      },
      "timings": {
        "sentAt": 1777411064769,
        "resultSeenAt": 1777411065139,
        "receivedAt": 1777411065139,
        "waitMs": 370,
        "completedAtMs": 1777411065091
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 0.4s
```

## show running-config attempt 7
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
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#",
  "status": 0,
  "warnings": [],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777411069218,
      "resultSeenAt": 1777411069526,
      "receivedAt": 1777411069526,
      "waitMs": 308,
      "completedAtMs": 1777411069505
    }
  },
  "timings": {
    "sentAt": 1777411069218,
    "resultSeenAt": 1777411069526,
    "receivedAt": 1777411069526,
    "waitMs": 308,
    "completedAtMs": 1777411069505
  }
}
⏱ pt cmd · 4.0s
```

### terminal state after attempt 7
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
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"    \",\"tail\":\"trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#    \"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018583",
      "seq": 18583,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411070043,
      "completedAt": 1777411070225,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"    \",\"tail\":\"trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#    \"}"
      },
      "timings": {
        "sentAt": 1777411069956,
        "resultSeenAt": 1777411070268,
        "receivedAt": 1777411070268,
        "waitMs": 312,
        "completedAtMs": 1777411070225
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

## show running-config attempt 8
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
⏱ pt cmd · 90.9s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### terminal state after attempt 8
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
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"   \",\"tail\":\" trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#   \"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018587",
      "seq": 18587,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411162098,
      "completedAt": 1777411162288,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"   \",\"tail\":\" trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#   \"}"
      },
      "timings": {
        "sentAt": 1777411162048,
        "resultSeenAt": 1777411162301,
        "receivedAt": 1777411162301,
        "waitMs": 253,
        "completedAtMs": 1777411162288
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

## show running-config attempt 9
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
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#   terminal length 0\n                        ^\n% Invalid input detected at '^' marker.",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n switchport trunk native vlan 999\n switchport trunk allowed vlan 90,99-100,110,120,999\n switchport mode trunk\n!\ninterface FastEthernet0/6\n!\ninterface FastEthernet0/7\n!\ninterface FastEthernet0/8\n!\ninterface FastEthernet0/9\n!\ninterface FastEthernet0/10\n!\ninterface FastEthernet0/11\n!\ninterface FastEthernet0/12\n!\ninterface FastEthernet0/13\n!\ninterface FastEthernet0/14\n!\ninterface FastEthernet0/15\n!\ninterface FastEthernet0/16\n!\ninterface FastEthernet0/17\n!\ninterface FastEthernet0/18\n!\ninterface FastEthernet0/19\n!\ninterface FastEthernet0/20\n!\ninterface FastEthernet0/21\n!\ninterface FastEthernet0/22\n!\ninterface FastEthernet0/23\n!\ninterface FastEthernet0/24\n!\ninterface GigabitEthernet0/1\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface GigabitEthernet0/2\n switchport trunk native vlan 999\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\n switchport mode trunk\n!\ninterface Vlan1\n no ip address\n shutdown\n!\ninterface Vlan99\n ip address 192.168.99.6 255.255.255.0\n!\nip default-gateway 192.168.99.1\n!\n!\n!\n!\nline con 0\n!\nline vty 0 4\n login\nline vty 5 15\n login\n!\n!\n!\n!\nend\n\n\nSW-SRV-DIST#   terminal length 0\n                        ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#",
  "status": 0,
  "warnings": [],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777411164927,
      "resultSeenAt": 1777411165416,
      "receivedAt": 1777411165416,
      "waitMs": 489,
      "completedAtMs": 1777411165398
    }
  },
  "timings": {
    "sentAt": 1777411164927,
    "resultSeenAt": 1777411165416,
    "receivedAt": 1777411165416,
    "waitMs": 489,
    "completedAtMs": 1777411165398
  }
}
⏱ pt cmd · 2.7s
```

### terminal state after attempt 9
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
  "value": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"de access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/2\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n --More-- \"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018593",
      "seq": 18593,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411165957,
      "completedAt": 1777411166127,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"de access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/2\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n --More-- \"}"
      },
      "timings": {
        "sentAt": 1777411165902,
        "resultSeenAt": 1777411166157,
        "receivedAt": 1777411166157,
        "waitMs": 255,
        "completedAtMs": 1777411166127
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

## show running-config attempt 10
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
⏱ pt cmd · 91.0s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

### terminal state after attempt 10
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
      "id": "cmd_000000018597",
      "seq": 18597,
      "type": "omni.evaluate.raw",
      "startedAt": 1777411258278,
      "completedAt": 1777411258362,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}"
      },
      "timings": {
        "sentAt": 1777411258259,
        "resultSeenAt": 1777411258367,
        "receivedAt": 1777411258367,
        "waitMs": 108,
        "completedAtMs": 1777411258362
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

## recent results focus
```
```
