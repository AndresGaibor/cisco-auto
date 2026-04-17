// packages/pt-runtime/src/runtime/payload-validator.ts
// Runtime Payload Validator — Fachada delgada que delega a módulos especializados
// Cada módulo tiene una responsabilidad única: validación, sanitización, seguridad

import { validateAddDevice } from "./validators/add-device";
import { validateIosCommand } from "./validators/ios";
import { validateAddLink } from "./validators/link";
import { validateConfigHost } from "./validators/config-host";
import { validateConfigDhcpServer } from "./validators/config-dhcp";
import { validateMoveDevice, validateDeviceOperation } from "./validators/device-ops";
import { sanitizeDeviceName, sanitizePath, safeJsonParse } from "./sanitizers";
import { hasPrototypePollution } from "./security";

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

var MAX_PAYLOAD_SIZE = 65536;

export function validatePayload(
  commandType: string,
  payload: Record<string, unknown>,
): ValidationResult {
  var errors: Array<{ field: string; message: string }> = [];

  var payloadSize = 0;
  try {
    payloadSize = JSON.stringify(payload).length;
  } catch (e) {
    return { valid: false, errors: [{ field: "_size", message: "Cannot serialize payload" }] };
  }

  if (payloadSize > MAX_PAYLOAD_SIZE) {
    errors.push({
      field: "_size",
      message: "Payload exceeds maximum size: " + payloadSize + " > " + MAX_PAYLOAD_SIZE,
    });
  }

  if (hasPrototypePollution(payload)) {
    errors.push({
      field: "_prototype",
      message: "Payload contains prototype pollution keys",
    });
  }

  switch (commandType) {
    case "addDevice":
      errors = errors.concat(validateAddDevice(payload));
      break;
    case "configIos":
    case "execIos":
      errors = errors.concat(validateIosCommand(payload, commandType));
      break;
    case "addLink":
      errors = errors.concat(validateAddLink(payload));
      break;
    case "configHost":
      errors = errors.concat(validateConfigHost(payload));
      break;
    case "configDhcpServer":
      errors = errors.concat(validateConfigDhcpServer(payload));
      break;
    case "moveDevice":
      errors = errors.concat(validateMoveDevice(payload));
      break;
    case "removeDevice":
    case "listDevices":
      errors = errors.concat(validateDeviceOperation(payload));
      break;
    default:
      break;
  }

  return { valid: errors.length === 0, errors: errors };
}

// Re-exportar funciones para compatibilidad
export { sanitizeDeviceName, sanitizePath, safeJsonParse };
