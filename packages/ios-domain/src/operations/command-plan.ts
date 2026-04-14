// ============================================================================
// CommandPlan - Structured command execution plan with rollback support
// ============================================================================

/**
 * IOS CLI modes
 */
export type IosMode = "user-exec" | "privileged-exec" | "config" | "config-if" | "config-subif" | "config-line" | "config-router";

/**
 * A single command step in a plan
 */
export interface CommandStep {
  command: string;
  mode: IosMode;
  description: string;
}

/**
 * A rollback step to undo a command
 */
export interface RollbackStep {
  command: string;
  mode: IosMode;
}

/**
 * A complete command execution plan with rollback support
 */
export interface CommandPlan {
  /** Human-readable operation name */
  operation: string;
  /** Target device/interface */
  target: string;
  /** Steps to execute in order */
  steps: CommandStep[];
  /** Steps to undo in reverse order */
  rollback: RollbackStep[];
  /** The final mode after execution */
  targetMode: IosMode;
  /** Whether privilege mode is required */
  requiresPrivilege: boolean;
  /** Whether config mode is required */
  requiresConfig: boolean;
}

/**
 * Builder for creating CommandPlan objects fluently
 */
export class CommandPlanBuilder {
  private _operation: string = "";
  private _target: string = "";
  private _steps: CommandStep[] = [];
  private _rollback: RollbackStep[] = [];

  /**
   * Set the operation name
   */
  operation(name: string): this {
    this._operation = name;
    return this;
  }

  /**
   * Set the target (device, interface, etc.)
   */
  target(target: string): this {
    this._target = target;
    return this;
  }

  /**
   * Add a step that enters config mode on an interface
   */
  enterInterface(name: string): this {
    this._steps.push({
      command: `interface ${name}`,
      mode: "config-if",
      description: `Enter interface configuration for ${name}`,
    });
    return this;
  }

  /**
   * Add a step
   */
  step(command: string, mode: IosMode, description: string, rollback?: string): this {
    this._steps.push({ command, mode, description });
    if (rollback) {
      this._rollback.unshift({ command: rollback, mode });
    }
    return this;
  }

  /**
   * Add a config mode command
   */
  config(command: string, description: string, rollback?: string): this {
    return this.step(command, "config", description, rollback);
  }

  /**
   * Add an interface config mode command
   */
  iface(command: string, description: string, rollback?: string): this {
    return this.step(command, "config-if", description, rollback);
  }

  /**
   * Add an enable mode command
   */
  enable(command: string, description: string): this {
    return this.step(command, "privileged-exec", description);
  }

  /**
   * Build the CommandPlan
   */
  build(): CommandPlan {
    const lastStep = this._steps[this._steps.length - 1];
    
    // Auto-add exit if the last step is in a sub-mode
    if (lastStep && (lastStep.mode === "config-if" || lastStep.mode === "config-subif" || lastStep.mode === "config-line" || lastStep.mode === "config-router")) {
      this._steps.push({ 
        command: "exit", 
        mode: "config", 
        description: "Return to config mode" 
      });
    }
    
    const targetMode = this._steps[this._steps.length - 1]?.mode ?? "user-exec";

    return {
      operation: this._operation,
      target: this._target,
      steps: this._steps,
      rollback: this._rollback,
      targetMode,
      requiresPrivilege: this._steps.some((s) => s.mode !== "user-exec"),
      requiresConfig: this._steps.some((s) =>
        s.mode.startsWith("config")
      ),
    };
  }
}

/**
 * Get the prompt suffix for a mode
 */
export function getModePrompt(mode: IosMode): string {
  switch (mode) {
    case "user-exec": return ">";
    case "privileged-exec": return "#";
    case "config": return "(config)#";
    case "config-if": return "(config-if)#";
    case "config-subif": return "(config-subif)#";
    case "config-line": return "(config-line)#";
    case "config-router": return "(config-router)#";
  }
}

/**
 * Check if a mode is privileged
 */
export function isPrivilegedMode(mode: IosMode): boolean {
  return mode === "privileged-exec" || mode.startsWith("config");
}

/**
 * Check if a mode is config mode
 */
export function isConfigMode(mode: IosMode): boolean {
  return mode.startsWith("config");
}
