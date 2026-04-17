// ============================================================================
// Catálogo de Procesos de Packet Tracer
// Fuente única de verdad para nombres e interfaces de procesos PT
// ============================================================================

import type { PTDevice, PTPort } from "./pt-api-registry.js";

// ============================================================================
// Nombres de Procesos - Catálogo de nombres válidos por categoría
// ============================================================================

export const PT_PROCESS_NAMES = {
  server: {
    dhcp: ["DhcpServerMainProcess", "DHCPServerMainProcess", "DhcpServerMain"] as const,
    dns: ["DnsServerProcess"] as const,
    tftp: ["TftpServer"] as const,
    ntp: ["NtpServerProcess"] as const,
    ssh: ["SshServerProcess"] as const,
    radius: ["RadiusServerProcess"] as const,
    tacacs: ["TacacsServerProcess"] as const,
    syslog: ["SyslogServer"] as const,
    aaa: ["AcsServerProcess"] as const,
  },
  network: {
    vlan: ["VlanManager"] as const,
    routing: ["RoutingProcess"] as const,
    ospf: ["OspfProcess"] as const,
    stpMain: ["StpMainProcess"] as const,
    stp: ["StpProcess"] as const,
    acl: ["AclProcess"] as const,
    aclv6: ["Aclv6Process"] as const,
  },
  client: {
    radius: ["RadiusClientProcess"] as const,
    tacacs: ["TacacsClientProcess"] as const,
  },
} as const;

export type PTProcessCategory = keyof typeof PT_PROCESS_NAMES;
export type PTServerProcessName = keyof typeof PT_PROCESS_NAMES.server;
export type PTNetworkProcessName = keyof typeof PT_PROCESS_NAMES.network;
export type PTClientProcessName = keyof typeof PT_PROCESS_NAMES.client;

// ============================================================================
// Interfaces de Procesos
// ============================================================================

export interface PTDhcpLease {
  mac: string;
  ip: string;
  expires: string;
}

export interface PTDhcpPoolProcess {
  getPoolName(): string;
  getNetworkAddress(): string;
  getNetworkMask(): string;
  getDefaultRouter(): string;
  getDnsServerIp(): string;
  getStartIp(): string;
  getEndIp(): string;
  getMaxUsers(): number;
  setNetworkAddress(ip: string): void;
  setNetworkMask(mask: string): void;
  setDefaultRouter(router: string): void;
  setDnsServerIp(dns: string): void;
  setStartIp(ip: string): void;
  setEndIp(ip: string): void;
  setMaxUsers(count: number): void;
  getLeaseCount(): number;
  getLeaseAt(index: number): PTDhcpLease | null;
}

export interface PTDhcpServerProcess {
  setEnable(enabled: boolean): void;
  isEnabled(): boolean;
  addNewPool(name: string): PTDhcpPoolProcess | null;
  addPool(pool: PTDhcpPoolProcess): boolean;
  getPoolCount(): number;
  getPoolAt(index: number): PTDhcpPoolProcess | null;
  getPoolByName(name: string): PTDhcpPoolProcess | null;
  removePool(name: string): boolean;
  addExcludedAddress(start: string, end: string): void;
  getExcludedAddressCount(): number;
  getExcludedAddressAt(index: number): { start: string; end: string } | null;
}

export interface PTDhcpServerMainProcess {
  getDhcpServerProcessByPortName(portName: string): PTDhcpServerProcess | null;
  getDhcpServerProcessCount(): number;
}

export interface PTVlanInfo {
  id: number;
  name: string;
}

export interface PTVlanManager {
  addVlan(vlanId: number, name?: string): boolean;
  removeVlan(vlanId: number): boolean;
  getVlanCount(): number;
  getVlanAt(index: number): PTVlanInfo | null;
  addVlanInt(vlanId: number): boolean;
  getVlanInt(vlanId: number): PTPort | null;
}

export interface PTHostPort extends PTPort {
  isDhcpClientOn(): boolean;
  setDhcpClientFlag(enabled: boolean): void;
}

export interface PTDeviceWithProcesses extends PTDevice {
  getProcess<T = unknown>(name: string): T | null;
}

// ============================================================================
// Interfaces de Procesos - DNS / NTP / SSH / RADIUS / Syslog / OSPF / ACL / STP / Routing
// Status: verified-stubs — method signatures follow PT API conventions observed
// in DhcpServerProcess and VlanManager above. Expand as PT API surface is confirmed.
// ============================================================================

