import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';
import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';
import { basicConfigSchema, type BasicConfigInput } from './basic-config.schema.js';
import { toValidationResult } from '../shared/validation.utils.js';
export { generateBasicCommands, verifyShowRunningConfig, BASIC_VERIFY_COMMANDS } from './basic-config.generator.js';

export function validateBasicConfig(spec: unknown): PluginValidationResult {
  const parsed = basicConfigSchema.safeParse(spec);

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

  // Validar que si hay SSH, se requiere domainName
  if (config.ssh && !config.ssh.domainName) {
    errors.push({
      path: 'ssh.domainName',
      message: 'SSH requiere domainName',
      code: 'ssh_requires_domain',
    });
  }

  // Validar líneas
  for (const [index, line] of (config.lines ?? []).entries()) {
    if (line.type === 'vty' && line.transportInput === 'telnet' && !line.password && !line.loginLocal) {
      errors.push({
        path: `lines.${index}`,
        message: 'Líneas VTY con telnet requieren password o login local',
        code: 'vty_requires_auth',
      });
    }
  }

  return toValidationResult(errors);
}

export const basicConfigPlugin: ProtocolPlugin = {
  id: 'basic-config',
  category: 'services',
  name: 'Configuración Básica',
  version: '1.0.0',
  description: 'Genera y valida configuración básica del dispositivo IOS: hostname, banner, líneas, SSH, timezone.',
  commands: [
    {
      name: 'configure-basic',
      description: 'Generar comandos IOS para configuración básica (hostname, banner, líneas, SSH)',
      inputSchema: basicConfigSchema,
      examples: [
        {
          input: {
            deviceName: 'R1',
            hostname: 'Router-Core',
            banner: { motd: 'ACCESO RESTRINGIDO\nSolo personal autorizado' },
            lines: [
              { type: 'console', loggingSynchronous: true },
              { type: 'vty', transportInput: 'ssh', loginLocal: true, execTimeout: 5 },
            ],
            ssh: { domainName: 'cisco.local', keySize: 2048, version: 2 },
          } satisfies BasicConfigInput,
          description: 'Configuración básica con hostname, banner, líneas y SSH',
        },
        {
          input: {
            deviceName: 'SW1',
            hostname: 'Switch-Access',
            passwordEncryption: true,
            noIpDomainLookup: true,
            loggingSynchronous: true,
          } satisfies BasicConfigInput,
          description: 'Configuración mínima sin SSH',
        },
      ],
    },
  ],
  validate: validateBasicConfig,
};
