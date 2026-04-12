#!/usr/bin/env bun
import { Command } from 'commander';
import {
  AgentContextService,
  createDefaultPTController,
  createSessionState,
  renderBaseContext,
  renderCompactContext,
  renderDetailedContext,
} from '@cisco-auto/pt-control';
import type { NetworkTwin } from '@cisco-auto/pt-control';

export type AgentWorkflowMode = 'context' | 'plan' | 'apply' | 'verify';

export interface AgentWorkflowOptions {
  snapshot?: string;
  task?: string;
  goal?: string;
  device?: string;
  zone?: string;
  json?: boolean;
}

async function loadAgentTwin(snapshotPath?: string): Promise<NetworkTwin> {
  if (snapshotPath) {
    const file = Bun.file(snapshotPath);
    if (!(await file.exists())) {
      throw new Error(`Snapshot no encontrado: ${snapshotPath}`);
    }
    return JSON.parse(await file.text()) as NetworkTwin;
  }

  const controller = createDefaultPTController();
  try {
    await controller.start();
    await controller.snapshot();
    const twin = controller.getTwin();
    if (!twin) {
      throw new Error('No se pudo materializar el twin desde Packet Tracer.');
    }
    return twin;
  } finally {
    try {
      await controller.stop();
    } catch {
      // ignore stop errors after a failed start
    }
  }
}

function createAgentSession(options: AgentWorkflowOptions) {
  return createSessionState({
    selectedDevice: options.device,
    selectedZone: options.zone,
    focusDevices: options.device ? [options.device] : [],
    lastTask: options.task ?? options.goal,
  });
}

function resolveWorkflowGoal(mode: AgentWorkflowMode, options: AgentWorkflowOptions): string {
  return options.task ?? options.goal ?? `${mode} del subgrafo seleccionado`;
}

function renderWorkflowText(mode: AgentWorkflowMode, context: Awaited<ReturnType<AgentContextService['buildTaskContext']>>, verbosity: 'compact' | 'normal' | 'detailed' = 'normal'): string {
  switch (verbosity) {
    case 'compact':
      return renderCompactContext(context);
    case 'detailed':
      return renderDetailedContext(context);
    default:
      return renderBaseContext(context);
  }
}

export async function runAgentWorkflow(mode: AgentWorkflowMode, options: AgentWorkflowOptions): Promise<void> {
  const twin = await loadAgentTwin(options.snapshot);
  const session = createAgentSession(options);
  const service = new AgentContextService();
  const goal = resolveWorkflowGoal(mode, options);

  const context = await service.buildTaskContext(
    twin,
    session,
    goal,
    options.device ? [options.device] : [],
    options.zone ? [options.zone] : [],
  );

  if (options.json) {
    console.log(JSON.stringify({ mode, context }, null, 2));
    return;
  }

  const titles: Record<AgentWorkflowMode, string> = {
    context: '=== Contexto de agente ===',
    plan: '=== Plan de agente ===',
    apply: '=== Aplicación de agente ===',
    verify: '=== Verificación de agente ===',
  };

  console.log(`\n${titles[mode]}`);
  console.log(renderWorkflowText(mode, context, 'normal'));
  console.log();
}

export function createAgentContextCommand(): Command {
  return new Command('context')
    .description('Construir contexto acotado para una tarea de agente')
    .option('--snapshot <path>', 'Cargar el twin desde un snapshot JSON')
    .option('--task <task>', 'Tarea a resolver')
    .option('-d, --device <device>', 'Dispositivo seleccionado')
    .option('-z, --zone <zone>', 'Zona seleccionada')
    .option('--json', 'Salida en JSON', false)
    .action(async function (options: AgentWorkflowOptions) {
      await runAgentWorkflow('context', options);
    });
}
