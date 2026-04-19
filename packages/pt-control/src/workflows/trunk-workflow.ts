// Workflow para configurar trunk simple entre dos switches
// Valida inputs, ejecuta steps via terminal port, retorna evidence real

import type { RuntimeTerminalPort, TerminalPlan } from '../ports/runtime-terminal-port.js';
import type { RuntimePrimitivePort } from '../ports/runtime-primitive-port.js';

export interface TrunkSimpleInput {
  switch1: string;
  switch2: string;
  port1: string;
  port2: string;
  nativeVlan?: number;
  allowedVlans?: number[];
}

export interface TrunkSimplePlan {
  kind: 'workflow';
  workflowId: 'workflow.trunk.simple';
  input: TrunkSimpleInput;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  description: string;
  terminal?: TerminalPlan;
  primitive?: { id: string; payload: unknown };
}

export interface WorkflowResult {
  success: boolean;
  plan: TrunkSimplePlan;
  results: StepResult[];
  evidence: TrunkEvidence;
}

export interface StepResult {
  step: string;
  ok: boolean;
  output?: string;
  error?: string;
}

export interface TrunkEvidence {
  trunkConfigured: boolean;
  switch1: string;
  switch2: string;
  port1: string;
  port2: string;
  nativeVlan?: number;
  allowedVlans?: number[];
}

function buildTerminalPlan(device: string, commands: string[]): TerminalPlan {
  return {
    id: `trunk-${Date.now()}`,
    device,
    steps: commands.map((command) => ({ command })),
  };
}

export async function buildTrunkSimplePlan(input: TrunkSimpleInput): Promise<TrunkSimplePlan> {
  const steps: WorkflowStep[] = [];
  const nativeVlan = input.nativeVlan ?? 1;
  const allowedVlans = input.allowedVlans ?? [];

  steps.push({
    description: `Configurar trunk en ${input.switch1}:${input.port1}`,
    terminal: buildTerminalPlan(input.switch1, [
      `interface ${input.port1}`,
      'switchport mode trunk',
      `switchport trunk native vlan ${nativeVlan}`,
      allowedVlans.length > 0 ? `switchport trunk allowed vlan ${allowedVlans.join(',')}` : '',
      'exit',
    ].filter((c) => c.length > 0)),
  });

  steps.push({
    description: `Configurar trunk en ${input.switch2}:${input.port2}`,
    terminal: buildTerminalPlan(input.switch2, [
      `interface ${input.port2}`,
      'switchport mode trunk',
      `switchport trunk native vlan ${nativeVlan}`,
      allowedVlans.length > 0 ? `switchport trunk allowed vlan ${allowedVlans.join(',')}` : '',
      'exit',
    ].filter((c) => c.length > 0)),
  });

  return {
    kind: 'workflow',
    workflowId: 'workflow.trunk.simple',
    input,
    steps,
  };
}

function validateTrunkInput(input: TrunkSimpleInput): string[] {
  const errors: string[] = [];

  if (!input.switch1 || input.switch1.length === 0) {
    errors.push('switch1 es requerido');
  }

  if (!input.switch2 || input.switch2.length === 0) {
    errors.push('switch2 es requerido');
  }

  if (!input.port1 || input.port1.length === 0) {
    errors.push('port1 es requerido');
  }

  if (!input.port2 || input.port2.length === 0) {
    errors.push('port2 es requerido');
  }

  if (input.nativeVlan !== undefined && (input.nativeVlan < 1 || input.nativeVlan > 4094)) {
    errors.push(`Native VLAN invalido: ${input.nativeVlan} (rango: 1-4094)`);
  }

  if (input.allowedVlans) {
    for (const vlan of input.allowedVlans) {
      if (vlan < 1 || vlan > 4094) {
        errors.push(`VLAN invalida en allowed list: ${vlan}`);
      }
    }
  }

  return errors;
}

export async function executeTrunkSimpleWorkflow(
  input: TrunkSimpleInput,
  ports: { terminalPort: RuntimeTerminalPort; primitivePort: RuntimePrimitivePort }
): Promise<WorkflowResult> {
  const errors = validateTrunkInput(input);
  if (errors.length > 0) {
    return {
      success: false,
      plan: { kind: 'workflow', workflowId: 'workflow.trunk.simple', input, steps: [] },
      results: [],
      evidence: {
        trunkConfigured: false,
        switch1: input.switch1,
        switch2: input.switch2,
        port1: input.port1,
        port2: input.port2,
        nativeVlan: input.nativeVlan,
        allowedVlans: input.allowedVlans,
      },
    };
  }

  const plan = await buildTrunkSimplePlan(input);
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
      trunkConfigured: allOk,
      switch1: input.switch1,
      switch2: input.switch2,
      port1: input.port1,
      port2: input.port2,
      nativeVlan: input.nativeVlan,
      allowedVlans: input.allowedVlans,
    },
  };
}

export async function trunkSimpleCleanup(
  input: TrunkSimpleInput,
  ports: { terminalPort: RuntimeTerminalPort; primitivePort: RuntimePrimitivePort }
): Promise<{ success: boolean; output?: string; error?: string }> {
  try {
    const results: { success: boolean; output?: string; error?: string }[] = [];

    const plan1 = buildTerminalPlan(input.switch1, [
      `interface ${input.port1}`,
      'no switchport mode trunk',
      'exit',
    ]);
    const result1 = await ports.terminalPort.runTerminalPlan(plan1, { timeoutMs: 10000 });
    results.push({ success: result1.ok, output: result1.output });

    const plan2 = buildTerminalPlan(input.switch2, [
      `interface ${input.port2}`,
      'no switchport mode trunk',
      'exit',
    ]);
    const result2 = await ports.terminalPort.runTerminalPlan(plan2, { timeoutMs: 10000 });
    results.push({ success: result2.ok, output: result2.output });

    return {
      success: results.every((r) => r.success),
      output: results.map((r) => r.output).join('; '),
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}