# FileBridge Improvement Plan

> Plan de implementación para mejorar el file-bridge de cisco-auto.
> Generado: 2026-06-22

---

## Arquitectura Actual

El file-bridge es un bridge de IPC basado en filesystem entre la CLI (Bun/Node.js) y el Script Engine de Packet Tracer.

### Componentes principales

```
packages/file-bridge/src/
├── file-bridge-v2.ts           # Orquestador principal + state machine
├── file-bridge-v2-commands.ts  # pushCommands helper
├── backpressure-manager.ts      # Control de flujo
├── event-log-writer.ts         # Journal NDJSON
├── durable-ndjson-consumer.ts  # Consumidor durable
├── shared-result-watcher.ts    # Watcher compartido de resultados
├── shared/
│   ├── path-layout.ts          # Estructura de directorios
│   ├── protocol.ts             # Tipos del protocolo
│   ├── sequence-store.ts        # Secuencias monotonic
│   ├── fs-atomic.ts             # Escritura atómica
│   ├── fs-atomic-async.ts       # Versiones async
│   ├── fs-retry.ts              # Retry con exponential backoff
│   ├── readdir-cache.ts         # Cache de readdir con TTL
│   └── bridge-file-classifier.ts
└── v2/
    ├── bridge-lifecycle.ts     # State machine del bridge
    ├── command-processor.ts     # Procesador de comandos
    ├── bridge-command-client.ts # Cliente de comandos
    ├── lease-manager.ts         # Lease de instancia única
    ├── crash-recovery.ts        # Recuperación de crashes
    ├── garbage-collector.ts    # Limpieza automática
    ├── diagnostics.ts           # Health monitoring
    ├── monitoring-service.ts    # Auto-snapshot, heartbeat, auto-GC
    └── bridge-status-service.ts
```

---

## Resumen de Fases

| Fase | Nombre | Prioridad | Estado |
|------|--------|-----------|--------|
| 1 | Robustez | **Alta** | Pendiente |
| 2 | Performance | **Alta** | Pendiente |
| 3 | HTTP Bridge | **Alta** | Pendiente |
| 4 | Priority Queue & Transactions | **Media** | Pendiente |
| 5 | Observabilidad | **Media** | Pendiente |

---

## Fase 1: Robustez

**Objetivo**: Corregir problemas de confiabilidad sin cambiar comportamiento observable.

### 1.1 — Reemplazar `require()` dinámicos con imports estáticos

**Problema**: Múltiples archivos usan `require()` inline o `await import()` para módulos de Node.js. Frágil en Bun/ESM, oculta errores en compilación.

**Archivos a modificar**:

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `file-bridge-v2.ts` | L1087-1088 | `const { atomicWriteFile } = await import(...)` → import estático |
| `file-bridge-v2.ts` | L1094 | `const { readFileSync } = await import(...)` → import estático |
| `shared-result-watcher.ts` | L19 | Importar `existsSync`, `readdirSync` estáticamente |
| `monitoring-service.ts` | L117, 148, 217 | `require("node:fs")` → imports al tope |
| `readdir-cache.ts` | L219, 224 | `require("node:fs")` → `import { readdirSync, statSync } from "node:fs"` |

**Validación**: `bun run typecheck` pasa sin errores.

---

### 1.2 — Validar tamaño de payload antes de escribir

**Problema**: Payloads enormes llenan el FS sin advertencia.

**Archivo**: `bridge-command-client.ts` — dentro de `sendCommand()`.

**Cambio**: Agregar después de `validateCommandInput()`:

```typescript
const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1MB
const serialized = JSON.stringify(payload);
if (serialized.length > MAX_PAYLOAD_BYTES) {
  throw new Error(`[bridge] payload too large: ${serialized.length} bytes (max: ${MAX_PAYLOAD_BYTES})`);
}
```

Opcional: exponer `maxPayloadBytes` como opción configurada.

**Validación**: `bun test packages/file-bridge/tests/file-bridge-v2.test.ts` — agregar test que verifique que payloads >1MB lancen error.

---

### 1.3 — Silent catch blocks → emitir eventos de warning

**Problema**: `catch {}` sin logs dificulta el debugging.

**Archivos y cambios**:

| Archivo | Línea | Contexto | Cambio |
|---------|-------|----------|--------|
| `command-processor.ts` | 568 | `moveToDeadLetter` catch rename | `console.warn()` o `emit("dead-letter-error", ...)` |
| `bridge-command-client.ts` | 249 | Timeout cleanup catch | `console.warn("[bridge] timeout cleanup failed: ...")` |
| `shared-result-watcher.ts` | 147 | `stopFsWatcherOnly` catch close | `this.emit("watcher-close-error", err)` |
| `event-log-writer.ts` | (buscar) | Append catch | Emitir evento `log-write-error` |
| `crash-recovery.ts` | (buscar) | Catch silently ignored | Agregar `console.warn()` |

