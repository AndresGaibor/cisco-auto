# Direct terminal exec probe

Fecha: Tue Apr 28 12:45:01 -05 2026

## omni raw direct execution
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function safe(name) {
  try {
    if (t && typeof t[name] === \"function\") return String(t[name]());
    return \"<no-method>\";
  } catch(e) {
    return \"<err:\" + String(e) + \">\";
  }
}

function tail(s, n) {
  s = String(s || \"\");
  return s.slice(Math.max(0, s.length - n));
}

function pause(ms) {
  var s = Date.now();
  while (Date.now() - s < ms) {}
}

function snap(label) {
  var output = safe(\"getOutput\");
  return {
    label: label,
    prompt: safe(\"getPrompt\"),
    mode: safe(\"getMode\"),
    input: safe(\"getCommandInput\"),
    outputLen: output.length,
    outputTail: tail(output, 1200)
  };
}

var result = {
  device: d && d.getName ? d.getName() : null,
  model: d && d.getModel ? d.getModel() : null,
  before: snap(\"before\"),
  actions: []
};

function action(label, fn) {
  try {
    fn();
    result.actions.push({ label: label, ok: true, snap: snap(label) });
  } catch(e) {
    result.actions.push({ label: label, ok: false, error: String(e), snap: snap(label) });
  }
}

action(\"wake enterChar\", function(){ t.enterChar(13, 0); });
pause(400);

action(\"send show version\", function(){ t.enterCommand(\"show version\"); });
pause(500);

for (var i = 0; i < 30; i++) {
  var out = safe(\"getOutput\");

  if (String(out).indexOf(\"--More--\") >= 0) {
    action(\"pager space \" + i, function(){ t.enterChar(32, 0); });
    pause(250);
    continue;
  }

  var prompt = safe(\"getPrompt\");
  if (prompt && String(prompt).indexOf(\"SW-SRV-DIST\") >= 0 && /[>#]\$/.test(String(prompt))) {
    break;
  }

  pause(250);
}

result.after = snap(\"after\");
return JSON.stringify(result);
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;

function safe(name) {
  try {
    if (t && typeof t[name] === \"function\") return String(t[name]());
    return \"<no-method>\";
  } catch(e) {
    return \"<err:\" + String(e) + \">\";
  }
}

function tail(s, n) {
  s = String(s || \"\");
  return s.slice(Math.max(0, s.length - n));
}

function pause(ms) {
  var s = Date.now();
  while (Date.now() - s < ms) {}
}

function snap(label) {
  var output = safe(\"getOutput\");
  return {
    label: label,
    prompt: safe(\"getPrompt\"),
    mode: safe(\"getMode\"),
    input: safe(\"getCommandInput\"),
    outputLen: output.length,
    outputTail: tail(output, 1200)
  };
}

var result = {
  device: d && d.getName ? d.getName() : null,
  model: d && d.getModel ? d.getModel() : null,
  before: snap(\"before\"),
  actions: []
};

function action(label, fn) {
  try {
    fn();
    result.actions.push({ label: label, ok: true, snap: snap(label) });
  } catch(e) {
    result.actions.push({ label: label, ok: false, error: String(e), snap: snap(label) });
  }
}

action(\"wake enterChar\", function(){ t.enterChar(13, 0); });
pause(400);

action(\"send show version\", function(){ t.enterCommand(\"show version\"); });
pause(500);

for (var i = 0; i < 30; i++) {
  var out = safe(\"getOutput\");

  if (String(out).indexOf(\"--More--\") >= 0) {
    action(\"pager space \" + i, function(){ t.enterChar(32, 0); });
    pause(250);
    continue;
  }

  var prompt = safe(\"getPrompt\");
  if (prompt && String(prompt).indexOf(\"SW-SRV-DIST\") >= 0 && /[>#]\$/.test(String(prompt))) {
    break;
  }

  pause(250);
}

result.after = snap(\"after\");
return JSON.stringify(result);
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 1719,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\n\nfunction safe(name) {\n  try {\n    if (t && typeof t[name] === \"function\") return String(t[name]());\n    return \"<no-method>\";\n  } catch(e) {\n    return \"<err:\" + String(e) + \">\";\n  }\n}\n\nfunction tail(s, n) {\n  s = String(s || \"\");\n  return s.slice(Math.max(0, s.length - n));\n}\n\nfunction pause(ms) {\n  var s = Date.now();\n  while (Date.now() - s < ms) {}\n}\n\nfunction snap(label)",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"device\":\"SW-SRV-DIST\",\"model\":\"2960-24TT\",\"before\":{\"label\":\"before\",\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":9721,\"outputTail\":\" (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"},\"actions\":[{\"label\":\"wake enterChar\",\"ok\":true,\"snap\":{\"label\":\"wake enterChar\",\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":9734,\"outputTail\":\"-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}},{\"label\":\"send show version\",\"ok\":true,\"snap\":{\"label\":\"send show version\",\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":4697,\"outputTail\":\"SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \"}},{\"label\":\"pager space 0\",\"ok\":true,\"snap\":{\"label\":\"pager space 0\",\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":5153,\"outputTail\":\" (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"}}],\"after\":{\"label\":\"after\",\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":5153,\"outputTail\":\" (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"}}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000017674",
      "seq": 17674,
      "type": "omni.evaluate.raw",
      "startedAt": 1777398302431,
      "completedAt": 1777398303637,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"device\":\"SW-SRV-DIST\",\"model\":\"2960-24TT\",\"before\":{\"label\":\"before\",\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":9721,\"outputTail\":\" (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"},\"actions\":[{\"label\":\"wake enterChar\",\"ok\":true,\"snap\":{\"label\":\"wake enterChar\",\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":9734,\"outputTail\":\"-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}},{\"label\":\"send show version\",\"ok\":true,\"snap\":{\"label\":\"send show version\",\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":4697,\"outputTail\":\"SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \"}},{\"label\":\"pager space 0\",\"ok\":true,\"snap\":{\"label\":\"pager space 0\",\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":5153,\"outputTail\":\" (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"}}],\"after\":{\"label\":\"after\",\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":5153,\"outputTail\":\" (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\nTop Assembly Part Number        : 800-26671-02\\nTop Assembly Revision Number    : B0\\nVersion ID                      : V02\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST>\"}}"
      },
      "timings": {
        "sentAt": 1777398302358,
        "resultSeenAt": 1777398303643,
        "receivedAt": 1777398303643,
        "waitMs": 1285,
        "completedAtMs": 1777398303637
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 1.3s
```
