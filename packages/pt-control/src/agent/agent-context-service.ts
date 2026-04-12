// ============================================================================
// Agent Context Service - Orchestrates context building for AI agents
// ============================================================================

import type {
  NetworkTwin,
  AgentBaseContext,
  AgentSessionState,
} from "../contracts/twin-types.js";
import type { ContextProfileName } from "./context-profiles.js";
import {
  createCache,
  getBaseContext,
  setBaseContext,
  getCachedDeviceContext,
  setDeviceContext,
  getCachedZoneContext,
  setZoneContext,
  invalidateAll,
  type ContextCache,
} from "./context-cache.js";
import {
  selectCoreDevices,
  selectAccessDevices,
  selectServerDevices,
  selectEdgeDevices,
  selectDeviceByName,
  selectActiveZone,
} from "./context-selectors.js";
import {
  renderBaseContext,
  renderCompactContext,
  renderDetailedContext,
} from "./context-renderer.js";
import {
  getDeviceContext as queryDeviceContext,
  getZoneContext as queryZoneContext,
  getDevicesInZone,
} from "./queries.js";

export { createCache } from "./context-cache.js";

export interface AgentContextServiceOptions {
  cacheTtl?: number;
  maxRecentChanges?: number;
}

export class AgentContextService {
  private cache: ContextCache;
  private cacheTtl: number;
  private maxRecentChanges: number;

  constructor(options: AgentContextServiceOptions = {}) {
    this.cache = createCache();
    this.cacheTtl = options.cacheTtl ?? 30000;
    this.maxRecentChanges = options.maxRecentChanges ?? 10;
  }

  // ==========================================================================
  // Main Context Building Methods
  // ==========================================================================

  async buildBaseContext(
    twin: NetworkTwin,
    session: AgentSessionState
  ): Promise<AgentBaseContext> {
    // Check cache first
    const cached = getBaseContext(this.cache);
    if (cached) {
      // Update selection from session
      if (session.selectedDevice || session.selectedZone) {
        return this.enrichWithSelection(cached, session);
      }
      return cached;
    }

    // Build fresh context
    const context = await this.buildBaseContextInternal(twin, session);

    // Cache it
    setBaseContext(this.cache, context, this.cacheTtl);

    return context;
  }

  async buildTaskContext(
    twin: NetworkTwin,
    session: AgentSessionState,
    task: string,
    affectedDevices: string[] = [],
    affectedZones: string[] = []
  ): Promise<AgentBaseContext> {
    const base = await this.buildBaseContext(twin, session);
    const focusDevices = Array.from(new Set([...session.focusDevices, ...affectedDevices]));
    const scope = affectedZones.length > 0 ? 'zone' : focusDevices.length > 0 ? 'device' : 'task';

    const taskContext: AgentBaseContext = {
      ...base,
      selection: {
        selectedDevice: session.selectedDevice,
        selectedZone: session.selectedZone,
        focusDevices,
      },
      task: {
        goal: task,
        scope,
        affectedDevices: focusDevices,
        affectedZones,
        suggestedCommands: this.buildSuggestedCommands(task, focusDevices, affectedZones, session),
        notes: this.buildTaskNotes(task, focusDevices, affectedZones),
      },
    };

    return taskContext;
  }

  async buildDeviceContext(
    twin: NetworkTwin,
    session: AgentSessionState,
    deviceName: string,
    includeConfig = false,
    includeRaw = false
  ): Promise<ReturnType<typeof queryDeviceContext>> {
    // Check cache for non-config contexts
    if (!includeConfig && !includeRaw) {
      const cached = getCachedDeviceContext(this.cache, deviceName);
      if (cached) return cached as ReturnType<typeof queryDeviceContext>;
    }

    const context = queryDeviceContext(twin, deviceName);
    if (!context) return null;

    // Cache without config/raw
    if (!includeConfig && !includeRaw) {
      setDeviceContext(this.cache, deviceName, context, this.cacheTtl);
    }

    return context;
  }

