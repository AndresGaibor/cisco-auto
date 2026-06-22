import { createErrorResult, createSuccessResult } from "./result-factories";
import type { PtRuntimeApi } from "../pt-api/pt-deps";
import type { PtResult } from "../pt-api/pt-results";

var IPC_BUFFER: IpcEventEntry[] = [];

export interface IpcEventEntry {
  timestamp: number;
  event: string;
  description: string;
}

export interface SubscribeIpcEventsPayload {
  type: "subscribeIpcEvents";
  events?: string[];
}

export interface PollIpcEventsPayload {
  type: "pollIpcEvents";
  since?: number;
  limit?: number;
}

var IPC_HANDLER_REGISTERED = false;

function globalIpcHandler(eventName: string, source: unknown, args: unknown): void {
  IPC_BUFFER.push({
    timestamp: Date.now(),
    event: eventName,
    description: String(args || ""),
  });
  if (IPC_BUFFER.length > 1000) {
    IPC_BUFFER.shift();
  }
}

export function handleSubscribeIpcEvents(
  payload: SubscribeIpcEventsPayload,
  api: PtRuntimeApi,
): PtResult {
  var ipc = api.ipc;
  if (!ipc) {
    return createErrorResult("IPC not available", "NO_IPC");
  }

  if (typeof ipc.registerEvent !== "function") {
    return createErrorResult("IPC does not support registerEvent", "NOT_SUPPORTED");
  }

  var events = payload?.events || [
    "networkChange",
    "deviceAdded",
    "deviceRemoved",
    "linkAdded",
    "linkRemoved",
  ];

  for (var i = 0; i < events.length; i++) {
    try {
      ipc.registerEvent(events[i], null, globalIpcHandler);
    } catch (e) {
      // skip events not supported
    }
  }

  IPC_HANDLER_REGISTERED = true;

  return createSuccessResult({
    subscriptionId: "ipc-global",
    events: events,
  });
}

export function handlePollIpcEvents(
  payload: PollIpcEventsPayload,
  api: PtRuntimeApi,
): PtResult {
  var limit = payload?.limit || 100;
  var since = payload?.since || 0;

  var filtered = [];
  for (var i = 0; i < IPC_BUFFER.length && filtered.length < limit; i++) {
    if (IPC_BUFFER[i].timestamp > since) {
      filtered.push(IPC_BUFFER[i]);
    }
  }

  return createSuccessResult({
    subscriptionId: "ipc-global",
    events: filtered,
    count: filtered.length,
  });
}
