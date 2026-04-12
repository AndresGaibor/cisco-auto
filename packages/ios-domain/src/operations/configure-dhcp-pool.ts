// ============================================================================
// Configure DHCP Pool Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { Ipv4Address, SubnetMask } from '@cisco-auto/kernel/domain/ios/value-objects';
import type { CommandPlan } from "./command-plan.js";
import { CommandPlanBuilder } from "./command-plan.js";

/**
 * Input for configuring a DHCP pool
 */
export interface ConfigureDhcpPoolInput {
  poolName: string;          // e.g. "DHCP_POOL"
  network: Ipv4Address;      // Network address
  mask: SubnetMask;          // Subnet mask
  defaultRouter: Ipv4Address;// Default gateway
  dnsServer?: Ipv4Address;   // Optional DNS
  lease?: { days: number; hours: number }; // Optional lease
}

/**
 * Plan the commands to configure a DHCP pool
 */
export function planConfigureDhcpPool(
  caps: CapabilitySet,
  input: ConfigureDhcpPoolInput
): CommandPlan | null {
  if (!caps.routing.nat) {
    return null;
  }

  const { poolName, network, mask, defaultRouter, dnsServer, lease } = input;

  const builder = new CommandPlanBuilder()
    .operation("configure-dhcp-pool")
    .target(poolName)
    .config(`ip dhcp pool ${poolName}`, `Create DHCP pool ${poolName}`)
    .config(`network ${network.value} ${mask.value}`, `Configure network ${network.value}/${mask.cidr}`)
    .config(`default-router ${defaultRouter.value}`, `Set default gateway ${defaultRouter.value}`);

  if (dnsServer) {
    builder.config(`dns-server ${dnsServer.value}`, `Set DNS server ${dnsServer.value}`);
  }

  if (lease) {
    builder.config(
      `lease ${lease.days} ${lease.hours}`,
      `Set lease to ${lease.days} days, ${lease.hours} hours`
    );
  }

  // Exit DHCP pool configuration
  builder.step("exit", "config", "Exit DHCP pool configuration");

  return builder.build();
}
