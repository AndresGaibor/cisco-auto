// PTServer, PTAsa, PTCloud, PTMcu, PTCloudSerialPort, PTCloudPotsPort, PTRoutedSwitchPort interfaces

import type { PTDevice } from "./device-api.js";
import type { PTPort } from "./port-api.js";

// ============================================================================
// Specialized Device interfaces
// ============================================================================

/**
 * Specialized Router Port API (132 methods)
 */
export interface PTRouterPort extends PTPort {
  // OSPF
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

  // EIGRP / RIP
  addEntryEigrpPassive(as: number, network: string, wildcard: string): void;
  removeEntryEigrpPassive(as: number, network: string, wildcard: string): void;
  isRipPassive(): boolean;
  setRipPassive(passive: boolean): void;
  isRipSplitHorizon(): boolean;
  setRipSplitHorizon(enabled: boolean): void;

  // IPv6 Advanced
  getIpv6Addresses(): string[];
  addIpv6Address(ip: string, prefix: number): void;
  removeIpv6Address(ip: string): void;
  removeAllIpv6Addresses(): void;
  getIpv6LinkLocal(): string;
  setIpv6LinkLocal(ip: string): void;
  isInIpv6Multicast(): boolean;

  // NAT & Security
  getNatMode(): number;
  setNatMode(mode: number): void;
  getAclInID(): string;
  setAclInID(id: string): void;
  getAclOutID(): string;
  setAclOutID(id: string): void;
  setZoneMemberName(name: string): void;
  getZoneMemberName(): string;

  // Hardware
  getClockRate(): number;
  setClockRate(rate: number): void;
  getBandwidthInfo(): any;
  setBandwidthInfo(bw: number, delay: number): void;
  isBandwidthAutoNegotiate(): boolean;
  setBandwidthAutoNegotiate(auto: boolean): void;
  isDuplexAutoNegotiate(): boolean;
  setDuplexAutoNegotiate(auto: boolean): void;
}

/**
 * Specialized Switch Port API (66 methods)
 */
export interface PTSwitchPort extends PTPort {
  // VLANs
  getAccessVlan(): number;
  setAccessVlan(vlanId: number): void;
  getNativeVlanId(): number;
  setNativeVlanId(vlanId: number): void;
  getVoipVlanId(): number;
  setVoipVlanId(vlanId: number): void;
  addTrunkVlans(vlans: number[]): void;
  removeTrunkVlans(vlans: number[]): void;

  // Port Mode
  isAccessPort(): boolean;
  isAdminModeSet(): boolean;
  isNonegotiate(): boolean;
  setNonegotiateFlag(enabled: boolean): void;

  // Security & Spanning Tree
  getPortSecurity(): any | null;
  getStpStatus?(): string;
}

/**
 * Specialized Host Port API (110 methods)
 */
export interface PTHostPort extends PTPort {
  // Host specific services could be added here from dump
}

/**
 * Multi-layer Switch Port (L2/L3)
 */
export interface PTRoutedSwitchPort extends PTSwitchPort, PTRouterPort {
  isRoutedPort(): boolean;
  setRoutedPort(routed: boolean): void;
}

/**
 * Specialized Server API
 */
export interface PTServer extends PTDevice {
  enableCip(): undefined; // [CONFIRMED];
  disableCip(): undefined; // [CONFIRMED];
  enableOpc(): undefined; // [CONFIRMED];
  disableOpc(): undefined; // [CONFIRMED];
  enableProfinet(): undefined; // [CONFIRMED];
  disableProfinet(): undefined; // [CONFIRMED];
  addProgrammingSerialOutputs(): void;
  clearProgrammingSerialOutputs(): undefined; // [CONFIRMED];

  // Area & UI
  getAreaLeftX(): number; // [CONFIRMED];
  getAreaTopY(): number; // [CONFIRMED];
  getAreaRightX(): number;
  getAreaBottomY(): number;
}

/**
 * Specialized ASA (Firewall) API
 */
export interface PTAsa extends PTDevice {
  addBookmark(name: string, url: string): void;
  removeBookmark(name: string): void;
  getBookmarkCount(): number;
  getWebvpnUserManager(): any;
  setHostName(name: string): void;
  setEnablePassword(pwd: string): void;
  setEnableSecret(secret: string): void;

  // Boot & System
  addBootSystem(path: string): void;
  clearBootSystem(): void;
  addUserPassEntry(user: string, pass: string, level: number): void;
  clearFtpPasswd(): undefined; // [CONFIRMED];
}

/**
 * Specialized Cloud API
 */
export interface PTCloud extends PTDevice {
  addPhoneConnection(port1: string, port2: string): void;
  addPortConnection(port1: string, port2: string): void;
  addSubLinkConnection(
    port1: string,
    vpi1: number,
    vci1: number,
    port2: string,
    vpi2: number,
    vci2: number,
  ): void;
  removePortConnection(port1: string, port2: string): void;
  removeAllPortConnection(): void;
  isDslConnection(): boolean;
}

/**
 * Specialized MCU / SBC (IoT) API
 */
export interface PTMcu extends PTDevice {
  analogWrite(pin: number, value: number): void;
  digitalWrite(pin: number, value: number): void;
  analogRead(pin: number): number;
  digitalRead(pin: number): number;
  getSlotsCount(): number;
  getAnalogSlotsCount(): number;
  getDigitalSlotsCount(): number;
  getComponentAtSlot(slot: number): any;
  getComponentByName(name: string): any;

  // IoT Advanced
  addSerialOutputs(pin: number, data: string): void;
  clearSerialOutputs(): void;
  enableIec61850(): void;
  disableIec61850(): void;
  enableGoosePublisherOnPort(portName: string): void;
  disableGoosePublisherOnPort(portName: string): void;
  setSubComponentIndex(index: number): void;
  getSubComponentIndex(): number;
}

/** Alias for SBC (matches MCU surface in PT) */
export type PTSbc = PTMcu;

export interface PTCloudSerialPort extends PTPort {
  addDlci(vpi: number, name: string): void;
  removeDlci(vpi: number): void;
  getDlciCount(): number;
  getDlciAt(index: number): number;
}

export interface PTCloudPotsPort extends PTPort {
  getPhoneNumber(): string;
  setPhoneNumber(num: string): void;
}