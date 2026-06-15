// packages/pt-runtime/src/pt/kernel/poller/control-commands.ts
// Handlers de comandos de control del kernel

import { finishActiveCommand } from "../command-finalizer";
import { safeFM } from "../safe-fm";
import type { KernelSubsystems } from "../kernel-lifecycle";
import type { KernelState } from "../kernel-state";

export function isControlCommand(type: string): boolean {
  return (
    type === "__pollDeferred" ||
    type === "__ping" ||
    type === "__runtimeStatus" ||
    type === "__reloadRuntime" ||
    type === "inspectDeviceFast" ||
    type === "readTerminal" ||
    type === "omni.evaluate.raw" ||
    type === "__evaluate"
  );
}

export function getControlCommandTypes(): string[] {
  return [
    "__pollDeferred",
    "__ping",
    "__runtimeStatus",
    "__reloadRuntime",
    "inspectDeviceFast",
    "readTerminal",
    "omni.evaluate.raw",
    "__evaluate",
  ].filter(isControlCommand);
}

export function readRuntimeManifest(config: any): unknown {
  try {
    const s = safeFM();
    const fm = s.fm;
    const manifestPath = String(config.devDir || "") + "/manifest.json";

    if (!fm || typeof fm.fileExists !== "function" || !fm.fileExists(manifestPath)) {
      return null;
    }

    const raw = String(fm.getFileContents(manifestPath) || "");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return {
      error: String(error instanceof Error ? error.message : error),
    };
  }
}

export function handleKernelControlCommand(subsystems: KernelSubsystems, state: KernelState, claimed: any): boolean {
  const type = String((claimed as any).type || (claimed as any).payload?.type || "");

  if (type === "__runtimeStatus") {
    const status =
      typeof (subsystems.runtimeLoader as any).getStatus === "function"
        ? (subsystems.runtimeLoader as any).getStatus()
        : {
            runtimeLoaded: !!subsystems.runtimeLoader.getRuntimeFn(),
            lastMtime: subsystems.runtimeLoader.getLastMtime(),
            pendingReload: subsystems.runtimeLoader.hasPendingReload(),
          };

    finishActiveCommand(subsystems, state, {
      ok: true,
      type: "__runtimeStatus",
      mainLoaded: true,
      runtimeLoaded: !!status.runtimeLoaded,
      runtime: status,
      manifest: readRuntimeManifest((subsystems as any).config),
      kernel: {
        isRunning: state.isRunning,
        isShuttingDown: state.isShuttingDown,
        activeCommandFilename: state.activeCommandFilename,
        pollStats: {
          ...state.pollStats,
        },
      },
      activeCommand: state.activeCommand
        ? {
            id: state.activeCommand.id,
            type: (state.activeCommand as any).type,
            startedAt: state.activeCommand.startedAt,
          }
        : null,
    });

    return true;
  }

  if (type === "__reloadRuntime") {
    const before =
      typeof (subsystems.runtimeLoader as any).getStatus === "function"
        ? (subsystems.runtimeLoader as any).getStatus()
        : null;

    const result =
      typeof (subsystems.runtimeLoader as any).reloadNow === "function"
        ? (subsystems.runtimeLoader as any).reloadNow()
        : { ok: false, error: "runtimeLoader.reloadNow is not available" };

    const after =
      typeof (subsystems.runtimeLoader as any).getStatus === "function"
        ? (subsystems.runtimeLoader as any).getStatus()
        : null;

    finishActiveCommand(subsystems, state, {
      ok: !!result.ok,
      type: "__reloadRuntime",
      reloaded: !!result.ok,
      before,
      after,
      result,
      error: result.ok
        ? undefined
        : {
            code: "RUNTIME_RELOAD_FAILED",
            message: String(result.error || "Runtime reload failed"),
          },
    });

    return true;
  }

  return false;
}
