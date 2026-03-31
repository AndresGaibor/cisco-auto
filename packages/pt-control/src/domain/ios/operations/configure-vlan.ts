// ============================================================================
// Configure VLAN Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { VlanId } from "../value-objects/index.js";
import type { CommandPlan } from "./command-plan.js";
import { CommandPlanBuilder } from "./command-plan.js";

/**
 * Input for configuring a VLAN
 */
export interface ConfigureVlanInput {
  vlan: VlanId;        // VLAN number (1-4094)
  name?: string;       // Optional VLAN name
}

/**
 * Plan the commands to create and configure a VLAN
 */
export function planConfigureVlan(
  caps: CapabilitySet,
  input: ConfigureVlanInput
): CommandPlan | null {
  if (!caps.switching.vlan) {
    return null;
  }

  const { vlan, name } = input;

  const builder = new CommandPlanBuilder()
    .operation("configure-vlan")
    .target(`Vlan${vlan.value}`)
    .config(`vlan ${vlan.value}`, `Create VLAN ${vlan.value}`);

  if (name) {
    builder.config(`name ${name}`, `Set VLAN name to ${name}`);
  }

  // Exit config mode
  builder.step("exit", "config", "Exit VLAN configuration");

  return builder.build();
}
