# terminal wake probe

Fecha: Tue Apr 28 12:32:56 -05 2026

## before / wake / after
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice('SW-SRV-DIST');

function termOf(label) {
  try {
    if (label === 'commandLine') return d && d.getCommandLine ? d.getCommandLine() : null;
    if (label === 'consoleLine') return d && d.getConsole && d.getConsole() && d.getConsole().getTerminalLine ? d.getConsole().getTerminalLine() : null;
  } catch(e) {}
  return null;
}

function tail(s, n) {
  s = String(s || '');
  return s.slice(Math.max(0, s.length - n));
}

function snap(label, t) {
  function safe(name) {
    try {
      if (t && typeof t[name] === 'function') return String(t[name]());
      return '<no-method>';
    } catch(e) {
      return '<err:' + String(e) + '>';
    }
  }

  return {
    label: label,
    hasTerminal: !!t,
    prompt: safe('getPrompt'),
    mode: safe('getMode'),
    input: safe('getCommandInput'),
    outputLen: safe('getOutput') === '<no-method>' ? -1 : safe('getOutput').length,
    outputTail: tail(safe('getOutput'), 1200)
  };
}

function pause(ms) {
  var s = Date.now();
  while (Date.now() - s < ms) {}
}

var cl = termOf('commandLine');
var cn = termOf('consoleLine');

var out = {
  device: d && d.getName ? d.getName() : null,
  model: d && d.getModel ? d.getModel() : null,
  before: {
    commandLine: snap('commandLine', cl),
    consoleLine: snap('consoleLine', cn)
  },
  actions: []
};

function tryAction(label, t, fn) {
  try {
    fn(t);
    out.actions.push({ label: label, ok: true });
  } catch(e) {
    out.actions.push({ label: label, ok: false, error: String(e) });
  }
}

tryAction('commandLine.enterChar(13,0)', cl, function(t){ if (t) t.enterChar(13, 0); });
tryAction('consoleLine.enterChar(13,0)', cn, function(t){ if (t) t.enterChar(13, 0); });
pause(500);

out.afterEnter = {
  commandLine: snap('commandLine', cl),
  consoleLine: snap('consoleLine', cn)
};

tryAction('commandLine.enterCommand(empty)', cl, function(t){ if (t) t.enterCommand(''); });
tryAction('consoleLine.enterCommand(empty)', cn, function(t){ if (t) t.enterCommand(''); });
pause(500);

out.afterEmptyCommand = {
  commandLine: snap('commandLine', cl),
  consoleLine: snap('consoleLine', cn)
};

tryAction('commandLine.enterCommand(show version)', cl, function(t){ if (t) t.enterCommand('show version'); });
pause(1200);

out.afterShowVersionCommandLine = {
  commandLine: snap('commandLine', cl),
  consoleLine: snap('consoleLine', cn)
};

return JSON.stringify(out);
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice('SW-SRV-DIST');

function termOf(label) {
  try {
    if (label === 'commandLine') return d && d.getCommandLine ? d.getCommandLine() : null;
    if (label === 'consoleLine') return d && d.getConsole && d.getConsole() && d.getConsole().getTerminalLine ? d.getConsole().getTerminalLine() : null;
  } catch(e) {}
  return null;
}

function tail(s, n) {
  s = String(s || '');
  return s.slice(Math.max(0, s.length - n));
}

function snap(label, t) {
  function safe(name) {
    try {
      if (t && typeof t[name] === 'function') return String(t[name]());
      return '<no-method>';
    } catch(e) {
      return '<err:' + String(e) + '>';
    }
  }

  return {
    label: label,
    hasTerminal: !!t,
    prompt: safe('getPrompt'),
    mode: safe('getMode'),
    input: safe('getCommandInput'),
    outputLen: safe('getOutput') === '<no-method>' ? -1 : safe('getOutput').length,
    outputTail: tail(safe('getOutput'), 1200)
  };
}

