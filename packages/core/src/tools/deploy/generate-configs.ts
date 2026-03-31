/**
 * TOOL: pt_generate_configs
 * 
 * Genera configuraciones de red para dispositivos Cisco IOS
 * a partir de un plan de topología.
 */

import type {
  Tool,
  ToolInput,
  ToolResult,
  TopologyPlan,
  DevicePlan,
  InterfacePlan
} from '../..';

// =============================================================================
// TIPOS DE SALIDA
// =============================================================================

/**
 * Formato de salida de configuración
 */
export type ConfigFormat = 'ios' | 'yaml' | 'json';

import type { DeployedDevice, DeploySummary } from '../..';

// Reexportar aliases: DeviceConfig y ConfigSummary se mapean a tipos centrales
export type DeviceConfig = DeployedDevice;
export type ConfigSummary = DeploySummary;

// =============================================================================
// FUNCIONES DE GENERACIÓN DE CONFIGURACIÓN
// =============================================================================

/**
 * Genera configuración IOS para un router
 */
function generateRouterConfig(device: DevicePlan): string {
  const lines: string[] = [];
  
  // Hostname
  lines.push(`hostname ${device.name}`);
  lines.push('!');
  
  // Configuración de interfaces
  const configuredInterfaces = device.interfaces.filter(i => i.configured && i.ip);
  for (const iface of configuredInterfaces) {
    lines.push(`interface ${iface.name}`);
    lines.push(` ip address ${iface.ip} ${iface.subnetMask || '255.255.255.0'}`);
    lines.push(' no shutdown');
    lines.push('!');
  }
  
  // Configuración de routing
  if (device.routing) {
    const routingProtocol = device.routing.protocol;
    
    if (routingProtocol === 'ospf' && device.routing.ospf) {
      lines.push(`router ospf ${device.routing.ospf.processId}`);
      for (const area of device.routing.ospf.areas) {
        for (const network of area.networks) {
          lines.push(` network ${network} area ${area.area}`);
        }
      }
      if (device.routing.ospf.defaultRoute) {
        lines.push(' default-information originate');
      }
    } else if (routingProtocol === 'eigrp' && device.routing.eigrp) {
      lines.push(`router eigrp ${device.routing.eigrp.asNumber}`);
      for (const network of device.routing.eigrp.networks) {
        lines.push(` network ${network}`);
      }
      if (device.routing.eigrp.defaultRoute) {
        lines.push(' default-information originate');
      }
    } else if (routingProtocol === 'static' && device.routing.static) {
      for (const route of device.routing.static) {
        lines.push(`ip route ${route.network} ${route.mask} ${route.nextHop}`);
      }
    }
    lines.push('!');
  }
  
  // Configuración DHCP si existe
  if (device.dhcp && device.dhcp.length > 0) {
    for (const dhcp of device.dhcp) {
      lines.push(`ip dhcp pool ${dhcp.poolName}`);
      lines.push(` network ${dhcp.network} ${dhcp.subnetMask}`);
      lines.push(` default-router ${dhcp.defaultRouter}`);
      if (dhcp.dnsServer) {
        lines.push(` dns-server ${dhcp.dnsServer}`);
      }
      lines.push('!');
      
      // Direcciones excluidas
      if (dhcp.exclude && dhcp.exclude.length > 0) {
        lines.push('ip dhcp excluded-address');
        for (const ex of dhcp.exclude) {
          lines.push(` ${ex}`);
        }
        lines.push('!');
      }
    }
  }
  
  // Banner de login
  lines.push('banner motd ^C');
  lines.push('=== Configuración generadada automáticamente ===');
  lines.push('=== Acceso solo autorizado ===');
  lines.push('^C');
  lines.push('!');
  
  // Fin de configuración
  lines.push('end');
  
  return lines.join('\n');
}

/**
 * Genera configuración IOS para un switch
 */
