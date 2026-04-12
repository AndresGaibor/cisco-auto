// Device ID Value Object
export {
  DeviceId,
  DeviceType,
} from './device-id.vo.js';

// VLAN ID Value Object
export {
  VlanId,
  MIN_VLAN_ID,
  MAX_VLAN_ID,
  parseVlanId,
  parseOptionalVlanId,
  isValidVlanId,
} from './vlan-id.vo.js';

// VLAN ID type (needs explicit type export)
export type { VlanType } from './vlan-id.vo.js';

// CIDR Prefix Value Object
export {
  CidrPrefix,
  parseCidrPrefix,
  isValidCidrPrefix,
} from './cidr-prefix.vo.js';

// IPv4 Address and Subnet Mask Value Objects
export {
  Ipv4Address,
  SubnetMask,
  parseIpv4Address,
  parseSubnetMask,
  isValidIpv4Address,
  isValidSubnetMask,
} from './ipv4-address.vo.js';

// Interface Name Value Object
export {
  InterfaceName,
  parseInterfaceName,
  parseOptionalInterfaceName,
  isValidInterfaceName,
} from './interface-name.vo.js';

// MAC Address Value Object
export {
  MacAddress,
  parseMacAddress,
  isValidMacAddress,
} from './mac-address.vo.js';

// MAC Address type (needs explicit type export)
export type { MacFormat } from './mac-address.vo.js';

// ASN (Autonomous System Number) Value Object
export {
  Asn,
  parseAsn,
  isValidAsn,
} from './asn.vo.js';

// Wildcard Mask Value Object
export {
  WildcardMask,
  parseWildcardMask,
  isValidWildcardMask,
} from './wildcard-mask.vo.js';

// Administrative Distance Value Object
export {
  AdministrativeDistance,
  WELL_KNOWN_AD,
  parseAdministrativeDistance,
  isValidAdministrativeDistance,
} from './administrative-distance.vo.js';

export type { WellKnownAdKey } from './administrative-distance.vo.js';

// Hostname Value Object
export {
  Hostname,
  parseHostname,
  parseOptionalHostname,
  isValidHostname,
} from './hostname.vo.js';

// VTP Types Value Objects
export {
  VtpMode,
  VtpVersion,
  VtpDomain,
  VtpPassword,
  parseVtpMode,
  parseVtpVersion,
  parseVtpDomain,
  parseOptionalVtpPassword,
} from './vtp-types.vo.js';

export type { VtpModeType, VtpVersionType } from './vtp-types.vo.js';

// Route Target Value Object
export {
  RouteTarget,
  parseRouteTarget,
  isValidRouteTarget,
} from './route-target.vo.js';

// Spanning Tree Priority Value Object
export {
  SpanningTreePriority,
  parseSpanningTreePriority,
  isValidSpanningTreePriority,
} from './spanning-tree-priority.vo.js';

export type { ValidPriority } from './spanning-tree-priority.vo.js';

// IP with Prefix Value Object
export {
  IpWithPrefix,
  parseIpWithPrefix,
  isValidIpWithPrefix,
} from './ip-with-prefix.vo.js';

// Lease Time Value Object
export {
  LeaseTime,
  parseLeaseTime,
  isValidLeaseTime,
} from './lease-time.vo.js';

// VLAN Name Value Object
export {
  VlanName,
  parseVlanName,
  parseOptionalVlanName,
  isValidVlanName,
} from './vlan-name.vo.js';

// VLAN Range Value Object
export {
  VlanRange,
  parseVlanRange,
  isValidVlanRange,
} from './vlan-range.vo.js';

// Interface Description Value Object
export {
  InterfaceDescription,
  parseInterfaceDescription,
  parseOptionalInterfaceDescription,
  isValidInterfaceDescription,
} from './interface-description.vo.js';

// Device Name Value Object
export {
  DeviceName,
  parseDeviceName,
  isValidDeviceName,
} from './device-name.vo.js';

// Port Name Value Object
export {
  PortName,
  parsePortName,
  isValidPortName,
} from './port-name.vo.js';

// Command ID Value Object
export {
  CommandId,
  parseCommandId,
  isValidCommandId,
  generateCommandId,
} from './command-id.vo.js';

// QoS Trust Value Object
export {
  QosTrust,
  parseQosTrust,
  isValidQosTrust,
} from './qos-trust.vo.js';

export type { QosTrustMode } from './qos-trust.vo.js';