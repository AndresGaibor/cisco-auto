/**
 * LogManager - NDJSON logging with 7-day rotation
 * Uses Bun native APIs for file operations
 */

import { mkdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { LogEntry, LogSession, LogConfig, LogQueryOptions, LogStats } from './types.js';

export class LogManager {
  private config: LogConfig;
  private currentSession: LogSession | null = null;

  constructor(config?: Partial<LogConfig>) {
    this.config = {
      logDir: config?.logDir || '.sisyphus/logs',
      retentionDays: config?.retentionDays ?? 7,
      prefix: config?.prefix || 'pt-control',
    };
  }

  /**
   * Start a new logging session
   */
  startSession(sessionId: string): void {
    this.currentSession = {
      id: sessionId,
      started_at: new Date(),
      entries: [],
    };
  }

  /**
   * Get the current session ID if one is active
   */
  getCurrentSessionId(): string | null {
    return this.currentSession?.id ?? null;
  }

  /**
   * Log an entry
   */
  async log(entry: LogEntry): Promise<void> {
    // Ensure log directory exists
    await this.ensureLogDir();

    // Add to current session if active
    if (this.currentSession) {
      this.currentSession.entries.push(entry);
    }

    // Append to NDJSON file
    const filePath = this.getLogFilePath(new Date(entry.timestamp));
    const line = JSON.stringify(entry) + '\n';
    await Bun.write(filePath, line, { createPath: true });
  }

  /**
   * Convenience method to log with auto-generated timestamp
   */
  async logAction(
    sessionId: string,
    correlationId: string,
    action: string,
    outcome: LogEntry['outcome'],
    options?: Partial<LogEntry>
  ): Promise<void> {
    const entry: LogEntry = {
      session_id: sessionId,
      correlation_id: correlationId,
      timestamp: options?.timestamp || new Date().toISOString(),
      action,
      outcome,
      ...options,
    };
    await this.log(entry);
  }

  /**
   * Get all entries for a session
   */
  async getSession(sessionId: string): Promise<LogEntry[]> {
    const entries: LogEntry[] = [];
    const pattern = `${this.config.logDir}/${this.config.prefix}-*.ndjson`;
    const glob = new Bun.Glob(pattern);
    
    for await (const file of glob.scan()) {
      const content = await Bun.file(file).text();
      for (const line of content.split('\n').filter(Boolean)) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          if (entry.session_id === sessionId) {
            entries.push(entry);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }
    
    return entries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Query log entries with filters
   */
  async query(options: LogQueryOptions): Promise<LogEntry[]> {
    const entries: LogEntry[] = [];
    const pattern = `${this.config.logDir}/${this.config.prefix}-*.ndjson`;
    const glob = new Bun.Glob(pattern);
    
    for await (const file of glob.scan()) {
      const content = await Bun.file(file).text();
      for (const line of content.split('\n').filter(Boolean)) {
        try {
          const entry = JSON.parse(line) as LogEntry;
          if (this.matchesFilter(entry, options)) {
            entries.push(entry);
          }
        } catch {
          // Skip malformed lines
        }
      }
    }
    
    let results = entries.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (options.limit && options.limit > 0) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Rotate logs - delete files older than retention period
   */
  async rotate(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    
    let deleted = 0;
    const pattern = `${this.config.logDir}/${this.config.prefix}-*.ndjson`;
    const glob = new Bun.Glob(pattern);
    
    for await (const file of glob.scan()) {
      const fileObj = Bun.file(file);
      const stat = await fileObj.stat();
      
      if (stat && stat.mtime && new Date(stat.mtime) < cutoffDate) {
        try {
          await unlink(file);
          deleted++;
        } catch (error) {
          // Skip files that can't be deleted
          console.error(`Failed to delete log file ${file}:`, error);
        }
      }
    }
    
    return deleted;
  }

  /**
   * Get statistics about logging
   */
  async getStats(): Promise<LogStats> {
    const stats: LogStats = {
      fileCount: 0,
      totalSize: 0,
      totalEntries: 0,
    };

    const pattern = `${this.config.logDir}/${this.config.prefix}-*.ndjson`;
    const glob = new Bun.Glob(pattern);
    const files: string[] = [];

    for await (const file of glob.scan()) {
      files.push(file);
      stats.fileCount++;
      
      const fileObj = Bun.file(file);
      const stat = await fileObj.stat();
      
      if (stat) {
        stats.totalSize += stat.size || 0;
        
        // Count entries
        const content = await fileObj.text();
        stats.totalEntries += content.split('\n').filter(Boolean).length;
        
        // Track dates
        const mtime = stat.mtime ? new Date(stat.mtime) : undefined;
        if (mtime) {
          if (!stats.oldestFile || mtime < stats.oldestFile) {
            stats.oldestFile = mtime;
          }
          if (!stats.newestFile || mtime > stats.newestFile) {
            stats.newestFile = mtime;
          }
        }
      }
    }

    return stats;
  }

  /**
   * End current session
   */
  endSession(): void {
    if (this.currentSession) {
      this.currentSession.ended_at = new Date();
      this.currentSession = null;
    }
  }

  /**
   * Generate a unique correlation ID
   */
  static generateCorrelationId(): string {
    return `cor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate a unique session ID
   */
  static generateSessionId(): string {
    return `ses_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Private helpers

  private async ensureLogDir(): Promise<void> {
    if (!existsSync(this.config.logDir)) {
      await mkdir(this.config.logDir, { recursive: true });
    }
  }

  private getLogFilePath(date: Date): string {
    const dateStr = date.toISOString().split('T')[0];
    return join(this.config.logDir, `${this.config.prefix}-${dateStr}.ndjson`);
  }

  private matchesFilter(entry: LogEntry, options: LogQueryOptions): boolean {
    if (options.session_id && entry.session_id !== options.session_id) {
      return false;
    }
    if (options.action && entry.action !== options.action) {
      return false;
    }
    if (options.outcome && entry.outcome !== options.outcome) {
      return false;
    }
    if (options.target_device && entry.target_device !== options.target_device) {
      return false;
    }
    if (options.from) {
      const entryDate = new Date(entry.timestamp);
      if (entryDate < options.from) {
        return false;
      }
    }
    if (options.to) {
      const entryDate = new Date(entry.timestamp);
      if (entryDate > options.to) {
        return false;
      }
    }
    return true;
  }
}

// Singleton instance
let defaultLogManager: LogManager | null = null;

/**
 * Get the default LogManager instance (singleton)
 */
export function getLogManager(config?: Partial<LogConfig>): LogManager {
  if (!defaultLogManager) {
    defaultLogManager = new LogManager(config);
  }
  return defaultLogManager;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetLogManager(): void {
  defaultLogManager = null;
}
