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
    await this.deviceService.configureDhcpServer(device, options);
  }

  async inspectDhcpServer(device: string): Promise<{
    ok: boolean;
    device: string;
    pools: Array<{
      name: string;
      network: string;
      subnetMask: string;
      defaultRouter?: string;
      dnsServers?: string[];
      leaseTime?: number;
      domainName?: string;
    }>;
    excludedAddresses?: string[];
    poolCount: number;
    excludedAddressCount: number;
  }> {
    return this.deviceService.inspectDhcpServer(device);
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
