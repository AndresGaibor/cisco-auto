import type { TopologySnapshot, NetworkTwin } from "../contracts/index.js";
import { topologySnapshotToNetworkTwin } from "../vdom/twin-adapter.js";
import { TopologyService } from "../application/services/topology-service.js";
import type { TopologyCache } from "../infrastructure/pt/topology-cache.js";

export class SnapshotService {
  private snapshotActual: TopologySnapshot | null = null;
  private twinActual: NetworkTwin | null = null;

  constructor(
    private readonly topologyService: TopologyService,
    private readonly topologyCache: TopologyCache,
  ) {}

  async snapshot(): Promise<TopologySnapshot> {
    const snapshot = await this.topologyService.snapshot();
    if (snapshot) {
      this.snapshotActual = snapshot;
      this.twinActual = topologySnapshotToNetworkTwin(snapshot);
      return snapshot;
    }

    if (this.topologyCache.isMaterialized()) {
      const cachedSnapshot = this.topologyCache.getSnapshot();
      this.snapshotActual = cachedSnapshot;
      this.twinActual = topologySnapshotToNetworkTwin(cachedSnapshot);
      return cachedSnapshot;
    }

    return this.snapshotActual ?? { timestamp: Date.now(), version: "1.0", devices: {}, links: {} };
  }

  getCachedSnapshot(): TopologySnapshot | null {
    if (this.topologyCache.isMaterialized()) {
      return this.topologyCache.getSnapshot();
    }

    return this.snapshotActual;
  }

  getTwin(): NetworkTwin | null {
    const snapshot = this.topologyCache.getSnapshot() ?? this.snapshotActual;
    if (!snapshot) return this.twinActual;
    this.twinActual = topologySnapshotToNetworkTwin(snapshot);
    return this.twinActual;
  }
}