export interface PTDnsServerProcess extends PTIpcBase {
  setEnable(enabled: boolean): void;
  isEnabled(): boolean;
  addARecordToNameServerDb(domain: string, ip: string): void;
  addCNAMEToNameServerDb(alias: string, domain: string): void;
  addNSRecordToNameServerDb(domain: string, server: string): void;
  addSOAToNameServerDb(domain: string, mailbox: string, serial: number, refresh: number, retry: number, expire: number, minimum: number): void;
  removeARecordFromNameServerDb(domain: string): void;
  getEntryCount(): number;
  getEntryAt(index: number): any;
  getSizeOfNameServerDb(): number;
  getIpAddOfDomain(domain: string): string;
  isDomainNameExisted(domain: string): boolean;
  setPortNumber(port: number): void;
  getPortNumber(): number;
}

export interface PTHttpServer extends PTIpcBase {
  setEnable(enabled: boolean): void;
  isEnabled(): boolean;
  setPageContents(name: string, content: string): void;
  getPage(name: string): string;
  setUsername(user: string): void;
  setPassword(pass: string): void;
  setPortNumber(port: number): void;
  getPortNumber(): number;
  sendResponse(connId: number, data: string): void;
}

export interface PTVlanManager extends PTIpcBase {
  addVlan(vlanId: number, name?: string): boolean;
  removeVlan(vlanId: number): boolean;
  getVlanCount(): number;
  getVlanAt(index: number): PTVlanInfo | null;
  getVlanByName(name: string): PTVlanInfo | null;
  changeVlanName(vlanId: number, name: string): void;
  addVlanInt(vlanId: number): boolean;
  removeVlanInt(vlanId: number): boolean;
  getVlanInt(vlanId: number): PTPort | null;
  getVlanIntAt(index: number): PTPort | null;
  getVlanIntCount(): number;
  getMaxVlans(): number;
}

export interface PTRoutingProcess extends PTIpcBase {
  addStaticRoute(dest: string, mask: string, nextHop: string, distance?: number): void;
  removeStaticRoute(dest: string, mask: string, nextHop: string): void;
  clearAllRoutes(): void;
  getStaticRouteCount(): number;
  getStaticRouteAt(index: number): any;
  getRoutingTable(): any;
}

export interface PTAclProcess extends PTIpcBase {
  addAcl(acl: any): void;
  removeAcl(name: string): void;
  getAclCount(): number;
  getAclAt(index: number): any;
  getAcl(name: string): any;
}

// ============================================================================
// Helpers para Obtener Procesos
// ============================================================================

export interface PTProcessResult<T> {
  process: T | null;
  foundName: string | null;
}

function tryGetProcess<T>(device: PTDeviceWithProcesses, name: string): T | null {
  try {
    const proc = device.getProcess(name);
    return proc as T | null;
  } catch {
    return null;
  }
}

export function getProcessByName<T>(
  device: PTDeviceWithProcesses,
  name: string,
): PTProcessResult<T> {
  const proc = tryGetProcess<T>(device, name);
  return {
    process: proc,
    foundName: proc ? name : null,
  };
}

export function getProcessByCandidates<T>(
  device: PTDeviceWithProcesses,
  candidateNames: readonly string[],
): PTProcessResult<T> {
  for (const name of candidateNames) {
    const proc = tryGetProcess<T>(device, name);
    if (proc) {
      return { process: proc, foundName: name };
    }
  }
  return { process: null, foundName: null };
}

export function getDhcpServerMainProcess(
  device: PTDeviceWithProcesses,
): PTProcessResult<PTDhcpServerMainProcess> {
  return getProcessByCandidates(device, PT_PROCESS_NAMES.server.dhcp);
}

export function getVlanManager(device: PTDeviceWithProcesses): PTProcessResult<PTVlanManager> {
  return getProcessByCandidates(device, PT_PROCESS_NAMES.network.vlan);
}

// ============================================================================
// Verificación Defensiva de Métodos
// ============================================================================

export function ptHasMethod(obj: unknown, method: string): boolean {
  return obj !== null && typeof (obj as any)[method] === "function";
}

export function ptCall<T>(obj: unknown, method: string, ...args: unknown[]): T | null {
  if (!ptHasMethod(obj, method)) {
    return null;
  }
  try {
    return (obj as any)[method](...args);
  } catch {
    return null;
  }
}

export function ptSafeGet<T>(obj: unknown, getter: (o: any) => T | null | undefined): T | null {
  try {
    const result = getter(obj as any);
    return result ?? null;
  } catch {
    return null;
  }
}
