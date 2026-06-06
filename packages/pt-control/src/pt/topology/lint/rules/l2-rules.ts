import type { LintRule, LintResult, TopologyBlueprint, ObservedState } from '../../topology-lint-types.js';
import { getSubnetKey, getSubnetKeyFromIp } from '../utils.js';

export function createIpDuplicateRule(): LintRule {
  return {
    id: 'ipDuplicate', name: 'IP Duplicada', description: 'Detectar IPs duplicadas entre dispositivos', severity: 'critical',
    check: (blueprint, observed) => {
      const results: LintResult[] = [];
      const ipMap = new Map<string, string[]>();
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        for (const iface of device.interfaces) { if (iface.ip) { const existing = ipMap.get(iface.ip) ?? []; existing.push(deviceName); ipMap.set(iface.ip, existing); } }
        const bpDevice = blueprint.devices[deviceName];
        if (bpDevice?.svis) { for (const svi of bpDevice.svis) { if (svi.ip) { const existing = ipMap.get(svi.ip) ?? []; existing.push(`${deviceName}/SVI-${svi.vlan}`); ipMap.set(svi.ip, existing); } } }
        if (bpDevice?.subinterfaces) { for (const sub of bpDevice.subinterfaces) { if (sub.ip) { const existing = ipMap.get(sub.ip) ?? []; existing.push(`${deviceName}/${sub.number}`); ipMap.set(sub.ip, existing); } } }
      }
      for (const [ip, devices] of Array.from(ipMap.entries())) { if (devices.length > 1) { results.push({ rule: 'ipDuplicate', severity: 'critical', message: `IP ${ip} está asignada a múltiples dispositivos: ${devices.join(', ')}`, entity: ip, suggestion: 'Revisar configuración de IPs y eliminar duplicados' }); } }
      return results;
    },
  };
}

export function createSubnetNoGatewayRule(): LintRule {
  return {
    id: 'subnetNoGateway', name: 'Subred sin Gateway', description: 'Detectar subredes sin default gateway configurado', severity: 'critical',
    check: (blueprint, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        const subnets = new Map<string, { ip: string; mask: string; hasGateway: boolean }>();
        for (const iface of device.interfaces) { if (iface.ip && iface.mask) { const subnetKey = getSubnetKey(iface.ip, iface.mask); if (!subnets.has(subnetKey)) subnets.set(subnetKey, { ip: iface.ip, mask: iface.mask, hasGateway: false }); } }
        const bpDevice = blueprint.devices[deviceName];
        if (bpDevice?.svis) { for (const svi of bpDevice.svis) { if (svi.ip && svi.mask) { const subnetKey = getSubnetKey(svi.ip, svi.mask); subnets.get(subnetKey)!.hasGateway = true; } } }
        if (bpDevice?.subinterfaces) { for (const sub of bpDevice.subinterfaces) { if (sub.ip && sub.mask) { const subnetKey = getSubnetKey(sub.ip, sub.mask); subnets.get(subnetKey)!.hasGateway = true; } } }
        for (const [subnet, info] of Array.from(subnets.entries())) { if (!info.hasGateway) results.push({ rule: 'subnetNoGateway', severity: 'critical', message: `Subred ${subnet} en ${deviceName} no tiene gateway configurado`, entity: subnet, device: deviceName, suggestion: 'Configurar IP en interfaz como gateway o crear SVI' }); }
      }
      return results;
    },
  };
}

export function createAccessPortVlanMissingRule(): LintRule {
  return { id: 'accessPortVlanMissing', name: 'Access Port VLAN Inexistente', description: 'Detectar puertos access en VLANs que no existen', severity: 'critical', check: (blueprint, observed) => { const results: LintResult[] = []; const observedVlans = new Set(observed.vlans.map(v => v.id)); for (const [, device] of Object.entries(observed.devices)) { for (const iface of device.interfaces) { if (iface.mode === 'access' && iface.vlan && !observedVlans.has(iface.vlan)) results.push({ rule: 'accessPortVlanMissing', severity: 'critical', message: `Puerto ${iface.name} usa VLAN ${iface.vlan} que no existe`, entity: `${device.name}/${iface.name}`, device: device.name, suggestion: `Crear VLAN ${iface.vlan} o cambiar puerto a VLAN existente` }); } } return results; } };
}

