# Contexto Completo: Crash Recovery Module

## Resumen Ejecutivo

Módulo de recuperación ante fallos del sistema FileBridge V2. Detecta comandos huérfanos en el directorio `in-flight/` después de un crash y los re-encola o marca como fallidos según el número de intentos. **PROBLEMA CRÍTICO IDENTIFICADO**: El método `recover()` nunca se invoca durante el `start()` del bridge, causando que todos los tests fallen.

## Árbol de Estructura

```
packages/file-bridge/
├── src/
│   ├── file-bridge-v2.ts (bridge principal - integra CrashRecovery)
│   ├── v2/
│   │   └── crash-recovery.ts (implementación de recuperación)
│   └── shared/
│       ├── fs-atomic.ts (utilidades atómicas de FS)
│       ├── path-layout.ts (layout de directorios)
│       ├── sequence-store.ts (generador de secuencias)
│       └── protocol.ts (tipos de comandos/resultados)
├── tests/
│   ├── crash-recovery.test.ts (tests específicos de recovery)
│   └── file-bridge-v2.test.ts (tests del bridge completo)
└── src/
    └── event-log-writer.ts (writer de eventos NDJSON)
```

---

## Archivos Principales

### packages/file-bridge/src/v2/crash-recovery.ts

**Propósito:** Recuperar comandos huérfanos después de un crash del sistema
**Dependencias Directas:** 
- `node:path`, `node:fs`
- `../shared/protocol.js` (BridgeResultEnvelope)
- `../shared/path-layout.js` (BridgePathLayout)
- `../shared/sequence-store.js` (SequenceStore)
- `../event-log-writer.js` (EventLogWriter)
- `../shared/fs-atomic.js` (atomicWriteFile)

**Dependencias Inversas:**
- `src/file-bridge-v2.ts` (instancia CrashRecovery pero NO llama recover())

**Contenido:**

```typescript
/**
 * Crash Recovery - Recovers inconsistent state from crashes
 * Handles re-queuing and dead-letter management
 */

import { join } from "node:path";
import { readdirSync, readFileSync, unlinkSync, existsSync } from "node:fs";
import type { BridgeResultEnvelope } from "../shared/protocol.js";
import { BridgePathLayout } from "../shared/path-layout.js";
import { SequenceStore } from "../shared/sequence-store.js";
import { EventLogWriter } from "../event-log-writer.js";
import { atomicWriteFile } from "../shared/fs-atomic.js";

export class CrashRecovery {
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly seq: SequenceStore,
    private readonly eventWriter: EventLogWriter,
  ) {}

  recover(): void {
    try {
      const inFlightFiles = readdirSync(this.paths.inFlightDir())
        .filter((f) => f.endsWith(".json"));

      for (const file of inFlightFiles) {
        const filePath = join(this.paths.inFlightDir(), file);
        const cmdId = this.extractCmdId(file);
        const resultPath = this.paths.resultFilePath(cmdId);

        if (existsSync(resultPath)) {
          try {
            unlinkSync(filePath);
          } catch {
            // ignore
          }

          this.eventWriter.append({
            seq: this.seq.next(),
            ts: Date.now(),
            type: "command-recovered",
            id: cmdId,
            note: "result existed but in-flight was not cleaned",
          });
        } else {
          try {
            const content = readFileSync(filePath, "utf8");
            const cmd = JSON.parse(content);

            if ((cmd.attempt ?? 1) < 3) {
              cmd.attempt = (cmd.attempt ?? 1) + 1;
              const newFile = this.paths.commandFilePath(cmd.seq, cmd.type);
              atomicWriteFile(newFile, JSON.stringify(cmd));
              unlinkSync(filePath);

              this.eventWriter.append({
                seq: this.seq.next(),
                ts: Date.now(),
                type: "command-requeued",
                id: cmdId,
                attempt: cmd.attempt,
              });
            } else {
              const failResult: BridgeResultEnvelope = {
                protocolVersion: 2,
                id: cmdId,
                seq: cmd.seq,
                completedAt: Date.now(),
                status: "failed",
                ok: false,
                error: {
                  code: "MAX_RETRIES",
                  message: `Command failed after ${cmd.attempt} attempts`,
                  phase: "execute",
                },
              };
              atomicWriteFile(resultPath, JSON.stringify(failResult));
              unlinkSync(filePath);

              this.eventWriter.append({
                seq: this.seq.next(),
                ts: Date.now(),
                type: "command-failed",
                id: cmdId,
                note: "max retries exceeded",
              });
            }
          } catch {
            // corrupted file — move to dead-letter
          }
        }
      }
    } catch (err) {
      this.eventWriter.append({
        seq: this.seq.next(),
        ts: Date.now(),
        type: "recovery-error",
        error: String(err),
      });
    }
  }

  private extractCmdId(filename: string): string {
    const seq = filename.replace(".json", "").split("-")[0] ?? "0";
    return `cmd_${seq.padStart(12, "0")}`;
  }
}
```

