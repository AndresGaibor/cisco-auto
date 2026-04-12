# TerminalEngine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implementar `TerminalEngine` con la API real de Packet Tracer usando eventos `outputWritten` y `commandEnded`.

**Architecture:** 
- `terminal-engine.ts` - usa eventos PT para command execution
- `terminal-session.ts` - mantiene estado reactivo
- `terminal-events.ts` - tipos para eventos PT

**Tech Stack:** TypeScript, Packet Tracer Script Module API

---

## Context

### PT TerminalLine API (del docs/pt-api/COMPLETE_API_REFERENCE.md)

```javascript
// CORRECTO - usar eventos
function executeCommandAsync(term, cmd) {
  return new Promise(function(resolve) {
    var buffer = [];
    var ended = false;
    
    function onOutput(src, args) {
      var data = args && (args.newOutput !== undefined ? args.newOutput : args.data);
      if (data) {
        buffer.push(String(data));
      }
    }
    
    function onEnded(src, args) {
      if (ended) return;
      ended = true;
      try { term.unregisterEvent("outputWritten", null, onOutput); } catch(e) {}
      try { term.unregisterEvent("commandEnded", null, onEnded); } catch(e) {}
      resolve({
        ok: args.status === 0,
        status: args.status,
        output: buffer.join("")
      });
    }
    
    try { term.registerEvent("outputWritten", null, onOutput); } catch(e) {}
    try { term.registerEvent("commandEnded", null, onEnded); } catch(e) {}
    term.enterCommand(cmd);
  });
}
```

### Eventos PT TerminalLine
- `outputWritten` - output incremental (`args.newOutput` o `args.data`)
- `commandEnded` - comando completado (`args.status` = 0 es OK)
- `commandStarted` - comando iniciado
- `modeChanged` - cambio de modo IOS
- `promptChanged` - cambio de prompt
- `moreDisplayed` - paginación activa

### Estado actual
- Stub en `src/pt/terminal/terminal-engine.ts`
- Necesita implementación real con PT API
- Necesita manejar timeouts, pager, confirm prompts

---

## Tasks

### Task 1: Enhance Terminal Events Types

**Files:**
- Modify: `packages/pt-runtime/src/pt/terminal/terminal-events.ts`

**Step 1: Update terminal-events.ts**

```typescript
// packages/pt-runtime/src/pt/terminal/terminal-events.ts
// Enhanced event types from PT TerminalLine API

export interface TerminalEvent {
  type: "commandStarted" | "outputWritten" | "commandEnded" | "modeChanged" | "promptChanged" | "moreDisplayed";
  device: string;
  timestamp: number;
}

export interface CommandStartedEvent extends TerminalEvent {
  type: "commandStarted";
  command: string;
}

export interface OutputWrittenEvent extends TerminalEvent {
  type: "outputWritten";
  output: string;
  newOutput?: string;
  data?: string;
}

export interface CommandEndedEvent extends TerminalEvent {
  type: "commandEnded";
  status: number;
  command: string;
}

export interface ModeChangedEvent extends TerminalEvent {
  type: "modeChanged";
  from: string;
  to: string;
}

export interface PromptChangedEvent extends TerminalEvent {
  type: "promptChanged";
  prompt: string;
}

export interface MoreDisplayedEvent extends TerminalEvent {
  type: "moreDisplayed";
  active: boolean;
}

export type AnyTerminalEvent =
  | CommandStartedEvent
  | OutputWrittenEvent
  | CommandEndedEvent
  | ModeChangedEvent
  | PromptChangedEvent
  | MoreDisplayedEvent;

// PT-specific status codes
export enum CommandStatus {
  OK = 0,
  AMBIGUOUS = 1,
  INVALID = 2,
  INCOMPLETE = 3,
  NOT_IMPLEMENTED = 4,
}

export function isStatusOk(status: number): boolean {
  return status === CommandStatus.OK;
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/terminal/terminal-events.ts
git commit -m "feat(pt-terminal): enhance event types with PT API details"
```

