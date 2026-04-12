// ============================================================================
// Configure Access Port Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { InterfaceName, VlanId, InterfaceDescription } from '@cisco-auto/kernel/domain/ios/value-objects';
import type { CommandPlan } from "./command-plan.js";
import { CommandPlanBuilder } from "./command-plan.js";

/**
 * Input for configuring an access port
 */
export interface ConfigureAccessPortInput {
  port: InterfaceName;
  vlan: VlanId;
  description?: InterfaceDescription | string;
  portfast?: boolean;
  bpduguard?: boolean;
}

/**
 * Plan the commands to configure an access port
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
