# FileBridge & Runtime - Complete Technical Guide

**Document Purpose**: Provide complete technical context for AI assistants about how FileBridge, runtime.js, and main.js work, including generation, architecture, and all involved components.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [FileBridge V2 - Deep Dive](#filebridge-v2---deep-dive)
3. [Runtime System - main.js & runtime.js](#runtime-system---mainjs--runtimejs)
4. [Runtime Generation Process](#runtime-generation-process)
5. [Command Flow - End to End](#command-flow---end-to-end)
6. [Directory Structure & File Layout](#directory-structure--file-layout)
7. [Protocol & Message Formats](#protocol--message-formats)
8. [Key Components Reference](#key-components-reference)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    CISCO AUTO ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │  Bun CLI     │─────▶│  FileBridge  │─────▶│  Packet      │ │
│  │  (TypeScript)│      │    V2        │      │  Tracer      │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
│         │                     │                      │         │
│         │ writes command.json │                      │         │
│         │                     │ watches files        │         │
│         │                     │                      │ IPC     │
│         │                     │                      │ calls   │
│         ▼                     ▼                      ▼         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ~/pt-dev/ (Shared Filesystem)               │   │
│  │  ├─ command.json          ← Command entrypoint          │   │
│  │  ├─ runtime.js            ← Runtime code (hot reload)   │   │
│  │  ├─ main.js               ← PT Script Module            │   │
│  │  ├─ state.json            ← Topology snapshot           │   │
│  │  ├─ bridge-lease.json     ← Single-instance lock        │   │
│  │  ├─ protocol.seq.json     ← Sequence numbers            │   │
│  │  ├─ commands/             ← Command queue (advanced)    │   │
│  │  ├─ in-flight/            ← Commands being processed    │   │
│  │  ├─ results/              ← Command results             │   │
│  │  ├─ logs/                 ← NDJSON event journal        │   │
│  │  └─ consumer-state/       ← Consumer checkpoints        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Packages

| Package | Purpose | Key Files |
|---------|---------|-----------|
| `@cisco-auto/file-bridge` | File-based IPC bridge | `file-bridge-v2.ts`, command processor, lease manager |
| `@cisco-auto/pt-runtime` | Runtime code generator | Templates for main.js, runtime.js |
| `@cisco-auto/pt-control` | CLI application | Build scripts, commands, controller |
| `@cisco-auto/types` | Shared TypeScript types | Zod schemas, protocol types |

---

## FileBridge V2 - Deep Dive

### What is FileBridge V2?

FileBridge V2 is a **durable, file-based communication bridge** between the CLI (running in Bun/Node.js) and Packet Tracer's internal Script Engine. It uses the filesystem as the communication medium, avoiding network setup and security prompts.

### Core Design Principles

1. **Durability**: All state survives process restarts and crashes
2. **Single-instance**: Lease-based locking prevents multiple CLI instances
3. **Backpressure**: Prevents command flooding
4. **Crash Recovery**: In-flight commands are recovered after restart
5. **Garbage Collection**: Automatic cleanup of old results and logs

### FileBridge V2 Class Structure

**File**: `packages/file-bridge/src/file-bridge-v2.ts`

```typescript
class FileBridgeV2 extends EventEmitter {
  // Core Components
  private paths: BridgePathLayout        // Directory structure
  private seq: SequenceStore             // Monotonic sequence numbers
  private eventWriter: EventLogWriter    // NDJSON event journal
  private consumer: DurableNdjsonConsumer // Event stream reader
  private resultWatcher: SharedResultWatcher // Result file polling
  private backpressure: BackpressureManager // Flow control
  private leaseManager: LeaseManager     // Single-instance lock
  private commandProcessor: CommandProcessor // Command execution
  private crashRecovery: CrashRecovery   // Recovery after crash
  private diagnostics: BridgeDiagnostics // Health monitoring
  private garbageCollector: GarbageCollector // Cleanup
  
  // Lifecycle
  constructor(options: FileBridgeV2Options)
  start(): void
  stop(): Promise<void>
  isReady(): boolean
  
  // Commands
  sendCommand<T>(type: string, payload: T): BridgeCommandEnvelope
  sendCommandAndWait<T, R>(type: string, payload: T, timeoutMs?: number): Promise<BridgeResultEnvelope<R>>
  
  // Runtime loading
  loadRuntime(code: string): Promise<void>
  loadRuntimeFromFile(filePath: string): Promise<void>
  
  // Diagnostics
  diagnostics(): BridgeHealth
  gc(options?: { resultTtlMs, logTtlMs }): GCReport
}
```

### Key Components

#### 1. LeaseManager - Single Instance Enforcement

**File**: `packages/file-bridge/src/v2/lease-manager.ts`

Prevents multiple CLI instances from conflicting:

```typescript
interface BridgeLease {
  ownerId: string;        // Unique owner identifier
  pid: number;            // Process ID
  hostname: string;       // Machine hostname
  startedAt: number;      // Lease start timestamp
  updatedAt: number;      // Last renewal timestamp
  expiresAt: number;      // Lease expiration timestamp
  ttlMs: number;          // Time-to-live (default: 5000ms)
  processTitle: string;   // Process name
  version: string;        // Bridge version
}

class LeaseManager {
  acquireLease(): boolean    // Try to acquire, returns false if taken
  renewLease(): void         // Keep lease alive (called every 1s)
  releaseLease(): void       // Release on shutdown
  hasValidLease(): boolean   // Check if we hold valid lease
  getOwnerId(): string       // Get our owner ID
}
```

**How it works**:
1. On `start()`, try to create `bridge-lease.json`
2. If file exists and lease is valid (not expired), deny acquisition
3. If file doesn't exist or lease is stale, create new lease
4. Renew lease every 1 second via `setInterval`
5. On `stop()`, delete lease file

#### 2. SequenceStore - Monotonic Sequence Numbers

**File**: `packages/file-bridge/src/shared/sequence-store.ts`

Generates unique, monotonic sequence numbers that survive restarts:

```typescript
class SequenceStore {
  private storeFile: string  // protocol.seq.json
  private lockFile: string   // protocol.seq.json.lock
  
  next(): number    // Get next seq, atomically increment
  peek(): number    // Read current without incrementing
}
```

**File locking mechanism**:
- Uses `O_EXCL | O_CREAT` flags for atomic lock creation
- Retries with exponential backoff (max 50 attempts)
- Detects stale locks (>10 seconds old) and removes them
- Seq numbers start at 1, format: `cmd_000000000001`

#### 3. BackpressureManager - Flow Control

**File**: `packages/file-bridge/src/backpressure-manager.ts`

Prevents command flooding:

```typescript
interface BackpressureConfig {
  maxPending: number;  // Default: 100 commands
}

class BackpressureManager {
  checkCapacity(): void  // Throws BackpressureError if full
  waitForCapacity(timeoutMs?: number): Promise<void>
  getStats(): {
    maxPending: number
    currentPending: number
    availableCapacity: number
    utilizationPercent: number
  }
}
```

**How it works**:
1. Counts files in `commands/` and `in-flight/` directories
2. If count >= maxPending, throw error or wait
3. Automatically drains as commands are processed

#### 4. CommandProcessor - Command Execution

**File**: `packages/file-bridge/src/v2/command-processor.ts`

Handles command dequeuing and result publishing:

```typescript
class CommandProcessor {
  pickNextCommand<T>(): BridgeCommandEnvelope<T> | null
  publishResult<TResult>(
    cmd: BridgeCommandEnvelope,
    result: {
      startedAt: number
      status: "completed" | "failed" | "timeout"
      ok: boolean
      value?: TResult
      error?: BridgeResultEnvelope["error"]
    }
  ): void
}
```

**Command lifecycle**:
1. Command written to `commands/000000000042-configIos.json`
2. `pickNextCommand()` moves it to `in-flight/`
3. PT executes command
4. `publishResult()` writes to `results/cmd_000000000042.json`
5. In-flight file is deleted

#### 5. CrashRecovery - Recovery After Crash

**File**: `packages/file-bridge/src/v2/crash-recovery.ts`

Recovers from crashes:

```typescript
class CrashRecovery {
  recover(): void {
    // 1. Move in-flight commands back to commands queue
    // 2. Increment attempt counter
    // 3. Log recovery event
  }
}
```

**Recovery process**:
1. On `start()`, scan `in-flight/` directory
2. For each file, move back to `commands/`
3. Increment `envelope.attempt` counter
4. Emit `crash-recovery` event

#### 6. GarbageCollector - Automatic Cleanup

**File**: `packages/file-bridge/src/v2/garbage-collector.ts`

Cleans up old files:

```typescript
class GarbageCollector {
  collect(options?: {
    resultTtlMs?: number;  // Default: 3600000 (1 hour)
    logTtlMs?: number;     // Default: 86400000 (24 hours)
  }): GCReport
}
```

**What it cleans**:
- Result files older than TTL
- Rotated log files older than TTL
- Dead letter files

#### 7. EventLogWriter - NDJSON Event Journal

**File**: `packages/file-bridge/src/event-log-writer.ts`

Appends events to append-only log:

```typescript
interface BridgeEvent {
  seq: number;      // Monotonic sequence
  ts: number;       // Timestamp
  type: string;     // Event type
  // ... event-specific fields
}

class EventLogWriter {
  append(event: BridgeEvent): void
}
```

**Event types**:
- `init` - Bridge started
- `runtime-loaded` - Runtime code loaded
- `command-enqueued` - Command queued
- `command-picked` - Command being processed
- `command-completed` / `command-failed` - Result
- `snapshot` - Topology snapshot taken
- `device-added`, `device-removed`, `link-created`, `link-deleted` - PT events

---

## Runtime System - main.js & runtime.js

### Overview

The runtime system consists of two JavaScript files that run **inside Packet Tracer's Script Engine**:

1. **main.js**: Entry point, file watcher, event listeners
2. **runtime.js**: Command handlers, business logic (hot-reloadable)

### main.js - The Host Module

**Source**: `packages/pt-runtime/src/templates/main.ts`

**Responsibilities**:
1. Initialize Packet Tracer IPC
2. Set up FileWatcher for `command.json` and `runtime.js`
3. Register PT event listeners (device added, link created, etc.)
4. Load and execute runtime.js
5. Poll command.json for new commands
6. Write results to `results/<id>.json`
7. Maintain heartbeat for session management

**Key Sections**:

```javascript
// Configuration
var DEV_DIR = "{{DEV_DIR_LITERAL}}";  // Replaced at build time
var RUNTIME_FILE = DEV_DIR + "/runtime.js";
var COMMAND_FILE = DEV_DIR + "/command.json";

// State
var fm = null;          // SystemFileManager
var fw = null;          // FileWatcher
var runtimeFn = null;   // Compiled runtime function

// Lifecycle
var isRunning = false;
var isShuttingDown = false;
var lifecycleGeneration = 0;

// PT object refs
var lwRef = null;       // LogicalWorkspace
var clRef = null;       // CommandLog

// Main entry point
function main() {
  fm = ipc.systemFileManager();
  fw = fm.getFileWatcher();
  
  // Register file watcher
  fw.addPath(RUNTIME_FILE);
  fw.addPath(COMMAND_FILE);
  fw.registerEvent("fileChanged", null, onFileChanged);
  
  // Register PT events
  setupEventListeners();
  
  // Load runtime
  if (fm.fileExists(RUNTIME_FILE)) {
    loadRuntime();
  }
  
  // Start polling loop
  scheduleNextTick(50);
}

// File change handler
function onFileChanged(src, args) {
  var path = args.path;
  
  if (path === RUNTIME_FILE) {
    // Hot reload runtime
    loadRuntime();
  }
  
  if (path === DEV_DIR + "/main.js") {
    // Emit reload marker
    appendEvent({ type: "main-reload", ts: Date.now() });
  }
}

// Command execution
function processCommandFile() {
  var content = fm.getFileContents(COMMAND_FILE);
  var cmd = JSON.parse(content);
  
  // Clear command file
  fm.writePlainTextToFile(COMMAND_FILE, "");
  
  // Execute runtime
  var result = runtimeFn(cmd.payload, ipc, dprint);
  
  // Write result
  var resultEnvelope = {
    protocolVersion: 2,
    id: cmd.id,
    seq: cmd.seq,
    startedAt: startedAt,
    completedAt: Date.now(),
    status: result.ok ? "completed" : "failed",
    ok: result.ok,
    value: result
  };
  
  fm.writePlainTextToFile(
    RESULTS_DIR + "/" + cmd.id + ".json",
    JSON.stringify(resultEnvelope)
  );
}

// Runtime loading with validation
function loadRuntime() {
  var code = fm.getFileContents(RUNTIME_FILE);
  
  // Validate syntax
  var candidate;
  try {
    candidate = new Function("payload", "ipc", "dprint", code);
  } catch (syntaxErr) {
    appendEvent({ type: "error", message: "Runtime syntax error" });
    return;
  }
  
  // Smoke test
  var smokeResult = candidate({ type: "__healthcheck__" }, ipc, function() {});
  if (!smokeTestPassed) {
    appendEvent({ type: "error", message: "Runtime smoke test failed" });
    return;
  }
  
  // All checks passed
  runtimeFn = candidate;
  appendEvent({ type: "runtime-loaded", version: "2.2" });
}
```

### runtime.js - The Command Handler

**Source**: `packages/pt-runtime/src/templates/runtime.ts` → composed from multiple templates

**Structure**:

```javascript
/**
 * PT Control V2 - Runtime
 * Auto-generated by compose.ts - DO NOT EDIT MANUALLY
 */

// ============================================================================
// Constants
// ============================================================================
var CABLE_TYPES = { ... };
var DEVICE_TYPES = { ... };
var DEVICE_TYPE_NAMES = { ... };
var MODEL_ALIASES = { ... };
var CABLE_TYPE_NAMES = { ... };

// ============================================================================
// Helpers
// ============================================================================
function getLW() { ... }
function getNet() { ... }
function resolveModel(model) { ... }
function getDeviceTypeForModel(model) { ... }
function createDeviceWithFallback(...) { ... }

// ============================================================================
// IOS Session State Management
// ============================================================================
var IOS_SESSIONS = {};
function getOrCreateSession(deviceName, term) { ... }
function executeIosCommand(term, cmd, session) { ... }
function ensurePrivileged(term, session) { ... }
function ensureConfigMode(term, session) { ... }

// ============================================================================
// Device Handlers
// ============================================================================
function handleAddDevice(payload) { ... }
function handleRemoveDevice(payload) { ... }
function handleListDevices(payload) { ... }
function handleRenameDevice(payload) { ... }
function handleAddModule(payload) { ... }
function handleRemoveModule(payload) { ... }
function handleAddLink(payload) { ... }
function handleRemoveLink(payload) { ... }
function handleConfigHost(payload) { ... }
function handleMoveDevice(payload) { ... }

// ============================================================================
// IOS Configuration Handlers
// ============================================================================
function handleConfigIos(payload) { ... }
function handleExecIos(payload) { ... }

// ============================================================================
// Inspection Handlers
// ============================================================================
function handleInspect(payload) { ... }
function handleSnapshot() { ... }

// ============================================================================
// Canvas Handlers
// ============================================================================
function handleListCanvasRects(payload) { ... }
function handleGetRect(payload) { ... }
function handleDevicesInRect(payload) { ... }

// ============================================================================
// Command Dispatcher
// ============================================================================
return (function(payload, ipc, dprint) {
  switch (payload.type) {
    case "addDevice": return handleAddDevice(payload);
    case "removeDevice": return handleRemoveDevice(payload);
    case "listDevices": return handleListDevices(payload);
    case "renameDevice": return handleRenameDevice(payload);
    case "addModule": return handleAddModule(payload);
    case "removeModule": return handleRemoveModule(payload);
    case "addLink": return handleAddLink(payload);
    case "removeLink": return handleRemoveLink(payload);
    case "configHost": return handleConfigHost(payload);
    case "configIos": return handleConfigIos(payload);
    case "execIos": return handleExecIos(payload);
    case "snapshot": return handleSnapshot();
    case "inspect": return handleInspect(payload);
    case "hardwareInfo": return handleHardwareInfo();
    case "hardwareCatalog": return handleHardwareCatalog(payload);
    case "commandLog": return handleCommandLog(payload);
    case "listCanvasRects": return handleListCanvasRects(payload);
    case "getRect": return handleGetRect(payload);
    case "devicesInRect": return handleDevicesInRect(payload);
    case "moveDevice": return handleMoveDevice(payload);
    default: return { ok: false, error: "Unknown command: " + payload.type };
  }
})(payload, ipc, dprint);
```

**Key Features**:

1. **Self-contained**: No external dependencies, runs in PT's limited JS engine
2. **Stateful**: Maintains IOS session state across commands
3. **Hot-reloadable**: Can be edited while PT is running
4. **Type-safe dispatch**: Switch statement routes to correct handler

---

## Runtime Generation Process

### Build Pipeline

**File**: `packages/pt-control/scripts/build.ts`

```
┌─────────────────────────────────────────────────────────────┐
│                    BUILD PROCESS                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. TypeScript Compilation                                  │
│     packages/pt-control/src/**/*.ts                         │
│           │                                                 │
│           ▼                                                 │
│     packages/pt-control/dist/**/*.js                        │
│                                                             │
│  2. Runtime Generation                                      │
│     packages/pt-runtime/src/templates/*.ts                  │
│           │                                                 │
│           ▼                                                 │
│     Template functions (generateConstantsTemplate, etc.)    │
│           │                                                 │
│           ▼                                                 │
│     composeRuntime() → generateRuntimeCode()                │
│           │                                                 │
│           ▼                                                 │
│     Complete runtime.js string                              │
│                                                             │
│  3. main.js Generation                                      │
│     MAIN_JS_TEMPLATE (packages/pt-runtime/src/templates/)   │
│           │                                                 │
│           ▼                                                 │
│     Replace {{DEV_DIR_LITERAL}} with actual path            │
│                                                             │
│  4. Output                                                  │
│     packages/pt-control/generated/main.js                   │
│     packages/pt-control/generated/runtime.js                │
│                                                             │
│  5. Deploy (optional)                                       │
│     Copy to ~/pt-dev/main.js                                │
│     Copy to ~/pt-dev/runtime.js                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Template Composition

**File**: `packages/pt-runtime/src/runtime-generator.ts`

```typescript
export function generateRuntimeCode(): string {
  return `
${generateConstantsTemplate()}      // CABLE_TYPES, DEVICE_TYPES, etc.
${generateHelpersTemplate()}        // getLW(), getNet(), resolveModel(), etc.
${generateSessionTemplate()}        // IOS session management
${generateDeviceHandlersTemplate()} // handleAddDevice, handleRemoveDevice, etc.
${generateIosConfigHandlersTemplate()} // handleConfigIos, handleExecIos
${generateIosExecHandlersTemplate()}   // IOS command execution
${generateInspectHandlersTemplate()}   // handleInspect, handleSnapshot
${generateCanvasHandlersTemplate()}    // Canvas/rectangle handlers
${generateDispatcherTemplate()}     // Command dispatcher switch statement
`;
}
```

### Template Sources

| Template File | Generates |
|--------------|-----------|
| `constants-template.ts` | CABLE_TYPES, DEVICE_TYPES, MODEL_ALIASES |
| `helpers-template.ts` | Device type resolution, model lookup |
| `session-template.ts` | IOS session state management |
| `device-handlers-template.ts` | Device CRUD operations |
| `ios-config-handlers-template.ts` | IOS configuration commands |
| `ios-exec-handlers-template.ts` | IOS command execution |
| `inspect-handlers-template.ts` | Device inspection |
| `canvas-handlers-template.ts` | Canvas/rectangle operations |
| `dispatcher-template.ts` | Command routing switch |

### Build Commands

```bash
# Full build (compile + generate + deploy)
bun run pt-control:build

# Generate only (no deploy)
bun run pt-control:build --no-deploy

# Watch mode
bun run pt-control:build --watch

# Deploy only
bun run pt-control:runtime:deploy
```

---

## Command Flow - End to End

### Example: Adding a Device

```
┌──────────────┐
│  User runs:  │
│  bun run pt  │
│  device add  │
│  R1 2911     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  1. CLI (Bun/TypeScript)                                     │
│     packages/pt-control/src/cli/commands/device/add.ts       │
│                                                              │
│     const bridge = new FileBridgeV2({ root: devDir });       │
│     await bridge.sendCommandAndWait("addDevice", {           │
│       name: "R1",                                            │
│       model: "2911",                                         │
│       x: 100,                                                │
│       y: 100                                                 │
│     });                                                      │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ sendCommand()
       │ - Get next sequence number (seq=42)
       │ - Generate command ID (cmd_000000000042)
       │ - Create envelope with checksum
       │ - Write to command.json
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  2. Filesystem (~/pt-dev/command.json)                       │
│                                                              │
│  {                                                           │
│    "protocolVersion": 2,                                     │
│    "id": "cmd_000000000042",                                 │
│    "seq": 42,                                                │
│    "createdAt": 1711234567890,                               │
│    "type": "addDevice",                                      │
│    "payload": {                                              │
│      "name": "R1",                                           │
│      "model": "2911",                                        │
│      "x": 100,                                               │
│      "y": 100                                                │
│    },                                                        │
│    "attempt": 1,                                             │
│    "checksum": "sha256:abc123..."                            │
│  }                                                           │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ FileWatcher detects change (~80ms debounce)
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  3. main.js (Packet Tracer Script Engine)                    │
│                                                              │
│  function pollCommandFile() {                                │
│    var content = fm.getFileContents(COMMAND_FILE);           │
│    var cmd = JSON.parse(content);                            │
│                                                              │
│    // Clear file                                             │
│    fm.writePlainTextToFile(COMMAND_FILE, "");                │
│                                                              │
│    // Execute runtime                                        │
│    var result = runtimeFn(cmd.payload, ipc, dprint);         │
│                                                              │
│    // Write result                                           │
│    fm.writePlainTextToFile(                                  │
│      RESULTS_DIR + "/" + cmd.id + ".json",                   │
│      JSON.stringify(resultEnvelope)                          │
│    );                                                        │
│  }                                                           │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ runtimeFn() dispatches to handleAddDevice
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  4. runtime.js - handleAddDevice(payload)                    │
│                                                              │
│  function handleAddDevice(payload) {                         │
│    var lw = getLW();                                         │
│    var net = getNet();                                       │
│    var model = resolveModel(payload.model); // "2911"        │
│                                                              │
│    // Get device type candidates                             │
│    var typeList = getDeviceTypeCandidates(model);            │
│    // [0 (router), 1 (switch), ...]                          │
│                                                              │
│    // Try to create device                                   │
│    var created = createDeviceWithFallback(                   │
│      model, payload.x, payload.y, typeList, lw, net          │
│    );                                                        │
│                                                              │
│    // Rename and skip boot                                   │
│    created.device.setName(payload.name);                     │
│    created.device.skipBoot();                                │
│                                                              │
│    return {                                                  │
│      ok: true,                                               │
│      name: "R1",                                             │
│      autoName: "Router0",                                    │
│      model: "2911",                                          │
│      type: "router",                                         │
│      ports: [...]                                            │
│    };                                                        │
│  }                                                           │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ Result returned
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  5. Result File (~/pt-dev/results/cmd_000000000042.json)     │
│                                                              │
│  {                                                           │
│    "protocolVersion": 2,                                     │
│    "id": "cmd_000000000042",                                 │
│    "seq": 42,                                                │
│    "startedAt": 1711234567900,                               │
│    "completedAt": 1711234567950,                             │
│    "status": "completed",                                    │
│    "ok": true,                                               │
│    "value": {                                                │
│      "name": "R1",                                           │
│      "autoName": "Router0",                                  │
│      "model": "2911",                                        │
│      "type": "router",                                       │
│      "ports": [...]                                          │
│    }                                                         │
│  }                                                           │
└──────┬───────────────────────────────────────────────────────┘
       │
       │ ResultWatcher polls result file
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│  6. CLI receives result                                      │
│                                                              │
│     const result = await bridge.sendCommandAndWait(...);     │
│     console.log(`Device ${result.value.name} added!`);       │
│                                                              │
│     // Output: Device R1 added!                              │
└──────────────────────────────────────────────────────────────┘
```

### Event Journal

Simultaneously, events are written to `logs/events.current.ndjson`:

```ndjson
{"seq":1,"ts":1711234567000,"type":"init","version":"2.2"}
{"seq":2,"ts":1711234567100,"type":"runtime-loaded","version":"2.2"}
{"seq":3,"ts":1711234567890,"type":"command-enqueued","id":"cmd_000000000042","commandType":"addDevice"}
{"seq":4,"ts":1711234567900,"type":"command-picked","id":"cmd_000000000042","commandType":"addDevice"}
{"seq":5,"ts":1711234567950,"type":"command-completed","id":"cmd_000000000042","status":"completed","ok":true}
{"seq":6,"ts":1711234568000,"type":"device-added","name":"R1","model":"2911","uuid":"..."}
{"seq":7,"ts":1711234568100,"type":"snapshot","devices":1,"links":0}
```

---

## Directory Structure & File Layout

### Complete File Layout

```
~/pt-dev/
├─ main.js                      # PT Script Module entry point
├─ runtime.js                   # Runtime code (hot-reloadable)
├─ command.json                 # Primary command entrypoint
├─ state.json                   # Current topology snapshot
├─ bridge-lease.json            # Single-instance lease
├─ protocol.seq.json            # Sequence number store
├─ gc-state.json                # Garbage collector state
├─ sessions/
│  ├─ ios-sessions.json         # IOS session state (persistent)
│  └─ heartbeat.json            # Session heartbeat
├─ commands/                    # Command queue (advanced usage)
│  ├─ 000000000042-configIos.json
│  └─ 000000000043-addDevice.json
├─ in-flight/                   # Commands being processed
│  └─ (commands moved here during execution)
├─ results/                     # Command results
│  ├─ cmd_000000000042.json
│  └─ cmd_000000000043.json
├─ logs/                        # NDJSON event journal
│  ├─ events.current.ndjson     # Active log file
│  ├─ events.2024-03-26.ndjson  # Rotated logs
│  └─ rotation-manifest.json    # Rotation tracking
├─ consumer-state/              # Consumer checkpoints
│  └─ cli-main.json             # Last read position
└─ dead-letter/                 # Corrupted commands
   └─ (failed commands with .error.json)
```

### Source Code Structure

```
cisco-auto/
├─ packages/
│  ├─ file-bridge/
│  │  ├─ src/
│  │  │  ├─ file-bridge-v2.ts           # Main bridge class
│  │  │  ├─ file-bridge-v2-commands.ts  # pushCommands helper
│  │  │  ├─ file-bridge-v2-types.ts     # Type definitions
│  │  │  ├─ event-log-writer.ts         # NDJSON writer
│  │  │  ├─ durable-ndjson-consumer.ts  # NDJSON reader
│  │  │  ├─ shared-result-watcher.ts    # Result file polling
│  │  │  ├─ backpressure-manager.ts     # Flow control
│  │  │  ├─ shared/
│  │  │  │  ├─ protocol.ts             # Protocol types
│  │  │  │  ├─ path-layout.ts          # Directory structure
│  │  │  │  ├─ sequence-store.ts       # Sequence numbers
│  │  │  │  ├─ command-seq.ts          # Sequence value object
│  │  │  │  └─ fs-atomic.ts            # Atomic file ops
│  │  │  └─ v2/
│  │  │     ├─ lease-manager.ts        # Single-instance lock
│  │  │     ├─ command-processor.ts    # Command execution
│  │  │     ├─ crash-recovery.ts       # Recovery after crash
│  │  │     ├─ diagnostics.ts          # Health monitoring
│  │  │     └─ garbage-collector.ts    # Cleanup
│  │  ├─ tests/
│  │  │  ├─ file-bridge-v2.test.ts
│  │  │  ├─ lease-management.test.ts
│  │  │  ├─ crash-recovery.test.ts
│  │  │  └─ garbage-collection.test.ts
│  │  └─ package.json
│  │
│  ├─ pt-runtime/
│  │  ├─ src/
│  │  │  ├─ index.ts                   # Generator entry
│  │  │  ├─ compose.ts                 # Runtime composition
│  │  │  ├─ runtime-generator.ts       # Code generation
│  │  │  ├─ runtime-validator.ts       # Syntax validation
│  │  │  ├─ templates/
│  │  │  │  ├─ main.ts                 # main.js template
│  │  │  │  ├─ runtime.ts              # runtime.js template (wrapper)
│  │  │  │  ├─ constants-template.ts
│  │  │  │  ├─ helpers-template.ts
│  │  │  │  ├─ session-template.ts
│  │  │  │  ├─ device-handlers-template.ts
│  │  │  │  ├─ ios-config-handlers-template.ts
│  │  │  │  ├─ ios-exec-handlers-template.ts
│  │  │  │  ├─ inspect-handlers-template.ts
│  │  │  │  ├─ canvas-handlers-template.ts
│  │  │  │  └─ dispatcher-template.ts
│  │  │  └─ handlers/
│  │  │     ├─ device.ts
│  │  │     ├─ link.ts
│  │  │     ├─ config.ts
│  │  │     ├─ inspect.ts
│  │  │     └─ canvas.ts
│  │  ├─ tests/
│  │  └─ package.json
│  │
│  ├─ pt-control/
│  │  ├─ src/
│  │  │  ├─ controller/
│  │  │  │  ├─ index.ts                # PTController class
│  │  │  │  └─ traceable-bridge.ts     # Tracing decorator
│  │  │  ├─ application/
│  │  │  │  ├─ services/
│  │  │  │  │  ├─ device-service.ts
│  │  │  │  │  ├─ topology-service.ts
│  │  │  │  │  └─ ios-service.ts
│  │  │  │  └─ ports/
│  │  │  │     └─ file-bridge.port.ts  # Port interface
│  │  │  ├─ infrastructure/
│  │  │  │  └─ pt/
│  │  │  │     └─ file-bridge-v2-adapter.ts
│  │  │  └─ cli/
│  │  │     └─ commands/
│  │  │        ├─ device/
│  │  │        ├─ link/
│  │  │        ├─ config/
│  │  │        └─ runtime/
│  │  ├─ scripts/
│  │  │  └─ build.ts                   # Build script
│  │  ├─ generated/
│  │  │  ├─ main.js                    # Generated main.js
│  │  │  └─ runtime.js                 # Generated runtime.js
│  │  └─ package.json
│  │
│  └─ types/
│     └─ src/
│        └─ schemas/
│           └─ bridge.ts                # Zod schemas
│
└─ docs/
   ├─ PT_CONTROL_IMPLEMENTATION.md
   ├─ PT_CONTROL_QUICKSTART.md
   ├─ PT_CONTROL_INSTALL.md
   └─ FILEBRIDGE_RUNTIME_COMPLETE_GUIDE.md  # This file
```

---

## Protocol & Message Formats

### Command Envelope

```typescript
interface BridgeCommandEnvelope<TPayload = unknown> {
  protocolVersion: 2;
  id: string;              // "cmd_000000000042"
  seq: number;             // 42
  createdAt: number;       // Timestamp
  type: string;            // "addDevice", "configIos", etc.
  payload: TPayload;       // Command-specific payload
  attempt: number;         // Retry count (1-based)
  expiresAt?: number;      // Optional expiration timestamp
  checksum: string;        // "sha256:abc123..."
}
```

### Result Envelope

```typescript
interface BridgeResultEnvelope<TResult = unknown> {
  protocolVersion: 2;
  id: string;              // Matches command.id
  seq: number;             // Matches command.seq
  startedAt: number;       // Execution start timestamp
  completedAt: number;     // Execution end timestamp
  status: "completed" | "failed" | "timeout";
  ok: boolean;
  value?: TResult;         // Success result
  error?: {
    code: string;          // "EXPIRED", "CHECKSUM_MISMATCH", etc.
    message: string;
    phase: "queue" | "execution" | "validation";
    stack?: string;
  };
}
```

### Bridge Event

```typescript
interface BridgeEvent {
  seq: number;             // Monotonic sequence
  ts: number;              // Timestamp
  type: string;            // Event type
  
  // Event-specific fields
  id?: string;             // Command ID (for command events)
  commandType?: string;    // Command type (for command events)
  status?: string;         // Command status (for result events)
  ok?: boolean;            // Success/failure (for result events)
  value?: unknown;         // Result value (for result events)
  message?: string;        // Error message (for error events)
  stack?: string;          // Stack trace (for error events)
  
  // PT events
  name?: string;           // Device name
  model?: string;          // Device model
  uuid?: string;           // Device UUID
  device1?: string;        // Link endpoint 1
  port1?: string;          // Port 1
  device2?: string;        // Link endpoint 2
  port2?: string;          // Port 2
  connType?: number;       // Connection type
}
```

### Command Payloads

#### addDevice

```typescript
{
  type: "addDevice",
  payload: {
    name: string;          // Device name (e.g., "R1")
    model: string;         // Model (e.g., "2911", "2960-24TT")
    x?: number;            // X coordinate (default: 100)
    y?: number;            // Y coordinate (default: 100)
    deviceType?: number;   // Optional device type override
  }
}
```

#### configIos

```typescript
{
  type: "configIos",
  payload: {
    device: string;        // Device name
    commands: string[];    // Array of IOS commands
    stopOnError?: boolean; // Stop on first error (default: true)
    save?: boolean;        // Save config (default: true)
  }
}
```

Example:
```json
{
  "type": "configIos",
  "payload": {
    "device": "R1",
    "commands": [
      "conf t",
      "hostname R1",
      "int g0/0",
      "ip address 192.168.1.1 255.255.255.0",
      "no shut",
      "end"
    ],
    "stopOnError": true,
    "save": true
  }
}
```

#### snapshot

```typescript
{
  type: "snapshot",
  payload: {}
}
```

Returns:
```typescript
{
  ok: true,
  version: "1.0",
  timestamp: number,
  devices: {
    [name: string]: {
      name: string;
      model: string;
      type: string;
      power: boolean;
      ports: Array<{ name: string; ipAddress?: string; macAddress?: string }>;
    }
  },
  links: {
    [id: string]: {
      id: string;
      device1: string;
      port1: string;
      device2: string;
      port2: string;
      cableType: string;
      connected: boolean;
    }
  },
  metadata: {
    deviceCount: number;
    linkCount: number;
  }
}
```

---

## Key Components Reference

### FileBridge V2 Options

```typescript
interface FileBridgeV2Options {
  root: string;              // ~/pt-dev directory
  consumerId?: string;       // Consumer identifier (default: "cli-main")
  resultTimeoutMs?: number;  // Timeout for sendCommandAndWait (default: 120000)
  leaseIntervalMs?: number;  // Lease renewal interval (default: 1000)
  leaseTtlMs?: number;       // Lease TTL (default: 5000)
  maxPendingCommands?: number; // Backpressure limit (default: 100)
  enableBackpressure?: boolean; // Enable flow control (default: true)
}
```

### Usage Example

```typescript
import { FileBridgeV2 } from "@cisco-auto/file-bridge";

const bridge = new FileBridgeV2({
  root: "/Users/andresgaibor/pt-dev",
  consumerId: "cli-main",
  resultTimeoutMs: 60000,
  maxPendingCommands: 50,
});

bridge.on("runtime-loaded", () => {
  console.log("Runtime loaded successfully");
});

bridge.on("lease-denied", () => {
  console.error("Another instance is running!");
});

bridge.start();

// Send command and wait for result
const result = await bridge.sendCommandAndWait("addDevice", {
  name: "R1",
  model: "2911",
  x: 100,
  y: 100,
});

console.log(`Device ${result.value.name} added!`);

// Load custom runtime
await bridge.loadRuntimeFromFile("./custom-runtime.js");

// Check health
const health = bridge.diagnostics();
console.log(`Bridge health: ${health.status}`);

// Cleanup old files
const gcReport = bridge.gc({ resultTtlMs: 3600000 });
console.log(`Cleaned ${gcReport.resultsRemoved} result files`);

await bridge.stop();
```

### PT IPC API Reference

Packet Tracer's Script Engine provides these global objects:

```javascript
// Global IPC entry point
var ipc = ...;  // Provided by PT

// System file management
var fm = ipc.systemFileManager();
fm.fileExists(path);
fm.directoryExists(path);
fm.getFileContents(path);
fm.writePlainTextToFile(path, content);
fm.makeDirectory(path);
fm.renameFile(oldPath, newPath);

// File watching
var fw = fm.getFileWatcher();
fw.addPath(path);
fw.registerEvent("fileChanged", null, callback);
fw.unregisterEvent("fileChanged", null, callback);

// Network topology
var net = ipc.network();
net.getDeviceCount();
net.getDeviceAt(index);
net.getDevice(name);

// Logical workspace
var lw = ipc.appWindow().getActiveWorkspace().getLogicalWorkspace();
lw.addDevice(typeId, model, x, y);
lw.removeDevice(name);
lw.createLink(dev1, port1, dev2, port2, cableType);
lw.deleteLink(dev, port);

// Device
var device = net.getDevice("R1");
device.getName();
device.setName(name);
device.getModel();
device.getType();
device.getPower();
device.setPower(on);
device.getPortCount();
device.getPortAt(index);
device.getCommandLine();
device.skipBoot();
device.addModule(slot, module);
device.removeModule(slot);
device.setX(x);
device.setY(y);

// Terminal line (IOS CLI)
var term = device.getCommandLine();
term.enterCommand(cmd);  // Returns [status, output]

// Host port (IP configuration)
var port = device.getPortAt(0);
port.setIpSubnetMask(ip, mask);
port.setDefaultGateway(gateway);
port.setDnsServerIp(dns);
port.setDhcpEnabled(enabled);

// Command log
var cl = ipc.commandLog();
cl.setEnabled(true);
cl.getEntryCount();
cl.getEntryAt(index);
cl.registerEvent("entryAdded", null, callback);
```

---

## Quick Reference Commands

### Build & Deploy

```bash
# Full build
bun run pt-control:build

# Generate only
bun run pt-control:runtime:generate

# Deploy to PT
bun run pt-control:runtime:deploy

# Watch mode
bun run pt-control:build --watch
```

### CLI Usage

```bash
# Device management
bun run pt device add R1 2911 100 100
bun run pt device remove R1
bun run pt device list
bun run pt device rename R1 Router1
bun run pt device move R1 200 200

# Link management
bun run pt link add R1:G0/0 S1:G0/1 straight
bun run pt link remove R1:G0/0

# Configuration
bun run pt config host PC1 192.168.1.10 255.255.255.0 192.168.1.1
bun run pt config ios R1 "conf t" "hostname R1" "end"

# Inspection
bun run pt snapshot
bun run pt inspect R1

# Runtime management
bun run pt runtime build
bun run pt runtime deploy
bun run pt runtime status
bun run pt runtime doctor
```

---

## Troubleshooting

### Common Issues

#### 1. "Bridge lease denied"

**Cause**: Another CLI instance is running or crashed without releasing lease.

**Solution**:
```bash
# Check for running instances
ps aux | grep "pt-control"

# Manually remove lease file
rm ~/pt-dev/bridge-lease.json

# Restart CLI
```

#### 2. "Runtime not loaded"

**Cause**: `runtime.js` missing or syntax error.

**Solution**:
```bash
# Regenerate runtime
bun run pt-control:runtime:generate

# Deploy to PT
bun run pt-control:runtime:deploy

# Check PT console for errors
```

#### 3. "Command timeout"

**Cause**: PT not running, or FileWatcher not detecting changes.

**Solution**:
```bash
# Verify PT is running
# Check ~/pt-dev directory exists
ls -la ~/pt-dev/

# Test file watcher
echo "test" > ~/pt-dev/runtime.js

# Check events log
tail -f ~/pt-dev/logs/events.current.ndjson
```

#### 4. "Backpressure limit exceeded"

**Cause**: Too many pending commands.

**Solution**:
```bash
# Wait for commands to drain
# Or increase limit in FileBridgeV2 options
const bridge = new FileBridgeV2({
  maxPendingCommands: 200,  // Increase from 100
});
```

#### 5. IOS session stuck

**Cause**: Session state corrupted.

**Solution**:
```bash
# Reset sessions file
rm ~/pt-dev/sessions/ios-sessions.json

# Restart PT
# Sessions will be recreated automatically
```

---

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| FileWatcher detection | ~80ms | Debounced |
| Command execution (simple) | 50-200ms | Depends on command |
| IOS config (10 commands) | 500-2000ms | Depends on device |
| Snapshot | 100-500ms | Depends on topology size |
| Runtime hot reload | ~100ms | File change to ready |
| Result polling | 25-500ms | Exponential backoff |

---

## Security Considerations

1. **No network exposure**: File-based IPC doesn't open ports
2. **File permissions**: Ensure `~/pt-dev/` is only accessible by your user
3. **No authentication**: Anyone with filesystem access can send commands
4. **Code execution**: `runtime.js` runs with full PT IPC access - don't load untrusted code

---

## Future Enhancements

### Planned Features

1. **Multi-client support**: HTTP bridge for multiple simultaneous clients
2. **WebSocket bridge**: Real-time UI integration
3. **Command queuing priorities**: High-priority commands jump queue
4. **Transaction support**: Atomic multi-command operations
5. **Rollback capability**: Undo last N commands
6. **Recording/Playback**: Record sessions for replay
7. **Topology validation**: Verify topology meets requirements
8. **Template system**: Predefined topology templates

### Experimental Features

1. **VDOM (Virtual Device Object Model)**: React-like state management
2. **Hot module replacement**: Replace runtime modules without full reload
3. **Distributed tracing**: Track commands across multiple bridges
4. **Metrics collection**: Prometheus-compatible metrics

---

**Last Updated**: 2026-04-01
**Version**: 2.2.0
**Maintainer**: Cisco Auto Team
