// ============================================================================
// Runtime Helpers - Re-exports from modularized helpers
// ============================================================================

export { normalizePortKey, normalizeIfaceName, normalizeMac } from "./port-utils.js";
export { getDevicePortNames, resolveDevicePortName, collectPorts } from "./device-utils.js";
export {
  resolveModel,
  getDeviceTypeForModel,
  getDeviceTypeCandidates,
  createDeviceWithFallback,
  getDeviceTypeString,
  type CreateDeviceResult,
} from "./device-creation.js";
export {
  HandlerErrorCode,
  makeHandlerError,
  type HandlerError as HandlerErrorType,
  type HandlerErrorCode as HandlerErrorCodeType,
  type HandlerDeps,
  type HandlerResult,
} from "./handler-types.js";

// ============================================================================
// Re-export types from pt-api-registry
// ============================================================================

export type {
  PTLogicalWorkspace,
  PTNetwork,
  PTDevice,
  PTPort,
  PTCommandLine,
  PTLink,
  PTIpc,
  PTAppWindow,
  PTWorkspace,
  PTFileManager,
  PTGlobalScope,
} from "../pt-api/pt-api-registry.js";

export {
  PT_API_METHOD_INDEX,
  PT_DEVICE_TYPE_CONSTANTS,
  PT_CABLE_TYPE_CONSTANTS,
} from "../pt-api/pt-api-registry.js";

// ============================================================================
// Re-export types from pt-processes
// ============================================================================

import type {
  PTDhcpServerMainProcess,
  PTDhcpServerProcess,
  PTDhcpPoolProcess,
  PTDhcpLease,
  PTVlanManager,
  PTDeviceWithProcesses,
} from "../pt-api/pt-processes.js";

import type { PTHostPort } from "../pt-api/pt-api-registry.js";

export type {
  PTDhcpServerMainProcess,
  PTDhcpServerProcess,
  PTDhcpPoolProcess,
  PTDhcpLease,
  PTVlanManager,
  PTHostPort,
  PTDeviceWithProcesses,
};

export { PT_PROCESS_NAMES } from "../pt-api/pt-processes.js";

export {
  getProcessByName,
  getProcessByCandidates,
  getDhcpServerMainProcess,
  getVlanManager,
  ptHasMethod,
  ptSafeGet,
} from "../pt-api/pt-processes.js";

// ============================================================================
// Tipos de extensión PT - mantienen backward compatibility interna
// ============================================================================

import type { PTDevice as PTDeviceBase } from "../pt-api/pt-api-registry.js";

/** Port interface extendido con métodos adicionales para backward compatibility */
export interface PTPortExtended {
  getName(): string;
  getIpAddress(): string;
  getSubnetMask(): string;
  getMacAddress(): string;
  getDefaultGateway(): string;
  setIpSubnetMask(ip: string, mask: string): void;
  setDefaultGateway(gw: string): void;
  setDnsServerIp(dns: string): void;
  setDhcpEnabled(enabled: boolean): void;
  getLink(): unknown;
}

/** PC/Server device interface with DHCP flag (PT official API) */
export interface PTPcLikeDevice extends PTDeviceBase {
  setDhcpFlag(enabled: boolean): void;
  getDhcpFlag(): boolean;
}

/** Router Port interface (extends HostPort for IP config) (PT official API) */
export interface PTRouterPort extends PTHostPort {}
