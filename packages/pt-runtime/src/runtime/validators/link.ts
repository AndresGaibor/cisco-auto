// packages/pt-runtime/src/runtime/validators/link.ts
// Validador para el comando addLink

export function validateAddLink(
  payload: Record<string, unknown>,
): Array<{ field: string; message: string }> {
  var errors: Array<{ field: string; message: string }> = [];

  if (!payload.device1 || typeof payload.device1 !== "string") {
    errors.push({ field: "device1", message: "device1 is required" });
  }
  if (!payload.port1 || typeof payload.port1 !== "string") {
    errors.push({ field: "port1", message: "port1 is required" });
  }
  if (!payload.device2 || typeof payload.device2 !== "string") {
    errors.push({ field: "device2", message: "device2 is required" });
  }
  if (!payload.port2 || typeof payload.port2 !== "string") {
    errors.push({ field: "port2", message: "port2 is required" });
  }

  return errors;
}
