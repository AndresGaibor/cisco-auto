// packages/pt-runtime/src/pt/kernel/heartbeat.ts
// Heartbeat writing for PT monitoring

import type { Heartbeat } from "./types";
import { safeFM } from "./safe-fm";

function isDebugEnabled(): boolean {
  try {
    const scope = (typeof self !== "undefined" ? self : Function("return this")()) as any;
    return scope.PT_DEBUG === 1 || scope.PT_DEBUG === "1" || scope.PT_DEBUG === true;
  } catch {
    return false;
  }
}

function debugLog(message: string): void {
  if (!isDebugEnabled()) return;
  try {
    dprint(message);
  } catch {}
}

export interface HeartbeatManager {
  write(): void;
  start(): void;
  stop(): void;
  setActiveCommand(id: string | null): void;
  setQueuedCount(count: number): void;
  getStatus(): { ok: boolean; lastOkTs: number; writesAttempted: number; writesFailed: number; };
}

export function createHeartbeat(config: { devDir: string; intervalMs: number }) {
  let interval: ReturnType<typeof setInterval> | null = null;
  let isRunning = false;
  let activeCommand: { id: string; seq: number; type: string; startedAt: number } | null = null;
  let activeCommandRaw: string | null = null;
  let queuedCount = 0;
  let writesAttempted = 0;
  let writesFailed = 0;
  let lastOkTs = 0;
  var loadedAt = Date.now();

  function setActiveCommand(id: string | null): void {
    debugLog("[heartbeat] setActiveCommand: " + (id || "null"));
    activeCommandRaw = id;
    activeCommand = null;
  }

  function setQueuedCount(count: number): void {
    queuedCount = count;
  }

  function getGlobalScope(): any {
    try {
      return typeof self !== "undefined" ? self : Function("return this")();
    } catch {
      return {};
    }
  }

  function tryWriteWithFallback(hbPath: string, jsonContent: string): boolean {
    var scope = getGlobalScope();

    // Intento 1: fm.writePlainTextToFile (safeFM)
    try {
      var s = safeFM();
      if (s.available && s.fm) {
        s.fm.writePlainTextToFile(hbPath, jsonContent);
        return true;
      }
    } catch (fmError) {
      debugLog("[heartbeat] fm.writePlainTextToFile falló: " + String(fmError));
    }

    // Intento 2: _ScriptModule.writeTextToFile
    try {
      if (typeof _ScriptModule !== "undefined" && _ScriptModule && typeof _ScriptModule.writeTextToFile === "function") {
        _ScriptModule.writeTextToFile(hbPath, jsonContent);
        return true;
      }
    } catch (smError) {
      debugLog("[heartbeat] _ScriptModule.writeTextToFile falló: " + String(smError));
    }

    // Intento 3: ipc.systemFileManager().writePlainTextToFile()
    try {
      if (scope.ipc && typeof scope.ipc.systemFileManager === "function") {
        var sysFm = scope.ipc.systemFileManager();
        if (sysFm && typeof sysFm.writePlainTextToFile === "function") {
          sysFm.writePlainTextToFile(hbPath, jsonContent);
          return true;
        }
      }
    } catch (ipcError) {
      debugLog("[heartbeat] ipc.systemFileManager falló: " + String(ipcError));
    }

    return false;
  }

  function write(): void {
    writesAttempted++;
    var hb: Heartbeat;
    try {
      hb = {
        ts: Date.now(),
        loadedAt: loadedAt,
        running: isRunning,
        activeCommand: activeCommand
          ? {
              id: activeCommand.id,
              seq: activeCommand.seq,
              type: activeCommand.type,
              startedAt: activeCommand.startedAt,
            }
          : activeCommandRaw
            ? { id: activeCommandRaw, seq: 0, type: "unknown", startedAt: 0 }
            : null,
        queued: queuedCount,
      };
    } catch (dataError) {
      writesFailed++;
      debugLog("[heartbeat] Error construyendo heartbeat: " + String(dataError));
      return;
    }

    var hbPath = config.devDir + "/heartbeat.json";
    var jsonContent: string;
    try {
      jsonContent = JSON.stringify(hb);
    } catch (jsonError) {
      writesFailed++;
      debugLog("[heartbeat] Error serializando heartbeat: " + String(jsonError));
      return;
    }

    var wrote = tryWriteWithFallback(hbPath, jsonContent);
    if (wrote) {
      lastOkTs = Date.now();
      debugLog("[heartbeat] WRITE OK");
    } else {
      writesFailed++;
      debugLog("[heartbeat] Todos los métodos de escritura fallaron");
    }
  }

  function start(): void {
    debugLog("[heartbeat] START interval=" + config.intervalMs + "ms");
    isRunning = true;
    write();
    interval = setInterval(function () {
      write();
    }, config.intervalMs);
  }

  function stop(): void {
    debugLog("[heartbeat] STOP");
    isRunning = false;
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  }

  function getStatus() {
    return {
      ok: writesFailed === 0 || writesAttempted > writesFailed,
      lastOkTs: lastOkTs,
      writesAttempted: writesAttempted,
      writesFailed: writesFailed,
    };
  }

  return { write, start, stop, setActiveCommand, setQueuedCount, getStatus };
}
