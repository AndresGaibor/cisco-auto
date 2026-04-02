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
export { IPCidrSchema, IPAddressSchema, MACAddressSchema, } from '@cisco-auto/types';
// Re-export device types (backwards compatible) - explicit to avoid conflicts
// NOTE: DeviceType is NOT exported here - use canonical/types.ts instead
export { InterfaceTypeSchema, VLANSchema, InterfaceSchema, DeviceSchema, } from '@cisco-auto/types';
// Re-export protocol types (backwards compatible)
export { OSPFSchema, EIGRPSchema, VTPSchema } from '@cisco-auto/types';
// Re-export security types (backwards compatible)
export { ACLSchema, NATSchema } from '@cisco-auto/types';
// Re-export lab types (backwards compatible) - explicit to include helper functions
export { ConnectionSchema, ValidationSchema, LabSchema, zodValidateLab, validateLabSafe, } from '@cisco-auto/types';
//# sourceMappingURL=index.js.map