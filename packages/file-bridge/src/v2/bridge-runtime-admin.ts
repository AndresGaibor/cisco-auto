/**
 * Administrador de runtime y estado del FileBridge V2.
 *
 * Encapsula:
 * - loadRuntime: escribir runtime.js en el directorio del bridge
 * - loadRuntimeFromFile: cargar runtime desde un archivo
 * - readState: leer snapshot de topología
 * - heartbeat: obtener contenido del heartbeat de PT
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ensureDir, atomicWriteFile } from "../shared/fs-atomic.js";
import { BridgePathLayout } from "../shared/path-layout.js";

export class BridgeRuntimeAdmin {
  constructor(
    private readonly paths: BridgePathLayout,
    private readonly getHeartbeat: <T = unknown>() => T | null,
    private readonly getHeartbeatHealth: () => { state: "ok" | "stale" | "missing" | "unknown"; ageMs?: number; lastSeenTs?: number },
  ) {}

  async loadRuntime(code: string): Promise<void> {
    ensureDir(this.paths.root);
    atomicWriteFile(join(this.paths.root, "runtime.js"), code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    const code = readFileSync(filePath, "utf8");
    await this.loadRuntime(code);
  }

  readState<T = unknown>(): T | null {
    try {
      const content = readFileSync(this.paths.stateFile(), "utf8");
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  getHeartbeatContent<T = unknown>(): T | null {
    return this.getHeartbeat<T>();
  }

  getHeartbeatStatus(): { state: "ok" | "stale" | "missing" | "unknown"; ageMs?: number; lastSeenTs?: number } {
    return this.getHeartbeatHealth();
  }
}