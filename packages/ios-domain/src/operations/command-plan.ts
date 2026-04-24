// ============================================================================
// CommandPlan - Structured command execution plan with rollback support
// ============================================================================

/**
 * Modos del CLI IOS. Desde user exec hasta sub-modes de configuración.
 */
export type IosMode = "user-exec" | "privileged-exec" | "config" | "config-if" | "config-subif" | "config-line" | "config-router";

/**
 * Un paso individual de comando dentro de un plan.
 */
export interface CommandStep {
  command: string;
  mode: IosMode;
  description: string;
}

/**
 * Un paso de rollback para deshacer un comando.
 */
export interface RollbackStep {
  command: string;
  mode: IosMode;
}

/**
 * Plan de ejecución de comandos con soporte para rollback.
 * Contiene los pasos a ejecutar, los pasos de rollback en orden inverso,
 * y metadata sobre qué modos se requieren.
 */
export interface CommandPlan {
  /** Nombre legible de la operación */
  operation: string;
  /** Dispositivo/interfaz objetivo */
  target: string;
  /** Pasos a ejecutar en orden */
  steps: CommandStep[];
  /** Pasos de rollback en orden inverso */
  rollback: RollbackStep[];
  /** Modo final después de ejecutar */
  targetMode: IosMode;
  /** Si se requiere modo privilege (enable) */
  requiresPrivilege: boolean;
  /** Si se requiere modo config */
  requiresConfig: boolean;
}

/**
 * Builder fluido para crear CommandPlan objects.
 * Proporciona métodos para agregar pasos en diferentes modos.
 */
export class CommandPlanBuilder {
  private _operation: string = "";
  private _target: string = "";
  private _steps: CommandStep[] = [];
  private _rollback: RollbackStep[] = [];

  /**
   * Establece el nombre de la operación (e.g., "configure-vlan", "setup-trunk")
   * @param name - Nombre de la operación
   * @returns this para encadenamiento fluido
   */
  operation(name: string): this {
    this._operation = name;
    return this;
  }

  /**
   * Establece el target (dispositivo, interfaz, VLAN, etc.)
   * @param target - Identificador del objetivo
   * @returns this para encadenamiento fluido
   */
  target(target: string): this {
    this._target = target;
    return this;
  }

  /**
   * Agrega un paso que entra al submodo de configuración de interfaz.
   * Emite `interface <name>` y pasa a config-if mode.
   * @param name - Nombre de la interfaz (e.g., "GigabitEthernet0/1")
   * @returns this para encadenamiento fluido
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
   * Agrega un paso genérico al plan.
   * @param command - Comando IOS a ejecutar
   * @param mode - Modo IOS requerido para el comando
   * @param description - Descripción legible del paso
   * @param rollback - Comando opcional para deshacer este paso
   * @returns this para encadenamiento fluido
   */
  step(command: string, mode: IosMode, description: string, rollback?: string): this {
    this._steps.push({ command, mode, description });
    if (rollback) {
      this._rollback.unshift({ command: rollback, mode });
    }
    return this;
  }

  /**
   * Agrega un comando en modo config global.
   * @param command - Comando IOS a ejecutar
   * @param description - Descripción legible del paso
   * @param rollback - Comando opcional para deshacer este paso
   * @returns this para encadenamiento fluido
   */
  config(command: string, description: string, rollback?: string): this {
    return this.step(command, "config", description, rollback);
  }

  /**
   * Agrega un comando en modo config-if (submodo de interfaz).
   * @param command - Comando IOS a ejecutar
   * @param description - Descripción legible del paso
   * @param rollback - Comando opcional para deshacer este paso
   * @returns this para encadenamiento fluido
   */
  iface(command: string, description: string, rollback?: string): this {
    return this.step(command, "config-if", description, rollback);
  }

  /**
   * Agrega un comando en modo privileged-exec (enable).
   * @param command - Comando IOS a ejecutar
   * @param description - Descripción legible del paso
   * @returns this para encadenamiento fluido
   */
  enable(command: string, description: string): this {
    return this.step(command, "privileged-exec", description);
  }

  /**
   * Construye el CommandPlan final.
   * Auto-agrega un "exit" al final si el último paso es un submodo.
   * Calcula automáticamente requiresPrivilege y requiresConfig.
   * @returns CommandPlan listo para ejecutarse
   */
  build(): CommandPlan {
    const lastStep = this._steps[this._steps.length - 1];
    
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
 * Obtiene el suffix de prompt para un modo IOS dado.
 * Útil para debugging y logging de qué modo se espera.
 * @param mode - Modo IOS
 * @returns Sufijo del prompt (e.g., ">", "#", "(config)#")
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
 * Verifica si un modo es privileged (enable o superior).
 * Incluye privileged-exec y cualquier modo config.
 * @param mode - Modo IOS a verificar
 * @returns true si es modo privileged
 */
export function isPrivilegedMode(mode: IosMode): boolean {
  return mode === "privileged-exec" || mode.startsWith("config");
}

/**
 * Verifica si un modo es config mode o submodo de config.
 * @param mode - Modo IOS a verificar
 * @returns true si es config mode o submodo
 */
export function isConfigMode(mode: IosMode): boolean {
  return mode.startsWith("config");
}