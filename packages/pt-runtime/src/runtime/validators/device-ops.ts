// packages/pt-runtime/src/runtime/validators/device-ops.ts
// Validadores para operaciones de dispositivo (moveDevice, removeDevice, listDevices)

export function validateMoveDevice(
  payload: Record<string, unknown>,
): Array<{ field: string; message: string }> {
  var errors: Array<{ field: string; message: string }> = [];

  if (!payload.name || typeof payload.name !== "string") {
    errors.push({ field: "name", message: "name is required" });
  }
  if (payload.x === undefined || typeof payload.x !== "number") {
    errors.push({ field: "x", message: "x is required and must be a number" });
  }
  if (payload.y === undefined || typeof payload.y !== "number") {
    errors.push({ field: "y", message: "y is required and must be a number" });
  }

  return errors;
}

export function validateDeviceOperation(
  payload: Record<string, unknown>,
): Array<{ field: string; message: string }> {
  var errors: Array<{ field: string; message: string }> = [];

  if (!payload.device || typeof payload.device !== "string") {
    errors.push({ field: "device", message: "device is required" });
  }

  return errors;
}
