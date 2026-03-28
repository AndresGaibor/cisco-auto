// packages/pt-control-v2/src/autonomy/confirmation.ts

/**
 * Confirmation Helpers for Autonomy
 * Provides safe confirmation prompts for destructive actions
 */

import { confirm } from '@inquirer/prompts';
import picocolors from 'picocolors';
import { isDestructive, getConfirmationPrompt } from './destructive-actions.js';
import { getLogManager, LogManager } from '../logging/log-manager.js';

const pc = picocolors;

/**
 * Options for confirmation requests
 */
export interface ConfirmationOptions {
  /** Action identifier (e.g., 'device-reset', 'vlan-delete') */
  action: string;
  
  /** Human-readable details about what will happen */
  details: string;
  
  /** Default response if user doesn't answer (non-TTY or timeout) */
  defaultResponse?: boolean;
  
  /** Target device name if applicable */
  targetDevice?: string;
  
  /** Session ID for logging (auto-generated if not provided) */
  sessionId?: string;
  
  /** Timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * Result of a confirmation request
 */
export interface ConfirmationResult {
  /** Whether the action was confirmed */
  confirmed: boolean;
  
  /** How the confirmation was resolved */
  status: 'confirmed' | 'cancelled' | 'timeout' | 'not_tty' | 'not_destructive';
  
  /** Correlation ID for log tracing */
  correlationId: string;
  
  /** Whether the action was destructive */
  isDestructive: boolean;
}

/**
 * Check if running in an interactive TTY environment
 */
export function isInteractive(): boolean {
  return process.stdin.isTTY && process.stdout.isTTY;
}

/**
 * Request user confirmation for an action
 * 
 * - For non-TTY environments: returns defaultResponse (false by default - safe default)
 * - For destructive actions: shows warning and requires explicit confirmation
 * - For non-destructive actions: returns true automatically
 * - Logs all confirmation decisions
 * 
 * @example
 * ```typescript
 * const result = await requestConfirmation({
 *   action: 'device-reset',
 *   details: 'Reset switch SW1 to factory defaults',
 *   targetDevice: 'SW1',
 * });
 * 
 * if (result.confirmed) {
 *   // proceed with action
 * }
 * ```
 */
export async function requestConfirmation(
  options: ConfirmationOptions
): Promise<ConfirmationResult> {
  const {
    action,
    details,
    defaultResponse = false,
    targetDevice,
    sessionId,
    timeoutMs = 30000,
  } = options;

  const correlationId = LogManager.generateCorrelationId();
  const effectiveSessionId = sessionId || LogManager.generateSessionId();
  const logManager = getLogManager();

  // Check if action is destructive
  const destructive = isDestructive(action);

  // Non-destructive actions don't need confirmation
  if (!destructive) {
    await logManager.logAction(
      effectiveSessionId,
      correlationId,
      `confirm:${action}`,
      'success',
      {
        target_device: targetDevice,
        is_destructive: false,
        confirmation_status: 'not_required',
        context: { details },
      }
    );

    return {
      confirmed: true,
      status: 'not_destructive',
      correlationId,
      isDestructive: false,
    };
  }

  // Non-TTY environment: use default response (safe default is false)
  if (!isInteractive()) {
    await logManager.logAction(
      effectiveSessionId,
      correlationId,
      `confirm:${action}`,
      defaultResponse ? 'success' : 'cancelled',
      {
        target_device: targetDevice,
        is_destructive: true,
        confirmation_status: 'not_tty',
        context: {
          details,
          default_response: defaultResponse,
        },
      }
    );

    return {
      confirmed: defaultResponse,
      status: 'not_tty',
      correlationId,
      isDestructive: true,
    };
  }

  // Show destructive action warning
  const warningPrompt = getConfirmationPrompt(action);
  console.log();
  console.log(pc.yellow('⚠ Warning:'), pc.yellow(warningPrompt || 'This action may have significant impact.'));
  console.log(pc.gray('Action:'), pc.white(action));
  console.log(pc.gray('Details:'), pc.white(details));
  if (targetDevice) {
    console.log(pc.gray('Target:'), pc.cyan(targetDevice));
  }
  console.log();

  // Request confirmation with timeout
  let confirmed: boolean;
  let status: 'confirmed' | 'cancelled' | 'timeout';

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Confirmation timeout')), timeoutMs);
    });

    // Race between confirmation and timeout
    confirmed = await Promise.race([
      confirm({
        message: 'Do you want to proceed?',
        default: false, // Safe default: require explicit yes
      }),
      timeoutPromise,
    ]);

    status = confirmed ? 'confirmed' : 'cancelled';
  } catch (error) {
    // Timeout or other error - default to cancel
    confirmed = false;
    status = 'timeout';
    console.log(pc.red('✗ Confirmation timed out. Action cancelled.'));
  }

  // Log the confirmation decision
  await logManager.logAction(
    effectiveSessionId,
    correlationId,
    `confirm:${action}`,
    confirmed ? 'success' : 'cancelled',
    {
      target_device: targetDevice,
      is_destructive: true,
      confirmation_status: status,
      context: {
        details,
        timeout_ms: timeoutMs,
      },
    }
  );

  // Show result
  if (confirmed) {
    console.log(pc.green('✓ Confirmed. Proceeding with action...'));
  } else {
    console.log(pc.red('✗ Cancelled. Action will not be executed.'));
  }
  console.log();

  return {
    confirmed,
    status,
    correlationId,
    isDestructive: true,
  };
}

/**
 * Quick helper for destructive action confirmation
 * Throws an error if not confirmed, making it easy to use in command handlers
 * 
 * @example
 * ```typescript
 * await requireConfirmation('device-reset', 'Reset SW1', 'SW1');
 * // If we get here, user confirmed - proceed with reset
 * ```
 */
export async function requireConfirmation(
  action: string,
  details: string,
  targetDevice?: string,
  sessionId?: string
): Promise<void> {
  const result = await requestConfirmation({
    action,
    details,
    targetDevice,
    sessionId,
  });

  if (!result.confirmed) {
    throw new Error(`Action '${action}' was not confirmed by user`);
  }
}

/**
 * Check if an action needs confirmation and get the appropriate prompt
 * Useful for pre-checking before executing an action
 */
export function getActionConfirmationInfo(action: string): {
  needsConfirmation: boolean;
  prompt?: string;
} {
  const needsConfirmation = isDestructive(action);
  const prompt = getConfirmationPrompt(action);

  return {
    needsConfirmation,
    prompt,
  };
}
