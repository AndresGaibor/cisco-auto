/**
 * TOOL: pt_deploy
 *
 * Despliega configuraciones de dispositivos al portapapeles o archivo.
 */
/**
 * Tool para desplegar configuraciones de dispositivos
 */
export const ptDeployTool = {
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
                        deviceType: { type: 'string', description: 'Tipo de dispositivo', enum: ['router', 'switch', 'multilayer-switch', 'pc', 'server'] },
                        iosConfig: { type: 'string', description: 'Configuración IOS del dispositivo' },
                        yamlConfig: { type: 'string', description: 'Configuración YAML (opcional)' },
                        jsonConfig: { type: 'string', description: 'Configuración JSON (opcional)' }
                    },
                    required: ['deviceId', 'deviceName', 'iosConfig']
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
    handler: async (input) => {
        const rawConfigs = input.configs || [];
        const target = input.target;
        const filename = input.filename || 'deploy-config.txt';
        // Normalizar ambas formas de entrada (legacy {name, config} y nuevo DeployedDevice)
        const configs = rawConfigs.map((c) => {
            if (!c)
                return { deviceId: 'unknown', deviceName: 'unknown', deviceType: 'router', iosConfig: '' };
            const configObj = c;
            if ('iosConfig' in configObj || 'deviceId' in configObj) {
                return configObj;
            }
            // legacy shape: { name, config }
            const deviceType = (configObj.name && typeof configObj.name === 'string' && configObj.name.toLowerCase().startsWith('router')) ? 'router' : (configObj.name && configObj.name.toLowerCase().startsWith('switch')) ? 'switch' : 'pc';
            return {
                deviceId: configObj.name ?? configObj.deviceId ?? 'unknown',
                deviceName: configObj.name ?? configObj.deviceName ?? configObj.deviceId ?? 'unknown',
                deviceType,
                iosConfig: configObj.config ?? '',
                yamlConfig: configObj.yamlConfig,
                jsonConfig: configObj.jsonConfig
            };
        });
        // Validar que haya configuraciones
        if (!configs || configs.length === 0) {
            return {
                ok: false,
                error: 'Se requiere al menos una configuración de dispositivo',
                code: 'INVALID_INPUT'
            };
        }
        // Unir todas las configuraciones en un solo texto
        const joinedConfig = configs
            .map(c => `!=== ${c.deviceName || c.deviceId} ===!\n${c.iosConfig}`)
            .join('\n\n');
        const charCount = joinedConfig.length;
        // Construir resumen básico del deploy
        const summary = {
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
                ok: true,
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
                    ok: true,
                    data: { summary, message: `Configuraciones guardadas en ${outputPath}`, outputPath, charCount, failedDevices: [] }
                };
            }
            catch (err) {
                return {
                    ok: false,
                    error: `Error al escribir el archivo: ${err.message}`,
                    code: 'FILE_WRITE_ERROR'
                };
            }
        }
        // Caso no alcanzado (validación del schema debería prevenir esto)
        return {
            ok: false,
            error: 'Target debe ser "clipboard" o "file"',
            code: 'INVALID_INPUT'
        };
    }
};
//# sourceMappingURL=deploy.js.map