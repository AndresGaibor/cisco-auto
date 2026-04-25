import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import type {
  HistoryEntry as ControlHistoryEntry,
  HistoryListFilters,
  HistoryRepositoryPort,
} from "@cisco-auto/pt-control/application/history";

import { historyStore } from "../telemetry/history-store.js";
import type { HistoryEntry as CliHistoryEntry } from "../contracts/history-entry.js";
import { getHistoryDir } from "../system/paths.js";

function toControlHistoryEntry(entry: CliHistoryEntry): ControlHistoryEntry {
  return entry as unknown as ControlHistoryEntry;
}

export function createCliHistoryRepository(): HistoryRepositoryPort {
  return {
    async list(filters?: HistoryListFilters): Promise<ControlHistoryEntry[]> {
      const entries = await historyStore.list({
        limit: filters?.limit,
        failedOnly: filters?.failedOnly,
        actionPrefix: filters?.actionPrefix,
      });

      return entries.map(toControlHistoryEntry);
    },

    async read(sessionId: string): Promise<ControlHistoryEntry | null> {
      const entry = await historyStore.read(sessionId);
      return entry ? toControlHistoryEntry(entry) : null;
    },

    async listAvailableSessions(): Promise<string[]> {
      const historyDir = getHistoryDir();
      const sessionsDir = join(historyDir, "sessions");

      if (!existsSync(historyDir) || !existsSync(sessionsDir)) {
        return [];
      }

      return readdirSync(sessionsDir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(".json", ""));
    },
  };
}