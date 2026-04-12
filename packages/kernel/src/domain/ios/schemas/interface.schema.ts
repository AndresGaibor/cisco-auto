import { z } from 'zod';
import { isValidIpv4Address, isValidSubnetMask } from '../value-objects/ipv4-address.vo.js';
import { isValidInterfaceName } from '../value-objects/interface-name.vo.js';

/**
 * Schema para validar direcciones IPv4 usando Value Object
 */
const ipv4AddressSchema = z.string().refine(
  (val) => isValidIpv4Address(val),
  { message: 'Dirección IPv4 inválida' }
);

/**
 * Schema para validar máscaras de subred usando Value Object
 */
const subnetMaskSchema = z.string().refine(
  (val) => isValidSubnetMask(val),
  { message: 'Máscara de subred inválida' }
);

/**
 * Schema para validar nombres de interfaz Cisco IOS
 */
const interfaceNameSchema = z.string().refine(
  (val) => isValidInterfaceName(val),
  { message: 'Nombre de interfaz inválido (formato esperado: GigabitEthernet0/0)' }
);

/**
 * Schema para validar descripción de interfaz
 */
const interfaceDescriptionSchema = z
  .string()
  .min(1, 'Descripción no puede estar vacía')
  .max(240, 'Descripción no puede exceder 240 caracteres');

/**
 * Schema principal de configuración de interfaz
 */
export const interfaceConfigSchema = z.object({
  device: z.string().min(1, 'Nombre de dispositivo requerido'),
  name: interfaceNameSchema,
  ip: ipv4AddressSchema.optional(),
  mask: subnetMaskSchema.optional(),
  description: interfaceDescriptionSchema.optional(),
  shutdown: z.boolean().optional().default(false),
  duplex: z.enum(['auto', 'full', 'half']).optional(),
  speed: z.union([z.enum(['auto', '10', '100', '1000']), z.number().int().positive()]).optional(),
});

export type InterfaceConfig = z.output<typeof interfaceConfigSchema>;
export type InterfaceConfigInput = z.input<typeof interfaceConfigSchema>;
