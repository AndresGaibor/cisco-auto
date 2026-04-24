import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import { resolveDevicePortName, getDevicePortNames } from "../utils/helpers";
import { getLinkRegistry, saveLinkRegistry } from "../domain/link-registry";
import { isEndDevice } from "./device-classifier";
import { recommendCableType } from "./cable-recommender";
import { getCableTypeId } from "../utils/constants";
import type { AddLinkPayload } from "./link-types";
import type { PTNetwork, PTLogicalWorkspace } from "../pt-api/pt-api-registry";

export type { AddLinkPayload } from "./link-types";

interface LinkAttempt {
  devName1: string;
  port1: string;
  devName2: string;
  port2: string;
}

function verifyLinkCreated(
  net: PTNetwork,
  attempt: LinkAttempt,
): boolean {
  const device = net.getDevice(attempt.devName1);
  const port = device?.getPort(attempt.port1);
  const link = port?.getLink ? port.getLink() : null;
  return link !== null;
}

function createLinkAttempt(
  lw: PTLogicalWorkspace,
  net: PTNetwork,
  attempt: LinkAttempt,
  cableType: number,
  dprint: (msg: string) => void,
): LinkAttempt | null {
  try {
    const created = lw.createLink(
      attempt.devName1,
      attempt.port1,
      attempt.devName2,
      attempt.port2,
      cableType,
    );
    if (!created) {
      dprint(`[handler:addLink] attempt returned falsy`);
      return null;
    }
    if (!verifyLinkCreated(net, attempt)) {
      dprint(`[handler:addLink] VERIFICATION FAILED: link not created despite createLink success`);
      return null;
    }
    return attempt;
  } catch (error) {
    dprint(`[handler:addLink] attempt failed: ${String(error)}`);
    return null;
  }
}

function tryCreateLink(
  lw: PTLogicalWorkspace,
  net: PTNetwork,
  attempts: LinkAttempt[],
  cableType: number,
  dprint: (msg: string) => void,
): LinkAttempt | null {
  for (const attempt of attempts) {
    const result = createLinkAttempt(lw, net, attempt, cableType, dprint);
    if (result) {
      dprint(
        `[handler:addLink] SUCCESS verified via ${attempt.devName1}:${attempt.port1} -> ${attempt.devName2}:${attempt.port2}`,
      );
      return result;
    }
  }
  return null;
}

function saveLinkToRegistry(
  deps: HandlerDeps,
  device1: string,
  port1: string,
  device2: string,
  port2: string,
  dprint: (msg: string) => void,
): void {
  const keyParts = [`${device1}:${port1}`, `${device2}:${port2}`].sort();
  const registry = getLinkRegistry(deps.DEV_DIR, deps.getFM());
  const reverseKey = `${keyParts[1]}--${keyParts[0]}`;
  if (registry[keyParts.join("--")] || registry[reverseKey]) {
    dprint(`[handler:addLink] DUPLICATE detected, skipping registry write`);
    return;
  }
  registry[keyParts.join("--")] = {
    device1: keyParts[0].split(":")[0],
    port1: keyParts[0].split(":")[1],
    device2: keyParts[1].split(":")[0],
    port2: keyParts[1].split(":")[1],
    source: "runtime",
    createdAt: Date.now(),
  };
  saveLinkRegistry(deps.DEV_DIR, deps.getFM(), registry);
}

