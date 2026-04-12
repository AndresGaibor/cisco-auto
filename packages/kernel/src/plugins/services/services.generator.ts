import {
  servicesSchema,
  type ServicesConfig,
  type ServicesConfigInput,
  type DhcpPoolConfig,
  type NtpConfig,
  type DnsConfig,
  type SyslogConfig,
  type SnmpConfig,
} from './services.schema.js';

/**
 * Genera comandos IOS para configuración de servicios (DHCP, NTP, DNS, Syslog, SNMP)
 */
export function generateServicesCommands(spec: ServicesConfigInput): string[] {
  const config = servicesSchema.parse(spec);
  const commands: string[] = [];

  // DHCP
  if (config.dhcp && config.dhcp.length > 0) {
    commands.push('! DHCP Configuration');
    for (const pool of config.dhcp) {
      commands.push(...generateDhcpPool(pool));
    }
  }

  // NTP
  if (config.ntp) {
    commands.push(...generateNtp(config.ntp));
  }

  // DNS
  if (config.dns) {
    commands.push(...generateDns(config.dns));
  }

  // Syslog
  if (config.syslog) {
    commands.push(...generateSyslog(config.syslog));
  }

  // SNMP
  if (config.snmp) {
    commands.push(...generateSnmp(config.snmp));
  }

  return commands;
}

/**
 * Genera comandos para un pool DHCP
 */
function generateDhcpPool(pool: DhcpPoolConfig): string[] {
  const commands: string[] = [];

  // Direcciones excluidas (van fuera del pool)
  if (pool.excludedAddresses && pool.excludedAddresses.length > 0) {
    for (const addr of pool.excludedAddresses) {
      commands.push(`ip dhcp excluded-address ${addr}`);
    }
  }

  // Pool DHCP
  commands.push(`ip dhcp pool ${pool.name}`);
  commands.push(` network ${pool.network} ${pool.mask}`);

  if (pool.defaultRouter) {
    commands.push(` default-router ${pool.defaultRouter}`);
  }

  if (pool.dnsServers && pool.dnsServers.length > 0) {
    commands.push(` dns-server ${pool.dnsServers.join(' ')}`);
  }

  if (pool.domainName) {
    commands.push(` domain-name ${pool.domainName}`);
  }

  if (pool.lease !== undefined) {
    commands.push(` lease ${pool.lease}`);
  }

  commands.push(' exit');

  return commands;
}

/**
 * Genera comandos para configuración NTP
 */
function generateNtp(config: NtpConfig): string[] {
  const commands: string[] = [];

  if (!config.servers?.length && !config.master) {
    return [];
  }

  commands.push('! NTP Configuration');

  // Servidores NTP
  if (config.servers) {
    for (const server of config.servers) {
      let cmd = `ntp server ${server.ip}`;
      if (server.prefer) {
        cmd += ' prefer';
      }
      commands.push(cmd);
    }
  }

  // NTP Master
  if (config.master) {
    commands.push(`ntp master ${config.stratum || 8}`);
  }

  return commands;
}

/**
 * Genera comandos para configuración DNS
 */
function generateDns(config: DnsConfig): string[] {
  const commands: string[] = [];

  if (!config.domainName && !config.nameServers?.length) {
    return [];
  }

  commands.push('! DNS Configuration');

  if (config.domainName) {
    commands.push(`ip domain-name ${config.domainName}`);
  }

  if (config.nameServers) {
    for (const server of config.nameServers) {
      commands.push(`ip name-server ${server}`);
    }
  }

  return commands;
}

/**
 * Genera comandos para configuración Syslog
 */
function generateSyslog(config: SyslogConfig): string[] {
  const commands: string[] = [];

  if (!config.servers?.length) {
    return [];
  }

  commands.push('! Syslog Configuration');

  // Servidores Syslog
  for (const server of config.servers) {
    commands.push(`logging ${server.ip}`);
  }

  // Nivel de trap global
  if (config.trap) {
    commands.push(`logging trap ${config.trap}`);
  }

  return commands;
}

/**
 * Genera comandos para configuración SNMP
 */
function generateSnmp(config: SnmpConfig): string[] {
  const commands: string[] = [];

  if (!config.communities?.length && !config.hosts?.length) {
    return [];
  }

  commands.push('! SNMP Configuration');

  // Comunidades
  if (config.communities) {
    for (const comm of config.communities) {
      commands.push(`snmp-server community ${comm.name} ${comm.access}`);
    }
  }

  // Hosts de traps
  if (config.hosts) {
    for (const host of config.hosts) {
      commands.push(`snmp-server host ${host.ip} ${host.community}`);
    }
  }

  return commands;
}

/**
 * Comandos para verificar configuración de servicios
 */
export const SERVICES_VERIFY_COMMANDS = [
  'show ip dhcp binding',
  'show ntp status',
  'show logging',
  'show snmp community',
] as const;

/**
 * Verifica la salida de show ip dhcp brief contra la configuración esperada
 */
export function verifyShowIpDhcpBinding(output: string, spec: ServicesConfigInput) {
  const config = servicesSchema.parse(spec);
  const outputLines = output.split(/\r?\n/);
  const errors: Array<{ path: string; message: string; code: string }> = [];

  if (!config.dhcp) {
    return { ok: true, errors };
  }

  for (const [index, pool] of config.dhcp.entries()) {
    const poolFound = outputLines.some((line) => line.includes(pool.network));

    if (!poolFound) {
      errors.push({
        path: `dhcp.${index}.network`,
        message: `DHCP pool network ${pool.network} not found in output`,
        code: 'missing_dhcp_pool',
      });
    }
  }

  return { ok: errors.length === 0, errors };
}
