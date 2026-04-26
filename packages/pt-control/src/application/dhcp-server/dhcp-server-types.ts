/**
 * DHCP Server Types
 *
 * Type definitions for DHCP server configuration and inspection.
 */

export interface DhcpPoolConfig {
  name: string;
  network: string;
  mask: string;
  router: string;
}

export interface DhcpServerConfig {
  enabled: boolean;
  port?: string;
  pools: Array<{
    name: string;
    network: string;
    mask: string;
    defaultRouter: string;
    dns?: string;
    startIp?: string;
    endIp?: string;
    maxUsers?: number;
  }>;
  excluded?: Array<{ start: string; end: string }>;
}

export interface DhcpServerApplyResult {
  device: string;
  enabled: boolean;
  port: string;
  pools: DhcpPoolConfig[];
  excludedRanges: string[];
}

export interface DhcpServerInspectResult {
  device: string;
  port: string;
  enabled: boolean;
  pools: Array<{
    name: string;
    network: string;
    mask: string;
    router: string;
    leases?: number;
  }>;
  excludedRanges: string[];
  activeLeases?: number;
}

export interface DhcpServerInspectRaw {
  ok: boolean;
  device: string;
  enabled: boolean;
  pools: Array<{
    name: string;
    network: string;
    mask: string;
    defaultRouter: string;
    dns?: string;
    startIp?: string;
    endIp?: string;
    maxUsers?: number;
    leaseCount: number;
    leases: Array<{ mac: string; ip: string; expires: string }>;
  }>;
  excludedAddresses: Array<{ start: string; end: string }>;
}

export type DhcpServerUseCaseResult<T> =
  | {
      ok: true;
      data: T;
      advice?: string[];
    }
  | {
      ok: false;
      error: {
        message: string;
        details?: Record<string, unknown>;
      };
    };
