import type { AutosaveEntry } from "./project-types.js";
import type { AutosaveService } from "./autosave-service.js";
import type { ProjectService } from "./project-service.js";
import type { PacketTracerAppService } from "../app/packet-tracer-app-service.js";

export interface RecoveryResult {
  ok: boolean;
  action: "project.open" | "project.recover";
  activeFile?: string;
  recoveredFrom?: string;
  error?: string;
}

function normalizeComparablePath(path: string | null | undefined): string {
  return String(path ?? "")
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .toLowerCase();
}

export class RecoveryService {
  constructor(
    private readonly appService: PacketTracerAppService,
    private readonly projectService: ProjectService,
    private readonly autosaveService: AutosaveService,
  ) {}

  async openProject(path: string, options: { wait?: boolean; waitTimeoutMs?: number } = {}): Promise<RecoveryResult> {
    if (!path.toLowerCase().endsWith(".pkt")) {
      return { ok: false, action: "project.open", error: "Solo se soportan archivos .pkt" };
    }

    const appStatus = await this.appService.status().catch(() => null);

    if (appStatus?.runtime?.loaded) {
      const openResult = await this.projectService.open(path).catch((error) => ({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }));

      if (!openResult.ok) {
        return { ok: false, action: "project.open", error: openResult.error ?? "project.open failed" };
      }

      if (options.wait) {
        const waited = await this.appService.wait({
          activeFile: path,
          timeoutMs: options.waitTimeoutMs ?? 60_000,
        });

        if (!waited.ok) {
          const status = await this.projectService.status().catch(() => null);
          return {
            ok: false,
            action: "project.open",
            error:
              `Packet Tracer está abierto, pero no cambió al checkpoint. ` +
              `expected=${path}, activeFile=${status?.activeFile ?? "unknown"}`,
          };
        }
      }

      const status = await this.projectService.status();
      return { ok: true, action: "project.open", activeFile: status.activeFile };
    }

    const result = await this.appService.open(path, {
      wait: options.wait,
      waitTimeoutMs: options.waitTimeoutMs,
    });

    if (!result.ok) {
      return { ok: false, action: "project.open", error: result.error };
    }

    if (options.wait) {
      const waited = await this.appService.wait({
        activeFile: path,
        timeoutMs: options.waitTimeoutMs ?? 60_000,
      });

      if (!waited.ok) {
        const status = await this.projectService.status().catch(() => null);
        return {
          ok: false,
          action: "project.open",
          error:
            `Packet Tracer arrancó, pero no abrió el checkpoint. ` +
            `expected=${path}, activeFile=${status?.activeFile ?? "unknown"}`,
        };
      }
    }

    const status = await this.projectService.status();
    return { ok: true, action: "project.open", activeFile: status.activeFile };
  }

  async recoverFromLast(projectPath?: string): Promise<RecoveryResult> {
    const latest = await this.autosaveService.resolveLatestAutosave(projectPath);
    if (!latest) {
      return { ok: false, action: "project.recover", error: "No se encontró autosave para el proyecto" };
    }

    const result = await this.appService.open(latest.autosavePath, { wait: true });
    if (!result.ok) {
      return { ok: false, action: "project.recover", error: result.error };
    }

    return { ok: true, action: "project.recover", activeFile: latest.autosavePath, recoveredFrom: latest.autosavePath };
  }

  async listCheckpoints(projectPath?: string): Promise<AutosaveEntry[]> {
    return await this.autosaveService.listAutosaves(projectPath);
  }
}