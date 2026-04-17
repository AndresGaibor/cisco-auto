// packages/pt-runtime/src/runtime/validators/config-host.ts
// Validador para el comando configHost

import { isValidIpv4 } from "../security";

export function validateConfigHost(
  payload: Record<string, unknown>,
): Array<{ field: string; message: string }> {
  var errors: Array<{ field: string; message: string }> = [];

  if (!payload.device || typeof payload.device !== "string") {
    errors.push({ field: "device", message: "device is required" });
  }

  if (payload.ip !== undefined) {
    if (!isValidIpv4(String(payload.ip))) {
      errors.push({ field: "ip", message: "Invalid IPv4 address format" });
    }
  }
  if (payload.mask !== undefined) {
    if (!isValidIpv4(String(payload.mask))) {
      errors.push({ field: "mask", message: "Invalid subnet mask format" });
    }
  }
  if (payload.gateway !== undefined) {
    if (!isValidIpv4(String(payload.gateway))) {
      errors.push({ field: "gateway", message: "Invalid gateway format" });
    }
  }

  return errors;
}
