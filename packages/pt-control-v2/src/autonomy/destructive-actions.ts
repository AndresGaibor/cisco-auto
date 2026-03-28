export const DESTRUCTIVE_ACTIONS = [
  'device-reset',
  'vlan-delete',
  'interface-shutdown',
  'routing-change',
  'acl-modify',
  'config-write',
  'topology-change',
] as const;

export type DestructiveAction = (typeof DESTRUCTIVE_ACTIONS)[number];

const CONFIRMATION_PROMPTS: Record<DestructiveAction, string> = {
  'device-reset': 'Esta acción restablece el dispositivo a valores de fábrica y eliminará la configuración actual.',
  'vlan-delete': 'Esta acción eliminará la VLAN y puede afectar a los puertos asociados.',
  'interface-shutdown': 'Esta acción apagará la interfaz y el tráfico se interrumpirá.',
  'routing-change': 'Esta acción modificará el enrutamiento y puede afectar la conectividad de la red.',
  'acl-modify': 'Esta acción modificará las listas de control de acceso y puede impactar las políticas de seguridad.',
  'config-write': 'Esta acción guardará la configuración actual en memoria.',
  'topology-change': 'Esta acción modificará la topología de red y puede afectar las conexiones existentes.',
};

export function isDestructive(action: string): boolean {
  return DESTRUCTIVE_ACTIONS.includes(action as DestructiveAction);
}

export function getConfirmationPrompt(action: string): string {
  if (isDestructive(action)) {
    return `Confirmación requerida: ${CONFIRMATION_PROMPTS[action as DestructiveAction]}`;
  }

  return `La acción "${action}" no está marcada como destructiva.`;
}

export function getDestructiveActions(): readonly DestructiveAction[] {
  return DESTRUCTIVE_ACTIONS;
}
