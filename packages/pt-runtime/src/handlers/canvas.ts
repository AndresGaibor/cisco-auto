// ============================================================================
// Canvas/Rect Handlers - Pure functions for canvas rectangle operations
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers";

// ============================================================================
// Payload Types
// ============================================================================

export interface ListCanvasRectsPayload {
  type: "listCanvasRects";
}

export interface GetRectPayload {
  type: "getRect";
  rectId: string;
}

export interface DevicesInRectPayload {
  type: "devicesInRect";
  rectId: string;
  includeClusters?: boolean;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Get list of canvas rectangle IDs
 */
export function handleListCanvasRects(
  _payload: ListCanvasRectsPayload,
  deps: HandlerDeps,
): HandlerResult {
  const { getLW, dprint } = deps;

  let rectIds: string[] = [];

  dprint(`[handler:listCanvasRects] starting`);

  try {
    const lw = getLW();

    if (lw.getCanvasRectIds) {
      rectIds = lw.getCanvasRectIds() || [];
    } else {
      rectIds = [];
    }
  } catch (e) {
    const errMsg = String(e);
    dprint(`[handler:listCanvasRects] ERROR: ${errMsg}`);
    return {
      ok: false,
      error: `Failed to get canvas rect IDs: ${errMsg}`,
    };
  }

  dprint(`[handler:listCanvasRects] SUCCESS count=${rectIds.length}`);

  return {
    ok: true,
    rects: rectIds,
    count: rectIds.length,
  };
}

/**
 * Get detailed data for a specific rectangle
 */
export function handleGetRect(payload: GetRectPayload, deps: HandlerDeps): HandlerResult {
  const { getLW, dprint } = deps;

  let rectData: Record<string, unknown> | null = null;

  dprint(`[handler:getRect] rectId=${payload.rectId}`);

  try {
    const lw = getLW();

    if (lw.getRectItemData) {
      rectData = lw.getRectItemData(payload.rectId) || null;
    } else if (lw.getRectData) {
      rectData = lw.getRectData(payload.rectId) || null;
    }
  } catch (e) {
    const errMsg = String(e);
    dprint(`[handler:getRect] ERROR: ${errMsg}`);
    return {
      ok: false,
      error: `Failed to get rect data: ${errMsg}`,
    };
  }

  if (!rectData) {
    dprint(`[handler:getRect] ERROR Rect not found: ${payload.rectId}`);
    return {
      ok: false,
      error: `Rect not found: ${payload.rectId}`,
      code: "RECT_NOT_FOUND",
    };
  }

  dprint(`[handler:getRect] SUCCESS`);

  return {
    ok: true,
    rectId: payload.rectId,
    data: rectData,
  };
}

/**
 * Get devices located within a rectangle zone
 */
export function handleDevicesInRect(
  payload: DevicesInRectPayload,
  deps: HandlerDeps,
): HandlerResult {
  const { getLW, getNet, dprint } = deps;

  let devices: string[] = [];
  const clusters: string[] = [];

  dprint(`[handler:devicesInRect] rectId=${payload.rectId}`);

  try {
    const lw = getLW();
    const net = getNet();

    if (lw.devicesAt && lw.getRectItemData) {
      const rectData = lw.getRectItemData(payload.rectId);

      let x = 0,
        y = 0,
        width = 0,
        height = 0;

      if (rectData && typeof rectData === "object") {
        x = (rectData.x as number) || 0;
        y = (rectData.y as number) || 0;
        width = (rectData.width as number) || 0;
        height = (rectData.height as number) || 0;
      }

      dprint(`[handler:devicesInRect] rect bounds: x=${x} y=${y} w=${width} h=${height}`);

      if (width > 0 && height > 0) {
        const foundDevices = lw.devicesAt(x, y, width, height, payload.includeClusters || false);
        if (Array.isArray(foundDevices)) {
          devices = foundDevices.filter((d: unknown) => typeof d === "string") as string[];
        }
      }
    }

    // Fallback: enumerate devices and check if they fall within rect bounds
    if (devices.length === 0 && payload.rectId) {
      const lw = getLW();
      const rectData = lw.getRectItemData ? lw.getRectItemData(payload.rectId) : null;

      if (rectData && typeof rectData === "object") {
        const rx = (rectData.x as number) || 0;
        const ry = (rectData.y as number) || 0;
        const rw = (rectData.width as number) || 0;
        const rh = (rectData.height as number) || 0;

        dprint(`[handler:devicesInRect] fallback enum rect: x=${rx} y=${ry} w=${rw} h=${rh}`);

        const deviceCount = net.getDeviceCount();
        for (let i = 0; i < deviceCount; i++) {
          const device = net.getDeviceAt(i);
          if (!device) continue;

          const deviceX = device.getX ? device.getX() : 0;
          const deviceY = device.getY ? device.getY() : 0;

          if (deviceX >= rx && deviceX <= rx + rw && deviceY >= ry && deviceY <= ry + rh) {
            devices.push(device.getName());
          }
        }
      }
    }
  } catch (e) {
    const errMsg = String(e);
    dprint(`[handler:devicesInRect] ERROR: ${errMsg}`);
    return {
      ok: false,
      error: `Failed to get devices in rect: ${errMsg}`,
    };
  }

  dprint(`[handler:devicesInRect] SUCCESS found=${devices.length}`);

  return {
    ok: true,
    rectId: payload.rectId,
    devices,
    clusters,
    count: devices.length,
  };
}

/**
 * Clear the entire canvas by removing links first and then devices.
 */
export function handleClearCanvas(_payload: any, deps: HandlerDeps): HandlerResult {
  const { getNet, getLW, dprint } = deps;
  const net = getNet() as any;
  const lw = getLW() as any;

  dprint(`[handler:clearCanvas] starting canvas cleanup`);

  try {
    let linksDeleted = 0;
    if (net && typeof net.getLinkCount === "function" && typeof net.getLinkAt === "function") {
      for (let i = Number(net.getLinkCount()) - 1; i >= 0; i--) {
        try {
          const link = net.getLinkAt(i);
          const port1 = link && typeof link.getPort1 === "function" ? link.getPort1() : null;
          const port2 = link && typeof link.getPort2 === "function" ? link.getPort2() : null;

          if (port1 && typeof port1.deleteLink === "function") {
            port1.deleteLink();
            linksDeleted++;
            continue;
          }

          if (port2 && typeof port2.deleteLink === "function") {
            port2.deleteLink();
            linksDeleted++;
          }
        } catch (linkErr) {
          dprint(`[handler:clearCanvas] skip link at ${i}: ${String(linkErr)}`);
        }
      }
    }

    let devicesDeleted = 0;
    if (net && typeof net.getDeviceCount === "function" && typeof net.getDeviceAt === "function") {
      const count = Number(net.getDeviceCount());
      for (let i = count - 1; i >= 0; i--) {
        try {
          const device = net.getDeviceAt(i);
          const name = device && typeof device.getName === "function" ? device.getName() : null;
          if (!name || typeof lw.removeDevice !== "function") continue;
          lw.removeDevice(name);
          devicesDeleted++;
        } catch (deviceErr) {
          dprint(`[handler:clearCanvas] skip device at ${i}: ${String(deviceErr)}`);
        }
      }
    }

    dprint(`[handler:clearCanvas] SUCCESS links=${linksDeleted} devices=${devicesDeleted}`);

    return {
      ok: true,
      result: "CANVAS_CLEARED",
      linksDeleted,
      devicesDeleted,
    };
  } catch (e) {
    const errMsg = String(e);
    dprint(`[handler:clearCanvas] ERROR: ${errMsg}`);
    return {
      ok: false,
      error: `Failed to clear canvas: ${errMsg}`,
    };
  }
}
