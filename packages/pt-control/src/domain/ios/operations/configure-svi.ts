// ============================================================================
// Configure SVI (Switch Virtual Interface) Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { VlanId, Ipv4Address, SubnetMask } from "../value-objects/index.js";
import type { CommandPlan } from "./command-plan.js";
import { CommandPlanBuilder } from "./command-plan.js";

/**
 * Input for configuring an SVI
 */
export interface ConfigureSviInput {
  vlan: VlanId;
  ip: Ipv4Address;
  mask: SubnetMask;
  description?: string;
  enableRouting?: boolean;
}

/**
 * Plan the commands to configure an SVI (Layer 3 switch)
 */
export function planConfigureSvi(
  caps: CapabilitySet,
  input: ConfigureSviInput
): CommandPlan | null {
  if (!caps.routing.svi) {
    return null;
  }

  const { vlan, ip, mask, description, enableRouting } = input;

  const builder = new CommandPlanBuilder()
    .operation("configure-svi")
    .target(`Vlan${vlan.value}`)
    .config(`interface Vlan${vlan.value}`, `Create SVI for VLAN ${vlan.value}`)
    .config(`ip address ${ip.value} ${mask.value}`, `Assign IP ${ip.value}/${mask.cidr}`);

  if (description) {
    builder.config(`description ${description}`, "Set interface description");
  }

  // Enable IP routing if requested and supported
  if (enableRouting !== false && caps.routing.ipRouting) {
    builder.config(
      "ip routing",
      "Enable IP routing",
      "no ip routing"
    );
  }

  // Enable SVI (no shutdown)
  builder.config("no shutdown", "Enable the SVI");

  return builder.build();
}
