// ============================================================================
// Configure Access Port Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { InterfaceName, VlanId, InterfaceDescription } from '@cisco-auto/kernel/domain/ios/value-objects';
import type { CommandPlan } from "./command-plan.js";
import { CommandPlanBuilder } from "./command-plan.js";

/**
 * Input para configurar un puerto access en un switch.
 */
export interface ConfigureAccessPortInput {
  port: InterfaceName;
  vlan: VlanId;
  description?: InterfaceDescription | string;
  portfast?: boolean;
  bpduguard?: boolean;
}

/**
 * Planifica los comandos IOS para configurar un puerto como access.
 * Incluye switchport mode access, asignación de VLAN, PortFast y BPDU Guard.
 * Valida capabilities del dispositivo antes de generar comandos.
 * @param caps - CapabilitySet del dispositivo
 * @param input - Configuración del puerto access
 * @returns CommandPlan listo para ejecutar, o null si no soporta access mode
 */
export function planConfigureAccessPort(
  caps: CapabilitySet,
  input: ConfigureAccessPortInput
): CommandPlan | null {
  if (!caps.switchport.accessMode) {
    return null;
  }

  const { port, vlan, description, portfast = true, bpduguard = true } = input;

  const builder = new CommandPlanBuilder()
    .operation("configure-access-port")
    .target(port.value)
    .enterInterface(port.value)
    .iface("switchport mode access", "Set port to access mode")
    .iface(`switchport access vlan ${vlan.value}`, `Assign VLAN ${vlan.value}`);

  if (description) {
    const descValue = description instanceof InterfaceDescription ? description.value : description;
    builder.iface(`description ${descValue}`, "Set port description");
  }

  if (portfast && caps.switchport.portfast) {
    builder.iface(
      "spanning-tree portfast",
      "Enable PortFast for faster convergence",
      "no spanning-tree portfast"
    );
  }

  if (bpduguard && caps.switchport.bpduGuard) {
    builder.iface(
      "spanning-tree bpduguard enable",
      "Enable BPDU Guard",
      "no spanning-tree bpduguard enable"
    );
  }

  builder.iface("switchport nonegotiate", "Disable DTP negotiation", "no switchport nonegotiate");

  return builder.build();
}