function generateSwitchConfig(device: DevicePlan): string {
  const lines: string[] = [];
  
  // Hostname
  lines.push(`hostname ${device.name}`);
  lines.push('!');
  
  // Configuración de VLANs
  if (device.vlans && device.vlans.length > 0) {
    for (const vlan of device.vlans) {
      lines.push(`vlan ${vlan.id}`);
      lines.push(` name ${vlan.name}`);
    }
    lines.push('!');
  }
  
  // Configuración de interfaces
  const interfaces = device.interfaces;
  for (const iface of interfaces) {
    lines.push(`interface ${iface.name}`);
    
    // Determinar si es trunk o access
    const isTrunk = iface.name.toLowerCase().includes('f') && 
                    (iface.name.includes('/24') || iface.name.includes('/1'));
    
    if (isTrunk) {
      lines.push(' switchport mode trunk');
      lines.push(' switchport trunk allowed vlan all');
    } else {
      lines.push(' switchport mode access');
      if (iface.vlan) {
        lines.push(` switchport access vlan ${iface.vlan}`);
      }
    }
    
    lines.push(' no shutdown');
    lines.push('!');
  }
  
  // Configuración DHCP si existe
  if (device.dhcp && device.dhcp.length > 0) {
    for (const dhcp of device.dhcp) {
      lines.push(`ip dhcp pool ${dhcp.poolName}`);
      lines.push(` network ${dhcp.network} ${dhcp.subnetMask}`);
      lines.push(` default-router ${dhcp.defaultRouter}`);
      if (dhcp.dnsServer) {
        lines.push(` dns-server ${dhcp.dnsServer}`);
      }
      lines.push('!');
    }
  }
  
  // Banner
  lines.push('banner motd ^C');
  lines.push('=== Switch configurado automáticamente ===');
  lines.push('^C');
  lines.push('!');
  
  lines.push('end');
  
  return lines.join('\n');
}

/**
 * Genera configuración para un PC
 */
