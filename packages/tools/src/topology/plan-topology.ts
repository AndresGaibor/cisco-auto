import type { Tool, ToolInput, ToolResult, TopologyPlan, DevicePlan, LinkPlan, TopologyPlanParams } from '@cisco-auto/core';
import { deviceCatalog } from '../catalog/list-devices';

function generateId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

function longToIp(long: number): string {
  return [(long >>> 24) & 255, (long >>> 16) & 255, (long >>> 8) & 255, long & 255].join('.');
}

function getNextIp(baseIp: string, offset: number): string {
  return longToIp(ipToLong(baseIp) + offset);
}

function selectDeviceModel(type: 'router' | 'switch' | 'multilayer-switch' | 'pc' | 'server'): typeof deviceCatalog[0] {
  const devices = deviceCatalog.filter(d => d.type === type);
  return devices[0] || deviceCatalog[0];
}

function generateDevices(params: TopologyPlanParams): DevicePlan[] {
  const devices: DevicePlan[] = [];
  let ipOffset = 1;
  const baseNetwork = params.baseNetwork || '192.168.1.0';
  const subnetMask = params.subnetMask || '255.255.255.0';

  // Routers
  for (let i = 0; i < params.routerCount; i++) {
    const model = selectDeviceModel('router');
    const routerIp = getNextIp(baseNetwork, ipOffset);
    ipOffset++;
    
    devices.push({
      id: `R${i + 1}`,
      name: `Router${i + 1}`,
      model: {
        name: model.name,
        type: model.type,
        ptType: model.ptType,
        ports: model.ports
      },
      position: { x: 100 + i * 150, y: 100 },
      interfaces: model.ports.slice(0, 2).map((port, idx) => ({
        name: port.name,
        ip: idx === 0 ? routerIp : undefined,
        subnetMask: idx === 0 ? subnetMask : undefined,
        configured: idx === 0
      }))
    });
  }

  // Switches
  for (let i = 0; i < params.switchCount; i++) {
    const model = selectDeviceModel('switch');
    devices.push({
      id: `S${i + 1}`,
      name: `Switch${i + 1}`,
      model: {
        name: model.name,
        type: model.type,
        ptType: model.ptType,
        ports: model.ports
      },
      position: { x: 100 + i * 150, y: 250 },
      interfaces: model.ports.slice(0, 4).map(port => ({
        name: port.name,
        configured: false
      }))
    });
  }

  // PCs
  for (let i = 0; i < params.pcCount; i++) {
    const model = selectDeviceModel('pc');
    const pcIp = getNextIp(baseNetwork, ipOffset);
    ipOffset++;
    
    devices.push({
      id: `PC${i + 1}`,
      name: `PC${i + 1}`,
      model: {
        name: model.name,
        type: model.type,
        ptType: model.ptType,
        ports: model.ports
      },
      position: { x: 100 + i * 100, y: 400 },
      interfaces: [{
        name: 'FastEthernet0',
        ip: pcIp,
        subnetMask,
        configured: true
      }]
    });
  }

  // Servers
  for (let i = 0; i < (params.serverCount || 0); i++) {
    const model = selectDeviceModel('server');
    const serverIp = getNextIp(baseNetwork, ipOffset);
    ipOffset++;
    
    devices.push({
      id: `SERVER${i + 1}`,
      name: `Server${i + 1}`,
      model: {
        name: model.name,
        type: model.type,
        ptType: model.ptType,
        ports: model.ports
      },
      position: { x: 100 + i * 100, y: 500 },
      interfaces: [{
        name: 'FastEthernet0',
        ip: serverIp,
        subnetMask,
        configured: true
      }]
    });
  }

  return devices;
}

