import type { LintRule, LintResult, ObservedState } from '../../topology-lint-types.js';

export function createHsrpPriorityNotConfiguredRule(): LintRule {
  return {
    id: 'hsrpPriorityNotConfigured', name: 'HSRP Priority No Configurado', description: 'Grupo HSRP sin prioridad explícita', severity: 'info',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const hasHsrp = device.runningConfig.match(/standby (\d+) ip (\S+)/);
        if (hasHsrp && !device.runningConfig.includes('standby priority')) results.push({ rule: 'hsrpPriorityNotConfigured', severity: 'info', message: `Dispositivo ${deviceName} tiene HSRP sin prioridad explícita`, entity: deviceName, device: deviceName, suggestion: 'Configurar prioridad: standby <group> priority <value>' });
      }
      return results;
    },
  };
}

export function createHsrpPreemptNotEnabledRule(): LintRule {
  return {
    id: 'hsrpPreemptNotEnabled', name: 'HSRP Preempt No Habilitado', description: 'HSRP activo sin preempt en router prioritario', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const hasPriority = device.runningConfig.includes('standby priority');
        const hasPreempt = device.runningConfig.includes('standby preempt');
        if (hasPriority && !hasPreempt) results.push({ rule: 'hsrpPreemptNotEnabled', severity: 'warning', message: `Router ${deviceName} tiene prioridad HSRP pero no preempt`, entity: deviceName, device: deviceName, suggestion: 'Habilitar preempt: standby <group> preempt' });
      }
      return results;
    },
  };
}

export function createHsrpAuthMissingRule(): LintRule {
  return {
    id: 'hsrpAuthMissing', name: 'HSRP Sin Autenticación', description: 'HSRP sin autenticación configurada', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const hasHsrp = device.runningConfig.includes('standby ');
        const hasAuth = device.runningConfig.includes('standby authentication');
        if (hasHsrp && !hasAuth) results.push({ rule: 'hsrpAuthMissing', severity: 'warning', message: `Dispositivo ${deviceName} tiene HSRP sin autenticación`, entity: deviceName, device: deviceName, suggestion: 'Agregar autenticación: standby <group> authentication text <password>' });
      }
      return results;
    },
  };
}

export function createHsrpTrackNotConfiguredRule(): LintRule {
  return {
    id: 'hsrpTrackNotConfigured', name: 'HSRP Track No Configurado', description: 'HSRP sin interface tracking', severity: 'info',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const hasPriority = device.runningConfig.includes('standby priority');
        const hasTrack = device.runningConfig.includes('standby track');
        if (hasPriority && !hasTrack) results.push({ rule: 'hsrpTrackNotConfigured', severity: 'info', message: `Router ${deviceName} tiene HSRP sin tracking de interfaz`, entity: deviceName, device: deviceName, suggestion: 'Agregar tracking: standby <group> track <interface> <decrement>' });
      }
      return results;
    },
  };
}

export function createWlcControllerIpInconsistentRule(): LintRule {
  return {
    id: 'wlcControllerIpInconsistent', name: 'WLC Controller IP Inconsistente', description: 'IP inconsistente entre WLC y APs', severity: 'critical',
    check: (_, observed) => {
      const results: LintResult[] = [];
      const wlcIps = new Set<string>();
      for (const device of Object.values(observed.devices)) {
        if (device.model?.toLowerCase().includes('wireless')) { for (const iface of device.interfaces) { if (iface.ip) wlcIps.add(iface.ip); } }
      }
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (device.runningConfig?.includes('ap join')) {
          const controllerMatch = device.runningConfig.match(/controller-ip (\S+)/);
          if (controllerMatch?.[1] && wlcIps.size > 0 && !wlcIps.has(controllerMatch[1])) results.push({ rule: 'wlcControllerIpInconsistent', severity: 'critical', message: `AP ${deviceName} tiene IP de controller inconsistente: ${controllerMatch[1]}`, entity: deviceName, device: deviceName, suggestion: 'Verificar IP del WLC en configuración del AP' });
        }
      }
      return results;
    },
  };
}

export function createApJoinFailureRule(): LintRule {
  return {
    id: 'apJoinFailure', name: 'AP No Join WLC', description: 'AP no está uniéndose al WLC', severity: 'critical',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (device.model?.toLowerCase().includes('access point') || device.model?.toLowerCase().includes('ap ')) {
          if (device.interfaces.some(i => i.status === 'up') && !device.runningConfig?.includes('controller')) results.push({ rule: 'apJoinFailure', severity: 'critical', message: `AP ${deviceName} está prendido pero sin configuración de controller`, entity: deviceName, device: deviceName, suggestion: 'Configurar controller: wireless controller manage <wlc-ip>' });
        }
      }
      return results;
    },
  };
}

export function createSsidNotEnabledRule(): LintRule {
  return {
    id: 'ssidNotEnabled', name: 'SSID No Habilitado', description: 'SSID creado pero deshabilitado', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (device.runningConfig?.includes('wireless')) {
          const ssidMatches = device.runningConfig.match(/ssid (\S+)/g);
          const enabledMatches = device.runningConfig.match(/ssid (\S+) enable/g);
          if (ssidMatches && enabledMatches && ssidMatches.length !== enabledMatches.length) results.push({ rule: 'ssidNotEnabled', severity: 'warning', message: `WLC ${deviceName} tiene SSIDs sin habilitar`, entity: deviceName, device: deviceName, suggestion: 'Habilitar SSIDs: ssid <name> enable' });
        }
      }
      return results;
    },
  };
}

export function createWirelessRrmNotConfiguredRule(): LintRule {
  return {
    id: 'wirelessRrmNotConfigured', name: 'RRM Wireless No Configurado', description: 'Radio Resource Management no está configurado', severity: 'info',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (device.runningConfig?.includes('wireless')) {
          const hasRrm = device.runningConfig.includes('rrm');
          const hasDot11Radio = device.runningConfig.includes('dot11Radio');
          if (hasDot11Radio && !hasRrm) results.push({ rule: 'wirelessRrmNotConfigured', severity: 'info', message: `WLC ${deviceName} tiene radio pero no tiene RRM configurado`, entity: deviceName, device: deviceName, suggestion: 'Configurar RRM: rrm [options]' });
        }
      }
      return results;
    },
  };
}
