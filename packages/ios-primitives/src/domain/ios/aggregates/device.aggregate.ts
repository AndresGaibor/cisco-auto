import { Aggregate } from '../../shared/base/aggregate.base.js';
import { DeviceId, DeviceType } from '../value-objects/device-id.vo.js';
import { InterfaceName } from '../value-objects/interface-name.vo.js';
import { VlanId } from '../value-objects/vlan-id.vo.js';
import { Ipv4Address, SubnetMask } from '../value-objects/ipv4-address.vo.js';
import { DeviceEntity } from '../entities/device.entity.js';
import { InterfaceEntity } from '../entities/interface.entity.js';
import { DomainError } from '../../shared/errors/domain.error.js';
import { createDomainEvent } from '../../shared/events/domain-event.interface.js';
import type {
  DeviceAddedEvent,
  InterfaceAddedEvent,
  InterfaceConfiguredEvent,
  InterfaceEnabledEvent,
  InterfaceDisabledEvent,
  VlanConfiguredEvent,
  InterfaceRemovedEvent,
  DeviceRenamedEvent,
} from '../events/ios.events.js';

/**
 * Aggregate Root para dispositivos IOS.
 *
 * Encapsula una DeviceEntity y gestiona:
 * - Invariantes del dispositivo (nombre único de interfaces, al menos una interfaz)
 * - Recopilación de eventos de dominio
 * - Delegación de operaciones a la entidad interna
 */
export class DeviceAggregate extends Aggregate<DeviceId> {
  private readonly _device: DeviceEntity;

  /**
   * @param id - Identificador único del dispositivo
   * @param deviceType - Tipo de dispositivo (router, switch, etc.)
   * @param model - Modelo específico del dispositivo
   */
  constructor(id: DeviceId, deviceType: DeviceType, model: string) {
    super(id);
    this._device = new DeviceEntity(id, deviceType, model);
  }

  // ===== Factory =====

  /**
   * Crea un nuevo dispositivo y registra el evento DeviceAdded.
   * 
   * @param id - Identificador único del dispositivo
   * @param deviceType - Tipo de dispositivo
   * @param model - Modelo del dispositivo
   * @returns Nueva instancia del aggregate
   */
  static create(id: DeviceId, deviceType: DeviceType, model: string): DeviceAggregate {
    const aggregate = new DeviceAggregate(id, deviceType, model);
    aggregate.recordEvent(
      createDomainEvent<DeviceAddedEvent>('DeviceAdded', id.value, {
        deviceName: id.value,
        deviceType,
        model,
      })
    );
    return aggregate;
  }

  // ===== Getters delegados =====

  get device(): DeviceEntity {
    return this._device;
  }

  get interfaces(): ReadonlyMap<string, InterfaceEntity> {
    return this._device.interfaces;
  }

  get interfaceCount(): number {
    return this._device.interfaceCount;
  }

  // ===== Métodos de hostname =====

  /**
   * Renombra el dispositivo y registra el evento DeviceRenamed.
   * 
   * @param newHostname - Nuevo nombre del dispositivo
   * @throws DomainError si el hostname es inválido
   */
  rename(newHostname: string): void {
    const oldName = this._device.hostname;
    if (oldName === newHostname) return;

    this._device.configureHostname(newHostname);
    this.recordEvent(
      createDomainEvent<DeviceRenamedEvent>('DeviceRenamed', this._id.value, {
        oldName,
        newName: newHostname,
      })
    );
  }

  // ===== Métodos de interfaces =====

  /**
   * Agrega una interfaz al dispositivo y registra InterfaceAdded.
   * 
   * @param name - Nombre de la interfaz (ej: GigabitEthernet0/0)
   * @returns La entidad de interfaz creada
   */
  addInterface(name: InterfaceName): InterfaceEntity {
    const iface = this._device.addInterface(name);
    this.recordEvent(
      createDomainEvent<InterfaceAddedEvent>('InterfaceAdded', this._id.value, {
        deviceName: this._device.hostname,
        interfaceName: name.value,
      })
    );
    return iface;
  }

  /**
   * Remueve una interfaz del dispositivo y registra InterfaceRemoved.
   * No permite remover si es la última interfaz.
   * 
   * @param name - Nombre de la interfaz a remover
   * @throws DomainError si es la última interfaz
   */
  removeInterface(name: InterfaceName): void {
    if (this._device.interfaceCount <= 1) {
      throw DomainError.invariantViolation(
        `Cannot remove interface "${name.value}": device must have at least one interface`
      );
    }
    this._device.removeInterface(name);
    this.recordEvent(
      createDomainEvent<InterfaceRemovedEvent>('InterfaceRemoved', this._id.value, {
        deviceName: this._device.hostname,
        interfaceName: name.value,
      })
    );
  }

