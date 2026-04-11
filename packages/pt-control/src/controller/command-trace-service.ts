import type { FileBridgePort } from "../application/ports/file-bridge.port.js";

interface CommandTraceEntry {
  id: string;
  type: string;
  completedAt: number;
  ok?: boolean;
  ts?: number;
  status?: string;
  commandType?: string;
}

export class CommandTraceService {
  private readonly commandTrace: CommandTraceEntry[] = [];

  constructor(bridge: FileBridgePort) {
    bridge.onAll((event) => {
      const evt = event as Partial<CommandTraceEntry> & { type?: string; id?: string; ok?: boolean; ts?: number; status?: string; commandType?: string };
      if (!evt.id) return;
      if (!String(evt.type ?? "").startsWith("command-")) return;
      this.commandTrace.push({
        id: evt.id,
        type: evt.type ?? "command-event",
        completedAt: typeof evt.ts === "number" ? evt.ts : Date.now(),
        ok: typeof evt.ok === "boolean" ? evt.ok : undefined,
        ts: typeof evt.ts === "number" ? evt.ts : undefined,
        status: evt.status,
        commandType: evt.commandType,
      });
    });
  }

  drainCommandTrace(): CommandTraceEntry[] {
    return this.commandTrace.splice(0, this.commandTrace.length);
  }
}
