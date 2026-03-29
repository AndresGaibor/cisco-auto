// ============================================================================
// Configure DHCP Relay Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { InterfaceName, Ipv4Address } from "../value-objects/index.js";
import {
  CommandPlan,
  CommandPlanBuilder,
} from "./command-plan.js";

/**
 * Input for configuring DHCP relay on an interface
 */
export interface ConfigureDhcpRelayInput {
  interface: InterfaceName;
  helperAddress: Ipv4Address;
}

/**
 * Plan the commands to configure DHCP relay (ip helper-address)
 */
export function planConfigureDhcpRelay(
  caps: CapabilitySet,
  input: ConfigureDhcpRelayInput
): CommandPlan | null {
  if (!caps.routing.dhcpRelay) {
    return null;
  }

  const { interface: iface, helperAddress } = input;

  return new CommandPlanBuilder()
    .operation("configure-dhcp-relay")
    .target(iface.value)
    .enterInterface(iface.value)
    .iface(
      `ip helper-address ${helperAddress.value}`,
      `Enable DHCP relay to ${helperAddress.value}`
    )
    .build();
}
