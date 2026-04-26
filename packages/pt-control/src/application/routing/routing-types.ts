/**
 * Routing Types
 *
 * Interfaces for routing configuration inputs and results.
 */

import type { RoutingConfigInput } from '@cisco-auto/kernel/plugins/routing';

export type { RoutingConfigInput };

export interface OspfConfig {
  processId: number;
  routerId?: string;
  areas: Array<{
    areaId: number | string;
    networks: Array<{ network: string; wildcard: string }>;
  }>;
  passiveInterfaces?: string[];
}

export interface EigrpConfig {
  asNumber: number;
  routerId?: string;
  networks: string[];
  passiveInterfaces?: string[];
}

export interface BgpConfig {
  asn: number;
  routerId?: string;
  neighbors: Array<{
    ip: string;
    remoteAs: number;
    description?: string;
    nextHopSelf?: boolean;
  }>;
  networks?: Array<{ network: string; mask?: string }>;
}

export interface StaticRouteConfig {
  network: string;
  mask: string;
  nextHop: string;
  administrativeDistance?: number;
}

export interface RoutingUseCaseResult<T> {
  ok: true;
  data: T;
  advice?: string[];
}

export interface RoutingUseCaseError {
  ok: false;
  error: {
    message: string;
    details?: Record<string, unknown>;
  };
}

export type RoutingResult<T> = RoutingUseCaseResult<T> | RoutingUseCaseError;
