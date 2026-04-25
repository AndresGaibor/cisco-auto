// ============================================================================
// Ipv6Service - Gestiona configuración IPv6 en dispositivos IOS
// ============================================================================

/**
 * Interfaz de configuración IPv6 routing
 */
export interface IPv6RoutingConfig {
  device: string;
  interface: string;
  address: string;
  eui64?: boolean;
  linkLocal?: boolean;
}

/**
 * Interfaz de perfil ND (Neighbor Discovery)
 */
export interface NdProfile {
  routerAdverts: number;
  managedConfig: boolean;
  otherConfig: boolean;
  reachableTime: number;
  retransTimer: number;
}

/**
 * Ipv6Service - gestión de IPv6 en routers Cisco
 *
 * Maneja routing IPv6, stateless address autoconfiguration (SLAAC),
 * DHCPv6 relay, y verificación de perfiles ND.
 */
export class Ipv6Service {
  private commandExecutor: ((device: string, command: string) => Promise<string>) | null = null;

  /**
   * Habilitar routing IPv6 en dispositivo
   */
  async enableIpv6Routing(device: string): Promise<void> {
    this.ensureExecutor();

    const commands: string[] = [
      `conf t`,
      `ipv6 unicast-routing`,
    ];

    await this.executeCommands(device, commands);
  }

  /**
   * Configurar dirección IPv6 en interfaz
   */
  async configureInterfaceIpv6(config: IPv6RoutingConfig): Promise<void> {
    this.ensureExecutor();

    const commands: string[] = [
      `conf t`,
      `interface ${config.interface}`,
    ];

    if (config.linkLocal) {
      commands.push(`ipv6 address autoconfig`);
    } else if (config.eui64) {
      commands.push(`ipv6 address ${config.address} eui-64`);
    } else {
      commands.push(`ipv6 address ${config.address}`);
    }

    await this.executeCommands(config.device, commands);
  }

  /**
   * Configurar SLAAC en interfaz
   */
  async configureSlaac(device: string, interfaceName: string): Promise<void> {
    this.ensureExecutor();

    const commands: string[] = [
      `conf t`,
      `interface ${interfaceName}`,
      `ipv6 address autoconfig`,
    ];

    await this.executeCommands(device, commands);
  }

  /**
   * Configurar DHCPv6 relay en interfaz
   */
  async configureDhcpv6Relay(
    device: string,
    interfaceName: string,
    serverAddress: string
  ): Promise<void> {
    this.ensureExecutor();

    const commands: string[] = [
      `conf t`,
      `interface ${interfaceName}`,
      `ipv6 dhcp relay destination ${serverAddress}`,
    ];

    await this.executeCommands(device, commands);
  }

  /**
   * Verificar perfil ND en interfaz
   */
  async verifyNdProfile(
    device: string,
    interfaceName: string
  ): Promise<NdProfile> {
    this.ensureExecutor();

    const output = await this.commandExecutor!(
      device,
      `show ipv6 interface ${interfaceName}`
    );

    return this.parseNdProfile(output);
  }

  /**
   * Establecer executor de comandos (inyectado desde outside)
   */
  setCommandExecutor(executor: (device: string, command: string) => Promise<string>): void {
    this.commandExecutor = executor;
  }

  /**
   * Parsear output de show ipv6 interface
   */
  private parseNdProfile(output: string): NdProfile {
    const lines = output.split('\n');
    let routerAdverts = 0;
    let managedConfig = false;
    let otherConfig = false;
    let reachableTime = 0;
    let retransTimer = 0;

    for (const line of lines) {
      if (line.includes('Router advertisements')) {
        const match = line.match(/Router advertisements\s+(\d+)/);
        if (match && match[1]) routerAdverts = parseInt(match[1], 10);
      }
      if (line.includes('Managed address configuration')) {
        managedConfig = line.includes('enabled') || line.includes('Yes');
      }
      if (line.includes('Other stateful configuration')) {
        otherConfig = line.includes('enabled') || line.includes('Yes');
      }
      if (line.includes('Reachable Time')) {
        const match = line.match(/Reachable Time\s+(\d+)/);
        if (match && match[1]) reachableTime = parseInt(match[1], 10);
      }
      if (line.includes('Retrans Timer')) {
        const match = line.match(/Retrans Timer\s+(\d+)/);
        if (match && match[1]) retransTimer = parseInt(match[1], 10);
      }
    }

    return {
      routerAdverts,
      managedConfig,
      otherConfig,
      reachableTime,
      retransTimer,
    };
  }

  /**
   * Asegurar que existe executor de comandos
   */
  private ensureExecutor(): void {
    if (!this.commandExecutor) {
      throw new Error(
        "Ipv6Service: commandExecutor no está configurado. Use setCommandExecutor()."
      );
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
export function createIpv6Service(): Ipv6Service {
  return new Ipv6Service();
}
