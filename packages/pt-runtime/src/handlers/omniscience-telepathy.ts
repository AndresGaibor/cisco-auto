// ============================================================================
// Omniscience Telepathy Handlers - Desktop & User Processes (ES5 Strict)
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers.js";

export function handleSiphonDesktopApps(payload: { deviceName: string }, deps: HandlerDeps): HandlerResult {
  var dev = deps.ipc.network().getDevice(payload.deviceName) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  var apps = [];
  try {
    var count = (typeof dev.getUserDesktopAppCount === "function") ? dev.getUserDesktopAppCount() : 0;
    for (var i = 0; i < count; i++) {
        var app = typeof dev.getUserDesktopAppAt === "function" ? dev.getUserDesktopAppAt(i) : null;
        if (app) {
            apps.push(app.getAppId() + ":" + app.getAppName());
        }
    }
    return { ok: true, result: apps.join("|||") };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export function handleSiphonActiveProcesses(payload: { deviceName: string }, deps: HandlerDeps): HandlerResult {
  var dev = deps.ipc.network().getDevice(payload.deviceName) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  var commonProbes = ["PingProcess", "WebBrowserProcess", "TerminalProcess", "TelnetProcess", "SshProcess", "EmailProcess"];
  var active = [];

  for (var i = 0; i < commonProbes.length; i++) {
    try {
      var p = dev.getProcess(commonProbes[i]);
      if (p) {
        var state = (typeof p.isStopped === "function" && p.isStopped()) ? "STOPPED" : "RUNNING";
        active.push(commonProbes[i] + ":" + state);
      }
    } catch (e) {}
  }
  
  return { ok: true, result: active.join("|||") };
}

export function handleIsDesktopReady(payload: { deviceName: string }, deps: HandlerDeps): HandlerResult {
  var dev = deps.ipc.network().getDevice(payload.deviceName) as any;
  if (!dev) return { ok: false, error: "Device not found" };

  try {
    var ready = (typeof dev.isDesktopAvailable === "function") ? dev.isDesktopAvailable() : false;
    return { ok: true, result: ready };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
