/**
 * HSRP Builder - Builds HSRP (Hot Standby Router Protocol) configurations
 * Provides high-level intent for HSRP groups with full parameter support
 */

import { VlanBuilder, type SVIStandbyConfig } from "./vlan-builder.js";

export type { SVIStandbyConfig } from "./vlan-builder.js";

export interface HSRPIntent {
  device: string;
  vlanId: number;
  group: SVIStandbyConfig;
  secondary?: SVIStandbyConfig[];
}

export interface HSRPConfigResult {
  device: string;
  vlanId: number;
  commands: string[];
  errors: string[];
  warnings: string[];
}

const vlanBuilder = new VlanBuilder();

export function buildHSRPIntent(intent: HSRPIntent): HSRPConfigResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!intent.device) {
    errors.push("Device name is required");
  }

  if (intent.vlanId < 1 || intent.vlanId > 4094) {
    errors.push(`Invalid VLAN ID: ${intent.vlanId} (1-4094)`);
  }

  if (!intent.group) {
    errors.push("HSRP group configuration is required");
  }

  const sviConfig = {
    vlanId: intent.vlanId,
    ipAddress: "0.0.0.0",
    subnetMask: "0.0.0.0",
    standby: intent.group,
  };

  const validationErrors = vlanBuilder.validateSVIConfig(sviConfig);
  errors.push(...validationErrors);

  if (intent.group.priority === undefined) {
    warnings.push("No priority specified, default 100 will be used");
  }

  if (intent.group.preempt === undefined) {
    warnings.push("No preempt specified, default depends on device");
  }

  if (intent.group.authentication === undefined) {
    warnings.push("No authentication configured, recommended for production");
  }

  if (intent.group.helloInterval === undefined) {
    warnings.push("No hello interval, default 3 seconds will be used");
  }

  if (intent.group.version === undefined) {
    warnings.push("No version specified, default 1 will be used");
  }

  return {
    device: intent.device,
    vlanId: intent.vlanId,
    commands: [],
    errors,
    warnings,
  };
}

export function buildHSRPCommands(
  vlanId: number,
  ipAddress: string,
  subnetMask: string,
  standby: SVIStandbyConfig,
): string[] {
  return vlanBuilder.buildSVI({
    vlanId,
    ipAddress,
    subnetMask,
    standby,
  });
}

export const HSRP_DEFAULTS = {
  priority: 100,
  helloInterval: 3,
  holdTime: 10,
  preempt: true,
  version: 1 as const,
  authentication: "cisco",
  trackDecrement: 10,
};

export const HSRP_PRECEDENCE = {
  HIGH: 110,
  MEDIUM: 100,
  LOW: 90,
};

export interface HSRPActiveStandby {
  active: string;
  standby: string[];
  virtualIP: string;
  group: number;
}

export function parseHSRPState(
  output: string,
  group: number,
): HSRPActiveStandby | null {
  const groupMatch = output.match(
    new RegExp(`Group ${group}[\\s\\S]*?Active router is ([\\w.-]+)`),
  );
  if (!groupMatch) return null;

  const standbyMatch = output.match(/Standby router is ([\w.-]+)/);

  const vipMatch = output.match(/Virtual IP is ([\d.]+)/);

return {
    active: groupMatch[1],
    standby: standbyMatch ? [standbyMatch[1]] : [],
    virtualIP: vipMatch?.[1] ?? "",
    group,
  };
}