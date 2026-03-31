// ============================================================================
// VLAN Exists Rule
// ============================================================================
//
// Verifies that a VLAN exists on the target device before assigning it to a port.
// Checks both globally configured VLANs and VLANs assigned to ports.
//
// Fix for Issue #4: Previously only checked port assignments, causing false
// negatives when VLAN was created globally but not yet assigned to any port.

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

/**
 * Extract all VLAN IDs configured on a device (globally + port assignments)
 */
function getDeviceVlans(device: any): Set<number> {
  const vlans = new Set<number>();

  // Check globally configured VLANs (from device config)
  if (device.config?.vlans) {
    for (const vlanId of device.config.vlans) {
      vlans.add(vlanId);
    }
  }

  // Check VLANs assigned to ports
  if (device.ports) {
    for (const port of Object.values(device.ports)) {
      const portAny = port as any;
      if (portAny.accessVlan) {
        vlans.add(portAny.accessVlan);
      }
      if (portAny.trunkVlans) {
        for (const vlan of portAny.trunkVlans) {
          vlans.add(vlan);
        }
      }
    }
  }

  // Check SVIs (interface VLAN)
  if (device.interfaces) {
    for (const iface of Object.values(device.interfaces)) {
      const ifaceAny = iface as any;
      if (ifaceAny.name?.toLowerCase().startsWith('vlan')) {
        const vlanId = parseInt(ifaceAny.name.replace(/vlan/i, ''), 10);
        if (!isNaN(vlanId)) {
          vlans.add(vlanId);
        }
      }
    }
  }

  return vlans;
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

    // Get all VLANs configured on the device (global + port assignments)
    const existingVlans = getDeviceVlans(targetDevice);

    // If no VLANs exist at all, provide a more helpful message
    if (existingVlans.size === 0) {
      return [
        createDiagnostic({
          code: "VLAN_NOT_EXISTS",
          severity: "warning",
          blocking: false,
          message: `No hay VLANs configuradas en ${ctx.mutation.targetDevice}. Crea las VLANs necesarias primero.`,
          target: {
            device: ctx.mutation.targetDevice,
            interface: ctx.mutation.targetInterface,
          },
          suggestedFix: `Ejecuta 'vlan ${vlanIds[0]}' en ${ctx.mutation.targetDevice} para crear la VLAN.`,
        }),
      ];
    }

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
