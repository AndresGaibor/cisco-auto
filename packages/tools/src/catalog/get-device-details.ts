import type { Tool, ToolInput, ToolResult } from '@cisco-auto/core';
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
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'El parametro model es requerido'
        }
      };
    }
    
    const device = deviceCatalog.find(d => d.name === model);
    
    if (!device) {
      return {
        success: false,
        error: {
          code: 'DEVICE_NOT_FOUND',
          message: `Dispositivo '${model}' no encontrado en el catalogo`,
          suggestions: [
            'Use pt_list_devices para ver los modelos disponibles',
            `Verifique que el modelo '${model}' este escrito correctamente`
          ]
        }
      };
    }
    
    return {
      success: true,
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
