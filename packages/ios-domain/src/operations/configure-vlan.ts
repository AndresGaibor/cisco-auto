// ============================================================================
// Configure VLAN Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { VlanId } from '@cisco-auto/kernel/domain/ios/value-objects';
import type { CommandPlan } from "./command-plan.js";
import { CommandPlanBuilder } from "./command-plan.js";

/**
 * Input para configurar una VLAN en un switch.
 */
export interface ConfigureVlanInput {
  vlan: VlanId;
  name?: string;
}

/**
 * Planifica los comandos IOS para crear y configurar una VLAN.
 * Valida que el dispositivo soporte VLANs antes de generar comandos.
 * @param caps - CapabilitySet del dispositivo
 * @param input - Configuración de la VLAN a crear
 * @returns CommandPlan listo para ejecutar, o null si el dispositivo no soporta VLANs
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
    .config(`vlan ${vlan.value}`, `Create VLAN ${vlan.value}`, `no vlan ${vlan.value}`);

  if (name) {
    builder.config(`name ${name}`, `Set VLAN name to ${name}`, "no name");
  }

  // Exit config mode
  builder.step("exit", "config", "Exit VLAN configuration");

  return builder.build();
}
