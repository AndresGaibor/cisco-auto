// ============================================================================
// Omniscience Environment Handlers - UI, Simulation, Host (ES5 Strict)
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers.js";

export function handleSetEnvironmentRules(payload: any, deps: HandlerDeps): HandlerResult {
  var opt = (deps.ipc.options as any) ? (deps.ipc.options as any)() : null;
  if (!opt) return { ok: false, error: "Options not available" };
  
  try {
    if (typeof payload.anim === "boolean" && opt.setAnimation) opt.setAnimation(payload.anim);
    if (typeof payload.sound === "boolean" && opt.setSound) opt.setSound(payload.sound);
    if (typeof payload.cli === "boolean" && opt.setCliTabHidden) opt.setCliTabHidden(payload.cli);
    if (typeof payload.cfg === "boolean" && opt.setConfigTabHidden) opt.setConfigTabHidden(payload.cfg);
    if (typeof payload.phy === "boolean" && opt.setPhysicalTabHidden) opt.setPhysicalTabHidden(payload.phy);
    if (typeof payload.desk === "boolean" && opt.setDesktopTabHidden) opt.setDesktopTabHidden(payload.desk);
    if (typeof payload.cableEffects === "boolean" && opt.setEnableCableLengthEffects) opt.setEnableCableLengthEffects(payload.cableEffects);
    
    if (payload.bg && opt.setWorkspaceBackgroundColor) {
        try { opt.setWorkspaceBackgroundColor(payload.bg.r, payload.bg.g, payload.bg.b); } catch(e) {}
    }
    
    return { ok: true, result: "ENVIRONMENT_UPDATED" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function handleWorkspaceVisuals(payload: { type: string, x: number, y: number, text: string }, deps: HandlerDeps): HandlerResult {
  var lw = deps.ipc.appWindow ? (deps.ipc.appWindow().getActiveWorkspace().getLogicalWorkspace() as any) : null;
  if (!lw) return { ok: false, error: "LogicalWorkspace not available" };
  try {
    if (payload.type === "note") {
        try { if (lw.addNote) lw.addNote(payload.x, payload.y, 100, payload.text); } 
        catch(e) { if (lw.addText) lw.addText(payload.text, payload.x, payload.y); }
    }
    return { ok: true, result: "VISUAL_ADDED" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function handleControlSimulation(payload: any, deps: HandlerDeps): HandlerResult {
  var sim = (deps.ipc as any).simulation ? (deps.ipc as any).simulation() : null;
  if (!sim) return { ok: false, error: "Simulation not available" };
  try {
    if (typeof payload.simulationMode === "boolean" && sim.setSimulationMode) sim.setSimulationMode(payload.simulationMode);
    if (payload.forward && sim.forward) sim.forward();
    if (payload.reset) {
        try { if (sim.resetEventList) sim.resetEventList(); } catch(e) {
            if (sim.setSimulationMode) {
              sim.setSimulationMode(false);
              sim.setSimulationMode(true);
            }
        }
    }
    return { ok: true, result: "SIMULATION_CONTROLLED" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function handleGetNetworkGenoma(payload: { deviceName?: string }, deps: HandlerDeps): HandlerResult {
  var net = deps.ipc.network();
  if (payload.deviceName) {
    var dev = net.getDevice(payload.deviceName) as any;
    if (!dev) return { ok: false, error: "Device not found" };
    try {
        return { ok: true, result: dev.serializeToXml ? dev.serializeToXml() : "" };
    } catch(e) { return { ok: false, error: String(e) }; }
  }
  try {
    return { ok: true, result: (net as any).serializeToXml ? (net as any).serializeToXml() : "" };
  } catch (e) {
    return { ok: false, error: "Global serialization blocked. Use deviceName.", code: "SERIALIZATION_RESTRICTED" };
  }
}

export function handleExfiltrateHostFile(payload: { path: string }, deps: HandlerDeps): HandlerResult {
  if (!deps.privileged) return { ok: false, error: "Privileged proxy missing" };
  try {
    var content = deps.privileged.getFileContents(payload.path);
    return { ok: true, result: content || "FILE_EMPTY_OR_NOT_FOUND" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function handleSkipBoot(payload: { deviceName: string }, deps: HandlerDeps): HandlerResult {
  var dev = deps.ipc.network().getDevice(payload.deviceName) as any;
  if (!dev) return { ok: false, error: "Device not found" };
  try {
    if (typeof dev.skipBoot === "function") {
        dev.skipBoot();
        return { ok: true, result: "BOOT_SKIPPED" };
    }
    return { ok: false, error: "Method not available" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
