# FileBridge V2

Sistema de comunicación basado en archivos para controlar Packet Tracer. Reemplaza el servidor HTTP Bridge Server (puerto 54321).

## Arquitectura

```
CLI ──writes──> commands/*.json ──PT reads──> executes
                     │                        │
                     │                        │
CLI <──reads── results/<id>.json <──PT writes─┘
```

- **Sin red**: No requiere puerto HTTP, solo acceso filesystem
- **Persistencia**: Comandos sobreviven reinicios de CLI/PT
- **Crash recovery**: Reconciliación automática de estado inconsistente
- **Lease**: Solo una instancia CLI puede procesar comandos

## Estructura de Directorios

```
$PT_DEV_DIR/
├── commands/              # Cola de comandos pendientes
│   └── {seq:012}-addDevice.json
├── in-flight/             # Comandos en ejecución por PT
│   └── {seq:012}-addDevice.json
├── results/               # Resultados autoritativos
│   └── cmd_000000000001.json
├── logs/                  # Event log NDJSON
│   ├── events.current.ndjson
│   └── events.{timestamp}.ndjson
├── sessions/              # Estado de sesiones IOS
├── consumer-state/        # Checkpoints de consumers NDJSON
├── dead-letter/           # Archivos corruptos en cuarentena
├── bridge-lease.json      # Lease para instancia única
├── protocol.seq.json       # Secuencia global
└── runtime.js             # Runtime de PT
```

## Protocolo

### Command Envelope (CLI → PT)

```typescript
{
  "protocolVersion": 2,
  "id": "cmd_000000000001",
  "seq": 1,
  "createdAt": 1234567890,
  "type": "configIos",
  "payload": { device: "Router1", commands: ["hostname Foo"] },
  "attempt": 1,
  "checksum": "sha256:abc123..."
}
```

### Result Envelope (PT → CLI)

```typescript
{
  "protocolVersion": 2,
  "id": "cmd_000000000001",
  "status": "completed",
  "ok": true,
  "value": { ok: true, device: "Router1", executed: 1 },
  "completedAt": 1234567950,
  "durationMs": 560
}
```

## Uso

### pushCommands (CLI → PT)

```typescript
import { pushCommands } from '@cisco-auto/pt-control-v2';

const result = await pushCommands('Router1', [
  'interface GigabitEthernet0/0',
  'ip address 192.168.1.1 255.255.255.0',
  'no shutdown'
]);

if (result.success) {
  console.log('Comandos aplicados');
} else {
  console.error('Error:', result.error);
}
```

### PTController (Alto nivel)

```typescript
import { PTController } from '@cisco-auto/pt-control-v2';

const controller = new PTController({ devDir: '/path/to/pt-dev' });
await controller.start();

await controller.configIos('Router1', ['hostname Foo']);
await controller.addDevice('PC1', 'PC');
await controller.addLink('PC1', 'FastEthernet0', 'Router1', 'GigabitEthernet0/0');

await controller.stop();
```

## Recovery Automático

Al iniciar, FileBridge V2 reconcilia estado inconsistente:

1. **In-flight recovery**: Comandos en `in-flight/` sin resultado → re-encola o marca timeout
2. **Expiry**: Comandos en cola >10 min sin procesar → timeout
3. **Checksum**: Verifica integridad de payloads
4. **Quarantine**: Archivos JSON corruptos → `dead-letter/`

## Event Log

Todos los eventos se registran en `logs/events.current.ndjson`:

```jsonl
{"seq":1,"ts":1234567890,"type":"command-enqueued","id":"cmd_000000000001"}
{"seq":2,"ts":1234567891,"type":"command-picked","id":"cmd_000000000001"}
{"seq":3,"ts":1234567950,"type":"command-completed","id":"cmd_000000000001","ok":true}
```

Ver eventos en vivo:
```bash
tail -f $PT_DEV_DIR/logs/events.current.ndjson | jq .
```

## lease

Solo una instancia CLI puede procesar comandos. El lease se renueva cada 1s con TTL de 5s.

```
$ cat ~/pt-dev/bridge-lease.json
{
  "ownerId": "uuid-del-proceso",
  "pid": 12345,
  "hostname": "mi-mac.local",
  "startedAt": 1234567890,
  "expiresAt": 1234567895,
  "ttlMs": 5000,
  "version": "2.0.0"
}
```

## Garbage Collection

`bridge.gc()` limpia:
- Resultados >24h
- Logs rotados >7 días (si ningún consumer los necesita)

## Diferencias con Bridge Server (v1)

| Aspecto | v1 (HTTP) | v2 (FileBridge) |
|---------|-----------|-----------------|
| Transporte | HTTP :54321 | Archivos filesystem |
| Cola | Un solo `command.json` | Directorio `commands/` |
| Persistencia | Ninguna | Completa (crash-safe) |
| Multi-instance | No soportado | Lease-based |
| Recovery | Manual | Automático |
| Debug | Logs HTTP | Archivos legibles |

## Exports

```typescript
// Alto nivel
export { PTController, createPTController, createDefaultPTController } from './controller/index.js';

// FileBridge V2
export { FileBridgeV2 } from './infrastructure/pt/file-bridge-v2.js';
export { pushCommands, pushCode, type PushResult } from './infrastructure/pt/file-bridge-v2-commands.js';

// Tipos
export type { FileBridgePort } from './application/ports/file-bridge.port.js';
export type { BridgeCommandEnvelope, BridgeResultEnvelope, BridgeEvent } from './infrastructure/pt/shared/protocol.js';
```
