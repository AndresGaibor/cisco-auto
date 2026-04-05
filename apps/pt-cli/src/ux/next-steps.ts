#!/usr/bin/env bun
/**
 * Utilidades para sugerir siguientes pasos después de un comando.
 * Proporciona recomendaciones contextuales basadas en la acción ejecutada.
 */

export type NextStepsInput = {
  action: string;
  ok: boolean;
  data?: Record<string, unknown>;
  verification?: Record<string, unknown>;
};

const NEXT_STEPS_MAX = 4;

export function getNextSteps(input: NextStepsInput): string[] {
  if (!input.ok) {
    return [];
  }

  const action = input.action.toLowerCase();

  if (action.includes('link.add') || action === 'link add' || action === 'create-link') {
    return getLinkAddNextSteps(input);
  }

  if (action.includes('device.add') || action === 'device add' || action === 'add-device') {
    return getDeviceAddNextSteps(input);
  }

  if (action.includes('config-host') || action === 'config-host') {
    return getConfigHostNextSteps(input);
  }

  if (action.includes('config-ios') || action === 'config-ios') {
    return getConfigIosNextSteps(input);
  }

  if (action.includes('vlan') && (action.includes('add') || action.includes('create'))) {
    return getVlanNextSteps(input);
  }

  if (action.includes('ssh') && action.includes('setup')) {
    return getSshSetupNextSteps(input);
  }

  return [];
}

function getLinkAddNextSteps(input: NextStepsInput): string[] {
  const steps: string[] = [];
  const data = input.data as Record<string, unknown> | undefined;

  steps.push('bun run pt link list');

  if (data?.endpointA) {
    steps.push(`bun run pt device get ${data.endpointA}`);
  }

  if (data?.endpointB) {
    steps.push(`bun run pt device get ${data.endpointB}`);
  }

  if (steps.length > NEXT_STEPS_MAX) {
    return steps.slice(0, NEXT_STEPS_MAX);
  }

  return steps;
}

function getDeviceAddNextSteps(input: NextStepsInput): string[] {
  const steps: string[] = [];
  const data = input.data as Record<string, unknown> | undefined;

  if (data?.name) {
    steps.push(`bun run pt device get ${data.name}`);
    steps.push(`bun run pt device move ${data.name} --help`);
  }

  steps.push('bun run pt device list');
  steps.push('bun run pt link add --help');

  if (steps.length > NEXT_STEPS_MAX) {
    return steps.slice(0, NEXT_STEPS_MAX);
  }

  return steps;
}

function getConfigHostNextSteps(input: NextStepsInput): string[] {
  const steps: string[] = [];
  const data = input.data as Record<string, unknown> | undefined;

  if (data?.device) {
    steps.push(`bun run pt device get ${data.device}`);
  }

  steps.push('bun run pt show --help');

  if (steps.length > NEXT_STEPS_MAX) {
    return steps.slice(0, NEXT_STEPS_MAX);
  }

  return steps;
}

function getConfigIosNextSteps(input: NextStepsInput): string[] {
  const steps: string[] = [];
  const data = input.data as Record<string, unknown> | undefined;

  const configContent = data?.config as string | undefined;
  const device = data?.device as string | undefined;

  if (device) {
    if (configContent?.includes('interface')) {
      steps.push(`bun run pt show ip-int-brief ${device}`);
    } else if (configContent?.includes('vlan') || configContent?.includes('VLAN')) {
      steps.push(`bun run pt show vlan ${device}`);
    } else if (configContent?.includes('ip route') || configContent?.includes('route')) {
      steps.push(`bun run pt show ip-route ${device}`);
    }
  }

  steps.push('bun run pt device list');

  if (steps.length > NEXT_STEPS_MAX) {
    return steps.slice(0, NEXT_STEPS_MAX);
  }

  return steps;
}

function getVlanNextSteps(input: NextStepsInput): string[] {
  const steps: string[] = [];
  const data = input.data as Record<string, unknown> | undefined;

  if (data?.device) {
    steps.push(`bun run pt show vlan ${data.device}`);
  }

  steps.push('bun run pt vlan list');
  steps.push('bun run pt link add --help');

  if (steps.length > NEXT_STEPS_MAX) {
    return steps.slice(0, NEXT_STEPS_MAX);
  }

  return steps;
}

function getSshSetupNextSteps(input: NextStepsInput): string[] {
  const steps: string[] = [];
  const data = input.data as Record<string, unknown> | undefined;

  if (data?.device) {
    steps.push(`bun run pt device get ${data.device}`);
  }

  steps.push('bun run pt show --help');

  if (steps.length > NEXT_STEPS_MAX) {
    return steps.slice(0, NEXT_STEPS_MAX);
  }

  return steps;
}

export function formatNextSteps(steps: string[]): string {
  if (steps.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('');
  lines.push('Siguientes pasos');

  for (const step of steps) {
    lines.push(`  ${step}`);
  }

  return lines.join('\n');
}