export function createTrunkVlanNotAllowedRule(): LintRule {
  return { id: 'trunkVlanNotAllowed', name: 'Trunk no Permite VLAN', description: 'Detectar trunks que no permiten VLANs necesarias', severity: 'critical', check: (blueprint, observed) => { const results: LintResult[] = []; for (const [deviceName, device] of Object.entries(observed.devices)) { const bpDevice = blueprint.devices[deviceName]; const deviceVlans = bpDevice?.vlans ?? []; for (const iface of device.interfaces) { if (iface.mode === 'trunk' && iface.trunkVlanAllowed) { for (const vlanId of deviceVlans) { if (!iface.trunkVlanAllowed.includes(Number(vlanId))) results.push({ rule: 'trunkVlanNotAllowed', severity: 'critical', message: `Trunk ${iface.name} en ${deviceName} no permite VLAN ${vlanId}`, entity: `${deviceName}/${iface.name}`, device: deviceName, suggestion: `Agregar VLAN ${vlanId} al trunk: switchport trunk allowed vlan add ${vlanId}` }); } } } } return results; } };
}

export function createNativeVlanMismatchRule(): LintRule {
  return { id: 'nativeVlanMismatch', name: 'Native VLAN Mismatch', description: 'Detectar Native VLAN diferente entre extremos de trunk', severity: 'warning', check: (_, observed) => { const results: LintResult[] = []; for (const link of observed.links) { const deviceA = observed.devices[link.deviceA]; const deviceB = observed.devices[link.deviceB]; if (!deviceA || !deviceB) continue; const ifaceA = deviceA.interfaces.find(i => i.name === link.interfaceA); const ifaceB = deviceB.interfaces.find(i => i.name === link.interfaceB); if (ifaceA?.mode === 'trunk' && ifaceB?.mode === 'trunk') { const nativeA = ifaceA.trunkVlanAllowed?.[0]; const nativeB = ifaceB.trunkVlanAllowed?.[0]; if (nativeA !== nativeB && nativeA !== undefined && nativeB !== undefined) results.push({ rule: 'nativeVlanMismatch', severity: 'warning', message: `Native VLAN mismatch en enlace ${link.deviceA}-${link.deviceB}: ${nativeA} vs ${nativeB}`, entity: `${link.deviceA}-${link.deviceB}`, suggestion: 'Configurar misma native VLAN en ambos extremos' }); } } return results; } };
}

export function createSubinterfaceEncapsRule(): LintRule {
  return { id: 'subinterfaceEncaps', name: 'Subinterfaz sin Encapsulation', description: 'Detectar subinterfaces sin encapsulación consistente', severity: 'warning', check: (blueprint, observed) => { const results: LintResult[] = []; for (const [deviceName] of Object.entries(observed.devices)) { const bpDevice = blueprint.devices[deviceName]; if (bpDevice?.subinterfaces) { for (const sub of bpDevice.subinterfaces) { if (!sub.encapsulation || !sub.vlan) results.push({ rule: 'subinterfaceEncaps', severity: 'warning', message: `Subinterfaz ${sub.number} en ${deviceName} no tiene encapsulación o VLAN`, entity: `${deviceName}/${sub.number}`, device: deviceName, suggestion: 'Configurar: encapsulation dot1q <vlan>' }); } } } return results; } };
}

export function createDhcpPoolSubnetMismatchRule(): LintRule {
  return { id: 'dhcpPoolSubnetMismatch', name: 'DHCP Pool no coincide con Subred', description: 'Detectar pools DHCP cuya red no coincide con la subred', severity: 'critical', check: (_, observed) => { const results: LintResult[] = []; for (const pool of observed.dhcpPools) { const device = observed.devices[pool.device]; if (!device) continue; const subnets = new Set<string>(); for (const iface of device.interfaces) { if (iface.ip && iface.mask) subnets.add(getSubnetKey(iface.ip, iface.mask)); } const poolSubnet = getSubnetKey(pool.network, pool.mask); if (!subnets.has(poolSubnet)) results.push({ rule: 'dhcpPoolSubnetMismatch', severity: 'critical', message: `Pool DHCP en ${pool.device} para ${poolSubnet} no coincide con ninguna subred del device`, entity: pool.device, device: pool.device, suggestion: 'Ajustar pool DHCP para usar subred existente' }); } return results; } };
}

