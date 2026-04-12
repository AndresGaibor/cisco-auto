import { securitySchema, type SecurityConfigInput, type SecurityConfig } from './security.schema.js';

// Comandos para verificar configuración de seguridad
export const SECURITY_VERIFY_COMMANDS = ['show access-lists', 'show ip nat translations'] as const;

/**
 * Genera comandos IOS de configuración de seguridad (ACL + NAT)
 */
export function generateSecurityCommands(spec: SecurityConfigInput): string[] {
  const config = securitySchema.parse(spec);
  const commands: string[] = [];

  // Generar comandos ACL
  for (const acl of config.acls ?? []) {
    commands.push(`! ACL: ${acl.name} (${acl.type})`);

    for (const rule of acl.rules) {
      const ruleCmd = buildAclRule(acl.name, acl.type, rule);
      commands.push(ruleCmd);
    }

    // Aplicar ACL a interfaz si está especificado
    if (acl.appliedOn && acl.direction) {
      commands.push(`interface ${acl.appliedOn}`);
      commands.push(`ip access-group ${acl.name} ${acl.direction}`);
      commands.push('exit');
    }
  }

  // Configurar interfaces NAT inside
  for (const iface of config.natInsideInterfaces ?? []) {
    commands.push(`interface ${iface}`);
    commands.push('ip nat inside');
    commands.push('exit');
  }

  // Configurar interfaces NAT outside
  for (const iface of config.natOutsideInterfaces ?? []) {
    commands.push(`interface ${iface}`);
    commands.push('ip nat outside');
    commands.push('exit');
  }

  // Generar NAT estático
  for (const staticNat of config.natStatic ?? []) {
    commands.push(`ip nat inside source static ${staticNat.localIp} ${staticNat.globalIp}`);
  }

  // Generar pool NAT
  if (config.natPool) {
    const pool = config.natPool;
    commands.push(`ip nat pool ${pool.name} ${pool.startIp} ${pool.endIp} netmask ${pool.netmask}`);
  }

  return commands;
}

/**
 * Construye un comando de regla ACL
 */
function buildAclRule(
  aclName: string,
  aclType: 'standard' | 'extended',
  rule: SecurityConfig['acls'][number]['rules'][number]
): string {
  if (aclType === 'standard') {
    // ACL estándar: access-list <number> permit|deny <source> [wildcard]
    let cmd = `access-list ${aclName} ${rule.action} ${rule.source}`;
    if (rule.sourceWildcard) {
      cmd += ` ${rule.sourceWildcard}`;
    }
    return cmd;
  }

  // ACL extendida: access-list <number> permit|deny <protocol> <src> <wildcard> <dst> <wildcard> [eq <port>]
  let cmd = `access-list ${aclName} ${rule.action}`;

  if (rule.protocol) {
    cmd += ` ${rule.protocol}`;
  }

  cmd += ` ${rule.source}`;
  if (rule.sourceWildcard) {
    cmd += ` ${rule.sourceWildcard}`;
  }

  if (rule.destination) {
    cmd += ` ${rule.destination}`;
    if (rule.destinationWildcard) {
      cmd += ` ${rule.destinationWildcard}`;
    }
  } else {
    cmd += ' any';
  }

  if (rule.destinationPort) {
    cmd += ` eq ${rule.destinationPort}`;
  }

  return cmd;
}

/**
 * Verifica la salida de show access-lists contra la configuración esperada
 */
export function verifyShowAccessLists(output: string, spec: SecurityConfigInput) {
  const config: SecurityConfig = securitySchema.parse(spec);
  const outputLines = output.split(/\r?\n/);
  const errors: Array<{ path: string; message: string; code: string }> = [];

  for (const [aclIndex, acl] of (config.acls ?? []).entries()) {
    const aclFound = outputLines.some(line =>
      line.includes(`access-list ${acl.name}`) || line.includes(`${acl.name}`)
    );

    if (!aclFound) {
      errors.push({
        path: `acls.${aclIndex}.name`,
        message: `ACL ${acl.name} no encontrada en show access-lists`,
        code: 'missing_acl',
      });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
