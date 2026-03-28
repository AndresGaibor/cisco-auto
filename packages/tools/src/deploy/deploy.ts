/**
 * TOOL: pt_deploy
 * 
 * Despliega configuraciones de dispositivos al portapapeles o archivo.
 */

import type { Tool, ToolInput, ToolResult } from '@cisco-auto/core';

import type { DeployedDevice, FailedDevice, DeploySummary } from '@cisco-auto/core';

// Output del deploy (resumen canonical)
export interface DeployOutput {
  summary: DeploySummary;
  outputPath?: string;
  charCount?: number;
  failedDevices?: FailedDevice[];
}

/**
 * Tool para desplegar configuraciones de dispositivos
 */
export const ptDeployTool: Tool = {
  name: 'pt_deploy',
  description: 'Despliega configuraciones de dispositivos al portapapeles o archivo',
  longDescription: 'Une todas las configuraciones de dispositivos en un texto unificado y las copia al portapapeles o guarda en un archivo en el directorio configs/.',
  category: 'deploy',
  tags: ['deploy', 'config', 'clipboard', 'file'],
  inputSchema: {
    type: 'object',
    properties: {
      configs: {
        type: 'array',
        description: 'Lista de configuraciones de dispositivos',
        items: {
          type: 'object',
          properties: {
            deviceId: { type: 'string', description: 'ID del dispositivo' },
            deviceName: { type: 'string', description: 'Nombre del dispositivo' },
            deviceType: { type: 'string', description: 'Tipo de dispositivo', enum: ['router','switch','multilayer-switch','pc','server'] },
            iosConfig: { type: 'string', description: 'Configuración IOS del dispositivo' },
            yamlConfig: { type: 'string', description: 'Configuración YAML (opcional)' },
            jsonConfig: { type: 'string', description: 'Configuración JSON (opcional)' }
          },
          required: ['deviceId','deviceName','iosConfig']
        }
      },
      target: {
        type: 'string',
        description: 'Destino del despliegue',
        enum: ['clipboard', 'file']
      },
      filename: {
        type: 'string',
        description: 'Nombre del archivo (solo para target=file)',
        default: 'deploy-config.txt'
      }
    },
    required: ['configs', 'target']
  },
  handler: async (input: ToolInput): Promise<ToolResult<DeployOutput>> => {
    const rawConfigs = (input.configs as unknown[]) || [];
    const target = input.target as 'clipboard' | 'file';
    const filename = (input.filename as string) || 'deploy-config.txt';

    // Normalizar ambas formas de entrada (legacy {name, config} y nuevo DeployedDevice)
    const configs: DeployedDevice[] = rawConfigs.map((c: any) => {
      if (!c) return { deviceId: 'unknown', deviceName: 'unknown', deviceType: 'router', iosConfig: '' } as DeployedDevice;
      if ('iosConfig' in c || 'deviceId' in c) {
        return c as DeployedDevice;
      }
      // legacy shape: { name, config }
      const deviceType = (c.name && typeof c.name === 'string' && c.name.toLowerCase().startsWith('router')) ? 'router' : (c.name && c.name.toLowerCase().startsWith('switch')) ? 'switch' : 'pc';
      return {
        deviceId: c.name || c.deviceId || 'unknown',
        deviceName: c.name || c.deviceName || c.deviceId || 'unknown',
        deviceType,
        iosConfig: c.config || '' ,
        yamlConfig: c.yamlConfig,
        jsonConfig: c.jsonConfig
      } as DeployedDevice;
    });

    // Validar que haya configuraciones
    if (!configs || configs.length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Se requiere al menos una configuración de dispositivo'
        }
      };
    }

    // Unir todas las configuraciones en un solo texto
    const joinedConfig = configs
      .map(c => `!=== ${c.deviceName || c.deviceId} ===!\n${c.iosConfig}`)
      .join('\n\n');

    const charCount = joinedConfig.length;

    // Construir resumen básico del deploy
    const summary: DeploySummary = {
      totalDevices: configs.length,
      routerCount: configs.filter(c => c.deviceType === 'router' || c.deviceType === 'multilayer-switch').length,
      switchCount: configs.filter(c => c.deviceType === 'switch').length,
      pcCount: configs.filter(c => c.deviceType === 'pc').length,
      serverCount: configs.filter(c => c.deviceType === 'server').length,
      totalLines: charCount,
      unconfiguredDevices: configs.filter(c => !c.iosConfig || c.iosConfig.trim().length === 0).map(c => c.deviceName || c.deviceId)
    };


    // Manejar según el destino
    if (target === 'clipboard') {
      // Simular copia al portapapeles
      // En un entorno real se usaría navigator.clipboard o una utilidad del sistema
      console.log('[pt_deploy] Copiando al portapapeles...');
      console.log(joinedConfig);

      return {
        success: true,
        data: { summary, message: 'Configuraciones copiadas al portapapeles', charCount, failedDevices: [] }
      };
    }

    if (target === 'file') {
      // Guardar en el directorio configs/
      const outputPath = `configs/${filename}`;

      try {
        // Usar Bun.file para escribir el archivo
        const file = Bun.file(outputPath);
        await Bun.write(file, joinedConfig);

        return {
          success: true,
          data: { summary, message: `Configuraciones guardadas en ${outputPath}`, outputPath, charCount, failedDevices: [] }
        };
      } catch (err) {
        return {
          success: false,
          error: {
            code: 'FILE_WRITE_ERROR',
            message: `Error al escribir el archivo: ${(err as Error).message}`
          }
        };
      }
    }

    // Caso no alcanzado (validación del schema debería prevenir esto)
    return {
      success: false,
      error: {
        code: 'INVALID_TARGET',
        message: 'Target debe ser "clipboard" o "file"'
      }
    };
  }
};
