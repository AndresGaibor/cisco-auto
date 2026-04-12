import type { DomainEvent } from '../../../shared/events/domain-event.interface.js';
import type { ConnectionPoint } from '../entities/link.entity.js';
import type { CableType } from '../entities/link.entity.js';

export interface TopologyCreatedEvent extends DomainEvent {
  topologyName: string;
}

export interface LinkCreatedEvent extends DomainEvent {
  linkId: string;
  sideA: ConnectionPoint;
  sideB: ConnectionPoint;
  cableType: CableType;
}

export interface LinkRemovedEvent extends DomainEvent {
  linkId: string;
}
