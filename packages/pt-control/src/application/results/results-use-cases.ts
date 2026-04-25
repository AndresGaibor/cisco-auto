import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { unlink } from "node:fs/promises";
import { basename, join, resolve, sep } from "node:path";

export interface ResultFileInfo {
  name: string;
  mtimeIso: string;
  mtimeMs: number;
  size: number;
}

export interface ResultsListResult {
  files: ResultFileInfo[];
  total: number;
  resultsDir: string;
}

export interface ResultsViewResult {
  content: unknown;
  file: string;
  path: string;
}

export interface ResultsCleanCandidate {
  name: string;
  path: string;
  mtimeIso: string;
  mtimeMs: number;
  size: number;
}

export interface ResultsCleanPlan {
  candidates: ResultsCleanCandidate[];
  deleted: number;
  kept: number;
  total: number;
  resultsDir: string;
  mode: "keep" | "days";
}

export interface ResultsCleanResult {
  deleted: number;
  kept: number;
  attempted: number;
  skipped: number;
  resultsDir: string;
}

export interface ResultsShowResult {
  commandId: string;
  file: string;
  envelope: Record<string, unknown>;
  trace?: Record<string, unknown>;
}

export interface FailedResultInfo {
  name: string;
  status: string;
  error?: string;
  completedAt?: number;
  completedAtIso?: string;
}

export interface ResultsFailedResult {
  failed: FailedResultInfo[];
  count: number;
  scanned: number;
  resultsDir: string;
}

export interface ResultsPendingResult {
  queueCount: number;
  inFlightCount: number;
  deadLetterCount: number;
  pendingDeferred: number;
  commandsDir: string;
  inFlightDir: string;
  deadLetterDir: string;
  pendingFile: string;
  warnings: string[];
}

export type ResultsUseCaseResult<T> =
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

export interface ResultsPathsInput {
  devDir: string;
}

function resultsDirFromDevDir(devDir: string): string {
  return resolve(devDir, "results");
}

function commandLogsDirFromDevDir(devDir: string): string {
  return resolve(devDir, "logs", "commands");
}

function assertInsideDir(parentDir: string, childPath: string): void {
  const parent = resolve(parentDir);
  const child = resolve(childPath);

  if (child !== parent && !child.startsWith(parent + sep)) {
    throw new Error(`Ruta fuera del directorio permitido: ${childPath}`);
  }
}

function sanitizeResultFileName(file: string): string {
  const clean = basename(file.trim());

  if (!clean || clean === "." || clean === "..") {
    throw new Error("Nombre de archivo inválido");
  }

  if (clean !== file.trim()) {
    throw new Error("No se permiten rutas relativas ni absolutas en resultados");
  }

  if (!clean.endsWith(".json")) {
    throw new Error("El archivo de resultado debe terminar en .json");
  }

  return clean;
}

function normalizeCommandId(commandId: string): string {
  return commandId.trim().replace(/\.json$/i, "").replace(/^cmd_/, "");
}

function resolveResultPathForCommandId(resultsDir: string, commandId: string): {
  file: string;
  path: string;
} {
  const normalized = normalizeCommandId(commandId);
  const directFile = `${commandId.trim().replace(/\.json$/i, "")}.json`;
  const cmdFile = `cmd_${normalized}.json`;

  const directPath = resolve(resultsDir, directFile);
  const cmdPath = resolve(resultsDir, cmdFile);

  assertInsideDir(resultsDir, directPath);
  assertInsideDir(resultsDir, cmdPath);

  if (existsSync(directPath)) {
    return {
      file: directFile,
      path: directPath,
    };
  }

  return {
    file: cmdFile,
    path: cmdPath,
  };
}

function readJsonFile(filePath: string): unknown {
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

function isResultFileName(name: string): boolean {
  return name.startsWith("cmd_") && name.endsWith(".json");
}

function readResultFileInfos(resultsDir: string): ResultsUseCaseResult<ResultFileInfo[]> {
  if (!existsSync(resultsDir)) {
    return {
      ok: false,
      error: {
        code: "RESULTS_DIR_NOT_FOUND",
        message: `Directorio de resultados no encontrado: ${resultsDir}`,
        details: { resultsDir },
      },
    };
  }

  try {
    const files = readdirSync(resultsDir);
    const infos: ResultFileInfo[] = [];

    for (const file of files) {
      if (!isResultFileName(file)) {
        continue;
      }

      const path = resolve(resultsDir, file);
      assertInsideDir(resultsDir, path);

      try {
        const stats = statSync(path);

        if (!stats.isFile()) {
          continue;
        }

        infos.push({
          name: file,
          mtimeIso: stats.mtime.toISOString(),
          mtimeMs: stats.mtime.getTime(),
          size: stats.size,
        });
      } catch {
        // Si un archivo desaparece mientras se lista, se omite.
      }
    }

    infos.sort((a, b) => b.mtimeMs - a.mtimeMs);

    return {
      ok: true,
      data: infos,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "RESULTS_LIST_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: { resultsDir },
      },
    };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }

  return `${(bytes / 1024).toFixed(1)}KB`;
}