---

### packages/file-bridge/tests/crash-recovery.test.ts

**Propósito:** Tests unitarios para verificar el mecanismo de crash recovery
**Dependencias Directas:** 
- `bun:test`
- `node:fs`, `node:path`, `node:os`
- `../src/file-bridge-v2.js`
- `../src/shared/protocol.js`

**Contenido:**

```typescript
/**
 * Tests for crash recovery mechanism.
 * Verifies requeuing and cleanup of orphaned commands.
 */
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FileBridgeV2 } from "../src/file-bridge-v2.js";
import type { BridgeCommandEnvelope, BridgeResultEnvelope } from "../src/shared/protocol.js";

describe("Crash Recovery", () => {
  let tempDir: string;
  let bridge: FileBridgeV2;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "crash-test-"));
    // Create directory structure
    mkdirSync(join(tempDir, "in-flight"), { recursive: true });
    mkdirSync(join(tempDir, "commands"), { recursive: true });
    mkdirSync(join(tempDir, "results"), { recursive: true });
    mkdirSync(join(tempDir, "dead-letter"), { recursive: true });
    mkdirSync(join(tempDir, "logs"), { recursive: true });
  });

  afterEach(async () => {
    await bridge?.stop();
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("orphaned command with result is cleaned up on start", async () => {
    const inFlightDir = join(tempDir, "in-flight");
    const resultsDir = join(tempDir, "results");

    // Command in in-flight
    writeFileSync(join(inFlightDir, "000000000001-test.json"), JSON.stringify({
      protocolVersion: 2,
      id: "cmd_000000000001",
      seq: 1,
      type: "test",
      payload: { data: "test" },
      createdAt: Date.now(),
      attempt: 1
    } as BridgeCommandEnvelope));

    // Result already exists
    writeFileSync(join(resultsDir, "cmd_000000000001.json"), JSON.stringify({
      protocolVersion: 2,
      id: "cmd_000000000001",
      seq: 1,
      completedAt: Date.now(),
      status: "completed",
      ok: true,
      value: { result: "done" }
    } as BridgeResultEnvelope));

    bridge = new FileBridgeV2({ root: tempDir });
    await bridge.start();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // In-flight should be cleaned
    const inFlight = readdirSync(inFlightDir).filter(f => f.endsWith(".json"));
    expect(inFlight.length).toBe(0);

    // Result should still exist
    expect(existsSync(join(resultsDir, "cmd_000000000001.json"))).toBe(true);
  });

  test("command exceeding max attempts is marked as failed", async () => {
    const inFlightDir = join(tempDir, "in-flight");
    const resultsDir = join(tempDir, "results");

    // Command with max attempts already
    writeFileSync(join(inFlightDir, "000000000001-test.json"), JSON.stringify({
      protocolVersion: 2,
      id: "cmd_000000000001",
      seq: 1,
      type: "test",
      payload: { data: "test" },
      createdAt: Date.now(),
      attempt: 3, // Max attempts
      expiresAt: Date.now() + 120000
    } as BridgeCommandEnvelope));

    bridge = new FileBridgeV2({ root: tempDir });
    await bridge.start();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should create a failed result
    expect(existsSync(join(resultsDir, "cmd_000000000001.json"))).toBe(true);

    const result: BridgeResultEnvelope = JSON.parse(
      readFileSync(join(resultsDir, "cmd_000000000001.json"), "utf-8")
    );

    expect(result.ok).toBe(false);
  });

  test("requeued command has incremented attempt counter", async () => {
    const inFlightDir = join(tempDir, "in-flight");
    const commandsDir = join(tempDir, "commands");

    writeFileSync(join(inFlightDir, "000000000001-test.json"), JSON.stringify({
      protocolVersion: 2,
      id: "cmd_000000000001",
      seq: 1,
      type: "test",
      payload: { data: "test" },
      createdAt: Date.now(),
      attempt: 1,
      expiresAt: Date.now() + 120000
    } as BridgeCommandEnvelope));

    bridge = new FileBridgeV2({ root: tempDir });
    await bridge.start();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check requeued command
    const commands = readdirSync(commandsDir).filter(f => f.endsWith(".json"));
    expect(commands.length).toBe(1);

    const requeued: BridgeCommandEnvelope = JSON.parse(
      readFileSync(join(commandsDir, commands[0]!), "utf-8")
    );

    expect(requeued.attempt).toBe(2);
  });

  test("multiple orphaned commands are recovered", async () => {
    const inFlightDir = join(tempDir, "in-flight");

    // Create 5 orphaned commands
    for (let i = 1; i <= 5; i++) {
      writeFileSync(
        join(inFlightDir, `00000000000${i}-test.json`),
        JSON.stringify({
          protocolVersion: 2,
          id: `cmd_00000000000${i}`,
          seq: i,
          type: "test",
          payload: { index: i },
          createdAt: Date.now(),
          attempt: 1,
          expiresAt: Date.now() + 120000
        } as BridgeCommandEnvelope)
      );
    }

    bridge = new FileBridgeV2({ root: tempDir });
    await bridge.start();
    await new Promise((resolve) => setTimeout(resolve, 200));

    // All should be requeued
    const commandsDir = join(tempDir, "commands");
    const commands = readdirSync(commandsDir).filter(f => f.endsWith(".json"));
    expect(commands.length).toBe(5);

    // In-flight should be empty
    const inFlight = readdirSync(inFlightDir).filter(f => f.endsWith(".json"));
    expect(inFlight.length).toBe(0);
  });

  test("recovery runs on bridge start", async () => {
    const inFlightDir = join(tempDir, "in-flight");
    const commandsDir = join(tempDir, "commands");

    writeFileSync(join(inFlightDir, "000000000001-test.json"), JSON.stringify({
      protocolVersion: 2,
      id: "cmd_000000000001",
      seq: 1,
      type: "test",
      payload: { data: "test" },
      createdAt: Date.now(),
      attempt: 1,
      expiresAt: Date.now() + 120000
    } as BridgeCommandEnvelope));

    bridge = new FileBridgeV2({ root: tempDir });

    // Before start, file is in in-flight
    expect(readdirSync(inFlightDir).filter(f => f.endsWith(".json")).length).toBe(1);

    await bridge.start();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // After start, file should be in commands (requeued)
    expect(readdirSync(commandsDir).filter(f => f.endsWith(".json")).length).toBeGreaterThan(0);
  });
});
```