function generatePCConfig(device: DevicePlan): string {
  const lines: string[] = [];
  
  // Obtener la interfaz configurada
  const iface = device.interfaces.find(i => i.configured && i.ip);
  
  if (iface && iface.ip) {
    lines.push(`# Configuración de red para ${device.name}`);
    lines.push(`IP: ${iface.ip}`);
    lines.push(`Máscara: ${iface.subnetMask || '255.255.255.0'}`);
    
    // Extraer gateway de la IP (asumiendo /24)
    const ipParts = iface.ip.split('.');
    if (ipParts.length === 4) {
      lines.push(`Gateway: ${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.1`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Genera configuración para un servidor
 */
function generateServerConfig(device: DevicePlan): string {
  const lines: string[] = [];
  
  lines.push(`# Configuración de servidor ${device.name}`);
  lines.push('!');
  
  const configuredInterfaces = device.interfaces.filter(i => i.configured && i.ip);
  for (const iface of configuredInterfaces) {
    lines.push(`interface ${iface.name}`);
    lines.push(` ip address ${iface.ip} ${iface.subnetMask || '255.255.255.0'}`);
    lines.push(' no shutdown');
    lines.push('!');
  }
  
  if (device.dhcp && device.dhcp.length > 0) {
    for (const dhcp of device.dhcp) {
      lines.push(`ip dhcp pool ${dhcp.poolName}`);
      lines.push(` network ${dhcp.network} ${dhcp.subnetMask}`);
      lines.push(` default-router ${dhcp.defaultRouter}`);
      if (dhcp.dnsServer) {
        lines.push(` dns-server ${dhcp.dnsServer}`);
      }
      lines.push('!');
    }
  }
  
  lines.push('# Servicios habilitados');
  lines.push('- DNS Server');
  lines.push('- HTTP Server');
  lines.push('!');
  
  lines.push('end');
  
  return lines.join('\n');
}

/**
 * Genera configuración IOS para un dispositivo según su tipo
 */
function generateDeviceConfig(device: DevicePlan): string {
  switch (device.model.type) {
    case 'router':
    case 'multilayer-switch':
      return generateRouterConfig(device);
    case 'switch':
      return generateSwitchConfig(device);
    case 'pc':
      return generatePCConfig(device);
    case 'server':
      return generateServerConfig(device);
    default:
      return `! Configuración no disponible para tipo: ${device.model.type}`;
  }
}

/**
 * Convierte configuración IOS a YAML
 */
function iosToYaml(device: DevicePlan, iosConfig: string): string {
  const lines: string[] = [];
  lines.push(`${device.name}:`);
  lines.push(`  device_type: ${device.model.type}`);
  lines.push(`  config: |`);
  
  for (const line of iosConfig.split('\n')) {
    lines.push(`    ${line}`);
  }
  
  return lines.join('\n');
}

/**
 * Convierte configuración IOS a JSON
 */
function iosToJson(device: DevicePlan, iosConfig: string): string {
  const configObj: Record<string, unknown> = {
    deviceName: device.name,
    deviceType: device.model.type,
    model: device.model.name,
    config: iosConfig
  };
  
  // Agregar información de interfaces
  const interfaces: Record<string, unknown>[] = [];
  for (const iface of device.interfaces) {
    interfaces.push({
      name: iface.name,
      ip: iface.ip,
      subnetMask: iface.subnetMask,
      configured: iface.configured,
      vlan: iface.vlan
    });
  }
  configObj.interfaces = interfaces;
  
  return JSON.stringify(configObj, null, 2);
}

/**
 * Genera configuraciones para todos los dispositivos del plan
 */
function generateConfigs(plan: TopologyPlan, format: ConfigFormat): { configs: DeviceConfig[]; summary: ConfigSummary } {
  const configs: DeviceConfig[] = [];
  const unconfiguredDevices: string[] = [];
  
  let routerCount = 0;
  let switchCount = 0;
  let pcCount = 0;
  let serverCount = 0;
  let totalLines = 0;
  
  for (const device of plan.devices) {
    const iosConfig = generateDeviceConfig(device);
    const hasConfig = iosConfig.trim().length > 0 && !iosConfig.includes('no disponible');
    
    if (!hasConfig) {
      unconfiguredDevices.push(device.name);
    } else {
      const config: DeviceConfig = {
        deviceId: device.id,
        deviceName: device.name,
        deviceType: device.model.type as DeviceConfig['deviceType'],
        iosConfig
      };
      
      // Agregar formatos alternativos si se solicita
      if (format === 'yaml') {
        config.yamlConfig = iosToYaml(device, iosConfig);
      } else if (format === 'json') {
        config.jsonConfig = iosToJson(device, iosConfig);
      }
      
      configs.push(config);
      totalLines += iosConfig.split('\n').length;
      
      // Contadores por tipo
      switch (device.model.type) {
        case 'router':
        case 'multilayer-switch':
          routerCount++;
          break;
        case 'switch':
          switchCount++;
          break;
        case 'pc':
          pcCount++;
          break;
        case 'server':
          serverCount++;
          break;
      }
    }
  }
  
  const summary: ConfigSummary = {
    totalDevices: configs.length,
    routerCount,
    switchCount,
    pcCount,
    serverCount,
    totalLines,
    unconfiguredDevices
  };
  
  return { configs, summary };
}

// =============================================================================
// TOOL DEFINITION
// =============================================================================

export const ptGenerateConfigsTool: Tool = {
  name: 'pt_generate_configs',
  description: 'Genera configuraciones IOS/JSON/YAML para dispositivos de red',
  longDescription: 'Convierte un TopologyPlan en configuraciones de dispositivo Cisco IOS nativas, incluyendo configuración de interfaces, routing (OSPF/EIGRP/estático), DHCP, VLANs y servicios.',
  category: 'generation',
  tags: ['generation', 'config', 'ios', 'cisco', 'network'],
  inputSchema: {
    type: 'object',
    properties: {
      plan: {
        type: 'object',
        description: 'Plan de topología del cual generar configuraciones'
      },
      format: {
        type: 'string',
        enum: ['ios', 'yaml', 'json'],
        default: 'ios',
        description: 'Formato de salida de configuración'
      }
    },
    required: ['plan']
  },
  handler: async (input: ToolInput): Promise<ToolResult<{ configs: DeviceConfig[]; summary: ConfigSummary }>> => {
    const plan = input.plan as TopologyPlan;
    const format = (input.format as ConfigFormat) || 'ios';
    
    // Validación básica de entrada
    if (!plan || typeof plan !== 'object') {
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Se requiere un plan de topología válido'
        }
      };
    }
    
    if (!plan.devices || !Array.isArray(plan.devices)) {
      return {
        success: false,
        error: {
          code: 'INVALID_STRUCTURE',
          message: 'El plan debe contener un array de devices'
        }
      };
    }
    
    // Generar configuraciones
    const { configs, summary } = generateConfigs(plan, format);
    
    return {
      success: true,
      data: { configs, summary },
      metadata: {
        itemCount: configs.length,
        extras: {
          format,
          totalLines: summary.totalLines
        }
      }
    };
  }
};