export async function listResults(input: {
  devDir: string;
  limit?: number;
}): Promise<ResultsUseCaseResult<ResultsListResult>> {
  const resultsDir = resultsDirFromDevDir(input.devDir);
  const infos = readResultFileInfos(resultsDir);

  if (!infos.ok) {
    return infos;
  }

  const limit = Number.isFinite(input.limit) && input.limit && input.limit > 0 ? input.limit : 20;

  return {
    ok: true,
    data: {
      files: infos.data.slice(0, limit),
      total: infos.data.length,
      resultsDir,
    },
  };
}

export async function viewResult(input: {
  devDir: string;
  file: string;
}): Promise<ResultsUseCaseResult<ResultsViewResult>> {
  try {
    const resultsDir = resultsDirFromDevDir(input.devDir);
    const cleanFile = sanitizeResultFileName(input.file);
    const path = resolve(resultsDir, cleanFile);

    assertInsideDir(resultsDir, path);

    if (!existsSync(path)) {
      return {
        ok: false,
        error: {
          code: "RESULT_FILE_NOT_FOUND",
          message: `Archivo no encontrado: ${cleanFile}`,
          details: { file: cleanFile, resultsDir },
        },
      };
    }

    const content = readFileSync(path, "utf-8");
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = content;
    }

    return {
      ok: true,
      data: {
        content: parsed,
        file: cleanFile,
        path,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "RESULT_VIEW_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: { file: input.file },
      },
    };
  }
}

export async function planCleanResults(input: {
  devDir: string;
  keep?: number;
  days?: number;
  nowMs?: number;
}): Promise<ResultsUseCaseResult<ResultsCleanPlan>> {
  const resultsDir = resultsDirFromDevDir(input.devDir);
  const infos = readResultFileInfos(resultsDir);

  if (!infos.ok) {
    return infos;
  }

  const nowMs = input.nowMs ?? Date.now();
  const hasDays = typeof input.days === "number" && Number.isFinite(input.days) && input.days > 0;
  const keep = typeof input.keep === "number" && Number.isFinite(input.keep) && input.keep >= 0
    ? input.keep
    : 50;

  let candidates: ResultsCleanCandidate[];

  if (hasDays) {
    const cutoff = nowMs - input.days! * 24 * 60 * 60 * 1000;
    candidates = infos.data
      .filter((file) => file.mtimeMs < cutoff)
      .map((file) => ({
        ...file,
        path: resolve(resultsDir, file.name),
      }));
  } else {
    candidates = infos.data.slice(keep).map((file) => ({
      ...file,
      path: resolve(resultsDir, file.name),
    }));
  }

  for (const candidate of candidates) {
    assertInsideDir(resultsDir, candidate.path);
  }

  return {
    ok: true,
    data: {
      candidates,
      deleted: 0,
      kept: infos.data.length - candidates.length,
      total: infos.data.length,
      resultsDir,
      mode: hasDays ? "days" : "keep",
    },
    advice:
      candidates.length === 0
        ? ["No hay archivos para eliminar"]
        : [`Se eliminarían ${candidates.length} archivos de resultados`],
  };
}

export async function cleanResults(input: {
  devDir: string;
  keep?: number;
  days?: number;
  nowMs?: number;
}): Promise<ResultsUseCaseResult<ResultsCleanResult>> {
  const plan = await planCleanResults(input);

  if (!plan.ok) {
    return plan;
  }

  let deleted = 0;
  let skipped = 0;

  for (const candidate of plan.data.candidates) {
    try {
      await unlink(candidate.path);
      deleted++;
    } catch {
      skipped++;
    }
  }

  return {
    ok: true,
    data: {
      deleted,
      skipped,
      attempted: plan.data.candidates.length,
      kept: plan.data.total - deleted,
      resultsDir: plan.data.resultsDir,
    },
    advice:
      deleted === 0
        ? ["No se eliminó ningún archivo"]
        : [`Se eliminaron ${deleted} archivos de resultados`],
  };
}

