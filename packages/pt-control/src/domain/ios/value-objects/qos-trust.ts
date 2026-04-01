// ============================================================================
// QosTrust VO - Quality of Service Trust State
// ============================================================================

/**
 * QoS trust modes for Cisco switches
 */
export type QosTrustMode = 
  | 'untrusted'      // Do not trust any QoS markings
  | 'cos'            // Trust CoS (802.1p) markings
  | 'dscp'           // Trust DSCP markings
  | 'ip-precedence'; // Trust IP Precedence markings

/**
 * Represents a validated QoS trust state
 * 
 * Used for configuring QoS trust boundaries on switch ports.
 * The trust state determines which QoS markings the switch will honor.
 */
export class QosTrust {
  private readonly _mode: QosTrustMode;

  constructor(mode: QosTrustMode) {
    const validModes: QosTrustMode[] = ['untrusted', 'cos', 'dscp', 'ip-precedence'];
    if (!validModes.includes(mode)) {
      throw new Error(`Invalid QoS trust mode: "${mode}". Valid modes: ${validModes.join(', ')}`);
    }
    this._mode = mode;
  }

  static fromJSON(value: QosTrustMode): QosTrust {
    return new QosTrust(value);
  }

  toJSON(): QosTrustMode {
    return this._mode;
  }

  get mode(): QosTrustMode {
    return this._mode;
  }

  /**
   * Check if this port is untrusted (default state)
   */
  get isUntrusted(): boolean {
    return this._mode === 'untrusted';
  }

  /**
   * Check if this port trusts CoS (802.1p) markings
   */
  get isCosTrusted(): boolean {
    return this._mode === 'cos';
  }

  /**
   * Check if this port trusts DSCP markings
   */
  get isDscpTrusted(): boolean {
    return this._mode === 'dscp';
  }

  /**
   * Check if this port trusts IP Precedence markings
   */
  get isIpPrecedenceTrusted(): boolean {
    return this._mode === 'ip-precedence';
  }

  /**
   * Check if this port trusts any QoS markings
   */
  get isTrusted(): boolean {
    return !this.isUntrusted;
  }

  /**
   * Check if this trusts Layer 2 markings (CoS)
   */
  get isLayer2Trust(): boolean {
    return this.isCosTrusted;
  }

  /**
   * Check if this trusts Layer 3 markings (DSCP or IP Precedence)
   */
  get isLayer3Trust(): boolean {
    return this.isDscpTrusted || this.isIpPrecedenceTrusted;
  }

  /**
   * Get the Cisco IOS command to configure this trust state
   */
  toCiscoCommand(): string {
    if (this.isUntrusted) {
      return 'mls qos trust none';
    }
    return `mls qos trust ${this._mode}`;
  }

  /**
   * Get the rollback command to reset trust state
   */
  toRollbackCommand(): string {
    return 'no mls qos trust';
  }

  /**
   * Create a QosTrust from a Cisco command
   */
  static fromCiscoCommand(command: string): QosTrust | null {
    const normalized = command.toLowerCase().trim();
    
    if (normalized.includes('trust none') || normalized.includes('trust disable')) {
      return new QosTrust('untrusted');
    }
    if (normalized.includes('trust dscp')) {
      return new QosTrust('dscp');
    }
    if (normalized.includes('trust cos')) {
      return new QosTrust('cos');
    }
    if (normalized.includes('trust ip-precedence')) {
      return new QosTrust('ip-precedence');
    }
    
    return null;
  }

  /**
   * Recommended trust mode for different scenarios
   */
  static recommended(): {
    accessPort: QosTrust;
    trunkPort: QosTrust;
    uplinkPort: QosTrust;
    ipPhonePort: QosTrust;
  } {
    return {
      /**
       * Access ports should be untrusted (edge of network)
       */
      accessPort: new QosTrust('untrusted'),
      /**
       * Trunk ports typically trust DSCP for end-to-end QoS
       */
      trunkPort: new QosTrust('dscp'),
      /**
       * Uplink ports should trust DSCP markings
       */
      uplinkPort: new QosTrust('dscp'),
      /**
       * IP Phone ports trust DSCP but may also trust CoS from the phone
       */
      ipPhonePort: new QosTrust('dscp'),
    };
  }

  equals(other: QosTrust): boolean {
    return this._mode === other._mode;
  }

  toString(): string {
    return this._mode;
  }
}

/**
 * Create a QosTrust, throwing if invalid
 */
export function parseQosTrust(mode: string): QosTrust {
  return new QosTrust(mode as QosTrustMode);
}

/**
 * Check if a string is a valid QoS trust mode without throwing
 */
export function isValidQosTrust(mode: string): boolean {
  try {
    new QosTrust(mode as QosTrustMode);
    return true;
  } catch {
    return false;
  }
}
