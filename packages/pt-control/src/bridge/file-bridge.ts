import { readFileSync, writeFileSync, existsSync, mkdirSync, watch, type FSWatcher } from "node:fs";
import { resolve } from "node:path";
import type { CommandPayload, PTEvent } from "../types/index.js";

export interface FileBridgeConfig {
  devDir: string;
  runtimeFile?: string;
  commandFile?: string;
  eventsFile?: string;
}

export class FileBridge {
  private devDir: string;
  private runtimeFile: string;
  private commandFile: string;
  private eventsFile: string;
  private watcher: FSWatcher | null = null;
  private eventHandlers: Array<(event: PTEvent) => void> = [];
  private commandId = 0;

  constructor(config: FileBridgeConfig) {
    this.devDir = resolve(config.devDir);
    this.runtimeFile = resolve(this.devDir, config.runtimeFile || "runtime.js");
    this.commandFile = resolve(this.devDir, config.commandFile || "command.json");
    this.eventsFile = resolve(this.devDir, config.eventsFile || "events.ndjson");

    // Ensure dev directory exists
    if (!existsSync(this.devDir)) {
      mkdirSync(this.devDir, { recursive: true });
    }
  }

  /**
   * Initialize the bridge and start watching for events
   */
  async start(): Promise<void> {
    // Watch events file for changes
    this.watcher = watch(this.eventsFile, (eventType) => {
      if (eventType === "change") {
        this.readNewEvents();
      }
    });

    console.log(`[FileBridge] Started watching ${this.devDir}`);
  }

  /**
   * Stop the bridge
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    console.log("[FileBridge] Stopped");
  }

  /**
   * Load runtime JavaScript code into PT
   */
  async loadRuntime(code: string): Promise<void> {
    writeFileSync(this.runtimeFile, code, "utf-8");
    console.log(`[FileBridge] Runtime loaded to ${this.runtimeFile}`);
  }

  /**
   * Send a command to PT
   */
  async sendCommand(payload: CommandPayload): Promise<string> {
    const id = `cmd_${++this.commandId}_${Date.now()}`;
    const command = {
      id,
      ts: Date.now(),
      payload,
    };

    writeFileSync(this.commandFile, JSON.stringify(command, null, 2), "utf-8");
    console.log(`[FileBridge] Command sent: ${payload.kind}`);
    return id;
  }

  /**
   * Register event handler
   */
  onEvent(handler: (event: PTEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Wait for a specific result by ID
   */
  async waitForResult(id: string, timeoutMs = 5000): Promise<PTEvent> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for result ${id}`));
      }, timeoutMs);

      const handler = (event: PTEvent) => {
        if (event.type === "result" && event.id === id) {
          clearTimeout(timeout);
          resolve(event);
        } else if (event.type === "error" && event.id === id) {
          clearTimeout(timeout);
          reject(new Error(event.message));
        }
      };

      this.onEvent(handler);
    });
  }

  /**
   * Read new events from events.ndjson
   */
  private lastReadPosition = 0;

  private readNewEvents(): void {
    if (!existsSync(this.eventsFile)) {
      return;
    }

    try {
      const content = readFileSync(this.eventsFile, "utf-8");
      const newContent = content.slice(this.lastReadPosition);
      
      if (!newContent.trim()) {
        return;
      }

      this.lastReadPosition = content.length;

      const lines = newContent.trim().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const event = JSON.parse(line) as PTEvent;
          this.eventHandlers.forEach((handler) => handler(event));
        } catch (err) {
          console.error("[FileBridge] Failed to parse event:", line, err);
        }
      }
    } catch (err) {
      console.error("[FileBridge] Failed to read events:", err);
    }
  }

  /**
   * Get all events
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
      .map((line) => JSON.parse(line) as PTEvent);
  }

  /**
   * Clear events file
   */
  clearEvents(): void {
    if (existsSync(this.eventsFile)) {
      writeFileSync(this.eventsFile, "", "utf-8");
      this.lastReadPosition = 0;
    }
  }
}
