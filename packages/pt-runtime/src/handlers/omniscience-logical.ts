// ============================================================================
// Omniscience Logical Handlers - L3+ and Assessment (ES5 Strict)
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers.js";

export function handleSiphonAllConfigs(_payload: any, deps: HandlerDeps): HandlerResult {
  var global = (deps as any).global;
  var am = global ? global.AssessmentModel : null;
  if (!am) {
    return { ok: false, error: "AssessmentModel not available", code: "NO_ASSESSMENT_MODEL" };
  }

  var net = deps.ipc.network();
  var count = net.getDeviceCount();
  var result = [];

  for (var i = 0; i < count; i++) {
    var dev = net.getDeviceAt(i) as any;
    if (!dev) continue;
    var name = dev.getName();
    try {
      var cfg = am.getRunningConfig(name);
      if (cfg) {
        result.push(String(name) + ":::" + String(cfg));
      }
    } catch (e) {}
  }

  return { ok: true, result: result.join("|||") };
}

export function handleGetAssessmentState(_payload: any, deps: HandlerDeps): HandlerResult {
  var global = (deps as any).global;
  var am = global ? global.AssessmentModel : null;
  if (!am) {
    return { ok: false, error: "AssessmentModel not available" };
  }

  try {
    var state = {
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
  var global = (deps as any).global;
  var am = global ? global.AssessmentModel : null;
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
  var global = (deps as any).global;
  var am = global ? global.AssessmentModel : null;
  if (!am) return { ok: false, error: "AssessmentModel not available" };

  try {
    if (typeof am.evaluateVariable === "function") {
        var val = am.evaluateVariable(payload.expr);
        return { ok: true, result: String(val) };
    }
    return { ok: false, error: "evaluateVariable method not found" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function handleGetActivityTreeXml(payload: { deviceName: string }, deps: HandlerDeps): HandlerResult {
  var dev = deps.ipc.network().getDevice(payload.deviceName) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  try {
    var xml = (typeof dev.activityTreeToXml === "function") ? dev.activityTreeToXml() : "";
    return { ok: true, result: String(xml) };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function handleExecIosOmni(payload: { deviceName: string, commands: string[] }, deps: HandlerDeps): HandlerResult {
  var dev = deps.ipc.network().getDevice(payload.deviceName) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  var cli = (typeof dev.getCommandLine === "function") ? dev.getCommandLine() : null;
  if (!cli) return { ok: false, error: "CLI not available" };

  try {
    var prompt = (typeof cli.getPrompt === "function") ? String(cli.getPrompt()) : "";
    if (prompt.indexOf("[yes/no]") !== -1) {
        if (cli.enterCommand) cli.enterCommand("no");
        if (cli.enterCommand) cli.enterCommand("");
    }

    for (var i = 0; i < payload.commands.length; i++) {
        if (cli.enterCommand) cli.enterCommand(String(payload.commands[i]));
    }

    return { ok: true, result: "Commands sent" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
