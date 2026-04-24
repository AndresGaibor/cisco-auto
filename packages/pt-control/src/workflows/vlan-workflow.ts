// Workflow para crear VLAN simple en un switch
// Valida inputs, ejecuta steps via terminal port, retorna evidence real

import type { RuntimeTerminalPort, TerminalPlan } from '../ports/runtime-terminal-port.js';
import type { RuntimePrimitivePort } from '../ports/runtime-primitive-port.js';

export interface VlanSimpleInput {
  deviceId: string;
  vlanId: number;
  vlanName: string;
  ports?: string[];
}

export interface VlanSimplePlan {
  kind: 'workflow';
  workflowId: 'workflow.vlan.simple';
  input: VlanSimpleInput;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  description: string;
  terminal?: TerminalPlan;
  primitive?: { id: string; payload: unknown };
}

export interface WorkflowResult {
  success: boolean;
  plan: VlanSimplePlan;
  results: StepResult[];
  evidence: VlanEvidence;
}

export interface StepResult {
  step: string;
  ok: boolean;
  output?: string;
  error?: string;
}

export interface VlanEvidence {
  vlanCreated: boolean;
  vlanId: number;
  vlanName: string;
  portsAssigned: number;
  deviceId: string;
}

function buildTerminalPlan(device: string, commands: string[]): TerminalPlan {
  return {
    id: `vlan-${Date.now()}`,
    device,
    steps: commands.map((command) => ({ command })),
  };
}

/**
 * Construye un plan de workflow para crear una VLAN simple en un switch.
 *
 * Genera steps de terminal para: crear la VLAN con ID y nombre, y opcionalmente
 * asignar puertos en modo access a esa VLAN.
 *
 * @param input - Datos de la VLAN: deviceId, vlanId (1-4094), vlanName, ports opcionales
 * @returns Plan de workflow listo para ejecutar via TerminalPort
 */
export async function buildVlanSimplePlan(input: VlanSimpleInput): Promise<VlanSimplePlan> {
  const steps: WorkflowStep[] = [];

  steps.push({
    description: `Crear VLAN ${input.vlanId} con nombre "${input.vlanName}"`,
    terminal: buildTerminalPlan(input.deviceId, [
      `vlan ${input.vlanId}`,
      `name ${input.vlanName}`,
      'exit',
    ]),
  });

  if (input.ports && input.ports.length > 0) {
    for (const port of input.ports) {
      steps.push({
        description: `Asignar puerto ${port} a VLAN ${input.vlanId}`,
        terminal: buildTerminalPlan(input.deviceId, [
          `interface ${port}`,
          `switchport mode access`,
          `switchport access vlan ${input.vlanId}`,
          'exit',
        ]),
      });
    }
  }

  return {
    kind: 'workflow',
    workflowId: 'workflow.vlan.simple',
    input,
    steps,
  };
}

function validateVlanInput(input: VlanSimpleInput): string[] {
  const errors: string[] = [];

  if (!input.deviceId || input.deviceId.length === 0) {
    errors.push('deviceId es requerido');
  }

  if (input.vlanId < 1 || input.vlanId > 4094) {
    errors.push(`VLAN ID invalido: ${input.vlanId} (rango: 1-4094)`);
  }

  if (!input.vlanName || input.vlanName.length === 0) {
    errors.push('VLAN name es requerido');
  }

  if (input.vlanName.length > 32) {
    errors.push(`VLAN name demasiado largo: ${input.vlanName.length} (max: 32)`);
  }

  return errors;
}

export async function executeVlanSimpleWorkflow(
  input: VlanSimpleInput,
  ports: { terminalPort: RuntimeTerminalPort; primitivePort: RuntimePrimitivePort }
): Promise<WorkflowResult> {
  const errors = validateVlanInput(input);
  if (errors.length > 0) {
    return {
      success: false,
      plan: { kind: 'workflow', workflowId: 'workflow.vlan.simple', input, steps: [] },
      results: [],
      evidence: {
        vlanCreated: false,
        vlanId: input.vlanId,
        vlanName: input.vlanName,
        portsAssigned: 0,
        deviceId: input.deviceId,
      },
    };
  }

  const plan = await buildVlanSimplePlan(input);
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

  const allOk = results.every((r) => r.ok);

  return {
    success: allOk,
    plan,
    results,
    evidence: {
      vlanCreated: allOk,
      vlanId: input.vlanId,
      vlanName: input.vlanName,
      portsAssigned: input.ports?.length ?? 0,
      deviceId: input.deviceId,
    },
  };
}

export async function vlanSimpleCleanup(
  input: VlanSimpleInput,
  ports: { terminalPort: RuntimeTerminalPort; primitivePort: RuntimePrimitivePort }
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const plan = buildTerminalPlan(input.deviceId, [`no vlan ${input.vlanId}`]);
    const result = await ports.terminalPort.runTerminalPlan(plan, { timeoutMs: 10000 });
    return { success: result.ok, output: result.output };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}