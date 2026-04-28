# pt cmd parser ensure doctor fix

Fecha: Tue Apr 28 14:37:14 -05 2026

## grep fixes
```
packages/file-bridge/tests/queue-index.test.ts:8:  test("sendCommand registra el filename en _queue.json", () => {
packages/file-bridge/tests/queue-index.test.ts:14:      const queuePath = join(root, "commands", "_queue.json");
packages/file-bridge/src/backpressure-manager.ts:111:   * Excluye _queue.json (índice auxiliar).
packages/file-bridge/src/backpressure-manager.ts:120:        (f) => f.endsWith(".json") && f !== "_queue.json",
packages/file-bridge/src/backpressure-manager.ts:123:        (f) => f.endsWith(".json") && f !== "_queue.json",
packages/file-bridge/src/backpressure-manager.ts:175:        (f) => f.endsWith(".json") && f !== "_queue.json",
packages/file-bridge/src/backpressure-manager.ts:178:        (f) => f.endsWith(".json") && f !== "_queue.json",
packages/file-bridge/src/v2/crash-recovery.test.ts:45:  test("no mueve _queue.json a dead-letter", () => {
packages/file-bridge/src/v2/crash-recovery.test.ts:47:      join(paths.commandsDir(), "_queue.json"),
packages/file-bridge/src/v2/crash-recovery.test.ts:61:    expect(existsSync(join(paths.commandsDir(), "_queue.json"))).toBe(true);
packages/file-bridge/src/v2/command-processor.test.ts:100:  test("ignora _queue.json y procesa el siguiente comando válido", () => {
packages/file-bridge/src/v2/command-processor.test.ts:105:      join(paths.commandsDir(), "_queue.json"),
packages/file-bridge/src/v2/command-processor.test.ts:120:    expect(existsSync(join(paths.commandsDir(), "_queue.json"))).toBe(true);
packages/file-bridge/src/v2/command-processor.ts:303:    const queueFilePath = join(this.paths.commandsDir(), "_queue.json");
packages/file-bridge/src/v2/command-processor.ts:313:            .filter((entry) => entry !== "" && entry !== "_queue.json" && entry.endsWith(".json"));
packages/file-bridge/src/v2/command-processor.ts:338:    const queueFilePath = join(root, "commands", "_queue.json");
packages/file-bridge/src/v2/diagnostics.ts:167:      return readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "_queue.json").length;
packages/file-bridge/src/v2/diagnostics.ts:176:        .filter((f) => f.endsWith(".json") && f !== "_queue.json")
packages/file-bridge/src/v2/diagnostics.ts:185:      const queueFile = join(this.paths.commandsDir(), "_queue.json");
packages/file-bridge/src/v2/diagnostics.ts:191:        .filter((entry) => entry !== "" && entry !== "_queue.json" && entry.endsWith(".json"))
packages/file-bridge/src/v2/diagnostics.ts:234:      const files = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "_queue.json");
packages/file-bridge/src/v2/crash-recovery.ts:85:      if (file === "_queue.json") {
packages/file-bridge/src/file-bridge-v2.ts:22: * El índice _queue.json es auxiliar (legacy fallback para PT que no puede
packages/file-bridge/src/file-bridge-v2.ts:79:  /** Si true, omite escritura de _queue.json (fs es fuente primary) */
packages/file-bridge/src/file-bridge-v2.ts:353:    // _queue.json es legacy fallback — no escribir si skipQueueIndex=true
packages/file-bridge/src/file-bridge-v2.ts:587:      const queuePath = join(this.paths.commandsDir(), "_queue.json");
packages/pt-runtime/out:626:            if (name === "_queue.json")
packages/pt-runtime/out:647:    var queuePath = commandsDir + "/_queue.json";
packages/pt-runtime/out:717:            if (!name || name === "_queue.json" || name.indexOf(".json") === -1)
packages/pt-runtime/out:770:                        if (name === "_queue.json")
packages/pt-runtime/out:867:                    if (name === "_queue.json")
packages/pt-runtime/out:1065:// _queue.json es legacy fallback, NO fuente primaria.
packages/pt-runtime/out:1094:        // Legacy fallback: _queue.json (solo si flag habilitado)
packages/pt-runtime/src/pt/kernel/queue-discovery.ts:3:// Fallback cuando _queue.json no está disponible o está corrupto
packages/pt-runtime/src/pt/kernel/queue-discovery.ts:26:          if (name === "_queue.json") continue;
packages/pt-runtime/src/pt/kernel/queue-claim.ts:6:// _queue.json es legacy fallback, NO fuente primaria.
packages/pt-runtime/src/pt/kernel/queue-claim.ts:47:    // Legacy fallback: _queue.json (solo si flag habilitado)
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:3:// _queue.json es índice auxiliar; NO se eliminan commands válidos solo por faltar en el índice.
packages/pt-runtime/src/pt/kernel/queue-cleanup.ts:32:        if (name === "_queue.json") continue;
packages/pt-runtime/src/pt/kernel/command-queue.ts:3:// - queue-index: lectura/escritura del índice _queue.json
packages/pt-runtime/src/pt/kernel/queue-index.ts:2:// Índice auxiliar _queue.json.
packages/pt-runtime/src/pt/kernel/queue-index.ts:24:    if (name === "_queue.json") continue;
packages/pt-runtime/src/pt/kernel/queue-index.ts:36:  const queuePath = commandsDir + "/_queue.json";
packages/pt-runtime/src/pt/kernel/queue-index.ts:97:      if (!name || name === "_queue.json" || name.indexOf(".json") === -1) return;
packages/pt-runtime/src/pt/kernel/execution-engine.ts:509:  function nativeModeSatisfiesEnsureStep(step: DeferredStep, mode: string, prompt: string): boolean {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:533:  function completeEnsureModeFromNativeTerminal(
packages/pt-runtime/src/pt/kernel/execution-engine.ts:541:    if (!nativeModeSatisfiesEnsureStep(step, mode, prompt)) {
packages/pt-runtime/src/pt/kernel/execution-engine.ts:859:      return completeEnsureModeFromNativeTerminal(job, step, prompt, mode);
packages/pt-runtime/src/__tests__/queue-claim.test.ts:129:    const queuePath = join(commandsDir, "_queue.json");
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:149:  test("poll usa _queue.json como indice primario", () => {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:153:        p.endsWith("_queue.json") || (p.includes("commands") && !p.includes("in-flight")),
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:156:      if (p.endsWith("_queue.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:179:  test("poll usa _queue.json aun si getFilesInDirectory falla", () => {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:186:        p.endsWith("_queue.json") || (p.includes("commands") && !p.includes("in-flight")),
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:189:      if (p.endsWith("_queue.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:210:  test("poll no purga _queue.json si el comando aún no existe", () => {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:213:    mockFm.fileExists.mockImplementation((p: string) => p.endsWith("_queue.json"));
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:215:      if (p.endsWith("_queue.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:236:      if (p.endsWith("_queue.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:242:      if (p.endsWith("_queue.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:271:      if (p.endsWith("_queue.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:277:      if (p.endsWith("_queue.json")) {
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:305:      if (p.endsWith("_queue.json")) return true;
packages/pt-runtime/src/__tests__/pt/kernel.test.ts:311:      if (p.endsWith("_queue.json")) {
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:86:    const queuePath = join(commandsDir, "_queue.json");
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:133:  test("NO borra command que existe en commands/ aunque no esté en _queue.json", () => {
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:152:  test("reindexa entradas faltantes en _queue.json", () => {
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:158:    const queuePath = join(commandsDir, "_queue.json");
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:172:  test("si _queue.json está corrupto, read() devuelve [] y no lanza", () => {
packages/pt-runtime/src/__tests__/queue-cleanup-ttl.test.ts:176:    writeFileSync(join(commandsDir, "_queue.json"), "{ invalid json {{{");
packages/pt-control/generated/main.js:671:            if (name === "_queue.json")
packages/pt-control/generated/main.js:692:    var queuePath = commandsDir + "/_queue.json";
packages/pt-control/generated/main.js:762:            if (!name || name === "_queue.json" || name.indexOf(".json") === -1)
packages/pt-control/generated/main.js:815:                        if (name === "_queue.json")
packages/pt-control/generated/main.js:912:                    if (name === "_queue.json")
packages/pt-control/generated/main.js:1110:// _queue.json es legacy fallback, NO fuente primaria.
packages/pt-control/generated/main.js:1139:        // Legacy fallback: _queue.json (solo si flag habilitado)
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:302:    const nestedResult = res.result;
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:305:      nestedResult?.output ??
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:306:        nestedResult?.raw ??
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:314:      nestedResult?.status ??
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:318:        (nestedResult?.ok ?? res.ok ? 0 : 1),
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:321:    const sessionInfo = nestedResult?.session ?? res.session ?? {};
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:346:    if (!(nestedResult?.ok ?? res.ok) && errorText) {
packages/pt-control/src/adapters/runtime-terminal/response-parser.ts:365:      ok: Boolean(nestedResult?.ok ?? res.ok),
packages/pt-control/src/__tests__/bridge-doctor-command.test.ts:21:  test("ignora _queue.json al contar la cola", () => {
packages/pt-control/src/__tests__/bridge-doctor-command.test.ts:29:    writeFileSync(join(tempRoot, "commands", "_queue.json"), "[\"_queue.json\"]");
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
  ✓ [ℹ] Heartbeat estado: ok (842ms)
  ✗ [⚠] Bridge ready: no
  ✗ [⚠] Topología no materializada

Resumen: 8 OK, 2 warning, 0 critical
→ Revisar warnings para mejorar la operación.

⏱ pt doctor · 0.0s
```

