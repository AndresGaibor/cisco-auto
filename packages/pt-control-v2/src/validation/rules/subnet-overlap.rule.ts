// ============================================================================
// Subnet Overlap Rule
// ============================================================================

import type { Rule } from "../rule";
import type { HostIpInput } from "../validation-context";
import { createDiagnostic } from "../diagnostic";

/**
 * Converts an IP address string to a 32-bit integer
 */
function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

/**
 * Gets the network address by ANDing the IP with the mask
 */
function getNetworkAddress(ip: string, mask: string): number {
  const ipNum = ipToNumber(ip);
  const maskNum = ipToNumber(mask);
  return (ipNum & maskNum) >>> 0;
}

/**
 * Checks if two subnets overlap (share the same network address)
 */
function subnetsOverlap(ip1: string, mask1: string, ip2: string, mask2: string): boolean {
  const net1 = getNetworkAddress(ip1, mask1);
  const net2 = getNetworkAddress(ip2, mask2);
  return net1 === net2;
}

export const subnetOverlapRule: Rule<HostIpInput> = {
  id: "SUBNET_OVERLAP",
  appliesTo: ["assignHostIp", "configureSvi", "configureSubinterface"],
  validate(ctx) {
    const newIp = ctx.mutation.input?.ip;
    const newMask = ctx.mutation.input?.mask;
    if (!newIp || !newMask) return [];

    const newNetwork = getNetworkAddress(newIp, newMask);
    const overlappingDevices: string[] = [];

    for (const device of Object.values(ctx.twin.devices)) {
      for (const port of Object.values(device.ports)) {
        if (!port.ipAddress || !port.subnetMask) continue;

        // Skip if this is the same port being modified
        const isSameDevice = device.name === ctx.mutation.targetDevice;
        const isSamePort = port.name === ctx.mutation.targetInterface;
        if (isSameDevice && isSamePort) continue;

        const existingNetwork = getNetworkAddress(port.ipAddress, port.subnetMask);
        if (newNetwork === existingNetwork) {
          overlappingDevices.push(`${device.name}:${port.name}`);
        }
      }
    }

    if (overlappingDevices.length === 0) return [];

    return [
      createDiagnostic({
        code: "SUBNET_OVERLAP",
        severity: "error",
        blocking: true,
        message: `IP ${newIp} crea una subred que se superpone con asignaciones existentes en ${overlappingDevices.join(", ")}.`,
        target: {
          device: ctx.mutation.targetDevice,
          interface: ctx.mutation.targetInterface,
          field: "ip",
        },
        suggestedFix: "Usa una IP que no se superponga con las subredes existentes.",
        related: overlappingDevices,
      }),
    ];
  },
};
