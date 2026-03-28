import { openSync, readSync, statSync, existsSync, watch, type FSWatcher } from "node:fs";
import { EventEmitter } from "node:events";
import { PTEventSchema, type PTEvent, type PTEventType } from "../types/index.js";

/** Parse error event emitted when JSON parsing or validation fails */
export interface ParseErrorEvent {
  type: "parse-error";
  raw: unknown;
  line: string;
  error: string;
  issues?: Array<{ path: (string | number)[]; message: string }>;
}

/**
 * FastEventStream - An efficient NDJSON event stream processor.
 * It uses low-level file descriptors and byte-offset tracking to read 
 * only new data from the events file, similar to 'tail -f'.
 */
export class FastEventStream extends EventEmitter {
  private filePath: string;
  private fd: number | null = null;
  private lastPosition = 0;
  private watcher: FSWatcher | null = null;
  private buffer = Buffer.alloc(64 * 1024); // 64KB buffer
  private leftover = "";

  constructor(filePath: string) {
    super();
    this.filePath = filePath;
  }

  /**
   * Start watching and streaming events
   */
  start(): void {
    if (!existsSync(this.filePath)) {
      // Wait for file to be created or handle error
      this.emit("error", new Error(`File not found: ${this.filePath}`));
      return;
    }

    // Open file for reading
    this.fd = openSync(this.filePath, "r");
    
    // Start from current end of file
    const stats = statSync(this.filePath);
    this.lastPosition = stats.size;

    // Watch for changes
    this.watcher = watch(this.filePath, (eventType) => {
      if (eventType === "change") {
        this.processNewData();
      }
    });

    this.emit("started");
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.fd = null;
    this.emit("stopped");
  }

  /**
   * Process new data added to the file
   */
  private processNewData(): void {
    if (this.fd === null) return;

    try {
      const stats = statSync(this.filePath);
      
      // Handle file truncation (PT might have cleared the file)
      if (stats.size < this.lastPosition) {
        this.lastPosition = 0;
        this.leftover = "";
      }

      if (stats.size === this.lastPosition) return;

      let bytesRead: number;
      while ((bytesRead = readSync(this.fd, this.buffer, 0, this.buffer.length, this.lastPosition)) > 0) {
        this.lastPosition += bytesRead;
        const chunk = this.leftover + this.buffer.toString("utf-8", 0, bytesRead);
        const lines = chunk.split("\n");
        
        // Last element might be incomplete
        this.leftover = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          this.parseAndEmit(line);
        }
      }
    } catch (err) {
      this.emit("error", err);
    }
  }

  private parseAndEmit(line: string): void {
    try {
      const raw = JSON.parse(line);
      
      // Validate with Zod schema
      const result = PTEventSchema.safeParse(raw);
      
      if (!result.success) {
        // Emit parse-error event with details
        const parseError: ParseErrorEvent = {
          type: "parse-error",
          raw,
          line,
          error: "Validation failed",
          issues: result.error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        };
        this.emit("parse-error", parseError);
        return;
      }
      
      const event = result.data as PTEvent;
      this.emit("event", event);
      this.emit(event.type as string, event);
    } catch (err) {
      // JSON parse error
      const parseError: ParseErrorEvent = {
        type: "parse-error",
        raw: null,
        line,
        error: String(err),
      };
      this.emit("parse-error", parseError);
    }
  }
}
