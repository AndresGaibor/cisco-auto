import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join, resolve, sep } from "node:path";

import { categorizeLogErrorLayer, extractPayloadDevice } from "./categorize.js";

export interface LogEventRecord extends Record<string, unknown> {
  timestamp?: string;
  session_id?: string;
  sessionId?: string;
  action?: string;
  phase?: string;
  outcome?: string;
  message?: string;
  error?: string;
  error_message?: string;
  command_id?: string;
  commandId?: string;
  ok?: boolean;
  metadata?: unknown;
}

export interface LogSessionRepositoryPort {
  read(sessionId: string): Promise<LogEventRecord[]>;
}

export interface LogBundleWriterPort {
  writeBundle(sessionId: string, outputPath?: string): Promise<string>;
  exists(path: string): boolean;
}

export interface LogsTailResult {
  entries: LogEventRecord[];
  count: number;
  logsDir: string;
}

export interface LogsSessionResult {
  sessionId: string;
  events: LogEventRecord[];
  count: number;
}

export interface LogsCommandResult {
  commandId: string;
  trace?: unknown;
  result?: unknown;
  bridgeEvents: LogEventRecord[];
  foundAny: boolean;
}

export interface LogsErrorEntry {
  timestamp: string;
  sessionId: string;
  action: string;
  error: string;
  layer: "bridge" | "pt" | "ios" | "verification" | "other";
}

export interface LogsErrorsResult {
  errors: LogsErrorEntry[];
  count: number;
  scannedFiles: number;
}

export interface LogsBundleResult {
  bundlePath: string;
  sessionId: string;
}

export interface LogsIosEntry {
  sessionId: string;
  action: string;
  timestamp: string;
  device?: string;
}

export interface LogsIosResult {
  entries: LogsIosEntry[];
  count: number;
  device?: string;
}

export type LogsUseCaseResult<T> =
  | {
      ok: true;
      data: T;
      advice?: string[];
    }
  | {
      ok: false;
      error: {
        code?: string;
        message: string;
        details?: Record<string, unknown>;
      };
    };

function assertInsideDir(parentDir: string, childPath: string): void {
  const parent = resolve(parentDir);
  const child = resolve(childPath);

  if (child !== parent && !child.startsWith(parent + sep)) {
    throw new Error(`Ruta fuera del directorio permitido: ${childPath}`);
  }
}

function readJsonFile(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

function readNdjsonFile(path: string): LogEventRecord[] {
  const content = readFileSync(path, "utf-8");
  const lines = content.split("\n").filter(Boolean);
  const entries: LogEventRecord[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed && typeof parsed === "object") {
        entries.push(parsed as LogEventRecord);
      }
    } catch {
      // línea corrupta: se ignora
    }
  }

  return entries;
}

function getRecentNdjsonFiles(logsDir: string, fileLimit: number): string[] {
  if (!existsSync(logsDir)) {
    return [];
  }

  return readdirSync(logsDir)
    .filter((file) => file.endsWith(".ndjson"))
    .sort()
    .slice(-fileLimit)
    .map((file) => {
      const path = resolve(logsDir, file);
      assertInsideDir(logsDir, path);
      return path;
    });
}

function isErrorLike(entry: LogEventRecord): boolean {
  const outcome = entry.outcome ?? entry.phase;
  return outcome === "error" || outcome === "failure";
}

export function isSessionLogLike(entry: unknown): entry is LogEventRecord {
  if (!entry || typeof entry !== "object") return false;
  const value = entry as Record<string, unknown>;

  return (
    typeof value.session_id === "string" &&
    typeof value.action === "string" &&
    typeof value.timestamp === "string"
  );
}

export async function tailLogs(input: {
  logsDir: string;
  lines?: number;
  errorsOnly?: boolean;
  fileLimit?: number;
}): Promise<LogsUseCaseResult<LogsTailResult>> {
  try {
    const lines = input.lines && input.lines > 0 ? input.lines : 20;
    const fileLimit = input.fileLimit && input.fileLimit > 0 ? input.fileLimit : 3;

    const files = getRecentNdjsonFiles(input.logsDir, fileLimit);
    const entries: LogEventRecord[] = [];

    for (const file of files) {
      const fileEntries = readNdjsonFile(file).slice(-lines);

      for (const entry of fileEntries) {
        if (input.errorsOnly && !isErrorLike(entry)) {
          continue;
        }

        entries.push(entry);
      }
    }

    return {
      ok: true,
      data: {
        entries: entries.slice(-lines),
        count: entries.slice(-lines).length,
        logsDir: input.logsDir,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "LOGS_TAIL_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: { logsDir: input.logsDir },
      },
    };
  }
}

export async function readLogSession(
  repository: LogSessionRepositoryPort,
  input: { sessionId: string },
): Promise<LogsUseCaseResult<LogsSessionResult>> {
  try {
    const events = await repository.read(input.sessionId);

    return {
      ok: true,
      data: {
        sessionId: input.sessionId,
        events,
        count: events.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "LOGS_SESSION_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: { sessionId: input.sessionId },
      },
    };
  }
}