  async buildZoneContext(
    twin: NetworkTwin,
    session: AgentSessionState,
    zoneId: string,
    includeGeometry = false
  ): Promise<ReturnType<typeof queryZoneContext>> {
    const cached = getCachedZoneContext(this.cache, zoneId);
    if (cached && !includeGeometry) {
      return cached as ReturnType<typeof queryZoneContext>;
    }

    const context = queryZoneContext(twin, zoneId);
    if (!context) return null;

    setZoneContext(this.cache, zoneId, context, this.cacheTtl);

    return context;
  }

  // ==========================================================================
  // Full Context (for audits, exports)
  // ==========================================================================

  async buildFullContext(
    twin: NetworkTwin,
    session: AgentSessionState
  ): Promise<{
    base: AgentBaseContext;
    devices: Record<string, ReturnType<typeof queryDeviceContext>>;
    zones: Record<string, ReturnType<typeof queryZoneContext>>;
  }> {
    const base = await this.buildBaseContext(twin, session);

    const devices: Record<string, ReturnType<typeof queryDeviceContext>> = {};
    for (const deviceName of Object.keys(twin.devices)) {
      devices[deviceName] = queryDeviceContext(twin, deviceName);
    }

    const zones: Record<string, ReturnType<typeof queryZoneContext>> = {};
    for (const zoneId of Object.keys(twin.zones)) {
      zones[zoneId] = queryZoneContext(twin, zoneId);
    }

    return { base, devices, zones };
  }

  // ==========================================================================
  // Render Context to Text
  // ==========================================================================

  async renderContextForPrompt(
    twin: NetworkTwin,
    session: AgentSessionState,
    profile: ContextProfileName = "base"
  ): Promise<string> {
    const context = await this.buildContextForProfile(twin, session, profile);

    switch (session.verbosity) {
      case "compact":
        return renderCompactContext(context);
      case "detailed":
        return renderDetailedContext(context);
      default:
        return renderBaseContext(context);
    }
  }

  async buildContextForProfile(
    twin: NetworkTwin,
    session: AgentSessionState,
    profile: ContextProfileName
  ): Promise<AgentBaseContext> {
    switch (profile) {
      case "base":
        return this.buildBaseContext(twin, session);
      case "task":
        return this.buildTaskContext(twin, session, session.lastTask || "");
      case "device-deep":
        if (session.selectedDevice) {
          return this.buildDeviceContext(twin, session, session.selectedDevice) as unknown as Promise<AgentBaseContext>;
        }
        return this.buildBaseContext(twin, session);
      case "zone-deep":
        if (session.selectedZone) {
          return this.buildZoneContext(twin, session, session.selectedZone) as unknown as Promise<AgentBaseContext>;
        }
        return this.buildBaseContext(twin, session);
      default:
        return this.buildBaseContext(twin, session);
    }
  }

  // ==========================================================================
  // Cache Invalidation
  // ==========================================================================

  invalidateAll(): void {
    invalidateAll(this.cache);
  }

  invalidateDevice(deviceName: string): void {
    this.cache.deviceContexts.delete(deviceName);
  }

