/**
 * Shared watcher for result files to avoid file descriptor exhaustion.
 * 
 * Instead of creating one fs.watch per sendCommandAndWait call,
 * this creates a single shared watcher and notifies multiple listeners.
 */
import { watch, type FSWatcher } from "node:fs";
import { EventEmitter } from "node:events";

export class SharedResultWatcher extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private callbacks = new Map<string, Set<() => void>>();
  private refCount = 0;
  private watching = false;

  constructor(private readonly resultsDir: string) {
    super();
  }

  /**
   * Register interest in a specific result file.
   * Starts the watcher if this is the first registration.
   */
  watch(commandId: string, callback: () => void): void {
    if (!this.callbacks.has(commandId)) {
      this.callbacks.set(commandId, new Set());
    } else {
      const existing = this.callbacks.get(commandId)!;
      if (existing.has(callback)) {
        return;
      }
    }

    this.callbacks.get(commandId)!.add(callback);
    this.refCount++;

    if (!this.watching) {
      this.startWatcher();
    }
  }

  /**
   * Unregister interest in a result file.
   * Stops the watcher if no more listeners exist.
   */
  unwatch(commandId: string, callback: () => void): void {
    const cbs = this.callbacks.get(commandId);
    if (!cbs) return;

    if (cbs.delete(callback)) {
      this.refCount--;
    }

    if (cbs.size === 0) {
      this.callbacks.delete(commandId);
    }

    if (this.refCount === 0 && this.watching) {
      this.stopWatcher();
    }
  }

  /**
   * Notify all listeners for a specific command ID.
   */
  private notify(commandId: string): void {
    const cbs = this.callbacks.get(commandId);
    if (!cbs) return;

    // Call each callback
    for (const callback of cbs) {
      try {
        callback();
      } catch (err) {
        // Prevent callback errors from breaking the watcher
        this.emit("error", err);
      }
    }
  }

  private startWatcher(): void {
    if (this.watcher) return;

    try {
      this.watcher = watch(this.resultsDir, (eventType, filename) => {
        if (!filename || !filename.endsWith(".json")) return;

        // Extract command ID from filename: <commandId>.json
        const commandId = filename.replace(/\.json$/, "");
        this.notify(commandId);
      });

      this.watcher.on("error", (err) => {
        this.emit("error", err);
        this.watcher = null;
        this.watching = false;
        
        // Try to restart if we still have listeners
        if (this.refCount > 0) {
          setTimeout(() => this.startWatcher(), 1000);
        }
      });

      this.watching = true;
    } catch (err) {
      this.emit("error", err);
      this.watcher = null;
      this.watching = false;
    }
  }

  private stopWatcher(): void {
    if (this.watcher) {
      try {
        this.watcher.close();
      } catch {
        // Ignore close errors
      }
      this.watcher = null;
    }
    this.watching = false;
  }

  /**
   * Clean up all resources.
   */
  destroy(): void {
    this.stopWatcher();
    this.callbacks.clear();
    this.refCount = 0;
    this.removeAllListeners();
  }

  /**
   * Get diagnostic information.
   */
  getStats(): {
    watching: boolean;
    listenersCount: number;
    commandsWatched: number;
  } {
    return {
      watching: this.watching,
      listenersCount: this.refCount,
      commandsWatched: this.callbacks.size,
    };
  }
}