---

### packages/file-bridge/src/shared/fs-atomic.ts

**Propósito:** Utilidades de sistema de archivos con garantías atómicas
**Dependencias Directas:** `node:fs`, `node:path`
**Dependencias Inversas:** 
- `src/v2/crash-recovery.ts`
- `src/shared/sequence-store.ts`
- `src/event-log-writer.ts`
- `src/file-bridge-v2.ts`

**Contenido:**

```typescript
/**
 * Filesystem utilities with atomic write guarantees.
 * Never write directly to the final path — always use atomicWriteFile.
 */
import {
  mkdirSync,
  openSync,
  writeSync,
  fsyncSync,
  closeSync,
  renameSync,
  appendFileSync,
  existsSync,
} from "node:fs";
import { dirname } from "node:path";

/**
 * Ensure a directory exists, creating it recursively if needed.
 */
export function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true });
}

/**
 * Atomically write content to a file using tmp+fsync+rename pattern.
 * This guarantees readers never see a partial write.
 */
export function atomicWriteFile(path: string, content: string): void {
  ensureDir(dirname(path));
  const tmp = `${path}.tmp`;
  const fd = openSync(tmp, "w");

  try {
    writeSync(fd, content, 0, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }

  renameSync(tmp, path);
}

/**
 * Append a single line to a file (no trailing newline assumed).
 * The line parameter should NOT include the trailing newline — this function adds it.
 * Does NOT use atomic write since appends are inherently safer than overwrites.
 * Retries on ENOENT to handle file rotation window.
 */
export function appendLine(path: string, line: string): void {
  ensureDir(dirname(path));
  const content = line.endsWith("\n") ? line : `${line}\n`;

  // Simple retry logic for rotation window
  // Don't use atomicWriteFile for retry - just let appendFileSync create the file
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      appendFileSync(path, content, "utf8");
      return;
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT" && attempt < maxRetries - 1) {
        // File was rotated — appendFileSync will create it on next retry
        continue;
      }
      throw err;
    }
  }
}

/**
 * Ensure a file exists, creating it with initial content if it doesn't.
 * Uses atomic write so the file is never observed in a partial state.
 */
export function ensureFile(path: string, initial = ""): void {
  if (!existsSync(path)) {
    atomicWriteFile(path, initial);
  }
}
```

