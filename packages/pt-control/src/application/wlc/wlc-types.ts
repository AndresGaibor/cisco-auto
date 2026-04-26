/**
 * WLC Types - Tipos para Wireless LAN Controller
 */

export interface WlcDeviceState {
  name: string;
  model: string;
  powered: boolean;
  portsUp: string[];
  portsDown: string[];
  ip?: string;
}

export interface WlcNetworkSetupResult {
  success: boolean;
  configured: string[];
  errors: string[];
}

export interface WlcDeviceStatusResult {
  devices: WlcDeviceState[];
  allPowered: boolean;
  allConnected: boolean;
}

export interface WlcIpConfigResult {
  ip: string;
  mask: string;
  gateway: string;
}

export type WlcUseCaseResult<T> =
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