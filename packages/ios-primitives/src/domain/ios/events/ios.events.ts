import type { DomainEvent } from '../../shared/events/domain-event.interface.js';

// ===== Device Events =====

export interface DeviceAddedEvent extends DomainEvent {
  deviceName: string;
  deviceType: string;
  model: string;
}

export interface DeviceRemovedEvent extends DomainEvent {
  deviceName: string;
}

export interface DeviceRenamedEvent extends DomainEvent {
  oldName: string;
  newName: string;
}

// ===== Interface Events =====

export interface InterfaceAddedEvent extends DomainEvent {
  deviceName: string;
  interfaceName: string;
}

export interface InterfaceConfiguredEvent extends DomainEvent {
  deviceName: string;
  interfaceName: string;
  ipAddress: string;
  subnetMask: string;
}

export interface InterfaceEnabledEvent extends DomainEvent {
  deviceName: string;
  interfaceName: string;
}

export interface InterfaceDisabledEvent extends DomainEvent {
  deviceName: string;
  interfaceName: string;
}

export interface VlanConfiguredEvent extends DomainEvent {
  deviceName: string;
  interfaceName: string;
  vlanId: number;
}

export interface InterfaceRemovedEvent extends DomainEvent {
  deviceName: string;
  interfaceName: string;
}
