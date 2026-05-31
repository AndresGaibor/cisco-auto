import type { AppCloseOptions, AppOpenOptions, AppStatus, AppTrackOptions, AppWaitOptions } from "./app-types.js";
import type { PacketTracerPathResolver } from "./packet-tracer-path-resolver.js";
import type { PacketTracerProcessService } from "./packet-tracer-process-service.js";
import type { ProjectService } from "../project/project-service.js";
import type { AutosaveService } from "../project/autosave-service.js";
import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type { TrackService } from "./track-service.js";

export class PacketTracerAppService {
  constructor(
    private readonly pathResolver: PacketTracerPathResolver,
    private readonly processService: PacketTracerProcessService,
    private readonly projectService: ProjectService,
    private readonly autosaveService: AutosaveService,
    private readonly bridge: FileBridgePort,
    private readonly trackService?: TrackService,
  ) {}

  async paths() {
    return this.pathResolver.resolve();
  }

  async status(options: { live?: boolean; timeoutMs?: number } = {}): Promise<AppStatus> {
    const resolved = this.pathResolver.resolve();
    const running = await this.processService.isRunning("Cisco Packet Tracer");

    const heartbeat = this.bridge.getHeartbeat();
    const heartbeatHealth = this.bridge.getHeartbeatHealth();

    const projectStatus = await this.projectService.status().catch(() => ({ ok: false, activeFile: null, savedFilename: "", isSavedToDisk: false, isActivityFile: null, defaultSaveLocation: "", tempFileLocation: "", deviceCount: null, linkCount: null }));

    return {
      process: {
        level: running ? "running" : "stopped",
        pid: null,
        pidFile: null,
        lastHeartbeat: heartbeatHealth.lastSeenTs ? new Date(heartbeatHealth.lastSeenTs).toISOString() : null,
        lastStatus: heartbeatHealth.state ?? "unknown",
      },
      runtime: {
        loaded: Boolean(heartbeat),
        mainJs: null,
        mainJsExists: false,
        runtimeJs: null,
        runtimeJsExists: false,
      },
      project: {
        hasActiveFile: Boolean(projectStatus.activeFile),
        activeFile: projectStatus.activeFile,
      },
    };
  }

  async open(path?: string, options: AppOpenOptions = {}): Promise<{ ok: boolean; error?: string }> {
    const resolved = this.pathResolver.resolve();
    if (!resolved.selected) {
      return { ok: false, error: "Packet Tracer no encontrado" };
    }

    if (!path && !options.clean) {
      const status = await this.projectService.status().catch(() => null);
      path = status?.activeFile || this.trackService?.read() || undefined;
      if (!path) {
        return { ok: false, error: "No hay taller previo. Usa --clean para abrir PT vacío o pasa una ruta." };
      }
    }

    if (options.closeExisting) {
      await this.processService.closeGraceful("Cisco Packet Tracer").catch(() => {});
    }

    if (options.saveExisting || options.autosaveExisting) {
      if (options.saveExisting) {
        await this.projectService.save().catch(() => {});
      }
      if (options.autosaveExisting) {
        await this.autosaveService.createAutosave({ keep: 20 }).catch(() => {});
      }
    }

    await this.processService.launch(resolved.selected, path);

    if (path && !options.clean) {
      this.trackService?.write(path);
    }

    if (options.wait) {
      const timeout = options.waitTimeoutMs ?? 60_000;
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        const running = await this.processService.isRunning("Cisco Packet Tracer");
        if (running) {
          const hb = this.bridge.getHeartbeatHealth();
          if (hb.state === "ok") {
            return { ok: true };
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      return { ok: false, error: "Timeout esperando runtime" };
    }

    return { ok: true };
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }

  async close(options: AppCloseOptions = {}): Promise<{ ok: boolean; error?: string }> {
    if (options.save || options.autosave) {
      if (options.save) {
        const result = await this.withTimeout(this.projectService.save(), 15_000, "project.save").catch(() => null);
        if (result?.activeFile) {
          this.trackService?.write(result.activeFile);
        }
      }
      if (options.autosave) {
        await this.withTimeout(this.autosaveService.createAutosave({ keep: 20 }), 15_000, "autosave").catch(() => {});
      }
    }

    if (options.force) {
      await this.processService.closeForce("Cisco Packet Tracer", options.timeoutMs ?? 15_000);
      return { ok: true };
    }

    const gracefulResult = await this.processService.closeGraceful("Cisco Packet Tracer", 15_000);
    if (!gracefulResult.ok) {
      return { ok: false, error: "No se pudo cerrar Packet Tracer graceful" };
    }

    if (options.timeoutMs) {
      const deadline = Date.now() + options.timeoutMs;
      while (Date.now() < deadline) {
        const running = await this.processService.isRunning("Cisco Packet Tracer");
        if (!running) return { ok: true };
        await new Promise((r) => setTimeout(r, 500));
      }
      return { ok: false, error: "Timeout esperando cierre" };
    }

    return { ok: true };
  }

  async track(options: AppTrackOptions = {}): Promise<{ ok: boolean; activeFile?: string; error?: string }> {
    const status = await this.projectService.status().catch(() => null);
    if (!status?.activeFile) {
      return { ok: false, error: "No hay proyecto activo en Packet Tracer" };
    }
    this.trackService?.write(status.activeFile);
    return { ok: true, activeFile: status.activeFile };
  }

  async wait(options: AppWaitOptions = {}): Promise<{ ok: boolean; error?: string }> {
    const timeout = options.timeoutMs ?? 60_000;
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      if (options.runtime) {
        const hb = this.bridge.getHeartbeatHealth();
        if (hb.state === "ok") {
          return { ok: true };
        }
      }
      if (options.activeFile) {
        const status = await this.projectService.status().catch(() => null);
        const normActual = (status?.activeFile ?? "").replace(/\\/g, "/").replace(/\/+/g, "/").toLowerCase();
        const normExpected = options.activeFile.replace(/\\/g, "/").replace(/\/+/g, "/").toLowerCase();
        if (normActual === normExpected) {
          return { ok: true };
        }
      }
      await new Promise((r) => setTimeout(r, 1000));
    }

    return { ok: false, error: "Timeout en wait" };
  }
}