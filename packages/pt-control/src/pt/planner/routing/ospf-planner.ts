// ============================================================================
// OspfPlanner - Planificador de configuración OSPF
// ============================================================================

import type { PlanningStep } from "./planning-step.js";

/**
 * Opciones para planificador OSPF
 */
export interface OspfPlanOptions {
  processId: string;
  area: string;
  network: string;
  wildcard: string;
  passiveInterfaceDefault?: boolean;
  authentication?: {
    type: "simple" | "message-digest";
    keyChain?: string;
    key?: string;
  };
}

/**
 * Resultado del planificador OSPF
 */
export interface OspfPlannerResult {
  device: string;
  steps: PlanningStep[];
  verificationSteps: PlanningStep[];
  rollbackSteps: PlanningStep[];
}

/**
 * Planificar habilitación de OSPF en un dispositivo
 */
export function planOspfEnable(
  device: string,
  options: OspfPlanOptions,
): OspfPlannerResult {
  const steps: PlanningStep[] = [
    { device, command: "conf t", expectMode: "global-config" },
    { device, command: `router ospf ${options.processId}`, expectMode: "config-router" },
    {
      device,
      command: `network ${options.network} ${options.wildcard} area ${options.area}`,
      expectMode: "config-router",
    },
  ];

  if (options.passiveInterfaceDefault) {
    steps.push({
      device,
      command: "passive-interface default",
      expectMode: "config-router",
    });
  }

  if (options.authentication?.type === "simple") {
    steps.push({
      device,
      command: `area ${options.area} authentication`,
      expectMode: "config-router",
    });
  } else if (options.authentication?.type === "message-digest") {
    steps.push({
      device,
      command: `area ${options.area} authentication message-digest`,
      expectMode: "config-router",
    });

    if (options.authentication.keyChain) {
      steps.push({
        device,
        command: `area ${options.area} authentication key-chain ${options.authentication.keyChain}`,
        expectMode: "config-router",
      });
    }
  }

  steps.push({ device, command: "end", expectMode: "privileged-exec" });

  const verificationSteps: PlanningStep[] = [
    { device, command: `show ip ospf neighbor`, expectMode: "privileged-exec" },
    { device, command: `show ip ospf interface brief`, expectMode: "privileged-exec" },
    { device, command: `show ip ospf database`, expectMode: "privileged-exec" },
  ];

  const rollbackSteps: PlanningStep[] = [
    { device, command: "conf t" },
    { device, command: `no router ospf ${options.processId}` },
    { device, command: "end" },
  ];

  return { device, steps, verificationSteps, rollbackSteps };
}

/**
 * Planificar configuración de referencia OSPF (router-id)
 */
export function planOspfRouterId(device: string, routerId: string): PlanningStep[] {
  return [
    { device, command: "conf t", expectMode: "global-config" },
    { device, command: `router ospf ${routerId}`, expectMode: "config-router" },
    { device, command: `router-id ${routerId}`, expectMode: "config-router" },
    { device, command: "end", expectMode: "privileged-exec" },
  ];
}

/**
 * Planificar interfaz pasiva OSPF
 */
export function planOspfPassiveInterface(
  device: string,
  interfaceName: string,
  passive: boolean,
): PlanningStep[] {
  const cmd = passive
    ? `passive-interface ${interfaceName}`
    : `no passive-interface ${interfaceName}`;

  return [
    { device, command: "conf t", expectMode: "global-config" },
    { device, command: "router ospf 1", expectMode: "config-router" },
    { device, command: cmd, expectMode: "config-router" },
    { device, command: "end", expectMode: "privileged-exec" },
  ];
}