/**
 * SnapshotController - Controlador especializado para snapshots de topología.
 *
 * Maneja la captura y cacheo de snapshots de la topología de red,
 * incluyendo el NetworkTwin que representa el estado completo.
 *
 * @example
 * ```typescript
 * const snapshot = new SnapshotController(snapshotService, bridgeService);
 * const currentSnapshot = await snapshot.snapshot();
 * const cached = snapshot.getCachedSnapshot();
 * ```
 */

import type { TopologySnapshot, NetworkTwin } from "../contracts/index.js";

export class SnapshotController {
  constructor(
    private readonly snapshotService: {
      snapshot(): Promise<TopologySnapshot>;
      getCachedSnapshot(): TopologySnapshot | null;
      getTwin(): NetworkTwin | null;
    },
    private readonly bridgeService: {
      loadRuntime(code: string): Promise<void>;
      loadRuntimeFromFile(filePath: string): Promise<void>;
    },
  ) {}

  async snapshot(): Promise<TopologySnapshot> {
    return this.snapshotService.snapshot();
  }

  getCachedSnapshot(): TopologySnapshot | null {
    return this.snapshotService.getCachedSnapshot();
  }

  getTwin(): NetworkTwin | null {
    return this.snapshotService.getTwin();
  }

  async loadRuntime(code: string): Promise<void> {
    return this.bridgeService.loadRuntime(code);
  }

  async loadRuntimeFromFile(filePath: string): Promise<void> {
    return this.bridgeService.loadRuntimeFromFile(filePath);
  }
}