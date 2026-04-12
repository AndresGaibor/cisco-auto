// packages/pt-runtime/src/runtime/payload-validator.ts
// Runtime Payload Validator — Validates payloads in QtScript where TypeScript
// types don't exist. Uses manual checks (no Zod in QtScript — too heavy).

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

var MAX_PAYLOAD_SIZE = 65536;
var MAX_STRING_LENGTH = 4096;
var MAX_ARRAY_LENGTH = 1000;

var IOS_INJECTION_PATTERNS = [
  /\x00/,
  /\x1B/,
  /\r/,
];

var PATH_TRAVERSAL_PATTERNS = [
  /\.\./,
  /\0/,
  /^\/(etc|proc|sys|dev)\//,
];

export function validatePayload(
  commandType: string,
  payload: Record<string, unknown>
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

  if (payload.__proto__ !== undefined || payload.constructor !== undefined || payload.prototype !== undefined) {
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

function validateAddDevice(payload: Record<string, unknown>): Array<{ field: string; message: string }> {
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

function validateIosCommand(payload: Record<string, unknown>, commandType: string): Array<{ field: string; message: string }> {
  var errors: Array<{ field: string; message: string }> = [];

  if (!payload.device || typeof payload.device !== "string") {
    errors.push({ field: "device", message: "device is required and must be a string" });
  }

  if (commandType === "configIos" && Array.isArray(payload.commands)) {
    if (payload.commands.length > MAX_ARRAY_LENGTH) {
      errors.push({ field: "commands", message: "Too many commands (max " + MAX_ARRAY_LENGTH + ")" });
    }
    for (var i = 0; i < payload.commands.length; i++) {
      var cmd = payload.commands[i];
      if (typeof cmd !== "string") {
        errors.push({ field: "commands[" + i + "]", message: "Command must be a string" });
      } else if (cmd.length > MAX_STRING_LENGTH) {
        errors.push({ field: "commands[" + i + "]", message: "Command exceeds maximum length" });
      } else {
        for (var j = 0; j < IOS_INJECTION_PATTERNS.length; j++) {
          if (IOS_INJECTION_PATTERNS[j].test(cmd)) {
            errors.push({
              field: "commands[" + i + "]",
              message: "Command contains potentially dangerous pattern",
            });
            break;
          }
        }
      }
    }
  }

  if (commandType === "execIos") {
    if (!payload.command || typeof payload.command !== "string") {
      errors.push({ field: "command", message: "command is required and must be a string" });
    } else if (payload.command.length > MAX_STRING_LENGTH) {
      errors.push({ field: "command", message: "Command exceeds maximum length" });
    } else {
      for (var j = 0; j < IOS_INJECTION_PATTERNS.length; j++) {
        if (IOS_INJECTION_PATTERNS[j].test(payload.command)) {
          errors.push({
            field: "command",
            message: "Command contains potentially dangerous pattern",
          });
          break;
        }
      }
    }
  }

  return errors;
}

function validateAddLink(payload: Record<string, unknown>): Array<{ field: string; message: string }> {
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

function validateConfigHost(payload: Record<string, unknown>): Array<{ field: string; message: string }> {
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

function validateConfigDhcpServer(payload: Record<string, unknown>): Array<{ field: string; message: string }> {
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

function validateMoveDevice(payload: Record<string, unknown>): Array<{ field: string; message: string }> {
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

function validateDeviceOperation(payload: Record<string, unknown>): Array<{ field: string; message: string }> {
  var errors: Array<{ field: string; message: string }> = [];

  if (!payload.device || typeof payload.device !== "string") {
    errors.push({ field: "device", message: "device is required" });
  }

  return errors;
}

function isValidIpv4(ip: string): boolean {
  var parts = ip.split(".");
  if (parts.length !== 4) return false;
  for (var i = 0; i < 4; i++) {
    var num = parseInt(parts[i], 10);
    if (isNaN(num) || num < 0 || num > 255) return false;
  }
  return true;
}

export function sanitizeDeviceName(name: string): string {
  return String(name || "").replace(/[^a-zA-Z0-9_\-]/g, "_").substring(0, 64);
}

export function sanitizePath(path: string, devDir: string): string {
  var clean = String(path || "").replace(/\0/g, "");

  if (clean.charAt(0) === "/") {
    return devDir + "/" + clean.substring(1);
  }

  if (clean.indexOf("..") >= 0) {
    return devDir + "/" + clean.replace(/\.\./g, "");
  }

  return devDir + "/" + clean;
}

export function safeJsonParse(text: string): unknown {
  var parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return null;
  }

  if (parsed === null || typeof parsed !== "object") {
    return parsed;
  }

  return stripDangerousKeys(parsed);
}

function stripDangerousKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    var result = [];
    for (var i = 0; i < obj.length; i++) {
      result.push(stripDangerousKeys(obj[i]));
    }
    return result;
  }

  var clean: Record<string, unknown> = {};
  var keys = Object.keys(obj);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      continue;
    }
    clean[key] = stripDangerousKeys((obj as Record<string, unknown>)[key]);
  }
  return clean;
}
