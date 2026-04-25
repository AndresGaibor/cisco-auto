// ============================================================================
// Configure DHCP Pool Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { Ipv4Address, SubnetMask } from '@cisco-auto/ios-primitives/value-objects';
import type { CommandPlan } from "./command-plan.js";
import { CommandPlanBuilder } from "./command-plan.js";

/**
 * Input para configurar un pool DHCP en un router.
 */
export interface ConfigureDhcpPoolInput {
  poolName: string;
  network: Ipv4Address;
  mask: SubnetMask;
  defaultRouter: Ipv4Address;
  dnsServer?: Ipv4Address;
  lease?: { days: number; hours: number };
}

/**
 * Planifica los comandos IOS para configurar un pool DHCP.
 * Incluye network, default-router, dns-server opcional y lease.
 * @param caps - CapabilitySet del dispositivo
 * @param input - Configuración del pool DHCP
 * @returns CommandPlan listo para ejecutar, o null si no soporta DHCP
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
