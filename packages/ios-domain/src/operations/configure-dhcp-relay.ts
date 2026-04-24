// ============================================================================
// Configure DHCP Relay Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { InterfaceName, Ipv4Address } from '@cisco-auto/kernel/domain/ios/value-objects';
import type { CommandPlan } from "./command-plan.js";
import { CommandPlanBuilder } from "./command-plan.js";

/**
 * Input para configurar DHCP relay en una interfaz.
 */
export interface ConfigureDhcpRelayInput {
  interface: InterfaceName;
  helperAddress: Ipv4Address;
}

/**
 * Planifica los comandos IOS para configurar DHCP relay (ip helper-address).
 * Habilita el relay DHCP en una interfaz para reenviar broadcasts DHCP.
 * @param caps - CapabilitySet del dispositivo
 * @param input - Configuración del relay
 * @returns CommandPlan listo para ejecutar, o null si no soporta DHCP relay
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
