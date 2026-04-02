import type {
  Tool,
  ToolInput,
  ToolResult,
  TopologyPlan,
  DevicePlan,
  ValidationError,
  FixSuggestion,
  FixAction
} from '../..';
import { deviceCatalog } from '../catalog/list-devices';

interface FixPlanResult {
  plan: TopologyPlan;
  appliedFixes: FixSuggestion[];
  remainingErrors: ValidationError[];
}

interface UsedIP {
  ip: string;
  deviceId: string;
  interfaceName: string;
}

function getAllConfiguredIps(plan: TopologyPlan): UsedIP[] {
  const ips: UsedIP[] = [];
  for (const device of plan.devices) {
    for (const iface of device.interfaces) {
      if (iface.ip && iface.configured) {
        ips.push({ ip: iface.ip, deviceId: device.id, interfaceName: iface.name });
      }
    }
  }
  return ips;
}

function isIpInUse(ip: string, usedIps: UsedIP[]): boolean {
  return usedIps.some(u => u.ip === ip);
}

function getNextAvailableIp(baseIp: string, usedIps: UsedIP[]): string | null {
  const parts = baseIp.split('.');
  if (parts.length !== 4) return null;
  
  const p0 = parts[0]!;
  const p1 = parts[1]!;
  const p2 = parts[2]!;

  for (let i = 10; i <= 254; i++) {
    const candidateIp = `${p0}.${p1}.${p2}.${i}`;
    if (!isIpInUse(candidateIp, usedIps)) {
      return candidateIp;
    }
  }
  return null;
}

function getCorrectCableType(deviceType1: string, deviceType2: string): string {
  if (deviceType1 === deviceType2) {
    return 'crossover';
  }
  return 'straight-through';
}

function modelExistsInCatalog(modelName: string): boolean {
  return deviceCatalog.some(d => d.name === modelName);
}

function getNextAvailableSubnet(usedSubnets: string[], startSubnet: string = '192.168.1.0'): string {
  const parts = startSubnet.split('.');
  if (parts.length !== 4) return startSubnet;
  
  const p2 = parts[2]!;
  let subnetNum = parseInt(p2);

  while (usedSubnets.includes(`${parts[0]}.${parts[1]}.${subnetNum}.0/24`)) {
    subnetNum++;
    if (subnetNum > 255) {
      subnetNum = 1;
    }
  }

  return `${parts[0]}.${parts[1]}.${subnetNum}.0`;
}