---

### packages/file-bridge/tests/file-bridge-v2.test.ts

**Propósito:** Tests de integración del bridge completo incluyendo crash recovery
**Dependencias Directas:** 
- `bun:test`
- `node:path`, `node:fs`, `node:os`
- `../src/file-bridge-v2.js`

**Contenido:**

```typescript
/**
 * FileBridge V2 - Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { FileBridgeV2 } from "../src/file-bridge-v2.js";
import { join } from "node:path";
import { mkdtempSync, rmSync, existsSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";

describe("FileBridgeV2", () => {
  let testDir: string;
  let bridge: FileBridgeV2;

  beforeEach(() => {
    testDir = join(tmpdir(), `file-bridge-v2-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    bridge = new FileBridgeV2({ root: testDir });
  });

  afterEach(async () => {
    await bridge.stop();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("start/stop lifecycle", () => {
    it("should create directory structure on start", () => {
      bridge.start();

      expect(existsSync(join(testDir, "commands"))).toBe(true);
      expect(existsSync(join(testDir, "in-flight"))).toBe(true);
      expect(existsSync(join(testDir, "results"))).toBe(true);
      expect(existsSync(join(testDir, "logs"))).toBe(true);
      expect(existsSync(join(testDir, "consumer-state"))).toBe(true);
      expect(existsSync(join(testDir, "dead-letter"))).toBe(true);
    });

    it("should not throw on double start", () => {
      bridge.start();
      expect(() => bridge.start()).not.toThrow();
    });

    it("should stop gracefully", async () => {
      bridge.start();
      await expect(bridge.stop()).resolves.toBeUndefined();
    });

    it("should be idempotent on stop", async () => {
      bridge.start();
      await bridge.stop();
      await expect(bridge.stop()).resolves.toBeUndefined();
    });
  });

  describe("sendCommand", () => {
    it("should create command file in commands directory", () => {
      bridge.start();
      const envelope = bridge.sendCommand("addDevice", { name: "Router1", model: "2911" });

      expect(envelope.id).toMatch(/^cmd_\d+$/);
      expect(envelope.seq).toBeGreaterThan(0);
      expect(envelope.type).toBe("addDevice");
      expect(envelope.protocolVersion).toBe(2);
      expect(envelope.checksum).toBeDefined();

      const files = readdirSync(join(testDir, "commands"));
      expect(files.length).toBe(1);
    });

    it("should assign monotonically increasing sequence numbers", () => {
      bridge.start();
      const env1 = bridge.sendCommand("addDevice", { name: "R1" });
      const env2 = bridge.sendCommand("addDevice", { name: "R2" });
      const env3 = bridge.sendCommand("addDevice", { name: "R3" });

      expect(env2.seq).toBe(env1.seq + 1);
      expect(env3.seq).toBe(env2.seq + 1);
    });
  });

  describe("sendCommandAndWait", () => {
    it("should timeout if no result appears", async () => {
      bridge.start();
      await expect(
        bridge.sendCommandAndWait("addDevice", { name: "R1" }, 100)
      ).rejects.toThrow(/timeout/i);
    });
  });

  describe("diagnostics", () => {
    it("should return healthy status when started", () => {
      bridge.start();
      const diag = bridge.diagnostics();

      expect(diag.status).toBe("healthy");
      expect(diag.lease).toBeDefined();
      expect(diag.queues).toBeDefined();
      expect(diag.journal).toBeDefined();
      expect(diag.issues).toEqual([]);
    });

    it("should report pending commands count", () => {
      bridge.start();
      bridge.sendCommand("addDevice", { name: "R1" });
      bridge.sendCommand("addDevice", { name: "R2" });

      const diag = bridge.diagnostics();
      expect(diag.queues.pendingCommands).toBe(2);
    });
  });

  describe("gc", () => {
    it("should return empty report on fresh directory", () => {
      bridge.start();
      const report = bridge.gc();

      expect(report.deletedResults).toBe(0);
      expect(report.deletedLogs).toBe(0);
      expect(report.errors).toEqual([]);
    });
  });

  describe("loadRuntime", () => {
    it("should write runtime.js file", async () => {
      bridge.start();
      await bridge.loadRuntime("function test() { return 'ok'; }");

      const runtimePath = join(testDir, "runtime.js");
      expect(existsSync(runtimePath)).toBe(true);
      expect(readFileSync(runtimePath, "utf-8")).toBe("function test() { return 'ok'; }");
    });
  });

  describe("crash recovery", () => {
    it("should requeue in-flight commands without results on start", () => {
      // Simulate: write a command to in-flight without a result
      bridge.start();
      const envelope = bridge.sendCommand("addDevice", { name: "R1" });

      // Manually move to in-flight (simulating crash)
      const cmdPath = join(testDir, "commands", `${String(envelope.seq).padStart(12, "0")}-${envelope.type}.json`);
      const inFlightPath = join(testDir, "in-flight", `${String(envelope.seq).padStart(12, "0")}-${envelope.type}.json`);

      // Stop bridge and manually simulate crash scenario
      bridge.stop();

      // Write directly to in-flight (as if PT was processing but crashed)
      writeFileSync(inFlightPath, JSON.stringify({ ...envelope, attempt: 1 }), "utf-8");

      // Restart - should detect in-flight without result and requeue
      const bridge2 = new FileBridgeV2({ root: testDir });
      bridge2.start();

      // Command should be requeued (attempt incremented)
      bridge2.stop();
    });
  });
});

