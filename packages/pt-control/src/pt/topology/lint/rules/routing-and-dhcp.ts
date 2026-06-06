import type { LintRule, LintResult, ObservedState } from '../../topology-lint-types.js';
import { getSubnetKeyFromIp } from '../utils.js';

export function createOspfDeadIntervalMismatchRule(): LintRule {
  return {
    id: 'ospfDeadIntervalMismatch', name: 'OSPF Dead Interval Mismatch', description: 'Vecinos OSPF con diferentes dead intervals', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const neighborMatches = device.runningConfig.matchAll(/neighbor (\d+\.\d+\.\d+\.\d+) priority \d+\s+dead (\d+)/g);
        const neighbors: { ip: string; dead: number }[] = [];
        for (const match of neighborMatches) { if (match[1] && match[2]) neighbors.push({ ip: match[1], dead: parseInt(match[2]) }); }
        if (neighbors.length > 0) {
          const deadBySubnet = new Map<string, number>();
          for (const n of neighbors) {
            const subnet = getSubnetKeyFromIp(n.ip, '255.255.255.240');
            if (deadBySubnet.has(subnet)) { if (deadBySubnet.get(subnet) !== n.dead) results.push({ rule: 'ospfDeadIntervalMismatch', severity: 'warning', message: `OSPF en ${deviceName}: vecino ${n.ip} tiene dead interval ${n.dead}s diferente a otros en misma subred`, entity: `${deviceName}/${n.ip}`, device: deviceName, suggestion: 'Unificar dead interval en todos los routers del área OSPF' }); }
            else deadBySubnet.set(subnet, n.dead);
          }
        }
      }
      return results;
    },
  };
}

export function createOspfAuthMissingRule(): LintRule {
  return {
    id: 'ospfAuthMissing', name: 'OSPF Sin Autenticación', description: 'Área OSPF sin autenticación configurada', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const hasOspf = device.runningConfig.includes('router ospf');
        const hasAreaAuth = device.runningConfig.includes('area ') && device.runningConfig.includes('authentication');
        if (hasOspf && !hasAreaAuth) results.push({ rule: 'ospfAuthMissing', severity: 'warning', message: `Router ${deviceName} tiene OSPF sin autenticación configurada`, entity: deviceName, device: deviceName, suggestion: 'Agregar autenticación OSPF: area <id> authentication' });
      }
      return results;
    },
  };
}

export function createEigrpAsMismatchRule(): LintRule {
  return {
    id: 'eigrpAsMismatch', name: 'EIGRP AS Mismatch', description: 'Vecino EIGRP con diferente número de AS', severity: 'critical',
    check: (_, observed) => {
      const results: LintResult[] = [];
      const deviceAsMap = new Map<string, number>();
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const eigrpMatch = device.runningConfig.match(/router eigrp (\d+)/);
        if (eigrpMatch?.[1]) deviceAsMap.set(deviceName, parseInt(eigrpMatch[1]));
      }
      return results;
    },
  };
}

export function createEigrpPassiveInterfaceWrongRule(): LintRule {
  return {
    id: 'eigrpPassiveInterfaceWrong', name: 'EIGRP Passive Interface Incorrecta', description: 'Interfaz que debería estar activa está como passive', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        if (!device.runningConfig.match(/router eigrp (\d+)/)) continue;
        const passiveInterfaces = new Set<string>();
        const passiveMatch = device.runningConfig.matchAll(/passive-interface (\S+)/g);
        for (const match of passiveMatch) { if (match[1]) passiveInterfaces.add(match[1]); }
        for (const iface of device.interfaces) {
          if (iface.ip && iface.status === 'up' && passiveInterfaces.has(iface.name)) results.push({ rule: 'eigrpPassiveInterfaceWrong', severity: 'warning', message: `Interfaz ${iface.name} en ${deviceName} tiene IP y está como passive-interface EIGRP`, entity: `${deviceName}/${iface.name}`, device: deviceName, suggestion: 'Si la interfaz debe formar vecindad EIGRP, remover passive-interface' });
        }
      }
      return results;
    },
  };
}

export function createDhcpExcludedAddressesMissingRule(): LintRule {
  return {
    id: 'dhcpExcludedAddressesMissing', name: 'Direcciones Excluidas Faltantes', description: 'Pool DHCP sin direcciones excluidas configuradas', severity: 'info',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const pool of observed.dhcpPools) {
        const device = observed.devices[pool.device];
        if (!device?.runningConfig) continue;
        if (!device.runningConfig.includes('ip dhcp excluded-address')) results.push({ rule: 'dhcpExcludedAddressesMissing', severity: 'info', message: `Pool DHCP en ${pool.device} no tiene direcciones excluidas`, entity: pool.device, device: pool.device, suggestion: 'Considerar excluir gateway y Broadcast: ip dhcp excluded-address <start> <end>' });
      }
      return results;
    },
  };
}

export function createDhcpPoolExhaustedRule(): LintRule {
  return {
    id: 'dhcpPoolExhausted', name: 'DHCP Pool Agotado', description: 'Pool DHCP con alta utilización', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const pool of observed.dhcpPools) {
        const poolStart = pool.startIp.split('.').map(Number);
        const poolEnd = pool.endIp.split('.').map(Number);
        const poolSize = ((poolEnd[3] ?? 0) - (poolStart[3] ?? 0)) + 1;
        if (poolSize <= 10) results.push({ rule: 'dhcpPoolExhausted', severity: 'warning', message: `Pool DHCP en ${pool.device} tiene solo ${poolSize} direcciones disponibles`, entity: pool.device, device: pool.device, suggestion: 'Considerar pool más grande si hay múltiples clientes' });
      }
      return results;
    },
  };
}

export function createDhcpFallbackMissingRule(): LintRule {
  return {
    id: 'dhcpFallbackMissing', name: 'Fallback DHCP Faltante', description: 'No hay servidor DHCP fallback configurado', severity: 'info',
    check: (_, observed) => {
      const results: LintResult[] = [];
      if (observed.dhcpPools.length === 1) results.push({ rule: 'dhcpFallbackMissing', severity: 'info', message: 'Solo un servidor DHCP configurado sin fallback', entity: 'dhcp', suggestion: 'Considerar servidor fallback para redundancia' });
      return results;
    },
  };
}
