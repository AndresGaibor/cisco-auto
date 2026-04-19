import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';
import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';
import { servicesSchema, type ServicesConfigInput } from './services.schema.js';
import { toValidationResult } from '../shared/validation.utils.js';
export { generateServicesCommands, SERVICES_VERIFY_COMMANDS, verifyShowIpDhcpBinding } from './services.generator.js';

export function validateServicesConfig(spec: unknown): PluginValidationResult {
  const parsed = servicesSchema.safeParse(spec);

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

  // Validar pools DHCP
  if (config.dhcp) {
    for (const [index, pool] of config.dhcp.entries()) {
      if (!pool.name || pool.name.length === 0) {
        errors.push({
          path: `dhcp.${index}.name`,
          message: 'DHCP pool name is required',
          code: 'missing_dhcp_pool_name',
        });
      }
    }
  }

  // Validar servidores NTP
  if (config.ntp?.servers) {
    for (const [index, server] of config.ntp.servers.entries()) {
      if (!server.ip || server.ip.length === 0) {
        errors.push({
          path: `ntp.servers.${index}.ip`,
          message: 'NTP server IP is required',
          code: 'missing_ntp_server_ip',
        });
      }
    }
  }

  // Validar servidores Syslog
  if (config.syslog?.servers.length === 0) {
    errors.push({
      path: 'syslog.servers',
      message: 'At least one syslog server is required when syslog is configured',
      code: 'empty_syslog_servers',
    });
  }

  return toValidationResult(errors);
}

export const servicesPlugin: ProtocolPlugin = {
  id: 'services',
  category: 'services',
  name: 'Services',
  version: '1.0.0',
  description: 'Generates and validates IOS services configuration (DHCP, NTP, DNS, Syslog, SNMP).',
  commands: [
    {
      name: 'configure-services',
      description: 'Generate IOS commands for DHCP, NTP, DNS, Syslog, and SNMP',
      inputSchema: servicesSchema,
      examples: [
        {
          input: {
            deviceName: 'R1',
            dhcp: [
              {
                name: 'VLAN10_POOL',
                network: '192.168.10.0',
                mask: '255.255.255.0',
                defaultRouter: '192.168.10.1',
                dnsServers: ['8.8.8.8'],
              },
            ],
            ntp: {
              servers: [{ ip: '0.pool.ntp.org', prefer: true }],
              master: false,
            },
            dns: {
              domainName: 'cisco.local',
              nameServers: ['8.8.8.8', '8.8.4.4'],
            },
            syslog: {
              servers: [{ ip: '192.168.1.100' }],
              trap: 'informational',
            },
            snmp: {
              communities: [{ name: 'public', access: 'ro' }],
              hosts: [{ ip: '192.168.1.100', community: 'public' }],
            },
          } satisfies ServicesConfigInput,
          description: 'Configure all services on a device',
        },
      ],
    },
  ],
  validate: validateServicesConfig,
};
