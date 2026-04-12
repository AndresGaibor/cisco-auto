import { ValueObject } from '../../shared/base/value-object.base.js';
import { DomainError } from '../../shared/errors/domain.error.js';

export type QosTrustMode =
  | 'untrusted'
  | 'cos'
  | 'dscp'
  | 'ip-precedence';

const VALID_QOS_MODES: QosTrustMode[] = ['untrusted', 'cos', 'dscp', 'ip-precedence'];

export class QosTrust extends ValueObject<QosTrustMode> {
  private constructor(mode: QosTrustMode) {
    super(mode);
  }

  static from(mode: QosTrustMode): QosTrust {
    if (!VALID_QOS_MODES.includes(mode)) {
      throw DomainError.invalidValue('modo QoS trust', mode, `modos válidos: ${VALID_QOS_MODES.join(', ')}`);
    }
    return new QosTrust(mode);
  }

  static tryFrom(mode: string): QosTrust | null {
    try {
      return QosTrust.from(mode as QosTrustMode);
    } catch {
      return null;
    }
  }

  static isValid(mode: string): boolean {
    return VALID_QOS_MODES.includes(mode as QosTrustMode);
  }

  static fromCiscoCommand(command: string): QosTrust | null {
    const normalized = command.toLowerCase().trim();

    if (normalized.includes('trust none') || normalized.includes('trust disable')) {
      return QosTrust.from('untrusted');
    }
    if (normalized.includes('trust dscp')) {
      return QosTrust.from('dscp');
    }
    if (normalized.includes('trust cos')) {
      return QosTrust.from('cos');
    }
    if (normalized.includes('trust ip-precedence')) {
      return QosTrust.from('ip-precedence');
    }

    return null;
  }

  static recommended(): {
    accessPort: QosTrust;
    trunkPort: QosTrust;
    uplinkPort: QosTrust;
    ipPhonePort: QosTrust;
  } {
    return {
      accessPort: QosTrust.from('untrusted'),
      trunkPort: QosTrust.from('dscp'),
      uplinkPort: QosTrust.from('dscp'),
      ipPhonePort: QosTrust.from('dscp'),
    };
  }

  get isUntrusted(): boolean {
    return this._value === 'untrusted';
  }

  get isCosTrusted(): boolean {
    return this._value === 'cos';
  }

  get isDscpTrusted(): boolean {
    return this._value === 'dscp';
  }

  get isIpPrecedenceTrusted(): boolean {
    return this._value === 'ip-precedence';
  }

  get isTrusted(): boolean {
    return !this.isUntrusted;
  }

  get isLayer2Trust(): boolean {
    return this.isCosTrusted;
  }

  get isLayer3Trust(): boolean {
    return this.isDscpTrusted || this.isIpPrecedenceTrusted;
  }

  toCiscoCommand(): string {
    if (this.isUntrusted) {
      return 'mls qos trust none';
    }
    return `mls qos trust ${this._value}`;
  }

  toRollbackCommand(): string {
    return 'no mls qos trust';
  }

  override equals(other: QosTrust): boolean {
    return this._value === other._value;
  }

  override toString(): string {
    return this._value;
  }

  override toJSON(): QosTrustMode {
    return this._value;
  }
}

export function parseQosTrust(mode: string): QosTrust {
  return QosTrust.from(mode as QosTrustMode);
}

export function isValidQosTrust(mode: string): boolean {
  return QosTrust.isValid(mode);
}
