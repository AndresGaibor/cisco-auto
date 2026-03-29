// ============================================================================
// VLAN Exists Rule
// ============================================================================

import type { Rule } from "../rule";
import { createDiagnostic } from "../diagnostic";

export interface AccessPortInput {
  vlan: { value: number };
  port?: string;
  description?: string;
  portfast?: boolean;
  bpduguard?: boolean;
}

export interface TrunkPortInput {
  vlans: Array<{ value: number }>;
  nativeVlan?: { value: number };
  port?: string;
  description?: string;
}

export const vlanExistsRule: Rule<AccessPortInput | TrunkPortInput> = {
  id: "VLAN_NOT_EXISTS",
  appliesTo: ["configureAccessPort", "configureTrunkPort"],
  validate(ctx) {
    const input = ctx.mutation.input as AccessPortInput | TrunkPortInput;
    let vlanIds: number[] = [];

    if ("vlan" in input && input.vlan) {
      // configureAccessPort
      vlanIds = [input.vlan.value];
    } else if ("vlans" in input && input.vlans) {
      // configureTrunkPort
      vlanIds = input.vlans.map((v) => v.value);
      if ("nativeVlan" in input && input.nativeVlan) {
        vlanIds.push(input.nativeVlan.value);
      }
    } else {
      return [];
    }

    const targetDevice = ctx.twin.devices[ctx.mutation.targetDevice];
    if (!targetDevice) return [];

    const existingVlans = new Set<number>();
    for (const port of Object.values(targetDevice.ports)) {
      if (port.accessVlan) {
        existingVlans.add(port.accessVlan);
      }
    }

    // If no ports configured, skip validation (heuristic: VLANs might exist)
    if (existingVlans.size === 0) return [];

    const missingVlans: number[] = [];
    for (const vlanId of vlanIds) {
      if (!existingVlans.has(vlanId)) {
        missingVlans.push(vlanId);
      }
    }

    if (missingVlans.length === 0) return [];

    return [
      createDiagnostic({
        code: "VLAN_NOT_EXISTS",
        severity: "warning",
        blocking: false,
        message: `VLAN ${missingVlans.join(", ")} no está configurada en ${ctx.mutation.targetDevice}. Créala primero con 'vlan ${missingVlans[0]}'.`,
        target: {
          device: ctx.mutation.targetDevice,
          interface: ctx.mutation.targetInterface,
        },
        suggestedFix: `Ejecuta 'vlan ${missingVlans[0]}' en ${ctx.mutation.targetDevice} antes de asignar el puerto.`,
      }),
    ];
  },
};
