import { DeviceId, DeviceType } from '../value-objects/device-id.vo.js';
import { InterfaceName } from '../value-objects/interface-name.vo.js';
import { InterfaceEntity } from './interface.entity.js';
import { DomainError } from '../../shared/errors/domain.error.js';

/**
 * Entidad que representa un dispositivo de red con IOS.
 *
 * Contiene información del dispositivo y sus interfaces.
 * No es un Aggregate Root — el Device Aggregate Root es quien
 * gestiona las invariantes y eventos.
 */
export class DeviceEntity {
  private readonly _id: DeviceId;
  private readonly _deviceType: DeviceType;
  private readonly _model: string;
  private readonly _interfaces: Map<string, InterfaceEntity>;
  private _hostname: string;
  private readonly _vlans: Set<number>;

  constructor(id: DeviceId, deviceType: DeviceType, model: string) {
    this._id = id;
    this._deviceType = deviceType;
    this._model = model;
    this._hostname = id.value;
    this._interfaces = new Map();
    this._vlans = new Set();
  }

  // ===== Getters =====

  get id(): DeviceId {
    return this._id;
  }

  get deviceType(): DeviceType {
    return this._deviceType;
  }

  get model(): string {
    return this._model;
  }

  get hostname(): string {
    return this._hostname;
  }

  get vlans(): ReadonlySet<number> {
    return this._vlans;
  }

  get interfaces(): ReadonlyMap<string, InterfaceEntity> {
    return this._interfaces;
  }

  get interfaceCount(): number {
    return this._interfaces.size;
  }

  // ===== Métodos de hostname =====

  /**
   * Configura el hostname del dispositivo
   */
  configureHostname(hostname: string): void {
    if (!hostname || hostname.trim().length === 0) {
      throw DomainError.invalidValue('hostname', hostname, 'cannot be empty');
    }
    if (hostname.length > 63) {
      throw DomainError.invalidValue('hostname', hostname, 'cannot exceed 63 characters');
    }
    this._hostname = hostname.trim();
  }

  // ===== Métodos de interfaces =====

  /**
   * Agrega una interfaz al dispositivo
   */
  addInterface(name: InterfaceName): InterfaceEntity {
    const key = name.value;
    if (this._interfaces.has(key)) {
      throw DomainError.conflict(
        `Interface "${key}" already exists on device "${this._hostname}"`,
        { deviceId: this._id.value, interfaceName: key }
      );
    }
    const iface = new InterfaceEntity(name);
    this._interfaces.set(key, iface);
    return iface;
  }

  /**
   * Remueve una interfaz del dispositivo
   */
  removeInterface(name: InterfaceName): void {
    const key = name.value;
    if (!this._interfaces.has(key)) {
      throw DomainError.notFound('Interface', key, { deviceId: this._id.value });
    }
    this._interfaces.delete(key);
  }

  /**
   * Obtiene una interfaz por nombre
   */
  getInterface(name: InterfaceName): InterfaceEntity | null {
    return this._interfaces.get(name.value) ?? null;
  }

  /**
   * Verifica si existe una interfaz con el nombre dado
   */
  hasInterface(name: InterfaceName): boolean {
    return this._interfaces.has(name.value);
  }

  // ===== Métodos de VLAN =====

  /**
   * Agrega una VLAN al dispositivo
   */
  addVlan(vlanId: number): void {
    if (vlanId < 1 || vlanId > 4094) {
      throw DomainError.invalidValue('VLAN ID', vlanId, 'must be between 1 and 4094');
    }
    this._vlans.add(vlanId);
  }

  /**
   * Remueve una VLAN del dispositivo
   */
  removeVlan(vlanId: number): void {
    if (vlanId === 1) {
      throw DomainError.notAllowed(
        'removeVlan',
        'VLAN 1 (default) cannot be removed'
      );
    }
    this._vlans.delete(vlanId);
  }

  /**
   * Verifica si una VLAN existe en el dispositivo
   */
  hasVlan(vlanId: number): boolean {
    return this._vlans.has(vlanId);
  }

  // ===== Validación =====

  /**
   * Valida las invariantes de la entidad
   */
  validate(): void {
    if (!DeviceId.isValid(this._id.value)) {
      throw DomainError.invariantViolation('Device has invalid ID');
    }
  }

  // ===== Serialización =====

  /**
   * Serializa el dispositivo a JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this._id.toJSON(),
      type: this._deviceType,
      model: this._model,
      hostname: this._hostname,
      interfaces: Array.from(this._interfaces.values()).map((i) => i.toJSON()),
      vlans: Array.from(this._vlans).sort((a, b) => a - b),
    };
  }
}
