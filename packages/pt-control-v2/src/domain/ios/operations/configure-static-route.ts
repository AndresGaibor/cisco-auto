// ============================================================================
// Configure Static Route Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { Ipv4Address, SubnetMask } from "../value-objects/index.js";
import {
  CommandPlan,
  CommandPlanBuilder,
} from "./command-plan.js";

/**
 * Input for configuring a static route
 */
export interface ConfigureStaticRouteInput {
  network: Ipv4Address;
  mask: SubnetMask;
  nextHop: Ipv4Address;
  distance?: number;
  description?: string;
}

/**
 * Plan the commands to configure a static route
 */
export function planConfigureStaticRoute(
  caps: CapabilitySet,
  input: ConfigureStaticRouteInput
): CommandPlan | null {
  if (!caps.routing.ipRouting) {
    return null;
  }

  const { network, mask, nextHop, distance, description } = input;

  const builder = new CommandPlanBuilder()
    .operation("configure-static-route")
    .target(`${network.value}/${mask.cidr}`)
    .config(
      distance ? `ip route ${network.value} ${mask.value} ${nextHop.value} ${distance}` : `ip route ${network.value} ${mask.value} ${nextHop.value}`,
      description ?? `Static route to ${network.value}/${mask.cidr} via ${nextHop.value}`
    );

  return builder.build();
}
