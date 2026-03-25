/**
 * TOOL: pt_list_templates
 * 
 * Lista los templates de topología disponibles.
 */

import type { Tool, ToolInput, ToolResult } from '../../core/types/tool.ts';

// Templates de topología
export const topologyTemplates = [
  {
    name: 'single_lan',
    description: 'Una LAN simple con switch y PCs',
    parameters: [
      { name: 'switchCount', type: 'number', default: 1, description: 'Número de switches' },
      { name: 'pcCount', type: 'number', default: 4, description: 'Número de PCs' }
    ]
  },
  {
    name: 'multi_lan',
    description: 'Múltiples LANs con routing entre ellas',
    parameters: [
      { name: 'routerCount', type: 'number', default: 1, description: 'Número de routers' },
      { name: 'switchCount', type: 'number', default: 2, description: 'Número de switches' },
      { name: 'pcCount', type: 'number', default: 4, description: 'Número de PCs por LAN' },
      { name: 'routingProtocol', type: 'string', default: 'static', description: 'Protocolo de routing (static, ospf, eigrp)' }
    ]
  },
  {
    name: 'multi_lan_wan',
    description: 'LANs conectadas vía WAN',
    parameters: [
      { name: 'routerCount', type: 'number', default: 2, description: 'Número de routers' },
      { name: 'switchCount', type: 'number', default: 2, description: 'Número de switches' },
      { name: 'pcCount', type: 'number', default: 4, description: 'Número de PCs por LAN' },
      { name: 'routingProtocol', type: 'string', default: 'ospf', description: 'Protocolo de routing (static, ospf, eigrp)' }
    ]
  },
  {
    name: 'star',
    description: 'Topología estrella con router central',
    parameters: [
      { name: 'routerCount', type: 'number', default: 1, description: 'Router central' },
      { name: 'switchCount', type: 'number', default: 3, description: 'Número de switches (brazos)' },
      { name: 'pcCount', type: 'number', default: 2, description: 'Número de PCs por brazo' }
    ]
  },
  {
    name: 'hub_spoke',
    description: 'Hub and spoke para VPNs',
    parameters: [
      { name: 'hubRouters', type: 'number', default: 1, description: 'Routers hub' },
      { name: 'spokeRouters', type: 'number', default: 3, description: 'Routers spoke' },
      { name: 'pcCount', type: 'number', default: 2, description: 'Número de PCs por spoke' }
    ]
  },
  {
    name: 'router_on_a_stick',
    description: 'Inter-VLAN routing con subinterfaces',
    parameters: [
      { name: 'routerCount', type: 'number', default: 1, description: 'Router' },
      { name: 'switchCount', type: 'number', default: 1, description: 'Switch' },
      { name: 'vlanCount', type: 'number', default: 3, description: 'Número de VLANs' },
      { name: 'pcCount', type: 'number', default: 2, description: 'Número de PCs por VLAN' }
    ]
  },
  {
    name: 'three_router_triangle',
    description: 'Triángulo de routers para redundancia',
    parameters: [
      { name: 'routerCount', type: 'number', default: 3, description: 'Número de routers' },
      { name: 'switchCount', type: 'number', default: 3, description: 'Número de switches' },
      { name: 'pcCount', type: 'number', default: 2, description: 'Número de PCs por LAN' },
      { name: 'routingProtocol', type: 'string', default: 'ospf', description: 'Protocolo de routing (ospf, eigrp)' }
    ]
  },
  {
    name: 'custom',
    description: 'Template vacío para personalización completa',
    parameters: [
      { name: 'routerCount', type: 'number', default: 0, description: 'Número de routers' },
      { name: 'switchCount', type: 'number', default: 0, description: 'Número de switches' },
      { name: 'pcCount', type: 'number', default: 0, description: 'Número de PCs' },
      { name: 'serverCount', type: 'number', default: 0, description: 'Número de servidores' }
    ]
  }
];

/**
 * Tool para listar templates de topología
 */
export const ptListTemplatesTool: Tool = {
  name: 'pt_list_templates',
  description: 'Lista los templates de topología disponibles',
  longDescription: 'Retorna los templates predefinidos para crear topologías de red, incluyendo sus parámetros configurables.',
  category: 'catalog',
  tags: ['catalog', 'templates', 'topology'],
  inputSchema: {
    type: 'object',
    properties: {}
  },
  handler: async (): Promise<ToolResult> => {
    return {
      success: true,
      data: {
        templates: topologyTemplates,
        total: topologyTemplates.length
      },
      metadata: {
        itemCount: topologyTemplates.length
      }
    };
  }
};
