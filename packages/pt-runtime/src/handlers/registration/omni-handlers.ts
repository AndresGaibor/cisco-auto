import type { HandlerFn } from "../dispatcher.js";
import { registerHandler } from "../dispatcher.js";

import {
  handleSiphonPhysicalTopology,
  handleGetDeviceHardwareInfo,
  handleGetPortDeepStats,
} from "../omniscience-physical.js";

import {
  handleSiphonAllConfigs,
  handleGetAssessmentState,
  handleSetInstructionPanel,
  handleEvaluateInternalVariable,
  handleGetActivityTreeXml,
  handleExecIosOmni,
} from "../omniscience-logical.js";

import {
  handleSetEnvironmentRules,
  handleControlSimulation,
  handleGetNetworkGenoma,
  handleExfiltrateHostFile,
  handleSkipBoot,
  handleWorkspaceVisuals,
} from "../omniscience-environment.js";

import {
  handleSiphonDesktopApps,
  handleSiphonActiveProcesses,
  handleIsDesktopReady,
} from "../omniscience-telepathy.js";

import {
  handleKVStore,
  handleBase64,
  handleCryptoUtils,
} from "../omniscience-utils.js";

let omniHandlersRegistered = false;

/**
 * Handlers omniscience/unsafe.
 *
 * Estos handlers son opt-in. No deben formar parte del runtime estable porque:
 * - inspeccionan estado interno amplio,
 * - manipulan entorno,
 * - exponen utilidades generales,
 * - o dependen de APIs no esenciales para flujos normales.
 */
export function registerOmniRuntimeHandlers(): void {
  if (omniHandlersRegistered) {
    return;
  }

  omniHandlersRegistered = true;

  registerHandler("omni.physical.siphon", handleSiphonPhysicalTopology as unknown as HandlerFn);
  registerHandler("omni.logical.siphonConfigs", handleSiphonAllConfigs as unknown as HandlerFn);

  registerHandler("getDeviceHardwareInfo", handleGetDeviceHardwareInfo as unknown as HandlerFn);
  registerHandler("getPortDeepStats", handleGetPortDeepStats as unknown as HandlerFn);

  registerHandler("siphonAllConfigs", handleSiphonAllConfigs as unknown as HandlerFn);
  registerHandler("getAssessmentState", handleGetAssessmentState as unknown as HandlerFn);
  registerHandler("setInstructionPanel", handleSetInstructionPanel as unknown as HandlerFn);
  registerHandler("evaluateInternalVariable", handleEvaluateInternalVariable as unknown as HandlerFn);
  registerHandler("getActivityTreeXml", handleGetActivityTreeXml as unknown as HandlerFn);
  registerHandler("execIosOmni", handleExecIosOmni as unknown as HandlerFn);

  registerHandler("setEnvironmentRules", handleSetEnvironmentRules as unknown as HandlerFn);
  registerHandler("controlSimulation", handleControlSimulation as unknown as HandlerFn);
  registerHandler("getNetworkGenoma", handleGetNetworkGenoma as unknown as HandlerFn);
  registerHandler("exfiltrateHostFile", handleExfiltrateHostFile as unknown as HandlerFn);
  registerHandler("skipBoot", handleSkipBoot as unknown as HandlerFn);
  registerHandler("workspaceVisuals", handleWorkspaceVisuals as unknown as HandlerFn);

  registerHandler("siphonDesktopApps", handleSiphonDesktopApps as unknown as HandlerFn);
  registerHandler("siphonActiveProcesses", handleSiphonActiveProcesses as unknown as HandlerFn);
  registerHandler("isDesktopReady", handleIsDesktopReady as unknown as HandlerFn);

  registerHandler("kvStore", handleKVStore as unknown as HandlerFn);
  registerHandler("base64", handleBase64 as unknown as HandlerFn);
  registerHandler("cryptoUtils", handleCryptoUtils as unknown as HandlerFn);
}
