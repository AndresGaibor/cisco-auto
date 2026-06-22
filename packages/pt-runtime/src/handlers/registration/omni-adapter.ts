import type { RuntimeApi } from "../../runtime/contracts";
import type { PtDeps } from "../../pt-api/pt-deps";
import type { PtResult } from "../../pt-api/pt-results";
import { registerHandler } from "../dispatcher";
import type { HandlerFn } from "../dispatcher";

import {
  handleSetEnvironmentRules,
  handleWorkspaceVisuals,
  handleControlSimulation,
  handleGetNetworkGenoma,
  handleExfiltrateHostFile,
  handleSkipBoot,
} from "../omniscience-environment";

import {
  handleSiphonAllConfigs,
  handleGetAssessmentState,
  handleSetInstructionPanel,
  handleEvaluateInternalVariable,
  handleGetActivityTreeXml,
  handleExecIosOmni,
} from "../omniscience-logical";

import {
  handleSiphonPhysicalTopology,
  handleGetDeviceHardwareInfo,
  handleGetPortDeepStats,
} from "../omniscience-physical";

import {
  handleSiphonDesktopApps,
  handleSiphonActiveProcesses,
  handleIsDesktopReady,
} from "../omniscience-telepathy";

import {
  handleKVStore,
  handleBase64,
  handleCryptoUtils,
} from "../omniscience-utils";

function runtimeApiToPtDeps(api: RuntimeApi): PtDeps {
  return {
    ipc: api.ipc,
    privileged: api.privileged,
    get global(): any {
      try {
        return Function("return this")();
      } catch {
        return {};
      }
    },
    DEV_DIR: api.DEV_DIR,
    getLW: function () { return api.getLW(); },
    getNet: function () { return api.getNet(); },
    getFM: function () { return api.getFM(); },
    dprint: function (msg: string) { api.dprint(msg); },
    getDeviceByName: function (name: string) { return api.getDeviceByName(name); },
    getCommandLine: function (deviceName: string) { return api.getCommandLine(deviceName); },
    listDeviceNames: function () { return api.listDeviceNames(); },
    now: function () { return api.now(); },
  };
}

function adapt(fn: (payload: any, deps: PtDeps) => PtResult): HandlerFn {
  return function adaptedHandler(
    payload: Record<string, unknown>,
    api: RuntimeApi,
  ): PtResult {
    return fn(payload, runtimeApiToPtDeps(api));
  };
}

var REGISTERED = false;

export function registerOmniHandlers(): void {
  if (REGISTERED) return;
  REGISTERED = true;

  var handlers: Array<[string, (payload: any, deps: PtDeps) => PtResult]> = [
    ["omni.setEnvironmentRules", handleSetEnvironmentRules],
    ["omni.workspaceVisuals", handleWorkspaceVisuals],
    ["omni.controlSimulation", handleControlSimulation],
    ["omni.getNetworkGenoma", handleGetNetworkGenoma],
    ["omni.exfiltrateHostFile", handleExfiltrateHostFile],
    ["omni.skipBoot", handleSkipBoot],
    ["omni.siphonAllConfigs", handleSiphonAllConfigs],
    ["omni.getAssessmentState", handleGetAssessmentState],
    ["omni.setInstructionPanel", handleSetInstructionPanel],
    ["omni.evaluateInternalVariable", handleEvaluateInternalVariable],
    ["omni.getActivityTreeXml", handleGetActivityTreeXml],
    ["omni.execIos", handleExecIosOmni],
    ["omni.siphonPhysicalTopology", handleSiphonPhysicalTopology],
    ["omni.getDeviceHardwareInfo", handleGetDeviceHardwareInfo],
    ["omni.getPortDeepStats", handleGetPortDeepStats],
    ["omni.siphonDesktopApps", handleSiphonDesktopApps],
    ["omni.siphonActiveProcesses", handleSiphonActiveProcesses],
    ["omni.isDesktopReady", handleIsDesktopReady],
    ["omni.kvStore", handleKVStore],
    ["omni.base64", handleBase64],
    ["omni.crypto", handleCryptoUtils],
  ];

  for (var i = 0; i < handlers.length; i++) {
    registerHandler(handlers[i][0], adapt(handlers[i][1]));
  }
}
