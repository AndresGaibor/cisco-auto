import { z } from 'zod';

// Schema para template de puerto individual
export const portTemplateSchema = z.object({
  type: z.enum(['access', 'trunk', 'voice', 'guest', 'management', 'server', 'uplink', 'shutdown']),
  description: z.string().optional(),
  vlan: z.number().int().min(1).max(4094).optional(),
  nativeVlan: z.number().int().min(1).max(4094).optional(),
  allowedVlans: z.array(z.number().int().min(1).max(4094)).optional(),
  voiceVlan: z.number().int().min(1).max(4094).optional(),
  shutdown: z.boolean().optional(),
  speed: z.enum(['auto', '10', '100', '1000']).optional(),
  duplex: z.enum(['auto', 'full', 'half']).optional(),
  stpPortfast: z.boolean().optional(),
  stpBpduguard: z.boolean().optional(),
  portSecurity: z.boolean().optional(),
  maxMacAddresses: z.number().int().min(1).optional(),
});

export type PortTemplate = z.output<typeof portTemplateSchema>;
export type PortTemplateInput = z.input<typeof portTemplateSchema>;

// Schema para aplicación de template a interfaces
const interfaceTemplateSpecSchema = z.object({
  interfaceName: z.string().min(1),
  template: portTemplateSchema,
});

// Schema raíz de configuración de port-template
export const portTemplateConfigSchema = z.object({
  deviceName: z.string().min(1),
  interfaces: z.array(interfaceTemplateSpecSchema).min(1, { message: 'At least one interface template is required' }),
});

export type PortTemplateConfig = z.output<typeof portTemplateConfigSchema>;
export type PortTemplateConfigInput = z.input<typeof portTemplateConfigSchema>;
