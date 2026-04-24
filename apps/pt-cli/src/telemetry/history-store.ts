import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { getHistoryDir, getHistoryIndexPath, getHistorySessionsDir, getHistorySessionPath } from '../system/paths.js';
import type { HistoryEntry, HistoryEntryFilters } from '../contracts/history-entry.js';

/**
 * Store de historial de comandos ejecutados.
 * Gestiona persistencia de entradas de historial en archivos NDJSON.
 */
export class HistoryStore {
  private historyDir: string;
  private indexPath: string;
  private sessionsDir: string;

  constructor() {
    this.historyDir = getHistoryDir();
    this.indexPath = getHistoryIndexPath();
    this.sessionsDir = getHistorySessionsDir();
  }

  /**
   * Asegura que los directorios de historial existan.
   */
  async ensureDirs(): Promise<void> {
    if (!existsSync(this.historyDir)) {
      mkdirSync(this.historyDir, { recursive: true });
    }
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Agrega una entrada al historial.
   * @param entry - Entrada de historial a persistir
   */
  async append(entry: HistoryEntry): Promise<void> {
    await this.ensureDirs();

    const line = JSON.stringify(entry) + '\n';

    try {
      appendFileSync(this.indexPath, line, 'utf-8');
    } catch (err) {
      console.error(`Error writing to history index: ${err}`);
    }

    const sessionPath = getHistorySessionPath(entry.sessionId);
    const sessionData = JSON.stringify(entry, null, 2);
    try {
      writeFileSync(sessionPath, sessionData, 'utf-8');
    } catch (err) {
      console.error(`Error writing to history session: ${err}`);
    }
  }

  /**
   * Lista entradas de historial con filtros opcionales.
   * @param filters - Filtros de consulta (limit, failedOnly, actionPrefix)
   * @returns Lista de entradas ordenadas por tiempo descendente
   */
  async list(filters?: HistoryEntryFilters): Promise<HistoryEntry[]> {
    if (!existsSync(this.indexPath)) {
      return [];
    }

    try {
      const content = readFileSync(this.indexPath, 'utf-8');
      const lines = content.split('\n').filter((line) => line.trim() !== '');

      let entries = lines.map((line) => {
        try {
          return JSON.parse(line) as HistoryEntry;
        } catch {
          return null;
        }
      }).filter((entry): entry is HistoryEntry => entry !== null);

      if (filters?.failedOnly) {
        entries = entries.filter((entry) => entry.status !== 'success');
      }

      if (filters?.actionPrefix) {
        entries = entries.filter((entry) => entry.action.startsWith(filters.actionPrefix!));
      }

      if (filters?.limit) {
        entries = entries.slice(-filters.limit);
      }

      return entries.sort((a, b) => {
        const timeA = a.timestamp ?? a.startedAt ?? '';
        const timeB = b.timestamp ?? b.startedAt ?? '';
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
    } catch {
      return [];
    }
  }

  /**
   * Lee una entrada de historial por sessionId.
   * @param sessionId - ID de la sesión a buscar
   * @returns Entrada de historial o null si no existe
   */
  async read(sessionId: string): Promise<HistoryEntry | null> {
    const sessionPath = getHistorySessionPath(sessionId);

    if (!existsSync(sessionPath)) {
      return null;
    }

    try {
      const content = readFileSync(sessionPath, 'utf-8');
      return JSON.parse(content) as HistoryEntry;
    } catch {
      return null;
    }
  }

  /**
   * Escribe un resumen de sesión (metadata agregada post-ejecución).
   * @param sessionId - ID de la sesión
   * @param payload - Resumen a persistir
   */
  async writeSessionSummary(sessionId: string, payload: unknown): Promise<void> {
    await this.ensureDirs();

    const sessionPath = getHistorySessionPath(sessionId);

    let existing: HistoryEntry | null = null;
    if (existsSync(sessionPath)) {
      try {
        existing = JSON.parse(readFileSync(sessionPath, 'utf-8')) as HistoryEntry;
      } catch {
        existing = null;
      }
    }

    const summaryData = {
      ...existing,
      session_summary: payload,
      updated_at: new Date().toISOString(),
    };

    try {
      writeFileSync(sessionPath, JSON.stringify(summaryData, null, 2), 'utf-8');
    } catch (err) {
      console.error(`Error writing session summary: ${err}`);
    }
  }
}

export const historyStore = new HistoryStore();