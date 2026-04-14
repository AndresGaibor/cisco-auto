# PT Runtime Architecture

> Documented: 2026-04-14

## Two-File Design

PT Runtime splits into three deployed artifacts with strict boundaries:

| Artifact | Source | Size | Responsibility |
|---|---|---|---|
| `main.js` | `src/pt/kernel/` | ~45 KB | Lifecycle: queue, terminal, job execution, hot-reload, heartbeat, lease, shutdown |
| `runtime.js` | `src/handlers/`, `src/runtime/` | ~15 KB | Business logic: dispatch, validation, plan building |
| `catalog.js` | `src/pt-api/pt-constants.ts` | ~2.5 KB | Static constants: device types, cable types, module catalog |

**Frontera principal**: `main.js` owns lifecycle. `runtime.js` owns business logic. Neither crosses the boundary.

## Kernel (main.js)

### Source files: `src/pt/kernel/`

| File | Responsibility |
|---|---|
| `main.ts` | Kernel factory `createKernel(config)`. Boot/shutdown lifecycle. Owns all other components. |
| `command-queue.ts` | Polls `commands/` → `in-flight/` → `results/`. Atomically claims files. Moves corrupt JSON to `dead-letter/`. |
| `runtime-loader.ts` | Hot-reloads `runtime.js` when mtime changes. Blocks reload when busy. |
| `job-executor.ts` | Executes `DeferredJobPlan` steps asynchronously via `TerminalEngine`. |
| `lease.ts` | Exclusive write lock (`commands/.lease`) for single-instance enforcement. |
| `heartbeat.ts` | Writes `logs/heartbeat.json` for bridge health monitoring. |
| `cleanup.ts` | Idempotent shutdown: clears intervals, jobs, terminals. |
| `directories.ts` | Ensures pt-dev directory structure exists. |

### Entry points

```javascript
function main()   // Called by PT Script Engine lifecycle
function cleanUp() // Called on PT shutdown
function _ptLoadModule(name) // Loads catalog.js / runtime.js at startup
```

### What main.js does NOT do

- Business logic (handlers, dispatch)
- Payload validation
- Plan building
- IOS command parsing

## Runtime (runtime.js)

### Source files

- `src/handlers/runtime-handlers.ts` — `runtimeDispatcher(payload, api)`. Maps `type` → handler function.
- `src/handlers/` — device, link, vlan, dhcp, host, canvas, module, inspect
- `src/handlers/parsers/ios-parsers.ts` — Pure show-command parsers (no PT deps)
- `src/runtime/` — payload validation, logger, metrics, helpers
- `src/domain/` — `DeferredJobPlan`, `RuntimeResult` factories

### Entry point

```javascript
function dispatch(payload, api) // Called by main.js kernel
```

### What runtime.js does NOT do

- Filesystem (no queue, no commands/, no results/)
- Terminal events (delegates to main.js via `api.executeCommand`)
- Interval management
- Lifecycle

## Catalog (catalog.js)

Static constants from `src/pt-api/pt-constants.ts`:

- `PT_DEVICE_TYPE_MAP` — router=0, switch=1, pc=8, server=9, etc.
- `PT_CABLE_TYPE_MAP` — copper-straight=0, copper-cross=1, serial=3, etc.
- `PT_PORT_MAP` — port type by device model
- `PT_MODULE_CATALOG` — supported HWIC/NM modules per router model

Almost never changes. Regenerated only when Cisco hardware catalog updates.

## Data Flow

```
Bridge writes command.json → commands/

Kernel polls commands/ → atomically moves to in-flight/
Kernel parses JSON envelope

Kernel calls dispatch(payload, api) → runtime.js
  handler validates payload
  handler builds DeferredJobPlan (type: "command" | "ensure-mode" | "save-config" | etc.)
  handler returns DeferredJobPlan to kernel

Kernel writes pending result to results/{id}.pending.json
Kernel begins async job execution via TerminalEngine

  TerminalEngine.executeCommand(cmd) → PT TerminalLine API
  Events fire: commandStarted → outputWritten → commandEnded
  JobExecutor processes step results

Kernel polls __pollDeferred(type, id) → returns current job state
Once jobDone=true → kernel writes results/{id}.json (completed)

Kernel cleans up in-flight/{filename}
```

## Directory Structure (pt-dev/)

```
pt-dev/
├── commands/          # Pending: bridge writes JSON here
├── in-flight/         # Claimed: kernel atomically moves here
├── results/           # Completed: kernel writes results here
│   └── {id}.json      # Result envelope
├── dead-letter/       # Corrupt: moved here on JSON parse failure
├── logs/
│   └── heartbeat.json # Bridge health monitoring
├── main.js            # Kernel bootstrap (entry: main(), cleanUp())
├── runtime.js         # Business logic (entry: dispatch(payload, api))
└── catalog.js         # Static constants (device/cable types)
```

## Deprecated / Not in Build Path

| File | Status | Why |
|---|---|---|
| `src/handlers/ios-engine.ts` | Deprecated | TerminalEngine + JobExecutor replaced it |
| `src/handlers/ios-session.ts` | Deprecated | prompt-parser.ts replaced `inferModeFromPrompt` |
| `src/core/dispatcher.ts` | @legacy | Map-based dispatcher in runtime-handlers.ts used instead |
| `src/core/registry.ts` | @deprecated | Not used in active build; kept for extensibility |
| `src/ports.ts` | @deprecated | Not used in active build; dependency inversion not active |

## Model Verification

`src/verified-models.ts` — single source of truth for PT device models (19 verified models).

When PT adds a new device model:
1. Add to `src/verified-models.ts`
2. Run `bun run generate-models`
3. `src/validated-models.ts` auto-regenerates `PT_MODEL_MAP`
4. Build → new model available in `catalog.js`

## See Also

- `docs/BUILD.md` — Build pipeline, PT-safe rules, source manifests
- `docs/PT-API.md` — PT IPC API reference (TerminalLine, PTDevice, PTPort, etc.)
- `src/README.md` — Model management guide