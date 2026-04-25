// ============================================================================
// Blueprint Builder - Convert Parsed Intent to Configuration Blueprint
// ============================================================================

import type { NetworkTwin, DeviceTwin } from "../contracts/twin-types.js";
import type { CommandPlan } from "@cisco-auto/ios-domain";
import type { ParsedIntent, IntentKind } from "./intent-parser.js";
import { InterfaceName, VlanId, Ipv4Address, SubnetMask } from "@cisco-auto/ios-primitives/value-objects";
import { planConfigureAccessPort, type ConfigureAccessPortInput } from "@cisco-auto/ios-domain";
import { planConfigureTrunkPort, type ConfigureTrunkPortInput } from "@cisco-auto/ios-domain";
import { planConfigureStaticRoute, type ConfigureStaticRouteInput } from "@cisco-auto/ios-domain";
import { planConfigureSvi, type ConfigureSviInput } from "@cisco-auto/ios-domain";
import { planConfigureVlan, type ConfigureVlanInput } from "@cisco-auto/ios-domain";
import { planConfigureDhcpPool, type ConfigureDhcpPoolInput } from "@cisco-auto/ios-domain";
import { resolveCapabilitySet } from "@cisco-auto/ios-domain";
import type { CapabilitySet } from "@cisco-auto/ios-domain";

// ============================================================================
// Blueprint Types
// ============================================================================

/**
 * A single step in a configuration blueprint
 */
export interface BlueprintStep {
  /** Step index */
  index: number;
  /** IOS CLI command */
  command: string;
  /** Mode required for this command */
  mode: "user-exec" | "priv-exec" | "config" | "config-if" | "config-subif" | "config-line" | "config-router";
  /** Human-readable description */
  description: string;
  /** Whether this step is reversible */
  reversible: boolean;
  /** Rollback command if reversible */
  rollbackCommand?: string;
}

/**
 * Configuration blueprint generated from parsed intent
 */
export interface Blueprint {
  /** Original intent that generated this blueprint */
  intent: ParsedIntent;
  /** Human-readable operation name */
  operation: string;
  /** Target device/interface */
  target: string;
  /** Target device twin (if available) */
  targetDevice?: DeviceTwin;
  /** Steps to execute */
  steps: BlueprintStep[];
  /** Rollback steps (in execution order) */
  rollback: BlueprintStep[];
  /** Required IOS mode for execution */
  requiresMode: "user-exec" | "priv-exec" | "config";
  /** Whether privilege mode is required */
  requiresPrivilege: boolean;
  /** Warnings or notes */
  warnings: string[];
}

/**
 * Blueprint validation result
 */
export interface ValidationResult {
  /** Whether the blueprint is valid */
  valid: boolean;
  /** Errors that prevent execution */
  errors: ValidationError[];
  /** Warnings that don't prevent execution */
  warnings: ValidationWarning[];
}

/**
 * A validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  stepIndex?: number;
}

/**
 * A validation warning
 */
export interface ValidationWarning {
  code: string;
  message: string;
  stepIndex?: number;
}

// ============================================================================
// Blueprint Builder
// ============================================================================

/**
 * Builds configuration blueprints from parsed intents
 */
export class BlueprintBuilder {
  /**
   * Build a blueprint from a parsed intent and network twin context
   */
  build(intent: ParsedIntent, twin: NetworkTwin): Blueprint | null {
    if (intent.kind === "unknown") {
      return null;
    }

    // Find target device
    const device = intent.device
      ? this.findDevice(twin, intent.device)
      : undefined;

    // Resolve capabilities
    const caps: CapabilitySet | undefined = device
      ? resolveCapabilitySet(device.model)
      : undefined;

    // Build based on intent kind
    switch (intent.kind) {
      case "configure-access-port":
        return this.buildAccessPort(intent, device, caps);
      case "configure-trunk-port":
        return this.buildTrunkPort(intent, device, caps);
      case "configure-static-route":
        return this.buildStaticRoute(intent, device, caps);
      case "configure-svi":
        return this.buildSvi(intent, device, caps);
      case "configure-vlan":
        return this.buildVlan(intent, device, caps);
      case "configure-dhcp-pool":
        return this.buildDhcpPool(intent, device, caps);
      default:
        return null;
    }
  }

  /**
   * Validate a blueprint before execution
   */
  validate(blueprint: Blueprint): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for empty steps
    if (blueprint.steps.length === 0) {
      errors.push({
        code: "EMPTY_BLUEPRINT",
        message: "Blueprint has no configuration steps",
      });
    }

