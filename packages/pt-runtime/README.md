# PT Runtime — Packet Tracer Script Engine

> Generates PT-safe ES5 artifacts (`main.js`, `runtime.js`, `catalog.js`) that run inside Cisco Packet Tracer 9.x's QTScript engine.

> **FRONTERA ARQUITECTURAL**: `pt-runtime` es un **thin kernel** que contiene lifecycle, dispatch, primitives PT-safe, terminal engine, y adapters `omni` de bajo nivel. **NO contiene lógica de negocio**. Ver `docs/architecture/runtime-control-boundary.md`.

## What This Package Does

PT Runtime is the bridge between the PT CLI (`pt`) and Cisco Packet Tracer. It transforms TypeScript source into artifacts that PT's scripting engine can execute. The CLI sends commands to the kernel via a queue directory; the kernel dispatches to handlers; handlers return `DeferredJobPlan` objects; the kernel executes them asynchronously via PT's TerminalLine API.

**Responsibilities:**
- Kernel lifecycle (boot, shutdown, lease, heartbeat)
- Dispatch primitivo
- Command queue polling y claim
- Terminal engine (apertura, ejecución, parsing)
- Primitives PT-safe (device CRUD, link CRUD, module ops, host config)
- Adapters `omni` de bajo nivel
- Catálogo de modelos/capacidades
- Build y validación ES5/PT-safe
- **Fase 6**: Estado global explícito (`src/kernel/`), validación PT-safe/ES5 como gate, generación de assets desde registries/contratos

**NOT contains:**
- Workflows semánticos altos
- Validadores de escenarios
- Parsers complejos de outputs
- Lógica de negocio compuesta

## Fase 6 — Kernel Endurecido

La Fase 6 endurece el kernel embebido y el build PT-safe:

| Módulo | Propósito |
|--------|-----------|
| `src/kernel/` | Estado global explícito, bootstrap, dispatch loop, runtime loader, cleanup manager |
| `src/compat/` | Validadores ES5 y PT-safe (gate de build) |
| `src/build/` | Generadores de assets (main, runtime, catalog) y checks estructurales |

**Reglas de la Fase 6:**
- `main.js` es mínimo y casi inmóvil
- `cleanUp()` es idempotente
- Hot reload es conveniencia de desarrollo, no base de consistencia
- Validación PT-safe/ES5 es **gate** de build (no warning)

## Artifacts

| Artifact | Size | Source | Purpose |
|---|---|---|---|
| `main.js` | ~45 KB | `src/kernel/` + `src/pt/kernel/` | Kernel bootstrap: queue polling, terminal lifecycle, job execution, hot-reload, heartbeat, lease |
| `runtime.js` | ~15 KB | `src/handlers/` | Business logic: dispatch, validation, plan building |
| `catalog.js` | ~2.5 KB | `src/pt-api/pt-constants.ts` | Static constants: device types, cable types, module catalog |

**Generadores (Fase 6):** `src/build/main-generator.ts`, `src/build/runtime-generator.ts`, `src/build/catalog-generator.ts`

## Build

```bash
# Generate all artifacts → dist-qtscript/
bun run generate

# Generate + validate
bun run validate

# Deploy to ~/pt-dev/
bun run deploy

# From monorepo root (generate + validate + deploy)
bun run pt:build

# No-deploy mode (generate + validate only)
bun run pt:build --no-deploy
```

Output location: `~/pt-dev/` (macOS/Linux). Override with `PT_DEV_DIR` env var.

## PT-Safe Validation

The build **fails** if generated artifacts contain any of:

| Forbidden | Must Use Instead |
|---|---|
| `import` / `export` | (stripped by AST transform) |
| `const` / `let` | `var` |
| Arrow functions (`=>`) | `function() {}` |
| `class` declarations | Prototype-based functions |
| `async` / `await` | (not supported in QTScript) |
| `?.` optional chaining | (not ES5) |
| `` `${...}` `` template literals | `"str" + var` |
| `...spread` on identifiers | (not ES5) |
| `globalThis` | `self` (PT's global object) |
| `console.*` | `dprint()` (PT's logging API) |
| `require()`, `process`, `Buffer` | Not available in PT sandbox |

## Documentation

| Doc | Content |
|---|---|
| `docs/ARCHITECTURE.md` | Two-file design, kernel vs runtime boundary, data flow, directory structure |
| `docs/BUILD.md` | Build pipeline, PT-safe rules, source manifests, commands |
| `docs/PT-API.md` | PT IPC API reference (PTDevice, PTPort, PTCommandLine, events) |
| `docs/pt-runtime-migration-diff.md` | Migration baseline comparison, behavioral changes |
| `docs/refactor/kernel-hardening-phase6.md` | main.js mínimo, responsabilidades exactas |
| `docs/refactor/pt-safe-build-phase6.md` | Validación ES5/PT-safe como gate |
| `docs/refactor/runtime-generation-phase6.md` | Generación de assets desde registries |
| `docs/refactor/lifecycle-and-cleanup-phase6.md` | cleanUp() idempotente, lifecycle robusto |
| `docs/refactor/legacy-removal-phase6.md` | Legacy a eliminar/bloquear |
| `src/README.md` | Model management: verified-models.ts, adding new PT device models |

## Architecture

```
pt-dev/
├── commands/     → bridge writes JSON command files here
├── in-flight/    → kernel atomically claims files here
├── results/      → kernel writes completed results here
├── dead-letter/  → corrupt files moved here
├── logs/         → heartbeat for bridge monitoring
├── main.js       → kernel entry: main(), cleanUp()
├── runtime.js    → runtime entry: dispatch(payload, api)
└── catalog.js    → static constants (device/cable types)
```

**Key rule**: `main.js` owns lifecycle (queue, terminal, events). `runtime.js` owns business logic (validation, handlers, plan building). They never cross.

## Fase 7 - Consolidación

Ver referencia en README raíz del proyecto: `docs/refactor/final-consolidation-phase7.md`

**Restricciones permanentes de Fase 7:**

- `main.js` = Kernel mínimo (solo lifecycle, sin workflows)
- `runtime.js` = Solo primitives y handlers baixos
- TODO debe pasar validación PT-safe/ES5 antes de deploy
- Nueva capability = Primitive | Omni Adapter | Workflow

## Deprecated / Not in Build Path

| File | Status | Replacement |
|---|---|---|
| `src/handlers/ios-engine.ts` | Deprecated | `src/pt/terminal/terminal-engine.ts` + `src/pt/kernel/job-executor.ts` |
| `src/handlers/ios-session.ts` | Deprecated | `src/pt/terminal/prompt-parser.ts` |
| `src/core/dispatcher.ts` | @legacy | Map-based dispatcher in `handlers/runtime-handlers.ts` |
| `src/core/registry.ts` | @deprecated | Not used in active build |
| `src/ports.ts` | @deprecated | Not used in active build |

## Model Verification

`src/verified-models.ts` is the single source of truth for PT device models (19 verified).

To add a new PT device model:
1. Add to `src/verified-models.ts`
2. Run `bun run generate-models`
3. `src/validated-models.ts` auto-regenerates `PT_MODEL_MAP`
4. Build → new model available in `catalog.js`

## Related Documentation

- `packages/pt-cli/` — PT CLI (`pt` command)
- `packages/pt-control/` — PT Control library (device operations, IOS service)
- `src/pt-api/` — PT IPC API type definitions
- `src/runtime/contracts.ts` — main/runtime boundary types (`DeferredJobPlan`, `RuntimeResult`, etc.)