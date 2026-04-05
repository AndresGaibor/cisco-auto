import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { getSessionLogsDir } from '../system/paths.js';
import { redactObject } from './trace-redaction.js';

export interface SessionLogEvent {
  session_id: string;
  correlation_id: string;
  timestamp: string;
  phase: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export class SessionLogStore {
  private sessionsDir: string;

  constructor(customDir?: string) {
    this.sessionsDir = customDir ?? getSessionLogsDir();
  }

  async ensureDirs(): Promise<void> {
    const dir = this.sessionsDir;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  private getSessionPath(sessionId: string): string {
    return `${this.sessionsDir}/${sessionId}.ndjson`;
  }

  async append(event: SessionLogEvent): Promise<void> {
    await this.ensureDirs();

    const redactedEvent = {
      ...event,
      metadata: event.metadata ? redactObject(event.metadata) : undefined,
    };

    const line = JSON.stringify(redactedEvent) + '\n';
    const filePath = this.getSessionPath(event.session_id);

    try {
      appendFileSync(filePath, line, 'utf-8');
    } catch (err) {
      console.error(`Error writing session log: ${err}`);
    }
  }

  async read(sessionId: string): Promise<SessionLogEvent[]> {
    const filePath = this.getSessionPath(sessionId);

    if (!existsSync(filePath)) {
      return [];
    }

    try {
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim() !== '');

      return lines.map((line) => {
        try {
          return JSON.parse(line) as SessionLogEvent;
        } catch {
          return null;
        }
      }).filter((event): event is SessionLogEvent => event !== null);
    } catch {
      return [];
    }
  }
}

export const sessionLogStore = new SessionLogStore();