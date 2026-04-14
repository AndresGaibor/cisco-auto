# PT Runtime - Packet Tracer Script Engine Kernel

Kernel and runtime system for executing configuration commands on Cisco devices in Packet Tracer.

## Architecture

### Separation of Concerns

The system is split into two files with clear ownership:

| File | Role | Owns |
|------|------|------|
| `main.js` | **Lifecycle owner** | Queue polling, job scheduling, terminal sessions, heartbeat, runtime hot-reload, shutdown |
| `runtime.js` | **Pure business logic** | Payload validation, handler dispatch, plan generation, job state queries |

**Key rule**: `runtime.js` never touches the filesystem, queue, or lifecycle. `main.js` never knows about business logic.

### main.js (Kernel)

Generated from TypeScript source via `renderMainV2`. Contains:

- **Command queue**: Polls `commands/` directory, atomically claims files to `in-flight/`, writes results to `results/`, moves corrupt files to `dead-letter/`
- **Terminal engine**: Manages IOS sessions via PT `TerminalLine` events
- **Job executor**: Runs deferred `DeferredJobPlan` steps (mode changes, commands, saves)
- **Runtime loader**: Hot-reloads `runtime.js` on mtime change, blocks reload during active work
- **Heartbeat**: Writes heartbeat file for bridge health monitoring
- **Shutdown**: Idempotent cleanup of intervals, jobs, and terminals

**Entry points**: `function main()` and `function cleanUp()` — called by PT Script Engine lifecycle. **No auto-invocation** of `main()` — PT calls it.

### runtime.js (Logic)

Generated from TypeScript handlers via `renderRuntimeV2`. Contains:

- **Middleware pipeline**: Error recovery, rate limiting, logging, metrics, validation
- **Handler dispatcher**: Routes payload types to handlers (`configIos`, `execIos`, `configHost`, etc.)
- **Plan builders**: Creates declarative `DeferredJobPlan` objects for IOS sessions
- **Job state polling**: Queries kernel for deferred job progress via `api.getJobState()`

**Entry point**: `runtime(payload, api)` function called by `main.js`. No filesystem, no queue, no lifecycle.

## IOS Terminal Behavior

**Critical**: PT's `TerminalLine.enterCommand()` returns `void`. It does NOT return `[status, output]`.

Command state is delivered asynchronously via events:
- `commandStarted` — command began execution
- `outputWritten` — output data accumulated
- `commandEnded` — command finished with `{ status: number }`
- `modeChanged` — IOS mode changed (exec → config → etc.)
- `promptChanged` — prompt text updated
- `moreDisplayed` — `--More--` pager activated

The `TerminalEngine` manages session state by listening to these events. Commands resolve only when `commandEnded` fires, returning the latest snapshot of prompt/mode/paging from the event stream.

## Queue Protocol

### Directory Structure

```
pt-dev/
├── commands/        # Pending commands (source of truth)
├── in-flight/       # Claimed commands (being processed)
├── results/         # Completed command results
├── dead-letter/     # Corrupt/unparseable files
└── runtime.js       # Business logic (hot-reloadable)
```

### Claim Flow

1. Kernel lists `commands/*.json` (sorted ascending)
2. For each file: atomically move to `in-flight/`
3. If move fails (already claimed), skip
4. Parse JSON from `in-flight/`
5. If corrupt: move to `dead-letter/` + write error metadata
6. Execute via `runtime(payload, api)`
7. Write result to `results/{id}.json`
8. Cleanup `in-flight/{filename}`

## Build

```bash
# From project root
bun run pt:build
```

This generates:
- `main.js` — Kernel bootstrap (PT Script Module entry points)
- `runtime.js` — Handler dispatcher (pure logic)

Both files are validated against PT-safe rules before deployment.

### PT-Safe Validation

The build fails if generated artifacts contain:
- `import` / `export` statements
- `const` / `let` (must use `var`)
- Arrow functions (must use `function`)
- Optional chaining `?.`
- `class` declarations
- `console.*` (must use `dprint`)
- `require()`, `process`, `Buffer`

## Development

### Kernel changes (main.js)

Edit files in `packages/pt-runtime/src/pt/kernel/`:
- `main.ts` — Kernel boot, runtime API factory, command execution
- `command-queue.ts` — Queue polling and claim
- `runtime-loader.ts` — Hot-reload with busy protection
- `job-executor.ts` — Deferred job step execution

### Runtime changes (runtime.js)

Edit files in `packages/pt-runtime/src/handlers/`:
- `runtime-handlers.ts` — Handler implementations
- `ios-engine.ts` — IOS session plan builders

### Terminal changes

Edit files in `packages/pt-runtime/src/pt/terminal/`:
- `terminal-engine.ts` — PT TerminalLine event handling
- `terminal-session.ts` — Session state management

### Build & deploy

```bash
bun run pt:build          # Generate + validate + deploy to ~/pt-dev/
bun run pt:build --no-deploy  # Generate + validate only
```

## Environment

Default PT dev directory: `$HOME/pt-dev`

Override with:
```bash
export PT_DEV_DIR=/custom/path
bun run pt:build
```

## Related Documentation

- `DOCUMENTATION_INDEX.md` — Project-wide documentation index
- `packages/pt-runtime/src/pt-api/` — PT IPC API type definitions
- `packages/pt-runtime/src/runtime/contracts.ts` — main/runtime boundary types
