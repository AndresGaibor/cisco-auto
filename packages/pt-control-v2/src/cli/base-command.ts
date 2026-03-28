// ============================================================================
// PT Control V2 - Base Command with Global Flags
// ============================================================================

import { Command, Flags, Interfaces } from '@oclif/core';
import pc from 'picocolors';
import { formatOutput, applyJqFilter, type OutputFormat } from './formatters/index.js';

// ============================================================================
// Types
// ============================================================================

export type GlobalFlags = {
  format: OutputFormat;
  jq: string | undefined;
  quiet: boolean;
  verbose: boolean;
  devDir: string;
};

// ============================================================================
// Base Command
// ============================================================================

/**
 * Base command class with global flags and output formatting
 * All PT Control commands should extend this class
 */
export abstract class BaseCommand extends Command {
  // Enable JSON flag for all commands
  static enableJsonFlag = true;

  // Global flags available to all commands
  static baseFlags = {
    format: Flags.string({
      description: 'Output format: json, yaml, table, text',
      options: ['json', 'yaml', 'table', 'text'] as const,
      default: 'text',
      char: 'f',
    }),
    jq: Flags.string({
      description: 'Filter JSON output using jq-like syntax (e.g., .[0].name)',
    }),
    quiet: Flags.boolean({
      description: 'Suppress non-essential output',
      char: 'q',
      default: false,
    }),
    verbose: Flags.boolean({
      description: 'Show detailed output',
      char: 'v',
      default: false,
    }),
    'dev-dir': Flags.string({
      description: 'PT development directory',
      default: process.env.PT_DEV_DIR || `${process.env.HOME}/pt-dev`,
      env: 'PT_DEV_DIR',
    }),
  };

  // Parsed flags
  protected flags!: Record<string, unknown>;
  protected args!: Record<string, unknown>;
  protected globalFlags!: GlobalFlags;
  protected devDir!: string;

  async init(): Promise<void> {
    await super.init();
    const { flags, args } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (this.ctor as typeof BaseCommand).baseFlags,
      args: this.ctor.args,
      strict: this.ctor.strict,
    });
    this.flags = flags;
    this.args = args || {};
    this.globalFlags = {
      format: (flags.format as OutputFormat) || 'text',
      jq: flags.jq as string | undefined,
      quiet: flags.quiet as boolean,
      verbose: flags.verbose as boolean,
      devDir: (flags['dev-dir'] as string) || process.env.PT_DEV_DIR || `${process.env.HOME}/pt-dev`,
    };
    this.devDir = this.globalFlags.devDir;
  }

  // ============================================================================
  // Output Methods
  // ============================================================================

  /**
   * Format and output data according to global flags
   */
  protected outputData(data: unknown): void {
    let processedData = data;

    // Apply jq filter if specified
    if (this.globalFlags.jq) {
      processedData = applyJqFilter(data, this.globalFlags.jq);
    }

    // Format output
    const formatted = formatOutput(processedData, this.globalFlags.format);
    this.log(formatted);
  }

  /**
   * Output only if not in quiet mode
   */
  protected print(message: string): void {
    if (!this.globalFlags.quiet) {
      this.log(message);
    }
  }

  /**
   * Output debug info only in verbose mode
   */
  protected logDebug(message: string): void {
    if (this.globalFlags.verbose) {
      this.log(pc.gray(`[debug] ${message}`));
    }
  }

  /**
   * Output warning message
   */
  protected printWarning(message: string): void {
    if (!this.globalFlags.quiet) {
      this.log(pc.yellow(`Warning: ${message}`));
    }
  }

  /**
   * Output success message
   */
  protected printSuccess(message: string): void {
    if (!this.globalFlags.quiet) {
      this.log(pc.green(`✓ ${message}`));
    }
  }

  // ============================================================================
  // Controller Factory
  // ============================================================================

  /**
   * Create a controller instance with configured dev directory
   */
  protected createController() {
    // Dynamic import to avoid circular dependencies
    const { PTController } = require('../controller/index.js');
    return new PTController({ devDir: this.devDir });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a spinner for long operations
 */
export function createSpinner(text: string) {
  const ora = require('ora');
  return ora(text);
}

// Re-export Flags for convenience
export { Flags };