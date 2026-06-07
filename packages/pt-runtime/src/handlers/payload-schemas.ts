// packages/pt-runtime/src/handlers/payload-schemas.ts
// Schemas Zod para validar payloads de handlers críticos antes de procesarlos.

import { z } from "zod";

export const AddLinkPayloadSchema = z
  .object({
    type: z.literal("addLink"),
    device1: z.string().min(1),
    port1: z.string().min(1),
    device2: z.string().min(1),
    port2: z.string().min(1),
    linkType: z.string().optional(),
    cableType: z.string().optional(),
    strictPorts: z.boolean().optional(),
    allowAutoFallback: z.boolean().optional(),
    replaceExisting: z.boolean().optional(),
  })
  .describe("Payload para crear un enlace entre dos puertos de dispositivos PT");

export const RemoveLinkPayloadSchema = z
  .object({
    type: z.literal("removeLink"),
    device: z.string().min(1),
    port: z.string().min(1),
    device2: z.string().optional(),
    port2: z.string().optional(),
    strict: z.boolean().optional(),
  })
  .describe("Payload para eliminar un enlace entre dos puertos");

export const ConfigHostPayloadSchema = z
  .object({
    type: z.literal("configHost"),
    device: z.string().min(1),
    ip: z.string().optional(),
    mask: z.string().optional(),
    gateway: z.string().optional(),
    dns: z.string().optional(),
    dhcp: z.boolean().optional(),
  })
  .describe("Payload para configurar un host (PC/Server) con IP estática o DHCP");

export const ExecIosPayloadSchema = z
  .object({
    type: z.literal("execIos"),
    device: z.string().min(1),
    command: z.string().min(1),
    parse: z.boolean().optional(),
    timeout: z.number().int().positive().optional(),
    ensurePrivileged: z.boolean().optional(),
  })
  .describe("Payload para ejecutar un comando IOS contra un dispositivo");

export const ConfigIosPayloadSchema = z
  .object({
    type: z.literal("configIos"),
    device: z.string().min(1),
    commands: z.array(z.string().min(1)).min(1),
    save: z.boolean().optional(),
  })
  .describe("Payload para aplicar una lista de comandos de configuración IOS");

export const VerifyLinkPayloadSchema = z
  .object({
    type: z.literal("verifyLink"),
    device1: z.string().min(1),
    port1: z.string().min(1),
    device2: z.string().min(1),
    port2: z.string().min(1),
    waitGreenMs: z.number().int().nonnegative().optional(),
  })
  .describe("Payload para verificar el estado de un enlace entre dos puertos");

// ---------------------------------------------------------------------------
// Device CRUD schemas
// ---------------------------------------------------------------------------

export const AddDevicePayloadSchema = z
  .object({
    type: z.literal("addDevice"),
    model: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    deviceType: z.number().int().nonnegative().optional(),
  })
  .describe("Payload para agregar un dispositivo nuevo al workspace de PT");

export const RemoveDevicePayloadSchema = z
  .object({
    type: z.literal("removeDevice"),
    name: z.string().min(1),
  })
  .describe("Payload para eliminar un dispositivo existente");

export const RenameDevicePayloadSchema = z
  .object({
    type: z.literal("renameDevice"),
    oldName: z.string().min(1),
    newName: z.string().min(1),
  })
  .describe("Payload para renombrar un dispositivo");

export const MoveDevicePayloadSchema = z
  .object({
    type: z.literal("moveDevice"),
    name: z.string().min(1),
    x: z.number().finite(),
    y: z.number().finite(),
  })
  .describe("Payload para mover un dispositivo a nuevas coordenadas");

// ---------------------------------------------------------------------------
// Device config schemas
// ---------------------------------------------------------------------------

export const SetDeviceIpPayloadSchema = z
  .object({
    type: z.literal("setDeviceIp").optional(),
    device: z.string().min(1),
    port: z.string().min(1),
    ip: z.string().min(1),
    mask: z.string().min(1),
  })
  .describe("Payload para asignar IP y máscara a un puerto de dispositivo");

export const SetDefaultGatewayPayloadSchema = z
  .object({
    type: z.literal("setDefaultGateway").optional(),
    device: z.string().min(1),
    gw: z.string().min(1),
  })
  .describe("Payload para asignar un default gateway a un dispositivo");

export const ListLinksPayloadSchema = z
  .object({
    type: z.literal("listLinks").optional(),
    device: z.string().optional(),
    port: z.string().optional(),
    includeDetails: z.boolean().optional(),
  })
  .describe("Payload para listar enlaces, opcionalmente filtrados por dispositivo o puerto");

// ---------------------------------------------------------------------------
// Derived types
// ---------------------------------------------------------------------------

export type AddLinkPayloadInput = z.infer<typeof AddLinkPayloadSchema>;
export type RemoveLinkPayloadInput = z.infer<typeof RemoveLinkPayloadSchema>;
export type ConfigHostPayloadInput = z.infer<typeof ConfigHostPayloadSchema>;
export type ExecIosPayloadInput = z.infer<typeof ExecIosPayloadSchema>;
export type ConfigIosPayloadInput = z.infer<typeof ConfigIosPayloadSchema>;
export type VerifyLinkPayloadInput = z.infer<typeof VerifyLinkPayloadSchema>;
export type AddDevicePayloadInput = z.infer<typeof AddDevicePayloadSchema>;
export type RemoveDevicePayloadInput = z.infer<typeof RemoveDevicePayloadSchema>;
export type RenameDevicePayloadInput = z.infer<typeof RenameDevicePayloadSchema>;
export type MoveDevicePayloadInput = z.infer<typeof MoveDevicePayloadSchema>;
export type SetDeviceIpPayloadInput = z.infer<typeof SetDeviceIpPayloadSchema>;
export type SetDefaultGatewayPayloadInput = z.infer<typeof SetDefaultGatewayPayloadSchema>;
export type ListLinksPayloadInput = z.infer<typeof ListLinksPayloadSchema>;

export const PayloadSchemas = {
  addLink: AddLinkPayloadSchema,
  removeLink: RemoveLinkPayloadSchema,
  configHost: ConfigHostPayloadSchema,
  execIos: ExecIosPayloadSchema,
  configIos: ConfigIosPayloadSchema,
  verifyLink: VerifyLinkPayloadSchema,
  addDevice: AddDevicePayloadSchema,
  removeDevice: RemoveDevicePayloadSchema,
  renameDevice: RenameDevicePayloadSchema,
  moveDevice: MoveDevicePayloadSchema,
  setDeviceIp: SetDeviceIpPayloadSchema,
  setDefaultGateway: SetDefaultGatewayPayloadSchema,
  listLinks: ListLinksPayloadSchema,
} as const;

export type PayloadKind = keyof typeof PayloadSchemas;

export interface PayloadValidationOk<T> {
  ok: true;
  value: T;
}

export interface PayloadValidationErr {
  ok: false;
  code: "INVALID_PAYLOAD";
  error: string;
}

export function validatePayload<T>(
  kind: PayloadKind,
  input: unknown,
): PayloadValidationOk<T> | PayloadValidationErr {
  const result = PayloadSchemas[kind].safeParse(input);
  if (result.success) {
    return { ok: true, value: result.data as T };
  }
  const error = result.error.issues
    .map((issue) => issue.path.join(".") + ": " + issue.message)
    .join("; ");
  return { ok: false, code: "INVALID_PAYLOAD", error };
}