function applyFixesToPlan(plan: TopologyPlan): FixPlanResult {
  const appliedFixes: FixSuggestion[] = [];
  const remainingErrors: ValidationError[] = [];
  const usedIps = getAllConfiguredIps(plan);
  const usedSubnets: string[] = [];

  const fixedPlan: TopologyPlan = JSON.parse(JSON.stringify(plan));

  for (const ipInfo of usedIps) {
    const ipParts = ipInfo.ip.split('.');
    if (ipParts.length === 4) {
      usedSubnets.push(`${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0/24`);
    }
  }

  const ipMap = new Map<string, UsedIP[]>();
  for (const ipInfo of usedIps) {
    const existing = ipMap.get(ipInfo.ip) || [];
    existing.push(ipInfo);
    ipMap.set(ipInfo.ip, existing);
  }

  for (const [ip, devices] of ipMap) {
    if (devices.length > 1) {
      for (let i = 1; i < devices.length; i++) {
        const victim = devices[i];
        if (!victim) continue;
        
        const device = fixedPlan.devices.find(d => d.id === victim.deviceId);
        if (!device) continue;

        const parts = victim.ip.split('.');
        if (parts.length !== 4) continue;
        
        const p0 = parts[0]!;
        const p1 = parts[1]!;
        const p2 = parts[2]!;
        const gatewayIp = `${p0}.${p1}.${p2}.1`;
        const newIp = getNextAvailableIp(gatewayIp, usedIps);

        if (newIp) {
          const iface = device.interfaces.find(iface => iface.name === victim.interfaceName);
          if (iface) {
            appliedFixes.push({
              description: `IP duplicada '${ip}' en dispositivo '${device.name}'. Reasignando interfaz '${iface.name}' a '${newIp}'`,
              action: {
                type: 'replace_ip',
                from: { ip: iface.ip, deviceId: device.id, interface: iface.name },
                to: { ip: newIp, deviceId: device.id, interface: iface.name }
              },
              autoFixable: true
            });
            iface.ip = newIp;
            usedIps.push({ ip: newIp, deviceId: device.id, interfaceName: iface.name });
          }
        }
      }
    }
  }

  for (const link of fixedPlan.links) {
    const fromDevice = fixedPlan.devices.find(d => d.id === link.from.deviceId);
    const toDevice = fixedPlan.devices.find(d => d.id === link.to.deviceId);

    if (!fromDevice || !toDevice) continue;

    const correctCable = getCorrectCableType(fromDevice.model.type, toDevice.model.type);

    if (link.cableType !== correctCable && link.cableType !== 'auto') {
      appliedFixes.push({
        description: `Tipo de cable incorrecto en enlace '${link.id}'. Cambiando de '${link.cableType}' a '${correctCable}'`,
        action: {
          type: 'change_cable',
          from: { cableType: link.cableType, linkId: link.id },
          to: { cableType: correctCable, linkId: link.id }
        },
        autoFixable: true
      });
      link.cableType = correctCable as typeof link.cableType;
    }
  }

  for (const device of fixedPlan.devices) {
    if (device.model.type === 'router') {
      const configuredInterfaces = device.interfaces.filter(i => i.configured && i.ip);

      if (configuredInterfaces.length === 0) {
        const availableIface = device.interfaces.find(i => !i.configured);

        if (availableIface) {
          const subnet = getNextAvailableSubnet(usedSubnets);
          const parts = subnet.split('.');
          if (parts.length === 4) {
            const p0 = parts[0]!;
            const p1 = parts[1]!;
            const p2 = parts[2]!;
            const gatewayIp = `${p0}.${p1}.${p2}.1`;
            const newIp = getNextAvailableIp(gatewayIp, usedIps);

            if (newIp) {
              appliedFixes.push({
                description: `Router '${device.name}' no tiene IP configurada. Asignando '${newIp}' a interfaz '${availableIface.name}'`,
                action: {
                  type: 'replace_ip',
                  from: { ip: null, deviceId: device.id, interface: availableIface.name },
                  to: { ip: newIp, deviceId: device.id, interface: availableIface.name }
                },
                autoFixable: true
              });
              availableIface.ip = newIp;
              availableIface.subnetMask = '255.255.255.0';
              availableIface.configured = true;
              usedIps.push({ ip: newIp, deviceId: device.id, interfaceName: availableIface.name });
            }
          }
        } else {
          remainingErrors.push({
            type: 'missing_ip',
            message: `Router '${device.name}' no tiene interfaces disponibles para asignar IP`,
            affected: device.id,
            severity: 'error'
          });
        }
      }
    }
  }

  for (const device of fixedPlan.devices) {
    if (device.model.type === 'switch' || device.model.type === 'multilayer-switch') {
      if (!device.vlans || device.vlans.length === 0) {
        appliedFixes.push({
          description: `Switch '${device.name}' no tiene VLANs configuradas. Agregando VLAN 1 por defecto`,
          action: {
            type: 'use_alternative_port',
            from: { vlans: device.vlans || [], deviceId: device.id },
            to: { vlans: [{ id: 1, name: 'default' }], deviceId: device.id }
          },
          autoFixable: true
        });
        device.vlans = [{ id: 1, name: 'default' }];
        for (const iface of device.interfaces) {
          if (!iface.vlan) {
            iface.vlan = 1;
          }
        }
      }
    }
  }

  for (const device of fixedPlan.devices) {
    if (!modelExistsInCatalog(device.model.name)) {
      remainingErrors.push({
        type: 'invalid_model',
        message: `El modelo '${device.model.name}' del dispositivo '${device.name}' no existe en el catálogo`,
        affected: device.id,
        severity: 'error'
      });
    }
  }

  for (const link of fixedPlan.links) {
    const fromDevice = fixedPlan.devices.find(d => d.id === link.from.deviceId);
    const toDevice = fixedPlan.devices.find(d => d.id === link.to.deviceId);

    if (fromDevice) {
      const portExists = fromDevice.interfaces.some(i => i.name === link.from.port);
      if (!portExists) {
        remainingErrors.push({
          type: 'invalid_port',
          message: `El puerto '${link.from.port}' no existe en '${fromDevice.name}'`,
          affected: link.id,
          severity: 'error'
        });
      }
    }

    if (toDevice) {
      const portExists = toDevice.interfaces.some(i => i.name === link.to.port);
      if (!portExists) {
        remainingErrors.push({
          type: 'invalid_port',
          message: `El puerto '${link.to.port}' no existe en '${toDevice.name}'`,
          affected: link.id,
          severity: 'error'
        });
      }
    }
  }

  return { plan: fixedPlan, appliedFixes, remainingErrors };
}

