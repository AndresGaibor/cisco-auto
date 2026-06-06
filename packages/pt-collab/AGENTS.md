# AGENTS.md — @cisco-auto/pt-collab

> Guía de desarrollo para agentes de IA que trabajan en pt-collab.

## Propósito

Colaboración multiusuario en laboratorios Packet Tracer: sesiones compartidas, detección de cambios, sync y conflictos.

## Arquitectura

```
src/
├── index.ts
├── server/
│   ├── start-collab-server.ts     # createCollabServer()
│   ├── collab-http-server.ts
│   ├── websocket-hub.ts           # Hub de WebSocket
│   ├── peer-registry.ts           # Registro de peers
│   ├── room-registry.ts           # Salas de colaboración
│   └── auth.ts
├── client/
│   └── collab-client.ts           # CollabClient
├── multiuser/
│   ├── pt-multiuser-bridge.ts     # Bridge multiuser PT
│   ├── multiuser-types.ts
├── detector/
│   └── change-detector.ts         # diffSnapshots(), diffToDeltas()
├── applier/
│   └── delta-applier.ts           # applyDelta()
├── sync/
│   └── auto-sync.ts               # AutoSyncService
├── conflicts/
│   └── conflict-types.ts
├── protocol/
│   ├── messages.ts, schemas.ts, hashes.ts, vector-clock.ts
├── storage/
│   ├── checkpoint-store.ts, session-store.ts, file-store.ts, ...
├── cli-mode/
│   ├── start-simple-session.ts, connect-simple-session.ts, stop-simple-session.ts
├── tailscale/
├── telemetry/
└── tests/ + tests-isolated/
```

## Exports principales

```typescript
// Server
export { createCollabServer, type CollabServerHandle, type StartCollabServerOptions } from "./server/start-collab-server.js";
// Client
export { CollabClient, type CollabClientOptions, type CollabClientStatus } from "./client/collab-client.js";
// Storage
export { CheckpointStore, type CheckpointRecord } from "./storage/checkpoint-store.js";
export { readClientConfig, writeClientConfig, type ClientConfig } from "./storage/client-config-store.js";
export { readHostConfig, writeHostConfig, getOrCreateHostConfig, type HostConfig } from "./storage/host-config-store.js";
// Protocol
export { type messages, type schemas } from "./protocol/index.js";
// Detector/Applier
export { diffSnapshots, diffToDeltas, snapshotFromTopology, applyDelta } from "./detector/change-detector.js";
// Multiuser
export { PTMultiuserBridge, queryMultiuserIPC, multiuserListenIPC } from "./multiuser/pt-multiuser-bridge.js";
// Sync
export { AutoSyncService } from "./sync/auto-sync.js";
// CLI mode
export { startSimpleSession, connectSimpleSession, stopSimpleSession } from "./cli-mode/index.js";
```

## Reglas

- No importar de pt-cli. pt-collab es usado POR pt-cli, no al revés.
- WebSocket server usa `bun` nativo. No usar `ws` u otras librerías.
- Los deltas entre snapshots deben ser calculados vía `diffSnapshots()` + `diffToDeltas()`.
- Sesiones multiuser PT usan el bridge multiuser nativo de Packet Tracer.
- Los checkpoints se almacenan como NDJSON en filesystem via `CheckpointStore`.
