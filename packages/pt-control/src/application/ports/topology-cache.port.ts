// ============================================================================
// TopologyCache Port - Interface for topology state caching
// ============================================================================
// This port defines the contract for caching Packet Tracer topology state.

import type { TopologySnapshot, DeviceState, LinkState } from "../../contracts/index.js";

/**
 * TopologyCache Port - Abstraction for PT topology caching
 *
 * This port allows application services to access cached topology
 * without depending on concrete infrastructure implementations.
 */
export interface TopologyCachePort {
  /**
   * Get current cached snapshot
   */
  getSnapshot(): TopologySnapshot;

  /**
   * Apply a snapshot to the cache
   */
  applySnapshot(snapshot: TopologySnapshot): void;

  /**
   * Get a specific device by name
   */
  getDevice(name: string): DeviceState | undefined;

  /**
   * Get all devices
   */
  getDevices(): DeviceState[];

  /**
   * Get all links
   */
  getLinks(): LinkState[];

  /**
   * Get device names
   */
  getDeviceNames(): string[];

  /**
   * Get devices connected to a specific device
   */
  getConnectedDevices(deviceName: string): string[];

  /**
   * Find a link between two devices
   */
  findLinkBetween(device1: string, device2: string): LinkState | undefined;
}
