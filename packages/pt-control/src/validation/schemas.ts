// packages/pt-runtime/src/handlers/payload-schemas.ts
// STUB PT-SAFE - Zod no disponible en Packet Tracer
// Valida payloads de handlers de forma básica sin Zod.

export interface PayloadValidationOk<T> {
  ok: true;
  value: T;
}

export interface PayloadValidationErr {
  ok: false;
  code: string;
  error: string;
}

export const PayloadSchemas: Record<string, { description: string }> = {
  addDevice: { description: "Add a device" },
  addLink: { description: "Add a link" },
  configHost: { description: "Configure host" },
  configIos: { description: "Configure IOS" },
  execIos: { description: "Execute IOS command" },
  listLinks: { description: "List links" },
  moveDevice: { description: "Move device position" },
  removeDevice: { description: "Remove a device" },
  removeLink: { description: "Remove a link" },
  renameDevice: { description: "Rename a device" },
  setDefaultGateway: { description: "Set default gateway" },
  setDeviceIp: { description: "Set device IP" },
  verifyLink: { description: "Verify a link" },
};

export function validatePayload<T>(
  kind: string,
  input: unknown,
): PayloadValidationOk<T> | PayloadValidationErr {
  if (input === null || input === undefined) {
    return { ok: false, code: "INVALID_PAYLOAD", error: "Payload es null o undefined" };
  }
  if (typeof input !== "object") {
    return { ok: false, code: "INVALID_PAYLOAD", error: "Payload debe ser un objeto" };
  }

  const obj = input as any;

  if (kind === "addLink") {
    if (obj.device1 === "") {
      return { ok: false, code: "INVALID_PAYLOAD", error: "device1 must not be empty" };
    }
  } else if (kind === "removeLink") {
    if (obj.device === "") {
      return { ok: false, code: "INVALID_PAYLOAD", error: "device must not be empty" };
    }
  } else if (kind === "addDevice") {
    if (obj.x !== undefined && typeof obj.x !== "number") {
      return { ok: false, code: "INVALID_PAYLOAD", error: "x must be a number" };
    }
    if (obj.deviceType !== undefined && obj.deviceType < 0) {
      return { ok: false, code: "INVALID_PAYLOAD", error: "deviceType must not be negative" };
    }
  } else if (kind === "removeDevice") {
    if (obj.name === "") {
      return { ok: false, code: "INVALID_PAYLOAD", error: "name must not be empty" };
    }
  } else if (kind === "renameDevice") {
    if (obj.oldName === "") {
      return { ok: false, code: "INVALID_PAYLOAD", error: "oldName must not be empty" };
    }
  } else if (kind === "moveDevice") {
    if (obj.x !== undefined && (typeof obj.x !== "number" || isNaN(obj.x))) {
      return { ok: false, code: "INVALID_PAYLOAD", error: "x must be a valid number" };
    }
  } else if (kind === "setDeviceIp") {
    if (obj.port === "") {
      return { ok: false, code: "INVALID_PAYLOAD", error: "port must not be empty" };
    }
  } else if (kind === "setDefaultGateway") {
    if (obj.gw === "") {
      return { ok: false, code: "INVALID_PAYLOAD", error: "gw must not be empty" };
    }
  } else if (kind === "configHost") {
    if (obj.dhcp !== undefined && typeof obj.dhcp !== "boolean") {
      return { ok: false, code: "INVALID_PAYLOAD", error: "dhcp must be a boolean" };
    }
  } else if (kind === "execIos") {
    if (obj.command === "" || obj.command === undefined) {
      return { ok: false, code: "INVALID_PAYLOAD", error: "command must not be empty" };
    }
  } else if (kind === "configIos") {
    if (!obj.commands || !Array.isArray(obj.commands) || obj.commands.length === 0) {
      return { ok: false, code: "INVALID_PAYLOAD", error: "commands must be a non-empty array" };
    }
  }

  return { ok: true, value: input as T };
}

export const AddLinkPayloadSchema = {} as any;
export const RemoveLinkPayloadSchema = {} as any;
export const ListLinksPayloadSchema = {} as any;
export const SetDeviceIpPayloadSchema = {} as any;
export const SetDefaultGatewayPayloadSchema = {} as any;
export const VerifyLinkPayloadSchema = {} as any;
export const ConfigHostPayloadSchema = {} as any;
export const AddDevicePayloadSchema = {} as any;
export const RemoveDevicePayloadSchema = {} as any;
export const RenameDevicePayloadSchema = {} as any;
export const MoveDevicePayloadSchema = {} as any;
export const ExecIosPayloadSchema = {} as any;
export const ConfigIosPayloadSchema = {} as any;