  invalidateZone(zoneId: string): void {
    this.cache.zoneContexts.delete(zoneId);
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private async buildBaseContextInternal(
    twin: NetworkTwin,
    session: AgentSessionState
  ): Promise<AgentBaseContext> {
    const coreDevices = selectCoreDevices(twin);
    const accessDevices = selectAccessDevices(twin);
    const serverDevices = selectServerDevices(twin);
    const edgeDevices = selectEdgeDevices(twin);

    const zones = Object.values(twin.zones).map((zone) => {
      const devices = getDevicesInZone(twin, zone.id);
      return {
        id: zone.id,
        label: zone.label,
        color: zone.style?.fillColor,
        inferredVlanId: zone.semantics?.vlanId,
        deviceCount: devices.length,
      };
    });

    const alerts = this.computeAlerts(twin);
    const recentChanges = this.computeRecentChanges(twin);

    return {
      lab: {
        name: undefined,
        deviceCount: Object.keys(twin.devices).length,
        linkCount: Object.keys(twin.links).length,
        zoneCount: Object.keys(twin.zones).length,
        lastUpdatedAt: twin.metadata?.updatedAt || Date.now(),
      },
      topology: {
        coreDevices,
        accessDevices,
        serverDevices,
        edgeDevices,
      },
      selection: {
        selectedDevice: session.selectedDevice,
        selectedZone: session.selectedZone,
        focusDevices: session.focusDevices,
      },
      zones,
      alerts,
      recentChanges,
    };
  }

  private enrichWithSelection(
    context: AgentBaseContext,
    session: AgentSessionState
  ): AgentBaseContext {
    return {
      ...context,
      selection: {
        selectedDevice: session.selectedDevice,
        selectedZone: session.selectedZone,
        focusDevices: session.focusDevices,
      },
    };
  }

  private computeAlerts(twin: NetworkTwin): string[] {
    const alerts: string[] = [];

    // Check for devices without IP that might need one
    for (const [name, device] of Object.entries(twin.devices)) {
      if (device.family === "pc" || device.family === "server") {
        const hasIp = Object.values(device.ports).some((p) => p.ipAddress);
        if (!hasIp) {
          alerts.push(`${name} no tiene IP configurada`);
        }
      }
    }

    // Check for ports that are admin up but oper down
    for (const [deviceName, device] of Object.entries(twin.devices)) {
      for (const [portName, port] of Object.entries(device.ports)) {
        if ((port.adminStatus === "up" || port.adminStatus === "administratively down") &&
            port.operStatus === "down") {
          alerts.push(`${deviceName}:${portName} está caído`);
        }
      }
    }

    return alerts.slice(0, 5); // Limit to 5 alerts
  }

  private computeRecentChanges(twin: NetworkTwin): AgentBaseContext["recentChanges"] {
    // Recent changes are derived from the twin's updatedAt timestamp.
    // A proper implementation would read from the FileBridgeV2 event log
    // (events.current.ndjson) to get command-completed events.
    // For now, report a synthetic "refresh" event if the twin was recently updated.
    const updatedAt = twin.metadata?.updatedAt;
    if (!updatedAt) return [];

    const ageMs = Date.now() - updatedAt;
    if (ageMs > 5 * 60 * 1000) return [];

    return [{ type: "refresh", target: "lab", ts: updatedAt }];
  }

  private buildSuggestedCommands(
    task: string,
    focusDevices: string[],
    affectedZones: string[],
    session: AgentSessionState,
  ): string[] {
    const suggestions: string[] = [];
    const target = session.selectedDevice ?? focusDevices[0];

    suggestions.push('pt inspect topology');

    if (target) {
      suggestions.push(`pt inspect neighbors ${target}`);
    }

    if (affectedZones.length > 0) {
      suggestions.push(`pt inspect topology --zone ${affectedZones[0]}`);
    }

    if (/verify|check|validate/i.test(task) && target) {
      suggestions.push(`pt verify ios ${target}`);
    }

    return suggestions.slice(0, 4);
  }

  private buildTaskNotes(
    task: string,
    focusDevices: string[],
    affectedZones: string[],
  ): string[] {
    const notes: string[] = [];
    notes.push(`Task scoped to ${focusDevices.length > 0 ? focusDevices.join(', ') : 'lab-wide context'}`);
    if (affectedZones.length > 0) {
      notes.push(`Zones in scope: ${affectedZones.join(', ')}`);
    }
    if (/connect|link/i.test(task)) {
      notes.push('Prefer connectivity checks before mutation.');
    }
    if (/verify|check|validate/i.test(task)) {
      notes.push('Use verification data and avoid assuming success from execution alone.');
    }
    return notes;
  }
}

// Default export for convenience
export const defaultAgentContextService = new AgentContextService();
