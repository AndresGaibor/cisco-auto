// ============================================================================
// Configure Static Route Operation
// ============================================================================

import { CapabilitySet } from "../capabilities/capability-set.js";
import { Ipv4Address, SubnetMask } from '@cisco-auto/ios-primitives/value-objects';
import type { CommandPlan } from "./command-plan.js";
import { CommandPlanBuilder } from "./command-plan.js";

/**
 * Input para configurar una ruta estática.
 */
export interface ConfigureStaticRouteInput {
  network: Ipv4Address;
  mask: SubnetMask;
  nextHop: Ipv4Address;
  distance?: number;
  description?: string;
}

/**
 * Planifica los comandos IOS para configurar una ruta estática.
 * Opcionalmente incluye distance administrativa y descripción.
 * @param caps - CapabilitySet del dispositivo
 * @param input - Configuración de la ruta estática
 * @returns CommandPlan listo para ejecutar, o null si no soporta routing
 */
export function planConfigureStaticRoute(
  caps: CapabilitySet,
  input: ConfigureStaticRouteInput
): CommandPlan | null {
  if (!caps.routing.ipRouting) {
    return null;
  }

  const { network, mask, nextHop, distance, description } = input;

  const builder = new CommandPlanBuilder()
    .operation("configure-static-route")
    .target(`${network.value}/${mask.cidr}`)
    .config(
      distance ? `ip route ${network.value} ${mask.value} ${nextHop.value} ${distance}` : `ip route ${network.value} ${mask.value} ${nextHop.value}`,
      description ?? `Static route to ${network.value}/${mask.cidr} via ${nextHop.value}`
    );

  return builder.build();
}
