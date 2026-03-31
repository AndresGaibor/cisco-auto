/**
 * TOOL: pt_validate_plan
 * 
 * Valida un plan de topología verificando modelos, puertos,
 * IPs, tipos de cable y configuración de routers.
 */

import type { 
  Tool, 
  ToolInput, 
  ToolResult, 
  TopologyPlan, 
  DevicePlan, 
  LinkPlan,
  ValidationError,
  ValidationWarning,
  ValidationErrorType,
  ValidationWarningType
} from '../..';
import { deviceCatalog } from '../catalog/list-devices';

/**
 * Resultado de validación del plan
 */
interface ValidatePlanResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Verifica si un modelo existe en el catálogo
 */
function modelExistsInCatalog(modelName: string): boolean {
  return deviceCatalog.some(d => d.name === modelName);
}

/**
 * Obtiene los nombres de puertos disponibles de un modelo del catálogo
 */
function getCatalogPorts(modelName: string): string[] {
  const device = deviceCatalog.find(d => d.name === modelName);
  return device?.ports.map(p => p.name) || [];
}

/**
 * Verifica si un puerto existe en el modelo del catálogo
 */
function portExistsOnModel(modelName: string, portName: string): boolean {
  const ports = getCatalogPorts(modelName);
  return ports.includes(portName);
}

/**
 * Obtiene todos los IPs configurados en los dispositivos
 */
function getAllConfiguredIps(plan: TopologyPlan): Array<{ ip: string; deviceId: string; interfaceName: string }> {
  const ips: Array<{ ip: string; deviceId: string; interfaceName: string }> = [];
  
  for (const device of plan.devices) {
    for (const iface of device.interfaces) {
      if (iface.ip && iface.configured) {
        ips.push({ ip: iface.ip, deviceId: device.id, interfaceName: iface.name });
      }
    }
  }
  
  return ips;
}

/**
 * Verifica si hay IPs duplicados
 */
function findDuplicateIps(plan: TopologyPlan): Array<{ ip: string; devices: string[] }> {
  const ipMap = new Map<string, string[]>();
  
  for (const device of plan.devices) {
    for (const iface of device.interfaces) {
      if (iface.ip && iface.configured) {
        const existing = ipMap.get(iface.ip) || [];
        existing.push(device.id);
        ipMap.set(iface.ip, existing);
      }
    }
  }
  
  // Filtrar solo los que tienen duplicados
  const duplicates: Array<{ ip: string; devices: string[] }> = [];
  for (const [ip, devices] of ipMap) {
    if (devices.length > 1) {
      duplicates.push({ ip, devices });
    }
  }
  
  return duplicates;
}

/**
 * Tipos de cable válidos
 */
const VALID_CABLE_TYPES = [
  'straight-through',
  'crossover',
  'fiber',
  'serial',
  'console',
  'auto'
];

/**
 * Combisiones válidas de cable y tipo de puerto
 */
const CABLE_PORT_COMPATIBILITY: Record<string, string[]> = {
  'straight-through': ['ethernet', 'fastethernet', 'gigabitethernet'],
  'crossover': ['ethernet', 'fastethernet', 'gigabitethernet'],
  'fiber': ['fiber'],
  'serial': ['serial'],
  'console': ['console'],
  'auto': ['ethernet', 'fastethernet', 'gigabitethernet', 'serial', 'fiber', 'console']
};

/**
 * Verifica si un cable es compatible con un tipo de puerto
 */
function isCableCompatibleWithPort(cableType: string, portType: string): boolean {
  const compatiblePorts = CABLE_PORT_COMPATIBILITY[cableType];
  if (!compatiblePorts) return false;
  return compatiblePorts.includes(portType.toLowerCase());
}

/**
 * Obtiene el tipo de puerto de un modelo y puerto específico
 */
function getPortType(modelName: string, portName: string): string | null {
  const device = deviceCatalog.find(d => d.name === modelName);
  if (!device) return null;
  
  const port = device.ports.find(p => p.name === portName);
  return port?.type || null;
}

/**
 * Valida un plan de topología completo
 */