export function createDhcpHelperMissingRule(): LintRule {
  return { id: 'dhcpHelperMissing', name: 'DHCP Helper Faltante', description: 'Detectar cuando servidor DHCP está remoto sin helper-address', severity: 'critical', check: (_, observed) => { const results: LintResult[] = []; const poolSubnets = new Map<string, string>(); for (const pool of observed.dhcpPools) { const subnetKey = getSubnetKey(pool.network, pool.mask); poolSubnets.set(subnetKey, pool.device); } for (const [deviceName, device] of Object.entries(observed.devices)) { for (const iface of device.interfaces) { if (iface.ip && iface.mask) { const subnetKey = getSubnetKey(iface.ip, iface.mask); const dhcpDevice = poolSubnets.get(subnetKey); if (dhcpDevice && dhcpDevice !== deviceName && device.runningConfig && !device.runningConfig.includes('ip helper-address')) results.push({ rule: 'dhcpHelperMissing', severity: 'critical', message: `Device ${deviceName} en subred ${subnetKey} no tiene ip helper-address para DHCP en ${dhcpDevice}`, entity: `${deviceName}/${iface.name}`, device: deviceName, suggestion: 'Agregar: ip helper-address <dhcp-server-ip>' }); } } } return results; } };
}

export function createAclNotAppliedRule(): LintRule {
  return { id: 'aclNotApplied', name: 'ACL no Aplicada', description: 'Detectar ACLs creadas pero no aplicadas a ninguna interfaz', severity: 'warning', check: (_, observed) => { const results: LintResult[] = []; for (const acl of observed.acls) { if (!acl.appliedTo || acl.appliedTo.length === 0) results.push({ rule: 'aclNotApplied', severity: 'warning', message: `ACL ${acl.name} en ${acl.device} no está aplicada a ninguna interfaz`, entity: acl.name, device: acl.device, suggestion: 'Aplicar ACL a interfaz: ip access-group <acl-name> in/out' }); } return results; } };
}

export function createStaticRouteNoReachRule(): LintRule {
  return { id: 'staticRouteNoReach', name: 'Ruta Estática con Next-Hop Inalcanzable', description: 'Detectar rutas estáticas con next-hop no alcanzable', severity: 'critical', check: (_, observed) => { const results: LintResult[] = []; const reachableIps = new Set<string>(); for (const device of Object.values(observed.devices)) { for (const iface of device.interfaces) { if (iface.ip) reachableIps.add(iface.ip); } } for (const route of observed.routes) { if (route.type === 'static' && route.nextHop) { const nextHopSubnet = getSubnetKeyFromIp(route.nextHop, '255.255.255.255'); let reachable = false; for (const ip of Array.from(reachableIps)) { const ipSubnet = getSubnetKeyFromIp(ip, '255.255.255.255'); if (ipSubnet === nextHopSubnet || reachableIps.has(route.nextHop)) { reachable = true; break; } } if (!reachable) results.push({ rule: 'staticRouteNoReach', severity: 'critical', message: `Ruta estática en ${route.device} tiene next-hop ${route.nextHop} no alcanzable`, entity: route.device, device: route.device, suggestion: 'Verificar que el next-hop sea alcanzable directamente' }); } } return results; } };
}

export function createOrphanLinkRule(): LintRule {
  return { id: 'orphanLink', name: 'Enlace Huérfano', description: 'Detectar cables sin ambos extremos conectados', severity: 'info', check: (_, observed) => { const results: LintResult[] = []; for (const link of observed.links) { if (link.status === 'disconnected') results.push({ rule: 'orphanLink', severity: 'info', message: `Enlace entre ${link.deviceA}/${link.interfaceA} y ${link.deviceB}/${link.interfaceB} está desconectado`, entity: `${link.deviceA}-${link.deviceB}`, suggestion: 'Verificar conexiones físicas y configuración de puertos' }); } return results; } };
}

export function createPortConflictRule(): LintRule {
  return { id: 'portConflict', name: 'Conflicto de Puerto', description: 'Detectar mismo puerto usado inconsistentemente', severity: 'warning', check: (_, observed) => { const results: LintResult[] = []; const portUsage = new Map<string, Map<string, string>>(); for (const [deviceName, device] of Object.entries(observed.devices)) { const devicePorts = new Map<string, string>(); for (const iface of device.interfaces) { const existing = devicePorts.get(iface.name); if (existing) results.push({ rule: 'portConflict', severity: 'warning', message: `Puerto ${iface.name} en ${deviceName} tiene configuración conflictiva`, entity: `${deviceName}/${iface.name}`, device: deviceName }); devicePorts.set(iface.name, 'used'); } portUsage.set(deviceName, devicePorts); } return results; } };
}

