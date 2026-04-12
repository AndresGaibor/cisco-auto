// ============================================================================
// ModeTransition - Maneja transiciones de modo válidas en IOS
// ============================================================================

import type { SessionMode, ModeTransition } from './policy-types.js';

/**
 * Mapa de transiciones válidas de modo IOS
 */
const VALID_TRANSITIONS: Record<SessionMode, SessionMode[]> = {
  exec: ['privilege', 'configure', 'line'],
  privilege: ['exec', 'configure', 'line'],
  configure: ['exec', 'interface', 'router', 'vlan', 'line'],
  interface: ['configure', 'subinterface', 'exec'],
  subinterface: ['interface', 'configure', 'exec'],
  router: ['configure', 'exec'],
  vlan: ['configure', 'exec'],
  line: ['configure', 'exec'],
};

/**
 * Prompts esperados por modo
 */
const MODE_PROMPTS: Record<SessionMode, RegExp[]> = {
  exec: [/\w+>$/, /^[\w-]+>$/],
  privilege: [/\w+#$/, /^[\w-]+#$/],
  configure: [/\w+\(config\)#$/, /^\(config\)#$/],
  interface: [/\w+\(config-if\)#$/, /^\(config-if\)#$/],
  subinterface: [/\w+\(config-subif\)#$/, /^\(config-subif\)#$/],
  router: [/\w+\(config-router\)#$/, /^\(config-router\)#$/],
  vlan: [/\w+\(config-vlan\)#$/, /^\(config-vlan\)#$/],
  line: [/\w+\(config-line\)#$/, /^\(config-line\)#$/],
};

/**
 * Comandos para cambiar de modo
 */
const MODE_COMMANDS: Record<SessionMode, string> = {
  exec: 'exit',
  privilege: 'enable',
  configure: 'configure terminal',
  interface: 'interface',
  subinterface: 'interface',
  router: 'router',
  vlan: 'vlan',
  line: 'line',
};

/**
 * Manejador de transiciones de modo IOS
 */
export class ModeTransitionHandler {
  /**
   * Verificar si una transición es válida
   */
  canTransition(from: SessionMode, to: SessionMode): ModeTransition {
    const validModes = VALID_TRANSITIONS[from] || [];
    const isValid = validModes.includes(to);
    
    return {
      from,
      to,
      valid: isValid,
      reason: isValid ? undefined : `Cannot transition from ${from} to ${to}`,
    };
  }

  /**
   * Obtener comando para cambiar de modo
   */
  getCommand(from: SessionMode, to: SessionMode): string | null {
    // Si es el mismo modo, no hay comando
    if (from === to) return null;
    
    // Casos especiales
    if (from === 'exec' && to === 'privilege') return 'enable';
    if (from === 'privilege' && to === 'exec') return 'exit';
    if (from === 'configure' && to === 'exec') return 'end';
    if (from === 'interface' && to === 'configure') return 'exit';
    if (from === 'subinterface' && to === 'interface') return 'exit';
    if (from === 'subinterface' && to === 'configure') return 'exit';
    if (from === 'router' && to === 'configure') return 'exit';
    if (from === 'vlan' && to === 'configure') return 'exit';
    if (from === 'line' && to === 'configure') return 'exit';
    
    // Para entrar a submodos, se necesita el nombre del objetivo
    // Esto se maneja en el nivel superior
    return null;
  }

  /**
   * Obtener el comando completo para entrar a un modo
   * (para casos donde se necesita más info como interface name)
   */
  getEnterCommand(targetMode: SessionMode, targetName?: string): string {
    const baseCommand = MODE_COMMANDS[targetMode];
    
    if (!targetName) {
      return baseCommand;
    }
    
    switch (targetMode) {
      case 'interface':
        return `${baseCommand} ${targetName}`;
      case 'subinterface':
        return `${baseCommand} ${targetName}`;
      case 'router':
        return `${baseCommand} ${targetName}`;
      case 'vlan':
        return `${baseCommand} ${targetName}`;
      case 'line':
        return `${baseCommand} ${targetName}`;
      default:
        return baseCommand;
    }
  }

  /**
   * Verificar si el prompt indica el modo esperado
   */
  validatePrompt(prompt: string, expectedMode: SessionMode): boolean {
    const patterns = MODE_PROMPTS[expectedMode];
    if (!patterns) return false;
    
    return patterns.some(pattern => pattern.test(prompt.trim()));
  }

  /**
   * Detectar modo actual desde el prompt
   */
  detectMode(prompt: string): SessionMode | null {
    const trimmed = prompt.trim();
    
    for (const [mode, patterns] of Object.entries(MODE_PROMPTS)) {
      for (const pattern of patterns) {
        if (pattern.test(trimmed)) {
          return mode as SessionMode;
        }
      }
    }
    
    return null;
  }

  /**
   * Obtener lista de modos válidos como array
   */
  getValidModes(from: SessionMode): SessionMode[] {
    return VALID_TRANSITIONS[from] || [];
  }

  /**
   * Verificar si es modo de configuración
   */
  isConfigMode(mode: SessionMode): boolean {
    return ['configure', 'interface', 'subinterface', 'router', 'vlan', 'line'].includes(mode);
  }

  /**
   * Verificar si es modo exec
   */
  isExecMode(mode: SessionMode): boolean {
    return ['exec', 'privilege'].includes(mode);
  }

  /**
   * Obtener modo ancestro (para salir de submodos)
   */
  getParentMode(mode: SessionMode): SessionMode {
    switch (mode) {
      case 'interface':
      case 'subinterface':
      case 'router':
      case 'vlan':
      case 'line':
        return 'configure';
      case 'configure':
        return 'privilege';
      case 'privilege':
        return 'exec';
      default:
        return 'exec';
    }
  }

  /**
   * Obtener número de niveles a salir para llegar a un modo
   */
  getExitLevels(from: SessionMode, to: SessionMode): number {
    if (from === to) return 0;
    
    let levels = 0;
    let current = from;
    
    while (current !== to && current !== 'exec') {
      current = this.getParentMode(current);
      levels++;
    }
    
    return levels;
  }
}