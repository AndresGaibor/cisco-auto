// ============================================================================
// Canvas/Rect Handlers - Pure functions for canvas rectangle operations
// ============================================================================

import { HandlerDeps, HandlerResult, PTLogicalWorkspace, PTDevice } from "../utils/helpers";

// PT API extended type (methods not in official typings but exist in PT)
interface PTLogicalWorkspaceExtended extends PTLogicalWorkspace {
  getCanvasRectIds?: () => string[];
  getRectItemData?: (id: string) => Record<string, unknown> | null;
  getRectData?: (id: string) => Record<string, unknown> | null;
  devicesAt?: (x: number, y: number, width: number, height: number, includeClusters: boolean) => unknown[];
}

interface PTDeviceExtended extends PTDevice {
  getX?: () => number;
  getY?: () => number;
}

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
export function handleListCanvasRects(_payload: ListCanvasRectsPayload, deps: HandlerDeps): HandlerResult {
  const { getLW } = deps;

  let rectIds: string[] = [];

  try {
    const lw = getLW() as PTLogicalWorkspaceExtended;

    if (lw.getCanvasRectIds) {
      rectIds = lw.getCanvasRectIds() || [];
    } else {
      rectIds = [];
    }
  } catch (e) {
    return {
      ok: false,
      error: `Failed to get canvas rect IDs: ${String(e)}`,
    };
  }

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
  const { getLW } = deps;

  let rectData: Record<string, unknown> | null = null;

  try {
    const lw = getLW() as PTLogicalWorkspaceExtended;

    if (lw.getRectItemData) {
      rectData = lw.getRectItemData(payload.rectId) || null;
    } else if (lw.getRectData) {
      rectData = lw.getRectData(payload.rectId) || null;
    }
  } catch (e) {
    return {
      ok: false,
      error: `Failed to get rect data: ${String(e)}`,
    };
  }

  if (!rectData) {
    return {
      ok: false,
      error: `Rect not found: ${payload.rectId}`,
    };
  }

  return {
    ok: true,
    rectId: payload.rectId,
    data: rectData,
  };
}

/**
 * Get devices located within a rectangle zone
 */
export function handleDevicesInRect(payload: DevicesInRectPayload, deps: HandlerDeps): HandlerResult {
  const { getLW, getNet } = deps;

  let devices: string[] = [];
  const clusters: string[] = [];

  try {
    const lw = getLW() as PTLogicalWorkspaceExtended;
    const net = getNet();

    if (lw.devicesAt && lw.getRectItemData) {
      const rectData = lw.getRectItemData(payload.rectId);

      let x = 0, y = 0, width = 0, height = 0;

      if (rectData && typeof rectData === "object") {
        x = (rectData.x as number) || 0;
        y = (rectData.y as number) || 0;
        width = (rectData.width as number) || 0;
        height = (rectData.height as number) || 0;
      }

      if (width > 0 && height > 0) {
        const foundDevices = lw.devicesAt(x, y, width, height, payload.includeClusters || false);
        if (Array.isArray(foundDevices)) {
          devices = foundDevices.filter((d: unknown) => typeof d === "string") as string[];
        }
      }
    }

    // Fallback: enumerate devices and check if they fall within rect bounds
    if (devices.length === 0 && payload.rectId) {
      const lw = getLW() as PTLogicalWorkspaceExtended;
      const rectData = lw.getRectItemData ? lw.getRectItemData(payload.rectId) : null;

      if (rectData && typeof rectData === "object") {
        const rx = (rectData.x as number) || 0;
        const ry = (rectData.y as number) || 0;
        const rw = (rectData.width as number) || 0;
        const rh = (rectData.height as number) || 0;

        const deviceCount = net.getDeviceCount();
        for (let i = 0; i < deviceCount; i++) {
          const device = net.getDeviceAt(i) as PTDeviceExtended | null;
          if (!device) continue;

          const deviceX = device.getX ? device.getX() : 0;
          const deviceY = device.getY ? device.getY() : 0;

          if (
            deviceX >= rx &&
            deviceX <= rx + rw &&
            deviceY >= ry &&
            deviceY <= ry + rh
          ) {
            devices.push(device.getName());
          }
        }
      }
    }
  } catch (e) {
    return {
      ok: false,
      error: `Failed to get devices in rect: ${String(e)}`,
    };
  }

  return {
    ok: true,
    rectId: payload.rectId,
    devices,
    clusters,
    count: devices.length,
  };
}