export function createStpPortfastMissingRule(): LintRule {
  return { id: 'stpPortfastMissing', name: 'PortFast Faltante', description: 'Puertos access sin PortFast enabled', severity: 'critical', check: (_, observed) => { const results: LintResult[] = []; for (const [deviceName, device] of Object.entries(observed.devices)) { for (const iface of device.interfaces) { if (iface.mode === 'access' && iface.status === 'up' && device.runningConfig && !device.runningConfig.includes('spanning-tree portfast')) results.push({ rule: 'stpPortfastMissing', severity: 'critical', message: `Puerto ${iface.name} en ${deviceName} es access pero no tiene PortFast`, entity: `${deviceName}/${iface.name}`, device: deviceName, suggestion: 'Activar PortFast: spanning-tree portfast' }); } } return results; } };
}

export function createStpBpduGuardMissingRule(): LintRule {
  return { id: 'stpBpduGuardMissing', name: 'BPDU Guard Faltante', description: 'Puertos con PortFast pero sin BPDU Guard', severity: 'warning', check: (_, observed) => { const results: LintResult[] = []; for (const [deviceName, device] of Object.entries(observed.devices)) { for (const iface of device.interfaces) { if (device.runningConfig?.includes('spanning-tree portfast') && !device.runningConfig.includes('spanning-tree bpduguard')) results.push({ rule: 'stpBpduGuardMissing', severity: 'warning', message: `Puerto ${iface.name} en ${deviceName} tiene PortFast pero no BPDU Guard`, entity: `${deviceName}/${iface.name}`, device: deviceName, suggestion: 'Agregar BPDU Guard: spanning-tree bpduguard enable' }); } } return results; } };
}

export function createEtherChannelNotFormedRule(): LintRule {
  return { id: 'etherChannelNotFormed', name: 'EtherChannel No Formado', description: 'Puertos configurados para EtherChannel pero no funcionando', severity: 'critical', check: (_, observed) => { const results: LintResult[] = []; for (const [deviceName, device] of Object.entries(observed.devices)) { const modeMap: Record<string, string> = {}; const config = device.runningConfig; if (config) { const channelMatch = config.match(/channel-group (\d+) mode (active|passive|auto|desirable)/g); if (channelMatch && channelMatch.length >= 2) { for (const match of channelMatch) { const parts = match.split(' '); const port = device.interfaces.find(i => config.includes(`interface ${i.name}`) && config.includes(match)); if (port && parts[4]) modeMap[port.name] = parts[4]; } } } const modes = Object.values(modeMap); if (modes.length >= 2) { const hasCompatible = (modes.includes('active') && modes.includes('passive')) || (modes.includes('active') && (modes.includes('auto') || modes.includes('desirable'))) || (modes.includes('passive') && (modes.includes('auto') || modes.includes('desirable'))) || (modes.includes('auto') && modes.includes('desirable')); if (!hasCompatible && new Set(modes).size > 1) results.push({ rule: 'etherChannelNotFormed', severity: 'critical', message: `EtherChannel en ${deviceName} no se forma por modos incompatibles: ${modes.join(', ')}`, entity: deviceName, device: deviceName, suggestion: 'Verificar modos de channel-group: active/passive-auto-desirable' }); } } return results; } };
}

export function createUnusedPortNotShutdownRule(): LintRule {
  return { id: 'unusedPortNotShutdown', name: 'Puerto Sin Uso y Activo', description: 'Puertos no utilizados que no están shutdown', severity: 'info', check: (_, observed) => { const results: LintResult[] = []; for (const [deviceName, device] of Object.entries(observed.devices)) { const connectedPorts = new Set<string>(); for (const link of observed.links) { if (link.deviceA === deviceName) connectedPorts.add(link.interfaceA); if (link.deviceB === deviceName) connectedPorts.add(link.interfaceB); } for (const iface of device.interfaces) { if (!connectedPorts.has(iface.name) && iface.status === 'up') results.push({ rule: 'unusedPortNotShutdown', severity: 'info', message: `Puerto ${iface.name} en ${deviceName} no tiene uso y está activo`, entity: `${deviceName}/${iface.name}`, device: deviceName, suggestion: 'Considerar shutdown en puertos no utilizados' }); } } return results; } };
}
