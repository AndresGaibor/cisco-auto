// packages/pt-runtime/src/pt/kernel/command-finalizer.ts
// Finaliza comandos activos: escribe resultados, verifica persistencia y solo entonces limpia la cola.

import { safeFM } from "./safe-fm";
import { buildCommandResultEnvelope } from "./command-result-envelope";
import type { KernelSubsystems } from "./kernel-lifecycle";
import type { KernelState } from "./kernel-state";

const RESULTS_RETENTION_KEEP = 500;

function commandResultOk(result: any): boolean {
  return (result?.ok) !== false;
}

function readFileBack(fm: any, path: string): string {
  try {
    if (fm && typeof fm.getFileContents === "function") {
      return String(fm.getFileContents(path) || "");
    }
  } catch {}

  return "";
}

function verifyResultFileWritten(fm: any, path: string): void {
  if (!fm) {
    throw new Error("file manager unavailable");
  }

  if (typeof fm.fileExists === "function" && !fm.fileExists(path)) {
    throw new Error("result file not found after write: " + path);
  }

  const content = readFileBack(fm, path);

  if (content.length === 0) {
    throw new Error("result file is empty after write: " + path);
  }

  try {
    JSON.parse(content);
  } catch (error) {
    throw new Error("result file is not valid JSON after write: " + String(error));
  }
}

function clearActiveCommand(subsystems: KernelSubsystems, state: KernelState): void {
  state.activeCommand = null;
  state.activeCommandFilename = null;

  try {
    subsystems.heartbeat.setActiveCommand(null);
  } catch {}

  try {
    subsystems.heartbeat.setQueuedCount(subsystems.queue.count());
  } catch {}
}

function pruneOldResultFiles(subsystems: KernelSubsystems): void {
  const fm = safeFM().fm;
  if (!fm || typeof fm.getFilesInDirectory !== "function") return;
  if (typeof fm.removeFile !== "function") return;

  let files: string[] = [];
  try {
    files = fm.getFilesInDirectory(subsystems.config.resultsDir) || [];
  } catch {
    return;
  }

  const seen: Record<string, boolean> = {};
  const entries: Array<{ filename: string; path: string; mtime: number }> = [];

  for (const file of files) {
    const filename = String(file || "");
    if (!filename) continue;
    if (!filename.endsWith(".json")) continue;
    if (seen[filename]) continue;
    seen[filename] = true;

    const path = subsystems.config.resultsDir + "/" + filename;
    let mtime = 0;
    try {
      if (typeof fm.getFileModificationTime === "function") {
        mtime = Number(fm.getFileModificationTime(path) || 0);
      }
    } catch {
      mtime = 0;
    }

    entries.push({ filename, path, mtime });
  }

  if (entries.length <= RESULTS_RETENTION_KEEP) return;

  entries.sort((a, b) => a.mtime - b.mtime || a.filename.localeCompare(b.filename));

  const removeCount = entries.length - RESULTS_RETENTION_KEEP;
  for (let i = 0; i < removeCount; i += 1) {
    const entry = entries[i];
    if (!entry) continue;

    try {
      if (typeof fm.fileExists === "function" && !fm.fileExists(entry.path)) continue;
      fm.removeFile(entry.path);
      subsystems.kernelLogSubsystem("queue", "Pruned old result file: " + entry.filename);
    } catch (error) {
      subsystems.kernelLog(
        "RESULT PRUNE FAILED path=" + entry.path + " error=" + String(error),
        "error",
      );
    }
  }
}

export function finishActiveCommand(
  subsystems: KernelSubsystems,
  state: KernelState,
  result: any,
): void {
  if (!state.activeCommand) {
    subsystems.kernelLogSubsystem("queue", "finishActiveCommand: no active command");
    return;
  }

  const activeCommand = state.activeCommand;
  const activeFilename = state.activeCommandFilename;
  const cmdId = activeCommand.id;
  const resPath = subsystems.config.resultsDir + "/" + cmdId + ".json";

  subsystems.kernelLog(
    "<<< COMPLETING: " + cmdId + " ok=" + commandResultOk(result),
    "info",
  );

  try {
    const envelope = buildCommandResultEnvelope(activeCommand, result);
    const json = JSON.stringify(envelope);
    const fm = safeFM().fm;

    if (!fm || typeof fm.writePlainTextToFile !== "function") {
      throw new Error("file manager cannot write result files");
    }

    subsystems.kernelLogSubsystem(
      "fm",
      "Writing result to " + resPath + " bytes=" + json.length,
    );

    fm.writePlainTextToFile(resPath, json);
    verifyResultFileWritten(fm, resPath);

    subsystems.kernelLogSubsystem("fm", "Result verified OK: " + resPath);
  } catch (error) {
    subsystems.kernelLog(
      "RESULT WRITE FAILED id=" + cmdId + " path=" + resPath + " error=" + String(error),
      "error",
    );

    subsystems.kernelLogSubsystem(
      "queue",
      "Preserving command because result write/verify failed id=" +
        cmdId +
        " filename=" +
        String(activeFilename || ""),
    );

    // Nunca limpiar commands/ ni in-flight si no se verificó result file.
    // Así crash-recovery/reclaim puede recuperar o evidenciar el comando.
    clearActiveCommand(subsystems, state);
    return;
  }

  if (activeFilename) {
    try {
      subsystems.kernelLogSubsystem("queue", "Cleaning up " + activeFilename);
      subsystems.queue.cleanup(activeFilename);
      
      // OPTIMIZACIÓN: Solo reconciliar el índice si la cola parece estar vacía
      // o después de una ráfaga. Esto evita escaneos de disco redundantes.
      if (subsystems.queue.count() === 0) {
        subsystems.queue.reconcileIndex();
      }
    } catch (cleanupError) {
      // El result ya existe y fue verificado; cleanup puede fallar sin perder respuesta.
      subsystems.kernelLog(
        "RESULT CLEANUP FAILED id=" +
          cmdId +
          " filename=" +
          activeFilename +
          " error=" +
          String(cleanupError),
        "error",
      );
    }
  }

  try {
    pruneOldResultFiles(subsystems);
  } catch (error) {
    subsystems.kernelLog("RESULT PRUNE FAILED error=" + String(error), "error");
  }

  clearActiveCommand(subsystems, state);
}
