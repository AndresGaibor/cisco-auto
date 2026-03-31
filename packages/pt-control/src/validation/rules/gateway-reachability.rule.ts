// ============================================================================
// Gateway Reachability Rule
// ============================================================================
//
// Detects if the configured gateway is actually reachable from the device.
// 
// Improvements for Issue #8:
// - Verifies gateway IP is in the same subnet as device IP
// - Checks for Layer 2 connectivity via links
// - Validates gateway device exists in topology
// - Checks for routing paths on Layer 3 devices

import type { Rule } from "../rule";
import type { ValidationContext } from "../validation-context";
import type { Diagnostic } from "../diagnostic";
import { createDiagnostic } from "../diagnostic";

export interface IpAssignmentInput {
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
}

/**
 * Parse IP address to integer for comparison
 */
function ipToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  
  try {
    return parts.reduce((acc, part) => (acc << 8) + parseInt(part, 10), 0) >>> 0;
  } catch {
    return null;
  }
}

/**
 * Check if two IPs are in the same subnet
 */
function isInSameSubnet(ip1: string, ip2: string, mask: string): boolean {
  const int1 = ipToInt(ip1);
  const int2 = ipToInt(ip2);
  const intMask = ipToInt(mask);
  
  if (int1 === null || int2 === null || intMask === null) return false;
  
  return (int1 & intMask) === (int2 & intMask);
}

/**
 * Find device by IP in the topology
 */
function findDeviceByIp(twin: any, ip: string): { name: string; device: any } | null {
  for (const [name, device] of Object.entries(twin.devices || {})) {
    const deviceAny = device as any;
    // Check direct IP
    if (deviceAny.ip === ip) {
      return { name, device: deviceAny };
    }
    // Check interface IPs
    if (deviceAny.interfaces) {
      for (const iface of Object.values(deviceAny.interfaces)) {
        const ifaceAny = iface as any;
        if (ifaceAny.ipAddress === ip) {
          return { name, device: deviceAny };
        }
      }
    }
  }
  return null;
}

/**
 * Check if there's a path between two devices (BFS)
 */
function hasPath(twin: any, source: string, target: string): boolean {
  const links = twin.links || {};
  const visited = new Set<string>();
  const queue: string[] = [source];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === target) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    
    // Find all connected devices
    for (const link of Object.values(links)) {
      const linkAny = link as any;
      if (linkAny.device1 === current && !visited.has(linkAny.device2)) {
        queue.push(linkAny.device2);
      } else if (linkAny.device2 === current && !visited.has(linkAny.device1)) {
        queue.push(linkAny.device1);
      }
    }
  }
  
  return false;
}

export const gatewayReachabilityRule: Rule<IpAssignmentInput> = {
  id: "gateway-reachability",
  appliesTo: ["assignHostIp", "configureSvi", "configureSubinterface"],
  validate(ctx: ValidationContext<IpAssignmentInput>): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const input = ctx.mutation.input;
    const device = ctx.twin.devices[ctx.mutation.targetDevice];
    
    if (!device || !input?.gateway) return diagnostics;

    const gatewayIp = input.gateway;
    const deviceIp = input.ip;
    const deviceMask = input.mask || "255.255.255.0";

    // Check 1: Gateway must be in same subnet as device IP
    if (deviceIp && gatewayIp) {
      if (!isInSameSubnet(deviceIp, gatewayIp, deviceMask)) {
        diagnostics.push(
          createDiagnostic({
            code: "GATEWAY_WRONG_SUBNET",
            severity: "error",
            blocking: true,
            message: `Gateway ${gatewayIp} no está en la misma subred que ${deviceIp}/${deviceMask}`,
            target: {
              device: ctx.mutation.targetDevice,
            },
            suggestedFix: `Usa un gateway en el rango ${deviceIp} con máscara ${deviceMask}`,
          })
        );
        return diagnostics; // Can't reach gateway if wrong subnet
      }
    }

    // Check 2: Gateway device must exist in topology
    const gatewayDevice = findDeviceByIp(ctx.twin, gatewayIp);
    if (!gatewayDevice) {
      diagnostics.push(
        createDiagnostic({
          code: "GATEWAY_NOT_FOUND",
          severity: "warning",
          blocking: false,
          message: `No se encontró ningún dispositivo con IP ${gatewayIp} en la topología`,
          target: {
            device: ctx.mutation.targetDevice,
          },
          suggestedFix: "Verifica que el gateway esté configurado en otro dispositivo",
        })
      );
      // Continue checking - gateway might be external
    }

    // Check 3: Device must have at least one link for Layer 2 connectivity
    const deviceAny = device as any;
    const ports = deviceAny.ports || [];
    const hasLinks = ports.some((p: any) => p.link || p.status === 'up');
    
    if (!hasLinks && deviceAny.type !== 'router') {
      diagnostics.push(
        createDiagnostic({
          code: "GATEWAY_UNREACHABLE",
          severity: "warning",
          blocking: false,
          message: `Device ${ctx.mutation.targetDevice} no tiene enlaces activos. El gateway no es alcanzable.`,
          target: {
            device: ctx.mutation.targetDevice,
          },
          suggestedFix: "Conecta el dispositivo a la red mediante un enlace",
        })
      );
    }

    // Check 4: If gateway device found, verify there's a path
    if (gatewayDevice && gatewayDevice.name !== ctx.mutation.targetDevice) {
      const hasConnectivity = hasPath(ctx.twin, ctx.mutation.targetDevice, gatewayDevice.name);
      if (!hasConnectivity) {
        diagnostics.push(
          createDiagnostic({
            code: "GATEWAY_NO_PATH",
            severity: "warning",
            blocking: false,
            message: `No hay camino de red hacia el gateway ${gatewayIp}`,
            target: {
              device: ctx.mutation.targetDevice,
            },
            suggestedFix: "Verifica que haya enlaces entre dispositivos hasta el gateway",
          })
        );
      }
    }

    return diagnostics;
  },
};
