import type {
  PTAppWindow,
  PTCommandLine,
  PTFileManager,
  PTGlobalScope,
  PTIpc,
  PTLogicalWorkspace,
  PTNetwork,
  PTDevice,
} from "./pt-api-registry.js";
import type { RuntimeApi, DeviceRef, SessionStateSnapshot } from "../runtime/contracts.js";

export interface PtDeps {
  readonly ipc: PTIpc;
  getLW(): PTLogicalWorkspace;
  getNet(): PTNetwork;
  getFM(): PTFileManager;
  dprint(message: string): void;
  readonly DEV_DIR: string;
  getDeviceByName(name: string): PTDevice | null;
  getCommandLine(deviceName: string): PTCommandLine | null;
  listDeviceNames(): string[];
  now(): number;
}

export interface JobStateSnapshot {
  ticket: string;
  device: string;
  state: string;
  currentStep: number;
  totalSteps: number;
  done: boolean;
  error: string | null;
  errorCode: string | null;
  output: string;
  result: unknown;
}

export interface PtDeferredDeps extends PtDeps {
  querySessionState(deviceName: string): SessionStateSnapshot | null;
  createJob(plan: unknown): string;
  getJobState(ticket: string): JobStateSnapshot | null;
  getActiveJobs(): JobStateSnapshot[];
}

export interface PtRuntimeApi extends RuntimeApi {
  getDeviceByName(name: string): DeviceRef | null;
  getLW(): import("./pt-api-registry.js").PTLogicalWorkspace;
  getNet(): import("./pt-api-registry.js").PTNetwork;
  getFM(): import("./pt-api-registry.js").PTFileManager;
  readonly DEV_DIR: string;
  getCommandLine(deviceName: string): import("./pt-api-registry.js").PTCommandLine | null;
  listDeviceNames(): string[];
  readonly ipc: import("./pt-api-registry.js").PTIpc;
}

export function createPtDepsFromGlobals(scope: PTGlobalScope): PtDeps {
  return {
    ipc: scope.ipc,
    getLW: () => scope.ipc.appWindow().getActiveWorkspace().getLogicalWorkspace(),
    getNet: () => scope.ipc.network(),
    getFM: () => scope.ipc.systemFileManager(),
    dprint: scope.dprint,
    DEV_DIR: scope.DEV_DIR,
    getDeviceByName: (name) => scope.ipc.network().getDevice(name),
    getCommandLine: (deviceName) =>
      scope.ipc.network().getDevice(deviceName)?.getCommandLine?.() ?? null,
    listDeviceNames: () => {
      const net = scope.ipc.network();
      const names: string[] = [];
      for (let i = 0; i < net.getDeviceCount(); i++) {
        const device = net.getDeviceAt(i);
        if (device) names.push(device.getName());
      }
      return names;
    },
    now: () => Date.now(),
  };
}
