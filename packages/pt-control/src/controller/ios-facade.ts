import type { IosService } from "../application/services/ios-service.js";
import type { DeviceService } from "../application/services/device-service.js";
import type { DeviceCapabilities } from "../domain/ios/capabilities/pt-capability-resolver.js";
import type {
  ParsedOutput,
  ShowCdpNeighbors,
  ShowIpInterfaceBrief,
  ShowIpRoute,
  ShowRunningConfig,
  ShowVlan,
  ShowMacAddressTable,
  DeviceState,
} from "../contracts/index.js";
import type {
  IosExecutionSuccess,
  IosConfigApplyResult,
  IosConfidence,
  IosExecutionEvidence,
} from "../contracts/ios-execution-evidence.js";

/**
 * Fachada de servicios IOS - punto de entrada unificado para operaciones IOS y de dispositivo.
 *
 * Combina IosService y DeviceService bajo una sola interfaz. Provee métodos para:
 * - Ejecutar comandos show y parsear resultados
 * - Aplicar configuración IOS (configIos, configureDhcpPool, etc.)
 * - Consultar capacidades del dispositivo
 * - Gestionar servidores DHCP y configuración de red
 *
 * @example
 * ```typescript
 * const facade = new IosFacade(iosService, deviceService);
 *
 * // Ejecutar comando show
 * const brief = await facade.showIpInterfaceBrief("R1");
 *
 * // Aplicar configuración
 * await facade.configIos("R1", [
 *   "interface GigabitEthernet0/0",
 *   "ip address 192.168.1.1 255.255.255.0"
 * ]);
 *
 * // Configurar DHCP pool
 * await facade.configureDhcpPool("R1", "POOL1", "192.168.1.0", "255.255.255.0", "192.168.1.1");
 * ```
 */
export class IosFacade {
  constructor(
    private readonly iosService: IosService,
    private readonly deviceService: DeviceService,
  ) {}

  async configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<void> {
    await this.iosService.configIos(device, commands, options);
  }

  async execIos<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<{ raw: string; parsed?: T }> {
    return this.iosService.execIos<T>(device, command, parse, timeout);
  }

  async show(device: string, command: string): Promise<ParsedOutput> {
    return this.iosService.show(device, command);
  }

  async showIpInterfaceBrief(device: string): Promise<ShowIpInterfaceBrief> {
    return this.iosService.showIpInterfaceBrief(device);
  }

  async showVlan(device: string): Promise<ShowVlan> {
    return this.iosService.showVlan(device);
  }

  async showIpRoute(device: string): Promise<ShowIpRoute> {
    return this.iosService.showIpRoute(device);
  }

  async showRunningConfig(device: string): Promise<ShowRunningConfig> {
    return this.iosService.showRunningConfig(device);
  }

  async showMacAddressTable(device: string): Promise<ShowMacAddressTable> {
    return this.iosService.show(
      device,
      "show mac address-table",
    ) as unknown as Promise<ShowMacAddressTable>;
  }

  async showCdpNeighbors(device: string): Promise<ShowCdpNeighbors> {
    return this.iosService.showCdpNeighbors(device);
  }

