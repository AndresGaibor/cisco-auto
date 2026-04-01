/**
 * iOS Validator - Validates iOS configurations and command outputs
 */

export interface IOSValidationRequest {
  commands: string[];
  deviceState?: Record<string, unknown>;
  strictMode?: boolean;
}

export interface IOSValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class IOSValidator {
  validateCommands(request: IOSValidationRequest): IOSValidationResponse {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    for (const command of request.commands) {
      const cmdErrors = this.validateCommand(command);
      errors.push(...cmdErrors.errors);
      warnings.push(...cmdErrors.warnings);
      suggestions.push(...cmdErrors.suggestions);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  validateCommand(command: string): { errors: string[]; warnings: string[]; suggestions: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    if (!this.isValidSyntax(command)) {
      errors.push(`Invalid command syntax: ${command}`);
    }

    if (command.includes('  ')) {
      warnings.push('Multiple spaces in command');
      suggestions.push('Remove extra spaces');
    }

    if (this.isDeprecated(command)) {
      warnings.push(`Deprecated command: ${command}`);
      suggestions.push(`Use modern alternative`);
    }

    if (command.startsWith('ip route ')) {
      const routeErrors = this.validateRoute(command);
      errors.push(...routeErrors);
    }

    if (command.startsWith('interface ')) {
      const ifaceErrors = this.validateInterfaceConfig(command);
      errors.push(...ifaceErrors);
    }

    if (command.startsWith('ip address ')) {
      const ipErrors = this.validateIPAddress(command);
      errors.push(...ipErrors);
    }

    return { errors, warnings, suggestions };
  }

  private isValidSyntax(command: string): boolean {
    if (!command || command.trim().length === 0) {
      return false;
    }

    if (/[<>|&]/.test(command)) {
      return false;
    }

    return true;
  }

  private isDeprecated(command: string): boolean {
    const deprecated = [
      'access-list',
      'distribute-list',
      'ip prefix-list',
    ];

    return deprecated.some(d => command.startsWith(d));
  }

  private validateRoute(command: string): string[] {
    const errors: string[] = [];

    const parts = command.split(/\s+/);
    if (parts.length < 4) {
      errors.push('Route command requires network, mask, and gateway');
      return errors;
    }

    const network = parts[2];
    const mask = parts[3];
    const gateway = parts[4];

    if (!this.isValidIP(network)) {
      errors.push(`Invalid network address: ${network}`);
    }

    if (!this.isValidIP(mask)) {
      errors.push(`Invalid subnet mask: ${mask}`);
    }

    if (!this.isValidIP(gateway)) {
      errors.push(`Invalid gateway address: ${gateway}`);
    }

    return errors;
  }

  private validateInterfaceConfig(command: string): string[] {
    const errors: string[] = [];

    const match = command.match(/interface\s+(\S+)/);
    if (!match) {
      errors.push('Invalid interface command');
    }

    return errors;
  }

  private validateIPAddress(command: string): string[] {
    const errors: string[] = [];

    const match = command.match(/ip address\s+(\S+)\s+(\S+)/);
    if (!match) {
      errors.push('Invalid IP address command');
      return errors;
    }

    const [, ip, mask] = match;

    if (!this.isValidIP(ip)) {
      errors.push(`Invalid IP address: ${ip}`);
    }

    if (!this.isValidIP(mask)) {
      errors.push(`Invalid subnet mask: ${mask}`);
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
}
