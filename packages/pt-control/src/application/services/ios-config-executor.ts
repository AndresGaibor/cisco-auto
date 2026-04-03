/**
 * iOS Config Executor - Executes configuration commands on devices
 * Handles command submission, mode transitions, and response handling
 */

// TODO: Import proper types from file-bridge when available
type PTDevice = any;
type PTCommandLine = any;

export interface ConfigExecutionRequest {
  deviceId: string;
  commands: string[];
  saveOnComplete?: boolean;
  stopOnError?: boolean;
  validateOnly?: boolean;
}

export interface ConfigExecutionResult {
  success: boolean;
  deviceId: string;
  executed: number;
  failed: number;
  results: CommandResult[];
  error?: string;
}

export interface CommandResult {
  command: string;
  status: 'success' | 'error' | 'skipped';
  output?: string;
  error?: string;
}

export class IOSConfigExecutor {
  async executeConfig(request: ConfigExecutionRequest, device: PTDevice): Promise<ConfigExecutionResult> {
    const results: CommandResult[] = [];
    let executed = 0;
    let failed = 0;

    const cli = device.getCommandLine();
    if (!cli) {
      return {
        success: false,
        deviceId: request.deviceId,
        executed,
        failed: request.commands.length,
        results: [],
        error: 'Device does not support CLI',
      };
    }

    // Enter config mode
    try {
      await this.enterConfigMode(cli);
    } catch (error) {
      return {
        success: false,
        deviceId: request.deviceId,
        executed,
        failed: request.commands.length,
        results: [],
        error: `Failed to enter config mode: ${(error as Error).message}`,
      };
    }

    // Execute commands
    for (const command of request.commands) {
      try {
        const [status, output] = cli.enterCommand(command);

        if (status === 0) {
          results.push({
            command,
            status: 'success',
            output,
          });
          executed++;
        } else {
          results.push({
            command,
            status: 'error',
            error: output,
          });
          failed++;

          if (request.stopOnError) {
            break;
          }
        }
      } catch (error) {
        results.push({
          command,
          status: 'error',
          error: (error as Error).message,
        });
        failed++;

        if (request.stopOnError) {
          break;
        }
      }
    }

    // Exit config mode
    try {
      await this.exitConfigMode(cli);
    } catch (error) {
      console.error('Failed to exit config mode:', error);
    }

    // Save configuration if requested
    if (request.saveOnComplete && executed > 0) {
      try {
        cli.enterCommand('copy running-config startup-config');
      } catch (error) {
        console.error('Failed to save configuration:', error);
      }
    }

    return {
      success: failed === 0,
      deviceId: request.deviceId,
      executed,
      failed,
      results,
    };
  }

  async validateConfig(commands: string[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const command of commands) {
      // Basic validation rules
      if (command.trim().length === 0) {
        errors.push('Empty command');
        continue;
      }

      if (!this.isValidCommand(command)) {
        errors.push(`Invalid command syntax: ${command}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async enterConfigMode(cli: PTCommandLine): Promise<void> {
    const [status, output] = cli.enterCommand('configure terminal');

    if (status !== 0) {
      throw new Error(`Failed to enter config mode: ${output}`);
    }
  }

  private async exitConfigMode(cli: PTCommandLine): Promise<void> {
    const [status] = cli.enterCommand('exit');

    if (status !== 0) {
      console.warn('Failed to exit config mode');
    }
  }

  private isValidCommand(command: string): boolean {
    // Placeholder validation
    // In real implementation, would check against command reference
    return !command.includes('{') && !command.includes('}');
  }
}