---

### Task 2: Add Prompt/Mode Parser

**Files:**
- Create: `packages/pt-runtime/src/pt/terminal/prompt-parser.ts`

**Step 1: Create prompt-parser.ts**

```typescript
// packages/pt-runtime/src/pt/terminal/prompt-parser.ts
// Parse IOS prompts to extract mode and command context

export type IosMode = 
  | "user-exec"        // Router>
  | "privileged-exec"  // Router#
  | "config"           // Router(config)#
  | "config-if"        // Router(config-if)#
  | "config-subif"     // Router(config-subif)#
  | "config-line"      // Router(config-line)#
  | "config-router"    // Router(config-router)#
  | "unknown";

export interface ParsedPrompt {
  mode: IosMode;
  hostname: string;
  fullPrompt: string;
  isPaged: boolean;
}

/**
 * Parse an IOS prompt string to extract mode information
 */
export function parsePrompt(prompt: string): ParsedPrompt {
  const trimmed = (prompt || "").trim();
  
  // Detect paged output (--More--)
  const isPaged = trimmed.includes("--More--");
  
  // Extract hostname (everything before the last # or >)
  let hostname = trimmed;
  let mode: IosMode = "unknown";
  
  if (trimmed.includes("(config-router)#")) {
    mode = "config-router";
    hostname = trimmed.replace("(config-router)#", "").replace("#", "");
  } else if (trimmed.includes("(config-line)#")) {
    mode = "config-line";
    hostname = trimmed.replace("(config-line)#", "").replace("#", "");
  } else if (trimmed.includes("(config-if)#")) {
    mode = "config-if";
    hostname = trimmed.replace("(config-if)#", "").replace("#", "");
  } else if (trimmed.includes("(config-subif)#")) {
    mode = "config-subif";
    hostname = trimmed.replace("(config-subif)#", "").replace("#", "");
  } else if (trimmed.includes("(config)#")) {
    mode = "config";
    hostname = trimmed.replace("(config)#", "").replace("#", "");
  } else if (trimmed.includes("#")) {
    mode = "privileged-exec";
    hostname = trimmed.replace("#", "");
  } else if (trimmed.includes(">")) {
    mode = "user-exec";
    hostname = trimmed.replace(">", "");
  }
  
  return {
    mode,
    hostname,
    fullPrompt: trimmed,
    isPaged,
  };
}

/**
 * Check if current mode allows executing a command
 */
export function canExecuteCommand(mode: IosMode, isShowCommand: boolean): boolean {
  // Show commands work in any mode except config-line
  if (isShowCommand && mode !== "config-line") {
    return true;
  }
  
  // Config commands need privileged-exec or config mode
  return mode === "privileged-exec" || mode.startsWith("config");
}

/**
 * Get the command needed to reach target mode
 */
export function getModeTransitionCommand(from: IosMode, to: IosMode): string | null {
  if (to === "user-exec") {
    return "disable";
  }
  
  if (to === "privileged-exec") {
    if (from === "user-exec") return "enable";
    return "end";  // Exit config modes
  }
  
  if (to === "config") {
    if (from === "user-exec") return "enable";
    if (from === "privileged-exec") return "configure terminal";
    if (from.startsWith("config")) return null;  // Already in config mode
    return "configure terminal";
  }
  
  // For config-if, config-subif, config-line, config-router
  // First go to config mode, then enter specific sub-mode
  return null;  // Handle in handler
}

/**
 * Detect if output indicates an error
 */
export function isErrorOutput(output: string): boolean {
  const errorPatterns = [
    /^% /,
    /^Invalid /i,
    /^Ambiguous /i,
    /^Incomplete /i,
    /^%[A-Z]+.*error/i,
    /^Command not found/i,
  ];
  
  return errorPatterns.some(pattern => pattern.test(output.trim()));
}

/**
 * Detect if output indicates confirmation needed
 */
export function isConfirmPrompt(output: string): boolean {
  return output.includes("[confirm]") || 
         output.includes("Proceed?") ||
         output.includes("confirmar");
}
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/terminal/prompt-parser.ts
git commit -m "feat(pt-terminal): add prompt parser for IOS mode detection"
```

