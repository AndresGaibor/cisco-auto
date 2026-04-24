// ============================================================================
// Configure Trunk Port Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { InterfaceName, VlanId, InterfaceDescription } from '@cisco-auto/kernel/domain/ios/value-objects';
import type { CommandPlan } from "./command-plan.js";
import { CommandPlanBuilder } from "./command-plan.js";

/**
 * Input para configurar un puerto trunk en un switch.
 */
export interface ConfigureTrunkPortInput {
  port: InterfaceName;
  vlans: VlanId[];
  nativeVlan?: VlanId;
  description?: InterfaceDescription | string;
  allowUntrusted?: boolean;
}

/**
 * Planifica los comandos IOS para configurar un puerto como trunk.
 * Configura encapsulación dot1q, modo trunk, y VLANs permitidas.
 * Valida que el dispositivo pueda ser trunk (soporta trunking).
 * @param caps - CapabilitySet del dispositivo
 * @param input - Configuración del trunk
 * @returns CommandPlan listo para ejecutar, o null si no puede ser trunk
 */
export function planConfigureTrunkPort(
  caps: CapabilitySet,
  input: ConfigureTrunkPortInput
): CommandPlan | null {
  if (!caps.canBeTrunk) {
    return null;
  }

  const { port, vlans, nativeVlan, description } = input;

  const builder = new CommandPlanBuilder()
    .operation("configure-trunk-port")
    .target(port.value)
    .enterInterface(port.value);

  // Set trunk encapsulation if supported
  if (caps.switchport.trunkEncapsulation) {
    builder.iface(
      "switchport trunk encapsulation dot1q",
      "Set trunk encapsulation to dot1q"
    );
  } else if (caps.switchport.dot1q) {
    // Some switches only support dot1q, not the command
    builder.iface("switchport trunk encapsulation dot1q", "Set trunk encapsulation");
  }

  builder
    .iface("switchport mode trunk", "Enable trunking")
    .iface(
      `switchport trunk allowed vlan ${vlans.map((v) => v.value).join(",")}`,
      `Allow VLANs ${vlans.map((v) => v.value).join(",")}`
    );

  if (nativeVlan) {
    builder.iface(
      `switchport trunk native vlan ${nativeVlan.value}`,
      `Set native VLAN to ${nativeVlan.value}`,
      "no switchport trunk native vlan"
    );
  } else {
    builder.iface(
      "switchport trunk native vlan 1",
      "Set default native VLAN to 1",
      "no switchport trunk native vlan"
    );
  }

  if (description) {
    const descValue = description instanceof InterfaceDescription ? description.value : description;
    builder.iface(`description ${descValue}`, "Set port description");
  }

  return builder.build();
}
