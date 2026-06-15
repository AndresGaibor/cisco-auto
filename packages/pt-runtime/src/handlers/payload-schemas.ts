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