  async execInteractive(
    device: string,
    command: string,
    options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean },
  ): Promise<{ raw: string; parsed?: ParsedOutput; session?: { mode: string } }> {
    return this.iosService.execInteractive(device, command, options);
  }

  async execIosWithEvidence<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<IosExecutionSuccess<T>> {
    return this.iosService.execIos<T>(device, command, parse, timeout);
  }

  async configIosWithResult(
    device: string,
    commands: string[],
    options?: { save?: boolean } | undefined,
  ): Promise<IosConfigApplyResult> {
    return this.iosService.configIos(device, commands, options);
  }

  async configureDhcpServer(
    device: string,
    options: {
      poolName: string;
      network: string;
      subnetMask: string;
      defaultRouter?: string;
      dnsServers?: string[];
      excludedAddresses?: string[];
      leaseTime?: number;
      domainName?: string;
    },
  ): Promise<void> {
    await this.deviceService.configureDhcpServer(device, {
      enabled: true,
      pools: [
        {
          name: options.poolName,
          network: options.network,
          mask: options.subnetMask,
          defaultRouter: options.defaultRouter ?? "",
          dns: options.dnsServers?.[0],
        },
      ],
      excluded: options.excludedAddresses?.map((e) => {
        const [start, end] = e.split("-");
        return { start: start ?? e, end: end ?? e };
      }),
    });
  }

  async inspectDhcpServer(device: string): Promise<{
    ok: boolean;
    device: string;
    enabled: boolean;
    pools: Array<{
      name: string;
      network: string;
      mask: string;
      defaultRouter: string;
      dns?: string;
      startIp?: string;
      endIp?: string;
      maxUsers?: number;
      leaseCount: number;
      leases: Array<{ mac: string; ip: string; expires: string }>;
    }>;
    excludedAddresses: Array<{ start: string; end: string }>;
    poolCount: number;
    excludedAddressCount: number;
  }> {
    const result = await this.deviceService.inspectDhcpServer(device);
    return {
      ...result,
      poolCount: result.pools.length,
      excludedAddressCount: result.excludedAddresses.length,
    };
  }

  async showParsed<T = ParsedOutput>(
    device: string,
    command: string,
    options?: { ensurePrivileged?: boolean; timeout?: number },
  ): Promise<IosExecutionSuccess<T>> {
    return this.iosService.showParsed<T>(device, command, options);
  }

  async getIosConfidence(
    device: string,
    evidence: { source: string; status?: number; mode?: string },
    verificationCheck?: string,
  ): Promise<IosConfidence> {
    return this.iosService.getConfidence(
      device,
      evidence as IosExecutionEvidence,
      verificationCheck,
    );
  }

  async configureDhcpPool(
    device: string,
    poolName: string,
    network: string,
    mask: string,
    defaultRouter: string,
    dnsServer?: string,
    options?: { save?: boolean },
  ): Promise<void> {
    await this.iosService.configureDhcpPool(
      device,
      poolName,
      network,
      mask,
      defaultRouter,
      dnsServer,
      options,
    );
  }

  async configureOspfNetwork(
    device: string,
    processId: number,
    network: string,
    wildcard: string,
    area: number,
    options?: { save?: boolean },
  ): Promise<void> {
    await this.iosService.configureOspfNetwork(device, processId, network, wildcard, area, options);
  }

  async configureSshAccess(
    device: string,
    domainName: string,
    username: string,
    password: string,
    options?: { save?: boolean },
  ): Promise<void> {
    await this.iosService.configureSshAccess(device, domainName, username, password, options);
  }

  async configureAccessListStandard(
    device: string,
    aclNumber: number,
    entries: string[],
    options?: { save?: boolean },
  ): Promise<void> {
    await this.iosService.configureAccessListStandard(device, aclNumber, entries, options);
  }

  async resolveCapabilities(device: string): Promise<DeviceCapabilities> {
    return this.iosService.resolveCapabilities(device);
  }

  async inspect(device: string, includeXml = false): Promise<DeviceState> {
    return this.deviceService.inspect(device, includeXml);
  }

  async hardwareInfo(device: string): Promise<unknown> {
    return this.deviceService.hardwareInfo(device);
  }

  async hardwareCatalog(deviceType?: string): Promise<unknown> {
    return this.deviceService.hardwareCatalog(deviceType);
  }

  async commandLog(device?: string, limit = 100): Promise<unknown[]> {
    return this.deviceService.commandLog(device, limit);
  }

  async deepInspect(path: string, method?: string, args?: unknown[]): Promise<unknown> {
    return this.deviceService.deepInspect(path, method, args as any[]);
  }
}
