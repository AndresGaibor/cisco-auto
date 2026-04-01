// packages/pt-control/src/autonomy/index.ts

/**
 * Autonomy module exports
 * Provides helpers for managing autonomous agent behavior
 */

export {
  DESTRUCTIVE_ACTIONS,
  isDestructive,
  getConfirmationPrompt,
  getDestructiveActions,
  type DestructiveAction,
} from './destructive-actions.js';

export {
  requestConfirmation,
  requireConfirmation,
  getActionConfirmationInfo,
  isInteractive,
  type ConfirmationOptions,
  type ConfirmationResult,
} from './confirmation.js';