function generateLinks(devices: DevicePlan[]): LinkPlan[] {
  const links: LinkPlan[] = [];
  const routers = devices.filter(d => d.model.type === 'router');
  const switches = devices.filter(d => d.model.type === 'switch');
  const pcs = devices.filter(d => d.model.type === 'pc');
  const servers = devices.filter(d => d.model.type === 'server');

  // Connect routers to switches
  routers.forEach((router, rIdx) => {
    switches.forEach((sw, sIdx) => {
      if (rIdx === sIdx || rIdx === 0) {
        links.push({
          id: `link-${links.length + 1}`,
          from: {
            deviceId: router.id,
            deviceName: router.name,
            port: router.interfaces[0]?.name || 'GigabitEthernet0/0'
          },
          to: {
            deviceId: sw.id,
            deviceName: sw.name,
            port: 'GigabitEthernet0/1'
          },
          cableType: 'straight-through',
          validated: true
        });
      }
    });
  });

  // Connect switches to PCs
  switches.forEach((sw, sIdx) => {
    const switchPcs = pcs.filter((_, pIdx) => pIdx % switches.length === sIdx);
    switchPcs.forEach((pc, pIdx) => {
      links.push({
        id: `link-${links.length + 1}`,
        from: {
          deviceId: sw.id,
          deviceName: sw.name,
          port: `FastEthernet0/${pIdx + 1}`
        },
        to: {
          deviceId: pc.id,
          deviceName: pc.name,
          port: 'FastEthernet0'
        },
        cableType: 'straight-through',
        validated: true
      });
    });
  });

  // Connect switches to servers
  switches.forEach((sw, sIdx) => {
    const switchServers = servers.filter((_, srvIdx) => srvIdx % switches.length === sIdx);
    switchServers.forEach((srv, srvIdx) => {
      links.push({
        id: `link-${links.length + 1}`,
        from: {
          deviceId: sw.id,
          deviceName: sw.name,
          port: `FastEthernet0/${pcs.length + srvIdx + 1}`
        },
        to: {
          deviceId: srv.id,
          deviceName: srv.name,
          port: 'FastEthernet0'
        },
        cableType: 'straight-through',
        validated: true
      });
    });
  });

  return links;
}

export const ptPlanTopologyTool: Tool = {
  name: 'pt_plan_topology',
  description: 'Genera un plan completo de topología de red',
  longDescription: 'Crea un plan detallado de topología incluyendo dispositivos, enlaces, asignación de IPs, DHCP y configuración de routing.',
  category: 'topology',
  tags: ['topology', 'plan', 'network'],
  inputSchema: {
    type: 'object',
    properties: {
      routerCount: { type: 'number', default: 1 },
      switchCount: { type: 'number', default: 1 },
      pcCount: { type: 'number', default: 2 },
      serverCount: { type: 'number', default: 0 },
      networkType: {
        type: 'string',
        enum: ['single_lan', 'multi_lan', 'multi_lan_wan', 'star', 'hub_spoke', 'router_on_a_stick', 'triangle', 'custom'],
        default: 'single_lan'
      },
      routingProtocol: {
        type: 'string',
        enum: ['ospf', 'eigrp', 'bgp', 'static', 'none'],
        default: 'static'
      },
      dhcpEnabled: { type: 'boolean', default: true },
      baseNetwork: { type: 'string', default: '192.168.1.0' },
      subnetMask: { type: 'string', default: '255.255.255.0' }
    }
  },
  handler: async (input: ToolInput): Promise<ToolResult<TopologyPlan>> => {
    const params: TopologyPlanParams = {
      routerCount: (input.routerCount as number) ?? 1,
      switchCount: (input.switchCount as number) ?? 1,
      pcCount: (input.pcCount as number) ?? 2,
      serverCount: (input.serverCount as number) ?? 0,
      networkType: (input.networkType as TopologyPlanParams['networkType']) ?? 'single_lan',
      routingProtocol: (input.routingProtocol as TopologyPlanParams['routingProtocol']) ?? 'static',
      dhcpEnabled: (input.dhcpEnabled as boolean) ?? true,
      baseNetwork: (input.baseNetwork as string) ?? '192.168.1.0',
      subnetMask: (input.subnetMask as string) ?? '255.255.255.0'
    };

    const devices = generateDevices(params);
    const links = generateLinks(devices);

    const plan: TopologyPlan = {
      id: generateId(),
      name: `Plan-${params.networkType}-${Date.now()}`,
      description: `Topología ${params.networkType} con ${params.routerCount} routers, ${params.switchCount} switches, ${params.pcCount} PCs`,
      devices,
      links,
      params,
      validation: {
        valid: true,
        errors: [],
        warnings: []
      },
      metadata: {
        createdAt: new Date(),
        generatorVersion: '1.0.0'
      }
    };

    return {
      success: true,
      data: plan,
      metadata: {
        itemCount: devices.length + links.length,
        duration: 0
      }
    };
  }
};
