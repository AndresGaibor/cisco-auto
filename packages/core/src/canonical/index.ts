/**
 * CANONICAL MODEL - EXPORTS
 *
 * Este archivo exporta todos los tipos y factories del modelo canónico.
 * Importar desde aquí en todos los demás archivos.
 */

// Types (no conflicts expected)
export * from './types';

// Protocol types - single source of truth for protocol specs
export * from './protocol.spec';

// Device specs - only export device-specific types, NOT the protocol ones
// (the protocol types are already exported above from protocol.spec)
export type {
  InterfaceSpec,
  VLANSpec,
  VTPSpec,
  StaticRouteSpec,
  OSPFAreaSpec,
  OSPFSpec,
  EIGRPSpec,
  RoutingSpec,
  ACLRuleSpec,
  ACLSpec,
  NATPoolSpec,
  NATSpec,
  SecuritySpec,
  Layer2Spec,
  LineSpec,
  DeviceModelSpec,
  DeviceCredentialsSpec,
  DeviceSpec,
} from './device.spec';

export { DeviceSpecFactory } from './device.spec';

// Connection
export * from './connection.spec';

// Lab
export * from './lab.spec';