    // Check intent confidence
    if (blueprint.intent.confidence < 0.5) {
      warnings.push({
        code: "LOW_CONFIDENCE",
        message: `Intent confidence is low (${blueprint.intent.confidence.toFixed(2)}). Review the generated blueprint carefully.`,
      });
    }

    // Validate each step
    for (let i = 0; i < blueprint.steps.length; i++) {
      const step = blueprint.steps[i];

      // Check for empty commands
      if (!step?.command?.trim()) {
        errors.push({
          code: "EMPTY_COMMAND",
          message: `Step ${i} has an empty command`,
          stepIndex: i,
        });
        continue;
      }

      // Warn about potentially dangerous commands
      if (this.isDangerousCommand(step.command)) {
        warnings.push({
          code: "DANGEROUS_COMMAND",
          message: `Step ${i} appears to be a destructive command: ${step.command}`,
          stepIndex: i,
        });
      }
    }

    // Check target device exists
    if (!blueprint.targetDevice) {
      warnings.push({
        code: "NO_DEVICE_CONTEXT",
        message: "Target device not found in topology. Commands may fail.",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Convert blueprint to IOS command strings
   */
  toCommands(blueprint: Blueprint): string[] {
    return blueprint.steps.map((step) => step.command);
  }

  // -------------------------------------------------------------------------
  // Private Builders
  // -------------------------------------------------------------------------

  private buildAccessPort(
    intent: ParsedIntent,
    device: DeviceTwin | undefined,
    caps: CapabilitySet | undefined
  ): Blueprint | null {
    const { port: portStr, vlan: vlanStr, description } = intent.params;

    if (!portStr) {
      return null;
    }

    try {
      const port = new InterfaceName(portStr);
      const vlan = vlanStr ? new VlanId(parseInt(vlanStr, 10)) : undefined;

      const input: ConfigureAccessPortInput = {
        port,
        vlan: vlan ?? new VlanId(1),
        description,
      };

      const plan = caps ? planConfigureAccessPort(caps, input) : null;
      if (!plan) {
        return this.buildFallbackBlueprint(intent, port.value, "configure-access-port");
      }

      return this.planToBlueprint(intent, plan, device);
    } catch {
      return null;
    }
  }

  private buildTrunkPort(
    intent: ParsedIntent,
    device: DeviceTwin | undefined,
    caps: CapabilitySet | undefined
  ): Blueprint | null {
    const { port: portStr, vlans: vlansStr } = intent.params;

    if (!portStr) {
      return null;
    }

    try {
      const port = new InterfaceName(portStr);

      const input: ConfigureTrunkPortInput = {
        port,
        vlans: vlansStr ? this.parseVlanIds(vlansStr) : [],
      };

      const plan = caps ? planConfigureTrunkPort(caps, input) : null;
      if (!plan) {
        return this.buildFallbackBlueprint(intent, port.value, "configure-trunk-port");
      }

      return this.planToBlueprint(intent, plan, device);
    } catch {
      return null;
    }
  }

  private buildStaticRoute(
    intent: ParsedIntent,
    device: DeviceTwin | undefined,
    caps: CapabilitySet | undefined
  ): Blueprint | null {
    const { network, mask, nexthop } = intent.params;

    if (!network || !mask) {
      return null;
    }

    try {
      const ip = new Ipv4Address(network);
      const subnetMask = SubnetMask.fromCidr(parseInt(mask, 10));

      const input: ConfigureStaticRouteInput = {
        network: ip,
        mask: subnetMask,
        nextHop: nexthop ? new Ipv4Address(nexthop) : new Ipv4Address("0.0.0.0"),
      };

      const plan = caps ? planConfigureStaticRoute(caps, input) : null;
      if (!plan) {
        return this.buildFallbackBlueprint(intent, `${network}/${mask}`, "configure-static-route");
      }

      return this.planToBlueprint(intent, plan, device);
    } catch {
      return null;
    }
  }

  private buildSvi(
    intent: ParsedIntent,
    device: DeviceTwin | undefined,
    caps: CapabilitySet | undefined
  ): Blueprint | null {
    const { vlan: vlanStr, ip, mask } = intent.params;

    if (!vlanStr) {
      return null;
    }

    try {
      const vlan = new VlanId(parseInt(vlanStr, 10));

      const input: ConfigureSviInput = {
        vlan,
        ip: ip ? new Ipv4Address(ip) : new Ipv4Address("0.0.0.0"),
        mask: mask ? SubnetMask.fromCidr(parseInt(mask, 10)) : SubnetMask.fromCidr(24),
      };

      const plan = caps ? planConfigureSvi(caps, input) : null;
      if (!plan) {
        return this.buildFallbackBlueprint(intent, `Vlan${vlan.value}`, "configure-svi");
      }

      return this.planToBlueprint(intent, plan, device);
    } catch {
      return null;
    }
  }

  private buildVlan(
    intent: ParsedIntent,
    device: DeviceTwin | undefined,
    caps: CapabilitySet | undefined
  ): Blueprint | null {
    const { vlan: vlanStr, name } = intent.params;

    if (!vlanStr) {
      return null;
    }

    try {
      const vlan = new VlanId(parseInt(vlanStr, 10));

      const input: ConfigureVlanInput = {
        vlan,
        name,
      };

      const plan = caps ? planConfigureVlan(caps, input) : null;
      if (!plan) {
        return this.buildFallbackBlueprint(intent, `Vlan${vlan.value}`, "configure-vlan");
      }

      return this.planToBlueprint(intent, plan, device);
    } catch {
      return null;
    }
  }

  private buildDhcpPool(
    intent: ParsedIntent,
    device: DeviceTwin | undefined,
    caps: CapabilitySet | undefined
  ): Blueprint | null {
    const { poolname, network, mask, gateway } = intent.params;

    if (!poolname) {
      return null;
    }

    try {
      const input: ConfigureDhcpPoolInput = {
        poolName: poolname,
        network: network ? new Ipv4Address(network) : new Ipv4Address("0.0.0.0"),
        mask: mask ? SubnetMask.fromCidr(parseInt(mask, 10)) : SubnetMask.fromCidr(24),
        defaultRouter: gateway ? new Ipv4Address(gateway) : new Ipv4Address("0.0.0.0"),
      };

      const plan = caps ? planConfigureDhcpPool(caps, input) : null;
      if (!plan) {
        return this.buildFallbackBlueprint(intent, poolname, "configure-dhcp-pool");
      }

      return this.planToBlueprint(intent, plan, device);
    } catch {
      return null;
    }
  }

  private buildFallbackBlueprint(
    intent: ParsedIntent,
    target: string,
    operation: string
  ): Blueprint {
    return {
      intent,
      operation,
      target,
      steps: [],
      rollback: [],
      requiresMode: "config",
      requiresPrivilege: true,
      warnings: ["Using fallback blueprint - no device capabilities available"],
    };
  }

  private planToBlueprint(
    intent: ParsedIntent,
    plan: CommandPlan,
    device: DeviceTwin | undefined
  ): Blueprint {
    const steps: BlueprintStep[] = plan.steps.map((step, index) => ({
      index,
      command: step.command,
      mode: step.mode,
      description: step.description,
      reversible: index < plan.rollback.length,
      rollbackCommand: plan.rollback[index]?.command,
    }));

    const rollback: BlueprintStep[] = plan.rollback.map((step, index) => ({
      index: steps.length + index,
      command: step.command,
      mode: step.mode,
      description: `Rollback: ${step.command}`,
      reversible: false,
    }));

    return {
      intent,
      operation: plan.operation,
      target: plan.target,
      targetDevice: device,
      steps,
      rollback,
      requiresMode: plan.requiresConfig ? "config" : "priv-exec",
      requiresPrivilege: plan.requiresPrivilege,
      warnings: [],
    };
  }

  private findDevice(twin: NetworkTwin, identifier: string): DeviceTwin | undefined {
    const normalized = identifier.toLowerCase();

    // Try exact match first
    if (twin.devices[identifier]) {
      return twin.devices[identifier];
    }

    // Try by name
    for (const device of Object.values(twin.devices)) {
      if (device.name.toLowerCase() === normalized) {
        return device;
      }
    }

    // Try partial match
    for (const device of Object.values(twin.devices)) {
      if (
        device.name.toLowerCase().includes(normalized) ||
        normalized.includes(device.name.toLowerCase())
      ) {
        return device;
      }
    }

    return undefined;
  }

  private parseVlanIds(vlansStr: string): VlanId[] {
    const vlans: VlanId[] = [];

    // Handle comma-separated and range formats
    const parts = vlansStr.split(/[,\s]+/);
    for (const part of parts) {
      if (part.includes("-")) {
        const rangeParts = part.split("-");
        const start = Number(rangeParts[0]!);
        const end = Number(rangeParts[1]!);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= 4094) {
              vlans.push(new VlanId(i));
            }
          }
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= 4094) {
          vlans.push(new VlanId(num));
        }
      }
    }

    return vlans;
  }

  private isDangerousCommand(command: string): boolean {
    const dangerous = [
      /^no\s+/i,
      /^delete/i,
      /^erase/i,
      /^write\s+erase/i,
      /^reload/i,
      /^shutdown/i,
    ];
    return dangerous.some((pattern) => pattern.test(command.trim()));
  }
}
