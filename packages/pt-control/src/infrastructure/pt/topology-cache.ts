import type { PTEvent, TopologySnapshot, DeviceState, LinkState } from "../../contracts/index.js";
import { createVirtualTopology, type VirtualTopology } from "../../vdom/index.js";
import type { FileBridgePort } from "../../application/ports/file-bridge.port.js";

export interface TopologyCacheOptions {
  refreshIntervalMs?: number;
}

export class TopologyCache {
  private readonly topology: VirtualTopology;
  private readonly refreshIntervalMs: number;
  private unsubscribeBridge: (() => void) | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private started = false;

  constructor(
    private readonly bridge: FileBridgePort,
    options: TopologyCacheOptions = {}
  ) {
    this.topology = createVirtualTopology();
    this.refreshIntervalMs = options.refreshIntervalMs ?? 5000;
  }

  start(): void {
    if (this.started) return;

    this.started = true;
    this.refreshFromState();

    this.unsubscribeBridge = this.bridge.onAll((event) => this.handleEvent(event as PTEvent));
    this.refreshTimer = setInterval(() => {
      this.refreshFromState();
    }, this.refreshIntervalMs);
  }

  stop(): void {
    if (this.unsubscribeBridge) {
      this.unsubscribeBridge();
      this.unsubscribeBridge = null;
    }

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    this.started = false;
  }

  refreshFromState(): void {
    const state = this.bridge.readState<TopologySnapshot>();
    if (!state) return;

    const deviceCount = state.devices ? Object.keys(state.devices).length : 0;
    const linkCount = state.links ? Object.keys(state.links).length : 0;
    const isEmpty = deviceCount === 0 && linkCount === 0;

    if (isEmpty) {
      if (!this.topology.isMaterialized()) {
        return;
      }
    }

    this.topology.replaceSnapshot(state);
  }

  applySnapshot(snapshot: TopologySnapshot): void {
    this.topology.replaceSnapshot(snapshot);
  }

  getSnapshot(): TopologySnapshot {
    return this.topology.getSnapshot();
  }

  isMaterialized(): boolean {
    return this.topology.isMaterialized();
  }

  getDevice(name: string): DeviceState | undefined {
    return this.topology.getDevice(name);
  }

  getDevices(): DeviceState[] {
    return this.topology.getSnapshot().devices ? Object.values(this.topology.getSnapshot().devices) : [];
  }

  getLinks(): LinkState[] {
    return this.topology.getLinks();
  }

  getDeviceNames(): string[] {
    return this.topology.getDeviceNames();
  }

  getConnectedDevices(deviceName: string): string[] {
    return this.topology.getConnectedDevices(deviceName);
  }

  findLinkBetween(device1: string, device2: string): LinkState | undefined {
    return this.topology.findLinkBetween(device1, device2);
  }

  private handleEvent(event: PTEvent): void {
    switch (event.type) {
      case "device-added":
      case "device-removed":
      case "link-created":
      case "link-deleted":
        this.topology.applyEvent(event);
        break;
      case "snapshot":
        this.refreshFromState();
        break;
      case "result":
        if (event.ok && event.parsed && typeof event.parsed === "object") {
          const parsed = event.parsed as Record<string, unknown>;
          if (
            parsed.devices && typeof parsed.devices === "object" && !Array.isArray(parsed.devices) &&
            parsed.links && typeof parsed.links === "object" && !Array.isArray(parsed.links)
          ) {
            const parsedDevices = parsed.devices as Record<string, unknown>;
            const parsedLinks = parsed.links as Record<string, unknown>;
            const isEmpty = Object.keys(parsedDevices).length === 0 && Object.keys(parsedLinks).length === 0;
            if (isEmpty && !this.topology.isMaterialized()) {
              return;
            }
            this.applySnapshot(parsed as TopologySnapshot);
          }
        }
        break;
    }
  }
}
