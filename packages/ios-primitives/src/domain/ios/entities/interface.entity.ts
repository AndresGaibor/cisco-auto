import { ValueObject } from '../../shared/base/value-object.base.js';
import { InterfaceName } from '../value-objects/interface-name.vo.js';
import { Ipv4Address } from '../value-objects/ipv4-address.vo.js';
import { SubnetMask } from '../value-objects/ipv4-address.vo.js';
import { MacAddress } from '../value-objects/mac-address.vo.js';
import { VlanId } from '../value-objects/vlan-id.vo.js';
import { DomainError } from '../../shared/errors/domain.error.js';

/**
 * Estado operativo de una interfaz
 */
export enum InterfaceStatus {
  UP = 'up',
  DOWN = 'down',
  ADMIN_DOWN = 'administratively_down',
}

/**
 * Modo de operación de una interfaz de switch
 */
export enum SwitchportMode {
  ACCESS = 'access',
  TRUNK = 'trunk',
  NONE = 'none',
}

/**
 * Entidad que representa una interfaz de red de un dispositivo IOS.
 *
 * Encapsula el comportamiento relacionado con la configuración
 * de interfaces: asignación de IPs, estado, modo switchport, VLANs.
 */
export class InterfaceEntity {
  private readonly _name: InterfaceName;
  private _status: InterfaceStatus;
  private _ipAddress: Ipv4Address | null;
  private _subnetMask: SubnetMask | null;
  private _macAddress: MacAddress | null;
  private _switchportMode: SwitchportMode;
  private _accessVlan: VlanId | null;
  private _nativeVlan: VlanId | null;
  private _allowedVlans: Set<number> | null;

  constructor(name: InterfaceName) {
    this._name = name;
    this._status = InterfaceStatus.ADMIN_DOWN;
    this._ipAddress = null;
    this._subnetMask = null;
    this._macAddress = null;
    this._switchportMode = SwitchportMode.NONE;
    this._accessVlan = null;
    this._nativeVlan = null;
    this._allowedVlans = null;
  }

  // ===== Getters =====

  get name(): InterfaceName {
    return this._name;
  }

  get status(): InterfaceStatus {
    return this._status;
  }

  get ipAddress(): Ipv4Address | null {
    return this._ipAddress;
  }

  get subnetMask(): SubnetMask | null {
    return this._subnetMask;
  }

  get macAddress(): MacAddress | null {
    return this._macAddress;
  }

  get switchportMode(): SwitchportMode {
    return this._switchportMode;
  }

  get accessVlan(): VlanId | null {
    return this._accessVlan;
  }

  get nativeVlan(): VlanId | null {
    return this._nativeVlan;
  }

  get isUp(): boolean {
    return this._status === InterfaceStatus.UP;
  }

  get hasIpConfigured(): boolean {
    return this._ipAddress !== null;
  }

  // ===== Métodos de configuración IP =====

  /**
   * Asigna una dirección IP y máscara de subred a la interfaz
   */
  assignIp(ipAddress: Ipv4Address, subnetMask: SubnetMask): void {
    this._ipAddress = ipAddress;
    this._subnetMask = subnetMask;
  }

  /**
   * Remueve la configuración IP de la interfaz
   */
  removeIp(): void {
    this._ipAddress = null;
    this._subnetMask = null;
  }

  // ===== Métodos de estado =====

  /**
   * Habilita la interfaz (no shutdown)
   */
  enable(): void {
    this._status = InterfaceStatus.UP;
  }

  /**
   * Deshabilita la interfaz (shutdown)
   */
  disable(): void {
    this._status = InterfaceStatus.ADMIN_DOWN;
  }

  /**
   * Establece la dirección MAC de la interfaz
   */
  setMacAddress(mac: MacAddress): void {
    this._macAddress = mac;
  }

  // ===== Métodos de switchport =====

  /**
   * Configura la interfaz como trunk
   */
  setTrunk(nativeVlan?: VlanId): void {
    this._switchportMode = SwitchportMode.TRUNK;
    this._nativeVlan = nativeVlan || new VlanId(1);
    this._allowedVlans = null; // Todas las VLANs permitidas por defecto
  }

  /**
   * Configura la interfaz como access en una VLAN específica
   */
  setAccessVlan(vlan: VlanId): void {
    this._switchportMode = SwitchportMode.ACCESS;
    this._accessVlan = vlan;
  }

  /**
   * Remueve la configuración de switchport (modo routed)
   */
  setRouted(): void {
    this._switchportMode = SwitchportMode.NONE;
    this._accessVlan = null;
    this._nativeVlan = null;
    this._allowedVlans = null;
  }

  /**
   * Configura VLANs permitidas en modo trunk
   */
  setAllowedVlans(vlans: number[]): void {
    if (this._switchportMode !== SwitchportMode.TRUNK) {
      throw DomainError.notAllowed(
        'setAllowedVlans',
        'interface is not in trunk mode'
      );
    }
    this._allowedVlans = new Set(vlans);
  }

  // ===== Serialización =====

  /**
   * Serializa la interfaz a JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this._name.value,
      status: this._status,
      ipAddress: this._ipAddress?.toJSON() ?? null,
      subnetMask: this._subnetMask?.toJSON() ?? null,
      macAddress: this._macAddress?.toJSON() ?? null,
      switchportMode: this._switchportMode,
      accessVlan: this._accessVlan?.toJSON() ?? null,
      nativeVlan: this._nativeVlan?.toJSON() ?? null,
    };
  }
}