  /**
   * Obtiene una interfaz por nombre.
   * 
   * @param name - Nombre de la interfaz
   * @returns La interfaz si existe, null si no
   */
  getInterface(name: InterfaceName): InterfaceEntity | null {
    return this._device.getInterface(name);
  }

  /**
   * Configura IP en una interfaz existente y registra InterfaceConfigured.
   * 
   * @param interfaceName - Nombre de la interfaz
   * @param ip - Dirección IP a asignar
   * @param mask - Máscara de subred
   * @throws DomainError.notFound si la interfaz no existe
   */
  configureInterfaceIp(interfaceName: InterfaceName, ip: Ipv4Address, mask: SubnetMask): void {
    const iface = this._device.getInterface(interfaceName);
    if (!iface) {
      throw DomainError.notFound('Interface', interfaceName.value, {
        deviceId: this._id.value,
      });
    }
    iface.assignIp(ip, mask);
    this.recordEvent(
      createDomainEvent<InterfaceConfiguredEvent>('InterfaceConfigured', this._id.value, {
        deviceName: this._device.hostname,
        interfaceName: interfaceName.value,
        ipAddress: ip.value,
        subnetMask: mask.value,
      })
    );
  }

  /**
   * Habilita una interfaz
   */
  enableInterface(name: InterfaceName): void {
    const iface = this._device.getInterface(name);
    if (!iface) {
      throw DomainError.notFound('Interface', name.value, { deviceId: this._id.value });
    }
    iface.enable();
    this.recordEvent(
      createDomainEvent<InterfaceEnabledEvent>('InterfaceEnabled', this._id.value, {
        deviceName: this._device.hostname,
        interfaceName: name.value,
      })
    );
  }

  /**
   * Deshabilita una interfaz
   */
  disableInterface(name: InterfaceName): void {
    const iface = this._device.getInterface(name);
    if (!iface) {
      throw DomainError.notFound('Interface', name.value, { deviceId: this._id.value });
    }
    iface.disable();
    this.recordEvent(
      createDomainEvent<InterfaceDisabledEvent>('InterfaceDisabled', this._id.value, {
        deviceName: this._device.hostname,
        interfaceName: name.value,
      })
    );
  }

  // ===== Métodos de VLAN =====

  /**
   * Agrega una VLAN al dispositivo
   */
  addVlan(vlan: VlanId): void {
    this._device.addVlan(vlan.value);
    this.recordEvent(
      createDomainEvent<VlanConfiguredEvent>('VlanConfigured', this._id.value, {
        deviceName: this._device.hostname,
        interfaceName: '*',
        vlanId: vlan.value,
      })
    );
  }

  /**
   * Remueve una VLAN del dispositivo
   */
  removeVlan(vlan: VlanId): void {
    this._device.removeVlan(vlan.value);
  }

  /**
   * Configura una interfaz como access VLAN
   */
  setInterfaceAccessVlan(interfaceName: InterfaceName, vlan: VlanId): void {
    const iface = this._device.getInterface(interfaceName);
    if (!iface) {
      throw DomainError.notFound('Interface', interfaceName.value, {
        deviceId: this._id.value,
      });
    }
    iface.setAccessVlan(vlan);
  }

  /**
   * Configura una interfaz como trunk.
   * 
   * @param interfaceName - Nombre de la interfaz
   * @param nativeVlan - VLAN nativa (opcional, default 1)
   * @throws DomainError.notFound si la interfaz no existe
   */
  setInterfaceTrunk(interfaceName: InterfaceName, nativeVlan?: VlanId): void {
    const iface = this._device.getInterface(interfaceName);
    if (!iface) {
      throw DomainError.notFound('Interface', interfaceName.value, {
        deviceId: this._id.value,
      });
    }
    iface.setTrunk(nativeVlan);
  }

  // ===== Validación =====

  /**
   * Valida las invariantes del aggregate
   */
  validate(): void {
    this._device.validate();

    if (this._device.interfaceCount === 0) {
      throw DomainError.invariantViolation(
        `Device "${this._device.hostname}" must have at least one interface`
      );
    }
  }

  // ===== Serialización =====

  toJSON(): Record<string, unknown> {
    return {
      ...this._device.toJSON(),
      events: this.events.map((e) => e.type),
    };
  }
}