function pause(ms) {
  var s = Date.now();
  while (Date.now() - s < ms) {}
}

var cl = termOf('commandLine');
var cn = termOf('consoleLine');

var out = {
  device: d && d.getName ? d.getName() : null,
  model: d && d.getModel ? d.getModel() : null,
  before: {
    commandLine: snap('commandLine', cl),
    consoleLine: snap('consoleLine', cn)
  },
  actions: []
};

function tryAction(label, t, fn) {
  try {
    fn(t);
    out.actions.push({ label: label, ok: true });
  } catch(e) {
    out.actions.push({ label: label, ok: false, error: String(e) });
  }
}

tryAction('commandLine.enterChar(13,0)', cl, function(t){ if (t) t.enterChar(13, 0); });
tryAction('consoleLine.enterChar(13,0)', cn, function(t){ if (t) t.enterChar(13, 0); });
pause(500);

out.afterEnter = {
  commandLine: snap('commandLine', cl),
  consoleLine: snap('consoleLine', cn)
};

tryAction('commandLine.enterCommand(empty)', cl, function(t){ if (t) t.enterCommand(''); });
tryAction('consoleLine.enterCommand(empty)', cn, function(t){ if (t) t.enterCommand(''); });
pause(500);

out.afterEmptyCommand = {
  commandLine: snap('commandLine', cl),
  consoleLine: snap('consoleLine', cn)
};

tryAction('commandLine.enterCommand(show version)', cl, function(t){ if (t) t.enterCommand('show version'); });
pause(1200);

out.afterShowVersionCommandLine = {
  commandLine: snap('commandLine', cl),
  consoleLine: snap('consoleLine', cn)
};

