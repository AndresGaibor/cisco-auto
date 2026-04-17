// packages/pt-runtime/src/runtime/validators/add-device.ts
// Validador para el comando addDevice

var MAX_STRING_LENGTH = 4096;

export function validateAddDevice(
  payload: Record<string, unknown>,
): Array<{ field: string; message: string }> {
  var errors: Array<{ field: string; message: string }> = [];

  if (!payload.model || typeof payload.model !== "string") {
    errors.push({ field: "model", message: "model is required and must be a string" });
  } else if (payload.model.length > MAX_STRING_LENGTH) {
    errors.push({ field: "model", message: "model exceeds maximum length" });
  }

  if (payload.name !== undefined && typeof payload.name !== "string") {
    errors.push({ field: "name", message: "name must be a string if provided" });
  }

  if (payload.x !== undefined && typeof payload.x !== "number") {
    errors.push({ field: "x", message: "x must be a number if provided" });
  }

  if (payload.y !== undefined && typeof payload.y !== "number") {
    errors.push({ field: "y", message: "y must be a number if provided" });
  }

  return errors;
}
