# PT Runtime - Build System

Build system for generating `main.js` and `runtime.js` for Packet Tracer Script Engine.

## Quick Start

From project root:

```bash
bun run pt:build
```

This generates and deploys:
- `~/pt-dev/main.js` (211 lines) - PT Script Module
- `~/pt-dev/runtime.js` (3018 lines) - Handler dispatcher with all device/link/config handlers

## Architecture

### main.js
- **Purpose**: Polling loop in Packet Tracer Script Engine
- **Responsibilities**:
  - Poll `command.json` every 500ms
  - Execute `runtime(payload, ipc, dprint)` function
  - Write results to `~/pt-dev/results/{id}.json`
  - Write heartbeat every 5s
- **Generated from**: `src/templates/main.ts` (MAIN_JS_TEMPLATE)
- **Lines**: 211 (ultra-simple, complexity in TypeScript side)

### runtime.js
- **Purpose**: Handler dispatcher for all PT commands
- **Handlers**:
  - Device: addDevice, removeDevice, listDevices, renameDevice
  - Link: addLink, removeLink
  - Config: configHost, configIos, execIos
  - Inspect: inspect, snapshot
  - Canvas: listCanvasRects, getRect, devicesInRect
  - Module: addModule, removeModule
- **Generated from**: `composeRuntime()` which concatenates 9 template functions
- **Lines**: 3018 (includes all handlers + constants + helpers)
- **Syntax**: ES6+ JavaScript (compatible with PT)

## Build Flow

```
bun run pt:build (from root)
    ↓
bun run --cwd packages/pt-runtime src/index.ts deploy
    ├─ Executes: src/index.ts → RuntimeGenerator.deploy()
    ├─ Generates main.js
    │  └─ Source: MAIN_JS_TEMPLATE (src/templates/main.ts)
    │  └─ Replaces: {{DEV_DIR_LITERAL}} with PT dev dir
    │  └─ Output: ~/pt-dev/main.js
    │
    └─ Generates runtime.js
       └─ Source: RUNTIME_JS_TEMPLATE (src/templates/runtime.ts)
       └─ Calls: composeRuntime() → generateRuntimeCode()
       └─ Concatenates: 9 template generators
       └─ Output: ~/pt-dev/runtime.js
```

## Scripts

### From Root
```bash
bun run pt:build              # Generate + Deploy to ~/pt-dev/ ⭐
bun run pt:generate           # Generate only (no deploy)
bun run pt-runtime:build      # Build lib + runtime (npm run build)
```

### From packages/pt-runtime
```bash
npm run build                 # build:lib + build:runtime
npm run build:lib             # tsc (compile TypeScript)
npm run build:runtime         # tsc -p tsconfig.runtime.json
npm run generate              # bun run src/index.ts generate
npm run deploy                # npm run build:runtime && deploy
npm run typecheck             # tsc --noEmit
```

## Current Status

### ✅ Working
- [x] `bun run pt:build` works from root
- [x] main.js generated correctly (~211 lines)
- [x] runtime.js generated correctly (~3018 lines)
- [x] Both deployed to ~/pt-dev/
- [x] PT compatibility verified (ES6+ syntax)
- [x] All handlers included (device, link, config, etc.)

### 🟡 In Transition
- [ ] src/runtime/ (TypeScript source) created but not integrated
  - Currently: POC proof-of-concept (types, constants, helpers)
  - Future: Will host all handlers for full TypeScript compilation

### 📋 Planned (Phase 6-7)
- [ ] Migrate 9 handler templates to TypeScript (src/runtime/handlers/)
- [ ] Compile all handlers to ES5
- [ ] Update RUNTIME_JS_TEMPLATE to read compiled output
- [ ] Remove composeRuntime() and template generators
- [ ] Result: Single source of truth (src/runtime/)

## Development

### For quick PT testing:
```bash
# Make changes to handlers in src/templates/
bun run pt:build

# PT auto-reloads from ~/pt-dev/main.js on startup
```

### For architecture changes:
```bash
# See ACTION_PLAN.md for Phase 6-7 migration to TypeScript
```

## Environment

Default PT dev directory: `$HOME/pt-dev`

Override with:
```bash
export PT_DEV_DIR=/custom/path
bun run pt:build
```

## Related Files

- **package.json** - Scripts defined here
- **src/index.ts** - RuntimeGenerator class (main logic)
- **src/templates/main.ts** - Main.js template
- **src/templates/runtime.ts** - Runtime.js template
- **src/compose.ts** - composeRuntime() function
- **src/runtime-generator.ts** - generateRuntimeCode() (9 templates)
- **src/runtime/** - TypeScript source (future migration target)

## Future: TypeScript-First Runtime

Once Phase 6-7 is complete:

```typescript
// src/runtime/handlers/device.ts
export function handleAddDevice(payload: AddDevicePayload, ipc: IPC): HandlerResult {
  // ...
}
```

```bash
# Single compilation step
bun run pt:build
  └─ tsc -p tsconfig.runtime.json (all handlers → ES5)
  └─ Read generated/runtime.js
  └─ Deploy to ~/pt-dev/
```

Benefits:
- ✅ Single source of truth
- ✅ Full TypeScript typing
- ✅ IDE intellisense for handlers
- ✅ Simpler maintenance
- ✅ Easier testing

## Notes

- main.js is ultra-simple by design (complexity in TypeScript side)
- runtime.js is generated (not editable directly)
- All changes go in `src/templates/` or `src/handlers/`
- PT compatibility requires ES5 or ES6+ (no modules)
- For Questions: See DOCUMENTATION_INDEX.md
