// packages/pt-runtime/src/pt/kernel/command-finalizer.ts
// Finaliza comandos activos: escribe resultados y limpia la cola

import type { CommandEnvelope, ResultEnvelope } from "./types";
import { safeFM } from "./safe-fm";
import type { KernelSubsystems } from "./kernel-lifecycle";
import type { KernelState } from "./kernel-state";

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
    const envelope: ResultEnvelope = {
      protocolVersion: 2,
      id: state.activeCommand.id,
      seq: state.activeCommand.seq || 0,
      startedAt: Date.now(),
      completedAt: Date.now(),
      status: result?.ok === false ? "failed" : "completed",
      ok: result?.ok !== false,
      value: result, // Siempre incluimos el resultado para no perder raw/parsed
      error:
        result?.ok === false
          ? {
              code: result?.code ?? "EXECUTION_ERROR",
              message: String(result?.error ?? "Command failed"),
              phase: "execution",
            }
          : undefined,
    };

    const resPath = subsystems.config.resultsDir + "/" + state.activeCommand.id + ".json";
    const fm = safeFM().fm;
    if (fm) {
      subsystems.kernelLogSubsystem("fm", "Writing result to " + resPath);
      fm.writePlainTextToFile(resPath, JSON.stringify(envelope));
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
