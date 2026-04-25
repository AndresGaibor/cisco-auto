// ============================================================================
// StaticRoutePlanner - Planificador de rutas estáticas
// ============================================================================

import type { PlanningStep } from "./planning-step.js";

/**
 * Opciones para ruta estática
 */
export interface StaticRouteOptions {
  network: string;
  mask: string;
  nextHop: string;
  distance?: number;
  permanent?: boolean;
  tag?: number;
  name?: string;
}

/**
 * Resultado del planificador de ruta estática
 */
export interface StaticRoutePlannerResult {
  device: string;
  steps: PlanningStep[];
  verificationSteps: PlanningStep[];
  rollbackSteps: PlanningStep[];
}

/**
 * Planificar配置 de ruta estática IPv4
 */
export function planStaticRoute(
  device: string,
  options: StaticRouteOptions,
): StaticRoutePlannerResult {
  let cmd = `ip route ${options.network} ${options.mask} ${options.nextHop}`;

  if (options.distance !== undefined) {
    cmd += ` ${options.distance}`;
  }

  if (options.permanent) {
    cmd += ` permanent`;
  }

  if (options.tag !== undefined) {
    cmd += ` tag ${options.tag}`;
  }

  if (options.name) {
    cmd += ` name ${options.name}`;
  }

  const steps: PlanningStep[] = [
    { device, command: "conf t", expectMode: "global-config" },
    { device, command: cmd, expectMode: "global-config" },
    { device, command: "end", expectMode: "privileged-exec" },
  ];

  const verificationSteps: PlanningStep[] = [
    { device, command: `show ip route ${options.network}`, expectMode: "privileged-exec" },
    { device, command: "show ip route static", expectMode: "privileged-exec" },
  ];

  const rollbackCmd = `no ip route ${options.network} ${options.mask} ${options.nextHop}`;
  const rollbackSteps: PlanningStep[] = [
    { device, command: "conf t" },
    { device, command: rollbackCmd },
    { device, command: "end" },
  ];

  return { device, steps, verificationSteps, rollbackSteps };
}

/**
 * Planificar eliminación de ruta estática
 */
export function planDeleteStaticRoute(
  device: string,
  network: string,
  mask: string,
  nextHop: string,
): PlanningStep[] {
  return [
    { device, command: "conf t", expectMode: "global-config" },
    { device, command: `no ip route ${network} ${mask} ${nextHop}`, expectMode: "global-config" },
    { device, command: "end", expectMode: "privileged-exec" },
  ];
}

/**
 * Planificar ruta estática por interfaz (null route)
 */
export function planNullRoute(
  device: string,
  network: string,
  mask: string,
  distance?: number,
): PlanningStep[] {
  let cmd = `ip route ${network} ${mask} null0`;
  if (distance !== undefined) {
    cmd += ` ${distance}`;
  }

  return [
    { device, command: "conf t", expectMode: "global-config" },
    { device, command: cmd, expectMode: "global-config" },
    { device, command: "end", expectMode: "privileged-exec" },
  ];
}

/**
 * Planificar default route
 */
export function planDefaultRoute(
  device: string,
  nextHop: string,
  distance?: number,
): StaticRoutePlannerResult {
  return planStaticRoute(device, {
    network: "0.0.0.0",
    mask: "0.0.0.0",
    nextHop,
    distance,
  });
}