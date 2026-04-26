// PTPort interface — base port for all device ports

import type { PTIpcBase } from "./ipc-base.js";

// Forward declarations to break circular imports within registry
interface PTLink {}
interface PTDevice {}

/**
 * Base port interface for all device ports in Packet Tracer.
 */
export interface PTPort extends PTIpcBase {
  getName(): string; // [CONFIRMED];
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

  // Physical & Hardware (Deep API)
  getLightStatus(): number;
  getBandwidth(): number;
  setBandwidth(kbps: number): void;
  getBia(): string; // [CONFIRMED];
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
  getType(): number; // [CONFIRMED];
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

  // Legacy / Context
  getConnectorType?(): string;
  getDelay?(): number;
  setDelay?(delay: number): void;
  getOwnerDevice?(): PTDevice | null;
}