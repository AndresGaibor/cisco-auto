/**
 * TOOL: pt_list_devices
 * 
 * Lista los dispositivos disponibles en el catálogo de Packet Tracer.
 */

import type { Tool, ToolInput, ToolResult } from '@cisco-auto/core';

// Catálogo de dispositivos Cisco
export const deviceCatalog = [
  {
    name: '1941',
    type: 'router',
    ptType: 'Router-PT',
    description: 'Router Cisco 1941 con 2 puertos GigabitEthernet',
    ports: [
      { name: 'GigabitEthernet0/0', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/1', type: 'gigabitethernet', speed: '1Gbps', available: true }
    ],
    maxModules: 2,
    defaultIOS: '15.1'
  },
  {
    name: '2901',
    type: 'router',
    ptType: 'Router-PT',
    description: 'Router Cisco 2901 con 2 puertos GigabitEthernet',
    ports: [
      { name: 'GigabitEthernet0/0', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/1', type: 'gigabitethernet', speed: '1Gbps', available: true }
    ],
    maxModules: 2,
    defaultIOS: '15.1'
  },
  {
    name: '2911',
    type: 'router',
    ptType: 'Router-PT',
    description: 'Router Cisco 2911 con 3 puertos GigabitEthernet',
    ports: [
      { name: 'GigabitEthernet0/0', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/1', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/2', type: 'gigabitethernet', speed: '1Gbps', available: true }
    ],
    maxModules: 0,
    defaultIOS: '15.1'
  },
  {
    name: '4321',
    type: 'router',
    ptType: 'Router-PT',
    description: 'Router Cisco 4321 con 4 puertos GigabitEthernet',
    ports: [
      { name: 'GigabitEthernet0/0/0', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/0/1', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/0/2', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/0/3', type: 'gigabitethernet', speed: '1Gbps', available: true }
    ],
    maxModules: 2,
    defaultIOS: '16.1'
  },
  {
    name: '2960-24TT',
    type: 'switch',
    ptType: 'Switch-PT',
    description: 'Switch Cisco 2960 con 24 puertos FastEthernet y 2 puertos GigabitEthernet',
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        name: `FastEthernet0/${i}`,
        type: 'fastethernet',
        speed: '100Mbps',
        available: true
      })),
      { name: 'GigabitEthernet0/1', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/2', type: 'gigabitethernet', speed: '1Gbps', available: true }
    ],
    maxModules: 0,
    defaultIOS: '15.0'
  },
  {
    name: '3560-24PS',
    type: 'multilayer-switch',
    ptType: 'Multilayer Switch-PT',
    description: 'Switch multicapa Cisco 3560 con 24 puertos FastEthernet PoE y 4 puertos GigabitEthernet',
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        name: `FastEthernet0/${i}`,
        type: 'fastethernet',
        speed: '100Mbps',
        available: true
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        name: `GigabitEthernet0/${i + 1}`,
        type: 'gigabitethernet',
        speed: '1Gbps',
        available: true
      }))
    ],
    maxModules: 0,
    defaultIOS: '15.0'
  },
  {
    name: 'PC-PT',
    type: 'pc',
    ptType: 'PC-PT',
    description: 'PC genérica con interfaz FastEthernet',
    ports: [
      { name: 'FastEthernet0', type: 'fastethernet', speed: '100Mbps', available: true }
    ],
    maxModules: 0,
    defaultIOS: null
  },
  {
    name: 'Server-PT',
    type: 'server',
    ptType: 'Server-PT',
    description: 'Servidor genérico con interfaz FastEthernet',
    ports: [
      { name: 'FastEthernet0', type: 'fastethernet', speed: '100Mbps', available: true }
    ],
    maxModules: 0,
    defaultIOS: null
  },
  {
    name: 'Laptop-PT',
    type: 'pc',
    ptType: 'Laptop-PT',
    description: 'Laptop genérica con interfaz FastEthernet',
    ports: [
      { name: 'FastEthernet0', type: 'fastethernet', speed: '100Mbps', available: true }
    ],
    maxModules: 0,
    defaultIOS: null
  }
];

/**
 * Tool para listar dispositivos del catálogo
 */
export const ptListDevicesTool: Tool = {
  name: 'pt_list_devices',
  description: 'Lista los dispositivos disponibles en el catálogo de Packet Tracer',
  longDescription: 'Retorna el catálogo completo de dispositivos Cisco disponibles, incluyendo routers, switches y dispositivos finales con sus especificaciones y puertos.',
  category: 'catalog',
  tags: ['catalog', 'devices', 'cisco', 'packet-tracer'],
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Filtrar por tipo de dispositivo (router, switch, multilayer-switch, pc, server)',
        enum: ['router', 'switch', 'multilayer-switch', 'pc', 'server']
      }
    }
  },
  handler: async (input: ToolInput): Promise<ToolResult> => {
    const filterType = input.type as string | undefined;
    
    let devices = deviceCatalog;
    
    if (filterType) {
      devices = devices.filter(d => d.type === filterType);
    }
    
    return {
      success: true,
      data: {
        devices: devices.map(d => ({
          name: d.name,
          type: d.type,
          ptType: d.ptType,
          description: d.description,
          portCount: d.ports.length
        })),
        total: devices.length
      },
      metadata: {
        itemCount: devices.length
      }
    };
  }
};
