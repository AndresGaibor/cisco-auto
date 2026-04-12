import { ValueObject } from '../../shared/base/value-object.base.js';
import { Aggregate } from '../../shared/base/aggregate.base.js';
import { LinkEntity, CableType } from '../entities/link.entity.js';
import type { ConnectionPoint } from '../entities/link.entity.js';
import { DomainError } from '../../shared/errors/domain.error.js';
import { createDomainEvent } from '../../shared/events/domain-event.interface.js';

interface LinkCreatedEvent {
  linkId: string;
  sideA: ConnectionPoint;
  sideB: ConnectionPoint;
  cableType: CableType;
}

interface LinkRemovedEvent {
  linkId: string;
}

interface TopologyCreatedEvent {
  topologyName: string;
}

interface TopologyId extends ValueObject<string> {}

class SimpleTopologyId extends ValueObject<string> implements TopologyId {
  static from(value: string): SimpleTopologyId {
    return new SimpleTopologyId(value);
  }
}

/**
 * Aggregate Root para el grafo de topología de red.
 *
 * Gestiona un conjunto de enlaces entre dispositivos y sus interfaces.
 * Valida invariantes como:
 * - No se puede conectar un dispositivo consigo mismo
 * - No se pueden crear enlaces duplicados
 * - Cada interfaz solo puede tener un enlace activo a la vez
 */
export class TopologyGraphAggregate extends Aggregate<SimpleTopologyId> {
  private readonly _links: Map<string, LinkEntity>;
  private readonly _name: string;

  constructor(id: SimpleTopologyId, name: string) {
    super(id);
    this._links = new Map();
    this._name = name;
    this.recordEvent(
      createDomainEvent<TopologyCreatedEvent>('TopologyCreated', id.value, { topologyName: name })
    );
  }

  // ===== Factory =====

  /**
   * Crea una nueva topología vacía
   */
  static create(name: string): TopologyGraphAggregate {
    const id = SimpleTopologyId.from(name.toLowerCase().replace(/\s+/g, '-'));
    return new TopologyGraphAggregate(id, name);
  }

  // ===== Getters =====

  get name(): string {
    return this._name;
  }

  get links(): ReadonlyMap<string, LinkEntity> {
    return this._links;
  }

  get linkCount(): number {
    return this._links.size;
  }

  get activeLinks(): LinkEntity[] {
    return Array.from(this._links.values()).filter((link) => link.active);
  }

  // ===== Métodos de enlaces =====

  /**
   * Agrega un enlace entre dos interfaces
   */
  addLink(sideA: ConnectionPoint, sideB: ConnectionPoint, cableType: CableType): LinkEntity {
    // Invariante: no conectar dispositivo consigo mismo en la misma interfaz
    if (
      sideA.deviceName === sideB.deviceName &&
      sideA.interfaceName === sideB.interfaceName
    ) {
      throw DomainError.invariantViolation(
        `Cannot connect ${sideA.deviceName}:${sideA.interfaceName} to itself`
      );
    }

    const tempLink = new LinkEntity(sideA, sideB, cableType);
    const linkId = tempLink.id;

    // Invariante: no crear enlaces duplicados
    if (this._links.has(linkId)) {
      throw DomainError.conflict(
        `Link already exists between ${sideA.deviceName}:${sideA.interfaceName} and ${sideB.deviceName}:${sideB.interfaceName}`,
        { linkId }
      );
    }

    // Invariante: cada interfaz solo puede tener un enlace activo
    const existingLink = this.findLinkByInterface(sideA.deviceName, sideA.interfaceName);
    if (existingLink && existingLink.active) {
      throw DomainError.conflict(
        `Interface ${sideA.deviceName}:${sideA.interfaceName} already has an active link`,
        { existingLinkId: existingLink.id }
      );
    }

    const link = new LinkEntity(sideA, sideB, cableType);
    this._links.set(linkId, link);
    this.recordEvent(
      createDomainEvent<LinkCreatedEvent>('LinkCreated', this._id.value, {
        linkId,
        sideA,
        sideB,
        cableType,
      })
    );
    return link;
  }

  /**
   * Remueve un enlace por su ID
   */
  removeLink(linkId: string): void {
    const link = this._links.get(linkId);
    if (!link) {
      throw DomainError.notFound('Link', linkId, { topologyName: this._name });
    }
    this._links.delete(linkId);
    this.recordEvent(
      createDomainEvent<LinkRemovedEvent>('LinkRemoved', this._id.value, { linkId })
    );
  }

  /**
   * Remueve un enlace por sus puntos de conexión
   */
  removeLinkByEndpoints(
    deviceName: string,
    interfaceName: string
  ): void {
    const link = this.findLinkByInterface(deviceName, interfaceName);
    if (!link) {
      throw DomainError.notFound(
        'Link',
        `${deviceName}:${interfaceName}`,
        { topologyName: this._name }
      );
    }
    this._links.delete(link.id);
    this.recordEvent(
      createDomainEvent<LinkRemovedEvent>('LinkRemoved', this._id.value, { linkId: link.id })
    );
  }

  /**
   * Busca un enlace que conecte con una interfaz específica
   */
  findLinkByInterface(deviceName: string, interfaceName: string): LinkEntity | null {
    for (const link of this._links.values()) {
      if (link.connectsToInterface(deviceName, interfaceName)) {
        return link;
      }
    }
    return null;
  }

  /**
   * Obtiene todos los enlaces de un dispositivo
   */
  getDeviceLinks(deviceName: string): LinkEntity[] {
    return Array.from(this._links.values()).filter((link) =>
      link.connectsToDevice(deviceName)
    );
  }

  /**
   * Obtiene los dispositivos conectados a un dispositivo dado
   */
  getConnectedDevices(deviceName: string): string[] {
    const connected = new Set<string>();
    for (const link of this._links.values()) {
      if (!link.active) continue;
      if (link.sideA.deviceName === deviceName) {
        connected.add(link.sideB.deviceName);
      } else if (link.sideB.deviceName === deviceName) {
        connected.add(link.sideA.deviceName);
      }
    }
    return Array.from(connected);
  }

  // ===== Validación =====

  /**
   * Valida las invariantes de la topología
   */
  validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw DomainError.invariantViolation('Topology name cannot be empty');
    }

    // Verificar que no haya interfaces duplicadas en enlaces activos
    const activeInterfaces = new Set<string>();
    for (const link of this._links.values()) {
      if (!link.active) continue;
      const keyA = `${link.sideA.deviceName}:${link.sideA.interfaceName}`;
      const keyB = `${link.sideB.deviceName}:${link.sideB.interfaceName}`;
      if (activeInterfaces.has(keyA) || activeInterfaces.has(keyB)) {
        throw DomainError.invariantViolation(
          `Duplicate interface in active links: ${keyA} or ${keyB}`
        );
      }
      activeInterfaces.add(keyA);
      activeInterfaces.add(keyB);
    }
  }

  // ===== Serialización =====

  toJSON(): Record<string, unknown> {
    return {
      id: this._id.value,
      name: this._name,
      links: Array.from(this._links.values()).map((l) => l.toJSON()),
      events: this.events.map((e) => e.type),
    };
  }
}
