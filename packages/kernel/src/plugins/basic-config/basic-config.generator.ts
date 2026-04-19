import { basicConfigSchema, type BasicConfig, type BasicConfigInput, type LineEntry } from './basic-config.schema.js';
import { buildValidationResult } from '../shared/validation.utils.js';

export const BASIC_VERIFY_COMMANDS = ['show running-config | section hostname', 'show running-config | include banner', 'show running-config | include ip ssh', 'show line vty 0'] as const;

export function generateBasicCommands(spec: BasicConfigInput): string[] {
  const config = basicConfigSchema.parse(spec);
  const commands: string[] = [];

  // Hostname (siempre requerido)
  commands.push(`hostname ${config.hostname}`);

  // No ip domain-lookup
  if (config.noIpDomainLookup !== false) {
    commands.push('no ip domain-lookup');
  }

  // Password encryption
  if (config.passwordEncryption !== false) {
    commands.push('service password-encryption');
  }

  // Logging synchronous
  if (config.loggingSynchronous !== false) {
    commands.push('logging synchronous');
  }

  // Banner MOTD
  if (config.banner?.motd) {
    const bannerLines = config.banner.motd.split('\n');
    const delimiter = '#';
    commands.push(`banner motd ${delimiter}`);
    for (const line of bannerLines) {
      commands.push(line);
    }
    commands.push(delimiter);
  }

  // Timezone
  if (config.timezone) {
    const sign = config.timezone.offset >= 0 ? '+' : '';
    commands.push(`clock timezone ${config.timezone.name} ${sign}${config.timezone.offset}`);
  }

  // SSH Configuration
  if (config.ssh) {
    const { domainName, keySize, version } = config.ssh;

    if (!commands.includes('no ip domain-lookup')) {
      commands.push('no ip domain-lookup');
    }

    commands.push(`ip domain-name ${domainName}`);
    commands.push(`crypto key generate rsa modulus ${keySize}`);
    commands.push(`ip ssh version ${version}`);
    commands.push('ip ssh time-out 60');
    commands.push('ip ssh authentication-retries 3');
  }

  // Lines
  for (const line of config.lines ?? []) {
    commands.push(...generateLineCommands(line));
  }

  return commands;
}

function generateLineCommands(line: LineEntry): string[] {
  const commands: string[] = [];

  const lineKeyword = line.type;
  const range = line.range ?? getDefaultRange(line.type);

  commands.push(`line ${lineKeyword} ${range}`);

  if (line.loggingSynchronous !== false) {
    commands.push('logging synchronous');
  }

  if (line.password) {
    commands.push(`password ${line.password}`);
  }

  if (line.loginLocal) {
    commands.push('login local');
  } else if (line.password) {
    commands.push('login');
  }

  if (line.transportInput) {
    commands.push(`transport input ${line.transportInput}`);
  }

  if (line.execTimeout) {
    commands.push(`exec-timeout ${line.execTimeout} 0`);
  }

  commands.push('exit');

  return commands;
}

function getDefaultRange(type: 'console' | 'vty' | 'aux'): string {
  switch (type) {
    case 'console':
      return '0';
    case 'vty':
      return '0 15';
    case 'aux':
      return '0';
  }
}

export function verifyShowRunningConfig(output: string, spec: BasicConfigInput) {
  const config: BasicConfig = basicConfigSchema.parse(spec);
  const lines = output.split(/\r?\n/);
  const errors: Array<{ path: string; message: string; code: string }> = [];

  // Verificar hostname
  const hostnameLine = lines.find((line) => line.trim().startsWith('hostname '));
  if (!hostnameLine || !hostnameLine.includes(config.hostname)) {
    errors.push({
      path: 'hostname',
      message: `Hostname "${config.hostname}" no encontrado en la configuración`,
      code: 'hostname_not_found',
    });
  }

  // Verificar banner MOTD
  if (config.banner?.motd) {
    const hasBanner = lines.some((line) => line.trim().includes('banner motd'));
    if (!hasBanner) {
      errors.push({
        path: 'banner.motd',
        message: 'Banner MOTD no configurado',
        code: 'banner_not_found',
      });
    }
  }

  // Verificar SSH
  if (config.ssh) {
    const hasDomain = lines.some((line) => line.trim().includes(`ip domain-name ${config.ssh.domainName}`));
    if (!hasDomain) {
      errors.push({
        path: 'ssh.domainName',
        message: `Dominio SSH "${config.ssh.domainName}" no configurado`,
        code: 'ssh_domain_not_found',
      });
    }

    const hasSshVersion = lines.some((line) => line.trim().includes(`ip ssh version ${config.ssh.version}`));
    if (!hasSshVersion) {
      errors.push({
        path: 'ssh.version',
        message: `SSH versión ${config.ssh.version} no configurada`,
        code: 'ssh_version_not_found',
      });
    }
  }

  return buildValidationResult(errors);
}
