import { createErrorResult, createSuccessResult } from "./result-factories";
import type { PtRuntimeApi } from "../pt-api/pt-deps";
import type { PtResult } from "../pt-api/pt-results";

var EVENT_BUFFER: Record<string, TerminalEventEntry[]> = {};

export interface TerminalEventEntry {
  timestamp: number;
  event: string;
  device: string;
  data: string;
}

export interface SubscribeTerminalEventsPayload {
  type: "subscribeTerminalEvents";
  device: string;
  events?: string[];
}

export interface PollTerminalEventsPayload {
  type: "pollTerminalEvents";
  subscriptionId: string;
  since?: number;
  limit?: number;
}

export interface UnsubscribeTerminalEventsPayload {
  type: "unsubscribeTerminalEvents";
  subscriptionId: string;
}

var SUBSCRIPTION_COUNTER = 0;
var SUBSCRIPTIONS: Record<string, { device: string; bufferId: string }> = {};

function makeBufferId(device: string, subId: string): string {
  return device + "::" + subId;
}

function collectEvent(subId: string, device: string, eventName: string, rawArgs: unknown): void {
  var bufKey = SUBSCRIPTIONS[subId]?.bufferId || makeBufferId(device, subId);
  if (!EVENT_BUFFER[bufKey]) {
    EVENT_BUFFER[bufKey] = [];
  }
  EVENT_BUFFER[bufKey].push({
    timestamp: Date.now(),
    event: eventName,
    device: device,
    data: String(rawArgs),
  });
  if (EVENT_BUFFER[bufKey].length > 1000) {
    EVENT_BUFFER[bufKey].shift();
  }
}

export function handleSubscribeTerminalEvents(
  payload: SubscribeTerminalEventsPayload,
  api: PtRuntimeApi,
): PtResult {
  if (!payload || !payload.device) {
    return createErrorResult("Missing payload.device", "INVALID_PAYLOAD");
  }

  var device = api.getDeviceByName(payload.device);
  if (!device) {
    return createErrorResult("Device not found: " + payload.device, "DEVICE_NOT_FOUND");
  }

  var cli = api.getCommandLine(payload.device);
  if (!cli) {
    return createErrorResult("Device has no command line: " + payload.device, "NO_CLI");
  }

  SUBSCRIPTION_COUNTER++;
  var subId = "term-" + SUBSCRIPTION_COUNTER + "-" + Date.now();
  var bufferId = makeBufferId(payload.device, subId);
  SUBSCRIPTIONS[subId] = { device: payload.device, bufferId: bufferId };
  EVENT_BUFFER[bufferId] = [];

  var events = payload.events || [
    "commandStarted",
    "outputWritten",
    "commandEnded",
    "modeChanged",
    "promptChanged",
    "moreDisplayed",
  ];

  for (var i = 0; i < events.length; i++) {
    try {
      (cli as any).registerEvent(events[i], null, function (source: unknown, args: unknown) {
        collectEvent(subId, payload.device, events[i], args);
      });
    } catch (e) {
      // ignore events that aren't supported by this device
    }
  }

  return createSuccessResult({
    subscriptionId: subId,
    device: payload.device,
    events: events,
  });
}

export function handlePollTerminalEvents(
  payload: PollTerminalEventsPayload,
  api: PtRuntimeApi,
): PtResult {
  if (!payload || !payload.subscriptionId) {
    return createErrorResult("Missing payload.subscriptionId", "INVALID_PAYLOAD");
  }

  var sub = SUBSCRIPTIONS[payload.subscriptionId];
  if (!sub) {
    return createErrorResult("Subscription not found: " + payload.subscriptionId, "NOT_FOUND");
  }

  var buf = EVENT_BUFFER[sub.bufferId] || [];
  var limit = payload.limit || 100;
  var since = payload.since || 0;

  var filtered = [];
  for (var i = 0; i < buf.length && filtered.length < limit; i++) {
    if (buf[i].timestamp > since) {
      filtered.push(buf[i]);
    }
  }

  return createSuccessResult({
    subscriptionId: payload.subscriptionId,
    events: filtered,
    count: filtered.length,
  });
}

export function handleUnsubscribeTerminalEvents(
  payload: UnsubscribeTerminalEventsPayload,
  api: PtRuntimeApi,
): PtResult {
  if (!payload || !payload.subscriptionId) {
    return createErrorResult("Missing payload.subscriptionId", "INVALID_PAYLOAD");
  }

  var sub = SUBSCRIPTIONS[payload.subscriptionId];
  if (!sub) {
    return createErrorResult("Subscription not found: " + payload.subscriptionId, "NOT_FOUND");
  }

  delete EVENT_BUFFER[sub.bufferId];
  delete SUBSCRIPTIONS[payload.subscriptionId];

  return createSuccessResult({ unsubscribed: payload.subscriptionId });
}

export function handleListSubscriptions(_payload: unknown, _api: PtRuntimeApi): PtResult {
  var list: Array<{ subscriptionId: string; device: string }> = [];
  for (var key in SUBSCRIPTIONS) {
    list.push({ subscriptionId: key, device: SUBSCRIPTIONS[key].device });
  }
  return createSuccessResult({ subscriptions: list, count: list.length });
}
