import type { LintRule, LintResult, ObservedState } from '../../topology-lint-types.js';

export function createManagementPortNoAclRule(): LintRule {
  return {
    id: 'managementPortNoAcl', name: 'Puerto Management Sin ACL', description: 'Interfaces de management sin ACL aplicada', severity: 'critical',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        const mgmtInterfaces = device.interfaces.filter(i => i.name.toLowerCase().includes('vlan1') || i.name.toLowerCase().includes('loopback'));
        for (const iface of mgmtInterfaces) {
          if (iface.ip) {
            const hasAcl = device.runningConfig?.includes('access-group') ?? device.runningConfig?.includes('ip access-class');
            if (!hasAcl) results.push({ rule: 'managementPortNoAcl', severity: 'critical', message: `Interfaz ${iface.name} en ${deviceName} no tiene ACL configurada`, entity: `${deviceName}/${iface.name}`, device: deviceName, suggestion: 'Aplicar ACL para restringir acceso management' });
          }
        }
      }
      return results;
    },
  };
}

export function createNativeVlan1OnTrunkRule(): LintRule {
  return {
    id: 'nativeVlan1OnTrunk', name: 'Native VLAN 1 en Trunk', description: 'Native VLAN 1 configurada en trunk', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        for (const iface of device.interfaces) {
          if (iface.mode === 'trunk' && iface.trunkVlanAllowed?.includes(1)) results.push({ rule: 'nativeVlan1OnTrunk', severity: 'warning', message: `Trunk ${iface.name} en ${deviceName} usa Native VLAN 1 (inseguro)`, entity: `${deviceName}/${iface.name}`, device: deviceName, suggestion: 'Cambiar Native VLAN a otra que no sea 1' });
        }
      }
      return results;
    },
  };
}

export function createCdpEnabledUntrustedRule(): LintRule {
  return {
    id: 'cdpEnabledUntrusted', name: 'CDP Habilitado en Puerto No Confiable', description: 'CDP activo en puertos de acceso sin control', severity: 'info',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const hasCdpRun = device.runningConfig.includes('cdp run');
        const hasNoCdpInterface = device.runningConfig.includes('no cdp enable');
        const accessInterfaces = device.interfaces.filter(i => i.mode === 'access');
        if (hasCdpRun && accessInterfaces.length > 0 && !hasNoCdpInterface) results.push({ rule: 'cdpEnabledUntrusted', severity: 'info', message: `Dispositivo ${deviceName} tiene CDP habilitado en puertos de acceso`, entity: deviceName, device: deviceName, suggestion: 'Considerar deshabilitar CDP en puertos no confiables: no cdp enable' });
      }
      return results;
    },
  };
}

export function createSshNotConfiguredRule(): LintRule {
  return {
    id: 'sshNotConfigured', name: 'SSH No Configurado', description: 'Acceso SSH sin crypto key configurado', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const hasVty = device.runningConfig.includes('line vty');
        const hasSsh = device.runningConfig.includes('ip ssh');
        const hasCryptoKey = device.runningConfig.includes('crypto key');
        if (hasVty && !hasSsh && !hasCryptoKey) results.push({ rule: 'sshNotConfigured', severity: 'warning', message: `Dispositivo ${deviceName} tiene VTY pero no SSH configurado`, entity: deviceName, device: deviceName, suggestion: 'Generar crypto key: crypto key generate rsa' });
      }
      return results;
    },
  };
}

export function createPasswordInPlainTextRule(): LintRule {
  return {
    id: 'passwordInPlainText', name: 'Contraseñas en Texto Plano', description: 'No tiene service password-encryption', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const hasPasswords = device.runningConfig.includes('enable password') || device.runningConfig.includes('username ');
        const hasEncryption = device.runningConfig.includes('service password-encryption');
        if (hasPasswords && !hasEncryption) results.push({ rule: 'passwordInPlainText', severity: 'warning', message: `Dispositivo ${deviceName} tiene contraseñas sin cifrado`, entity: deviceName, device: deviceName, suggestion: 'Activar: service password-encryption' });
      }
      return results;
    },
  };
}

export function createIpv6LinkLocalNotConfiguredRule(): LintRule {
  return {
    id: 'ipv6LinkLocalNotConfigured', name: 'IPv6 Link-Local No Configurado', description: 'IPv6 habilitado sin configuración de link-local', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const hasIpv6Enable = device.runningConfig.includes('ipv6 enable');
        const hasIpv6Address = device.runningConfig.match(/ipv6 address (\S+)/);
        if (hasIpv6Enable && !hasIpv6Address) results.push({ rule: 'ipv6LinkLocalNotConfigured', severity: 'warning', message: `Dispositivo ${deviceName} tiene IPv6 habilitado sin dirección configurada`, entity: deviceName, device: deviceName, suggestion: 'Configurar IPv6: ipv6 address <address>/<prefix>' });
      }
      return results;
    },
  };
}

export function createIpv6SlaacNoRaRule(): LintRule {
  return {
    id: 'ipv6SlaacNoRa', name: 'SLAAC Sin Router Advertisement', description: 'SLAAC activo pero flags de RA no permiten autoconfig', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const hasSlaac = device.runningConfig.includes('ipv6 address autoconfig');
        const hasNoRa = device.runningConfig.includes('ipv6 nd suppress-ra');
        if (hasSlaac && hasNoRa) results.push({ rule: 'ipv6SlaacNoRa', severity: 'warning', message: `Dispositivo ${deviceName} tiene SLAAC pero RA suprimido`, entity: deviceName, device: deviceName, suggestion: 'Remover suppress-ra si se necesita SLAAC: no ipv6 nd suppress-ra' });
      }
      return results;
    },
  };
}

export function createIpv6DhcpRelayMissingRule(): LintRule {
  return {
    id: 'ipv6DhcpRelayMissing', name: 'DHCPv6 Relay Faltante', description: 'Cliente DHCPv6 sin relay configurado', severity: 'warning',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const hasDhcpClient = device.runningConfig.includes('ipv6 address dhcp');
        const hasRelay = device.runningConfig.includes('ipv6 dhcp relay');
        if (hasDhcpClient && !hasRelay) results.push({ rule: 'ipv6DhcpRelayMissing', severity: 'warning', message: `Interfaz en ${deviceName} usa DHCPv6 client sin relay`, entity: deviceName, device: deviceName, suggestion: 'Agregar relay: ipv6 dhcp relay destination <address>' });
      }
      return results;
    },
  };
}

export function createIpv6RoutingEnabledButNotConfiguredRule(): LintRule {
  return {
    id: 'ipv6RoutingEnabledButNotConfigured', name: 'IPv6 Routing Habilitado Sin Configurar', description: 'IPv6 routing activado sin ninguna interfaz IPv6', severity: 'info',
    check: (_, observed) => {
      const results: LintResult[] = [];
      for (const [deviceName, device] of Object.entries(observed.devices)) {
        if (!device.runningConfig) continue;
        const hasIpv6Routing = device.runningConfig.includes('ipv6 unicast-routing');
        let hasIpv6Interface = false;
        for (const iface of device.interfaces) { if (iface.ip?.includes(':')) { hasIpv6Interface = true; break; } }
        if (hasIpv6Routing && !hasIpv6Interface) results.push({ rule: 'ipv6RoutingEnabledButNotConfigured', severity: 'info', message: `Dispositivo ${deviceName} tiene IPv6 routing habilitado sin interfaces IPv6`, entity: deviceName, device: deviceName, suggestion: 'Configurar interfaces IPv6 o deshabilitar IPv6 routing si no se usa' });
      }
      return results;
    },
  };
}
