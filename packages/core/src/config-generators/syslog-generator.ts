/**
 * Syslog Generator - Generates Syslog configuration commands
 * Creates syslog server, facility, and logging configurations
 */

export type SyslogSeverity = 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'informational' | 'debug';
export type SyslogFacility = 'local0' | 'local1' | 'local2' | 'local3' | 'local4' | 'local5' | 'local6' | 'local7';

export interface SyslogConfig {
  enabled: boolean;
  servers?: SyslogServer[];
  facility?: SyslogFacility;
  severity?: SyslogSeverity;
  bufferSize?: number;
  protocol?: 'udp' | 'tcp';
}

export interface SyslogServer {
  address: string;
  port?: number;
  facility?: SyslogFacility;
  severity?: SyslogSeverity;
}

export interface LoggingPolicy {
  facility: SyslogFacility;
  severity: SyslogSeverity;
  enabled: boolean;
}

export class SyslogGenerator {
  generateSyslogBasic(config: SyslogConfig): string[] {
    const commands: string[] = [];

    if (!config.enabled) {
      commands.push('no logging on');
      return commands;
    }

    commands.push('logging on');

    // Default facility
    if (config.facility) {
      commands.push(`logging facility ${config.facility}`);
    }

    // Default severity
    if (config.severity) {
      commands.push(`logging trap ${config.severity}`);
    }

    // Buffer size
    if (config.bufferSize) {
      commands.push(`logging buffered ${config.bufferSize}`);
    }

    // Protocol
    if (config.protocol) {
      commands.push(`logging transport ${config.protocol}`);
    }

    return commands;
  }

  generateSyslogServers(servers: SyslogServer[]): string[] {
    const commands: string[] = [];

    for (const server of servers) {
      let cmd = `logging host ${server.address}`;

      if (server.port) {
        cmd += ` ${server.port}`;
      }

      if (server.facility) {
        cmd += ` facility ${server.facility}`;
      }

      if (server.severity) {
        cmd += ` severity ${server.severity}`;
      }

      commands.push(cmd);
    }

    return commands;
  }

  generateSourceInterface(interfaceName: string): string[] {
    const commands: string[] = [];
    commands.push(`logging source-interface ${interfaceName}`);
    return commands;
  }

  generateLoggingPolicy(policies: LoggingPolicy[]): string[] {
    const commands: string[] = [];

    for (const policy of policies) {
      if (policy.enabled) {
        commands.push(`logging facility ${policy.facility}`);
        commands.push(`logging severity ${policy.severity}`);
      } else {
        commands.push(`no logging facility ${policy.facility}`);
      }
    }

    return commands;
  }

  generateDebugLogging(modules: string[]): string[] {
    const commands: string[] = [];

    for (const module of modules) {
      commands.push(`debug ${module}`);
    }

    return commands;
  }

  generateDisableDebugLogging(modules?: string[]): string[] {
    const commands: string[] = [];

    if (!modules || modules.length === 0) {
      commands.push('undebug all');
    } else {
      for (const module of modules) {
        commands.push(`undebug ${module}`);
      }
    }

    return commands;
  }

  validateSyslogConfig(config: SyslogConfig): string[] {
    const errors: string[] = [];

    // Validate servers
    if (config.servers) {
      for (const server of config.servers) {
        if (!this.isValidIP(server.address)) {
          errors.push(`Invalid syslog server IP: ${server.address}`);
        }
        if (server.port && (server.port < 1 || server.port > 65535)) {
          errors.push(`Invalid syslog server port: ${server.port}`);
        }
      }
    }

    // Validate facility
    if (config.facility && !this.isValidFacility(config.facility)) {
      errors.push(`Invalid syslog facility: ${config.facility}`);
    }

    // Validate severity
    if (config.severity && !this.isValidSeverity(config.severity)) {
      errors.push(`Invalid syslog severity: ${config.severity}`);
    }

    return errors;
  }

  private isValidIP(ip: string): boolean {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255;
    });
  }

  private isValidFacility(facility: string): boolean {
    return ['local0', 'local1', 'local2', 'local3', 'local4', 'local5', 'local6', 'local7'].includes(facility);
  }

  private isValidSeverity(severity: string): boolean {
    return [
      'emergency',
      'alert',
      'critical',
      'error',
      'warning',
      'notice',
      'informational',
      'debug',
    ].includes(severity);
  }
}
