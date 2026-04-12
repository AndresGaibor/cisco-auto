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