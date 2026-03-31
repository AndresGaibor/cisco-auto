// ============================================================================
// Intent Templates - Predefined Intent Patterns and Blueprints
// ============================================================================

import type { NetworkTwin, DeviceTwin } from "../contracts/twin-types.js";
import type { IntentPattern } from "./intent-parser.js";
import type { Blueprint, BlueprintStep } from "./blueprint-builder.js";
import type { CommandPlan } from "../domain/ios/operations/command-plan.js";
import { InterfaceName, VlanId, Ipv4Address, SubnetMask } from "../domain/ios/value-objects/index.js";
import { CapabilitySet } from "../domain/ios/capabilities/capability-set.js";
import {
  planConfigureAccessPort,
  type ConfigureAccessPortInput,
} from "../domain/ios/operations/configure-access-port.js";
import {
  planConfigureTrunkPort,
  type ConfigureTrunkPortInput,
} from "../domain/ios/operations/configure-trunk-port.js";
import {
  planConfigureStaticRoute,
  type ConfigureStaticRouteInput,
} from "../domain/ios/operations/configure-static-route.js";
import {
  planConfigureSvi,
  type ConfigureSviInput,
} from "../domain/ios/operations/configure-svi.js";
import {
  planConfigureVlan,
  type ConfigureVlanInput,
} from "../domain/ios/operations/configure-vlan.js";
import {
  planConfigureDhcpPool,
  type ConfigureDhcpPoolInput,
} from "../domain/ios/operations/configure-dhcp-pool.js";

// ============================================================================
// Template Types
// ============================================================================

/**
 * Function type for converting template params to a Blueprint
 */
type ToBlueprintFn = (
  params: Record<string, string>,
  twin: NetworkTwin,
  device?: DeviceTwin,
  caps?: CapabilitySet
) => Blueprint | null;

/**
 * Intent template with pattern and blueprint builder
 */
export interface IntentTemplate {
  /** Unique template identifier */
  id: string;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Human-readable description */
  description: string;
  /** The intent kind */
  kind: "configure-access-port" | "configure-trunk-port" | "configure-static-route" | "configure-svi" | "configure-vlan" | "configure-dhcp-pool";
  /** Names of captured parameters */
  paramNames: string[];
  /** Example usage */
  example: string;
  /** Function to build blueprint from params */
  toBlueprint: ToBlueprintFn;
}

// ============================================================================
// Intent Templates
// ============================================================================

/**
 * Template for configuring an access port
 */
export const ACCESS_PORT_TEMPLATE: IntentTemplate = {
  id: "tpl-access-port",
  pattern:
    /(?:configure|set|make|config(?:ure)?)\s+(?:an?\s+)?(?:access\s+)?port\s+(?:on\s+)?(?<port>\S+)(?:\s+(?:in\s+)?vlan?\s+(?<vlan>\d+))?(?:\s+description\s+["'](?<description>[^"']+)["'])?/i,
  description: "Configure an access port with VLAN assignment",
  kind: "configure-access-port",
  paramNames: ["port", "vlan", "description"],
  example: "configure access port GigabitEthernet0/1 in vlan 10 description Staff",

  toBlueprint: (params, _twin, device, caps) => {
    const { port: portStr, vlan: vlanStr, description } = params;

    if (!portStr) return null;

    try {
      const port = new InterfaceName(portStr);
      const vlan = vlanStr ? new VlanId(parseInt(vlanStr, 10)) : new VlanId(1);

      const input: ConfigureAccessPortInput = {
        port,
        vlan,
        description,
      };

      let plan: CommandPlan;
      if (caps) {
        const result = planConfigureAccessPort(caps, input);
        plan = result ?? createFallbackPlan("configure-access-port", port.value);
      } else {
        plan = createFallbackPlan("configure-access-port", port.value);
      }

      return planToBlueprint(plan, params, device);
    } catch {
      return null;
    }
  },
};

/**
 * Template for configuring a trunk port
 */