export function handleAddLink(payload: AddLinkPayload, deps: HandlerDeps): HandlerResult {
  const { getLW, dprint } = deps;
  const lw = getLW();
  const net = deps.getNet();

  dprint(
    `[handler:addLink] starting ${payload.device1}:${payload.port1} <-> ${payload.device2}:${payload.port2} type=${payload.linkType}`,
  );

  const device1 = net.getDevice(payload.device1);
  const device2 = net.getDevice(payload.device2);

  if (!device1) {
    dprint(`[handler:addLink] ERROR Device not found: ${payload.device1}`);
    return { ok: false, error: `Device not found: ${payload.device1}`, code: "DEVICE_NOT_FOUND" };
  }
  if (!device2) {
    dprint(`[handler:addLink] ERROR Device not found: ${payload.device2}`);
    return { ok: false, error: `Device not found: ${payload.device2}`, code: "DEVICE_NOT_FOUND" };
  }

  if (device1?.skipBoot) device1.skipBoot();
  if (device2?.skipBoot) device2.skipBoot();

  let resolvedPort1 = resolveDevicePortName(device1, payload.port1);
  let resolvedPort2 = resolveDevicePortName(device2, payload.port2);

  if (!resolvedPort1 || !resolvedPort2) {
    dprint(
      `[handler:addLink] ERROR Port not found d1=${payload.device1} p1=${payload.port1} resolved=${resolvedPort1} d2=${payload.device2} p2=${payload.port2} resolved=${resolvedPort2}`,
    );
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

  const cableTypeName =
    payload.linkType === "auto" ? recommendCableType(device1, device2) : payload.linkType || "auto";
  const cableType = getCableTypeId(cableTypeName);

  dprint(`[handler:addLink] trying cableType=${cableTypeName} (${cableType})`);

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

  dprint(`[handler:addLink] isEnd1=${isEnd1} isEnd2=${isEnd2}`);

  const attempts: LinkAttempt[] = isEnd1 && !isEnd2 ? [swapped, original] : [original, swapped];

  let usedAttempt = tryCreateLink(lw, net, attempts, cableType, dprint);
  let lastError: string | null = null;
  let usedFallback = false;

  // FALLBACK para PT 9.0.0.0810: Si createLink falla, intentamos autoConnectDevices
  if (!usedAttempt) {
    dprint(`[handler:addLink] createLink failed, trying autoConnectDevices fallback...`);
    try {
      if (typeof (lw as any).autoConnectDevices === 'function') {
        (lw as any).autoConnectDevices(payload.device1, payload.device2);
        
        // Verificación exhaustiva: ¿alguno de los puertos de d1 ahora tiene un link hacia d2?
        const d1 = net.getDevice(payload.device1);
        const d2 = net.getDevice(payload.device2);
        
        if (d1 && d2) {
            for (let i = 0; i < d1.getPortCount(); i++) {
                const p = d1.getPortAt(i);
                if (!p) continue;
                const l = (p as any)?.getLink ? (p as any).getLink() : null;
                if (l) {
                    const ep2 = l.getPort2 ? l.getPort2() : null;
                    if (ep2 && typeof ep2.getOwnerDevice === "function" && ep2.getOwnerDevice().getName() === payload.device2) {
                        usedFallback = true;
                        // ACTUALIZAMOS LOS PUERTOS REALES DESCUBIERTOS
                        resolvedPort1 = p.getName() || resolvedPort1;
                        resolvedPort2 = ep2.getName() || resolvedPort2;
                        dprint(`[handler:addLink] FALLBACK SUCCESS: autoConnectDevices linked ${payload.device1}:${resolvedPort1} to ${payload.device2}:${resolvedPort2}`);
                        break;
                    }
                }
            }
        }
      }
    } catch (e) {
      dprint(`[handler:addLink] Fallback failed: ${e}`);
    }
  }

  if (!usedAttempt && !usedFallback && payload.linkType === "auto") {
    const autoCableType = getCableTypeId("auto");
    dprint(`[handler:addLink] retrying with cableType=auto`);
    usedAttempt = tryCreateLink(lw, net, attempts, autoCableType, dprint);
    if (!usedAttempt) {
      lastError = "auto: all attempts failed";
    }
  }

  if (!usedAttempt && !usedFallback) {
    dprint(`[handler:addLink] ERROR Failed to create link: ${lastError}`);
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
        attemptedOrders: attempts.map((a) => `${a.devName1}:${a.port1} → ${a.devName2}:${a.port2}`),
        lastError,
      },
    };
  }

  saveLinkToRegistry(deps, payload.device1, resolvedPort1 || payload.port1, payload.device2, resolvedPort2 || payload.port2, dprint);

  const linkId = `${payload.device1}:${resolvedPort1 || payload.port1}--${payload.device2}:${resolvedPort2 || payload.port2}`;

  dprint(`[handler:addLink] DONE id=${linkId} actual1=${resolvedPort1} actual2=${resolvedPort2}`);

  return {
    ok: true,
    id: linkId,
    device1: payload.device1,
    port1: resolvedPort1,
    device2: payload.device2,
    port2: resolvedPort2,
    cableType: cableTypeName,
    swapped: usedAttempt === swapped,
    fallbackUsed: usedFallback,
  };
}
