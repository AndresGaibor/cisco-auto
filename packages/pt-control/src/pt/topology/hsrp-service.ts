// ============================================================================
// HsrpService - Gestiona Hot Standby Router Protocol (HSRP)
// ============================================================================

/**
 * Interfaz de configuración para HSRP
 */
export interface HsrpConfiguration {
  device: string;
  interface: string;
  group: number;
  virtualIp: string;
  priority?: number;
  preempt?: boolean;
  authentication?: {
    type: "text" | "md5";
    key?: string;
    keyChain?: string;
  };
  track?: {
    interface: string;
    decrement: number;
  };
}

/**
 * Interfaz de resultado de verificación HSRP
 */
export interface HsrpVerificationResult {
  device: string;
  interface: string;
  group: number;
  state: "active" | "standby" | "listen" | "init";
  virtualIp: string;
  priority: number;
  preempt: boolean;
}

/**
 * HsrpService - gestión de HSRP en routers Cisco
 *
 * HSRP provee alta disponibilidad eliminando punto único de fallo
 * en gateways por defecto mediante standby groups.
 */
export class HsrpService {
  private commandExecutor: ((device: string, command: string) => Promise<string>) | null = null;

  /**
   * Configurar HSRP en un dispositivo
   */
  async configureHsrp(config: HsrpConfiguration): Promise<void> {
    this.ensureExecutor();

    const commands: string[] = [];
    const iface = config.interface === config.device ? config.device : config.interface;

    commands.push(`conf t`);
    commands.push(`interface ${iface}`);
    commands.push(`standby ${config.group} ip ${config.virtualIp}`);

    if (config.priority !== undefined) {
      commands.push(`standby ${config.group} priority ${config.priority}`);
    }

    if (config.preempt !== undefined) {
      commands.push(`standby ${config.group} preempt`);
    }

    if (config.authentication) {
      const authCmd = config.authentication.key
        ? `standby ${config.group} authentication ${config.authentication.type} ${config.authentication.key}`
        : `standby ${config.group} authentication ${config.authentication.type}`;
      commands.push(authCmd);
    }

    if (config.track) {
      commands.push(
        `standby ${config.group} track ${config.track.interface} decrement ${config.track.decrement}`
      );
    }

    await this.executeCommands(config.device, commands);
  }

  /**
   * Verificar estado HSRP en una interfaz
   */
  async verifyHsrp(
    device: string,
    interfaceName: string,
    group: number
  ): Promise<HsrpVerificationResult> {
    this.ensureExecutor();

    const output = await this.commandExecutor!(device, `show standby interface ${interfaceName} brief`);

    return this.parseHsrpOutput(device, interfaceName, group, output);
  }

  /**
   * Obtener todos los estados HSRP de un dispositivo
   */
  async getHsrpState(device: string): Promise<HsrpVerificationResult[]> {
    this.ensureExecutor();

    const output = await this.commandExecutor!(device, `show standby all`);
    return this.parseHsrpAllOutput(device, output);
  }

  /**
   * Establecer executor de comandos (inyectado desde outside)
   */
  setCommandExecutor(executor: (device: string, command: string) => Promise<string>): void {
    this.commandExecutor = executor;
  }

  /**
   * Parsear output de show standby
   */
  private parseHsrpOutput(
    device: string,
    interfaceName: string,
    group: number,
    output: string
  ): HsrpVerificationResult {
    const lines = output.split('\n');
    let state: HsrpVerificationResult["state"] = "init";
    let virtualIp = "";
    let priority = 100;
    let preempt = false;

    for (const line of lines) {
      if (line.includes('Priority')) {
        const match = line.match(/Priority\s+(\d+)/);
        if (match && match[1]) priority = parseInt(match[1], 10);
      }
      if (line.includes('Preempt')) {
        preempt = true;
      }
      if (line.includes('State')) {
        const stateMatch = line.match(/State\s+(\w+)/);
        if (stateMatch && stateMatch[1]) {
          const stateStr = stateMatch[1].toLowerCase();
          if (stateStr === 'active' || stateStr === 'standby' || stateStr === 'listen' || stateStr === 'init') {
            state = stateStr as HsrpVerificationResult["state"];
          }
        }
      }
      if (line.includes('Virtual IP')) {
        const ipMatch = line.match(/Virtual IP[^\d]*(\d+\.\d+\.\d+\.\d+)/);
        if (ipMatch && ipMatch[1]) virtualIp = ipMatch[1];
      }
    }

    return {
      device,
      interface: interfaceName,
      group,
      state,
      virtualIp,
      priority,
      preempt,
    };
  }

  /**
   * Parsear output de show standby all
   */
  private parseHsrpAllOutput(device: string, output: string): HsrpVerificationResult[] {
    const results: HsrpVerificationResult[] = [];
    const lines = output.split('\n');

    let currentInterface = "";
    let currentGroup = 0;

    for (const line of lines) {
      if (line.includes('Interface')) {
        const ifaceMatch = line.match(/Interface\s+(\S+)/);
        if (ifaceMatch && ifaceMatch[1]) currentInterface = ifaceMatch[1];
      }

      if (line.includes('Group')) {
        const groupMatch = line.match(/Group\s+(\d+)/);
        if (groupMatch && groupMatch[1]) currentGroup = parseInt(groupMatch[1], 10);
      }

      if (currentInterface && currentGroup > 0 && line.includes('State')) {
        const result = this.parseHsrpOutput(device, currentInterface, currentGroup, line);
        results.push(result);
      }
    }

    return results;
  }

  /**
   * Asegurar que existe executor de comandos
   */
  private ensureExecutor(): void {
    if (!this.commandExecutor) {
      throw new Error("HsrpService: commandExecutor no está configurado. Use setCommandExecutor().");
    }
  }

  /**
   * Ejecutar secuencia de comandos
   */
  private async executeCommands(device: string, commands: string[]): Promise<void> {
    for (const cmd of commands) {
      await this.commandExecutor!(device, cmd);
    }
  }
}

/**
 * Factory
 */
export function createHsrpService(): HsrpService {
  return new HsrpService();
}