export async function inspectCommandLogs(input: {
  commandId: string;
  commandLogsDir: string;
  resultsDir: string;
  eventsPath: string;
}): Promise<LogsUseCaseResult<LogsCommandResult>> {
  try {
    const commandId = input.commandId.trim();
    const normalizedId = commandId.replace(/\.json$/i, "").replace(/^cmd_/, "");

    const traceCandidates = [
      resolve(input.commandLogsDir, `${commandId}.json`),
      resolve(input.commandLogsDir, `${normalizedId}.json`),
    ];

    const resultCandidates = [
      resolve(input.resultsDir, `${commandId}.json`),
      resolve(input.resultsDir, `cmd_${normalizedId}.json`),
      resolve(input.resultsDir, `${normalizedId}.json`),
    ];

    for (const path of traceCandidates) {
      assertInsideDir(input.commandLogsDir, path);
    }

    for (const path of resultCandidates) {
      assertInsideDir(input.resultsDir, path);
    }

    let trace: unknown | undefined;
    let result: unknown | undefined;
    let foundAny = false;

    const tracePath = traceCandidates.find((path) => existsSync(path));
    if (tracePath) {
      trace = readJsonFile(tracePath);
      foundAny = true;
    }

    const resultPath = resultCandidates.find((path) => existsSync(path));
    if (resultPath) {
      result = readJsonFile(resultPath);
      foundAny = true;
    }

    let bridgeEvents: LogEventRecord[] = [];

    if (existsSync(input.eventsPath)) {
      bridgeEvents = readNdjsonFile(input.eventsPath).filter((entry) => {
        const entryCommandId = entry.command_id ?? entry.commandId;
        return entryCommandId === commandId || entryCommandId === normalizedId;
      });

      if (bridgeEvents.length > 0) {
        foundAny = true;
      }
    }

    return {
      ok: true,
      data: {
        commandId,
        trace,
        result,
        bridgeEvents,
        foundAny,
      },
      advice: foundAny ? undefined : ["Los archivos de trace se crean cuando --trace está habilitado."],
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "LOGS_COMMAND_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: { commandId: input.commandId },
      },
    };
  }
}

export async function findRecentLogErrors(input: {
  logsDir: string;
  limit?: number;
  fileLimit?: number;
}): Promise<LogsUseCaseResult<LogsErrorsResult>> {
  try {
    const limit = input.limit && input.limit > 0 ? input.limit : 10;
    const fileLimit = input.fileLimit && input.fileLimit > 0 ? input.fileLimit : 5;
    const files = getRecentNdjsonFiles(input.logsDir, fileLimit);

    const errors: LogsErrorEntry[] = [];

    for (const file of files) {
      if (errors.length >= limit) break;

      const entries = readNdjsonFile(file);

      for (const entry of entries) {
        if (errors.length >= limit) break;
        if (!isErrorLike(entry)) continue;

        const action = typeof entry.action === "string" ? entry.action : "";
        const error =
          typeof entry.error === "string"
            ? entry.error
            : typeof entry.error_message === "string"
              ? entry.error_message
              : "";

        errors.push({
          timestamp:
            typeof entry.timestamp === "string" ? entry.timestamp.split("T")[0] ?? "" : "",
          sessionId:
            typeof entry.session_id === "string"
              ? entry.session_id
              : typeof entry.sessionId === "string"
                ? entry.sessionId
                : "",
          action,
          error,
          layer: categorizeLogErrorLayer(action, error),
        });
      }
    }

    return {
      ok: true,
      data: {
        errors,
        count: errors.length,
        scannedFiles: files.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "LOGS_ERRORS_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: { logsDir: input.logsDir },
      },
    };
  }
}

export async function generateLogBundle(
  writer: LogBundleWriterPort,
  input: { sessionId: string; outputPath?: string },
): Promise<LogsUseCaseResult<LogsBundleResult>> {
  try {
    const bundlePath = await writer.writeBundle(input.sessionId, input.outputPath);

    if (!writer.exists(bundlePath)) {
      return {
        ok: false,
        error: {
          code: "LOGS_BUNDLE_NOT_CREATED",
          message: "Error al generar el bundle",
          details: { sessionId: input.sessionId, bundlePath },
        },
      };
    }

    return {
      ok: true,
      data: {
        bundlePath,
        sessionId: input.sessionId,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "LOGS_BUNDLE_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: { sessionId: input.sessionId },
      },
    };
  }
}

export async function listIosLogEntries(input: {
  logsDir: string;
  device?: string;
  limit?: number;
  fileLimit?: number;
}): Promise<LogsUseCaseResult<LogsIosResult>> {
  try {
    const limit = input.limit && input.limit > 0 ? input.limit : 20;
    const fileLimit = input.fileLimit && input.fileLimit > 0 ? input.fileLimit : 10;
    const files = getRecentNdjsonFiles(input.logsDir, fileLimit);

    const entries: LogsIosEntry[] = [];

    for (const file of files) {
      if (entries.length >= limit) break;

      const fileEntries = readNdjsonFile(file);

      for (const evt of fileEntries) {
        if (entries.length >= limit) break;

        const action = typeof evt.action === "string" ? evt.action : "";

        if (
          !action.includes("ios") &&
          !action.includes("config") &&
          !action.includes("show") &&
          !action.includes("exec")
        ) {
          continue;
        }

        const evtDevice = extractPayloadDevice(evt);

        if (
          input.device &&
          evtDevice &&
          !evtDevice.toLowerCase().includes(input.device.toLowerCase())
        ) {
          continue;
        }

        entries.push({
          sessionId:
            typeof evt.session_id === "string"
              ? evt.session_id
              : typeof evt.sessionId === "string"
                ? evt.sessionId
                : "",
          action,
          timestamp: typeof evt.timestamp === "string" ? evt.timestamp : "",
          device: evtDevice,
        });
      }
    }

    return {
      ok: true,
      data: {
        entries,
        count: entries.length,
        device: input.device,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "LOGS_IOS_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: { logsDir: input.logsDir, device: input.device },
      },
    };
  }
}

export function getLogFileSize(path: string): number {
  if (!existsSync(path)) {
    return 0;
  }

  try {
    return statSync(path).size;
  } catch {
    return 0;
  }
}