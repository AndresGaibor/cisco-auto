/**
 * Runtime Canvas Handlers Template
 * Handles canvas rectangles and device location operations
 */

export function generateCanvasHandlersTemplate(): string {
  return `// ============================================================================
// Canvas/Rect Handlers
// ============================================================================

function handleListCanvasRects(payload) {
  var lw = getLW();
  var rectIds = [];

  try {
    if (lw.getCanvasRectIds) {
      rectIds = lw.getCanvasRectIds() || [];
    }
  } catch (e) {
    return { ok: false, error: "Failed to get canvas rect IDs: " + String(e) };
  }

  return { ok: true, rects: rectIds, count: rectIds.length };
}

function handleGetRect(payload) {
  var lw = getLW();
  var rectData = null;

  try {
    if (lw.getRectItemData) {
      rectData = lw.getRectItemData(payload.rectId) || null;
    } else if (lw.getRectData) {
      rectData = lw.getRectData(payload.rectId) || null;
    }
  } catch (e) {
    return { ok: false, error: "Failed to get rect data: " + String(e) };
  }

  if (!rectData) {
    return { ok: false, error: "Rect not found: " + payload.rectId };
  }

  return { ok: true, rectId: payload.rectId, data: rectData };
}

function handleDevicesInRect(payload) {
  var lw = getLW();
  var net = getNet();
  var devices = [];
  var clusters = [];

  try {
    if (lw.devicesAt) {
      var rectData = payload.rectId && lw.getRectItemData ? lw.getRectItemData(payload.rectId) : null;

      var x = 0, y = 0, width = 0, height = 0;

      if (rectData && typeof rectData === "object") {
        x = rectData.x || 0;
        y = rectData.y || 0;
        width = rectData.width || 0;
        height = rectData.height || 0;
      }

      if (width > 0 && height > 0) {
        var foundDevices = lw.devicesAt(x, y, width, height, payload.includeClusters || false);
        if (Array.isArray(foundDevices)) {
          for (var i = 0; i < foundDevices.length; i++) {
            if (typeof foundDevices[i] === "string") {
              devices.push(foundDevices[i]);
            }
          }
        }
      }
    }

    if (devices.length === 0 && payload.rectId) {
      var rectData = lw.getRectItemData ? lw.getRectItemData(payload.rectId) : null;

      if (rectData && typeof rectData === "object") {
        var rx = rectData.x || 0;
        var ry = rectData.y || 0;
        var rw = rectData.width || 0;
        var rh = rectData.height || 0;

        var deviceCount = net.getDeviceCount();
        for (var i = 0; i < deviceCount; i++) {
          var device = net.getDeviceAt(i);
          if (!device) continue;

          var deviceX = device.getX ? device.getX() : 0;
          var deviceY = device.getY ? device.getY() : 0;

          if (deviceX >= rx && deviceX <= rx + rw && deviceY >= ry && deviceY <= ry + rh) {
            devices.push(device.getName());
          }
        }
      }
    }
  } catch (e) {
    return { ok: false, error: "Failed to get devices in rect: " + String(e) };
  }

  return { ok: true, rectId: payload.rectId, devices: devices, clusters: clusters, count: devices.length };
}
`;
}