---

### Task 3: Implement TerminalEngine with PT API

**Files:**
- Modify: `packages/pt-runtime/src/pt/terminal/terminal-engine.ts`

**Step 1: Update terminal-engine.ts**

Reemplazar el stub actual con esta implementación real:

```typescript
// packages/pt-runtime/src/pt/terminal/terminal-engine.ts
// TerminalEngine - Single owner of IOS session in PT
// Uses PT TerminalLine events for async command execution

import type { TerminalSessionState } from "./terminal-session";
import type { SessionStateSnapshot } from "../../domain";
import { 
  createTerminalSession, 
  toSnapshot, 
  updateMode, 
  updatePrompt,
  setPaging,
  setBusy,
} from "./terminal-session";
import { parsePrompt, canExecuteCommand, isConfirmPrompt, type IosMode } from "./prompt-parser";
import { CommandStatus, isStatusOk } from "./terminal-events";

export interface TerminalEngineConfig {
  commandTimeoutMs: number;
  stallTimeoutMs: number;
  pagerTimeoutMs: number;
}

export interface ExecuteOptions {
  timeout?: number;
  expectedPrompt?: string;
  stopOnError?: boolean;
  ensureMode?: IosMode;
}

export interface TerminalResult {
  ok: boolean;
  output: string;
  status: number;
  session: SessionStateSnapshot;
  mode: IosMode;
}

/**
 * PT TerminalLine API interface
 * (This is what PT exposes at runtime)
 */
interface PTCommandLine {
  getPrompt(): string;
  enterCommand(cmd: string): void;
  registerEvent(eventName: string, filter: unknown, callback: (src: unknown, args: unknown) => void): void;
  unregisterEvent(eventName: string, filter: unknown, callback: (src: unknown, args: unknown) => void): void;
  enterChar(charCode: number, modifiers: number): void;
}

/**
 * TerminalEngine - manages IOS sessions using PT TerminalLine API
 * 
 * This is the SINGLE OWNER of terminal sessions in PT runtime.
 * All IOS command execution goes through here.
 */
export function createTerminalEngine(config: TerminalEngineConfig) {
  // Sessions by device name
  const sessions = new Map<string, TerminalSessionState>();
  
  // PT TerminalLine references by device
  const terminals = new Map<string, PTCommandLine>();
  
  /**
   * Attach to a device's TerminalLine
   */
  function attach(device: string, term: PTCommandLine): void {
    terminals.set(device, term);
    sessions.set(device, createTerminalSession(device));
    
    // Set up event listeners for mode/prompt tracking
    const session = sessions.get(device)!;
    
    // Track prompt changes
    term.registerEvent("promptChanged", null, (src, args) => {
      const prompt = (args as { prompt?: string })?.prompt || "";
      const parsed = parsePrompt(prompt);
      sessions.set(device, updatePrompt(session, parsed.hostname));
      sessions.set(device, updateMode(session, parsed.mode));
    });
    
    // Track more displayed (pager)
    term.registerEvent("moreDisplayed", null, (src, args) => {
      const active = (args as { active?: boolean })?.active || false;
      sessions.set(device, setPaging(session, active));
    });
  }
  
  /**
   * Detach from a device
   */
  function detach(device: string): void {
    const term = terminals.get(device);
    if (term) {
      // Cleanup would unregister events here if needed
      terminals.delete(device);
    }
    sessions.delete(device);
  }
  
  /**
   * Get current session snapshot
   */
  function getSession(device: string): SessionStateSnapshot | null {
    const state = sessions.get(device);
    return state ? toSnapshot(state) : null;
  }
  
  /**
   * Get current mode for device
   */
  function getMode(device: string): IosMode {
    const state = sessions.get(device);
    return state ? (state.mode as IosMode) : "unknown";
  }
  
  /**
   * Check if device is busy with a command
   */
  function isBusy(device: string): boolean {
    const state = sessions.get(device);
    return state ? state.busyJobId !== null : false;
  }
  
  /**
   * Execute a single IOS command using PT TerminalLine events
   * Returns a promise that resolves when command completes
   */
  function executeCommand(
    device: string,
    command: string,
    options?: ExecuteOptions
  ): Promise<TerminalResult> {
    const term = terminals.get(device);
    if (!term) {
      return Promise.reject(new Error(`No terminal attached to ${device}`));
    }
    
    const timeout = options?.timeout ?? config.commandTimeoutMs;
    const session = sessions.get(device)!;
    
    return new Promise((resolve, reject) => {
      const buffer: string[] = [];
      let ended = false;
      let settled = false;
      
      // Mark session as busy
      sessions.set(device, setBusy(session, `cmd-${Date.now()}`));
      
      // Timeout handler
      const timeoutHandle = setTimeout(() => {
        if (!settled) {
          settled = true;
          sessions.set(device, setBusy(session, null));
          reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
        }
      }, timeout);
      
      // Output handler
      function onOutput(src: unknown, args: unknown) {
        const a = args as { newOutput?: string; data?: string; output?: string };
        const data = a?.newOutput ?? a?.data ?? a?.output ?? "";
        if (data) {
          buffer.push(String(data));
        }
        
        // Check for --More-- (pager)
        if (buffer.join("").includes("--More--")) {
          sessions.set(device, setPaging(session, true));
        }
      }
      
      // Command ended handler
      function onEnded(src: unknown, args: unknown) {
        if (settled) return;
        
        const a = args as { status?: number };
        const status = a?.status ?? 1;
        
        settled = true;
        clearTimeout(timeoutHandle);
        
        // Cleanup event listeners
        try { term.unregisterEvent("outputWritten", null, onOutput); } catch(e) {}
        try { term.unregisterEvent("commandEnded", null, onEnded); } catch(e) {}
        
        // Clear busy flag
        sessions.set(device, setBusy(session, null));
        
        const output = buffer.join("");
        resolve({
          ok: isStatusOk(status),
          output,
          status,
          session: toSnapshot(session),
          mode: session.mode as IosMode,
        });
      }
      
      // Register event listeners
      try { term.registerEvent("outputWritten", null, onOutput); } catch(e) {}
      try { term.registerEvent("commandEnded", null, onEnded); } catch(e) {}
      
      // Execute command
      term.enterCommand(command);
    });
  }
  
  /**
   * Continue pager (send space to continue)
   */
  function continuePager(device: string): void {
    const term = terminals.get(device);
    if (term) {
      term.enterChar(32, 0); // Space key
    }
  }
  
  /**
   * Confirm prompt (send enter)
   */
  function confirmPrompt(device: string): void {
    const term = terminals.get(device);
    if (term) {
      term.enterChar(13, 0); // Enter key
    }
  }
  
  return {
    attach,
    detach,
    getSession,
    getMode,
    isBusy,
    executeCommand,
    continuePager,
    confirmPrompt,
  };
}

export type { PTCommandLine };
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/terminal/terminal-engine.ts
git commit -m "feat(pt-terminal): implement TerminalEngine with PT API"
```

