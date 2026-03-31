// ============================================================================
// Context Profiles
// ============================================================================

import type {
  NetworkTwin,
  DeviceTwin,
  ZoneTwin,
  AgentBaseContext,
  AgentSessionState,
} from "../contracts/twin-types.js";

export type ContextProfileName = "base" | "task" | "device-deep" | "zone-deep" | "validation" | "full";

export interface ContextProfile<T = unknown> {
  name: ContextProfileName;
  build(
    twin: NetworkTwin,
    session: AgentSessionState,
    options?: T
  ): Promise<AgentBaseContext | T>;
}

export interface TaskContextOptions {
  task: string;
  affectedDevices?: string[];
  affectedZones?: string[];
}

export interface DeviceContextOptions {
  deviceName: string;
  includeConfig?: boolean;
  includeRaw?: boolean;
}

export interface ZoneContextOptions {
  zoneId: string;
  includeGeometry?: boolean;
}

// Profile implementations are in agent-context-service.ts
