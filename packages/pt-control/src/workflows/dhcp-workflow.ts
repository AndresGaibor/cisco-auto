// Workflow para diagnosticar problemas DHCP
// Ejecuta comandos show, analiza outputs, retorna issues encontrados

import type { RuntimeTerminalPort, TerminalPlan } from '../ports/runtime-terminal-port.js';
import type { RuntimePrimitivePort } from '../ports/runtime-primitive-port.js';

export interface DHCPDiagnosisInput {
  device: string;
  poolName?: string;
}

export interface DHCPDiagnosisPlan {
  kind: 'workflow';
  workflowId: 'workflow.dhcp.diagnosis';
  input: DHCPDiagnosisInput;
  steps: WorkflowStep[];
}

export interface WorkflowStep {
  description: string;
  terminal?: TerminalPlan;
  primitive?: { id: string; payload: unknown };
}

export interface WorkflowResult {
  success: boolean;
  plan: DHCPDiagnosisPlan;
  results: StepResult[];
  evidence: DHCPEvidence;
}

export interface StepResult {
  step: string;
  ok: boolean;
  output?: string;
  error?: string;
}

export interface DHCPEvidence {
  issuesFound: DHCPIssue[];
  device: string;
  poolChecked?: string;
  dhcpEnabled: boolean;
  poolExists: boolean;
}

export interface DHCPIssue {
  type: 'pool_missing' | 'no_addresses' | 'conflict' | 'relay_broken' | 'excluded_range' | 'lease_time' | 'configuration';
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  evidence?: string;
}

function buildTerminalPlan(device: string, commands: string[]): TerminalPlan {
  return {
    id: `dhcp-diag-${Date.now()}`,
    device,
    steps: commands.map((command) => ({ command })),
  };
}

/**
 * Construye un plan de workflow para diagnosticar problemas DHCP en un dispositivo.
 *
 * Genera steps de terminal para: verificar configuración DHCP en running-config,
 * inspeccionar pool específico (si se provee poolName), bindings y conflictos.
 *
 * @param input - Datos del diagnóstico: device, poolName opcional
 * @returns Plan de workflow listo para ejecutar via TerminalPort
 */
export async function buildDHCPDiagnosisPlan(input: DHCPDiagnosisInput): Promise<DHCPDiagnosisPlan> {
  const steps: WorkflowStep[] = [];

  steps.push({
    description: `Verificar DHCP en ${input.device}`,
    terminal: buildTerminalPlan(input.device, ['show running-config | include ip dhcp']),
  });

  if (input.poolName) {
    steps.push({
      description: `Verificar pool DHCP ${input.poolName}`,
      terminal: buildTerminalPlan(input.device, [`show ip dhcp pool ${input.poolName}`]),
    });
  }

  steps.push({
    description: `Verificar bindings DHCP`,
    terminal: buildTerminalPlan(input.device, ['show ip dhcp binding']),
  });

  steps.push({
    description: `Verificar conflictos DHCP`,
    terminal: buildTerminalPlan(input.device, ['show ip dhcp conflict']),
  });

  return {
    kind: 'workflow',
    workflowId: 'workflow.dhcp.diagnosis',
    input,
    steps,
  };
}

function validateDiagnosisInput(input: DHCPDiagnosisInput): string[] {
  const errors: string[] = [];

  if (!input.device || input.device.length === 0) {
    errors.push('device es requerido');
  }

  return errors;
}

function parseDHCPPool(output: string): { exists: boolean; addresses: number; using: number } {
  const result = { exists: false, addresses: 0, using: 0 };

  if (output.includes('Pool') && output.includes('DHCP')) {
    result.exists = true;
  }

  const addressMatch = output.match(/Total addresses\s*:\s*(\d+)/);
  if (addressMatch) {
    result.addresses = parseInt(addressMatch[1]!, 10);
  }

  const usingMatch = output.match(/Using\s*:\s*(\d+)/);
  if (usingMatch) {
    result.using = parseInt(usingMatch[1]!, 10);
  }

  return result;
}

function analyzeDHCPDiagnosis(
  device: string,
  results: StepResult[],
  poolName?: string
): DHCPEvidence {
  const issues: DHCPIssue[] = [];
  let dhcpEnabled = false;
  let poolExists = false;

  const runConfigResult = results.find((r) => r.step.includes('DHCP en'));
  if (runConfigResult?.output) {
    dhcpEnabled = runConfigResult.output.includes('ip dhcp');
  }

  const poolResult = results.find((r) => r.step.includes('pool DHCP'));
  if (poolResult?.output) {
    const parsed = parseDHCPPool(poolResult.output);
    poolExists = parsed.exists;

    if (parsed.exists && parsed.addresses > 0 && parsed.using === parsed.addresses) {
      issues.push({
        type: 'no_addresses',
        severity: 'high',
        description: `Pool "${poolName ?? 'unknown'}" agotado - todas las direcciones en uso`,
        recommendation: 'Ampliar el pool DHCP o liberar direcciones expiradas',
        evidence: `Total: ${parsed.addresses}, Usando: ${parsed.using}`,
      });
    }
  }

  const bindingResult = results.find((r) => r.step.includes('bindings DHCP'));
  if (!bindingResult?.output || bindingResult.output.includes('No bindings')) {
    issues.push({
      type: 'pool_missing',
      severity: 'medium',
      description: 'No hay asignaciones DHCP activas',
      recommendation: 'Verificar que los clientes estén solicitando direcciones DHCP',
    });
  }

  const conflictResult = results.find((r) => r.step.includes('conflictos'));
  if (conflictResult?.output && !conflictResult.output.includes('No conflicts')) {
    const conflictMatch = conflictResult.output.match(/Address\s+Detection\s+Date\s+Deletes/g);
    if (conflictMatch) {
      issues.push({
        type: 'conflict',
        severity: 'high',
        description: 'Existen conflictos de direcciones DHCP',
        recommendation: 'Resolver conflictos - verificar direcciones estáticas duplicadas',
        evidence: conflictResult.output,
      });
    }
  }

  if (!dhcpEnabled) {
    issues.push({
      type: 'configuration',
      severity: 'high',
      description: 'DHCP no está habilitado en el dispositivo',
      recommendation: 'Configurar "service dhcp" y pools DHCP',
    });
  }

  return {
    issuesFound: issues,
    device,
    poolChecked: poolName,
    dhcpEnabled,
    poolExists,
  };
}

export async function executeDHCPDiagnosisWorkflow(
  input: DHCPDiagnosisInput,
  ports: { terminalPort: RuntimeTerminalPort; primitivePort: RuntimePrimitivePort }
): Promise<WorkflowResult> {
  const errors = validateDiagnosisInput(input);
  if (errors.length > 0) {
    return {
      success: false,
      plan: { kind: 'workflow', workflowId: 'workflow.dhcp.diagnosis', input, steps: [] },
      results: [],
      evidence: {
        issuesFound: [],
        device: input.device,
        dhcpEnabled: false,
        poolExists: false,
      },
    };
  }

  const plan = await buildDHCPDiagnosisPlan(input);
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

  const evidence = analyzeDHCPDiagnosis(input.device, results, input.poolName);

  return {
    success: evidence.issuesFound.filter((i) => i.severity === 'high').length === 0,
    plan,
    results,
    evidence,
  };
}