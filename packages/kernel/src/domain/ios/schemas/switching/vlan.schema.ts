import { z } from 'zod';
import { VlanId } from '../../value-objects/vlan-id.vo.js';
import { VlanName } from '../../value-objects/vlan-name.vo.js';

/**
 * Schema para validar VLAN ID usando Value Object
 */
const vlanIdSchema = z
  .union([z.number().int(), z.string().regex(/^\d+$/)])
  .refine(
    (value) => VlanId.isValid(value),
    { message: 'ID de VLAN inválido (debe ser 1-4094)' }
  );

/**
 * Schema para validar nombre de VLAN usando Value Object
 */
const vlanNameSchema = z
  .string()
  .refine(
    (value) => VlanName.isValid(value),
    { message: 'Nombre de VLAN inválido (máx 32 caracteres, debe comenzar con letra)' }
  );

/**
 * Schema para entrada individual de VLAN
 */
export const vlanEntrySchema = z.object({
  id: vlanIdSchema,
  name: vlanNameSchema,
  state: z.enum(['active', 'suspended', 'act/unsup']).optional().default('active'),
});

/**
 * Schema para configuración de puerto de acceso
 */
export const accessPortSchema = z.object({
  port: z.string().min(1, 'Nombre de puerto requerido'),
  vlan: vlanIdSchema,
});

/**
 * Schema principal de configuración VLAN
 */
export const vlanConfigSchema = z.object({
  switchName: z.string().min(1, 'Nombre del switch requerido'),
  vlans: z.array(vlanEntrySchema).min(1, 'Debe haber al menos una VLAN'),
  trunkPorts: z.array(z.string().min(1)).optional(),
  accessPorts: z.array(accessPortSchema).optional(),
});

/**
 * Schema para configuración de interfaz SVI (Switched Virtual Interface)
 */
export const sviEntrySchema = z.object({
  vlanId: vlanIdSchema,
  ipAddress: z.string().min(1, 'Dirección IP requerida'),
  subnetMask: z.string().min(1, 'Máscara de subred requerida'),
  description: z.string().optional(),
  shutdown: z.boolean().optional().default(false),
});

export const sviConfigSchema = z.object({
  deviceName: z.string().min(1, 'Nombre de dispositivo requerido'),
  svis: z.array(sviEntrySchema).min(1, 'Debe haber al menos una SVI'),
  ipRouting: z.boolean().optional().default(false),
});

export type VlanConfigEntry = z.output<typeof vlanEntrySchema>;
export type VlanConfigEntryInput = z.input<typeof vlanEntrySchema>;
export type VlanConfig = z.output<typeof vlanConfigSchema>;
export type VlanConfigInput = z.input<typeof vlanConfigSchema>;
export type SviConfig = z.output<typeof sviConfigSchema>;
export type SviConfigInput = z.input<typeof sviConfigSchema>;
