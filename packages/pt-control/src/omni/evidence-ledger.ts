// ============================================================================
// Evidence Ledger - Persistencia decorridas
// ============================================================================

import type { CapabilityRunResult, EnvironmentFingerprint } from "./capability-types.js";
import * as fs from "fs";
import * as path from "path";

const LEDGER_DIR = process.env.OMNI_LEDGER_DIR ?? path.join(process.env.HOME ?? ".", "pt-dev", "omni", "ledger");
const RUNS_DIR = path.join(LEDGER_DIR, "runs");
const INDEX_FILE = path.join(LEDGER_DIR, "index.ndjson");

interface LedgerIndexEntry {
  runId: string;
  timestamp: number;
  capabilityId: string;
  ok: boolean;
  supportStatus: string;
  durationMs: number;
}

interface LedgerIndex {
  version: number;
  lastUpdated: number;
  entries: Record<string, LedgerIndexEntry>;
}

function ensureLedgerDir(): void {
  if (!fs.existsSync(LEDGER_DIR)) {
    fs.mkdirSync(LEDGER_DIR, { recursive: true });
  }
  if (!fs.existsSync(RUNS_DIR)) {
    fs.mkdirSync(RUNS_DIR, { recursive: true });
  }
}

export async function saveRunResult(result: CapabilityRunResult): Promise<void> {
  ensureLedgerDir();

  const runFile = path.join(RUNS_DIR, `${result.runId}.ndjson`);
  fs.writeFileSync(runFile, JSON.stringify(result) + "\n", { flag: "a" });

  const indexEntry: LedgerIndexEntry = {
    runId: result.runId,
    timestamp: result.startedAt,
    capabilityId: result.capabilityId,
    ok: result.ok,
    supportStatus: result.supportStatus,
    durationMs: result.durationMs,
  };

  let index: LedgerIndex = { version: 1, lastUpdated: Date.now(), entries: {} };
  if (fs.existsSync(INDEX_FILE)) {
    try {
      const content = fs.readFileSync(INDEX_FILE, "utf-8");
      index = JSON.parse(content);
    } catch {
      index = { version: 1, lastUpdated: Date.now(), entries: {} };
    }
  }

  index.entries[result.runId] = indexEntry;
  index.lastUpdated = Date.now();
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
}

export async function readRunResult(runId: string): Promise<CapabilityRunResult | null> {
  const runFile = path.join(RUNS_DIR, `${runId}.ndjson`);
  if (!fs.existsSync(runFile)) {
    return null;
  }

  try {
    const content = fs.readFileSync(runFile, "utf-8").trim();
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function queryRuns(options: {
  capabilityId?: string;
  from?: number;
  to?: number;
  supportStatus?: string;
}): Promise<LedgerIndexEntry[]> {
  if (!fs.existsSync(INDEX_FILE)) {
    return [];
  }

  const content = fs.readFileSync(INDEX_FILE, "utf-8");
  const index: LedgerIndex = JSON.parse(content);

  let results = Object.values(index.entries);

  if (options.capabilityId) {
    results = results.filter((e) => e.capabilityId === options.capabilityId);
  }

  if (options.from) {
    results = results.filter((e) => e.timestamp >= options.from!);
  }

  if (options.to) {
    results = results.filter((e) => e.timestamp <= options.to!);
  }

  if (options.supportStatus) {
    results = results.filter((e) => e.supportStatus === options.supportStatus);
  }

  return results.sort((a, b) => b.timestamp - a.timestamp);
}

export async function getRunCount(capabilityId?: string): Promise<number> {
  if (!fs.existsSync(INDEX_FILE)) {
    return 0;
  }

  const content = fs.readFileSync(INDEX_FILE, "utf-8");
  const index: LedgerIndex = JSON.parse(content);

  if (capabilityId) {
    return Object.values(index.entries).filter((e) => e.capabilityId === capabilityId).length;
  }

  return Object.keys(index.entries).length;
}

export function getLedgerDir(): string {
  return LEDGER_DIR;
}

export function getRunsDir(): string {
  return RUNS_DIR;
}