// ============================================================================
// Omniscience Logical Handlers - L3+ and Assessment (Sync)
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers.js";
import {
  buildDeferredConfigPlan,
  startDeferredJobOrError,
} from "./deferred-job-factory.js";

export function handleSiphonAllConfigs(_payload: any, deps: HandlerDeps): HandlerResult {
  const global = (deps as any).global;
  const am = global ? global.AssessmentModel : null;
  if (!am) {
    return { ok: false, error: "AssessmentModel not available", code: "NO_ASSESSMENT_MODEL" };
  }

  const net = deps.ipc.network();
  const count = net.getDeviceCount();
  const result = [];

  for (let i = 0; i < count; i++) {
    const dev = net.getDeviceAt(i) as any;
    if (!dev) continue;
    const name = dev.getName();
    try {
      const cfg = am.getRunningConfig(name);
      if (cfg) {
        result.push(String(name) + ":::" + String(cfg));
      }
    } catch (e) {}
  }

  return { ok: true, result: result.join("|||") };
}

export function handleGetAssessmentState(_payload: any, deps: HandlerDeps): HandlerResult {
  const global = (deps as any).global;
  const am = global ? global.AssessmentModel : null;
  if (!am) {
    return { ok: false, error: "AssessmentModel not available" };
  }

  try {
    const state = {
      totalItems: (typeof am.getTotalItemCountByComponent === "function") ? am.getTotalItemCountByComponent("all") : 0,
      correctItems: (typeof am.getCorrectItemCountByComponent === "function") ? am.getCorrectItemCountByComponent("all") : 0,
      points: (typeof am.getPointsByComponent === "function") ? am.getPointsByComponent("all") : 0,
      timeElapsed: (typeof am.getTimeElapsed === "function") ? am.getTimeElapsed() : 0,
      peakId: (typeof am.peakAssessmentItemID === "function") ? String(am.peakAssessmentItemID()) : ""
    };
    return { ok: true, result: state };
  } catch (e) {
    return { ok: false, error: "Assessment Error: " + String(e) };
  }
}

export function handleSetInstructionPanel(payload: { html: string }, deps: HandlerDeps): HandlerResult {
  const global = (deps as any).global;
  const am = global ? global.AssessmentModel : null;
  if (!am) return { ok: false, error: "AssessmentModel not available" };

  try {
    if (typeof am.setInstruction === "function") {
        am.setInstruction(payload.html);
        return { ok: true, result: "Instructions updated" };
    }
    return { ok: false, error: "setInstruction method not found" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function handleEvaluateInternalVariable(payload: { expr: string }, deps: HandlerDeps): HandlerResult {
  const global = (deps as any).global;
  const am = global ? global.AssessmentModel : null;
  if (!am) return { ok: false, error: "AssessmentModel not available" };

  try {
    if (typeof am.evaluateVariable === "function") {
        const val = am.evaluateVariable(payload.expr);
        return { ok: true, result: String(val) };
    }
    return { ok: false, error: "evaluateVariable method not found" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function handleGetActivityTreeXml(payload: { deviceName: string }, deps: HandlerDeps): HandlerResult {
  const dev = deps.ipc.network().getDevice(payload.deviceName) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  try {
    const xml = (typeof dev.activityTreeToXml === "function") ? dev.activityTreeToXml() : "";
    return { ok: true, result: String(xml) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function handleExecIosOmni(
  payload: { deviceName: string, commands: string[] },
  deps: HandlerDeps,
): HandlerResult {
  const deviceName = payload.deviceName;
  const dev = deps.ipc.network().getDevice(deviceName) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  if (!dev.getCommandLine || !dev.getCommandLine()) {
    return { ok: false, error: "CLI not available" };
  }

  try {
    const plan = buildDeferredConfigPlan(deviceName, {
      commands: payload.commands,
      save: false,
      stopOnError: true,
      ensurePrivileged: true,
      dismissInitialDialog: true,
      commandTimeoutMs: 10000,
      stallTimeoutMs: 5000,
      closeSession: false,
    });

    return startDeferredJobOrError(plan, deps as any) as any;
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}