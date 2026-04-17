// packages/pt-runtime/src/runtime/validators/config-dhcp.ts
// Validador para el comando configDhcpServer

var MAX_ARRAY_LENGTH = 1000;

export function validateConfigDhcpServer(
  payload: Record<string, unknown>,
): Array<{ field: string; message: string }> {
  var errors: Array<{ field: string; message: string }> = [];

  if (!payload.device || typeof payload.device !== "string") {
    errors.push({ field: "device", message: "device is required" });
  }

  if (payload.pools !== undefined && Array.isArray(payload.pools)) {
    if (payload.pools.length > MAX_ARRAY_LENGTH) {
      errors.push({ field: "pools", message: "Too many pools" });
    }
  }

  return errors;
}
