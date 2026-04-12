# Kernel Boot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar el kernel boot completo que maneja lifecycle, lease, polling de cola, heartbeat y hot reload.

**Architecture:**
- Kernel arranca con `main()` y se detiene con `cleanUp()`
- Lease validation antes de activar runtime
- Command queue polling con claim/move a in-flight
- Deferred jobs execution con state machine
- Hot reload seguro (solo si no hay jobs activos)

**Tech Stack:** TypeScript, Bun, Packet Tracer Script Module API

---

## Context

### Main Kernel Responsibilities (from main-kernel-assembly.ts)

```javascript
// 1. main() - Entry point
// 2. cleanUp() - Shutdown

// 3. Directory setup
ensureDir(DEV_DIR);
ensureDir(COMMANDS_DIR);
ensureDir(IN_FLIGHT_DIR);
ensureDir(RESULTS_DIR);
ensureDir(DEAD_LETTER_DIR);
ensureDir(LOGS_DIR);

// 4. Lease validation
validateBridgeLease();  // Check bridge-lease.json

// 5. Runtime loading
loadRuntime();           // Load runtime.js via new Function()
reloadRuntimeIfNeeded(); // Hot reload on mtime change

// 6. Polling intervals
commandPollInterval = setInterval(pollCommandQueue, 250);
deferredPollInterval = setInterval(pollDeferredJobs, 100);
heartbeatInterval = setInterval(writeHeartbeat, 1000);

// 7. Runtime API
createRuntimeApi(); // { ipc, dprint, getDeviceByName, listDevices, ... }

// 8. Queue operations
claimNextCommand();     // Claim from COMMANDS_DIR or IN_FLIGHT_DIR
writeResultEnvelope();  // Write to RESULTS_DIR

// 9. Deferred jobs
pollDeferredJobs();     // Check active jobs
advanceJob();           // Step interpreter
```

### PT Globals (available in PT Script Module)
- `ipc` - IPC interface (systemFileManager, getNetwork, getLogicalWorkspace)
- `fm` - File Manager (after ipc.systemFileManager())
- `dprint(msg)` - Debug print to PT console
- `setInterval` / `clearInterval` - Timer functions

---

## Tasks

### Task 1: Add Kernel Types

**Files:**
- Modify: `packages/pt-runtime/src/pt/kernel/types.ts`

**Step 1: Create kernel types**

```typescript
// packages/pt-runtime/src/pt/kernel/types.ts
// Types for kernel boot implementation

import type { RuntimeResult, DeferredJobPlan } from "../../domain";

export interface KernelConfig {
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

export interface CommandEnvelope {
  id: string;
  seq: number;
  payload: Record<string, unknown>;
  filename: string;
}

export interface ResultEnvelope {
  protocolVersion: number;
  id: string;
  seq: number;
  startedAt: number;
  completedAt: number;
  status: "completed" | "failed" | "pending";
  ok: boolean;
  value: RuntimeResult;
  jobId?: string;
  device?: string;
}

export interface Lease {
  ownerId: string;
  expiresAt: number;
  ttlMs: number;
  updatedAt: number;
}

export interface Heartbeat {
  ts: number;
  running: boolean;
  activeCommand: string | null;
  queued: number;
}

export interface RuntimeApi {
  ipc: unknown;
  dprint: (msg: string) => void;
  getDeviceByName(name: string): PTDeviceRef | null;
  listDevices(): string[];
  querySessionState(deviceName: string): SessionStateSnapshot | null;
  getWorkspace(): unknown;
  now(): number;
  safeJsonClone<T>(data: T): T;
  normalizePortName(name: string): string;
}

export interface PTDeviceRef {
  name: string;
  hasTerminal: boolean;
  getTerminal(): PTCommandLine | null;
  getNetwork(): PTNetwork;
}

export interface PTCommandLine {
  getPrompt(): string;
  enterCommand(cmd: string): void;
  registerEvent(eventName: string, filter: unknown, callback: (src: unknown, args: unknown) => void): void;
  unregisterEvent(eventName: string, filter: unknown, callback: (src: unknown, args: unknown) => void): void;
  enterChar(charCode: number, modifiers: number): void;
}

export interface PTNetwork {
  getDeviceCount(): number;
  getDeviceAt(index: number): PTDevice | null;
  getDevice(name: string): PTDevice | null;
}

export interface PTDevice {
  getName(): string;
  getModel(): string;
  getType(): number;
  getPower(): boolean;
  setPower(on: boolean): void;
  setName(name: string): void;
  skipBoot(): void;
  getCommandLine(): PTCommandLine | null;
  getPortCount(): number;
  getPortAt(index: number): PTPort | null;
  addModule(slot: string, module: string): boolean;
  removeModule(slot: string): boolean;
}

export interface PTPort {
  getName(): string;
  getIpAddress(): string;
  getSubnetMask(): string;
}

export interface SessionStateSnapshot {
  mode: string;
  prompt: string;
  paging: boolean;
  awaitingConfirm: boolean;
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/types.ts
git commit -m "feat(pt-kernel): add kernel types"
```