describe("FileBridgeV2 - SequenceStore persistence", () => {
  let testDir: string;

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should persist sequence across restarts", () => {
    const bridge1 = new FileBridgeV2({ root: testDir = join(tmpdir(), `seq-test-${Date.now()}`) });
    bridge1.start();
    const env1 = bridge1.sendCommand("addDevice", { name: "R1" });
    const env2 = bridge1.sendCommand("addDevice", { name: "R2" });
    bridge1.stop();

    // New instance should continue from previous sequence
    const bridge2 = new FileBridgeV2({ root: testDir });
    bridge2.start();
    const env3 = bridge2.sendCommand("addDevice", { name: "R3" });
    bridge2.stop();

    expect(env3.seq).toBe(env2.seq + 1);
    expect(env1.seq + 1).toBe(env2.seq); // Sanity check
  });
});
```

---

## Archivos Relacionados Importantes

### packages/file-bridge/src/file-bridge-v2.ts

**Propósito:** Bridge principal que integra todos los componentes incluyendo CrashRecovery

**Integración con CrashRecovery:**

```typescript
// Líneas 40-45: CrashRecovery se instancia en el constructor
this.crashRecovery = new CrashRecovery(this.paths, this.seq, this.eventWriter);

// Líneas 117-145: Método start() - AQUÍ ESTÁ EL PROBLEMA
start(): void {
  if (this.running) return;
  this.running = true;

  ensureDir(this.paths.commandsDir());
  ensureDir(this.paths.inFlightDir());
  ensureDir(this.paths.resultsDir());
  ensureDir(this.paths.logsDir());
  ensureDir(this.paths.consumerStateDir());
  ensureDir(this.paths.deadLetterDir());
  ensureFile(this.paths.commandFile(), "");
  ensureFile(this.paths.currentEventsFile(), "");

  if (!this.leaseManager.acquireLease()) {
    this.emit("lease-denied");
  }

  this.leaseTimer = setInterval(() => {
    this.leaseManager.renewLease();
  }, this.options.leaseIntervalMs ?? 1_000);

  this.consumer.start();
  // ❌ FALTA: this.crashRecovery.recover();
}
```

---

## Dependencias Externas Clave

- **bun:test**: Framework de testing
- **node:fs**: Sistema de archivos nativo
- **node:path**: Manipulación de rutas
- **node:os**: Utilidades del sistema operativo (tmpdir)

---

## Análisis de Problemas Identificados

### 🔴 PROBLEMA CRÍTICO #1: `recover()` nunca se invoca

**Ubicación:** `src/file-bridge-v2.ts`, método `start()` (líneas 117-145)

**Síntoma:** 
- Todos los tests de crash-recovery fallan
- Los comandos en `in-flight/` nunca se procesan después de un restart
- El sistema no cumple su propósito de recuperación ante fallos

**Causa Raíz:**
La clase `CrashRecovery` se instancia correctamente en el constructor, pero su método `recover()` **nunca se llama** durante el ciclo de vida del bridge.

**Fix Requerido:**

```typescript
// En src/file-bridge-v2.ts, método start(), después de this.consumer.start():

