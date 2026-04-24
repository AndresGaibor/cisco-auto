import type { ProtocolPlugin } from '../../plugin-api/protocol.plugin.js';
import type { PluginValidationResult } from '../../plugin-api/plugin.types.js';
import { routingConfigSchema, type RoutingConfigInput } from './routing.schema.js';
import { toValidationResult } from '../shared/validation.utils.js';
export { generateRoutingCommands, ROUTING_VERIFY_COMMANDS } from './routing.generator.js';

/**
 * Valida la configuración de routing.
 * Verifica que al menos un protocolo esté configurado (static, OSPF, EIGRP o BGP)
 * y que no haya vecinos BGP duplicados.
 * 
 * @param spec - Configuración sin parsear
 * @returns Resultado de validación con errores si hay
 */
export function validateRoutingConfig(spec: unknown): PluginValidationResult {
  const parsed = routingConfigSchema.safeParse(spec);

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

  // Validar que al menos un protocolo esté configurado
  const hasStatic = config.staticRoutes && config.staticRoutes.length > 0;
  const hasOspf = !!config.ospf;
  const hasEigrp = !!config.eigrp;
  const hasBgp = !!config.bgp;

  if (!hasStatic && !hasOspf && !hasEigrp && !hasBgp) {
    errors.push({
      path: 'config',
      message: 'At least one routing protocol or static route must be configured',
      code: 'no_routing_protocol',
    });
  }

  // Validar duplicados en vecinos BGP
  if (config.bgp) {
    const seenNeighbors = new Set<string>();
    for (const [index, neighbor] of config.bgp.neighbors.entries()) {
      if (seenNeighbors.has(neighbor.ip)) {
        errors.push({
          path: `bgp.neighbors.${index}.ip`,
          message: `Duplicate BGP neighbor ${neighbor.ip}`,
          code: 'duplicate_bgp_neighbor',
        });
      }
      seenNeighbors.add(neighbor.ip);
    }
  }

  return toValidationResult(errors);
}

export const routingPlugin: ProtocolPlugin = {
  id: 'routing',
  category: 'routing',
  name: 'Routing',
  version: '1.0.0',
  description: 'Generates and validates IOS routing configuration for OSPF, EIGRP, BGP, and Static routes.',
  commands: [
    {
      name: 'configure-routing',
      description: 'Generate IOS commands for OSPF, EIGRP, BGP, and static routing',
      inputSchema: routingConfigSchema,
      examples: [
        {
          input: {
            deviceName: 'R1',
            ospf: {
              processId: 1,
              routerId: '1.1.1.1',
              areas: [
                {
                  areaId: 0,
                  networks: [
                    { network: '192.168.1.0', wildcard: '0.0.0.255' },
                  ],
                },
              ],
            },
          } satisfies RoutingConfigInput,
          description: 'Configure OSPF process 1 with area 0',
        },
        {
          input: {
            deviceName: 'R1',
            bgp: {
              asn: 65000,
              routerId: '1.1.1.1',
              neighbors: [
                { ip: '10.0.0.2', remoteAs: 65001, description: 'ISP Peer' },
              ],
            },
          } satisfies RoutingConfigInput,
          description: 'Configure BGP with eBGP neighbor',
        },
      ],
    },
  ],
  validate: validateRoutingConfig,
};
