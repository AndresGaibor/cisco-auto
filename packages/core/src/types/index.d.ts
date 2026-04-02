/**
 * Types Index - Backwards Compatibility Layer
 *
 * @deprecated Import directly from @cisco-auto/types in new code
 * These re-exports are kept for backwards compatibility during migration
 *
 * NOTE: DeviceType, CableType, LinkMedium are NOT re-exported here because
 * canonical/types.ts is the single source of truth for these types in core
 */
export { IPCidrSchema, IPAddressSchema, MACAddressSchema, type IPCidr, type IPAddress, type MACAddress, } from '@cisco-auto/types';
export { InterfaceTypeSchema, VLANSchema, InterfaceSchema, DeviceSchema, type InterfaceType, type VLAN, type Interface, type Device, } from '@cisco-auto/types';
export { OSPFSchema, EIGRPSchema, VTPSchema } from '@cisco-auto/types';
export type { OSPF, EIGRP, VTP } from '@cisco-auto/types';
export { ACLSchema, NATSchema } from '@cisco-auto/types';
export type { ACL, NAT } from '@cisco-auto/types';
export { ConnectionSchema, ValidationSchema, LabSchema, zodValidateLab, validateLabSafe, type Connection, type Validation, type Lab, } from '@cisco-auto/types';
export type { Tool, ToolInput, ToolResult, ToolHandler, } from './tool.ts';
export type { TopologyPlan, TopologyPlanParams, DevicePlan, LinkPlan, InterfacePlan, VLANPlan, DHCPPlan, RoutingPlan, ValidationError, ValidationWarning, FixSuggestion, FixAction, ValidationErrorType, ValidationWarningType, NetworkType, RoutingProtocol, } from './topology-types';
export type { DeployedDevice, FailedDevice, DeploySummary, } from './deploy-types';
//# sourceMappingURL=index.d.ts.map