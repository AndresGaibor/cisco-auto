// ============================================================================
// Command Executor - Thin re-export + factory
// ============================================================================
// Este archivo es un wrapper minimalista que re-exporta la funcionalidad real
// desde engine/command-executor.ts y proporciona createCommandExecutor factory.

export {
  executeTerminalCommand,
  type PTCommandLine,
  type ExecutionOptions,
  type CommandExecutionResult,
} from "./engine/command-executor";

import { executeTerminalCommand, type PTCommandLine, type ExecutionOptions, type CommandExecutionResult } from "./engine/command-executor";

const DEFAULT_COMMAND_TIMEOUT = 15000;
const DEFAULT_STALL_TIMEOUT = 5000;

/**
 * Crea una instancia del motor de ejecución de comandos.
 */
export function createCommandExecutor(config: { commandTimeoutMs?: number; stallTimeoutMs?: number } = {}) {
  const defaultCommandTimeout = config.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT;
  const defaultStallTimeout = config.stallTimeoutMs ?? DEFAULT_STALL_TIMEOUT;

  async function executeCommand(
    deviceName: string,
    command: string,
    terminal: PTCommandLine,
    options: ExecutionOptions = {},
  ): Promise<CommandExecutionResult> {
    const execOptions = {
      ...options,
      commandTimeoutMs: options.commandTimeoutMs ?? defaultCommandTimeout,
      stallTimeoutMs: options.stallTimeoutMs ?? defaultStallTimeout,
    };

    return executeTerminalCommand(
      deviceName,
      command,
      terminal,
      execOptions,
    );
  }

  return { executeCommand };
}