---

### Task 4: Add Unit Tests for TerminalEngine

**Files:**
- Create: `packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts`

**Step 1: Create terminal-engine.test.ts**

```typescript
// packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts
import { describe, test, expect, beforeEach, vi } from "bun:test";
import { createTerminalEngine, type PTCommandLine } from "../../pt/terminal/terminal-engine";
import { parsePrompt } from "../../pt/terminal/prompt-parser";

describe("createTerminalEngine", () => {
  let mockTerm: PTCommandLine;
  let engine: ReturnType<typeof createTerminalEngine>;
  
  beforeEach(() => {
    mockTerm = {
      getPrompt: vi.fn().mockReturn("Router#"),
      enterCommand: vi.fn(),
      registerEvent: vi.fn(),
      unregisterEvent: vi.fn(),
      enterChar: vi.fn(),
    };
    
    engine = createTerminalEngine({
      commandTimeoutMs: 5000,
      stallTimeoutMs: 10000,
      pagerTimeoutMs: 30000,
    });
  });
  
  test("attach creates session", () => {
    engine.attach("R1", mockTerm);
    expect(engine.getSession("R1")).not.toBeNull();
  });
  
  test("detach removes session", () => {
    engine.attach("R1", mockTerm);
    engine.detach("R1");
    expect(engine.getSession("R1")).toBeNull();
  });
  
  test("getMode returns current mode", () => {
    engine.attach("R1", mockTerm);
    expect(engine.getMode("R1")).toBe("privileged-exec");
  });
  
  test("isBusy returns false when idle", () => {
    engine.attach("R1", mockTerm);
    expect(engine.isBusy("R1")).toBe(false);
  });
});

describe("parsePrompt", () => {
  test("parses privileged exec mode", () => {
    const result = parsePrompt("Router#");
    expect(result.mode).toBe("privileged-exec");
    expect(result.hostname).toBe("Router");
  });
  
  test("parses user exec mode", () => {
    const result = parsePrompt("Router>");
    expect(result.mode).toBe("user-exec");
    expect(result.hostname).toBe("Router");
  });
  
  test("parses config mode", () => {
    const result = parsePrompt("Router(config)#");
    expect(result.mode).toBe("config");
    expect(result.hostname).toBe("Router");
  });
  
  test("parses config-if mode", () => {
    const result = parsePrompt("Router(config-if)#");
    expect(result.mode).toBe("config-if");
    expect(result.hostname).toBe("Router");
  });
  
  test("detects paged output", () => {
    const result = parsePrompt("Router# --More-- ");
    expect(result.isPaged).toBe(true);
  });
});
```