start(): void {
  if (this.running) return;
  this.running = true;

  ensureDir(this.paths.commandsDir());
  ensureDir(this.paths.inFlightDir());
  ensureDir(this.paths.resultsDir());
  ensureDir(this.paths.logsDir());
  ensureDir(this.paths.consumerStateDir());
  ensureDir(this.paths.deadLetterDir());
  ensureFile(this.paths.commandFile(), "");
  ensureFile(this.paths.currentEventsFile(), "");

  if (!this.leaseManager.acquireLease()) {
    this.emit("lease-denied");
  }

  this.leaseTimer = setInterval(() => {
    this.leaseManager.renewLease();
  }, this.options.leaseIntervalMs ?? 1_000);

  this.consumer.start();
  
  // ✅ AGREGAR: Crash recovery debe ejecutarse en cada start
  this.crashRecovery.recover();
}
```

### 🟡 PROBLEMA #2: Funciones de crash-recovery no utilizadas

**Función:** `extractCmdId()` (línea 104-107 de crash-recovery.ts)

**Estado:** Se usa internamente en el método `recover()`, pero como `recover()` nunca se llama, esta función tampoco.

**Nota:** El diseño es correcto, solo falta la invocación.

### 🟡 PROBLEMA #3: Manejo de archivos corruptos incompleto

**Ubicación:** `crash-recovery.ts`, línea 85-86

```typescript
} catch {
  // corrupted file — move to dead-letter
}
```

**Problema:** El comentario dice "move to dead-letter" pero el código no lo hace. Solo captura el error y continúa.

**Fix Sugerido:**

```typescript
} catch (parseErr) {
  // corrupted file — move to dead-letter
  try {
    const deadLetterPath = this.paths.deadLetterFile(file);
    const { readFileSync } = require("node:fs");
    const content = readFileSync(filePath, "utf8");
    atomicWriteFile(deadLetterPath, content);
    unlinkSync(filePath);
    
    this.eventWriter.append({
      seq: this.seq.next(),
      ts: Date.now(),
      type: "command-corrupted",
      id: cmdId,
      note: "moved to dead-letter",
    });
  } catch {
    // ignore dead-letter write failures
  }
}
```

---

## Por Qué Fallan los Tests

### Test 1: "orphaned command with result is cleaned up on start"
- **Expectativa:** El archivo en in-flight se elimina cuando el resultado ya existe
- **Realidad:** `recover()` nunca se ejecuta, el archivo permanece en in-flight
- **Resultado:** `expect(inFlight.length).toBe(0)` ❌ falla

### Test 2: "command exceeding max attempts is marked as failed"
- **Expectativa:** Se crea un resultado fallido para comandos con attempt=3
- **Realidad:** `recover()` nunca se ejecuta, no se crea ningún resultado
- **Resultado:** `expect(existsSync(...)).toBe(true)` ❌ falla

### Test 3: "requeued command has incremented attempt counter"
- **Expectativa:** El comando se mueve a commands/ con attempt=2
- **Realidad:** `recover()` nunca se ejecuta, el comando permanece en in-flight
- **Resultado:** `expect(commands.length).toBe(1)` ❌ falla

### Test 4: "multiple orphaned commands are recovered"
- **Expectativa:** 5 comandos se re-encolan
- **Realidad:** `recover()` nunca se ejecuta, todos permanecen en in-flight
- **Resultado:** `expect(commands.length).toBe(5)` ❌ falla

### Test 5: "recovery runs on bridge start"
- **Expectativa:** El comando se mueve de in-flight a commands
- **Realidad:** `recover()` nunca se ejecuta
- **Resultado:** `expect(...).toBeGreaterThan(0)` ❌ falla

---

## Notas de Contexto

### Patrón de Diseño
El módulo sigue un patrón de **recuperación pasiva**: al iniciar el bridge, se escanea el directorio `in-flight/` y se determina el estado de cada comando:
1. Si el resultado existe → limpiar in-flight (comando completado pero no limpiado)
2. Si attempt < 3 → re-encolar en commands/ con attempt incrementado
3. Si attempt >= 3 → marcar como fallido con error MAX_RETRIES
4. Si está corrupto → mover a dead-letter (actualmente no implementado)

### Flujo de Integración
```
FileBridgeV2.start()
  ├─ ensureDir() para todos los directorios
  ├─ acquireLease()
  ├─ start lease timer
  ├─ consumer.start()
  └─ ❌ crashRecovery.recover() [FALTA]
