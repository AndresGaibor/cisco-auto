// packages/pt-runtime/src/pt/kernel/runtime-api.ts
// Factory para el objeto RuntimeApi inyectado en los handlers del runtime

import type { RuntimeApi, DeviceRef, DeferredJobPlan } from "../../runtime/contracts";
import type { KernelSubsystems } from "./kernel-lifecycle";
import type { KernelState } from "./kernel-state";
import { toKernelJobState, type ActiveJob } from "./execution-engine";
import type { PTFileManager, PTLogicalWorkspace, PTNetwork, PTCommandLine } from "../../pt-api/pt-api-registry.js";

export function createRuntimeApi(subsystems: KernelSubsystems): RuntimeApi {
  const scope = (typeof self !== "undefined" ? self : Function("return this")()) as any;
  const ipc = scope.ipc;
  const { executionEngine, terminal, subsystems: subs } = getDependencies(subsystems);

  function getNet(): PTNetwork {
    return ipc.network() as PTNetwork;
  }

  function getLW(): any {
    return ipc.appWindow().getActiveWorkspace().getLogicalWorkspace() as unknown as PTLogicalWorkspace;
  }

  function getFM(): any {
    return ipc.systemFileManager() as unknown as PTFileManager;
  }

  function safeDprint(msg: string): void {
    try {
      const appWindow = ipc && ipc.appWindow ? ipc.appWindow() : null;
      if (appWindow && typeof appWindow.writeToPT === "function") {
        appWindow.writeToPT("[runtime] " + msg + "\n");
      }
    } catch {
      // Ignorar fallos de escritura en PT Debug.
    }

    try {
      dprint("[runtime] " + msg);
    } catch {
      // Ignorar fallos del logger nativo.
    }
  }

  return {
    ipc: ipc as any,
    privileged: scope._ScriptModule || null,
    DEV_DIR: scope.DEV_DIR,
    getLW,
    getNet,
    getFM,
    getDeviceByName: function (name: string): DeviceRef | null {
      const net = getNet();
      const dev = net && typeof net.getDevice === "function" ? (net.getDevice(name) as any) : null;
      if (!dev) return null;
      const term = (dev as any).getCommandLine ? (dev as any).getCommandLine() : null;
      const res: any = dev;
      res.hasTerminal = !!term;
      res.getTerminal = function () {
        return term as any;
      };
      res.getNetwork = function () {
        return net as any;
      };
      return res as unknown as DeviceRef;
    },
    listDevices: function (): string[] {
      const net = getNet();
      const names: string[] = [];
      const count = net && typeof net.getDeviceCount === "function" ? net.getDeviceCount() : 0;
      for (let i = 0; i < count; i++) {
        const dev = typeof net.getDeviceAt === "function" ? net.getDeviceAt(i) : null;
        if (dev && typeof (dev as any).getName === "function") names.push(String((dev as any).getName()));
      }
      return names;
    },
    getCommandLine: function (deviceName: string): PTCommandLine | null {
      const device = this.getDeviceByName(deviceName) as any;
      if (!device || typeof device.getCommandLine !== "function") return null;
      return device.getCommandLine() ?? null;
    },
    listDeviceNames: function (): string[] {
      return this.listDevices();
    },
    querySessionState: function (deviceName: string) {
      return terminal.getSession(deviceName);
    },
    getWorkspace: function () {
      return getLW();
    },
    now: function () {
      return Date.now();
    },
    safeJsonClone: function (data: any) {
      try {
        return JSON.parse(JSON.stringify(data));
      } catch (e) {
        return data;
      }
    },
    normalizePortName: function (name: string) {
      return String(name || "")
        .replace(/\s+/g, "")
        .toLowerCase();
    },
    dprint: safeDprint,
    createJob: function (plan: DeferredJobPlan): string {
      return executionEngine.startJob(plan).id;
    },
    getJobState: function (id: string) {
      const ctx =
        typeof (executionEngine as any).getJobState === "function"
          ? (executionEngine as any).getJobState(id)
          : null;

      if (ctx) {
        return toKernelJobState(ctx);
      }

      const job = executionEngine.getJob(id);
      return job ? toKernelJobState(job.context) : null;
    },
    getActiveJobs: function (): Array<{ id: string; device: string; finished: boolean; state: string }> {
      return executionEngine.getActiveJobs().map(function (j: ActiveJob) {
        return {
          id: j.id,
          device: j.device,
          finished: executionEngine.isJobFinished(j.id),
          state: j.context.phase,
        };
      });
    },
    jobPayload: function (id: string) {
      const job = executionEngine.getJob(id);
      if (!job) return null;
      return job.context.plan.payload || null;
    },
  };
}

function getDependencies(subsystems: KernelSubsystems) {
  return {
    executionEngine: (subsystems as any).executionEngine,
    terminal: (subsystems as any).terminal,
    subsystems: subsystems,
  };
}

declare var dprint: (msg: string) => void;
