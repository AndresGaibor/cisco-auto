import type { Tool, ToolInput, ToolResult } from '../..';
import { deviceCatalog } from './list-devices';

export const ptGetDeviceDetailsTool: Tool = {
  name: 'pt_get_device_details',
  description: 'Obtiene detalles completos de un modelo de dispositivo específico',
  longDescription: 'Retorna información detallada de un dispositivo incluyendo todos sus puertos, especificaciones técnicas y capacidades.',
  category: 'catalog',
  tags: ['catalog', 'devices', 'details'],
  inputSchema: {
    type: 'object',
    properties: {
      model: {
        type: 'string',
        description: 'Nombre del modelo (ej: 2911, 2960-24TT)'
      }
    },
    required: ['model']
  },
  handler: async (input: ToolInput): Promise<ToolResult> => {
    const model = input.model as string;
    
    if (!model) {
      return {
        ok: false,
        error: 'El parametro model es requerido',
        code: 'INVALID_INPUT'
      };
    }
    
    const device = deviceCatalog.find(d => d.name === model);

    if (!device) {
      return {
        ok: false,
        error: `Dispositivo '${model}' no encontrado en el catalogo`,
        code: 'DEVICE_NOT_FOUND',
        details: { suggestions: deviceCatalog.slice(0, 3).map(d => d.name) }
      };
    }
    
    return {
      ok: true,
      data: {
        device: {
          name: device.name,
          type: device.type,
          ptType: device.ptType,
          description: device.description,
          ports: device.ports,
          portCount: device.ports.length,
          maxModules: device.maxModules,
          defaultIOS: device.defaultIOS
        }
      }
    };
  }
};
