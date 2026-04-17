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