**Validación**: `bun test packages/file-bridge/tests/` pasa.

---

### 1.4 — Detección de `ENOSPC` (disco lleno)

**Problema**: Cuando el disco se llena, el error es genérico y no permite distinguir de otros fallos.

**Archivo**: `fs-atomic.ts`

**Cambios**:

1. Crear helper:

```typescript
export function isDiskFullError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException)?.code;
  return code === "ENOSPC" || code === "EDQUOT";
}
```

2. En `atomicWriteFile()`: detect `ENOSPC` y lanzar `DiskFullError` (nuevo tipo).

3. En `FileBridgeV2.start()`: registrar handler que emita evento `disk-full` y pueda pausar operaciones.

4. Crear `DiskFullError` class:

```typescript
export class DiskFullError extends Error {
  constructor(message: string = "Disk full or quota exceeded") {
    super(message);
    this.name = "DiskFullError";
  }
}
```

**Validación**: `bun test packages/file-bridge/tests/` pasa.

---

### 1.5 — Cachear `getPendingCount()` con invalidación explícita

**Problema**: `getPendingCount()` hace `readdirSync` en cada `checkCapacity()`, bloqueando el event loop.

**Archivo**: `backpressure-manager.ts`

**Cambios**:

1. Agregar campo:

```typescript
private cachedPendingCount: number | null = null;
private cacheValid = false;
```

2. Modificar `getPendingCount()`:

```typescript
getPendingCount(): number {
  if (this.cacheValid) {
    return this.cachedPendingCount!;
  }
  // ... existing logic ...
  const count = commands + inFlight;
  this.cachedPendingCount = count;
  this.cacheValid = true;
  return count;
}
```

3. Agregar método `invalidateCache()`:

```typescript
invalidateCache(): void {
  this.cacheValid = false;
  this.cachedPendingCount = null;
}
```

4. Llamar `backpressure.invalidateCache()` desde:
   - `CommandProcessor.publishResult()` (al completar comando)
   - `BridgeCommandClient.sendCommand()` (al encolar comando)
   - `CrashRecovery.recover()` (al re-encolar comandos)

**Validación**: `bun test packages/file-bridge/tests/backpressure.test.ts` pasa.

---

### 1.6 — Hacer `getBusyDevices()` async con `Promise.all`

**Problema**: `getBusyDevices()` lee TODOS los archivos de commands/ e in-flight/ secuencialmente con `readFileSync`. Bloquea event loop.

**Archivo**: `backpressure-manager.ts`

**Cambios**:

1. Crear `getBusyDevicesAsync()`:

```typescript
async getBusyDevicesAsync(): Promise<Set<string>> {
  const busy = new Set<string>();
  try {
    const commandsDir = this.paths.commandsDir();
    const inFlightDir = this.paths.inFlightDir();

    const files = [
      ...readdirSync(commandsDir).filter(isBridgeCommandFile),
      ...readdirSync(inFlightDir).filter(isBridgeCommandFile),
    ].map(f => join(commandsDir, f));

    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const content = await readFileAsync(file, "utf8");
          const envelope = JSON.parse(content);
          const payload = envelope.payload || {};
          const device = payload.device || payload.deviceName || payload.deviceId;
          return typeof device === "string" && device.trim() ? device.trim() : null;
        } catch {
          return null;
        }
      })
    );

    for (const device of results) {
      if (device) busy.add(device);
    }
  } catch {}
  return busy;
}
```

2. Crear `checkDeviceCapacityAsync()`:

```typescript
async checkDeviceCapacityAsync(device: string): Promise<void> {
  const busy = await this.getBusyDevicesAsync();
  if (busy.has(device.trim())) {
    throw new BackpressureError(
      `Device '${device}' is busy...`,
      busy.size,
      this.config.maxPending,
    );
  }
}
```

3. En `BridgeCommandClient.sendCommand()`, cambiar `backpressure.checkDeviceCapacity(device)` a versión async con `await`.

**Validación**: `bun test packages/file-bridge/tests/backpressure.test.ts` pasa.

---

## Fase 2: Performance

**Objetivo**: Reducir I/O bloqueante y mejorar throughput.

### 2.1 — Integrar `readJsonFileAsync` en hot paths

- `sendCommandAndWait()` polling loop usa `readFileSync` → migrar a `readFileAsync`
- `CommandProcessor.claimAndReadEnvelope()` tiene versión async pero no se usa en el polling

### 2.2 — Optimizar `scanResultsDir()` con filtro por filename

