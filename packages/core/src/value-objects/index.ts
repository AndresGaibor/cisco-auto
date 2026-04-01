/**
 * VLAN Value Objects - Exports
 *
 * Central export point for all VLAN-related value objects
 */

export {
  VlanId,
  VlanType,
  parseVlanId,
  parseOptionalVlanId,
  isValidVlanId,
} from './vlan-id.js';

export { VlanName, parseVlanName, parseOptionalVlanName, isValidVlanName } from './vlan-name.js';

export {
  VlanRange,
  parseVlanRange,
  isValidVlanRange,
} from './vlan-range.js';

export type {
  // VTP Mode
  VtpModeType,

  // VTP Version
  VtpVersionType,
} from './vtp-types.js';

export {
  // VTP Mode
  VtpMode,
  parseVtpMode,

  // VTP Version
  VtpVersion,
  parseVtpVersion,

  // VTP Domain
  VtpDomain,
  parseVtpDomain,

  // VTP Password
  VtpPassword,
  parseOptionalVtpPassword,
} from './vtp-types.js';
