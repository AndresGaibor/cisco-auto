/**
 * NTP Generator - Generates NTP configuration commands
 * Creates NTP server, peer, and synchronization configurations
 */

export interface NTPConfig {
  enabled: boolean;
  servers?: NTPServer[];
  peers?: NTPPeer[];
  authentication?: NTPAuth;
  timezone?: string;
}

export interface NTPServer {
  address: string;
  stratum?: number;
  prefer?: boolean;
  minPoll?: number;
  maxPoll?: number;
}

export interface NTPPeer {
  address: string;
  key?: number;
}

export interface NTPAuth {
  enabled: boolean;
  keys?: Map<number, string>;
  trustedKeys?: number[];
}

export class NTPGenerator {
  generateNTPBasic(config: NTPConfig): string[] {
    const commands: string[] = [];

    if (!config.enabled) {
      commands.push('no ntp enable');
      return commands;
    }

    commands.push('ntp enable');

    // NTP servers
    if (config.servers && config.servers.length > 0) {
      for (const server of config.servers) {
        let cmd = `ntp server ${server.address}`;
        if (server.prefer) {
          cmd += ' prefer';
        }
        if (server.minPoll) {
          cmd += ` minpoll ${server.minPoll}`;
        }
        if (server.maxPoll) {
          cmd += ` maxpoll ${server.maxPoll}`;
        }
        commands.push(cmd);
      }
    }

    // NTP peers
    if (config.peers && config.peers.length > 0) {
      for (const peer of config.peers) {
        let cmd = `ntp peer ${peer.address}`;
        if (peer.key) {
          cmd += ` key ${peer.key}`;
        }
        commands.push(cmd);
      }
    }

    // Timezone
    if (config.timezone) {
      commands.push(`clock timezone ${config.timezone}`);
    }

    return commands;
  }

  generateNTPAuthentication(auth: NTPAuth): string[] {
    const commands: string[] = [];

    if (!auth.enabled) {
      commands.push('no ntp authenticate');
      return commands;
    }

    commands.push('ntp authenticate');

    // NTP keys
    if (auth.keys && auth.keys.size > 0) {
      for (const [keyId, password] of auth.keys) {
        commands.push(`ntp trusted-key ${keyId}`);
        commands.push(`ntp authentication-key ${keyId} md5 ${password}`);
      }
    }

    return commands;
  }

  generateNTPSourceInterface(interfaceName: string): string[] {
    const commands: string[] = [];
    commands.push(`ntp source ${interfaceName}`);
    return commands;
  }

  validateNTPConfig(config: NTPConfig): string[] {
    const errors: string[] = [];

    // Validate servers
    if (config.servers) {
      for (const server of config.servers) {
        if (!this.isValidHostOrIP(server.address)) {
          errors.push(`Invalid NTP server: ${server.address}`);
        }
        if (server.stratum && (server.stratum < 1 || server.stratum > 16)) {
          errors.push(`Invalid NTP stratum: ${server.stratum} (1-16)`);
        }
      }
    }

    return errors;
  }

  private isValidHostOrIP(address: string): boolean {
    // Check if valid IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipRegex.test(address)) {
      const parts = address.split('.');
      return parts.every(p => {
        const num = parseInt(p, 10);
        return num >= 0 && num <= 255;
      });
    }

    // Check if valid hostname
    const hostnameRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return hostnameRegex.test(address);
  }
}
