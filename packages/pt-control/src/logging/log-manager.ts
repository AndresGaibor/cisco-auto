import { unlink } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { LogConfig, LogEntry, LogQueryOptions, LogSession, LogStats } from './types.js';

type SessionLog = LogSession & LogEntry[];

export class LogManager {
  private config: Required<LogConfig>;
  private currentSession: LogSession | null = null;

  constructor(config?: Partial<LogConfig>) {
    this.config = {
      logDir: config?.logDir ?? '.sisyphus/logs',
      retentionDays: config?.retentionDays ?? 7,
      prefix: config?.prefix ?? 'pt-control',
    };
  }

  startSession(sessionId: string): void {
    this.currentSession = {
      id: sessionId,
      started_at: new Date().toISOString(),
      entries: [],
    };
  }

  getCurrentSessionId(): string | null {
    return this.currentSession?.id ?? null;
  }

  async log(entry: LogEntry): Promise<void> {
    const filePath = this.getLogFilePath(entry.timestamp);
    const previous = await this.readText(filePath);
    const line = `${JSON.stringify(entry)}\n`;

    await Bun.write(filePath, previous + line, { createPath: true });

    if (this.currentSession && this.currentSession.id === entry.session_id) {
      this.currentSession.entries.push(entry);
    }
  }

  async logAction(
    sessionId: string,
    correlationId: string,
    action: string,
    outcome: LogEntry['outcome'],
    options?: Partial<LogEntry>
  ): Promise<void> {
    const entry: LogEntry = {
      ...options,
      session_id: sessionId,
      correlation_id: correlationId,
      timestamp: options?.timestamp ?? new Date().toISOString(),
      action,
      outcome,
    };

    await this.log(entry);
  }

  async getSession(sessionId: string): Promise<SessionLog> {
    const entries = await this.query({ session_id: sessionId });
    const sessionEntries = entries.slice().sort((a, b) => this.toTime(a.timestamp) - this.toTime(b.timestamp));

    return Object.assign(sessionEntries, {
      id: sessionId,
      started_at: sessionEntries[0]?.timestamp ?? new Date().toISOString(),
      ended_at: sessionEntries.at(-1)?.timestamp,
      entries: sessionEntries,
    }) as SessionLog;
  }

  async query(options: LogQueryOptions): Promise<LogEntry[]> {
    const entries: LogEntry[] = [];

    for await (const filePath of this.scanLogFiles()) {
      const fileEntries = await this.readEntries(filePath);

      for (const entry of fileEntries) {
        if (this.matchesFilter(entry, options)) {
          entries.push(entry);
        }
      }
    }

    entries.sort((a, b) => this.toTime(a.timestamp) - this.toTime(b.timestamp));

    if (options.limit && options.limit > 0) {
      return entries.slice(0, options.limit);
    }

    return entries;
  }

  async rotate(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - this.config.retentionDays);
    const cutoff = cutoffDate.toISOString().slice(0, 10);

    let deleted = 0;

    for await (const filePath of this.scanLogFiles()) {
      const fileDate = this.extractDateFromFileName(filePath);

      if (!fileDate || fileDate >= cutoff) {
        continue;
      }

      try {
        await unlink(filePath);
        deleted += 1;
      } catch {
        continue;
      }
    }

    return deleted;
  }

  async getStats(): Promise<LogStats> {
    const stats: LogStats = {
      fileCount: 0,
      totalSize: 0,
      totalEntries: 0,
    };

    for await (const filePath of this.scanLogFiles()) {
      stats.fileCount += 1;

      const file = Bun.file(filePath);
      const content = await this.readText(filePath);
      stats.totalSize += file.size ?? content.length;
      stats.totalEntries += content.split(/\r?\n/).filter(Boolean).length;

      const fileDate = this.extractDateFromFileName(filePath);
      if (fileDate) {
        if (!stats.oldestFile || fileDate < this.normalizeDateValue(stats.oldestFile)) {
          stats.oldestFile = fileDate;
        }
        if (!stats.newestFile || fileDate > this.normalizeDateValue(stats.newestFile)) {
          stats.newestFile = fileDate;
        }
      }
    }

    return stats;
  }

  endSession(): void {
    if (this.currentSession) {
      this.currentSession.ended_at = new Date().toISOString();
      this.currentSession = null;
    }
  }

  static generateCorrelationId(): string {
    return `cor_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  static generateSessionId(): string {
    return `ses_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private async readText(filePath: string): Promise<string> {
    try {
      return await Bun.file(filePath).text();
    } catch {
      return '';
    }
  }

  private async readEntries(filePath: string): Promise<LogEntry[]> {
    const content = await this.readText(filePath);
    if (!content.trim()) {
      return [];
    }

    const entries: LogEntry[] = [];
    for (const line of content.split(/\r?\n/)) {
      if (!line.trim()) {
        continue;
      }

      try {
        entries.push(JSON.parse(line) as LogEntry);
      } catch {
        continue;
      }
    }

    return entries;
  }

  private async *scanLogFiles(): AsyncGenerator<string> {
    const pattern = `${this.config.prefix}-*.ndjson`;

    try {
      for await (const fileName of new Bun.Glob(pattern).scan({ cwd: this.config.logDir })) {
        yield join(this.config.logDir, fileName);
      }
    } catch {
      return;
    }
  }

  private getLogFilePath(timestamp: LogEntry['timestamp']): string {
    return join(this.config.logDir, `${this.config.prefix}-${this.toDateString(timestamp)}.ndjson`);
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
      const from = this.toTime(options.from);
      if (this.toTime(entry.timestamp) < from) {
        return false;
      }
    }

    if (options.to) {
      const to = this.toTime(options.to);
      if (this.toTime(entry.timestamp) > to) {
        return false;
      }
    }

    return true;
  }

  private toTime(value: LogEntry['timestamp'] | LogQueryOptions['from'] | LogQueryOptions['to']): number {
    if (value === undefined || value === null) {
      return 0;
    }

    if (typeof value === 'object') {
      return (value as Date).getTime();
    }

    if (typeof value === 'number') {
      return value;
    }

    return new Date(value).getTime();
  }

  private toDateString(value: LogEntry['timestamp']): string {
    return new Date(value).toISOString().slice(0, 10);
  }

  private extractDateFromFileName(filePath: string): string | null {
    const name = basename(filePath);
    const match = name.match(new RegExp(`^${this.escapeRegex(this.config.prefix)}-(\\d{4}-\\d{2}-\\d{2})\\.ndjson$`));
    return match?.[1] ?? null;
  }

  private normalizeDateValue(value: number | string): string {
    if (typeof value === 'number') {
      return new Date(value).toISOString().slice(0, 10);
    }

    return new Date(value).toISOString().slice(0, 10);
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

let defaultLogManager: LogManager | null = null;

export function getLogManager(config?: Partial<LogConfig>): LogManager {
  if (!defaultLogManager) {
    defaultLogManager = new LogManager(config);
  }

  return defaultLogManager;
}

export function resetLogManager(): void {
  defaultLogManager = null;
}
