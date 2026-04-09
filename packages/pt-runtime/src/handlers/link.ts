// ============================================================================
// Link Handlers - Pure functions for link operations
// ============================================================================

import type { HandlerDeps, HandlerResult, PTDevice } from "../utils/helpers";
import { resolveDevicePortName, getDevicePortNames } from "../utils/helpers";
import { DEVICE_TYPES } from "../utils/constants";
import { CABLE_TYPES, getCableTypeId } from "../utils/constants";

export interface AddLinkPayload {
  type: "addLink";
  device1: string;
  port1: string;
  device2: string;
  port2: string;
  linkType?: string;
}

// ---------------------------------------------------------------------------
// Device classification: PT's createLink requires infrastructure devices
// (switch, router, hub, etc.) as device1 when connecting to end devices.
// ---------------------------------------------------------------------------

const END_DEVICE_TYPES = new Set<number>([
  DEVICE_TYPES.pc as number,
  DEVICE_TYPES.server as number,
  DEVICE_TYPES.printer as number,
  DEVICE_TYPES.ipPhone as number,
  DEVICE_TYPES.laptop as number,
  DEVICE_TYPES.tablet as number,
  DEVICE_TYPES.smartphone as number,
  DEVICE_TYPES.wirelessEndDevice as number,
  DEVICE_TYPES.wiredEndDevice as number,
  DEVICE_TYPES.tv as number,
  DEVICE_TYPES.homeVoip as number,
  DEVICE_TYPES.analogPhone as number,
  DEVICE_TYPES.iot as number,
  DEVICE_TYPES.sniffer as number,
  DEVICE_TYPES.mcu as number,
  DEVICE_TYPES.sbc as number,
]);

function isEndDevice(device: PTDevice): boolean {
  try {
    return END_DEVICE_TYPES.has(device.getType());
  } catch {
    return false;
  }
}

function recommendCableType(device1: PTDevice, device2: PTDevice): string {
  const type1 = device1.getType();
  const type2 = device2.getType();
  const isSwitchLike = (type: number) =>
    type === DEVICE_TYPES.switch || type === DEVICE_TYPES.multilayerSwitch;

  if (type1 === type2) return "cross";
  if (isSwitchLike(type1) && isSwitchLike(type2)) return "cross";
  return "straight";
}

export function handleAddLink(payload: AddLinkPayload, deps: HandlerDeps): HandlerResult {
  const { getLW } = deps;
  const lw = getLW();
  const net = deps.getNet();

  const device1 = net.getDevice(payload.device1);
  const device2 = net.getDevice(payload.device2);

  if (!device1) return { ok: false, error: `Device not found: ${payload.device1}`, code: "DEVICE_NOT_FOUND" };
  if (!device2) return { ok: false, error: `Device not found: ${payload.device2}`, code: "DEVICE_NOT_FOUND" };

  if (device1?.skipBoot) device1.skipBoot();
  if (device2?.skipBoot) device2.skipBoot();

  const resolvedPort1 = resolveDevicePortName(device1, payload.port1);
  const resolvedPort2 = resolveDevicePortName(device2, payload.port2);

  if (!resolvedPort1 || !resolvedPort2) {
    return {
      ok: false,
      error: "Port not found",
      code: "INVALID_PORT",
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

  const cableTypeName = payload.linkType === "auto"
    ? recommendCableType(device1, device2)
    : (payload.linkType || "auto");
  const cableType = getCableTypeId(cableTypeName);

  interface LinkAttempt {
    devName1: string;
    port1: string;
    devName2: string;
    port2: string;
  }

  const original: LinkAttempt = {
    devName1: payload.device1,
    port1: resolvedPort1,
    devName2: payload.device2,
    port2: resolvedPort2,
  };

  const swapped: LinkAttempt = {
    devName1: payload.device2,
    port1: resolvedPort2,
    devName2: payload.device1,
    port2: resolvedPort1,
  };

  const isEnd1 = isEndDevice(device1);
  const isEnd2 = isEndDevice(device2);

  const attempts: LinkAttempt[] =
    isEnd1 && !isEnd2 ? [swapped, original] : [original, swapped];

  let lastError: string | null = null;
  let usedAttempt: LinkAttempt | null = null;

  for (const attempt of attempts) {
    try {
      const success = !!lw.createLink(
        attempt.devName1,
        attempt.port1,
        attempt.devName2,
        attempt.port2,
        cableType,
      );
      if (success) {
        usedAttempt = attempt;
        break;
      }
    } catch (error) {
      lastError = String(error);
    }
  }

  if (!usedAttempt) {
    return {
      ok: false,
      error: "Failed to create link. Packet Tracer rejected the request.",
      details: {
        device1: payload.device1,
        port1: resolvedPort1,
        device2: payload.device2,
        port2: resolvedPort2,
        cableTypeName,
        cableType,
        isEnd1,
        isEnd2,
        attemptedOrders: attempts.map(
          (a) => `${a.devName1}:${a.port1} → ${a.devName2}:${a.port2}`,
        ),
        lastError,
      },
    };
  }

  const linkId = `${payload.device1}:${payload.port1}--${payload.device2}:${payload.port2}`;

  return {
    ok: true,
    id: linkId,
    device1: payload.device1,
    port1: resolvedPort1,
    device2: payload.device2,
    port2: resolvedPort2,
    cableType: cableTypeName,
    swapped: usedAttempt === swapped,
  };
}

export function handleRemoveLink(payload: { device: string; port: string }, deps: HandlerDeps): HandlerResult {
  const { getLW } = deps;
  getLW().deleteLink(payload.device, payload.port);
  return { ok: true };
}