```

### Convenciones de Nomenclatura
- Comandos: `<seq>-<type>.json` (ej: `000000000001-addDevice.json`)
- Resultados: `<cmd_id>.json` (ej: `cmd_000000000001.json`)
- Command ID: `cmd_<seq padded to 12 digits>`

---

## Metadata

- **Fecha de generación:** 2026-04-01
- **Total de archivos analizados:** 7
  - 4 archivos solicitados (completos)
  - 3 archivos adicionales para contexto (file-bridge-v2.ts, sequence-store.ts, path-layout.ts, event-log-writer.ts)
- **Líneas de código totales:** ~850 líneas
- **Tests identificados:** 5 tests de crash-recovery + 11 tests de file-bridge-v2
- **Problemas críticos:** 1 (recover() no se invoca)
- **Problemas menores:** 2 (dead-letter incompleto, extractCmdId sin uso)

---

## Fix Completo Requerido

**Archivo:** `packages/file-bridge/src/file-bridge-v2.ts`

**Cambio:** Agregar una línea en el método `start()` después de `this.consumer.start()`:

```diff
  start(): void {
    if (this.running) return;
    this.running = true;

    ensureDir(this.paths.commandsDir());
    ensureDir(this.paths.inFlightDir());
    ensureDir(this.paths.resultsDir());
    ensureDir(this.paths.logsDir());
    ensureDir(this.paths.consumerStateDir());
    ensureDir(this.paths.deadLetterDir());
    ensureFile(this.paths.commandFile(), "");
    ensureFile(this.paths.currentEventsFile(), "");

    if (!this.leaseManager.acquireLease()) {
      this.emit("lease-denied");
    }

    this.leaseTimer = setInterval(() => {
      this.leaseManager.renewLease();
    }, this.options.leaseIntervalMs ?? 1_000);

    this.consumer.start();
+   this.crashRecovery.recover();
  }
```

**Impacto:** 
- ✅ Los 5 tests de crash-recovery deberían pasar
- ✅ El sistema recuperará comandos huérfanos después de crashes
- ✅ Se mantendrá la consistencia entre in-flight/, commands/ y results/
