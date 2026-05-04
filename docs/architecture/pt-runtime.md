# Arquitectura pt-runtime

## Propósito

`pt-runtime` genera y despliega `main.js`, `runtime.js` y `catalog.js` dentro de Cisco Packet Tracer. Es la capa que corre **dentro de PT** y controla dispositivos via IPC.

> **Frontera:** `pt-runtime` es un **thin kernel**. NO contiene lógica de negocio, planners, o verification. Eso vive en `pt-control`.

## Arquitectura General

```
packages/pt-runtime/src/
├── pt/                    # Código que va a main.js (PT Script Module)
│   ├── kernel/           # Boot, queue, lease, heartbeat, execution engine
│   └── terminal/        # Terminal engine, session state
├── handlers/             # Primitive handlers (device-crud, device-listing, etc.)
├── pt-api/              # Tipos PT (IPC, constants, processes)
├── domain/              # RuntimeResult, DeferredJobPlan
├── runtime/             # Runtime types, contracts
├── core/                # Middleware, registry, dispatcher
├── build/               # Generadores: renderMainV2, renderRuntimeV2, renderCatalog
└── value-objects/       # CableType, DeviceName, InterfaceName
```

## exports públicos

```typescript
// De index.ts — SOLO estos módulos se exportan
export * from "./contracts/pt-compatibility.js";
export * from "./domain";           // RuntimeResult, DeferredJobPlan
export * from "./runtime";        // Runtime types, contracts
export * from "./core";           // Middleware, registry
export * from "./handlers";        // Primitive handlers
export * from "./pt/kernel";      // Kernel, queue, lease, heartbeat
export * from "./pt/terminal";   // Terminal engine
export { validatePtSafe } from "./build/validate-pt-safe";
export { renderRuntimeV2, renderMainV2, renderCatalog };
export { RuntimeGenerator, ModularRuntimeGenerator };
```

## Kernel (pt/kernel/)

El kernel corre en `main.js` y gestiona el lifecycle del runtime.

### Componentes

| Archivo | Responsabilidad |
|---------|----------------|
| `main.ts` | Boot, shutdown, routing de mensajes |
| `kernel-state.ts` | Estado global del kernel |
| `command-queue.ts` | Polling de `commands/` en PT_DEV_DIR |
| `execution-engine.ts` | Ejecución de deferred jobs |
| `lease.ts` | Exclusión mutua con lock file |
| `heartbeat.ts` | Escritura periódica de heartbeat.json |
| `runtime-loader.ts` | Hot-reload de runtime.js |

### KernelConfig

```typescript
interface KernelConfig {
  devDir: string;
  commandsDir: string;
  inFlightDir: string;
  resultsDir: string;
  deadLetterDir: string;
  logsDir: string;
  commandsTraceDir: string;
  pollIntervalMs: number;
  deferredPollIntervalMs: number;
  heartbeatIntervalMs: number;
}
```

## Terminal Engine (pt/terminal/)

Gestión de sesiones IOS dentro de PT. Ver `docs/architecture/runtime-terminal.md`.

## Handlers

Handlers primitivos que ejecutan operaciones básicas:

| Handler | Tipo de comando |
|---------|-----------------|
| `device-crud.ts` | `addDevice`, `removeDevice`, `renameDevice`, `moveDevice` |
| `device-discovery.ts` | `listDevices` |
| `device-listing.ts` | Helper para listing compuesto |
| `link.ts` | `addLink`, `removeLink` |
| `vlan.ts` | `createVlan`, `deleteVlan` |
| `dhcp.ts` | `configureDhcp`, `inspectDhcp` |

Cada handler recibe:

```typescript
interface HandlerDeps {
  ipc: PTIpc;
  getNet: () => PTNetwork;
  getWorkspace: () => PTWorkspace;
  now: () => number;
  safeJsonClone: <T>(data: T) => T;
}

interface HandlerResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  warnings?: string[];
}
```

## Deferred Jobs

Para comandos IOS que requieren múltiples pasos (configurar VLAN, DHCP pool, etc.), el kernel usa un plan diferido:

```typescript
interface DeferredJobPlan {
  id: string;
  device: string;
  steps: DeferredStep[];
  options?: DeferredJobOptions;
}

type DeferredStepType =
  | "ensure-mode"
  | "command"
  | "confirm"
  | "expect-prompt"
  | "save-config"
  | "close-session"
  | "delay";
```

## PT-Safety

El código generado en `main.js` y `runtime.js` debe ser compatible con el motor JavaScript de Packet Tracer (Qt Script). Reglas:

**PROHIBIDO en código generado:**
- `import` / `export`
- `const` / `let` (usar `var`)
- arrow functions
- `class` (usar构造函数)
- `async` / `await`
- optional chaining (`?.`)
- template literals
- `globalThis`
- `console.*`
- `require()`
- `node:*`

**PERMITIDO:**
- `var`
- `function`
- `if/else`, `for`, `while`
- Objetos literales
- `JSON.parse`, `JSON.stringify`
- `Date.now()`, `setTimeout`, `setInterval`
- Acceso a `ipc`, `fm`, `self`

## Build

```bash
# Genera main.js, runtime.js, catalog.js → ~/pt-dev/
cd packages/pt-runtime && bun run deploy

# Genera a dist-qtscript/ (para validación)
bun run build
```

## Depuración

```bash
# Habilitar debug en PT console
self.PT_DEBUG = 1;  // En la consola de PT

# Ver logs
cat ~/pt-dev/logs/pt-debug.current.ndjson | tail -50

# Ver cola de comandos
ls ~/pt-dev/commands/

# Ver resultados
ls ~/pt-dev/results/
```