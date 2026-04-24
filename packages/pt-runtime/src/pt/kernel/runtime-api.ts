// packages/pt-runtime/src/pt/kernel/runtime-api.ts
// Factory para el objeto RuntimeApi inyectado en los handlers del runtime

import type { RuntimeApi, DeviceRef, DeferredJobPlan } from "../../runtime/contracts";
import type { KernelSubsystems } from "./kernel-lifecycle";
import type { KernelState } from "./kernel-state";
import { toKernelJobState, type ActiveJob } from "./execution-engine";
import type { PTNetwork } from "../../pt-api/pt-api-registry.js";

export function createRuntimeApi(subsystems: KernelSubsystems): RuntimeApi {
  const scope = (typeof self !== "undefined" ? self : Function("return this")()) as any;
  const ipc = scope.ipc;
  const net = ipc?.network?.() as PTNetwork | null;
  const { executionEngine, terminal, subsystems: subs } = getDependencies(subsystems);

  return {
    ipc: ipc as any,
    privileged: scope._ScriptModule || null,
    getDeviceByName: function (name: string): DeviceRef | null {
      const dev = net && net.getDevice ? net.getDevice(name) : null;
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
      if (!net) return [];
      const names: string[] = [];
      const count = net.getDeviceCount ? net.getDeviceCount() : 0;
      for (let i = 0; i < count; i++) {
        const dev = net.getDeviceAt ? net.getDeviceAt(i) : null;
        if (dev) names.push((dev as any).getName());
      }
      return names;
    },
    querySessionState: function (deviceName: string) {
      return terminal.getSession(deviceName);
    },
    getWorkspace: function () {
      return (
        ipc &&
        ipc.appWindow &&
        ipc.appWindow() &&
        ipc.appWindow().getActiveWorkspace &&
        ipc.appWindow().getActiveWorkspace().getLogicalWorkspace &&
        ipc.appWindow().getActiveWorkspace().getLogicalWorkspace()
      );
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
    dprint: function (msg: string) {
      try {
        const scope = (typeof self !== "undefined" ? self : Function("return this")()) as any;
        const appWindow = scope.ipc && scope.ipc.appWindow ? scope.ipc.appWindow() : null;
        if (appWindow && typeof appWindow.writeToPT === "function") {
          appWindow.writeToPT("[runtime] " + msg + "\n");
        }
      } catch {}
      try {
        dprint("[runtime] " + msg);
      } catch {}
    },
    createJob: function (plan: DeferredJobPlan): string {
      return executionEngine.startJob(plan).id;
    },
    getJobState: function (id: string) {
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
