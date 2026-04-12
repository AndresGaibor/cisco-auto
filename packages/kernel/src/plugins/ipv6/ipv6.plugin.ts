import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';
import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';
import { ipv6ConfigSchema, type Ipv6ConfigInput } from './ipv6.schema.js';
export { generateIpv6Commands, IPV6_VERIFY_COMMANDS } from './ipv6.generator.js';

function toValidationResult(errors: PluginValidationResult['errors']): PluginValidationResult {
  return {
    ok: errors.length === 0,
    errors,
  };
}

export function validateIpv6Config(spec: unknown): PluginValidationResult {
  const parsed = ipv6ConfigSchema.safeParse(spec);

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

  // Validar que al menos una configuración exista
  const hasRouting = config.routing === true;
  const hasInterfaces = config.interfaces && config.interfaces.length > 0;
  const hasStaticRoutes = config.staticRoutes && config.staticRoutes.length > 0;
  const hasRipng = !!config.ripng;
  const hasOspfv3 = !!config.ospfv3;

  if (!hasRouting && !hasInterfaces && !hasStaticRoutes && !hasRipng && !hasOspfv3) {
    errors.push({
      path: 'config',
      message: 'At least one IPv6 configuration element must be provided',
      code: 'no_ipv6_config',
    });
  }

  return toValidationResult(errors);
}

export const ipv6Plugin: ProtocolPlugin = {
  id: 'ipv6',
  category: 'routing',
  name: 'IPv6',
  version: '1.0.0',
  description: 'Generates and validates IOS IPv6 configuration including unicast-routing, interface addresses, static routes, RIPng, and OSPFv3.',
  commands: [
    {
      name: 'configure-ipv6',
      description: 'Generate IOS commands for IPv6 routing, interface configuration, and dynamic protocols',
      inputSchema: ipv6ConfigSchema,
      examples: [
        {
          input: {
            deviceName: 'R1',
            routing: true,
            interfaces: [
              {
                name: 'GigabitEthernet0/0',
                address: '2001:db8:1::1/64',
                linkLocal: 'fe80::1',
              },
              {
                name: 'GigabitEthernet0/1',
                address: '2001:db8:2::1/64',
                ospfv3: { processId: 1, area: '0' },
              },
            ],
            staticRoutes: [
              { network: '2001:db8:100::/64', nextHop: '2001:db8:1::2' },
            ],
          } satisfies Ipv6ConfigInput,
          description: 'Configure IPv6 routing with interfaces and static route',
        },
        {
          input: {
            deviceName: 'R1',
            routing: true,
            ospfv3: {
              processId: 1,
              routerId: '1.1.1.1',
              areas: [{ areaId: '0', type: 'normal' }],
            },
          } satisfies Ipv6ConfigInput,
          description: 'Configure OSPFv3 process',
        },
      ],
    },
  ],
  validate: validateIpv6Config,
};