function validateTopologyPlan(plan: TopologyPlan): ValidatePlanResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  
  // ============================================
  // 1. Verificar que los modelos existen en el catálogo
  // ============================================
  for (const device of plan.devices) {
    if (!modelExistsInCatalog(device.model.name)) {
      errors.push({
        type: 'invalid_model',
        message: `El modelo '${device.model.name}' del dispositivo '${device.name}' no existe en el catálogo`,
        affected: device.id,
        severity: 'error'
      });
    }
  }
  
  // ============================================
  // 2. Verificar que los puertos usados en links existen
  // ============================================
  for (const link of plan.links) {
    // Verificar puerto de origen
    const fromDevice = plan.devices.find(d => d.id === link.from.deviceId);
    if (fromDevice) {
      if (!portExistsOnModel(fromDevice.model.name, link.from.port)) {
        errors.push({
          type: 'invalid_port',
          message: `El puerto '${link.from.port}' no existe en el modelo '${fromDevice.model.name}' del dispositivo '${fromDevice.name}'`,
          affected: link.id,
          severity: 'error'
        });
      }
    } else {
      errors.push({
        type: 'invalid_port',
        message: `Dispositivo origen '${link.from.deviceId}' no encontrado para el enlace`,
        affected: link.id,
        severity: 'error'
      });
    }
    
    // Verificar puerto de destino
    const toDevice = plan.devices.find(d => d.id === link.to.deviceId);
    if (toDevice) {
      if (!portExistsOnModel(toDevice.model.name, link.to.port)) {
        errors.push({
          type: 'invalid_port',
          message: `El puerto '${link.to.port}' no existe en el modelo '${toDevice.model.name}' del dispositivo '${toDevice.name}'`,
          affected: link.id,
          severity: 'error'
        });
      }
    } else {
      errors.push({
        type: 'invalid_port',
        message: `Dispositivo destino '${link.to.deviceId}' no encontrado para el enlace`,
        affected: link.id,
        severity: 'error'
      });
    }
  }
  
  // ============================================
  // 3. Verificar que no haya IPs duplicados
  // ============================================
  const duplicateIps = findDuplicateIps(plan);
  for (const dup of duplicateIps) {
    errors.push({
      type: 'ip_conflict',
      message: `IP duplicada '${dup.ip}' en dispositivos: ${dup.devices.join(', ')}`,
      affected: dup.devices.join(', '),
      severity: 'critical'
    });
  }
  
  // ============================================
  // 4. Verificar tipos de cable
  // ============================================
  for (const link of plan.links) {
    // Verificar que el tipo de cable es válido
    if (!VALID_CABLE_TYPES.includes(link.cableType)) {
      errors.push({
        type: 'invalid_cable',
        message: `Tipo de cable '${link.cableType}' no es válido para el enlace`,
        affected: link.id,
        severity: 'error'
      });
    } else {
      // Verificar compatibilidad cable-puerto si tenemos los dispositivos
      const fromDevice = plan.devices.find(d => d.id === link.from.deviceId);
      const toDevice = plan.devices.find(d => d.id === link.to.deviceId);
      
      if (fromDevice && toDevice) {
        const fromPortType = getPortType(fromDevice.model.name, link.from.port);
        const toPortType = getPortType(toDevice.model.name, link.to.port);
        
        if (fromPortType && !isCableCompatibleWithPort(link.cableType, fromPortType)) {
          warnings.push({
            type: 'suboptimal_cable',
            message: `Tipo de cable '${link.cableType}' puede no ser óptimo para puerto '${link.from.port}' (${fromPortType})`,
            affected: link.id
          });
        }
        
        if (toPortType && !isCableCompatibleWithPort(link.cableType, toPortType)) {
          warnings.push({
            type: 'suboptimal_cable',
            message: `Tipo de cable '${link.cableType}' puede no ser óptimo para puerto '${link.to.port}' (${toPortType})`,
            affected: link.id
          });
        }
      }
    }
  }
  
  // ============================================
  // 5. Verificar que los routers tienen al menos una interfaz configurada
  // ============================================
  for (const device of plan.devices) {
    if (device.model.type === 'router') {
      const configuredInterfaces = device.interfaces.filter(i => i.configured && i.ip);
      if (configuredInterfaces.length === 0) {
        errors.push({
          type: 'missing_ip',
          message: `El router '${device.name}' no tiene ninguna interfaz con IP configurada`,
          affected: device.id,
          severity: 'error'
        });
      }
    }
  }
  
  // ============================================
  // Warnings adicionales
  // ============================================
  
  // Verificar puertos sin usar
  for (const device of plan.devices) {
    const usedPorts = new Set<string>();
    
    // Recopilar puertos usados en enlaces
    for (const link of plan.links) {
      if (link.from.deviceId === device.id) {
        usedPorts.add(link.from.port);
      }
      if (link.to.deviceId === device.id) {
        usedPorts.add(link.to.port);
      }
    }
    
    // Verificar puertos disponibles del modelo en el catálogo
    const catalogPorts = getCatalogPorts(device.model.name);
    for (const port of catalogPorts) {
      if (!usedPorts.has(port) && device.interfaces.some(i => i.name === port)) {
        // Solo warn si el puerto está definido en el modelo pero no se usa
        const portInfo = deviceCatalog.find(d => d.name === device.model.name)?.ports.find(p => p.name === port);
        if (portInfo?.available) {
          warnings.push({
            type: 'unused_port',
            message: `Puerto '${port}' no está utilizado en ningún enlace para '${device.name}'`,
            affected: device.id
          });
        }
      }
    }
  }
  
  const valid = errors.length === 0;
  
  return { valid, errors, warnings };
}

export const ptValidatePlanTool: Tool = {
  name: 'pt_validate_plan',
  description: 'Valida un plan de topología de red',
  longDescription: 'Verifica la integridad de un TopologyPlan: modelos de dispositivos en catálogo, puertos válidos, IPs únicas, tipos de cable compatibles y routers con interfaces configuradas.',
  category: 'validation',
  tags: ['validation', 'topology', 'plan', 'network'],
  inputSchema: {
    type: 'object',
    properties: {
      plan: {
        type: 'object',
        description: 'Plan de topología a validar'
      }
    },
    required: ['plan']
  },
  handler: async (input: ToolInput): Promise<ToolResult<ValidatePlanResult>> => {
    const plan = input.plan as TopologyPlan;
    
    // Validación básica de estructura
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
    
    if (!plan.links || !Array.isArray(plan.links)) {
      return {
        success: false,
        error: {
          code: 'INVALID_STRUCTURE',
          message: 'El plan debe contener un array de links'
        }
      };
    }
    
    // Ejecutar validación
    const result = validateTopologyPlan(plan);
    
    return {
      success: true,
      data: result,
      metadata: {
        itemCount: plan.devices.length + plan.links.length,
        warnings: result.warnings.map(w => w.message)
      }
    };
  }
};
