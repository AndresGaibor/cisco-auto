// packages/pt-runtime/src/pt/kernel/command-finalizer.ts
// Finaliza comandos activos: escribe resultados y limpia la cola

import type { CommandEnvelope, ResultEnvelope } from "./types";
import { safeFM } from "./safe-fm";
import type { KernelSubsystems } from "./kernel-lifecycle";
import type { KernelState } from "./kernel-state";
import { buildCommandResultEnvelope } from "./command-result-envelope";

function verifyResultFile(resPath: string, expectedEnvelope: ResultEnvelope & { type: string }): boolean {
  const fm = safeFM().fm;

  if (!fm) return false;

  try {
    if (typeof fm.fileExists === "function" && !fm.fileExists(resPath)) {
      return false;
    }

    if (typeof fm.getFileSize === "function" && fm.getFileSize(resPath) <= 0) {
      return false;
    }

    const contents = String(fm.getFileContents(resPath) ?? "").trim();
    if (!contents) return false;

    const parsed = JSON.parse(contents) as Record<string, unknown>;

    return (
      parsed.protocolVersion === expectedEnvelope.protocolVersion &&
      String(parsed.id ?? "") === expectedEnvelope.id &&
      String(parsed.type ?? "") === expectedEnvelope.type
    );
  } catch {
    return false;
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

  const cmdId = state.activeCommand.id;
  subsystems.kernelLog("<<< COMPLETING: " + cmdId + " ok=" + (result?.ok !== false), "info");

  try {
    const envelope = buildCommandResultEnvelope(state.activeCommand, result);

    const resPath = subsystems.config.resultsDir + "/" + state.activeCommand.id + ".json";
    const fm = safeFM().fm;
    if (fm) {
      subsystems.kernelLogSubsystem("fm", "Writing result to " + resPath);
      fm.writePlainTextToFile(resPath, JSON.stringify(envelope));
      if (!verifyResultFile(resPath, envelope)) {
        subsystems.kernelLog("Result file verification failed for " + resPath, "error");
        return;
      }

      subsystems.kernelLogSubsystem("fm", "Result written OK");
      if (state.activeCommandFilename) {
        subsystems.kernelLogSubsystem("queue", "Cleaning up " + state.activeCommandFilename);
        subsystems.queue.cleanup(state.activeCommandFilename);
        subsystems.heartbeat.setQueuedCount(subsystems.queue.count());
      }
    } else {
      subsystems.kernelLog("FM unavailable, cannot write result", "error");
    }
  } catch (e) {
    subsystems.kernelLog("ERROR saving result for " + cmdId + ": " + String(e), "error");
  }

  state.activeCommand = null;
  state.activeCommandFilename = null;
  subsystems.heartbeat.setActiveCommand(null);
}
