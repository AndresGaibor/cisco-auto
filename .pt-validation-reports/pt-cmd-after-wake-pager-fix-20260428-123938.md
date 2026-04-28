# pt cmd after wake/pager fix

Fecha: Tue Apr 28 12:39:38 -05 2026

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

## doctor
```

═══ Diagnóstico del sistema ═══

  ✓ [ℹ] Directorio pt-dev accesible: /Users/andresgaibor/pt-dev
  ✓ [ℹ] Directorio de logs accesible: /Users/andresgaibor/pt-dev/logs
  ✓ [ℹ] Directorio de historial accesible: /Users/andresgaibor/pt-dev/history
  ✓ [ℹ] Directorio de resultados accesible: /Users/andresgaibor/pt-dev/results
  ✓ [ℹ] Archivos de runtime presentes: main.js, runtime.js
  ✗ [🔴] Queue: 1 queued / 0 in-flight / 22 dead-letter
  ✓ [ℹ] Heartbeat encontrado
  ✓ [ℹ] Heartbeat estado: ok (2498ms)
  ✗ [⚠] Bridge ready: no
  ✗ [⚠] Topología no materializada

Resumen: 7 OK, 2 warning, 1 critical
→ Acción requerida: hay problemas críticos.

⏱ pt doctor · 0.0s
```

## show version
```json
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
⏱ pt cmd · 29.8s
```

## logs relevantes
```
```
