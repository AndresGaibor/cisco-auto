// ============================================================================
// Loop Detection Rule
// ============================================================================
//
// Detects Layer 2 loops in the network topology.
// 
// A loop exists when there are multiple paths between two devices through
// switches without STP protection. This can cause broadcast storms.
//
// Detection algorithm:
// - Build adjacency graph from topology links
// - Use DFS to detect cycles
// - Report loops involving switch devices (Layer 2)
//
// Issue #9 implementation

import type { Rule } from "../rule";
import type { ValidationContext } from "../validation-context";
import type { Diagnostic } from "../diagnostic";
import { createDiagnostic } from "../diagnostic";

export interface TopologyChangeInput {
  device1?: string;
  port1?: string;
  device2?: string;
  port2?: string;
}

/**
 * Build adjacency list from topology links
 */
function buildAdjacencyList(twin: any): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  const links = twin.links || {};

  for (const link of Object.values(links)) {
    const linkAny = link as any;
    const device1 = linkAny.device1;
    const device2 = linkAny.device2;

    if (!device1 || !device2) continue;

    if (!adjacency.has(device1)) {
      adjacency.set(device1, new Set());
    }
    if (!adjacency.has(device2)) {
      adjacency.set(device2, new Set());
    }

    adjacency.get(device1)!.add(device2);
    adjacency.get(device2)!.add(device1);
  }

  return adjacency;
}

/**
 * Detect cycles using DFS
 * Returns array of cycles found (each cycle is array of device names)
 */
function detectCycles(adjacency: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const parent = new Map<string, string | null>();

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    path.push(node);

    const neighbors = adjacency.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        parent.set(neighbor, node);
        dfs(neighbor, path);
      } else if (neighbor !== parent.get(node)) {
        // Found a cycle - extract it
        const cycleStart = path.indexOf(neighbor);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor); // Close the cycle
          if (cycle.length >= 3) {
            cycles.push(cycle);
          }
        }
      }
    }

    path.pop();
  }

  // Run DFS from each unvisited node
  for (const node of adjacency.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

/**
 * Check if a device is a Layer 2 switch (prone to loops)
 */
function isLayer2Device(device: any): boolean {
  const type = device?.type?.toLowerCase() || '';
  const model = device?.model?.toLowerCase() || '';
  
  // Layer 2 switches
  if (type === 'switch' || type === 'switch_layer2') return true;
  if (model.includes('2960') || model.includes('3560')) return true;
  
  // Routers and end devices don't create L2 loops
  if (type === 'router' || type === 'pc' || type === 'server' || type === 'enddevice') {
    return false;
  }
  
  // L3 switches can participate in loops if running L2
  if (type === 'switch_layer3' || model.includes('3560') || model.includes('3750')) {
    return true; // Conservative: assume L2 mode
  }
  
  return false;
}

/**
 * Check if cycle involves Layer 2 devices (dangerous)
 */
function hasLayer2Devices(cycle: string[], twin: any): boolean {
  return cycle.some(deviceName => {
    const device = twin.devices?.[deviceName];
    return isLayer2Device(device);
  });
}

export const loopDetectionRule: Rule<TopologyChangeInput> = {
  id: "LAYER2_LOOP",
  appliesTo: ["generic"], // Applies to all mutations generically
  validate(ctx: ValidationContext<TopologyChangeInput>): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    // Build graph and detect cycles
    const adjacency = buildAdjacencyList(ctx.twin);
    const cycles = detectCycles(adjacency);

    if (cycles.length === 0) {
      return diagnostics; // No loops
    }

    // Report each loop
    for (const cycle of cycles) {
      const involvesL2 = hasLayer2Devices(cycle, ctx.twin);
      
      if (involvesL2) {
        diagnostics.push(
          createDiagnostic({
            code: "LAYER2_LOOP",
            severity: "warning",
            blocking: false,
            message: `Bucle Layer 2 detectado: ${cycle.join(" → ")}. Riesgo de broadcast storm.`,
            target: {
              device: cycle[0],
            },
            suggestedFix: "Habilita STP/RSTP en los switches o elimina enlaces redundantes",
            metadata: {
              loopDevices: cycle,
              stpRecommended: true,
            },
          })
        );
      }
    }

    // If loops exist but no STP detected, add general warning
    if (diagnostics.length > 0) {
      const hasStp = checkStpEnabled(ctx.twin);
      
      if (!hasStp) {
        diagnostics.push(
          createDiagnostic({
            code: "LOOP_NO_STP",
            severity: "error",
            blocking: false,
            message: `Se detectaron ${diagnostics.length} bucle(s) Layer 2 sin STP habilitado`,
            target: {
              device: ctx.mutation.targetDevice,
            },
            suggestedFix: "Configura 'spanning-tree mode rapid-pvst' en todos los switches",
          })
        );
      }
    }

    return diagnostics;
  },
};

/**
 * Check if STP is enabled on switches in the topology
 */
function checkStpEnabled(twin: any): boolean {
  const devices = twin.devices || {};
  
  for (const device of Object.values(devices)) {
    const deviceAny = device as any;
    if (isLayer2Device(deviceAny)) {
      // Check for STP configuration
      const config = deviceAny.config || {};
      if (config.stp || config.spanningTree) return true;
      
      // Check interfaces for portfast/bpduguard (indicates STP awareness)
      const ports = deviceAny.ports || [];
      for (const port of ports) {
        if (port.portfast || port.bpduguard || port.stpGuard) {
          return true;
        }
      }
    }
  }
  
  return false;
}
