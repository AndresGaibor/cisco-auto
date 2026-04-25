// ============================================================================
// AclPlanner - Planificador de Access Control Lists
// ============================================================================

/**
 * Paso de planificación
 */
export interface PlanningStep {
  device: string;
  command: string;
  expectMode?: string;
}

/**
 * Opciones para ACL estándar
 */
export interface StandardAclOptions {
  aclNumber: number;
  permit: { source: string; wildcard?: string }[];
  deny?: { source: string; wildcard?: string }[];
  remark?: string;
}

/**
 * Opciones para ACL extendida
 */
export interface ExtendedAclOptions {
  aclNumber: number;
  entries: {
    action: "permit" | "deny";
    protocol: string;
    source: string;
    sourceWildcard?: string;
    destination: string;
    destinationWildcard?: string;
    eq?: number;
    gt?: number;
    lt?: number;
    established?: boolean;
    log?: boolean;
  }[];
  remark?: string;
}

/**
 * Resultado del planificador ACL
 */
export interface AclPlannerResult {
  device: string;
  steps: PlanningStep[];
  verificationSteps: PlanningStep[];
  rollbackSteps: PlanningStep[];
}

/**
 * Planificar ACL estándar
 */
export function planStandardAcl(
  device: string,
  options: StandardAclOptions,
): AclPlannerResult {
  const steps: PlanningStep[] = [
    { device, command: "conf t", expectMode: "global-config" },
  ];

  if (options.remark) {
    steps.push({
      device,
      command: `access-list ${options.aclNumber} remark ${options.remark}`,
      expectMode: "global-config",
    });
  }

  for (const permit of options.permit) {
    const cmd = permit.wildcard
      ? `access-list ${options.aclNumber} permit ${permit.source} ${permit.wildcard}`
      : `access-list ${options.aclNumber} permit ${permit.source}`;
    steps.push({ device, command: cmd, expectMode: "global-config" });
  }

  if (options.deny) {
    for (const deny of options.deny) {
      const cmd = deny.wildcard
        ? `access-list ${options.aclNumber} deny ${deny.source} ${deny.wildcard}`
        : `access-list ${options.aclNumber} deny ${deny.source}`;
      steps.push({ device, command: cmd, expectMode: "global-config" });
    }
  }

  steps.push({ device, command: "end", expectMode: "privileged-exec" });

  const verificationSteps: PlanningStep[] = [
    { device, command: `show access-lists ${options.aclNumber}`, expectMode: "privileged-exec" },
  ];

  const rollbackSteps: PlanningStep[] = [
    { device, command: "conf t" },
    { device, command: `no access-list ${options.aclNumber}` },
    { device, command: "end" },
  ];

  return { device, steps, verificationSteps, rollbackSteps };
}

/**
 * Planificar ACL extendida
 */
export function planExtendedAcl(
  device: string,
  options: ExtendedAclOptions,
): AclPlannerResult {
  const steps: PlanningStep[] = [
    { device, command: "conf t", expectMode: "global-config" },
  ];

  if (options.remark) {
    steps.push({
      device,
      command: `access-list ${options.aclNumber} remark ${options.remark}`,
      expectMode: "global-config",
    });
  }

  for (const entry of options.entries) {
    let cmd = `access-list ${options.aclNumber} ${entry.action} ${entry.protocol} ${entry.source}`;

    if (entry.sourceWildcard) {
      cmd += ` ${entry.sourceWildcard}`;
    }

    cmd += ` ${entry.destination}`;

    if (entry.destinationWildcard) {
      cmd += ` ${entry.destinationWildcard}`;
    }

    if (entry.eq !== undefined) {
      cmd += ` eq ${entry.eq}`;
    }

    if (entry.gt !== undefined) {
      cmd += ` gt ${entry.gt}`;
    }

    if (entry.lt !== undefined) {
      cmd += ` lt ${entry.lt}`;
    }

    if (entry.established) {
      cmd += ` established`;
    }

    if (entry.log) {
      cmd += ` log`;
    }

    steps.push({ device, command: cmd, expectMode: "global-config" });
  }

  steps.push({ device, command: "end", expectMode: "privileged-exec" });

  const verificationSteps: PlanningStep[] = [
    { device, command: `show access-lists ${options.aclNumber}`, expectMode: "privileged-exec" },
  ];

  const rollbackSteps: PlanningStep[] = [
    { device, command: "conf t" },
    { device, command: `no access-list ${options.aclNumber}` },
    { device, command: "end" },
  ];

  return { device, steps, verificationSteps, rollbackSteps };
}

/**
 * Planificar aplicación de ACL a interfaz
 */
export function planApplyAclToInterface(
  device: string,
  aclNumber: number,
  iface: string,
  direction: "in" | "out",
): PlanningStep[] {
  return [
    { device, command: "conf t", expectMode: "global-config" },
    { device, command: `interface ${iface}`, expectMode: "config-if" },
    { device, command: `ip access-group ${aclNumber} ${direction}`, expectMode: "config-if" },
    { device, command: "end", expectMode: "privileged-exec" },
  ];
}

/**
 * Planificar eliminación de ACL de interfaz
 */
export function planRemoveAclFromInterface(
  device: string,
  aclNumber: number,
  iface: string,
  direction: "in" | "out",
): PlanningStep[] {
  return [
    { device, command: "conf t", expectMode: "global-config" },
    { device, command: `interface ${iface}`, expectMode: "config-if" },
    { device, command: `no ip access-group ${aclNumber} ${direction}`, expectMode: "config-if" },
    { device, command: "end", expectMode: "privileged-exec" },
  ];
}

/**
 * Planificar eliminación completa de ACL
 */
export function planDeleteAcl(device: string, aclNumber: number): PlanningStep[] {
  return [
    { device, command: "conf t", expectMode: "global-config" },
    { device, command: `no access-list ${aclNumber}`, expectMode: "global-config" },
    { device, command: "end", expectMode: "privileged-exec" },
  ];
}