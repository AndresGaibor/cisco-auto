// ============================================================================
// SessionMode Value Object - Validates IOS session modes
// ============================================================================

/**
 * Valid IOS session modes
 */
export type IosMode =
  | 'user-exec'       // Router>
  | 'priv-exec'       // Router#
  | 'config'          // Router(config)#
  | 'config-if'       // Router(config-if)#
  | 'config-line'     // Router(config-line)#
  | 'config-router'   // Router(config-router)#
  | 'config-vlan'     // Router(config-vlan)#
  | 'config-subif'    // Router(config-subif)#
  | 'rommon'          // rommon 1 >
  | 'unknown';

/**
 * Mode hierarchy (lower = less privileged)
 */
const MODE_HIERARCHY: Record<IosMode, number> = {
  'unknown': 0,
  'rommon': 1,
  'user-exec': 2,
  'priv-exec': 3,
  'config': 4,
  'config-if': 5,
  'config-line': 5,
  'config-router': 5,
  'config-vlan': 5,
  'config-subif': 5,
};

/**
 * Represents a validated IOS session mode
 * 
 * Used for tracking CLI session state across commands.
 * Essential for proper command execution in PT runtime.
 */
export class SessionMode {
  public readonly value: IosMode;

  constructor(value: IosMode) {
    const validModes: IosMode[] = [
      'user-exec', 'priv-exec', 'config', 'config-if', 
      'config-line', 'config-router', 'config-vlan', 
      'config-subif', 'rommon', 'unknown'
    ];
    
    if (!validModes.includes(value)) {
      throw new Error(
        `Invalid session mode: "${value}". ` +
        `Valid modes: ${validModes.join(', ')}`
      );
    }
    
    this.value = value;
  }

  static fromJSON(value: IosMode): SessionMode {
    return new SessionMode(value);
  }

  toJSON(): IosMode {
    return this.value;
  }

  get raw(): IosMode {
    return this.value;
  }

  /**
   * Check if this mode is in ROMMON
   */
  get isRommon(): boolean {
    return this.value === 'rommon';
  }

  /**
   * Check if this mode is unknown
   */
  get isUnknown(): boolean {
    return this.value === 'unknown';
  }

  /**
   * Check if this is an exec mode (user or privileged)
   */
  get isExecMode(): boolean {
    return this.value === 'user-exec' || this.value === 'priv-exec';
  }

  /**
   * Check if this is a config mode (any configuration submode)
   */
  get isConfigMode(): boolean {
    return this.value.startsWith('config');
  }

  /**
   * Check if this is privileged exec mode
   */
  get isPrivileged(): boolean {
    return this.value === 'priv-exec';
  }

  /**
   * Check if this is user exec mode (unprivileged)
   */
  get isUserExec(): boolean {
    return this.value === 'user-exec';
  }

  /**
   * Check if this mode can execute configuration commands
   */
  get canConfigure(): boolean {
    return this.isConfigMode;
  }

  /**
   * Check if this mode can execute privileged commands
   */
  get canExecutePrivileged(): boolean {
    return this.isPrivileged || this.isConfigMode;
  }

  /**
   * Check if this mode can execute all commands
   */
  get canExecuteAll(): boolean {
    return this.isPrivileged || this.isConfigMode;
  }

  /**
   * Get the prompt suffix for this mode
   */
  get promptSuffix(): string {
    switch (this.value) {
      case 'user-exec': return '>';
      case 'priv-exec': return '#';
      case 'config': return '(config)#';
      case 'config-if': return '(config-if)#';
      case 'config-line': return '(config-line)#';
      case 'config-router': return '(config-router)#';
      case 'config-vlan': return '(config-vlan)#';
      case 'config-subif': return '(config-subif)#';
      case 'rommon': return '>';
      case 'unknown': return '';
    }
  }

  /**
   * Get the transition command to reach this mode from current mode
   */
  getTransitionCommand(from: SessionMode): string | null {
    // Same mode - no transition needed
    if (this.value === from.value) {
      return null;
    }

    // From unknown or rommon, we can't determine transition
    if (from.isUnknown || from.isRommon) {
      return null;
    }

    // Going to user-exec from anywhere
    if (this.isUserExec) {
      return from.isPrivileged ? 'disable' : null;
    }

    // Going to priv-exec
    if (this.isPrivileged) {
      if (from.isUserExec) return 'enable';
      if (from.isConfigMode) return 'end';
      return null;
    }

    // Going to config mode
    if (this.isConfigMode) {
      if (!from.isPrivileged && !from.isConfigMode) {
        // Need to go through enable first
        return null; // Can't do in one step
      }
      
      if (from.value === 'priv-exec') {
        return 'configure terminal';
      }
      
      // Already in config, need to navigate
      if (this.value === 'config') {
        return 'exit';
      }
      
      // Different config submodes - go back to config first
      return 'exit';
    }

    return null;
  }

  /**
   * Check if this mode is higher in hierarchy than another
   */
  isHigherThan(other: SessionMode): boolean {
    return MODE_HIERARCHY[this.value] > MODE_HIERARCHY[other.value];
  }

  /**
   * Check if this mode is lower in hierarchy than another
   */
  isLowerThan(other: SessionMode): boolean {
    return MODE_HIERARCHY[this.value] < MODE_HIERARCHY[other.value];
  }

  /**
   * Check if this mode is equal or higher in hierarchy than another
   */
  isEqualOrHigherThan(other: SessionMode): boolean {
    return MODE_HIERARCHY[this.value] >= MODE_HIERARCHY[other.value];
  }

  /**
   * Infer mode from a prompt string
   */
  static fromPrompt(prompt: string): SessionMode {
    const trimmed = prompt.trim();
    
    // ROMMON
    if (/^rommon\s+\d+\s*>$/i.test(trimmed)) {
      return new SessionMode('rommon');
    }
    
    // Config submodes
    if (trimmed.endsWith('(config-if)#')) return new SessionMode('config-if');
    if (trimmed.endsWith('(config-line)#')) return new SessionMode('config-line');
    if (trimmed.endsWith('(config-router)#')) return new SessionMode('config-router');
    if (trimmed.endsWith('(config-vlan)#')) return new SessionMode('config-vlan');
    if (trimmed.endsWith('(config-subif)#')) return new SessionMode('config-subif');
    if (trimmed.endsWith('(config)#')) return new SessionMode('config');
    
    // Exec modes
    if (trimmed.endsWith('#')) return new SessionMode('priv-exec');
    if (trimmed.endsWith('>')) return new SessionMode('user-exec');
    
    return new SessionMode('unknown');
  }

  equals(other: SessionMode): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

/**
 * Create a SessionMode, throwing if invalid
 */
export function parseSessionMode(value: string): SessionMode {
  return new SessionMode(value as IosMode);
}

/**
 * Infer session mode from a prompt string
 */
export function inferSessionMode(prompt: string): SessionMode {
  return SessionMode.fromPrompt(prompt);
}

/**
 * Check if a string is a valid session mode without throwing
 */
export function isValidSessionMode(value: string): boolean {
  try {
    new SessionMode(value as IosMode);
    return true;
  } catch {
    return false;
  }
}