**Step 2: Run tests**

```bash
cd packages/pt-runtime && bun test __tests__/pt/terminal-engine.test.ts
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts
git commit -m "test(pt-terminal): add unit tests for TerminalEngine"
```

---

### Task 5: Export New Types

**Files:**
- Modify: `packages/pt-runtime/src/pt/terminal/index.ts`

**Step 1: Update index.ts**

```typescript
// packages/pt-runtime/src/pt/terminal/index.ts
export * from "./terminal-engine";
export * from "./terminal-session";
export * from "./terminal-events";
export * from "./prompt-parser";

export type { PTCommandLine } from "./terminal-engine";
```

**Step 2: Run typecheck**

```bash
cd packages/pt-runtime && bun run typecheck
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/src/pt/terminal/index.ts
git commit -m "feat(pt-terminal): export new types"
```

---

### Task 6: Integration Test with Mock PT

**Files:**
- Create: `packages/pt-runtime/tests/integration/terminal-engine.test.ts`

**Step 1: Create integration test**

```typescript
// packages/pt-runtime/tests/integration/terminal-engine.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { createTerminalEngine, type PTCommandLine } from "../../src/pt/terminal/terminal-engine";

/**
 * Mock PT CommandLine that simulates PT behavior
 */
function createMockTerminal(initialPrompt = "Router#") {
  let prompt = initialPrompt;
  const listeners: Map<string, Set<(src: unknown, args: unknown) => void>> = new Map();
  
  return {
    getPrompt: () => prompt,
    enterCommand: (cmd: string) => {
      // Simulate command execution
      // In real PT, output comes via events
      
      // Simulate output event after short delay
      setTimeout(() => {
        const outputListeners = listeners.get("outputWritten");
        if (outputListeners) {
          outputListeners.forEach(cb => cb(null, { newOutput: `output of: ${cmd}\n` }));
        }
      }, 10);
      
      // Simulate command ended after output
      setTimeout(() => {
        const endedListeners = listeners.get("commandEnded");
        if (endedListeners) {
          endedListeners.forEach(cb => cb(null, { status: 0 }));
        }
      }, 50);
    },
    registerEvent: (event: string, _filter: unknown, cb: (src: unknown, args: unknown) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set());
      }
      listeners.get(event)!.add(cb);
    },
    unregisterEvent: (event: string, _filter: unknown, cb: (src: unknown, args: unknown) => void) => {
      listeners.get(event)?.delete(cb);
    },
    enterChar: (charCode: number, _modifiers: number) => {
      // Simulate pager continue
      if (charCode === 32) {
        setTimeout(() => {
          const moreListeners = listeners.get("moreDisplayed");
          if (moreListeners) {
            moreListeners.forEach(cb => cb(null, { active: false }));
          }
        }, 10);
      }
    },
  };
}

describe("TerminalEngine Integration", () => {
  test("executes command and returns result via events", async () => {
    const mockTerm = createMockTerminal("Router#");
    const engine = createTerminalEngine({
      commandTimeoutMs: 5000,
      stallTimeoutMs: 10000,
      pagerTimeoutMs: 30000,
    });
    
    engine.attach("R1", mockTerm as unknown as PTCommandLine);
    
    const result = await engine.executeCommand("R1", "show version");
    
    expect(result.ok).toBe(true);
    expect(result.output).toContain("show version");
    expect(result.status).toBe(0);
  });
  
  test("times out if command doesn't complete", async () => {
    const mockTerm = createMockTerminal("Router#");
    const engine = createTerminalEngine({
      commandTimeoutMs: 100,  // Short timeout for test
      stallTimeoutMs: 100,
      pagerTimeoutMs: 100,
    });
    
    // Override enterCommand to NOT trigger events (simulate hanging)
    mockTerm.enterCommand = () => {
      // Do nothing - command never completes
    };
    
    engine.attach("R1", mockTerm as unknown as PTCommandLine);
    
    await expect(
      engine.executeCommand("R1", "show version")
    ).rejects.toThrow(/timed out/);
  });
});
```

