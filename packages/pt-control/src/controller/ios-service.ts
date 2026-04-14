import type { DeviceService } from "../application/services/device-service.js";
import type { IosService } from "../application/services/ios-service.js";
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
} from "../contracts/ios-execution-evidence.js";
import type { DeviceCapabilities } from "../domain/ios/capabilities/pt-capability-resolver.js";

export class ControllerIosService {
  constructor(
    private readonly iosService: IosService,
    private readonly deviceService: DeviceService,
  ) {}

  configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<void> {
    return this.iosService.configIos(device, commands, options).then(() => undefined);
  }

  execIos<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<{ raw: string; parsed?: T }> {
    return this.iosService.execIos<T>(device, command, parse, timeout);
  }

  show(device: string, command: string): Promise<ParsedOutput> {
    return this.iosService.show(device, command);
  }

  showIpInterfaceBrief(device: string): Promise<ShowIpInterfaceBrief> {
    return this.iosService.showIpInterfaceBrief(device);
  }

  showVlan(device: string): Promise<ShowVlan> {
    return this.iosService.showVlan(device);
  }

  showIpRoute(device: string): Promise<ShowIpRoute> {
    return this.iosService.showIpRoute(device);
  }

  showRunningConfig(device: string): Promise<ShowRunningConfig> {
    return this.iosService.showRunningConfig(device);
  }

  showMacAddressTable(device: string): Promise<ShowMacAddressTable> {
    return this.iosService.show(device, "show mac address-table") as Promise<ShowMacAddressTable>;
  }

  showCdpNeighbors(device: string): Promise<ShowCdpNeighbors> {
    return this.iosService.showCdpNeighbors(device);
  }

  execInteractive(
    device: string,
    command: string,
    options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean },
  ): Promise<{ raw: string; parsed?: ParsedOutput; session?: { mode: string } }> {
    return this.iosService.execInteractive(device, command, options);
  }

  execIosWithEvidence<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<IosExecutionSuccess<T>> {
    return this.iosService.execIos<T>(device, command, parse, timeout);
  }

  configIosWithResult(
    device: string,
    commands: string[],
    options?: { save?: boolean } | undefined,
  ): Promise<IosConfigApplyResult> {
    return this.iosService.configIos(device, commands, options);
  }

  configureDhcpServer(
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
    return this.deviceService.configureDhcpServer(device, options);
  }

  inspectDhcpServer(device: string): Promise<{
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

  showParsed<T = ParsedOutput>(
    device: string,
    command: string,
    options?: { ensurePrivileged?: boolean; timeout?: number },
  ): Promise<IosExecutionSuccess<T>> {
    return this.iosService.showParsed<T>(device, command, options);
  }

  getIosConfidence(
    device: string,
    evidence: { source: string; status?: number; mode?: string },
    verificationCheck?: string,
  ): Promise<IosConfidence> {
    return this.iosService.getConfidence(device, evidence as any, verificationCheck);
  }

  configureDhcpPool(
    device: string,
    poolName: string,
    network: string,
    mask: string,
    defaultRouter: string,
    dnsServer?: string,
    options?: { save?: boolean },
  ): Promise<void> {
    return this.iosService.configureDhcpPool(
      device,
      poolName,
      network,
      mask,
      defaultRouter,
      dnsServer,
      options,
    );
  }

  configureOspfNetwork(
    device: string,
    processId: number,
    network: string,
    wildcard: string,
    area: number,
    options?: { save?: boolean },
  ): Promise<void> {
    return this.iosService.configureOspfNetwork(
      device,
      processId,
      network,
      wildcard,
      area,
      options,
    );
  }

  configureSshAccess(
    device: string,
    domainName: string,
    username: string,
    password: string,
    options?: { save?: boolean },
  ): Promise<void> {
    return this.iosService.configureSshAccess(device, domainName, username, password, options);
  }

  configureAccessListStandard(
    device: string,
    aclNumber: number,
    entries: string[],
    options?: { save?: boolean },
  ): Promise<void> {
    return this.iosService.configureAccessListStandard(device, aclNumber, entries, options);
  }

  resolveCapabilities(device: string): Promise<DeviceCapabilities> {
    return this.iosService.resolveCapabilities(device);
  }

  inspect(device: string, includeXml = false): Promise<DeviceState> {
    return this.deviceService.inspect(device, includeXml);
  }

  hardwareInfo(device: string): Promise<unknown> {
    return this.deviceService.hardwareInfo(device);
  }

  hardwareCatalog(deviceType?: string): Promise<unknown> {
    return this.deviceService.hardwareCatalog(deviceType);
  }

  commandLog(device?: string, limit = 100): Promise<unknown[]> {
    return this.deviceService.commandLog(device, limit);
  }
}
