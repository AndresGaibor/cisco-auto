import { z } from 'zod';
import { DeviceSchema } from './device.js';

/**
 * Lab Schemas - Laboratory topology and validation
 * Single Source of Truth for lab-related schemas
 */

// Schema para conexión entre dispositivos
export const ConnectionSchema = z.object({
  from: z.string().describe('Nombre del dispositivo origen'),
  to: z.string().describe('Nombre del dispositivo destino'),
  fromInterface: z.string().describe('Interfaz origen'),
  toInterface: z.string().describe('Interfaz destino'),
  type: z.enum(['ethernet', 'serial', 'console', 'coaxial', 'fiber', 'wireless']).default('ethernet'),
  description: z.string().optional()
});

// Schema para validación del lab
export const ValidationSchema = z.object({
  connectivity: z.array(z.object({
    from: z.string().describe('Dispositivo origen'),
    to: z.string().describe('Dispositivo destino'),
    expected: z.enum(['success', 'fail']).default('success'),
    protocol: z.enum(['icmp', 'tcp', 'udp']).default('icmp')
  })).optional(),
  routing: z.array(z.object({
    device: z.string(),
    protocol: z.enum(['ospf', 'eigrp', 'bgp', 'static']).optional(),
    expectedRoutes: z.number().min(1)
  })).optional(),
  vlans: z.array(z.object({
    switch: z.string(),
    vlanId: z.number(),
    expectedPorts: z.number()
  })).optional()
});

// Schema completo del laboratorio
export const LabSchema = z.object({
  metadata: z.object({
    name: z.string().describe('Nombre del laboratorio'),
    description: z.string().optional(),
    version: z.string().default('1.0'),
    author: z.string().optional(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
    estimatedTime: z.string().optional().describe('Tiempo estimado (ej: 45 min)')
  }),

  topology: z.object({
    devices: z.array(DeviceSchema).min(1).describe('Lista de dispositivos en la topología'),
    connections: z.array(ConnectionSchema).optional().describe('Conexiones entre dispositivos')
  }),

  objectives: z.array(z.object({
    id: z.string(),
    description: z.string(),
    points: z.number().default(10),
    validation: z.enum(['connectivity', 'configuration', 'show_command']).default('configuration')
  })).optional(),

  validation: ValidationSchema.optional(),

  instructions: z.string().optional().describe('Instrucciones del laboratorio'),

  resources: z.object({
    pkaFile: z.string().optional().describe('Ruta al archivo .pka original'),
    pktFile: z.string().optional().describe('Ruta al archivo .pkt original'),
    solution: z.string().optional().describe('Ruta al archivo con solución')
  }).optional()
});

// Helper functions
export function zodValidateLab(data: unknown): Lab {
  return LabSchema.parse(data);
}

export function validateLabSafe(data: unknown): { success: boolean; data?: Lab; errors?: string[] } {
  const result = LabSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { 
      success: false, 
      errors: result.error.issues.map((e) => `${e.path?.join('.') ?? ''}: ${e.message}`) 
    };
  }
}

/**
 * Conexión entre dos dispositivos en una topología
 * Usar para definir enlaces físicos en labs
 */
export type Connection = z.infer<typeof ConnectionSchema>;

/**
 * Reglas de validación para un laboratorio
 * Usar para definir checks de conectividad y routing
 */
export type Validation = z.infer<typeof ValidationSchema>;

/**
 * Configuración completa de un laboratorio Packet Tracer
 * Usar para definir labs de práctica o evaluación
 */
export type Lab = z.infer<typeof LabSchema>;