**Step 2: Run tests**

```bash
cd packages/pt-runtime && bun test tests/integration/terminal-engine.test.ts
```

**Step 3: Commit**

```bash
git add packages/pt-runtime/tests/integration/terminal-engine.test.ts
git commit -m "test(pt-terminal): add integration test with mock PT"
```

---

## Summary

### What Changed
1. `terminal-events.ts` - Enhanced with `CommandStatus` enum
2. `prompt-parser.ts` - NEW - Parse IOS prompts to detect mode
3. `terminal-engine.ts` - Full implementation using PT TerminalLine events
4. Unit tests for TerminalEngine and prompt parser
5. Integration test with mock PT

### Files Created
- `packages/pt-runtime/src/pt/terminal/prompt-parser.ts`
- `packages/pt-runtime/src/__tests__/pt/terminal-engine.test.ts`
- `packages/pt-runtime/tests/integration/terminal-engine.test.ts`

### Files Modified
- `packages/pt-runtime/src/pt/terminal/terminal-events.ts`
- `packages/pt-runtime/src/pt/terminal/terminal-engine.ts`
- `packages/pt-runtime/src/pt/terminal/index.ts`

### Success Criteria
- ✅ All new tests pass
- ✅ TerminalEngine uses PT events correctly
- ✅ Command execution is async via Promise
- ✅ Timeout handling works
- ✅ Pager continuation works
- ✅ Prompt parsing correctly detects mode