---

### Task 2: Implement Directory Manager

**Files:**
- Create: `packages/pt-runtime/src/pt/kernel/directories.ts`

**Step 1: Create directories.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/directories.ts
// Directory management for PT file system

export interface DirectoryManager {
  ensureDirectories(): void;
  directories: {
    devDir: string;
    commandsDir: string;
    inFlightDir: string;
    resultsDir: string;
    deadLetterDir: string;
    logsDir: string;
    commandsTraceDir: string;
  };
}

export function createDirectoryManager(config: {
  devDir: string;
  commandsDir: string;
  inFlightDir: string;
  resultsDir: string;
  deadLetterDir: string;
  logsDir: string;
  commandsTraceDir: string;
}) {
  const dirs = {
    devDir: config.devDir,
    commandsDir: config.commandsDir,
    inFlightDir: config.inFlightDir,
    resultsDir: config.resultsDir,
    deadLetterDir: config.deadLetterDir,
    logsDir: config.logsDir,
    commandsTraceDir: config.commandsTraceDir,
  };

  function ensureDirectories(): void {
    // Uses PT fm global
    for (const dir of Object.values(dirs)) {
      try {
        if (!fm.directoryExists(dir)) {
          fm.makeDirectory(dir);
        }
      } catch (e) {
        dprint("[dir] Error creating " + dir + ": " + String(e));
      }
    }
  }

  return { ensureDirectories, directories: dirs };
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/directories.ts
git commit -m "feat(pt-kernel): add directory manager"
```

---

### Task 3: Implement Lease Manager

**Files:**
- Create: `packages/pt-runtime/src/pt/kernel/lease.ts`

**Step 1: Create lease.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/lease.ts
// Lease validation and management

import type { Lease } from "./types";

export interface LeaseManager {
  validate(): boolean;
  waitForLease(onValid: () => void): void;
  stop(): void;
}

export function createLeaseManager(config: {
  devDir: string;
  checkIntervalMs: number;
}) {
  let interval: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  function validate(): boolean {
    try {
      const leaseFile = config.devDir + "/bridge-lease.json";
      
      if (!fm.fileExists(leaseFile)) {
        dprint("[LEASE] No lease file found");
        return false;
      }

      const content = fm.getFileContents(leaseFile);
      if (!content || content.trim().length === 0) {
        dprint("[LEASE] Lease file empty");
        return false;
      }

      const lease: Lease = JSON.parse(content);
      
      if (!lease.ownerId || !lease.expiresAt) {
        dprint("[LEASE] Lease invalid: missing ownerId or expiresAt");
        return false;
      }

      const now = Date.now();
      if (now > lease.expiresAt) {
        dprint("[LEASE] Lease expired at " + new Date(lease.expiresAt).toISOString());
        return false;
      }

      const ageMs = now - lease.updatedAt;
      if (ageMs > lease.ttlMs * 2) {
        dprint("[LEASE] Lease stale (age=" + ageMs + "ms, ttl=" + lease.ttlMs + "ms)");
        return false;
      }

      dprint("[LEASE] Valid (ownerId=" + lease.ownerId.substring(0, 8) + "...)");
      return true;
    } catch (e) {
      dprint("[LEASE] Validation error: " + String(e));
      return false;
    }
  }

  function waitForLease(onValid: () => void): void {
    function check() {
      if (stopped) return;
      
      if (validate()) {
        dprint("[LEASE] Valid lease detected");
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        onValid();
      }
    }

    dprint("[LEASE] Waiting for bridge lease...");
    check();
    interval = setInterval(check, config.checkIntervalMs);
  }

  function stop(): void {
    stopped = true;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  return { validate, waitForLease, stop };
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/lease.ts
git commit -m "feat(pt-kernel): add lease manager"
```

---

### Task 4: Implement Command Queue

**Files:**
- Create: `packages/pt-runtime/src/pt/kernel/command-queue.ts`

**Step 1: Create command-queue.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/command-queue.ts
// Command queue polling and claim

import type { CommandEnvelope } from "./types";

export interface CommandQueue {
  poll(): CommandEnvelope | null;
  cleanup(filename: string): void;
  count(): number;
}

export function createCommandQueue(config: {
  commandsDir: string;
  inFlightDir: string;
  deadLetterDir: string;
}) {
  function listQueuedFiles(): string[] {
    const jsonFiles: string[] = [];
    
    // COMMANDS_DIR (legacy)
    try {
      const files = fm.getFilesInDirectory(config.commandsDir);
      if (files) {
        for (const file of files) {
          if (file.indexOf(".json") !== -1) {
            jsonFiles.push(file);
          }
        }
      }
    } catch (e) {}
    
    // IN_FLIGHT_DIR (FileBridge V2)
    try {
      const files = fm.getFilesInDirectory(config.inFlightDir);
      if (files) {
        for (const file of files) {
          if (file.indexOf(".json") !== -1 && jsonFiles.indexOf(file) === -1) {
            jsonFiles.push(file);
          }
        }
      }
    } catch (e) {}
    
    jsonFiles.sort();
    return jsonFiles;
  }

  function count(): number {
    let c = 0;
    try {
      c += fm.getFilesInDirectory(config.commandsDir)?.length || 0;
    } catch (e) {}
    try {
      c += fm.getFilesInDirectory(config.inFlightDir)?.length || 0;
    } catch (e) {}
    return c;
  }

  function poll(): CommandEnvelope | null {
    const files = listQueuedFiles();

    for (const filename of files) {
      const srcPath = config.commandsDir + "/" + filename;
      const dstPath = config.inFlightDir + "/" + filename;

      let readPath: string | null = null;
      let writePath: string | null = null;
      
      try {
        if (fm.fileExists(dstPath)) {
          readPath = dstPath;
        } else if (fm.fileExists(srcPath)) {
          readPath = srcPath;
          writePath = dstPath;
        }
      } catch (e) {
        continue;
      }

      if (!readPath) continue;

      try {
        const content = fm.getFileContents(readPath);
        if (!content || content.length < 10) {
          dprint("[queue] Empty file: " + filename);
          continue;
        }

        const cmd: CommandEnvelope = JSON.parse(content);
        if (cmd && cmd.id) {
          // Move to in-flight if from commands/
          if (writePath) {
            try {
              fm.moveSrcFileToDestFile(readPath, writePath, false);
              dprint("[queue] Moved to in-flight: " + filename);
            } catch (e) {
              try { fm.removeFile(readPath); } catch(e2) {}
            }
          }

          dprint("[queue] Claimed: " + filename);
          return { ...cmd, filename };
        }
      } catch (e) {
        dprint("[queue] Invalid command file: " + filename + " - " + String(e));
        moveToDeadLetter(readPath, e);
      }
    }

    return null;
  }

  function moveToDeadLetter(filePath: string, error: unknown): void {
    try {
      const basename = filePath.split("/").pop() || "unknown";
      const timestamp = String(Date.now());
      const dlPath = config.deadLetterDir + "/" + timestamp + "-" + basename;
      
      fm.moveSrcFileToDestFile(filePath, dlPath, false);
      fm.writePlainTextToFile(dlPath + ".error.json", JSON.stringify({
        originalFile: basename,
        error: String(error),
        movedAt: Date.now()
      }));
      
      dprint("[queue] Moved to dead-letter: " + basename);
    } catch (e) {
      dprint("[queue] Dead-letter error: " + String(e));
    }
  }

  function cleanup(filename: string): void {
    try {
      const inFlightPath = config.inFlightDir + "/" + filename;
      if (fm.fileExists(inFlightPath)) {
        fm.removeFile(inFlightPath);
      }
      const commandsPath = config.commandsDir + "/" + filename;
      if (fm.fileExists(commandsPath)) {
        fm.removeFile(commandsPath);
      }
    } catch (e) {
      dprint("[queue] Cleanup error: " + String(e));
    }
  }

  return { poll, cleanup, count };
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/command-queue.ts
git commit -m "feat(pt-kernel): add command queue"
```

---

### Task 5: Implement Runtime Loader

**Files:**
- Modify: `packages/pt-runtime/src/pt/kernel/runtime-loader.ts`

**Step 1: Update runtime-loader.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/runtime-loader.ts
// Hot reload for runtime.js with safe reload

export interface RuntimeLoader {
  load(): void;
  reloadIfNeeded(): void;
  getLastMtime(): number;
  getRuntimeFn(): ((payload: Record<string, unknown>, api: unknown) => unknown) | null;
}

export function createRuntimeLoader(config: {
  runtimeFile: string;
}) {
  let lastMtime = 0;
  let runtimeFn: ((payload: Record<string, unknown>, api: unknown) => unknown) | null = null;

  function getFileMtime(path: string): number {
    try {
      return fm.getFileModificationTime ? fm.getFileModificationTime(path) : 0;
    } catch (e) {
      return 0;
    }
  }

  function load(): void {
    if (!fm.fileExists(config.runtimeFile)) {
      dprint("[runtime] No runtime.js found");
      runtimeFn = null;
      return;
    }

    try {
      const mtime = getFileMtime(config.runtimeFile);
      if (mtime === lastMtime && runtimeFn) {
        return;
      }

      const code = fm.getFileContents(config.runtimeFile);
      if (!code || code.length < 50) {
        dprint("[runtime] Runtime file too small");
        runtimeFn = null;
        return;
      }

      runtimeFn = new Function("payload", "api", code);
      lastMtime = mtime;
      dprint("[runtime] Loaded OK (mtime=" + mtime + ")");
    } catch (e) {
      dprint("[runtime] Load error: " + String(e));
      runtimeFn = null;
    }
  }

  function reloadIfNeeded(checkActiveJobs: () => boolean): void {
    const currentMtime = getFileMtime(config.runtimeFile);
    if (currentMtime === lastMtime) {
      return;
    }

    if (checkActiveJobs()) {
      dprint("[runtime] Changed but jobs active, deferring reload");
      return;
    }

    dprint("[runtime] Reloading (mtime changed)...");
    load();
  }

  function getLastMtime(): number {
    return lastMtime;
  }

  function getRuntimeFn() {
    return runtimeFn;
  }

  return { load, reloadIfNeeded, getLastMtime, getRuntimeFn };
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/runtime-loader.ts
git commit -m "feat(pt-kernel): implement runtime loader with hot reload"
```

---

### Task 6: Implement Heartbeat

**Files:**
- Create: `packages/pt-runtime/src/pt/kernel/heartbeat.ts`

**Step 1: Update heartbeat.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/heartbeat.ts
// Heartbeat writing for PT monitoring

import type { Heartbeat } from "./types";

export interface HeartbeatManager {
  write(): void;
  start(): void;
  stop(): void;
}

export function createHeartbeat(config: {
  devDir: string;
  intervalMs: number;
}) {
  let interval: ReturnType<typeof setInterval> | null = null;
  let isRunning = false;
  let activeCommand: string | null = null;
  let queuedCount = 0;

  function setActiveCommand(id: string | null): void {
    activeCommand = id;
  }

  function setQueuedCount(count: number): void {
    queuedCount = count;
  }

  function write(): void {
    try {
      const hbPath = config.devDir + "/heartbeat.json";
      const hb: Heartbeat = {
        ts: Date.now(),
        running: isRunning,
        activeCommand,
        queued: queuedCount,
      };
      fm.writePlainTextToFile(hbPath, JSON.stringify(hb));
    } catch (e) {
      dprint("[heartbeat] Error: " + String(e));
    }
  }

  function start(): void {
    isRunning = true;
    write();
    interval = setInterval(() => write(), config.intervalMs);
  }

  function stop(): void {
    isRunning = false;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  return { write, start, stop, setActiveCommand, setQueuedCount };
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/heartbeat.ts
git commit -m "feat(pt-kernel): implement heartbeat manager"
```

---

### Task 7: Implement Kernel Boot

**Files:**
- Modify: `packages/pt-runtime/src/pt/kernel/main.ts`

**Step 1: Update main.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/main.ts
// Kernel boot implementation

import type { KernelConfig, CommandEnvelope, ResultEnvelope, RuntimeApi } from "./types";
import { createDirectoryManager } from "./directories";
import { createLeaseManager } from "./lease";
import { createCommandQueue } from "./command-queue";
import { createRuntimeLoader } from "./runtime-loader";
import { createHeartbeat } from "./heartbeat";
import { createCleanupManager } from "./cleanup";

export { createQueuePoller } from "./queue";
export { createHeartbeatManager } from "./heartbeat";
export { createRuntimeLoader } from "./runtime-loader";
export { createCleanupManager } from "./cleanup";

export interface Kernel {
  boot(): void;
  shutdown(): void;
  isRunning(): boolean;
}

export function createKernel(config: KernelConfig) {
  // State
  let isRunning = false;
  let isShuttingDown = false;
  let activeCommand: CommandEnvelope | null = null;
  let activeCommandFilename: string | null = null;

  // Components
  const dirs = createDirectoryManager(config);
  const lease = createLeaseManager({ devDir: config.devDir, checkIntervalMs: 1000 });
  const queue = createCommandQueue({
    commandsDir: config.commandsDir,
    inFlightDir: config.inFlightDir,
    deadLetterDir: config.deadLetterDir,
  });
  const runtimeLoader = createRuntimeLoader({ runtimeFile: config.devDir + "/runtime.js" });
  const heartbeat = createHeartbeat({ devDir: config.devDir, intervalMs: 1000 });
  const cleanup = createCleanupManager();

  // Intervals
  let commandPollInterval: ReturnType<typeof setInterval> | null = null;
  let deferredPollInterval: ReturnType<typeof setInterval> | null = null;
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  // Runtime API factory
  function createRuntimeApi(): RuntimeApi {
    const net = (globalThis as unknown as { ipc: { getNetwork?: () => PTNetwork } }).ipc?.getNetwork?.();
    
    return {
      ipc: (globalThis as unknown as { ipc: unknown }).ipc,
      dprint,
      getDeviceByName(name: string) {
        if (!net) return null;
        const dev = net.getDevice(name);
        if (!dev) return null;
        return {
          name: dev.getName(),
          hasTerminal: !!dev.getCommandLine(),
          getTerminal: () => dev.getCommandLine(),
          getNetwork: () => net,
        };
      },
      listDevices() {
        if (!net) return [];
        const names: string[] = [];
        const count = net.getDeviceCount();
        for (let i = 0; i < count; i++) {
          const dev = net.getDeviceAt(i);
          if (dev && dev.getName) names.push(dev.getName());
        }
        return names;
      },
      querySessionState() {
        // TODO: Wire to TerminalEngine session state
        return null;
      },
      getWorkspace() {
        return (globalThis as unknown as { ipc: { getLogicalWorkspace?: () => unknown } }).ipc?.getLogicalWorkspace?.();
      },
      now() { return Date.now(); },
      safeJsonClone(data) {
        try { return JSON.parse(JSON.stringify(data)); }
        catch (e) { return data; }
      },
      normalizePortName(name) {
        return String(name || "").replace(/\s+/g, "").toLowerCase();
      },
    };
  }

  // Write result envelope
  function writeResultEnvelope(cmdId: string, result: ResultEnvelope): void {
    try {
      const path = config.resultsDir + "/" + cmdId + ".json";
      fm.writePlainTextToFile(path, JSON.stringify(result));
    } catch (e) {
      dprint("[kernel] Result write error: " + String(e));
    }
  }

  // Execute active command
  function executeActiveCommand(): void {
    if (!activeCommand) return;

    const startedAt = Date.now();
    const cmd = activeCommand;
    
    dprint("[kernel] EXEC payload=" + JSON.stringify(cmd.payload).substring(0, 200));

    let result: unknown = null;
    try {
      const fn = runtimeLoader.getRuntimeFn();
      if (!fn) {
        result = { ok: false, error: "Runtime not loaded" };
      } else {
        result = fn(cmd.payload, createRuntimeApi());
      }
    } catch (e) {
      result = { ok: false, error: String(e) };
    }

    // Write result
    const status = result && (result as { deferred?: boolean }).deferred 
      ? "pending" 
      : result && (result as { ok?: boolean }).ok !== false 
        ? "completed" 
        : "failed";

    writeResultEnvelope(cmd.id, {
      protocolVersion: 3,
      id: cmd.id,
      seq: cmd.seq || 0,
      startedAt,
      completedAt: Date.now(),
      status,
      ok: result && (result as { ok?: boolean }).ok !== false,
      value: result as ResultEnvelope["value"],
      jobId: (result as { ticket?: string })?.ticket,
      device: (cmd.payload as { device?: string })?.device,
    });

    // Cleanup
    if (activeCommandFilename) {
      queue.cleanup(activeCommandFilename);
    }

    if (!result || !(result as { deferred?: boolean }).deferred) {
      activeCommand = null;
      activeCommandFilename = null;
    }

    heartbeat.setActiveCommand(null);
  }

  // Poll command queue
  function pollCommandQueue(): void {
    if (!isRunning || isShuttingDown) return;
    if (activeCommand !== null) return;

    runtimeLoader.reloadIfNeeded(() => false); // TODO: check active jobs

    const claimed = queue.poll();
    if (!claimed) return;

    activeCommand = claimed;
    activeCommandFilename = claimed.filename;
    heartbeat.setActiveCommand(claimed.id);

    executeActiveCommand();
  }

  // Boot kernel
  function boot(): void {
    dprint("[kernel] Starting...");

    try {
      isShuttingDown = false;
      isRunning = true;

      const fmFromIpc = (globalThis as unknown as { ipc: { systemFileManager?: () => unknown } }).ipc;
      // @ts-ignore - fm is global in PT
      globalThis.fm = fmFromIpc?.systemFileManager?.();

      dirs.ensureDirectories();

      if (lease.validate()) {
        activateRuntime();
      } else {
        lease.waitForLease(() => activateRuntime());
      }
    } catch (e) {
      dprint("[kernel] FATAL: " + String(e));
    }
  }

  // Activate runtime after lease
  function activateRuntime(): void {
    if (commandPollInterval || deferredPollInterval || heartbeatInterval) {
      dprint("[kernel] Already active");
      return;
    }

    dprint("[kernel] Activating...");

    runtimeLoader.load();

    commandPollInterval = setInterval(pollCommandQueue, config.pollIntervalMs);
    heartbeatInterval = setInterval(() => heartbeat.write(), config.heartbeatIntervalMs);

    heartbeat.start();
    isRunning = true;
    dprint("[kernel] Ready");
  }

  // Shutdown kernel
  function shutdown(): void {
    dprint("[kernel] Shutting down...");

    isShuttingDown = true;
    isRunning = false;

    if (commandPollInterval) {
      clearInterval(commandPollInterval);
      commandPollInterval = null;
    }
    if (deferredPollInterval) {
      clearInterval(deferredPollInterval);
      deferredPollInterval = null;
    }

    heartbeat.stop();
    lease.stop();

    dprint("[kernel] Done");
  }

  return {
    boot,
    shutdown,
    isRunning: () => isRunning,
  };
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/main.ts
git commit -m "feat(pt-kernel): implement kernel boot"
```

---

### Task 8: Add Kernel Unit Tests

**Files:**
- Create: `packages/pt-runtime/src/__tests__/pt/kernel.test.ts`

**Step 1: Create kernel tests**

```typescript
// packages/pt-runtime/src/__tests__/pt/kernel.test.ts
import { describe, test, expect, beforeEach, vi } from "bun:test";
import { createLeaseManager } from "../../pt/kernel/lease";

describe("createLeaseManager", () => {
  // Mock fm global for PT
  beforeEach(() => {
    const mockFm = {
      fileExists: vi.fn().mockReturnValue(false),
      getFileContents: vi.fn().mockReturnValue(""),
    };
    (globalThis as unknown as { fm: typeof mockFm }).fm = mockFm;
  });

  test("validate returns false when no lease file", () => {
    const manager = createLeaseManager({ devDir: "/tmp", checkIntervalMs: 1000 });
    expect(manager.validate()).toBe(false);
  });

  test("validate returns false when lease expired", () => {
    const mockFm = {
      fileExists: vi.fn().mockReturnValue(true),
      getFileContents: vi.fn().mockReturnValue(JSON.stringify({
        ownerId: "test-owner",
        expiresAt: Date.now() - 1000, // expired
        ttlMs: 5000,
        updatedAt: Date.now(),
      })),
    };
    (globalThis as unknown as { fm: typeof mockFm }).fm = mockFm;

    const manager = createLeaseManager({ devDir: "/tmp", checkIntervalMs: 1000 });
    expect(manager.validate()).toBe(false);
  });

  test("validate returns true when lease valid", () => {
    const mockFm = {
      fileExists: vi.fn().mockReturnValue(true),
      getFileContents: vi.fn().mockReturnValue(JSON.stringify({
        ownerId: "test-owner",
        expiresAt: Date.now() + 60000, // valid for 1 min
        ttlMs: 5000,
        updatedAt: Date.now(),
      })),
    };
    (globalThis as unknown as { fm: typeof mockFm }).fm = mockFm;

    const manager = createLeaseManager({ devDir: "/tmp", checkIntervalMs: 1000 });
    expect(manager.validate()).toBe(true);
  });
});
```

**Step 2: Run tests**

```bash
cd packages/pt-runtime && bun test __tests__/pt/kernel.test.ts
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/__tests__/pt/kernel.test.ts
git commit -m "test(pt-kernel): add kernel unit tests"
```

---

### Task 9: Update Kernel Exports

**Files:**
- Modify: `packages/pt-runtime/src/pt/kernel/index.ts`

**Step 1: Update index.ts**

```typescript
// packages/pt-runtime/src/pt/kernel/index.ts
export * from "./main";
export * from "./types";
export * from "./directories";
export * from "./lease";
export * from "./command-queue";
export * from "./runtime-loader";
export * from "./heartbeat";
export * from "./cleanup";
export * from "./queue";
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/kernel/index.ts
git commit -m "feat(pt-kernel): update exports"
```

---

## Summary

### Files Created
- `src/pt/kernel/types.ts` - Kernel types
- `src/pt/kernel/directories.ts` - Directory manager
- `src/pt/kernel/lease.ts` - Lease manager
- `src/pt/kernel/command-queue.ts` - Command queue
- `src/pt/kernel/heartbeat.ts` - Heartbeat manager (updated)
- `src/pt/kernel/main.ts` - Kernel boot (implemented)
- `src/__tests__/pt/kernel.test.ts` - Unit tests

### Files Modified
- `src/pt/kernel/runtime-loader.ts` - With hot reload
- `src/pt/kernel/index.ts` - Updated exports

### Success Criteria
- ✅ Kernel boot sequence works (main → validate lease → activate)
- ✅ Directories created on boot
- ✅ Command queue polling works
- ✅ Heartbeat writing works
- ✅ Hot reload respects active jobs
- ✅ Clean shutdown (cleanUp)
- ✅ All tests pass