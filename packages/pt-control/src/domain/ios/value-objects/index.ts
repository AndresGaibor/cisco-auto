// ============================================================================
// IOS Value Objects - Exports
// ============================================================================

export {
  InterfaceName,
  parseInterfaceName,
  isValidInterfaceName,
} from "./interface-name.js";

export {
  InterfaceDescription,
  parseInterfaceDescription,
} from "./interface-description.js";

export {
  VlanId,
  parseVlanId,
  isValidVlanId,
} from "./vlan-id.js";

export {
  Hostname,
  parseHostname,
  isValidHostname,
} from "./hostname.js";

export {
  Ipv4Address,
  parseIpv4Address,
  isValidIpv4Address,
} from "./ipv4-address.js";

export {
  SubnetMask,
  parseSubnetMask,
  isValidSubnetMask,
} from "./subnet-mask.js";

export {
  CidrPrefix,
  parseCidrPrefix,
  isValidCidrPrefix,
} from "./cidr-prefix.js";

export {
  RouteTarget,
  parseRouteTarget,
  isValidRouteTarget,
} from "./route-target.js";

export {
  DeviceName,
  parseDeviceName,
  isValidDeviceName,
} from "./device-name.js";

export {
  PortName,
  parsePortName,
  isValidPortName,
} from "./port-name.js";

export {
  CommandId,
  parseCommandId,
  isValidCommandId,
  generateCommandId,
} from "./command-id.js";

export {
  MacAddress,
  parseMacAddress,
  isValidMacAddress,
} from "./mac-address.js";

export {
  AdministrativeDistance,
  parseAdministrativeDistance,
  isValidAdministrativeDistance,
  WELL_KNOWN_AD,
  type WellKnownAdKey,
} from "./administrative-distance.js";

export {
  LeaseTime,
  parseLeaseTime,
  fromSeconds,
  standardEnterpriseLease,
  isValidLeaseTime,
} from "./lease-time.js";

export {
  QosTrust,
  parseQosTrust,
  isValidQosTrust,
  type QosTrustMode,
} from "./qos-trust.js";

export {
  SpanningTreePriority,
  parseSpanningTreePriority,
  isValidSpanningTreePriority,
  type ValidPriority,
} from "./spanning-tree-priority.js";

export {
  WildcardMask,
  parseWildcardMask,
  isValidWildcardMask,
} from "./wildcard-mask.js";

export {
  IpWithPrefix,
  parseIpWithPrefix,
  isValidIpWithPrefix,
} from "./ip-with-prefix.js";
