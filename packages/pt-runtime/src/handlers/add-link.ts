import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import { getCableTypeId, getCableTypeName } from "../utils/constants";
import { resolveDevicePortName, getDevicePortNames } from "../utils/helpers";
import { collectLiveLinks, findLiveLink, findLiveLinkByEndpoint } from "../domain/live-link";
import type { AddLinkPayload } from "./link-types";

export type { AddLinkPayload } from "./link-types";

function normalizeCableTypeName(value: unknown): string {
  const raw = String(value ?? "auto").trim().toLowerCase().replace(/_/g, "-");

  const aliases: Record<string, string> = {
    auto: "auto",
    straight: "straight",
    "copper-straight": "straight",
    "copper-straight-through": "straight",
    "straight-through": "straight",
    cross: "cross",
    crossover: "cross",
    "cross-over": "cross",
    "copper-cross": "cross",
    "copper-crossover": "cross",
    roll: "roll",
    rollover: "roll",
    console: "console",
    serial: "serial",
    fiber: "fiber",
    phone: "phone",
    coaxial: "coaxial",
    cable: "cable",
    usb: "usb",
    wireless: "wireless",
  };

  return aliases[raw] ?? raw;
}

function resolvePort(device: any, port: string): string | null {
  const resolved = resolveDevicePortName(device, port);
  if (resolved) return resolved;

  const normalized = String(port).trim();
  const ports = getDevicePortNames(device);
  return ports.find((candidate) => candidate.toLowerCase() === normalized.toLowerCase()) ?? null;
}

function deleteExistingLink(deps: HandlerDeps, deviceName: string, portName: string): void {
  const device = deps.getNet().getDevice(deviceName);
  const port = device?.getPort?.(portName);
  if (port && typeof (port as any).deleteLink === "function") {
    (port as any).deleteLink();
    return;
  }

  deps.getLW().deleteLink(deviceName, portName);
}

export function handleAddLink(payload: AddLinkPayload, deps: HandlerDeps): HandlerResult {
  const net = deps.getNet();
  const lw = deps.getLW();
  const { dprint } = deps;

  const device1 = net.getDevice(payload.device1);
  const device2 = net.getDevice(payload.device2);

  if (!device1) {
    return { ok: false, code: "DEVICE_NOT_FOUND", error: `Device not found: ${payload.device1}` };
  }
  if (!device2) {
    return { ok: false, code: "DEVICE_NOT_FOUND", error: `Device not found: ${payload.device2}` };
  }

  const resolvedPort1 = resolvePort(device1, payload.port1);
  const resolvedPort2 = resolvePort(device2, payload.port2);

  if (!resolvedPort1 || !resolvedPort2) {
    return {
      ok: false,
      code: "INVALID_PORT",
      error: "Port not found",
      details: {
        device1: payload.device1,
        requestedPort1: payload.port1,
        resolvedPort1,
        availablePorts1: getDevicePortNames(device1),
        device2: payload.device2,
        requestedPort2: payload.port2,
        resolvedPort2,
        availablePorts2: getDevicePortNames(device2),
      },
    };
  }

  const cableTypeName = normalizeCableTypeName(payload.linkType ?? payload.cableType ?? "auto");
  const cableType = getCableTypeId(cableTypeName);

  const liveBefore = collectLiveLinks(net);
  const busy1 = findLiveLinkByEndpoint(liveBefore, payload.device1, resolvedPort1);
  const busy2 = findLiveLinkByEndpoint(liveBefore, payload.device2, resolvedPort2);

  if ((busy1 || busy2) && payload.replaceExisting !== true) {
    return {
      ok: false,
      code: "PORT_BUSY",
      error: "One or both ports are already connected.",
      details: {
        requested: {
          device1: payload.device1,
          port1: resolvedPort1,
          device2: payload.device2,
          port2: resolvedPort2,
        },
        busy1,
        busy2,
        hint: "Use --replace to remove existing links first, or choose another port.",
      },
    };
  }

  if (payload.replaceExisting === true) {
    if (busy1) deleteExistingLink(deps, payload.device1, resolvedPort1);
    if (busy2 && busy2.id !== busy1?.id) deleteExistingLink(deps, payload.device2, resolvedPort2);
  }

  try {
    const created = lw.createLink(payload.device1, resolvedPort1, payload.device2, resolvedPort2, cableType);
    if (!created && payload.allowAutoFallback === true && typeof lw.autoConnectDevices === "function") {
      lw.autoConnectDevices(payload.device1, payload.device2);
    }
  } catch (error) {
    dprint(`[handler:addLink] createLink failed: ${String(error)}`);
  }

  const liveAfter = collectLiveLinks(net);
  const exact = findLiveLink(liveAfter, payload.device1, resolvedPort1, payload.device2, resolvedPort2);

  if (!exact) {
    return {
      ok: false,
      code: "LINK_CREATED_BUT_NOT_EXACT",
      error: "Packet Tracer did not create the exact requested link.",
      details: {
        requested: {
          device1: payload.device1,
          port1: resolvedPort1,
          device2: payload.device2,
          port2: resolvedPort2,
        },
        liveLinks: liveAfter,
        hint: "Do not use auto fallback for strict port creation.",
      },
    };
  }

  const linkTypeName = getCableTypeName(cableType);
  const result = {
    ok: true,
    id: exact.id,
    device1: exact.device1,
    port1: exact.port1,
    device2: exact.device2,
    port2: exact.port2,
    cableType: linkTypeName,
    cableTypeId: cableType,
    state: exact.state,
    endpoint1: exact.endpoint1,
    endpoint2: exact.endpoint2,
    evidence: exact.evidence,
  };

  dprint(`[handler:addLink] ok ${result.id}`);
  return result as unknown as HandlerResult;
}
