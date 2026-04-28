# native exec orchestrator final validation

Fecha: Tue Apr 28 16:48:04 -05 2026

## grep fixes
```
packages/pt-runtime/scripts/pt-lab-automation.js:104:    cli.enterCommand("terminal length 0");
packages/pt-runtime/scripts/pt-lab-automation.js:177:      cli.enterCommand("terminal length 0");
packages/pt-runtime/scripts/pt-ultimate-tester.js:336:    cli.enterCommand("terminal length 0");
packages/pt-runtime/src/terminal/standard-plans.ts:187:    createCommandStep("terminal length 0", { expectMode: "privileged-exec" }),
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:669:    this.debug("cleared whitespace-only input before command len=" + input.length);
packages/pt-runtime/src/terminal/engine/command-state-machine.ts:946:        this.debug("finalize blocked by active pager sent=" + String(sent));
packages/pt-runtime/src/__tests__/handlers/runtime-handler-groups.test.ts:11:  "terminal.native.exec",
packages/pt-runtime/src/__tests__/handlers/terminal-native-exec.test.ts:3:import { handleTerminalNativeExec } from "../../handlers/terminal-native-exec.js";
packages/pt-runtime/src/__tests__/handlers/terminal-native-exec.test.ts:5:describe("terminal.native.exec", () => {
packages/pt-runtime/src/__tests__/handlers/terminal-native-exec.test.ts:28:    const result = await handleTerminalNativeExec(
packages/pt-runtime/src/build/runtime-manifest.ts:110:    "handlers/terminal-native-exec.ts",
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:57:import { handleTerminalNativeExec } from "../terminal-native-exec.js";
packages/pt-runtime/src/handlers/registration/stable-handlers.ts:89:  registerHandler("terminal.native.exec", handleTerminalNativeExec as unknown as HandlerFn);
packages/pt-runtime/src/handlers/terminal-native-exec.ts:135:export async function handleTerminalNativeExec(
packages/pt-runtime/src/handlers/terminal-native-exec.ts:147:    return createErrorResult("terminal.native.exec requiere device y command", "INVALID_NATIVE_EXEC_PAYLOAD");
packages/pt-runtime/src/handlers/terminal-native-exec.ts:173:    return createErrorResult("terminal.native.exec no pudo enviar el comando: " + String(error), "NATIVE_EXEC_SEND_FAILED");
packages/pt-runtime/src/handlers/terminal-native-exec.ts:230:      `terminal.native.exec no completó ${command} en ${timeoutMs}ms`,
packages/pt-control/generated/runtime.js:10417:        createCommandStep("terminal length 0", { expectMode: "privileged-exec" }),
packages/pt-control/src/adapters/runtime-terminal/adapter.native-exec.test.ts:6:  test("usa terminal.native.exec para show running-config IOS", async () => {
packages/pt-control/src/adapters/runtime-terminal/adapter.native-exec.test.ts:13:        if (type === "terminal.native.exec") {
packages/pt-control/src/adapters/runtime-terminal/adapter.native-exec.test.ts:53:    expect(calls.map((call) => call.type)).toEqual(["terminal.native.exec"]);
packages/pt-control/src/adapters/runtime-terminal/adapter.ts:522:      "terminal.native.exec",
packages/pt-control/src/application/services/terminal-plan-builder.test.ts:110:  test("buildUniversalTerminalPlan no inserta terminal length 0 para show IOS", () => {
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

## reset terminal
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }
try { t.enterChar(21,0); } catch(e) {}
for (var i=0;i<20;i++) { try { t.enterChar(8,0); } catch(e) {} pause(10); }
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
try { t.enterChar(21,0); } catch(e) {}
for (var i=0;i<20;i++) { try { t.enterChar(8,0); } catch(e) {} pause(10); }
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
    "codeBytes": 475,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nfunction pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }\ntry { t.enterChar(21,0); } catch(e) {}\nfor (var i=0;i<20;i++) { try { t.enterChar(8,0); } catch(e) {} pause(10); }\nreturn JSON.stringify({\n  prompt: String(t.getPrompt()),\n  mode: String(t.getMode()),\n  input: String(t.getCommandInput()),\n  tail: String(t.getOutput()).slice(-500)\n});\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"\",\"mode\":\"logout\",\"input\":\"\",\"tail\":\"Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018650",
      "seq": 18650,
      "type": "omni.evaluate.raw",
      "startedAt": 1777412898896,
      "completedAt": 1777412899165,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"\",\"mode\":\"logout\",\"input\":\"\",\"tail\":\"Interface FastEthernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\"}"
      },
      "timings": {
        "sentAt": 1777412898835,
        "resultSeenAt": 1777412899168,
        "receivedAt": 1777412899168,
        "waitMs": 333,
        "completedAtMs": 1777412899165
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
⏱ pt cmd · 12.3s
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
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"Ethernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018653",
      "seq": 18653,
      "type": "omni.evaluate.raw",
      "startedAt": 1777412913384,
      "completedAt": 1777412913444,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"Ethernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777412913350,
        "resultSeenAt": 1777412913459,
        "receivedAt": 1777412913459,
        "waitMs": 109,
        "completedAtMs": 1777412913444
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
⏱ pt cmd · 12.2s
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
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"Ethernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018656",
      "seq": 18656,
      "type": "omni.evaluate.raw",
      "startedAt": 1777412927478,
      "completedAt": 1777412927524,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"Ethernet0/2, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/3, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777412927392,
        "resultSeenAt": 1777412927563,
        "receivedAt": 1777412927563,
        "waitMs": 171,
        "completedAtMs": 1777412927524
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
⏱ pt cmd · 12.2s
error: script "start" exited with code 1
error: script "pt" exited with code 1
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
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"o up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018659",
      "seq": 18659,
      "type": "omni.evaluate.raw",
      "startedAt": 1777412943632,
      "completedAt": 1777412944257,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"o up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/3, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777412943463,
        "resultSeenAt": 1777412944260,
        "receivedAt": 1777412944260,
        "waitMs": 797,
        "completedAtMs": 1777412944257
      }
    }
  },
  "confidence": 1,
  "nextSteps": [
    "pt omni inspect env --json",
    "pt omni topology physical --json"
  ]
}
⏱ pt omni raw · 1.4s
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
⏱ pt cmd · 12.5s
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
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018662",
      "seq": 18662,
      "type": "omni.evaluate.raw",
      "startedAt": 1777412958331,
      "completedAt": 1777412958463,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"LINK-5-CHANGED: Interface FastEthernet0/4, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777412958174,
        "resultSeenAt": 1777412958477,
        "receivedAt": 1777412958477,
        "waitMs": 303,
        "completedAtMs": 1777412958463
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

## show running-config attempt 5
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
⏱ pt cmd · 12.4s
error: script "start" exited with code 1
error: script "pt" exited with code 1
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
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"tocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018665",
      "seq": 18665,
      "type": "omni.evaluate.raw",
      "startedAt": 1777412972391,
      "completedAt": 1777412972491,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"tocol on Interface FastEthernet0/4, changed state to up\\n\\n%LINK-5-CHANGED: Interface FastEthernet0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777412972270,
        "resultSeenAt": 1777412972515,
        "receivedAt": 1777412972515,
        "waitMs": 245,
        "completedAtMs": 1777412972491
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
⏱ pt cmd · 12.3s
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
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"net0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018668",
      "seq": 18668,
      "type": "omni.evaluate.raw",
      "startedAt": 1777412986192,
      "completedAt": 1777412986283,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"net0/5, changed state to up\\n\\n%LINEPROTO-5-UPDOWN: Line protocol on Interface FastEthernet0/5, changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777412986095,
        "resultSeenAt": 1777412986315,
        "receivedAt": 1777412986315,
        "waitMs": 220,
        "completedAtMs": 1777412986283
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

## show running-config attempt 7
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
⏱ pt cmd · 12.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
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
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\" changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018671",
      "seq": 18671,
      "type": "omni.evaluate.raw",
      "startedAt": 1777412999794,
      "completedAt": 1777412999881,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\" changed state to up\\n\\n\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777412999750,
        "resultSeenAt": 1777412999910,
        "receivedAt": 1777412999910,
        "waitMs": 160,
        "completedAtMs": 1777412999881
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
⏱ pt cmd · 12.4s
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
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018674",
      "seq": 18674,
      "type": "omni.evaluate.raw",
      "startedAt": 1777413013994,
      "completedAt": 1777413014072,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777413013875,
        "resultSeenAt": 1777413014122,
        "receivedAt": 1777413014122,
        "waitMs": 247,
        "completedAtMs": 1777413014072
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
⏱ pt cmd · 12.5s
error: script "start" exited with code 1
error: script "pt" exited with code 1
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
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018677",
      "seq": 18677,
      "type": "omni.evaluate.raw",
      "startedAt": 1777413028055,
      "completedAt": 1777413028160,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777413027978,
        "resultSeenAt": 1777413028192,
        "receivedAt": 1777413028192,
        "waitMs": 214,
        "completedAtMs": 1777413028160
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
⏱ pt cmd · 12.4s
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
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018680",
      "seq": 18680,
      "type": "omni.evaluate.raw",
      "startedAt": 1777413042111,
      "completedAt": 1777413042216,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\",\"tail\":\"ected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>show running-config\\n                 ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST>\"}"
      },
      "timings": {
        "sentAt": 1777413041986,
        "resultSeenAt": 1777413042244,
        "receivedAt": 1777413042244,
        "waitMs": 258,
        "completedAtMs": 1777413042216
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
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show version",
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
⏱ pt cmd · 12.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## final recent results
```

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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018634.json -----
{
  "id": "cmd_000000018634",
  "seq": 18634,
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018631.json -----
{
  "id": "cmd_000000018631",
  "seq": 18631,
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018628.json -----
{
  "id": "cmd_000000018628",
  "seq": 18628,
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018625.json -----
{
  "id": "cmd_000000018625",
  "seq": 18625,
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018622.json -----
{
  "id": "cmd_000000018622",
  "seq": 18622,
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018619.json -----
{
  "id": "cmd_000000018619",
  "seq": 18619,
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018616.json -----
{
  "id": "cmd_000000018616",
  "seq": 18616,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "done": true,
  "ok": true,
  "status": 0,
  "result": {
    "ok": true,
    "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#  ",
    "status": 0,
    "session": {
      "mode": "privileged-exec",
      "prompt": "SW-SRV-DIST#",
      "paging": false,
      "awaitingConfirm": false
    }
  },
  "raw": "SW-SRV-DIST#terminal length 0\n                     ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#  terminal length 0\n                       ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#  ",
  "output": "SW-SRV-DIST#terminal length 0\n                     ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#  terminal length 0\n                       ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#  ",
  "source": "terminal",
  "session": {
    "mode": "privileged-exec",
    "prompt": "SW-SRV-DIST#",
    "paging": false,
    "awaitingConfirm": false
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018615.json -----
{
  "id": "cmd_000000018615",
  "seq": 18615,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-e4f8dc1d",
  "done": false,
  "state": "waiting-command",
  "currentStep": 1,
  "totalSteps": 2,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "ion Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#  terminal length 0\n                       ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#",
  "lastPrompt": "SW-SRV-DIST#",
  "lastMode": "privileged-exec",
  "waitingForCommandEnd": true,
  "updatedAt": 1777411948820,
  "ageMs": 1443,
  "idleMs": 109,
  "debug": [
    "1777411947611 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=125 idleMs=125",
    "1777411947738 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=252 idleMs=252",
    "1777411947753 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=267 idleMs=267",
    "1777411947831 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=345 idleMs=345",
    "1777411947951 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=465 idleMs=465",
    "1777411948069 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=583 idleMs=583",
    "1777411948074 native-fallback-enter reason=reapStaleJobs elapsedMs=582",
    "1777411948079 native-output-len=8780",
    "1777411948089 native-check command=\"terminal length 0\" prompt=\"SW-SRV-DIST#\" mode=\"privileged-exec\" blockLen=1626 complete=true promptOk=true pager=false blockHead=\"SW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_t\" blockTail=\"  SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST#  terminal length 0\\n                       ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\"",
    "1777411948214 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=728 idleMs=114",
    "1777411948226 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=740 idleMs=126",
    "1777411948309 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=823 idleMs=209",
    "1777411948670 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=1184 idleMs=570",
    "1777411948676 native-fallback-enter reason=reapStaleJobs elapsedMs=570",
    "1777411948685 native-output-len=9744",
    "1777411948910 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=1424 idleMs=90",
    "1777411948921 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=1435 idleMs=101"
  ],
  "stepResults": [
    {
      "stepIndex": 0,
      "stepType": "command",
      "command": "terminal length 0",
      "raw": "SW-SRV-DIST#terminal length 0\n                     ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#  terminal length 0\n                       ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#",
      "status": 0,
      "completedAt": 1777411948100
    }
  ]
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018614.json -----
{
  "id": "cmd_000000018614",
  "seq": 18614,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-e4f8dc1d",
  "done": false,
  "state": "waiting-command",
  "currentStep": 1,
  "totalSteps": 2,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "ion Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#  terminal length 0\n                       ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#",
  "lastPrompt": "SW-SRV-DIST#",
  "lastMode": "privileged-exec",
  "waitingForCommandEnd": true,
  "updatedAt": 1777411948100,
  "ageMs": 749,
  "idleMs": 135,
  "debug": [
    "1777411947611 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=125 idleMs=125",
    "1777411947738 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=252 idleMs=252",
    "1777411947753 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=267 idleMs=267",
    "1777411947831 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=345 idleMs=345",
    "1777411947951 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=465 idleMs=465",
    "1777411948069 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=583 idleMs=583",
    "1777411948074 native-fallback-enter reason=reapStaleJobs elapsedMs=582",
    "1777411948079 native-output-len=8780",
    "1777411948089 native-check command=\"terminal length 0\" prompt=\"SW-SRV-DIST#\" mode=\"privileged-exec\" blockLen=1626 complete=true promptOk=true pager=false blockHead=\"SW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#show version\\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\\nCompiled Wed 12-Oct-05 22:05 by pt_t\" blockTail=\"  SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\\nConfiguration register is 0xF\\n\\n\\nSW-SRV-DIST#  terminal length 0\\n                       ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\"",
    "1777411948214 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=728 idleMs=114",
    "1777411948226 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=740 idleMs=126"
  ],
  "stepResults": [
    {
      "stepIndex": 0,
      "stepType": "command",
      "command": "terminal length 0",
      "raw": "SW-SRV-DIST#terminal length 0\n                     ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#  terminal length 0\n                       ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#",
      "status": 0,
      "completedAt": 1777411948100
    }
  ]
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018613.json -----
{
  "id": "cmd_000000018613",
  "seq": 18613,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-e4f8dc1d",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 2,
  "stepType": "command",
  "stepValue": "terminal length 0",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777411947486,
  "ageMs": 272,
  "idleMs": 272,
  "debug": [
    "1777411947611 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=125 idleMs=125",
    "1777411947738 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=252 idleMs=252",
    "1777411947753 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=267 idleMs=267"
  ],
  "stepResults": []
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018612.json -----
{
  "id": "cmd_000000018612",
  "seq": 18612,
  "type": "terminal.plan.run",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-e4f8dc1d",
  "job": {
    "id": "cmd-e4f8dc1d",
    "kind": "ios-session",
    "version": 1,
    "device": "SW-SRV-DIST",
    "plan": [
      {
        "type": "command",
        "kind": "command",
        "value": "terminal length 0",
        "command": "terminal length 0",
        "allowPager": false,
        "allowConfirm": false,
        "optional": false,
        "timeoutMs": 12000,
        "options": {
          "timeoutMs": 12000
        },
        "metadata": {
          "internal": true,
          "suppressOutput": true,
          "reason": "disable-ios-pager-before-show-command"
        }
      },
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018607.json -----
{
  "id": "cmd_000000018607",
  "seq": 18607,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "done": true,
  "ok": true,
  "status": 0,
  "result": {
    "ok": true,
    "raw": "SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
    "status": 0,
    "session": {
      "mode": "privileged-exec",
      "prompt": "SW-SRV-DIST#",
      "paging": false,
      "awaitingConfirm": false
    }
  },
  "raw": "SW-SRV-DIST#terminal length 0\n                     ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "output": "SW-SRV-DIST#terminal length 0\n                     ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#SW-SRV-DIST#show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#",
  "source": "terminal",
  "session": {
    "mode": "privileged-exec",
    "prompt": "SW-SRV-DIST#",
    "paging": false,
    "awaitingConfirm": false
  }
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018606.json -----
{
  "id": "cmd_000000018606",
  "seq": 18606,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-aadc089c",
  "done": false,
  "state": "waiting-command",
  "currentStep": 1,
  "totalSteps": 2,
  "stepType": "command",
  "stepValue": "show version",
  "outputTail": "SW-SRV-DIST#terminal length 0\n                     ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#",
  "lastPrompt": "SW-SRV-DIST#",
  "lastMode": "privileged-exec",
  "waitingForCommandEnd": true,
  "updatedAt": 1777411656148,
  "ageMs": 726,
  "idleMs": 110,
  "debug": [
    "1777411655614 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=82 idleMs=82",
    "1777411655692 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=160 idleMs=160",
    "1777411655700 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=168 idleMs=168",
    "1777411655756 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=224 idleMs=224",
    "1777411655812 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=280 idleMs=280",
    "1777411656028 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=496 idleMs=496",
    "1777411656123 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=591 idleMs=591",
    "1777411656127 native-fallback-enter reason=reapStaleJobs elapsedMs=590",
    "1777411656131 native-output-len=7261",
    "1777411656139 native-check command=\"terminal length 0\" prompt=\"SW-SRV-DIST#\" mode=\"privileged-exec\" blockLen=107 complete=true promptOk=true pager=false blockHead=\"SW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\" blockTail=\"SW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\"",
    "1777411656241 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=709 idleMs=93",
    "1777411656250 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=718 idleMs=102"
  ],
  "stepResults": [
    {
      "stepIndex": 0,
      "stepType": "command",
      "command": "terminal length 0",
      "raw": "SW-SRV-DIST#terminal length 0\n                     ^\n% Invalid input detected at '^' marker.\n\t\nSW-SRV-DIST#",
      "status": 0,
      "completedAt": 1777411656148
    }
  ]
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018605.json -----
{
  "id": "cmd_000000018605",
  "seq": 18605,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-aadc089c",
  "done": false,
  "state": "waiting-command",
  "currentStep": 0,
  "totalSteps": 2,
  "stepType": "command",
  "stepValue": "terminal length 0",
  "outputTail": "",
  "lastPrompt": "",
  "lastMode": "unknown",
  "waitingForCommandEnd": true,
  "updatedAt": 1777411655532,
  "ageMs": 172,
  "idleMs": 172,
  "debug": [
    "1777411655614 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=82 idleMs=82",
    "1777411655692 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=160 idleMs=160",
    "1777411655700 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=168 idleMs=168"
  ],
  "stepResults": []
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018604.json -----
{
  "id": "cmd_000000018604",
  "seq": 18604,
  "type": "terminal.plan.run",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-aadc089c",
  "job": {
    "id": "cmd-aadc089c",
    "kind": "ios-session",
    "version": 1,
    "device": "SW-SRV-DIST",
    "plan": [
      {
        "type": "command",
        "kind": "command",
        "value": "terminal length 0",
        "command": "terminal length 0",
        "allowPager": false,
        "allowConfirm": false,
        "optional": false,
        "timeoutMs": 12000,
        "options": {
          "timeoutMs": 12000
        },
        "metadata": {
          "internal": true,
          "suppressOutput": true,
          "reason": "disable-ios-pager-before-show-command"
        }
      },
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018602.json -----
{
  "id": "cmd_000000018602",
  "seq": 18602,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"elapsedMs\":1051,\"complete\":true,\"reason\":\"stable-prompt\",\"pagerAdvances\":5,\"before\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"ort trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"after\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"blockLen\":2127,\"blockHead\":\"SW-SRV-DIST#show running-config\\nBuilding configuration...\\n\\nCurrent configuration : 2020 bytes\\n!\\nversion 12.2\\nno service timestamps log datetime msec\\nno service timestamps debug datetime msec\\nno service password-encryption\\n!\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/2\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tre\",\"blockTail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\",\"samples\":[{\"t\":209,\"len\":5442,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n --More-- \"},{\"t\":299,\"len\":5946,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"pduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n --More-- \"},{\"t\":389,\"len\":6315,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"erface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\n --More-- \"},{\"t\":480,\"len\":6668,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\" FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n --More-- \"},{\"t\":572,\"len\":7109,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"rt mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\n --More-- \"},{\"t\":663,\"len\":7166,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":753,\"len\":7166,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":843,\"len\":7166,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}]}"
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018601.json -----
{
  "id": "cmd_000000018601",
  "seq": 18601,
  "type": "omni.evaluate.raw",
  "status": "completed",
  "ok": true,
  "error": null
}
{
  "ok": true,
  "result": "{\"elapsedMs\":1092,\"complete\":true,\"reason\":\"stable-prompt\",\"pagerAdvances\":5,\"before\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\" trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#terminal length 0\\n                     ^\\n% Invalid input detected at '^' marker.\\n\\t\\nSW-SRV-DIST#\"},\"after\":{\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"tail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},\"blockLen\":2127,\"blockHead\":\"SW-SRV-DIST#show running-config\\nBuilding configuration...\\n\\nCurrent configuration : 2020 bytes\\n!\\nversion 12.2\\nno service timestamps log datetime msec\\nno service timestamps debug datetime msec\\nno service password-encryption\\n!\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/2\\n switchport access vlan 70\\n switchport mode access\\n spanning-tree portfast\\n spanning-tree bpduguard enable\\n!\\ninterface FastEthernet0/3\\n switchport access vlan 70\\n switchport mode access\\n spanning-tre\",\"blockTail\":\"hernet0/20\\n!\\ninterface FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface GigabitEthernet0/2\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 10,15,20,25,30,40,50,60,70,80,90,99-100,110,120,130,999\\n switchport mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\",\"samples\":[{\"t\":239,\"len\":9327,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"\\nhostname SW-SRV-DIST\\n!\\n!\\n!\\nno ip domain-lookup\\n!\\n!\\n!\\nspanning-tree mode rapid-pvst\\nspanning-tree extend system-id\\n!\\ninterface FastEthernet0/1\\n switchport access vlan 70\\n --More-- \"},{\"t\":331,\"len\":9831,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"pduguard enable\\n!\\ninterface FastEthernet0/4\\n switchport trunk native vlan 999\\n switchport trunk allowed vlan 80,99,999\\n switchport mode trunk\\n!\\ninterface FastEthernet0/5\\n --More-- \"},{\"t\":424,\"len\":4200,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"erface FastEthernet0/9\\n!\\ninterface FastEthernet0/10\\n!\\ninterface FastEthernet0/11\\n!\\ninterface FastEthernet0/12\\n!\\ninterface FastEthernet0/13\\n!\\ninterface FastEthernet0/14\\n!\\n --More-- \"},{\"t\":522,\"len\":4553,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\" FastEthernet0/21\\n!\\ninterface FastEthernet0/22\\n!\\ninterface FastEthernet0/23\\n!\\ninterface FastEthernet0/24\\n!\\ninterface GigabitEthernet0/1\\n switchport trunk native vlan 999\\n --More-- \"},{\"t\":612,\"len\":4994,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":true,\"echo\":true,\"promptAtEnd\":false,\"lastLine\":\"--More--\",\"tail\":\"rt mode trunk\\n!\\ninterface Vlan1\\n no ip address\\n shutdown\\n!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\n --More-- \"},{\"t\":702,\"len\":5051,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":792,\"len\":5051,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"},{\"t\":882,\"len\":5051,\"prompt\":\"SW-SRV-DIST#\",\"mode\":\"enable\",\"input\":\"\",\"pager\":false,\"echo\":true,\"promptAtEnd\":true,\"lastLine\":\"SW-SRV-DIST#\",\"tail\":\"!\\ninterface Vlan99\\n ip address 192.168.99.6 255.255.255.0\\n!\\nip default-gateway 192.168.99.1\\n!\\n!\\n!\\n!\\nline con 0\\n!\\nline vty 0 4\\n login\\nline vty 5 15\\n login\\n!\\n!\\n!\\n!\\nend\\n\\n\\nSW-SRV-DIST#\"}]}"
}
```
