import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import { resolveDevicePortName, getDevicePortNames } from "../utils/helpers";
import { getLinkRegistry, saveLinkRegistry } from "../domain/link-registry";
import { isEndDevice } from "./device-classifier";
import { recommendCableType } from "./cable-recommender";
import { getCableTypeId } from "../utils/constants";
import type { AddLinkPayload } from "./link-types";

export type { AddLinkPayload } from "./link-types";

interface LinkAttempt {
  devName1: string;
  port1: string;
  devName2: string;
  port2: string;
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

  const resolvedPort1 = resolveDevicePortName(device1, payload.port1);
  const resolvedPort2 = resolveDevicePortName(device2, payload.port2);

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

  let lastError: string | null = null;
  let usedAttempt: LinkAttempt | null = null;

  for (const attempt of attempts) {
    try {
      const created = lw.createLink(
        attempt.devName1,
        attempt.port1,
        attempt.devName2,
        attempt.port2,
        cableType,
      );
      if (!created) {
        lastError = "lw.createLink returned falsy";
        dprint(`[handler:addLink] attempt returned falsy`);
        continue;
      }

      // VERIFICAR QUE EL LINK EXISTE EN PT — lw.createLink puede retornar truthy sin crear realmente
      const dev1Obj = net.getDevice(attempt.devName1);
      const dev1Port = dev1Obj?.getPort(attempt.port1);
      const linkObj = dev1Port?.getLink ? dev1Port.getLink() : null;

      if (!linkObj) {
        lastError =
          "lw.createLink returned truthy but port.getLink() is null — link not created in PT";
        dprint(
          `[handler:addLink] VERIFICATION FAILED: link not created despite createLink success`,
        );
        continue;
      }

      usedAttempt = attempt;
      dprint(
        `[handler:addLink] SUCCESS verified via ${attempt.devName1}:${attempt.port1} -> ${attempt.devName2}:${attempt.port2}`,
      );
      break;
    } catch (error) {
      lastError = String(error);
      dprint(`[handler:addLink] attempt failed: ${lastError}`);
    }
  }

  if (!usedAttempt && payload.linkType === "auto") {
    const autoCableType = getCableTypeId("auto");
    dprint(`[handler:addLink] retrying with cableType=auto`);

    for (const attempt of attempts) {
      try {
        const created = lw.createLink(
          attempt.devName1,
          attempt.port1,
          attempt.devName2,
          attempt.port2,
          autoCableType,
        );
        if (!created) {
          lastError = "auto: lw.createLink returned falsy";
          continue;
        }

        const dev1Obj = net.getDevice(attempt.devName1);
        const dev1Port = dev1Obj?.getPort(attempt.port1);
        const linkObj = dev1Port?.getLink ? dev1Port.getLink() : null;

        if (!linkObj) {
          lastError = "auto: lw.createLink returned truthy but link not verified in PT";
          continue;
        }

        usedAttempt = attempt;
        dprint(`[handler:addLink] SUCCESS via auto cable verified`);
        break;
      } catch (error) {
        lastError = String(error);
      }
    }
  }

  if (!usedAttempt) {
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

  // Normalizar key para evitar duplicados invertidos: siempre device1 < device2 alfabéticamente
  const keyParts = [
    `${payload.device1}:${resolvedPort1}`,
    `${payload.device2}:${resolvedPort2}`,
  ].sort();

  // Prevenir doble-guardado: verificar si el link ya existe en alguna dirección
  const registry = getLinkRegistry(deps.DEV_DIR, deps.getFM());
  const reverseKey = `${keyParts[1]}--${keyParts[0]}`;
  if (registry[keyParts.join("--")] || registry[reverseKey]) {
    dprint(`[handler:addLink] DUPLICATE detected, skipping registry write`);
  } else {
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

  const linkId = `${payload.device1}:${payload.port1}--${payload.device2}:${payload.port2}`;

  dprint(`[handler:addLink] DONE id=${linkId}`);

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
