// ============================================================================
// PT Control V2 - Base Command with Global Flags
// ============================================================================

import { Command, Flags, Interfaces } from '@oclif/core';
import pc from 'picocolors';
import { formatOutput, applyJqFilter, type OutputFormat } from './formatters/index.js';
import { LogManager, getLogManager } from '../logging/index.js';
import type { LogEntry } from '../logging/index.js';
import { requestConfirmation } from '../autonomy/index.js';

export class CommandCancelledError extends Error {
  constructor() {
    super('Command cancelled by user');
    this.name = 'CommandCancelledError';
  }
}

// ============================================================================
// Types
// ============================================================================

export type GlobalFlags = {
  format: OutputFormat;
  jq: string | undefined;
  quiet: boolean;
  verbose: boolean;
  devDir: string;
  yes: boolean;
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
  static override enableJsonFlag = true;

  // Global flags available to all commands
  static override baseFlags = {
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
    yes: Flags.boolean({
      description: 'Assume yes for confirmation prompts',
      default: false,
      char: 'y',
    }),
  };

  // Parsed flags
  protected flags!: Record<string, unknown>;
  protected args!: Record<string, unknown>;
  protected globalFlags!: GlobalFlags;
  protected devDir!: string;
  protected logManager!: LogManager;
  protected logSessionId!: string;
  private trackedControllers: Array<{ drainCommandTrace?: () => Array<{ id?: string }> }> = [];

  override async init(): Promise<void> {
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
      yes: flags.yes as boolean,
    };
    this.devDir = this.globalFlags.devDir;

    this.logManager = getLogManager();
    const currentSessionId = this.logManager.getCurrentSessionId();

    if (currentSessionId) {
      this.logSessionId = currentSessionId;
    } else {
      this.logSessionId = LogManager.generateSessionId();
      this.logManager.startSession(this.logSessionId);
    }
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

  protected async confirmDestructiveAction(options: {
    action: string;
    details: string;
    targetDevice?: string;
    skipPrompt?: boolean;
  }): Promise<void> {
    const result = await requestConfirmation({
      action: options.action,
      details: options.details,
      targetDevice: options.targetDevice,
      sessionId: this.logSessionId,
      skipPrompt: options.skipPrompt ?? this.globalFlags.yes,
    });

    if (!result.confirmed) {
      throw new CommandCancelledError();
    }
  }

  protected trackController(controller: { drainCommandTrace?: () => Array<{ id?: string }> }): void {
    if (controller && typeof controller.drainCommandTrace === 'function') {
      this.trackedControllers.push(controller);
    }
  }

  private drainTrackedCommandIds(): string[] {
    if (this.trackedControllers.length === 0) {
      return [];
    }

    const ids = new Set<string>();

    for (const controller of this.trackedControllers) {
      try {
        const entries = controller.drainCommandTrace?.() ?? [];
        for (const entry of entries) {
          if (entry && typeof entry.id === 'string') {
            ids.add(entry.id);
          }
        }
      } catch {
        continue;
      }
    }

    this.trackedControllers = [];
    return Array.from(ids);
  }

  protected async runLoggedCommand<T>(options: {
    action: string;
    targetDevice?: string | (() => string | undefined);
    context?: Record<string, unknown>;
    execute: () => Promise<T>;
  }): Promise<T> {
    const correlationId = LogManager.generateCorrelationId();
    const startedAt = Date.now();

    try {
      const result = await options.execute();
      const successOutcome: LogEntry['outcome'] = 'success';
      const targetDevice = typeof options.targetDevice === 'function'
        ? options.targetDevice()
        : options.targetDevice;
      const commandIds = this.drainTrackedCommandIds();
      const primaryCorrelationId = commandIds[0] ?? correlationId;
      await this.logManager.logAction(this.logSessionId, primaryCorrelationId, options.action, successOutcome, {
        target_device: targetDevice,
        duration_ms: Date.now() - startedAt,
        context: options.context,
        command_ids: commandIds.length ? commandIds : undefined,
      });
      return result;
    } catch (error) {
      if (error instanceof CommandCancelledError) {
        const cancelledOutcome: LogEntry['outcome'] = 'cancelled';
        const targetDevice = typeof options.targetDevice === 'function'
          ? options.targetDevice()
          : options.targetDevice;
        const commandIds = this.drainTrackedCommandIds();
        const primaryCorrelationId = commandIds[0] ?? correlationId;
        await this.logManager.logAction(this.logSessionId, primaryCorrelationId, options.action, cancelledOutcome, {
          target_device: targetDevice,
          duration_ms: Date.now() - startedAt,
          context: options.context,
          command_ids: commandIds.length ? commandIds : undefined,
        });
        return undefined as T;
      }

      const failureOutcome: LogEntry['outcome'] = 'error';
      const targetDevice = typeof options.targetDevice === 'function'
        ? options.targetDevice()
        : options.targetDevice;
      const commandIds = this.drainTrackedCommandIds();
      const primaryCorrelationId = commandIds[0] ?? correlationId;
      await this.logManager.logAction(this.logSessionId, primaryCorrelationId, options.action, failureOutcome, {
        target_device: targetDevice,
        duration_ms: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
        context: options.context,
        command_ids: commandIds.length ? commandIds : undefined,
      });
      throw error;
    }
  }

  protected async logCancelledCommand(options: {
    action: string;
    targetDevice?: string;
    context?: Record<string, unknown>;
  }): Promise<void> {
    const correlationId = LogManager.generateCorrelationId();
    const cancelledOutcome: LogEntry['outcome'] = 'cancelled';

    await this.logManager.logAction(this.logSessionId, correlationId, options.action, cancelledOutcome, {
      target_device: options.targetDevice,
      duration_ms: 0,
      context: options.context,
    });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a spinner for long operations
 */
export function createSpinner(text: string) {
  const ora = require('ora').default;
  return ora(text);
}

// Re-export Flags for convenience
export { Flags };
