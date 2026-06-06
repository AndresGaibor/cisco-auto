# AGENTS.md — @cisco-auto/pt-memory

> Guía de desarrollo para agentes de IA que trabajan en pt-memory.

## Propósito

Capa de persistencia local con SQLite embebido (vía `bun:sqlite`) para dispositivos, topología, preferencias, auditoría e historial.

## Arquitectura

```
src/
├── index.ts
├── memory/
│   ├── index.ts              # MemoryStore (singleton) - factory
│   ├── schema.ts             # initializeSchema() - creación de tablas
│   ├── devices.ts            # DeviceMemory - CRUD de dispositivos
│   ├── topology.ts           # TopologyMemory - vecinos/topología
│   ├── preferences.ts        # PreferencesStore - key-value
│   ├── audit.ts              # AuditMemory - logs de auditoría
│   └── history.ts            # HistoryMemory - historial de comandos
└── session/
    ├── index.ts              # SessionIntegration
    └── audit-integration.ts  # AuditIntegration
```

## Exports principales

```typescript
export { getMemory, MemoryStore, initializeSchema } from "./memory/index.js";
export { DeviceMemory, TopologyMemory, PreferencesStore, AuditMemory, HistoryMemory } from "./memory/index.js";
export { SessionIntegration, AuditIntegration } from "./session/index.js";
export { type AuditRecord } from "./memory/audit.js";
```

## Reglas

- SQLite via `bun:sqlite`. No usar drivers externos.
- MemoryStore es singleton. Usar `getMemory(dbPath?)` para obtener instancia.
- initializeSchema() debe llamarse antes del primer uso.
- No depender de pt-control, pt-runtime, file-bridge, ni pt-cli.
- Todas las operaciones de escritura deben ser síncronas (bun:sqlite es síncrono).
