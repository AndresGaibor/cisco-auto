// ============================================================================
// Configure Subinterface Operation (Router)
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { InterfaceName, VlanId, Ipv4Address, SubnetMask } from '@cisco-auto/kernel/domain/ios/value-objects';
import type { CommandPlan } from "./command-plan.js";
import { CommandPlanBuilder } from "./command-plan.js";

/**
 * Input para configurar una subinterfaz en un router.
 */
export interface ConfigureSubinterfaceInput {
  parent: InterfaceName;
  vlan: VlanId;
  ip: Ipv4Address;
  mask: SubnetMask;
  description?: string;
}

/**
 * Planifica los comandos IOS para configurar una subinterfaz en un router.
 * Crea la subinterfaz con encapsulación dot1q y le asigna IP.
 * Solo para routers que soportan subinterfaces.
 * @param caps - CapabilitySet del dispositivo
 * @param input - Configuración de la subinterfaz
 * @returns CommandPlan listo para ejecutar, o null si no soporta subinterfaces
 */
export function planConfigureSubinterface(
  caps: CapabilitySet,
  input: ConfigureSubinterfaceInput
): CommandPlan | null {
  if (!caps.routing.subinterfaces) {
    return null;
  }

  const { parent, vlan, ip, mask, description } = input;
  const subinterfaceName = `${parent.value}.${vlan.value}`;

  const builder = new CommandPlanBuilder()
    .operation("configure-subinterface")
    .target(subinterfaceName)
    .config(`interface ${subinterfaceName}`, `Create subinterface ${subinterfaceName}`)
    .config(`encapsulation dot1q ${vlan.value}`, `Set dot1q encapsulation for VLAN ${vlan.value}`)
    .config(`ip address ${ip.value} ${mask.value}`, `Assign IP ${ip.value}/${mask.cidr}`);

  if (description) {
    builder.config(`description ${description}`, "Set subinterface description");
  }

  return builder.build();
}
