/**
 * Types Index - Backwards Compatibility Layer
 * 
 * @deprecated Import directly from @cisco-auto/types in new code
 * These re-exports are kept for backwards compatibility during migration
 * 
 * NOTE: DeviceType, CableType, LinkMedium are NOT re-exported here because
 * canonical/types.ts is the single source of truth for these types in core
 */

// Re-export common types (backwards compatible) - explicit to avoid conflicts
export {
  IPCidrSchema,
  IPAddressSchema,
  MACAddressSchema,
  type IPCidr,
  type IPAddress,
  type MACAddress,
} from '@cisco-auto/types';

// Re-export device types (backwards compatible) - explicit to avoid conflicts
// NOTE: DeviceType is NOT exported here - use canonical/types.ts instead
export {
  InterfaceTypeSchema,
  VLANSchema,
  InterfaceSchema,
  DeviceSchema,
  type InterfaceType,
  type VLAN,
  type Interface,
  type Device,
} from '@cisco-auto/types';

// Re-export protocol types (backwards compatible)
export { OSPFSchema, EIGRPSchema, VTPSchema } from '@cisco-auto/types';
export type { OSPF, EIGRP, VTP } from '@cisco-auto/types';

// Re-export security types (backwards compatible)
export { ACLSchema, NATSchema } from '@cisco-auto/types';
export type { ACL, NAT } from '@cisco-auto/types';

// Re-export lab types (backwards compatible) - explicit to include helper functions
export {
  ConnectionSchema,
  ValidationSchema,
  LabSchema,
  zodValidateLab,
  validateLabSafe,
  type Connection,
  type Validation,
  type Lab,
} from '@cisco-auto/types';

// Re-export tool types (backwards compatible)
export type {
  Tool,
  ToolInput,
  ToolResult,
  ToolHandler,
} from './tool.ts';

// Re-export topology types
export type {
  TopologyPlan,
  TopologyPlanParams,
  DevicePlan,
  LinkPlan,
  InterfacePlan,
  VLANPlan,
  DHCPPlan,
  RoutingPlan,
  ValidationError,
  ValidationWarning,
  FixSuggestion,
  FixAction,
  ValidationErrorType,
  ValidationWarningType,
  NetworkType,
  RoutingProtocol,
} from './topology-types';

// Re-export deploy types
export type {
  DeployedDevice,
  FailedDevice,
  DeploySummary,
} from './deploy-types';
