# invalid ios command fast error

Fecha: Tue Apr 28 18:09:57 -05 2026

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
  "deviceKind": "unknown",
  "command": "show version2",
  "output": "",
  "rawOutput": "",
  "status": 1,
  "warnings": [
    "Ejecuta `bun run pt device list --json` para ver los nombres exactos de dispositivos.",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta.",
    "Heartbeat stale; Packet Tracer puede no estar respondiendo."
  ],
  "error": {
    "code": "DEVICE_NOT_FOUND_OR_UNSUPPORTED",
    "message": "No se encontró el dispositivo \"SW-SRV-DIST\" o no se pudo determinar si usa IOS/terminal host."
  },
  "nextSteps": [
    "pt doctor"
  ]
}
⏱ pt cmd · 60.3s
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
  "deviceKind": "unknown",
  "command": "show version 2",
  "output": "",
  "rawOutput": "",
  "status": 1,
  "warnings": [
    "Ejecuta `bun run pt device list --json` para ver los nombres exactos de dispositivos.",
    "Topología virtual aún no materializada; la verificación de estado puede ser incompleta.",
    "Heartbeat stale; Packet Tracer puede no estar respondiendo."
  ],
  "error": {
    "code": "DEVICE_NOT_FOUND_OR_UNSUPPORTED",
    "message": "No se encontró el dispositivo \"SW-SRV-DIST\" o no se pudo determinar si usa IOS/terminal host."
  },
  "nextSteps": [
    "pt doctor"
  ]
}
⏱ pt cmd · 60.3s
error: script "start" exited with code 1
error: script "pt" exited with code 1
```

## valid sanity
```json
$ bun run --cwd apps/pt-cli start cmd SW-SRV-DIST "show version" --json
$ bun run src/index.ts cmd SW-SRV-DIST "show version" --json