## reset terminal prompt
```json
$ bun run --cwd apps/pt-cli start omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }
try { t.enterChar(13,0); } catch(e) {}
pause(250);
return JSON.stringify({ prompt: String(t.getPrompt()), mode: String(t.getMode()), input: String(t.getCommandInput()) });
"
$ bun run src/index.ts omni raw --wrap --yes --json -- "
var d = ipc.network().getDevice(\"SW-SRV-DIST\");
var t = d && d.getCommandLine ? d.getCommandLine() : null;
function pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }
try { t.enterChar(13,0); } catch(e) {}
pause(250);
return JSON.stringify({ prompt: String(t.getPrompt()), mode: String(t.getMode()), input: String(t.getCommandInput()) });
"
{
  "schemaVersion": "1.0",
  "ok": true,
  "action": "omni.raw",
  "capabilityId": "omni.evaluate.raw",
  "risk": "dangerous",
  "payload": {
    "codeBytes": 362,
    "codePreview": "(function() {\nvar d = ipc.network().getDevice(\"SW-SRV-DIST\");\nvar t = d && d.getCommandLine ? d.getCommandLine() : null;\nfunction pause(ms){ var s=Date.now(); while(Date.now()-s<ms){} }\ntry { t.enterChar(13,0); } catch(e) {}\npause(250);\nreturn JSON.stringify({ prompt: String(t.getPrompt()), mode: String(t.getMode()), input: String(t.getCommandInput()) });\n})()",
    "guard": "strict",
    "unsafe": false
  },
  "value": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\"}",
  "warnings": [],
  "evidence": {
    "rawResponse": {
      "protocolVersion": 2,
      "id": "cmd_000000018406",
      "seq": 18406,
      "type": "omni.evaluate.raw",
      "startedAt": 1777405044047,
      "completedAt": 1777405044468,
      "status": "completed",
      "ok": true,
      "value": {
        "ok": true,
        "result": "{\"prompt\":\"SW-SRV-DIST>\",\"mode\":\"user\",\"input\":\"\"}"
      },
      "timings": {
        "sentAt": 1777405043991,
        "resultSeenAt": 1777405044513,
        "receivedAt": 1777405044513,
        "waitMs": 522,
        "completedAtMs": 1777405044468
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


## show running-config
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
⏱ pt cmd · 15.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## show version
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
  "rawOutput": "show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST>",
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
      "sentAt": 1777405062176,
      "resultSeenAt": 1777405062339,
      "receivedAt": 1777405062339,
      "waitMs": 163,
      "completedAtMs": 1777405062310
    }
  },
  "timings": {
    "sentAt": 1777405062176,
    "resultSeenAt": 1777405062339,
    "receivedAt": 1777405062339,
    "waitMs": 163,
    "completedAtMs": 1777405062310
  }
}
⏱ pt cmd · 1.7s
```

