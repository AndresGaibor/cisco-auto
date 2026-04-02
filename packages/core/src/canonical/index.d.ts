/**
 * CANONICAL MODEL - EXPORTS
 *
 * Este archivo exporta todos los tipos y factories del modelo canónico.
 * Importar desde aquí en todos los demás archivos.
 */
export * from './types';
export * from './protocol.spec';
export type { InterfaceSpec, VLANSpec, VTPSpec, StaticRouteSpec, OSPFAreaSpec, OSPFSpec, EIGRPSpec, RoutingSpec, ACLRuleSpec, ACLSpec, NATPoolSpec, NATSpec, SecuritySpec, Layer2Spec, LineSpec, DeviceModelSpec, DeviceCredentialsSpec, DeviceSpec, } from './device.spec';
export { DeviceSpecFactory } from './device.spec';
export * from './connection.spec';
export * from './lab.spec';
//# sourceMappingURL=index.d.ts.map