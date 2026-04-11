// ============================================================================
// IOS Value Objects - Exports
// ============================================================================

export {
  InterfaceName,
  parseInterfaceName,
  isValidInterfaceName,
} from "./interface-name.ts";

export {
  InterfaceDescription,
  parseInterfaceDescription,
} from "./interface-description.ts";

export {
  VlanId,
  VlanType,
  parseVlanId,
  parseOptionalVlanId,
  isValidVlanId,
} from "./vlan-id.ts";

export {
  VlanName,
  parseVlanName,
  parseOptionalVlanName,
  isValidVlanName,
} from "./vlan-name.ts";

export {
  VlanRange,
  parseVlanRange,
  isValidVlanRange,
} from "./vlan-range.ts";

export {
  VtpMode,
  VtpDomain,
  VtpPassword,
  VtpVersion,
  parseVtpMode,
  parseVtpDomain,
  parseOptionalVtpPassword,
  parseVtpVersion,
  type VtpModeType,
  type VtpVersionType,
} from "./vtp-types.ts";

export {
  Hostname,
  parseHostname,
  isValidHostname,
} from "./hostname.ts";

export {
  Ipv4Address,
  parseIpv4Address,
  isValidIpv4Address,
} from "./ipv4-address.ts";

export {
  SubnetMask,
  parseSubnetMask,
  isValidSubnetMask,
} from "./subnet-mask.ts";

export {
  CidrPrefix,
  parseCidrPrefix,
  isValidCidrPrefix,
} from "./cidr-prefix.ts";

export {
  RouteTarget,
  parseRouteTarget,
  isValidRouteTarget,
} from "./route-target.ts";

export {
  DeviceName,
  parseDeviceName,
  isValidDeviceName,
} from "./device-name.ts";

export {
  PortName,
  parsePortName,
  isValidPortName,
} from "./port-name.ts";

export {
  CommandId,
  parseCommandId,
  isValidCommandId,
  generateCommandId,
} from "./command-id.ts";

export {
  MacAddress,
  parseMacAddress,
  isValidMacAddress,
} from "./mac-address.ts";

export {
  AdministrativeDistance,
  parseAdministrativeDistance,
  isValidAdministrativeDistance,
  WELL_KNOWN_AD,
  type WellKnownAdKey,
} from "./administrative-distance.ts";

export {
  LeaseTime,
  parseLeaseTime,
  fromSeconds,
  standardEnterpriseLease,
  isValidLeaseTime,
} from "./lease-time.ts";

export {
  QosTrust,
  parseQosTrust,
  isValidQosTrust,
  type QosTrustMode,
} from "./qos-trust.ts";

export {
  SpanningTreePriority,
  parseSpanningTreePriority,
  isValidSpanningTreePriority,
  type ValidPriority,
} from "./spanning-tree-priority.ts";

export {
  WildcardMask,
  parseWildcardMask,
  isValidWildcardMask,
} from "./wildcard-mask.ts";

export {
  IpWithPrefix,
  parseIpWithPrefix,
  isValidIpWithPrefix,
} from "./ip-with-prefix.ts";
