import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";
import type { PTEvent, PTEventType, PTEventTypeMap, CommandPayload, CommandFile } from "../types/index.js";
import { FastEventStream } from "./fast-event-stream.js";

// ============================================================================
// Configuration
// ============================================================================

export interface FileBridgeConfig {
  /** Directory for PT communication files */
  devDir: string;
  /** Runtime file name (default: runtime.js) */
  runtimeFile?: string;
  /** Command file name (default: command.json) */
  commandFile?: string;
  /** Events file name (default: events.ndjson) */
  eventsFile?: string;
  /** State file name (default: state.json) */
  stateFile?: string;
  /** Debounce time for file watching (default: 50ms) */
  debounceMs?: number;
  defaultTimeout?: number;
}

// ============================================================================
// Event Handler Types
// ============================================================================

export type EventHandler<E extends PTEventType = PTEventType> = (
  event: PTEventTypeMap[E]
) => void;

interface PendingResult {
  resolve: (event: PTEvent) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class FileBridge {
  private devDir: string;
  private runtimeFile: string;
  private commandFile: string;
  private eventsFile: string;
  private stateFile: string;
  private debounceMs: number;
  private defaultTimeout: number;

  private stream: FastEventStream | null = null;
  private eventHandlers: Map<PTEventType, Set<EventHandler>> = new Map();
  private pendingResults: Map<string, PendingResult> = new Map();
  
  private commandCounter = 0;
  private isStarted = false;

  constructor(config: FileBridgeConfig) {
    this.devDir = resolve(config.devDir);
    this.runtimeFile = resolve(this.devDir, config.runtimeFile || "runtime.js");
    this.commandFile = resolve(this.devDir, config.commandFile || "command.json");
    this.eventsFile = resolve(this.devDir, config.eventsFile || "events.ndjson");
    this.stateFile = resolve(this.devDir, config.stateFile || "state.json");
    this.debounceMs = config.debounceMs ?? 50;
    this.defaultTimeout = config.defaultTimeout ?? 120000;

    this.ensureDirectory();
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Initialize the bridge and start watching for events
   */
  async start(): Promise<void> {
    if (this.isStarted) return;

    // Ensure events file exists
    if (!existsSync(this.eventsFile)) {
      writeFileSync(this.eventsFile, "", "utf-8");
    }

    // Setup streaming parser
    this.stream = new FastEventStream(this.eventsFile);
    this.stream.on("event", (event) => this.handleEvent(event));
    this.stream.start();

    this.isStarted = true;
    this.emit("bridge-started" as PTEventType, { type: "init", ts: Date.now() } as PTEvent);
  }

  /**
   * Stop the bridge
   */
  async stop(): Promise<void> {
    if (this.stream) {
      this.stream.stop();
      this.stream = null;
    }

    // Reject all pending results
    for (const [id, pending] of this.pendingResults) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Bridge stopped"));
    }
    this.pendingResults.clear();

    this.isStarted = false;
  }

  // ============================================================================
  // Runtime Management
  // ============================================================================

  /**
   * Load runtime JavaScript code into PT
   */
  async loadRuntime(code: string): Promise<void> {
    this.ensureDirectory();
    writeFileSync(this.runtimeFile, code, "utf-8");
  }

  /**
   * Load runtime from file
   */
  async loadRuntimeFromFile(filePath: string): Promise<void> {
    const code = readFileSync(filePath, "utf-8");
    await this.loadRuntime(code);
  }

  // ============================================================================
  // Command Sending
  // ============================================================================

  /**
   * Send a command to PT and return its ID
   */
  async sendCommand(payload: CommandPayload): Promise<string> {
    const id = payload.id || this.generateId();
    
    const command: CommandFile = {
      id,
      timestamp: Date.now(),
      payload: { ...payload, id },
    };

    this.ensureDirectory();
    writeFileSync(this.commandFile, JSON.stringify(command, null, 2), "utf-8");
    
    return id;
  }

  /**
   * Send a command and wait for its result
   */
  async sendCommandAndWait<T = unknown>(
    payload: CommandPayload,
    timeoutMs?: number
  ): Promise<{ event: PTEvent; value: T }> {
    const id = await this.sendCommand(payload);
    const event = await this.waitForResult(id, timeoutMs);
    
    const resultEvent = event as { value?: T; parsed?: T };
    return {
      event,
      value: (resultEvent.parsed ?? resultEvent.value) as T,
    };
  }

  // ============================================================================
  // Result Waiting
  // ============================================================================

  /**
   * Wait for a specific result by ID
   */
  async waitForResult(id: string, timeoutMs?: number): Promise<PTEvent> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResults.delete(id);
        reject(new Error(`Timeout waiting for result ${id} after ${timeoutMs ?? this.defaultTimeout}ms`));
      }, timeoutMs ?? this.defaultTimeout);

      this.pendingResults.set(id, {
        resolve: (event) => {
          clearTimeout(timeout);
          this.pendingResults.delete(id);
          resolve(event);
        },
        reject: (error) => {
          clearTimeout(timeout);
          this.pendingResults.delete(id);
          reject(error);
        },
        timeout,
      });
    });
  }

  // ============================================================================
  // Event Subscription
  // ============================================================================

  /**
   * Subscribe to events of a specific type
   */
  on<E extends PTEventType>(eventType: E, handler: EventHandler<E>): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(eventType)?.delete(handler as EventHandler);
    };
  }

  /**
   * Subscribe to all events
   */
  onAll(handler: EventHandler): () => void {
    return this.on("*" as PTEventType, handler);
  }

  /**
   * Subscribe to event once
   */
  once<E extends PTEventType>(eventType: E, handler: EventHandler<E>): () => void {
    const unsubscribe = this.on(eventType, (event) => {
      unsubscribe();
      handler(event);
    });
    return unsubscribe;
  }

  // ============================================================================
  // State Management
  // ============================================================================

  /**
   * Read current state from PT
   */
  readState<T = unknown>(): T | null {
    if (!existsSync(this.stateFile)) {
      return null;
    }
    try {
      const content = readFileSync(this.stateFile, "utf-8");
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  /**
   * Get all events from events file
   */
  getAllEvents(): PTEvent[] {
    if (!existsSync(this.eventsFile)) {
      return [];
    }

    const content = readFileSync(this.eventsFile, "utf-8");
    return content
      .trim()
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          return JSON.parse(line) as PTEvent;
        } catch {
          return null;
        }
      })
      .filter((e): e is PTEvent => e !== null);
  }

  /**
   * Clear events file
   */
  clearEvents(): void {
    if (existsSync(this.eventsFile)) {
      writeFileSync(this.eventsFile, "", "utf-8");
    }
  }

  // ============================================================================
  // Internal Methods
  // ============================================================================

  private ensureDirectory(): void {
    if (!existsSync(this.devDir)) {
      mkdirSync(this.devDir, { recursive: true });
    }
  }

  private generateId(): string {
    return `cmd_${++this.commandCounter}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  }

  private emit(eventType: PTEventType, event: PTEvent): void {
    // Handle specific event type handlers
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.forEach((handler) => handler(event));
    }

    // Handle wildcard handlers
    const wildcardHandlers = this.eventHandlers.get("*" as PTEventType);
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(event));
    }
  }

  private handleEvent(event: PTEvent): void {
    // Check for pending results
    if (event.type === "result" || event.type === "error") {
      const resultEvent = event as { id?: string };
      if (resultEvent.id) {
        const pending = this.pendingResults.get(resultEvent.id);
        if (pending) {
          if (event.type === "error") {
            pending.reject(new Error((event as { message: string }).message));
          } else {
            pending.resolve(event);
          }
          return;
        }
      }
    }

    // Emit to handlers
    this.emit(event.type, event);
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFileBridge(config: FileBridgeConfig): FileBridge {
  return new FileBridge(config);
}

// ============================================================================
// Default Instance (convenience)
// ============================================================================

const DEFAULT_DEV_DIR = process.env.PT_DEV_DIR || `${process.env.HOME ?? homedir()}/pt-dev`;

export function createDefaultBridge(): FileBridge {
  return new FileBridge({ devDir: DEFAULT_DEV_DIR });
}
