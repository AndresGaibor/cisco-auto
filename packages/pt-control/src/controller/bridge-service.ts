import type { FileBridgePort } from "../application/ports/file-bridge.port.js";
import type { PTEvent, PTEventType } from "../contracts/index.js";
import type { TopologyCache } from "../infrastructure/pt/topology-cache.js";

export class BridgeService {
  constructor(
    private readonly bridge: FileBridgePort,
    private readonly topologyCache: TopologyCache,
  ) {}

  start(): void {
    this.bridge.start();
    this.topologyCache.start();
  }

  async stop(): Promise<void> {
    this.topologyCache.stop();
    await this.bridge.stop();
  }

  getBridge(): FileBridgePort {
    return this.bridge;
  }

  getTopologyCache(): TopologyCache {
    return this.topologyCache;
  }

  readState<T = unknown>(): T | null {
    return this.bridge.readState<T>();
  }

  loadRuntime(code: string): Promise<void> {
    return this.bridge.loadRuntime(code);
  }

  loadRuntimeFromFile(filePath: string): Promise<void> {
    return this.bridge.loadRuntimeFromFile(filePath);
  }

  on<E extends PTEventType>(eventType: E, handler: (event: PTEvent) => void): this {
    this.bridge.on(eventType, handler);
    return this;
  }

  onAll(handler: (event: PTEvent) => void): this {
    this.bridge.onAll(handler);
    return this;
  }
}
