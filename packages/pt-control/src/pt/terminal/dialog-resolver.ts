// ============================================================================
// DialogResolver - Resuelve diálogos async del terminal (pager, confirm, setup)
// ============================================================================

import type { DialogType } from './policy-types.js';

export interface DialogResolutionOptions {
  autoConfirm?: boolean;
  autoPaginate?: boolean;
}

export interface DialogResolutionResult {
  resolved: boolean;
  response?: string;
  consumed?: boolean;
}

/**
 * Resolvedor de diálogos IOS
 */
export class DialogResolver {
  private readonly PAGER_MARKER = '--More--';
  private readonly CONFIRM_MARKER = '[confirm]';
  private readonly SETUP_PATTERNS = [
    /setup utility/i,
    /continue with setup/i,
    /would you like to enter basic setup/i,
  ];
  private readonly AUTOINSTALL_PATTERNS = [
    /auto-install/i,
    /autoinstall/i,
    /initial configuration dialog/i,
  ];

  /**
   * Detectar tipo de diálogo en el output
   */
  detectDialog(output: string): DialogType | null {
    if (this.isPager(output)) return 'pager';
    if (this.isConfirm(output)) return 'confirm';
    if (this.isSetup(output)) return 'setup';
    if (this.isAutoinstall(output)) return 'autoinstall';
    return null;
  }

  /**
   * Verificar si es diálogo pager (--More--)
   */
  isPager(output: string): boolean {
    return output.includes(this.PAGER_MARKER);
  }

  /**
   * Verificar si es diálogo de confirmación
   */
  isConfirm(output: string): boolean {
    return output.includes(this.CONFIRM_MARKER);
  }

  /**
   * Verificar si es modo setup
   */
  isSetup(output: string): boolean {
    return this.SETUP_PATTERNS.some(pattern => pattern.test(output));
  }

  /**
   * Verificar si es autoinstall
   */
  isAutoinstall(output: string): boolean {
    return this.AUTOINSTALL_PATTERNS.some(pattern => pattern.test(output));
  }

  /**
   * Resolver diálogo según tipo y opciones
   */
  resolve(dialog: DialogType, output: string, options: DialogResolutionOptions = {}): DialogResolutionResult {
    switch (dialog) {
      case 'pager':
        return this.resolvePager(output, options);
      case 'confirm':
        return this.resolveConfirm(output, options);
      case 'setup':
        return this.resolveSetup(output, options);
      case 'autoinstall':
        return this.resolveAutoinstall(output, options);
      case 'dirtyline':
        return { resolved: true, consumed: false };
      default:
        return { resolved: false };
    }
  }

  /**
   * Resolver pager
   */
  private resolvePager(output: string, options: DialogResolutionOptions): DialogResolutionResult {
    if (!options.autoPaginate) {
      return { resolved: false };
    }
    // Auto-space through pager
    return { resolved: true, response: ' ', consumed: true };
  }

  /**
   * Resolver confirm prompt
   */
  private resolveConfirm(output: string, options: DialogResolutionOptions): DialogResolutionResult {
    if (!options.autoConfirm) {
      return { resolved: false };
    }
    // Auto-confirm (yes)
    return { resolved: true, response: 'y', consumed: true };
  }

  /**
   * Resolver setup mode
   */
  private resolveSetup(output: string, options: DialogResolutionOptions): DialogResolutionResult {
    // Por defecto, salir de setup con Ctrl+C
    return { resolved: true, response: '\x03', consumed: true };
  }

  /**
   * Resolver autoinstall
   */
  private resolveAutoinstall(output: string, options: DialogResolutionOptions): DialogResolutionResult {
    // Abortar autoinstall
    return { resolved: true, response: '\x03', consumed: true };
  }

  /**
   * Obtener respuesta para diálogo
   */
  getResponseForDialog(dialog: DialogType): string {
    switch (dialog) {
      case 'pager':
        return ' '; // space para continuar
      case 'confirm':
        return 'y';
      case 'setup':
      case 'autoinstall':
        return '\x03'; // Ctrl+C para abortar
      default:
        return '';
    }
  }

  /**
   * Verificar si el output contiene dirty line (comandos pendientes)
   */
  hasDirtyLine(output: string): boolean {
    const dirtyPatterns = [
      /you have outstanding commands/i,
      /configuration changed/i,
      /do you want to save/i,
    ];
    return dirtyPatterns.some(pattern => pattern.test(output));
  }

  /**
   * Detectar si hay prompt limpio
   */
  hasCleanPrompt(output: string): boolean {
    // Buscar patrones de prompt válidos
    const promptPatterns = [
      /^[\w\-]+[#|>]$/m,
      /^[\w\-]+\([\w\-]+\)[#>]$/m,
      /^Router[\w\-]*[#>]$/m,
      /^Switch[\w\-]*[#>]$/m,
    ];
    return promptPatterns.some(pattern => pattern.test(output));
  }
}