return JSON.stringify(out);
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 2420,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice('SW-SRV-DIST');\n\nfunction termOf(label) {\n  try {\n    if (label === 'commandLine') return d && d.getCommandLine ? d.getCommandLine() : null;\n    if (label === 'consoleLine') return d && d.getConsole && d.getConsole() && d.getConsole().getTerminalLine ? d.getConsole().getTerminalLine() : null;\n  } catch(e) {}\n  return null;\n}\n\nfunction tail(s, n) {\n  s = String(s || '');\n  return s.slice(Math.max(0, s.length - n));\n}\n\nfunction snap(label, t) {\n  funct",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"device\":\"SW-SRV-DIST\",\"model\":\"2960-24TT\",\"before\":{\"commandLine\":{\"label\":\"commandLine\",\"hasTerminal\":true,\"prompt\":\"\",\"mode\":\"logout\",\"input\":\"\",\"outputLen\":3962,\"outputTail\":\"LINK-5-CHANGED: Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\"},\"consoleLine\":{\"label\":\"consoleLine\",\"hasTerminal\":true,\"prompt\":\"\",\"mode\":\"logout\",\"input\":\"\",\"outputLen\":3962,\"outputTail\":\"LINK-5-CHANGED: Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\"}},\"actions\":[{\"label\":\"commandLine.enterChar(13,0)\",\"ok\":true},{\"label\":\"consoleLine.enterChar(13,0)\",\"ok\":true},{\"label\":\"commandLine.enterCommand(empty)\",\"ok\":true},{\"label\":\"consoleLine.enterCommand(empty)\",\"ok\":true},{\"label\":\"commandLine.enterCommand(show version)\",\"ok\":true}],\"afterEnter\":{\"commandLine\":{\"label\":\"commandLine\",\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":3989,\"outputTail\":\"lan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"},\"consoleLine\":{\"label\":\"consoleLine\",\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":3989,\"outputTail\":\"lan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}},\"afterEmptyCommand\":{\"commandLine\":{\"label\":\"commandLine\",\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":4015,\"outputTail\":\"\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"},\"consoleLine\":{\"label\":\"consoleLine\",\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":4015,\"outputTail\":\"\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}},\"afterShowVersionCommandLine\":{\"commandLine\":{\"label\":\"commandLine\",\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":4979,\"outputTail\":\"thernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \"},\"consoleLine\":{\"label\":\"consoleLine\",\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":4979,\"outputTail\":\"thernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \"}}}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000017479",
      "seq": 17479,
      "type": "omni.evaluate.raw",
      "startedAt": 1777397576995,
      "completedAt": 1777397579272,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"device\":\"SW-SRV-DIST\",\"model\":\"2960-24TT\",\"before\":{\"commandLine\":{\"label\":\"commandLine\",\"hasTerminal\":true,\"prompt\":\"\",\"mode\":\"logout\",\"input\":\"\",\"outputLen\":3962,\"outputTail\":\"LINK-5-CHANGED: Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\"},\"consoleLine\":{\"label\":\"consoleLine\",\"hasTerminal\":true,\"prompt\":\"\",\"mode\":\"logout\",\"input\":\"\",\"outputLen\":3962,\"outputTail\":\"LINK-5-CHANGED: Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\"}},\"actions\":[{\"label\":\"commandLine.enterChar(13,0)\",\"ok\":true},{\"label\":\"consoleLine.enterChar(13,0)\",\"ok\":true},{\"label\":\"commandLine.enterCommand(empty)\",\"ok\":true},{\"label\":\"consoleLine.enterCommand(empty)\",\"ok\":true},{\"label\":\"commandLine.enterCommand(show version)\",\"ok\":true}],\"afterEnter\":{\"commandLine\":{\"label\":\"commandLine\",\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":3989,\"outputTail\":\"lan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"},\"consoleLine\":{\"label\":\"consoleLine\",\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":3989,\"outputTail\":\"lan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}},\"afterEmptyCommand\":{\"commandLine\":{\"label\":\"commandLine\",\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":4015,\"outputTail\":\"\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"},\"consoleLine\":{\"label\":\"consoleLine\",\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":4015,\"outputTail\":\"\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Vlan99, changed state to up\\n\\n%LINK-5-CHANGED: Interface GigabitEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/1, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/2, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\"}},\"afterShowVersionCommandLine\":{\"commandLine\":{\"label\":\"commandLine\",\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":4979,\"outputTail\":\"thernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \"},\"consoleLine\":{\"label\":\"consoleLine\",\"hasTerminal\":true,\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"outputLen\":4979,\"outputTail\":\"thernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>\\nSW-SRV-DIST>show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_team\\n\\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\\n\\nSystem returned to ROM by power-on\\n\\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\\n\\n\\n24 FastEthernet/IEEE 802.3 interface(s)\\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\\n\\n63488K bytes of flash-simulated non-volatile configuration memory.\\nBase ethernet MAC Address       : 0060.703D.1315\\nMotherboard assembly number     : 73-9832-06\\nPower supply part number        : 341-0097-02\\nMotherboard serial number       : FOC103248MJ\\nPower supply serial number      : DCA102133JA\\nModel revision number           : B0\\nMotherboard revision number     : C0\\nModel number                    : WS-C2960-24TT\\nSystem serial number            : FOC1033Z1EY\\n --More-- \"}}}"
      },
      "timings": {
        "sentAt": 1777397576948,
        "resultSeenAt": 1777397579336,
        "receivedAt": 1777397579336,
        "waitMs": 2388,
        "completedAtMs": 1777397579272
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 2.6s
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
  ✗ [🔴] Queue: 1 queued / 0 in-flight / 22 dead-letter
  ✓ [ℹ] Heartbeat encontrado
  ✓ [ℹ] Heartbeat estado: ok (891ms)
  ✗ [⚠] Bridge ready: no
  ✗ [⚠] Topología no materializada

Resumen: 7 OK, 2 warning, 1 critical
→ Acción requerida: hay problemas críticos.

⏱ pt doctor · 0.0s
```
