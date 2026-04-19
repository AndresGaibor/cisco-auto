import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';
import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';
import { deviceConfigSpecSchema, type DeviceConfigSpecInput } from './orchestrator.schema.js';
import { toValidationResult } from '../shared/validation.utils.js';
export { orchestrateConfig, verifyOrchestratedConfig, generateSviCommands, SECTION_ORDER } from './orchestrator.generator.js';

export function validateDeviceConfigSpec(spec: unknown): PluginValidationResult {
  const parsed = deviceConfigSpecSchema.safeParse(spec);

  if (!parsed.success) {
    return toValidationResult(
      parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }))
    );
  }

  const config = parsed.data;

  const errors: PluginValidationResult['errors'] = [];

  if (config.basic && !config.basic.hostname && !config.deviceName) {
    errors.push({
      path: 'basic.hostname',
      message: 'Either basic.hostname or deviceName is required',
      code: 'missing_hostname',
    });
  }

  if (config.vlan?.vlans && config.vlan.vlans.length === 0) {
    errors.push({
      path: 'vlan.vlans',
      message: 'At least one VLAN is required when vlan section is provided',
      code: 'empty_vlan_list',
    });
  }

  if (config.svi?.svis && config.svi.svis.length === 0) {
    errors.push({
      path: 'svi.svis',
      message: 'At least one SVI is required when svi section is provided',
      code: 'empty_svi_list',
    });
  }

  return toValidationResult(errors);
}

export const configOrchestratorPlugin: ProtocolPlugin = {
  id: 'config-orchestrator',
  category: 'services',
  name: 'Configuración Orquestada',
  version: '1.0.0',
  description: 'Orquesta múltiples plugins para generar configuración completa de dispositivo.',
  commands: [
    {
      name: 'configure-device',
      description: 'Generar configuración completa para un dispositivo',
      inputSchema: deviceConfigSpecSchema,
      examples: [
        {
          input: {
            deviceName: 'SW1',
            basic: { hostname: 'Switch-Core', ssh: { domainName: 'cisco.local' } },
            vlan: { vlans: [{ id: 10, name: 'ADMIN' }, { id: 20, name: 'USERS' }] },
            svi: { svis: [{ vlanId: 10, ipAddress: '192.168.10.1', subnetMask: '255.255.255.0' }] },
            stp: { mode: 'rapid-pvst', priority: 4096 },
          } satisfies DeviceConfigSpecInput,
          description: 'Switch L3 con VLANs, SVIs y STP',
        },
      ],
    },
  ],
  validate: validateDeviceConfigSpec,
};
