// ============================================================================
// PT Control V2 - Custom Error Classes
// ============================================================================

import { Errors } from '@oclif/core';

// ============================================================================
// Exit Codes
// ============================================================================

export enum ExitCode {
  SUCCESS = 0,
  ERROR = 1,
  INVALID_ARGS = 2,
  NOT_FOUND = 3,
  CONNECTION_ERROR = 4,
  TIMEOUT = 5,
}

// ============================================================================
// Base CLI Error
// ============================================================================

export interface CLIErrorOptions {
  code?: string;
  exitCode?: ExitCode;
  suggestions?: string[];
}

export class CLIError extends Errors.CLIError {
  public override readonly code: string;
  public readonly exitCode: ExitCode;
  public override readonly suggestions: string[];

  constructor(message: string, options: CLIErrorOptions = {}) {
    super(message);
    this.code = options.code || 'ERROR';
    this.exitCode = options.exitCode ?? ExitCode.ERROR;
    this.suggestions = options.suggestions || [];
  }

  override toString(): string {
    let output = `${this.message}\n`;

    if (this.suggestions.length > 0) {
      output += '\nSuggestions:\n';
      for (const suggestion of this.suggestions) {
        output += `  • ${suggestion}\n`;
      }
    }

    return output;
  }
}

// ============================================================================
// Specific Errors
// ============================================================================

export class DeviceNotFoundError extends CLIError {
  constructor(deviceName: string, options?: CLIErrorOptions) {
    super(`Device '${deviceName}' not found in topology`, {
      code: 'DEVICE_NOT_FOUND',
      exitCode: ExitCode.NOT_FOUND,
      suggestions: [
        'Run `pt device list` to see available devices',
        'Check the device name for typos',
      ],
      ...options,
    });
  }
}

export class LinkNotFoundError extends CLIError {
  constructor(portSpec: string, options?: CLIErrorOptions) {
    super(`No link found on port '${portSpec}'`, {
      code: 'LINK_NOT_FOUND',
      exitCode: ExitCode.NOT_FOUND,
      suggestions: [
        'Run `pt link list` to see all links',
        'Check the port specification format: device:port',
      ],
      ...options,
    });
  }
}

export class ConnectionError extends CLIError {
  constructor(details?: string, options?: CLIErrorOptions) {
    super(`Cannot connect to Packet Tracer${details ? `: ${details}` : ''}`, {
      code: 'CONNECTION_ERROR',
      exitCode: ExitCode.CONNECTION_ERROR,
      suggestions: [
        'Make sure Packet Tracer is running',
        'Run `pt runtime build --deploy` to install the bridge',
        'Load the main.js file in Packet Tracer',
      ],
      ...options,
    });
  }
}

export class TimeoutError extends CLIError {
  constructor(operation: string, options?: CLIErrorOptions) {
    super(`Operation '${operation}' timed out`, {
      code: 'TIMEOUT',
      exitCode: ExitCode.TIMEOUT,
      suggestions: [
        'Check if Packet Tracer is responsive',
        'Try running with --verbose for more details',
      ],
      ...options,
    });
  }
}

export class ValidationError extends CLIError {
  constructor(message: string, options?: CLIErrorOptions) {
    super(message, {
      code: 'VALIDATION_ERROR',
      exitCode: ExitCode.INVALID_ARGS,
      ...options,
    });
  }
}

export class ConfigError extends CLIError {
  constructor(message: string, options?: CLIErrorOptions) {
    super(message, {
      code: 'CONFIG_ERROR',
      exitCode: ExitCode.ERROR,
      ...options,
    });
  }
}