- `SharedResultWatcher.scanResultsDir()` hace `readdirSync` completo → filtrar solo archivos `.json` en el filesystem ya que el PathResolver solo trabaja con extensiones .json

### 2.3 — SequenceStore lock contention

- `SequenceStore` usa `O_EXCL` para locking. En alta contención, puede generar retry storms.
- Considerar: batch sequences (pedir 10 secuencias de una vez) para reducir lock acquisitions.

### 2.4 — Parallelizar GC

- `GarbageCollector.collect()` procesa archivos secuencialmente.
- Parallelizar con `Promise.all` para archivos independientes.

---

## Fase 3: HTTP Bridge

**Objetivo**: Crear transporte HTTP/WS complementario al filesystem.

### Estructura propuesta

```
packages/http-bridge/
├── src/
│   ├── index.ts              # HttpBridge class (export)
│   ├── server.ts              # Hono/Express server setup
│   ├── router.ts              # Route handlers
│   ├── middleware/
│   │   ├── auth.ts            # API key / token auth
│   │   ├── rate-limit.ts      # Rate limiting per client
│   │   └── error-handler.ts   # Error handling
│   ├── handlers/
│   │   ├── command.ts         # POST /command
│   │   ├── result.ts          # GET /result/:id
│   │   └── health.ts          # GET /health
│   ├── websocket.ts           # WebSocket para eventos
│   └── client/
│       ├── index.ts           # HttpBridgeClient
│       └── errors.ts          # Client errors
├── tests/
│   └── server.test.ts
└── package.json
```

### Endpoints

```
POST   /api/v1/command              # sendCommand
POST   /api/v1/command-and-wait     # sendCommandAndWait (long-poll o streaming)
GET    /api/v1/result/:id           # Get result by command ID
GET    /api/v1/health               # Bridge diagnostics
GET    /api/v1/metrics              # Performance metrics
WS     /api/v1/events               # Real-time event stream
POST   /api/v1/runtime/load         # Load runtime code
GET    /api/v1/status               # Bridge status
```

### Dependencias sugeridas

- `hono` (lightweight, edge-ready)
- `@hono/node-server` o ` Bun.serve` native
- `ws` para WebSocket

---

## Fase 4: Priority Queue & Transactions

### 4.1 — Priority queue

Agregar campo `priority: number` (default 0) a `BridgeCommandEnvelope`.

En `CommandProcessor.pickNextCommand()`: ordenar por `(priority DESC, seq ASC)`.

### 4.2 — Command batching

Nuevo tipo de payload: `batch` que contiene N comandos a ejecutar atómicamente.

El `CommandProcessor` detecta tipo `batch` y ejecuta cada sub-comando en orden, revertiendo si uno falla (compensating actions).

### 4.3 — Rollback capability

Mantener un journal de operaciones inversas. Nuevo servicio `RollbackManager`.

---

## Fase 5: Observabilidad

### 5.1 — Structured logging

Reemplazar `debugLog()` y `console.warn()` con logger estructurado (pino o bunyan).

Agregar correlation IDs a cada comando para tracing end-to-end.

### 5.2 — Prometheus metrics endpoint

Exportar métricas en formato Prometheus en `/metrics`.

Métricas clave:
- `bridge_commands_pending` (gauge)
- `bridge_commands_total` (counter, labels: type, status)
- `bridge_command_duration_seconds` (histogram)
- `bridge_backpressure_utilization_percent` (gauge)
- `bridge_fs_write_duration_seconds` (histogram)

### 5.3 — Health check HTTP endpoint

Endpoint `/health` para Docker/K8s readiness probes.

```json
{
  "status": "healthy|degraded|unhealthy",
  "checks": {
    "lease": "ok|stale|missing",
    "diskSpace": "ok|low|critical",
    "heartbeat": "ok|stale|missing"
  }
}
```

### 5.4 — OpenTelemetry tracing

Integrar con OpenTelemetry para distributed tracing.

---

## Dependencias entre fases

```
Fase 1 ──────────────────────────────────────────────▶ Fase 2
  │                                                      │
  │  (1.1 static imports habilitan refactors)          │
  │                                                      │
Fase 1 ───────────────────────▶ Fase 3 ──────────────▶ Fase 5
  │   (1.2 payload validation    (HTTP Bridge)     (Observability
  │    se reutiliza en HTTP)          │                   habilita metrics)
  │                                   │
Fase 1 ───────▶ Fase 4 ─────────────┘
  (1.3 silent catches
   se reutiliza en todos)
```

---

## Validación común

Cada fase debe pasar:

```bash
bun run typecheck
bun test packages/file-bridge/tests/
```

Para cambios de performance:

```bash
bun test packages/file-bridge/tests/ --trace
```
