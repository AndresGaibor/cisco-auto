// ============================================================================
// EigrpPlanner - Planificador de configuración EIGRP
// ============================================================================

import type { PlanningStep } from "./planning-step.js";

/**
 * Opciones para planificador EIGRP
 */
export interface EigrpPlanOptions {
  asn: string;
  network: string;
  wildcard: string;
  passiveInterfaceDefault?: boolean;
  authentication?: {
    type: "simple" | "message-digest";
    keyChain?: string;
  };
  autoSummary?: boolean;
  noAutoSummary?: boolean;
}

/**
 * Resultado del planificador EIGRP
 */
export interface EigrpPlannerResult {
  device: string;
  steps: PlanningStep[];
  verificationSteps: PlanningStep[];
  rollbackSteps: PlanningStep[];
}

/**
 * Planificar habilitación de EIGRP en un dispositivo
 */
export function planEigrpEnable(
  device: string,
  options: EigrpPlanOptions,
): EigrpPlannerResult {
  const steps: PlanningStep[] = [
    { device, command: "conf t", expectMode: "global-config" },
    { device, command: `router eigrp ${options.asn}`, expectMode: "config-router" },
    {
      device,
      command: `network ${options.network} ${options.wildcard}`,
      expectMode: "config-router",
    },
  ];

  if (options.noAutoSummary) {
    steps.push({
      device,
      command: "no auto-summary",
      expectMode: "config-router",
    });
  } else if (options.autoSummary) {
    steps.push({
      device,
      command: "auto-summary",
      expectMode: "config-router",
    });
  }

  if (options.passiveInterfaceDefault) {
    steps.push({
      device,
      command: "passive-interface default",
      expectMode: "config-router",
    });
  }

  if (options.authentication?.type === "message-digest" && options.authentication.keyChain) {
    steps.push({
      device,
      command: `authentication key-chain eigrp ${options.asn} ${options.authentication.keyChain}`,
      expectMode: "config-router",
    });
  }

  steps.push({ device, command: "end", expectMode: "privileged-exec" });

  const verificationSteps: PlanningStep[] = [
    { device, command: `show ip eigrp neighbors`, expectMode: "privileged-exec" },
    { device, command: `show ip eigrp topology`, expectMode: "privileged-exec" },
    { device, command: `show ip eigrp interfaces`, expectMode: "privileged-exec" },
  ];

  const rollbackSteps: PlanningStep[] = [
    { device, command: "conf t" },
    { device, command: `no router eigrp ${options.asn}` },
    { device, command: "end" },
  ];

  return { device, steps, verificationSteps, rollbackSteps };
}

/**
 * Planificar interfaz pasiva EIGRP
 */
export function planEigrpPassiveInterface(
  device: string,
  asn: string,
  interfaceName: string,
  passive: boolean,
): PlanningStep[] {
  const cmd = passive
    ? `passive-interface ${interfaceName}`
    : `no passive-interface ${interfaceName}`;

  return [
    { device, command: "conf t", expectMode: "global-config" },
    { device, command: `router eigrp ${asn}`, expectMode: "config-router" },
    { device, command: cmd, expectMode: "config-router" },
    { device, command: "end", expectMode: "privileged-exec" },
  ];
}

/**
 * Planificar redistribution en EIGRP
 */
export function planEigrpRedistribution(
  device: string,
  asn: string,
  protocol: "ospf" | "static" | "connected",
  options?: { match?: string; routeMap?: string },
): PlanningStep[] {
  const steps: PlanningStep[] = [
    { device, command: "conf t", expectMode: "global-config" },
    { device, command: `router eigrp ${asn}`, expectMode: "config-router" },
  ];

  let redistCmd = `redistribute ${protocol}`;
  if (options?.routeMap) {
    redistCmd += ` route-map ${options.routeMap}`;
  }
  steps.push({ device, command: redistCmd, expectMode: "config-router" });

  if (options?.match) {
    steps.push({
      device,
      command: `redistribute ${protocol} match ${options.match}`,
      expectMode: "config-router",
    });
  }

  steps.push({ device, command: "end", expectMode: "privileged-exec" });

  return steps;
}