function validateWithoutFixes(plan: TopologyPlan): ValidationError[] {
  const errors: ValidationError[] = [];
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
  return errors;
}

export const ptFixPlanTool: Tool = {
  name: 'pt_fix_plan',
  description: 'Auto-corrige errores en un plan de topología de red',
  longDescription: `Corrige automáticamente errores comunes en un TopologyPlan:
- IPs duplicados: reassigna a siguiente IP disponible
- Tipos de cable incorrectos: corrige a straight-through/crossover según tipos de dispositivos
- VLANs faltantes: agrega VLAN 1 por defecto a switches
- Interfaces de router sin IP: asigna siguiente IP disponible

NO modifica: credenciales, seguridad, routing protocols, o IPs que ya funcionan correctamente.`,
  category: 'validation',
  tags: ['validation', 'fix', 'topology', 'plan', 'network'],
  inputSchema: {
    type: 'object',
    properties: {
      plan: {
        type: 'object',
        description: 'Plan de topología a corregir'
      },
      applyFixes: {
        type: 'boolean',
        description: 'Si true, aplica los fixes automáticamente. Si false, solo retorna los fixes sugeridos',
        default: true
      }
    },
    required: ['plan']
  },
  handler: async (input: ToolInput): Promise<ToolResult<FixPlanResult>> => {
    const plan = input.plan as TopologyPlan;
    const shouldApplyFixes = input.applyFixes !== false;

    if (!plan || typeof plan !== 'object') {
      return {
        ok: false,
        error: 'Se requiere un plan de topología válido',
        code: 'INVALID_INPUT'
      };
    }

    if (!plan.devices || !Array.isArray(plan.devices)) {
      return {
        ok: false,
        error: 'El plan debe contener un array de devices',
        code: 'INVALID_STRUCTURE'
      };
    }

    if (!plan.links || !Array.isArray(plan.links)) {
      return {
        ok: false,
        error: 'El plan debe contener un array de links',
        code: 'INVALID_STRUCTURE'
      };
    }

    const unfixableErrors = validateWithoutFixes(plan);

    if (unfixableErrors.length > 0) {
      return {
        ok: true,
        data: {
          plan: plan,
          appliedFixes: [],
          remainingErrors: unfixableErrors
        }
      };
    }

    const result = applyFixesToPlan(plan);

    return {
      ok: true,
      data: {
        plan: result.plan,
        appliedFixes: result.appliedFixes,
        remainingErrors: result.remainingErrors
      }
    };
  }
};
