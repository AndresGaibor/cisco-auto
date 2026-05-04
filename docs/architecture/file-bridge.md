# Arquitectura File-Bridge

## Propósito

File-Bridge es la capa de comunicación por filesystem entre la CLI (`pt-control`) y el runtime de Packet Tracer (`pt-runtime`). Usa archivos JSON como cola de mensajes, aprovechando las APIs de filesystem de PT Script Module.

## Estructura de Directorios

```
PT_DEV_DIR/
├── commands/           # Comandos enviados por CLI → PT (input)
├── in-flight/          # Comandos siendo procesados por PT
├── results/            # Resultados de PT → CLI (output)
├── dead-letter/        # Comandos fallidos definitivamente
├── logs/               # Logs NDJSON del runtime
├── events.ndjson       # Seqlog de eventos del bridge
├── heartbeat.json     # Heartbeat del runtime
├── lease.lock          # Lock de exclusión mutua
├── state.json          # Estado global del runtime
└── sequence-store      # Archivo de secuencia para IDs
```

## Capas y sus Dependencias

```
┌─────────────────────────────────────────────────────────┐
│  pt-control (CLI)                                       │
│  ├── BridgeCommandClient (sendCommand)                  │
│  └── BridgeResultResolver (waitForResult)              │
└────────────────────┬────────────────────────────────────┘
                     │ escritura atómica de archivos JSON
                     ▼
┌─────────────────────────────────────────────────────────┐
│  File System (PT_DEV_DIR)                               │
│  └── commands/, in-flight/, results/                    │
└────────────────────┬────────────────────────────────────┘
                     │ lectura de archivos
                     ▼
┌─────────────────────────────────────────────────────────┐
│  pt-runtime (dentro de Packet Tracer)                   │
│  ├── CommandQueue (polling de commands/)                 │
│  ├── ExecutionEngine (procesa comandos)                  │
│  └── ResultWriter (escribe en results/)                  │
└─────────────────────────────────────────────────────────┘
```

## Módulos Principales

### BridgeCommandClient (`src/v2/bridge-command-client.ts`)

Cliente que envía comandos desde la CLI:

- `sendCommand(type, payload, expiresAtMs?)` → `BridgeCommandEnvelope`
- `validateCommandInput()` — validación antes de escribir
- `checksumOf()` — SHA256 del payload
- Escritura atómica via `atomicWriteFile()`

**NO puede importar de:** `pt-control`, `pt-runtime`, `ios-domain`

### BridgeResultResolver (`src/v2/bridge-command-client.ts`)

Espera resultados con polling exponencial:

- `waitForResult(envelope, timeout)` → `BridgeResultEnvelope`
- Backoff exponencial: 5ms → 200ms máximo
- Manejo de `deferred` (comandos que devuelven ticket)

### BridgePathLayout (`src/shared/path-layout.ts`)

Centraliza todos los paths del filesystem:

```typescript
paths.commandsDir()      // → commands/
paths.inFlightDir()      // → in-flight/
paths.resultsDir()       // → results/
paths.deadLetterDir()    // → dead-letter/
paths.resultFilePath(id) // → results/{id}.json
```

### BackpressureManager (`src/backpressure-manager.js`)

Previene saturación de la cola:

- `checkCapacity()` — lanza error si hay overflow
- `waitForCapacity(timeoutMs?)` — espera espacio disponible
- `getStats()` — retorna `{maxPending, currentPending, availableCapacity}`

### BridgeLifecycle (`src/v2/bridge-lifecycle.ts`)

Gestiona el startup/shutdown del bridge:

- Valida lease antes de operar
- Asegura que directorios existan
- Limpia archivos huérfanos en `in-flight/`

### LeaseManager (`src/v2/lease-manager.ts`)

Exclusión mutua entre múltiples procesos CLI:

- Solo un proceso puede tener el lease activo
- Valida lease al iniciar comando nuevo
- Timeout delease si el holder crashpea

## Flujo de un Comando

```
1. CLI: bridgeCommandClient.sendCommand("device.list", {})
2. BridgeCommandClient:
   - Valida input
   - Calcula seq = nextSeq()
   - Genera id = cmd_{seq}
   - atomicWriteFile(commands/{seq}_device-list.json, envelope)
   - appendEvent("command-enqueued")
3. PT Runtime:
   - CommandQueue.poll() → lee archivo
   - Mueve archivo a in-flight/
   - ExecutionEngine.execute(handler, payload)
   - ResultWriter.writeResult(id, result)
4. CLI:
   - BridgeResultResolver.waitForResult(envelope, timeout)
   - Polling de results/{id}.json
```

## Reglas de Dependencia

| Paquete | Puede importar |
|---------|---------------|
| `file-bridge` | `@cisco-auto/types` (solo tipos) |
| `file-bridge` | `node:fs` (filesystem) |
| `file-bridge` | `node:path`, `node:crypto` (helpers) |
| **NO** | `pt-control`, `pt-runtime`, `ios-domain`, `pt-control` internals |

## Errores Comunes a Evitar

### 1. No bloquear en `sendCommand`

`sendCommand` es fire-and-forget. Para esperar resultado usar `waitForResult`.

### 2. No escribir en in-flight/

Solo PT runtime mueve comandos a `in-flight/`. La CLI solo escribe en `commands/`.

### 3. No asumir que result existe

Si el archivo no existe → polling con backoff. Si timeout → tratar como error.

## Debugging

```bash
# Ver cola de comandos
ls -la ~/pt-dev/commands/

# Ver resultados pendientes
ls -la ~/pt-dev/results/

# Ver eventos del bridge
cat ~/pt-dev/events.ndjson | tail -20

# Ver heartbeat
cat ~/pt-dev/heartbeat.json
```