## show ip interface brief
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
⏱ pt cmd · 30.6s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## show vlan brief
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show vlan brief" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show vlan brief" --json
{
  "schemaVersion": "1.0",
  "ok": false,
  "action": "cmd.exec",
  "device": "SW-SRV-DIST",
  "deviceKind": "ios",
  "command": "show vlan brief",
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
⏱ pt cmd · 30.5s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## show running-config
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
  "output": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5",
  "rawOutput": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n\nSW-SRV-DIST#\nSW-SRV-DIST#",
  "status": 0,
  "warnings": [],
  "nextSteps": [
    "pt cmd SW-SRV-DIST \"show running-config\"",
    "pt cmd SW-SRV-DIST \"show ip interface brief\""
  ],
  "evidence": {
    "timings": {
      "sentAt": 1777405126795,
      "resultSeenAt": 1777405127040,
      "receivedAt": 1777405127040,
      "waitMs": 245,
      "completedAtMs": 1777405127014
    }
  },
  "timings": {
    "sentAt": 1777405126795,
    "resultSeenAt": 1777405127040,
    "receivedAt": 1777405127040,
    "waitMs": 245,
    "completedAtMs": 1777405127014
  }
}
⏱ pt cmd · 2.0s
```

## latest result files
```

----- /Users/andresgaibor/pt-dev/results/cmd_000000018425.json -----
{
  "id": "cmd_000000018425",
  "seq": 18425,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true
}
{
  "done": true,
  "ok": true,
  "status": 0,
  "result": {
    "ok": true,
    "raw": "SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n\nSW-SRV-DIST#\nSW-SRV-DIST#  ",
    "status": 0,
    "session": {
      "mode": "privileged-exec",
      "prompt": "SW-SRV-DIST#",
      "paging": false,
      "awaitingConfirm": false
    }
  },
  "raw": "\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#\n\n\n\n\n\n\n\n\nSW-SRV-DIST con0 is now available\n\n\n\n\n\n\nPress RETURN to get started.\n\n\n\n\n\n\n\n\n\n\n\n\n\nSW-SRV-DIST>  show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST> show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nFastEthernet0/1        unassigned      YES manual up                    up \nFastEthernet0/2        unassigned      YES manual up                    up \nFastEthernet0/3        unassigned      YES manual up                    up \nFastEthernet0/4        unassigned      YES manual up                    up \nFastEthernet0/5        unassigned      YES manual up                    up \nFastEthernet0/6        unassigned      YES manual down                  down \nFastEthernet0/7        unassigned      YES manual down                  down \nFastEthernet0/8        unassigned      YES manual down                  down \nFastEthernet0/9        unassigned      YES manual down                  down \nFastEthernet0/10       unassigned      YES manual down                  down \nFastEthernet0/11       unassigned      YES manual down                  down \nFastEthernet0/12       unassigned      YES manual down                  down \nFastEthernet0/13       unassigned      YES manual down                  down \nFastEthernet0/14       unassigned      YES manual down                  down \nFastEthernet0/15       unassigned      YES manual down                  down \nFastEthernet0/16       unassigned      YES manual down                  down \nFastEthernet0/17       unassigned      YES manual down                  down \nFastEthernet0/18       unassigned      YES manual down                  down \nFastEthernet0/19       unassigned      YES manual down                  down \nFastEthernet0/20       unassigned      YES manual down                  down \nFastEthernet0/21       unassigned      YES manual down                  down \nFastEthernet0/22       unassigned      YES manual down                  down \nFastEthernet0/23       unassigned      YES manual down                  down \nFastEthernet0/24       unassigned      YES manual down                  down \nGigabitEthernet0/1     unassigned      YES manual up                    up \nGigabitEthernet0/2     unassigned      YES manual up                    up \nVlan1                  unassigned      YES manual administratively down down \nVlan99                 192.168.99.6    YES manual up                    up\nSW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>enable\nSW-SRV-DIST#SW-SRV-DIST#show running-config\nBuilding configuration...\n\nCurrent configuration : 2020 bytes\n!\nversion 12.2\nno service timestamps log datetime msec\nno service timestamps debug datetime msec\nno service password-encryption\n!\nhostname SW-SRV-DIST\n!\n!\n!\nno ip domain-lookup\n!\n!\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\ninterface FastEthernet0/1\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/2\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/3\n switchport access vlan 70\n switchport mode access\n spanning-tree portfast\n spanning-tree bpduguard enable\n!\ninterface FastEthernet0/4\n switchport trunk native vlan 999\n switchport trunk allowed vlan 80,99,999\n switchport mode trunk\n!\ninterface FastEthernet0/5\n\nSW-SRV-DIST#\nSW-SRV-DIST#  ",
  "output": "\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#\n\n\n\n\n\n\n\n\nSW-SRV-DIST con0 is now available\n\n\n\n\n\n\nPress RETURN to get started.\n\n\n\n\n\n\n\n\n\n\n\n\n\nSW-SRV-DIST>  show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (rev

----- /Users/andresgaibor/pt-dev/results/cmd_000000018424.json -----
{
  "id": "cmd_000000018424",
  "seq": 18424,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-9734abfb",
  "done": false,
  "state": "waiting-command",
  "currentStep": 1,
  "totalSteps": 2,
  "stepType": "command",
  "stepValue": "show running-config",
  "outputTail": "                 active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>enable\nSW-SRV-DIST#",
  "lastPrompt": "SW-SRV-DIST#",
  "lastMode": "privileged-exec",
  "waitingForCommandEnd": true,
  "updatedAt": 1777405126419,
  "ageMs": 1130,
  "idleMs": 0,
  "debug": [
    "1777405125359 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=70 idleMs=70",
    "1777405125432 native-tick reason=getJobState phase=waiting-ensure-mode waiting=true pending=set ageMs=143 idleMs=143",
    "1777405125441 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=152 idleMs=152",
    "1777405125493 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=204 idleMs=204",
    "1777405125679 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=390 idleMs=390",
    "1777405125698 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=409 idleMs=409",
    "1777405125790 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=501 idleMs=501",
    "1777405125794 native-fallback-enter reason=reapStaleJobs elapsedMs=501",
    "1777405125798 native-output-len=5769",
    "1777405125805 native-check command=\"privileged-exec\" prompt=\"SW-SRV-DIST#\" mode=\"privileged-exec\" blockLen=5769 complete=true promptOk=true pager=false blockHead=\"\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\" blockTail=\"             active    \\n999  NATIVA_TECNICA                   active    \\n1002 fddi-default                     active    \\n1003 token-ring-default               active    \\n1004 fddinet-default                  active    \\n1005 trnet-default                    active    \\nSW-SRV-DIST>enable\\nSW-SRV-DIST#\"",
    "1777405125900 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=611 idleMs=88",
    "1777405125908 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=619 idleMs=96",
    "1777405125955 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=666 idleMs=143",
    "1777405125993 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=704 idleMs=181",
    "1777405126151 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=862 idleMs=339",
    "1777405126291 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=1002 idleMs=479",
    "1777405126361 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=1072 idleMs=549",
    "1777405126371 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=1082 idleMs=559",
    "1777405126375 native-fallback-enter reason=reapStaleJobs elapsedMs=559",
    "1777405126380 native-output-len=6173"
  ],
  "stepResults": [
    {
      "stepIndex": 0,
      "stepType": "ensure-mode",
      "command": "privileged-exec",
      "raw": "\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#\n\n\n\n\n\n\n\n\nSW-SRV-DIST con0 is now available\n\n\n\n\n\n\nPress RETURN to get started.\n\n\n\n\n\n\n\n\n\n\n\n\n\nSW-SRV-DIST>  show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST> show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nFastEthernet0/1        unassigned      YES manual up                    up \nFastEthernet0/2        unassigned      YES manual up                    up \nFastEthernet0/3        unassigned      YES manual up                    up \nFastEthernet0/4        unassigned      YES manual up                    up \nFastEthernet0/5        unassigned      YES manual up                    up \nFastEthernet0/6        unassigned      YES manual down                  down \nFastEthernet0/7        unassigned      YES manual down                  down \nFastEthernet0/8        unassigned      YES manual down                  down \nFastEthernet0/9        unassigned      YES manual down                  down \nFastEthernet0/10       unassigned      YES manual down                  down \nFastEthernet0/11       unassigned      YES manual down                  down \nFastEthernet0/12       unassigned      YES manual down                  down \nFastEthernet0/13       unassigned      YES manual down                  down \nFastEthernet0/14       unassigned      YES manual down                  down \nFastEthernet0/15       unassigned      YES manual down                  down \nFastEthernet0/16       unassigned      YES manual down                  down \nFastEthernet0/17       unassigned      YES manual down                  down \nFastEthernet0/18       unassigned      YES manual down                  down \nFastEthernet0/19       unassigned      YES manual down                  down \nFastEthernet0/20       unassigned      YES manual down                  down \nFastEthernet0/21       unassigned      YES manual down                  down \nFastEthernet0/22       unassigned      YES manual down                  down \nFastEthernet0/23       unassigned      YES manual down                  down \nFastEthernet0/24       unassigned      YES manual down                  down \nGigabitEthernet0/1     unassigned      YES manual up                    up \nGigabitEthernet0/2     unassigned      YES manual up                    up \nVlan1                  unassigned      YES manual administratively down down \nVlan99                 192.168.99.6    YES manual up                    up\nSW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC            

----- /Users/andresgaibor/pt-dev/results/cmd_000000018423.json -----
{
  "id": "cmd_000000018423",
  "seq": 18423,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-9734abfb",
  "done": false,
  "state": "waiting-command",
  "currentStep": 1,
  "totalSteps": 2,
  "stepType": "command",
  "stepValue": "show running-config",
  "outputTail": "                 active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SRV-DIST>enable\nSW-SRV-DIST#",
  "lastPrompt": "SW-SRV-DIST#",
  "lastMode": "privileged-exec",
  "waitingForCommandEnd": true,
  "updatedAt": 1777405125812,
  "ageMs": 623,
  "idleMs": 100,
  "debug": [
    "1777405125359 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=70 idleMs=70",
    "1777405125432 native-tick reason=getJobState phase=waiting-ensure-mode waiting=true pending=set ageMs=143 idleMs=143",
    "1777405125441 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=152 idleMs=152",
    "1777405125493 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=204 idleMs=204",
    "1777405125679 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=390 idleMs=390",
    "1777405125698 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=409 idleMs=409",
    "1777405125790 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=501 idleMs=501",
    "1777405125794 native-fallback-enter reason=reapStaleJobs elapsedMs=501",
    "1777405125798 native-output-len=5769",
    "1777405125805 native-check command=\"privileged-exec\" prompt=\"SW-SRV-DIST#\" mode=\"privileged-exec\" blockLen=5769 complete=true promptOk=true pager=false blockHead=\"\\nCLEI Code Number                : COM3K00BRA\\nHardware Board Revision Number  : 0x01\\n\\n\\nSwitch   Ports  Model              SW Version              SW Image\\n------   -----  -----              ----------              ----------\\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\\n\" blockTail=\"             active    \\n999  NATIVA_TECNICA                   active    \\n1002 fddi-default                     active    \\n1003 token-ring-default               active    \\n1004 fddinet-default                  active    \\n1005 trnet-default                    active    \\nSW-SRV-DIST>enable\\nSW-SRV-DIST#\"",
    "1777405125900 native-tick reason=getJobState phase=waiting-command waiting=true pending=set ageMs=611 idleMs=88",
    "1777405125908 native-tick reason=reapStaleJobs phase=waiting-command waiting=true pending=set ageMs=619 idleMs=96"
  ],
  "stepResults": [
    {
      "stepIndex": 0,
      "stepType": "ensure-mode",
      "command": "privileged-exec",
      "raw": "\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST#\n\n\n\n\n\n\n\n\nSW-SRV-DIST con0 is now available\n\n\n\n\n\n\nPress RETURN to get started.\n\n\n\n\n\n\n\n\n\n\n\n\n\nSW-SRV-DIST>  show version\nCisco IOS Software, C2960 Software (C2960-LANBASE-M), Version 12.2(25)FX, RELEASE SOFTWARE (fc1)\nCopyright (c) 1986-2005 by Cisco Systems, Inc.\nCompiled Wed 12-Oct-05 22:05 by pt_team\n\nROM: C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)\n\nSystem returned to ROM by power-on\n\nCisco WS-C2960-24TT (RC32300) processor (revision C0) with 21039K bytes of memory.\n\n\n24 FastEthernet/IEEE 802.3 interface(s)\n2 Gigabit Ethernet/IEEE 802.3 interface(s)\n\n63488K bytes of flash-simulated non-volatile configuration memory.\nBase ethernet MAC Address       : 0060.703D.1315\nMotherboard assembly number     : 73-9832-06\nPower supply part number        : 341-0097-02\nMotherboard serial number       : FOC103248MJ\nPower supply serial number      : DCA102133JA\nModel revision number           : B0\nMotherboard revision number     : C0\nModel number                    : WS-C2960-24TT\nSystem serial number            : FOC1033Z1EY\nTop Assembly Part Number        : 800-26671-02\nTop Assembly Revision Number    : B0\nVersion ID                      : V02\nCLEI Code Number                : COM3K00BRA\nHardware Board Revision Number  : 0x01\n\n\nSwitch   Ports  Model              SW Version              SW Image\n------   -----  -----              ----------              ----------\n*    1   26     WS-C2960-24TT      12.2                    C2960-LANBASE-M\n\nConfiguration register is 0xF\n\n\nSW-SRV-DIST> show ip interface brief\nInterface              IP-Address      OK? Method Status                Protocol \nFastEthernet0/1        unassigned      YES manual up                    up \nFastEthernet0/2        unassigned      YES manual up                    up \nFastEthernet0/3        unassigned      YES manual up                    up \nFastEthernet0/4        unassigned      YES manual up                    up \nFastEthernet0/5        unassigned      YES manual up                    up \nFastEthernet0/6        unassigned      YES manual down                  down \nFastEthernet0/7        unassigned      YES manual down                  down \nFastEthernet0/8        unassigned      YES manual down                  down \nFastEthernet0/9        unassigned      YES manual down                  down \nFastEthernet0/10       unassigned      YES manual down                  down \nFastEthernet0/11       unassigned      YES manual down                  down \nFastEthernet0/12       unassigned      YES manual down                  down \nFastEthernet0/13       unassigned      YES manual down                  down \nFastEthernet0/14       unassigned      YES manual down                  down \nFastEthernet0/15       unassigned      YES manual down                  down \nFastEthernet0/16       unassigned      YES manual down                  down \nFastEthernet0/17       unassigned      YES manual down                  down \nFastEthernet0/18       unassigned      YES manual down                  down \nFastEthernet0/19       unassigned      YES manual down                  down \nFastEthernet0/20       unassigned      YES manual down                  down \nFastEthernet0/21       unassigned      YES manual down                  down \nFastEthernet0/22       unassigned      YES manual down                  down \nFastEthernet0/23       unassigned      YES manual down                  down \nFastEthernet0/24       unassigned      YES manual down                  down \nGigabitEthernet0/1     unassigned      YES manual up                    up \nGigabitEthernet0/2     unassigned      YES manual up                    up \nVlan1                  unassigned      YES manual administratively down down \nVlan99                 192.168.99.6    YES manual up                    up\nSW-SRV-DIST>show vlan brief\n\nVLAN Name                             Status    Ports\n---- -------------------------------- --------- -------------------------------\n1    default                          active    Fa0/6, Fa0/7, Fa0/8, Fa0/9\n                                                Fa0/10, Fa0/11, Fa0/12, Fa0/13\n                                                Fa0/14, Fa0/15, Fa0/16, Fa0/17\n                                                Fa0/18, Fa0/19, Fa0/20, Fa0/21\n                                                Fa0/22, Fa0/23, Fa0/24\n10   DIRECTIVOS                       active    \n15   JURIDICA                         active    \n20   FINANZAS                         active    \n25   TALENTO                          active    \n30   TIC                              active    \n40   TECNICA                          active    \n50   COMERCIAL                        active    \n60   SERV_GRAL                        active    \n70   SERVIDORES                       active    Fa0/1, Fa0/2, Fa0/3\n80   VOZ                              active    \n90   WIFI_DIRECTIVOS                  active    \n99   MGMT                             active    \n100  WIFI_EMPLEADOS                   active    \n110  WIFI_TIC                         active    \n120  WIFI_INVITADOS                   active    \n130  IOT                              active    \n999  NATIVA_TECNICA                   active    \n1002 fddi-default                     active    \n1003 token-ring-default               active    \n1004 fddinet-default                  active    \n1005 trnet-default                    active    \nSW-SR

----- /Users/andresgaibor/pt-dev/results/cmd_000000018422.json -----
{
  "id": "cmd_000000018422",
  "seq": 18422,
  "type": "__pollDeferred",
  "status": "completed",
  "ok": true
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-9734abfb",
  "done": false,
  "state": "waiting-ensure-mode",
  "currentStep": 0,
  "totalSteps": 2,
  "stepType": "ensure-mode",
  "stepValue": "privileged-exec",
  "outputTail": "",
  "lastPrompt": "SW-SRV-DIST>",
  "lastMode": "user-exec",
  "waitingForCommandEnd": true,
  "updatedAt": 1777405125289,
  "ageMs": 156,
  "idleMs": 156,
  "debug": [
    "1777405125359 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=70 idleMs=70",
    "1777405125432 native-tick reason=getJobState phase=waiting-ensure-mode waiting=true pending=set ageMs=143 idleMs=143",
    "1777405125441 native-tick reason=reapStaleJobs phase=waiting-ensure-mode waiting=true pending=set ageMs=152 idleMs=152"
  ],
  "stepResults": []
}

----- /Users/andresgaibor/pt-dev/results/cmd_000000018421.json -----
{
  "id": "cmd_000000018421",
  "seq": 18421,
  "type": "terminal.plan.run",
  "status": "completed",
  "ok": true
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-9734abfb",
  "job": {
    "id": "cmd-9734abfb",
    "kind": "ios-session",
    "version": 1,
    "device": "SW-SRV-DIST",
    "plan": [
      {
        "type": "ensure-mode",
        "kind": "ensure-mode",
        "value": "privileged-exec",
        "expectMode": "privileged-exec",
        "allowPager": true,
        "allowConfirm": false,
        "optional": false,
        "timeoutMs": 12000,
        "options": {
          "timeoutMs": 12000
        },
        "metadata": {
          "reason": "auto-enable-for-privileged-ios-command"
        }
      },
      {
        "type": "command",
        "kind": "command",
        "value": "show running-config",
        "command": "show running-config",
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018420.json -----
{
  "id": "cmd_000000018420",
  "seq": 18420,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018418.json -----
{
  "id": "cmd_000000018418",
  "seq": 18418,
  "type": "terminal.plan.run",
  "status": "completed",
  "ok": true
}
{
  "ok": true,
  "deferred": true,
  "ticket": "cmd-0a782882",
  "job": {
    "id": "cmd-0a782882",
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

----- /Users/andresgaibor/pt-dev/results/cmd_000000018417.json -----
{
  "id": "cmd_000000018417",
  "seq": 18417,
  "type": "inspectDeviceFast",
  "status": "completed",
  "ok": true
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
```
