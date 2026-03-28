// packages/pt-control-v2/src/autonomy/destructive-actions.ts

/**
 * Destructive Actions Registry
 * Actions that require user confirmation before execution
 */

// List of destructive actions that require confirmation
export const DESTRUCTIVE_ACTIONS = [
  'device-reset',      // Reset device to factory defaults
  'vlan-delete',       // Delete a VLAN
  'interface-shutdown', // Shutdown an interface
  'routing-change',    // Modify routing configuration
  'acl-modify',        // Modify access control lists
  'config-write',      // Write configuration to memory
  'topology-change',   // Modify network topology
] as const;

export type DestructiveAction = typeof DESTRUCTIVE_ACTIONS[number];

// Confirmation prompts for each action type
const CONFIRMATION_PROMPTS: Record<DestructiveAction, string> = {
  'device-reset': 'This will reset the device to factory defaults. All configuration will be lost.',
  'vlan-delete': 'This will delete the VLAN. All associated ports will be affected.',
  'interface-shutdown': 'This will shutdown the interface. Traffic will be interrupted.',
  'routing-change': 'This will modify routing configuration. Network connectivity may be affected.',
  'acl-modify': 'This will modify access control lists. Security policies may be impacted.',
  'config-write': 'This will save the current configuration to memory.',
  'topology-change': 'This will modify the network topology. Existing connections may be affected.',
};

/**
 * Check if an action is destructive and requires confirmation
 */
export function isDestructive(action: string): boolean {
  return DESTRUCTIVE_ACTIONS.includes(action as DestructiveAction);
}

/**
 * Get the confirmation prompt for a destructive action
 * Returns undefined if action is not destructive
 */
export function getConfirmationPrompt(action: string): string | undefined {
  if (isDestructive(action)) {
    return CONFIRMATION_PROMPTS[action as DestructiveAction];
  }
  return undefined;
}

/**
 * Get all destructive actions
 */
export function getDestructiveActions(): readonly string[] {
  return DESTRUCTIVE_ACTIONS;
}