export const TRUNK_PORT_TEMPLATE: IntentTemplate = {
  id: "tpl-trunk-port",
  pattern:
    /(?:configure|set|make|config(?:ure)?)\s+(?:a\s+)?trunk\s+port\s+(?:on\s+)?(?<port>\S+)(?:\s+(?:allow(?:ing)?|native)\s+vlan[s]?\s+(?<vlans>[^\s]+))?/i,
  description: "Configure a trunk port with VLAN settings",
  kind: "configure-trunk-port",
  paramNames: ["port", "vlans"],
  example: "configure trunk port GigabitEthernet0/1 allowing vlan 10,20,30",

  toBlueprint: (params, _twin, device, caps) => {
    const { port: portStr, vlans: vlansStr } = params;

    if (!portStr) return null;

    try {
      const port = new InterfaceName(portStr);

      const input: ConfigureTrunkPortInput = {
        port,
        vlans: vlansStr ? parseVlanIds(vlansStr) : [],
      };

      let plan: CommandPlan;
      if (caps) {
        const result = planConfigureTrunkPort(caps, input);
        plan = result ?? createFallbackPlan("configure-trunk-port", port.value);
      } else {
        plan = createFallbackPlan("configure-trunk-port", port.value);
      }

      return planToBlueprint(plan, params, device);
    } catch {
      return null;
    }
  },
};

/**
 * Template for adding a static route
 */
export const STATIC_ROUTE_TEMPLATE: IntentTemplate = {
  id: "tpl-static-route",
  pattern:
    /(?:add|create|configure)\s+(?:a\s+)?static\s+route\s+(?:to\s+)?(?<network>\d+\.\d+\.\d+\.\d+)\/(?<mask>\d+)(?:\s+via\s+(?:next\s+hop\s+)?(?<nexthop>\d+\.\d+\.\d+\.\d+))?/i,
  description: "Add a static route to a destination network",
  kind: "configure-static-route",
  paramNames: ["network", "mask", "nexthop"],
  example: "add static route to 192.168.1.0/24 via 10.0.0.1",

  toBlueprint: (params, _twin, device, caps) => {
    const { network, mask, nexthop } = params;

    if (!network || !mask) return null;

    try {
      const ip = new Ipv4Address(network);
      const subnetMask = SubnetMask.fromCidr(parseInt(mask, 10));

      const input: ConfigureStaticRouteInput = {
        network: ip,
        mask: subnetMask,
        nextHop: nexthop ? new Ipv4Address(nexthop) : new Ipv4Address("0.0.0.0"),
      };

      let plan: CommandPlan;
      if (caps) {
        const result = planConfigureStaticRoute(caps, input);
        plan = result ?? createFallbackPlan("configure-static-route", `${network}/${mask}`);
      } else {
        plan = createFallbackPlan("configure-static-route", `${network}/${mask}`);
      }

      return planToBlueprint(plan, params, device);
    } catch {
      return null;
    }
  },
};

/**
 * Template for configuring an SVI (Switch Virtual Interface)
 */
export const SVI_TEMPLATE: IntentTemplate = {
  id: "tpl-svi",
  pattern:
    /(?:configure|create|set\s+up)\s+(?:an?\s+)?svi(?:\s+for\s+vlan?\s+(?<vlan>\d+))?(?:\s+ip\s+(?<ip>\d+\.\d+\.\d+\.\d+)\/(?<mask>\d+))?/i,
  description: "Configure a Switch Virtual Interface with IP address",
  kind: "configure-svi",
  paramNames: ["vlan", "ip", "mask"],
  example: "configure svi for vlan 10 ip 192.168.10.1/24",

  toBlueprint: (params, _twin, device, caps) => {
    const { vlan: vlanStr, ip, mask } = params;

    if (!vlanStr) return null;

    try {
      const vlan = new VlanId(parseInt(vlanStr, 10));

      const input: ConfigureSviInput = {
        vlan,
        ip: ip ? new Ipv4Address(ip) : new Ipv4Address("0.0.0.0"),
        mask: mask ? SubnetMask.fromCidr(parseInt(mask, 10)) : SubnetMask.fromCidr(24),
      };

      let plan: CommandPlan;
      if (caps) {
        const result = planConfigureSvi(caps, input);
        plan = result ?? createFallbackPlan("configure-svi", `Vlan${vlan.value}`);
      } else {
        plan = createFallbackPlan("configure-svi", `Vlan${vlan.value}`);
      }

      return planToBlueprint(plan, params, device);
    } catch {
      return null;
    }
  },
};

/**
 * Template for creating a VLAN
 */
