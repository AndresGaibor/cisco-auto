import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { getSessionLogsDir, getCommandLogsDir, getResultsDir, getBundlesDir, getEventsPath, getContextStatusPath, getHistoryDir } from '../system/paths.js';
import { redactObject } from './trace-redaction.js';
import type { LogBundle } from '../contracts/log-bundle.js';

export class BundleWriter {
  async ensureDirs(): Promise<void> {
    const bundlesDir = getBundlesDir();
    if (!existsSync(bundlesDir)) {
      mkdirSync(bundlesDir, { recursive: true });
    }
  }

  private async loadSessionLogs(sessionId: string): Promise<Record<string, unknown>[]> {
    const sessionPath = `${getSessionLogsDir()}/${sessionId}.ndjson`;

    if (!existsSync(sessionPath)) {
      return [];
    }

    try {
      const content = readFileSync(sessionPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim() !== '');

      return lines.map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter((entry): entry is Record<string, unknown> => entry !== null);
    } catch {
      return [];
    }
  }

  private async loadCommandTrace(cmdId: string): Promise<Record<string, unknown> | null> {
    const tracePath = `${getCommandLogsDir()}/${cmdId}.json`;

    if (!existsSync(tracePath)) {
      return null;
    }

    try {
      return JSON.parse(readFileSync(tracePath, 'utf-8'));
    } catch {
      return null;
    }
  }

  private async loadCommandResult(cmdId: string): Promise<Record<string, unknown> | null> {
    const resultPath = `${getResultsDir()}/${cmdId}.json`;

    if (!existsSync(resultPath)) {
      return null;
    }

    try {
      return JSON.parse(readFileSync(resultPath, 'utf-8'));
    } catch {
      return null;
    }
  }

  private async loadBridgeEvents(): Promise<Record<string, unknown>[]> {
    const eventsPath = getEventsPath();

    if (!existsSync(eventsPath)) {
      return [];
    }

    try {
      const content = readFileSync(eventsPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim() !== '');

      return lines.map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter((entry): entry is Record<string, unknown> => entry !== null);
    } catch {
      return [];
    }
  }

  private async loadHistoryEntry(sessionId: string): Promise<Record<string, unknown> | null> {
    const sessionPath = `${getHistoryDir()}/sessions/${sessionId}.json`;
    if (!existsSync(sessionPath)) return null;
    try {
      return JSON.parse(readFileSync(sessionPath, 'utf-8'));
    } catch { return null; }
  }

  private async loadContextStatus(): Promise<Record<string, unknown> | null> {
    const path = getContextStatusPath();
    if (!existsSync(path)) return null;
    try {
      return JSON.parse(readFileSync(path, 'utf-8'));
    } catch { return null; }
  }

  private extractCommandIds(sessionLogs: Record<string, unknown>[]): string[] {
    const commandIds: string[] = [];

    for (const log of sessionLogs) {
      const metadata = log.metadata as Record<string, unknown> | undefined;
      if (metadata?.command_ids && Array.isArray(metadata.command_ids)) {
        for (const id of metadata.command_ids) {
          if (typeof id === 'string' && !commandIds.includes(id)) {
            commandIds.push(id);
          }
        }
      }
    }

    return commandIds;
  }

  async writeBundle(sessionId: string): Promise<string> {
    await this.ensureDirs();

    const sessionLogs = await this.loadSessionLogs(sessionId);
    const bridgeEvents = await this.loadBridgeEvents();
    const commandIds = this.extractCommandIds(sessionLogs);
    const historyEntry = await this.loadHistoryEntry(sessionId);
    const contextStatus = await this.loadContextStatus();

    const ptRuntimeCommands = await Promise.all(
      commandIds.map((cmdId) => this.loadCommandTrace(cmdId))
    );

    const results = await Promise.all(
      commandIds.map((cmdId) => this.loadCommandResult(cmdId))
    );

    const firstLog = sessionLogs[0];
    const lastLog = sessionLogs[sessionLogs.length - 1];

    const startedAt = (firstLog?.timestamp as string) ?? new Date().toISOString();
    const endedAt = (lastLog?.timestamp as string) ?? new Date().toISOString();

    const bundle: LogBundle = {
      schemaVersion: '1.0',
      session: {
        id: sessionId,
        startedAt,
        endedAt,
        argv: [],
        cwd: process.cwd(),
      },
      cli: {
        action: (firstLog?.action as string) ?? 'unknown',
        timeline: sessionLogs.map((log) => redactObject(log) as Record<string, unknown>),
      },
      bridge: {
        events: bridgeEvents.slice(-100) as Record<string, unknown>[],
      },
      ptRuntime: {
        commands: ptRuntimeCommands.filter((cmd): cmd is Record<string, unknown> => cmd !== null),
      },
      results: results.filter((r): r is Record<string, unknown> => r !== null),
      summary: {
        ok: true,
        durationMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
        commandIds,
      },
    };

    const bundleWithMeta = {
      ...redactObject(bundle) as Record<string, unknown>,
      _metadata: {
        generatedAt: new Date().toISOString(),
        version: 'phase-6',
        historyEntry: historyEntry ? redactObject(historyEntry) : null,
        contextStatus: contextStatus ? redactObject(contextStatus) : null,
      },
    };

    const bundlesDir = getBundlesDir();
    const bundlePath = `${bundlesDir}/${sessionId}.bundle.json`;

    writeFileSync(bundlePath, JSON.stringify(bundleWithMeta, null, 2), 'utf-8');

    return bundlePath;
  }
}

export const bundleWriter = new BundleWriter();