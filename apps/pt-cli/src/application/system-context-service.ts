#!/usr/bin/env bun
/**
 * small service to centralize context-loading logic for CLI commands
 * - loadPersistedContext: read context-status.json
 * - inspectLiveSystemContext: start a short-lived controller and fetch system context
 * - getPreferredSystemContext: prefer persisted context, fallback to live inspection
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";
import { loadContextStatus } from "./context-supervisor.js";
import type { ContextStatus } from "../contracts/context-status.js";

export interface SystemContextSummary {
  bridgeReady: boolean;
  topologyMaterialized: boolean;
  deviceCount: number;
  linkCount: number;
  heartbeat: {
    state: "ok" | "stale" | "missing" | "unknown";
    ageMs?: number;
    lastSeenTs?: number;
  };
  warnings: string[];
}

export async function loadPersistedContext(): Promise<ContextStatus | null> {
  return await loadContextStatus();
}

export async function inspectLiveSystemContext(): Promise<SystemContextSummary> {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    const sys = controller.getSystemContext();
    return sys as SystemContextSummary;
  } finally {
    try {
      await controller.stop();
    } catch (e) {
      // ignore
    }
  }
}

export async function getPreferredSystemContext(): Promise<SystemContextSummary | ContextStatus | null> {
  const persisted = await loadPersistedContext();
  if (persisted) return persisted;
  try {
    return await inspectLiveSystemContext();
  } catch (e) {
    return null;
  }
}
