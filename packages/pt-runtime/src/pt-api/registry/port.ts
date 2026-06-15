// Tipos de puerto (Packet Tracer)
// Puertos de dispositivos: router, switch, host, cloud

import type { PTIpcBase } from "./ipc-base.js";

// Forward declarations para evitar dependencias circulares
interface PTLink {}
interface PTDevice {}

// ============================================================================
// Port interfaces
// ============================================================================

export interface PTPort extends PTIpcBase {
  getName(): string;
  getIpAddress(): string;
  getSubnetMask(): string;
  getMacAddress(): string;
  setIpSubnetMask(ip: string, mask: string): void;
  getDefaultGateway(): string;
  setDefaultGateway(gateway: string): void;
  getDnsServerIp(): string;
  setDnsServerIp(dns: string): void;
  setDhcpEnabled(enabled: boolean): void;
  setDhcpClientFlag(enabled: boolean): void;
  isDhcpClientOn(): boolean;
  setIpv6Enabled(enabled: boolean): void;
  getIpv6Enabled(): boolean;
  getIpv6Address(): string;
  setIpv6AddressAutoConfig(enabled: boolean): void;
  setv6DefaultGateway(gateway: string): void;
  getv6DefaultGateway(): string;
  setv6ServerIp(dns: string): void;
  getv6ServerIp(): string;
  setIpv6Mtu(mtu: number): void;
  getIpv6Mtu(): number;
  isPortUp(): boolean;
  isProtocolUp(): boolean;
  isPowerOn(): boolean;
  setPower(on: boolean): void;
  getLightStatus(): number;
  getBandwidth(): number;
  setBandwidth(kbps: number): void;
  getBia(): string;
  getChannel(): number;
  setChannel(chan: number): void;
  getClockRate(): number;
  setClockRate(rate: number): void;
  getDescription(): string;
  setDescription(desc: string): void;
  getHardwareQueue(): any;
  getQosQueue(): any;
  getEncapProcess(): any;
  getKeepAliveProcess(): any;
  getHigherProcessCount(): number;
  getRemotePortName(): string;
  getTerminalTypeShortString(): string;
  getType(): number;
  isAutoCross(): boolean;
  isBandwidthAutoNegotiate(): boolean;
  setBandwidthAutoNegotiate(auto: boolean): void;
  isDuplexAutoNegotiate(): boolean;
  setDuplexAutoNegotiate(auto: boolean): void;
  isEthernetPort(): boolean;
  isFullDuplex(): boolean;
  setFullDuplex(full: boolean): void;
  isStraightPins(): boolean;
  isWirelessPort(): boolean;
  getLink(): PTLink | null;
  deleteLink(): void;
  getConnectorType?(): string;
  getDelay?(): number;
  setDelay?(delay: number): void;
  getOwnerDevice?(): PTDevice | null;
}

/** Router port interface */
export interface PTRouterPort extends PTPort {
  getOspfCost(): number;
  setOspfCost(cost: number): void;
  getOspfPriority(): number;
  setOspfPriority(prio: number): void;
  getOspfHelloInterval(): number;
  setOspfHelloInterval(ms: number): void;
  getOspfDeadInterval(): number;
  setOspfDeadInterval(ms: number): void;
  getOspfAuthKey(): string;
  setOspfAuthKey(key: string): void;
  getOspfAuthType(): number;
  addOspfMd5Key(keyId: number, key: string): void;
  removeOspfMd5Key(keyId: number): void;
  addEntryEigrpPassive(as: number, network: string, wildcard: string): void;
  removeEntryEigrpPassive(as: number, network: string, wildcard: string): void;
  isRipPassive(): boolean;
  setRipPassive(passive: boolean): void;
  isRipSplitHorizon(): boolean;
  setRipSplitHorizon(enabled: boolean): void;
  getIpv6Addresses(): string[];
  addIpv6Address(ip: string, prefix: number): void;
  removeIpv6Address(ip: string): void;
  removeAllIpv6Addresses(): void;
  getIpv6LinkLocal(): string;
  setIpv6LinkLocal(ip: string): void;
  isInIpv6Multicast(): boolean;
  getNatMode(): number;
  setNatMode(mode: number): void;
  getAclInID(): string;
  setAclInID(id: string): void;
  getAclOutID(): string;
  setAclOutID(id: string): void;
  setZoneMemberName(name: string): void;
  getZoneMemberName(): string;
  getClockRate(): number;
  setClockRate(rate: number): void;
  getBandwidthInfo(): any;
  setBandwidthInfo(bw: number, delay: number): void;
  isBandwidthAutoNegotiate(): boolean;
  setBandwidthAutoNegotiate(auto: boolean): void;
  isDuplexAutoNegotiate(): boolean;
  setDuplexAutoNegotiate(auto: boolean): void;
}

/** Switch port interface */
export interface PTSwitchPort extends PTPort {
  getAccessVlan(): number;
  setAccessVlan(vlanId: number): void;
  getNativeVlanId(): number;
  setNativeVlanId(vlanId: number): void;
  getVoipVlanId(): number;
  setVoipVlanId(vlanId: number): void;
  addTrunkVlans(vlans: number[]): void;
  removeTrunkVlans(vlans: number[]): void;
  isAccessPort(): boolean;
  isAdminModeSet(): boolean;
  isNonegotiate(): boolean;
  setNonegotiateFlag(enabled: boolean): void;
  getPortSecurity(): any | null;
  getStpStatus?(): string;
}

/** Host port interface */
export interface PTHostPort extends PTPort {}

/** Multi-layer switch port (L2/L3) */
export interface PTRoutedSwitchPort extends PTSwitchPort, PTRouterPort {
  isRoutedPort(): boolean;
  setRoutedPort(routed: boolean): void;
}

/** Cloud serial port interface */
export interface PTCloudSerialPort extends PTPort {
  addDlci(vpi: number, name: string): void;
  removeDlci(vpi: number): void;
  getDlciCount(): number;
  getDlciAt(index: number): number;
}

/** Cloud POTS port interface */
export interface PTCloudPotsPort extends PTPort {
  getPhoneNumber(): string;
  setPhoneNumber(num: string): void;
}