export const VLAN_TEMPLATE: IntentTemplate = {
  id: "tpl-vlan",
  pattern:
    /(?:create|add|configure)\s+(?:a\s+)?vlan?\s+(?<vlan>\d+)(?:\s+(?:named?\s+)?["']?(?<name>[^"'\s]+)["']?)?/i,
  description: "Create a new VLAN with optional name",
  kind: "configure-vlan",
  paramNames: ["vlan", "name"],
  example: "create vlan 100 named Servers",

  toBlueprint: (params, _twin, device, caps) => {
    const { vlan: vlanStr, name } = params;

    if (!vlanStr) return null;

    try {
      const vlan = new VlanId(parseInt(vlanStr, 10));

      const input: ConfigureVlanInput = {
        vlan,
        name,
      };

      let plan: CommandPlan;
      if (caps) {
        const result = planConfigureVlan(caps, input);
        plan = result ?? createFallbackPlan("configure-vlan", `Vlan${vlan.value}`);
      } else {
        plan = createFallbackPlan("configure-vlan", `Vlan${vlan.value}`);
      }

      return planToBlueprint(plan, params, device);
    } catch {
      return null;
    }
  },
};

/**
 * Template for creating a DHCP pool
 */
export const DHCP_POOL_TEMPLATE: IntentTemplate = {
  id: "tpl-dhcp-pool",
  pattern:
    /(?:create|configure|add)\s+(?:a\s+)?dhcp\s+pool\s+(?:named?\s+)?["']?(?<poolname>\w+)["']?(?:\s+(?:for|network)\s+(?<network>\d+\.\d+\.\d+\.\d+)\/(?<mask>\d+))?(?:\s+(?:gateway|router)\s+(?<gateway>\d+\.\d+\.\d+\.\d+))?/i,
  description: "Create a DHCP address pool with network and gateway",
  kind: "configure-dhcp-pool",
  paramNames: ["poolname", "network", "mask", "gateway"],
  example: "create dhcp pool DHCP_POOL for 192.168.1.0/24 gateway 192.168.1.1",

  toBlueprint: (params, _twin, device, caps) => {
    const { poolname, network, mask, gateway } = params;

    if (!poolname) return null;

    try {
      const input: ConfigureDhcpPoolInput = {
        poolName: poolname,
        network: network ? new Ipv4Address(network) : new Ipv4Address("0.0.0.0"),
        mask: mask ? SubnetMask.fromCidr(parseInt(mask, 10)) : SubnetMask.fromCidr(24),
        defaultRouter: gateway ? new Ipv4Address(gateway) : new Ipv4Address("0.0.0.0"),
      };

      let plan: CommandPlan;
      if (caps) {
        const result = planConfigureDhcpPool(caps, input);
        plan = result ?? createFallbackPlan("configure-dhcp-pool", poolname);
      } else {
        plan = createFallbackPlan("configure-dhcp-pool", poolname);
      }

      return planToBlueprint(plan, params, device);
    } catch {
      return null;
    }
  },
};

/**
 * All predefined intent templates
 */
export const INTENT_TEMPLATES: IntentTemplate[] = [
  ACCESS_PORT_TEMPLATE,
  TRUNK_PORT_TEMPLATE,
  STATIC_ROUTE_TEMPLATE,
  SVI_TEMPLATE,
  VLAN_TEMPLATE,
  DHCP_POOL_TEMPLATE,
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a CommandPlan to a Blueprint
 */
function planToBlueprint(
  plan: CommandPlan,
  params: Record<string, string>,
  device?: DeviceTwin
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
    intent: {
      rawText: "",
      kind: plan.operation as "configure-access-port" | "configure-trunk-port" | "configure-static-route" | "configure-svi" | "configure-vlan" | "configure-dhcp-pool",
      patternId: "",
      params,
      confidence: 1,
      device: device?.name,
    },
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

/**
 * Create a fallback plan when capabilities are not available
 */
function createFallbackPlan(operation: string, target: string): CommandPlan {
  return {
    operation,
    target,
    steps: [],
    rollback: [],
    targetMode: "config",
    requiresPrivilege: true,
    requiresConfig: true,
  };
}

/**
 * Parse a VLAN list string and return VlanId array (e.g., "10,20,30" or "10-20")
 */
function parseVlanIds(vlansStr: string): VlanId[] {
  const vlans: VlanId[] = [];
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

/**
 * Convert templates to intent patterns (for IntentParser registration)
 */
export function templatesToPatterns(templates: IntentTemplate[]): IntentPattern[] {
  return templates.map((tpl) => ({
    id: tpl.id,
    pattern: tpl.pattern,
    description: tpl.description,
    kind: tpl.kind,
    paramNames: tpl.paramNames,
    example: tpl.example,
  }));
}
