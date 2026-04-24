// ============================================================================
// Configure SVI (Switch Virtual Interface) Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { VlanId, Ipv4Address, SubnetMask, InterfaceDescription, Hostname } from '@cisco-auto/kernel/domain/ios/value-objects';
import type { CommandPlan } from "./command-plan.js";
import { CommandPlanBuilder } from "./command-plan.js";

/**
 * Input para configurar una SVI (Switch Virtual Interface) en un L3 switch.
 */
export interface ConfigureSviInput {
  vlan: VlanId;
  ip: Ipv4Address;
  mask: SubnetMask;
  description?: InterfaceDescription | string;
  enableRouting?: boolean;
  hostname?: Hostname | string;
}

/**
 * Planifica los comandos IOS para configurar una SVI (interfaz VLAN).
 * Solo para switches L3 que soportan SVI y routing IP.
 * @param caps - CapabilitySet del dispositivo
 * @param input - Configuración de la SVI
 * @returns CommandPlan listo para ejecutar, o null si no soporta SVIs
 */
export function planConfigureSvi(
  caps: CapabilitySet,
  input: ConfigureSviInput
): CommandPlan | null {
  if (!caps.routing.svi) {
    return null;
  }

  const { vlan, ip, mask, description, enableRouting, hostname } = input;

  const builder = new CommandPlanBuilder()
    .operation("configure-svi")
    .target(`Vlan${vlan.value}`);

  // Enable IP routing BEFORE entering interface (global command)
  if (enableRouting !== false && caps.routing.ipRouting) {
    builder.config(
      "ip routing",
      "Enable IP routing",
      "no ip routing"
    );
  }

  // Set hostname if provided (global command)
  if (hostname) {
    const hostnameValue = hostname instanceof Hostname ? hostname.value : hostname;
    builder.config(`hostname ${hostnameValue}`, "Set device hostname");
  }

  builder
    .config(`interface Vlan${vlan.value}`, `Create SVI for VLAN ${vlan.value}`)
    .config(`ip address ${ip.value} ${mask.value}`, `Assign IP ${ip.value}/${mask.cidr}`);

  if (description) {
    const descValue = description instanceof InterfaceDescription ? description.value : description;
    builder.config(`description ${descValue}`, "Set interface description");
  }

  // Enable SVI (no shutdown)
  builder.config("no shutdown", "Enable the SVI");

  return builder.build();
}