export async function showResult(input: {
  devDir: string;
  commandId: string;
}): Promise<ResultsUseCaseResult<ResultsShowResult>> {
  try {
    const resultsDir = resultsDirFromDevDir(input.devDir);
    const commandLogsDir = commandLogsDirFromDevDir(input.devDir);
    const resultPath = resolveResultPathForCommandId(resultsDir, input.commandId);

    if (!existsSync(resultPath.path)) {
      return {
        ok: false,
        error: {
          code: "RESULT_NOT_FOUND",
          message: `Resultado no encontrado para: ${input.commandId}`,
          details: { commandId: input.commandId, resultsDir },
        },
      };
    }

    const envelope = readJsonFile(resultPath.path);

    if (!envelope || typeof envelope !== "object") {
      return {
        ok: false,
        error: {
          code: "RESULT_ENVELOPE_INVALID",
          message: `El resultado no contiene un envelope JSON válido: ${resultPath.file}`,
          details: { file: resultPath.file },
        },
      };
    }

    const normalized = normalizeCommandId(input.commandId);
    const directTracePath = resolve(commandLogsDir, `${input.commandId.trim().replace(/\.json$/i, "")}.json`);
    const normalizedTracePath = resolve(commandLogsDir, `${normalized}.json`);
    const tracePath = existsSync(directTracePath) ? directTracePath : normalizedTracePath;

    let trace: Record<string, unknown> | undefined;

    if (existsSync(tracePath)) {
      const parsedTrace = readJsonFile(tracePath);
      if (parsedTrace && typeof parsedTrace === "object") {
        trace = parsedTrace as Record<string, unknown>;
      }
    }

    return {
      ok: true,
      data: {
        commandId: input.commandId,
        file: resultPath.file,
        envelope: envelope as Record<string, unknown>,
        trace,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "RESULT_SHOW_FAILED",
        message: error instanceof Error ? error.message : String(error),
        details: { commandId: input.commandId },
      },
    };
  }
}

export async function listFailedResults(input: {
  devDir: string;
  limit?: number;
}): Promise<ResultsUseCaseResult<ResultsFailedResult>> {
  const resultsDir = resultsDirFromDevDir(input.devDir);
  const infos = readResultFileInfos(resultsDir);

  if (!infos.ok) {
    return infos;
  }

  const limit = Number.isFinite(input.limit) && input.limit && input.limit > 0 ? input.limit : 20;
  const failed: FailedResultInfo[] = [];
  let scanned = 0;

  for (const file of infos.data) {
    if (failed.length >= limit) {
      break;
    }

    scanned++;

    try {
      const path = resolve(resultsDir, file.name);
      assertInsideDir(resultsDir, path);
      const envelope = readJsonFile(path) as Record<string, unknown>;

      const ok = envelope.ok;
      const status = typeof envelope.status === "string" ? envelope.status : "unknown";
      const value = envelope.value && typeof envelope.value === "object"
        ? (envelope.value as Record<string, unknown>)
        : undefined;

      if (ok === false || status === "failed" || status === "error") {
        const completedAt =
          typeof envelope.completedAt === "number" ? envelope.completedAt : undefined;

        failed.push({
          name: file.name,
          status,
          error: typeof value?.error === "string" ? value.error : undefined,
          completedAt,
          completedAtIso: completedAt ? new Date(completedAt).toISOString() : undefined,
        });
      }
    } catch {
      // Archivo corrupto o ilegible: se omite de la lista visual.
    }
  }

  return {
    ok: true,
    data: {
      failed,
      count: failed.length,
      scanned,
      resultsDir,
    },
  };
}

function countJsonFiles(dir: string): number {
  if (!existsSync(dir)) {
    return 0;
  }

  try {
    return readdirSync(dir).filter((file) => file.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

export async function inspectPendingResults(input: {
  devDir: string;
}): Promise<ResultsUseCaseResult<ResultsPendingResult>> {
  const commandsDir = resolve(input.devDir, "commands");
  const inFlightDir = resolve(input.devDir, "in-flight");
  const deadLetterDir = resolve(input.devDir, "dead-letter");
  const pendingFile = resolve(input.devDir, "journal", "pending-commands.json");

  const queueCount = countJsonFiles(commandsDir);
  const inFlightCount = countJsonFiles(inFlightDir);
  const deadLetterCount = countJsonFiles(deadLetterDir);

  let pendingDeferred = 0;

  if (existsSync(pendingFile)) {
    try {
      const pending = JSON.parse(readFileSync(pendingFile, "utf-8"));
      if (pending && typeof pending === "object") {
        pendingDeferred = Object.keys(pending).length;
      }
    } catch {
      pendingDeferred = 0;
    }
  }

  const warnings: string[] = [];

  if (deadLetterCount > 0) {
    warnings.push("Hay comandos en dead-letter.");
  }

  if (inFlightCount > 5) {
    warnings.push("Alta cantidad de comandos en in-flight. Packet Tracer podría estar atascado.");
  }

  return {
    ok: true,
    data: {
      queueCount,
      inFlightCount,
      deadLetterCount,
      pendingDeferred,
      commandsDir,
      inFlightDir,
      deadLetterDir,
      pendingFile,
      warnings,
    },
    advice:
      deadLetterCount > 0
        ? [`Revisa archivos en ${deadLetterDir}`]
        : undefined,
  };
}