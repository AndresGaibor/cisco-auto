// packages/pt-runtime/src/handlers/__tests__/mock-helpers.ts
// Helpers para construir dobles de prueba de HandlerDeps y PtRuntimeApi
// sin necesidad de un entorno PT real.

import type { HandlerDeps } from "../../utils/helpers.js";
import type { PtRuntimeApi } from "../../pt-api/pt-deps.js";

/**
 * Crea un HandlerDeps con todos los métodos como no-ops o stubs.
 * Se puede sobreescribir cualquier método vía `overrides`.
 */
export function makeHandlerDeps(
  overrides?: Partial<{
    getNet: any;
    getLW: any;
    dprint: any;
    getFM: any;
    getDeviceByName: any;
    getCommandLine: any;
    listDeviceNames: any;
    now: any;
  }>,
): HandlerDeps {
  const noop = () => {};
  const emptyNetwork: any = {
    getDevice: () => null,
    getDeviceAt: () => null,
    getDeviceCount: () => 0,
    getLinkAt: () => null,
    getLinkCount: () => 0,
  };
  const emptyWorkspace: any = {
    addDevice: () => null,
    removeDevice: () => false,
    deleteObject: () => false,
    createLink: () => null,
    autoConnectDevices: () => {},
    deleteLink: () => false,
  };

  const deps: HandlerDeps = {
    ipc: {} as any,
    privileged: null,
    global: null,
    DEV_DIR: "",
    getNet: overrides?.getNet ?? (() => emptyNetwork),
    getLW: overrides?.getLW ?? (() => emptyWorkspace),
    getFM: overrides?.getFM ?? (() => ({} as any)),
    dprint: overrides?.dprint ?? noop,
    getDeviceByName:
      overrides?.getDeviceByName ??
      (() => null),
    getCommandLine:
      overrides?.getCommandLine ??
      (() => null),
    listDeviceNames:
      overrides?.listDeviceNames ??
      (() => []),
    now: overrides?.now ?? (() => 0),
  };

  return deps;
}

/**
 * Crea un PtRuntimeApi con stubs seguros para tests de validación.
 * Por defecto: ningún dispositivo existe y network() retorna null.
 */
export function makePtRuntimeApi(
  overrides?: Partial<{
    getDeviceByName: any;
    getLW: any;
    getNet: any;
    getFM: any;
    getCommandLine: any;
    listDeviceNames: any;
    ipc: any;
    DEV_DIR: string;
    dprint: any;
    now: any;
  }>,
): PtRuntimeApi {
  const noop = () => {};
  const emptyNetwork: any = {
    getDevice: () => null,
    getDeviceAt: () => null,
    getDeviceCount: () => 0,
    getLinkAt: () => null,
    getLinkCount: () => 0,
  };
  const emptyWorkspace: any = {
    addDevice: () => null,
    removeDevice: () => false,
    deleteObject: () => false,
    createLink: () => null,
    autoConnectDevices: () => {},
    deleteLink: () => false,
  };
  const emptyIpc: any = overrides?.ipc ?? {
    network: () => null,
    appWindow: () => null,
    systemFileManager: () => null,
  };

  const api: any = {
    DEV_DIR: overrides?.DEV_DIR ?? "",
    ipc: emptyIpc,
    privileged: null,
    getLW: overrides?.getLW ?? (() => emptyWorkspace),
    getNet: overrides?.getNet ?? (() => emptyNetwork),
    getFM: overrides?.getFM ?? (() => ({} as any)),
    getCommandLine:
      overrides?.getCommandLine ??
      (() => null),
    listDeviceNames:
      overrides?.listDeviceNames ??
      (() => []),
    getDeviceByName:
      overrides?.getDeviceByName ??
      (() => null),
    listDevices: () => [],
    querySessionState: () => null,
    getWorkspace: () => null,
    now: overrides?.now ?? (() => 0),
    safeJsonClone: <T>(data: T): T => data,
    normalizePortName: (name: string) => name,
    dprint: overrides?.dprint ?? noop,
    createJob: () => "ticket-stub",
    advanceJob: noop,
    getJobState: () => null,
    getActiveJobs: () => [],
    jobPayload: () => null,
  };

  return api as PtRuntimeApi;
}
