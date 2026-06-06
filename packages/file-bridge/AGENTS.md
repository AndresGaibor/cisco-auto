# AGENTS.md — @cisco-auto/file-bridge

> Guía de desarrollo para agentes de IA que trabajan en file-bridge.

## Propósito

Bridge por filesystem entre CLI y Packet Tracer. IPC asíncrono basado en archivos: comandos → `commands/`, resultados → `results/`, logs → `logs/`.

## Arquitectura

```
src/
├── index.ts                  # Re-exports barrel
├── file-bridge-v2.ts         # Core bridge (566 lines)
├── file-bridge-v2-commands.ts
├── bridge-lifecycle.ts (v2/) # State machine lifecycle
├── command-processor.ts (v2/)# Processor de comandos (641 lines)
├── crash-recovery.ts (v2/)   # Recovery de in-flight
├── lease-manager.ts (v2/)    # Gestión de leases
├── backpressure-manager.ts   # Control de recursos
├── circuit-breaker.ts        # Circuit breaker pattern
├── shared/                   # Protocolo, path-layout, fs-atomic, file-classifier
├── durable-ndjson-consumer.ts# Consumidor NDJSON durable
├── event-log-writer.ts       # Escritura de eventos
├── file-bridge-metrics.ts    # Métricas del bridge
├── gc.ts                     # Garbage collector
└── __tests__/
```

## Exports principales

```typescript
export { FileBridgeV2 } from "./file-bridge-v2.js";
export { BridgeLifecycle } from "./v2/bridge-lifecycle.js";
export { BackpressureManager } from "./backpressure-manager.js";
export { pushCommands, pushCode } from "./file-bridge-v2-commands.js";
export { DurableNdjsonConsumer } from "./durable-ndjson-consumer.js";
export { EventLogWriter } from "./event-log-writer.js";
export { FileBridgeMetrics, formatMetricsForHumans } from "./file-bridge-metrics.js";
// Tipos: BridgeCommandEnvelope, BridgeResultEnvelope, BridgeEvent, BridgeLease, etc.
```

## Reglas

- No importar de pt-control, pt-runtime, ni pt-cli.
- Dependencias ligeras: `@cisco-auto/types` + `zod`.
- Manejar errores de filesystem con `ensureDir`/`ensureFile`/`atomicWriteFile`.
- BridgeEvents deben ser NDJSON-serializables.
