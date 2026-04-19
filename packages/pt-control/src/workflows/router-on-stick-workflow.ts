// Workflow para configurar router-on-a-stick con subinterfaces
// Valida inputs, ejecuta steps via terminal port, retorna evidence real

import type { RuntimeTerminalPort, TerminalPlan } from '../ports/runtime-terminal-port.js';
import type { RuntimePrimitivePort } from '../ports/runtime-primitive-port.js';

export interface SubinterfaceConfig {
  vlanId: number;
  ipAddress: string;
  subnetMask: string;
  encapsulation?: 'dot1q' | 'isl';
  nativeVlan?: number;
}

export interface RouterOnStickInput {
  router: string;
  parentInterface: string;
  subinterfaces: SubinterfaceConfig[];
}

export interface RouterOnAStickPlan {
  kind: 'workflow';
  workflowId: 'workflow.router-on-stick';
  input: RouterOnStickInput;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  description: string;
  terminal?: TerminalPlan;
  primitive?: { id: string; payload: unknown };
}

export interface WorkflowResult {
  success: boolean;
  plan: RouterOnAStickPlan;
  results: StepResult[];
  evidence: RouterOnStickEvidence;
}

export interface StepResult {
  step: string;
  ok: boolean;
  output?: string;
  error?: string;
}

export interface RouterOnStickEvidence {
  subinterfacesCreated: number;
  router: string;
  parentInterface: string;
  subinterfaces: SubinterfaceConfig[];
}

function buildTerminalPlan(device: string, commands: string[]): TerminalPlan {
  return {
    id: `router-stick-${Date.now()}`,
    device,
    steps: commands.map((command) => ({ command })),
  };
}

export async function buildRouterOnAStickPlan(input: RouterOnStickInput): Promise<RouterOnAStickPlan> {
  const steps: WorkflowStep[] = [];

  steps.push({
    description: `Habilitar routing IP en ${input.router}`,
    terminal: buildTerminalPlan(input.router, ['ip routing', 'exit']),
  });

  for (const subif of input.subinterfaces) {
    const encapsulation = subif.encapsulation ?? 'dot1q';
    const nativeVlan = subif.nativeVlan ?? subif.vlanId;

    const commands: string[] = [];

    commands.push(`interface ${input.parentInterface}.${subif.vlanId}`);

    if (encapsulation === 'dot1q') {
      commands.push(`encapsulation dot1Q ${subif.vlanId}${nativeVlan !== subif.vlanId ? ` native` : ''}`);
    } else {
      commands.push(`encapsulation ${encapsulation} ${subif.vlanId}`);
    }

    commands.push(`ip address ${subif.ipAddress} ${subif.subnetMask}`);
    commands.push('no shutdown');
    commands.push('exit');

    steps.push({
      description: `Crear subinterfaz ${input.parentInterface}.${subif.vlanId} para VLAN ${subif.vlanId}`,
      terminal: buildTerminalPlan(input.router, commands),
    });
  }

  return {
    kind: 'workflow',
    workflowId: 'workflow.router-on-stick',
    input,
    steps,
  };
}

function validateRouterOnStickInput(input: RouterOnStickInput): string[] {
  const errors: string[] = [];

  if (!input.router || input.router.length === 0) {
    errors.push('router es requerido');
  }

  if (!input.parentInterface || input.parentInterface.length === 0) {
    errors.push('parentInterface es requerido');
  }

  if (!input.subinterfaces || input.subinterfaces.length === 0) {
    errors.push('Al menos una subinterfaz es requerida');
  }

  for (const subif of input.subinterfaces) {
    if (subif.vlanId < 1 || subif.vlanId > 4094) {
      errors.push(`VLAN ID invalido en subinterfaz: ${subif.vlanId} (rango: 1-4094)`);
    }

    if (!isValidIP(subif.ipAddress)) {
      errors.push(`IP invalida en subinterfaz ${subif.vlanId}: ${subif.ipAddress}`);
    }

    if (!isValidIP(subif.subnetMask)) {
      errors.push(`Mask invalida en subinterfaz ${subif.vlanId}: ${subif.subnetMask}`);
    }
  }

  return errors;
}

function isValidIP(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num = parseInt(part, 10);
    return !isNaN(num) && num >= 0 && num <= 255;
  });
}

export async function executeRouterOnAStickWorkflow(
  input: RouterOnStickInput,
  ports: { terminalPort: RuntimeTerminalPort; primitivePort: RuntimePrimitivePort }
): Promise<WorkflowResult> {
  const errors = validateRouterOnStickInput(input);
  if (errors.length > 0) {
    return {
      success: false,
      plan: { kind: 'workflow', workflowId: 'workflow.router-on-stick', input, steps: [] },
      results: [],
      evidence: {
        subinterfacesCreated: 0,
        router: input.router,
        parentInterface: input.parentInterface,
        subinterfaces: [],
      },
    };
  }

  const plan = await buildRouterOnAStickPlan(input);
  const results: StepResult[] = [];

  for (const step of plan.steps) {
    try {
      if (step.terminal) {
        const result = await ports.terminalPort.runTerminalPlan(step.terminal, { timeoutMs: 15000 });
        results.push({
          step: step.description,
          ok: result.ok,
          output: result.output,
        });
      } else if (step.primitive) {
        const result = await ports.primitivePort.runPrimitive(step.primitive.id, step.primitive.payload);
        results.push({
          step: step.description,
          ok: result.ok,
          output: result.value as string,
          error: result.error,
        });
      }
    } catch (err) {
      results.push({
        step: step.description,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const successSteps = results.filter((r) => r.ok).length;
  const subinterfaceSteps = results.filter((r) => r.step.includes('subinterfaz'));

  return {
    success: subinterfaceSteps.length === input.subinterfaces.length,
    plan,
    results,
    evidence: {
      subinterfacesCreated: subinterfaceSteps.length,
      router: input.router,
      parentInterface: input.parentInterface,
      subinterfaces: input.subinterfaces,
    },
  };
}

export async function routerOnAStickCleanup(
  input: RouterOnStickInput,
  ports: { terminalPort: RuntimeTerminalPort; primitivePort: RuntimePrimitivePort }
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const commands: string[] = [];
    for (const subif of input.subinterfaces) {
      commands.push(`no interface ${input.parentInterface}.${subif.vlanId}`);
    }

    const plan = buildTerminalPlan(input.router, commands);
    const result = await ports.terminalPort.runTerminalPlan(plan, { timeoutMs: 10000 });

    return { success: result.ok, output: result.output };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}