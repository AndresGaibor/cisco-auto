// ============================================================================
// IosService — Fachada de orquestación semántica de IOS
// ============================================================================

import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type {
  ParsedOutput,
  ShowIpInterfaceBrief,
  ShowVlan,
  ShowIpRoute,
  ShowRunningConfig,
  ShowMacAddressTable,
  ShowCdpNeighbors,
  DeviceState,
} from "../../contracts/index.js";
import type {
  IosExecutionSuccess,
  IosConfigApplyResult,
  IosConfidence,
  IosExecutionEvidence,
} from "../../contracts/ios-execution-evidence.js";
import type { DeviceCapabilities } from "../../domain/ios/capabilities/pt-capability-resolver.js";
import { IosExecutionService } from "./ios-execution-service.js";
import { IosSemanticService } from "./ios-semantic-service.js";

export class IosService {
  private readonly execution: IosExecutionService;
  private readonly semantic: IosSemanticService;

  constructor(
    bridge: FileBridgePort,
    generateId: () => string,
    inspectDevice: (device: string) => Promise<DeviceState>,
  ) {
    this.execution = new IosExecutionService(bridge, generateId);
    this.semantic = new IosSemanticService(bridge as any, this.execution, inspectDevice);
  }

  getSession(device: string) {
    return this.execution.getSession(device);
  }

  clearSession(device: string): void {
    this.execution.clearSession(device);
  }

  execIos<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000,
  ): Promise<IosExecutionSuccess<T>> {
    return this.execution.execIos<T>(device, command, parse, timeout);
  }

  execInteractive(
    device: string,
    command: string,
    options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean },
  ): Promise<IosExecutionSuccess<ParsedOutput>> {
    return this.execution.execInteractive(device, command, options);
  }

  configIos(
    device: string,
    commands: string[],
    options?: { save?: boolean },
  ): Promise<IosConfigApplyResult> {
    return this.execution.configIos(device, commands, options);
  }

  showParsed<T = ParsedOutput>(
    device: string,
    command: string,
    options?: { ensurePrivileged?: boolean; timeout?: number },
  ): Promise<IosExecutionSuccess<T>> {
    return this.execution.showParsed<T>(device, command, options);
  }

  show(device: string, command: string): Promise<ParsedOutput> {
    return this.execution.show(device, command);
  }

  showIpInterfaceBrief(device: string): Promise<ShowIpInterfaceBrief> {
    return this.execution.showIpInterfaceBrief(device);
  }

  showVlan(device: string): Promise<ShowVlan> {
    return this.execution.showVlan(device);
  }

  showIpRoute(device: string): Promise<ShowIpRoute> {
    return this.execution.showIpRoute(device);
  }

  showRunningConfig(device: string): Promise<ShowRunningConfig> {
    return this.execution.showRunningConfig(device);
  }

  showCdpNeighbors(device: string): Promise<ShowCdpNeighbors> {
    return this.execution.showCdpNeighbors(device);
  }

  showMacAddressTable(device: string): Promise<ShowMacAddressTable> {
    return this.execution.show(device, "show mac address-table") as Promise<ShowMacAddressTable>;
  }

  configureSvi(
    device: string,
    vlan: number,
    ip: string,
    mask: string,
    options?: { description?: string; enableRouting?: boolean; save?: boolean },
  ): Promise<void> {
    return this.semantic.configureSvi(device, vlan, ip, mask, options);
  }

  configureAccessPort(
    device: string,
    portName: string,
    vlan: number,
    options?: { description?: string; portfast?: boolean; bpduguard?: boolean; save?: boolean },
  ): Promise<void> {
    return this.semantic.configureAccessPort(device, portName, vlan, options);
  }

  configureTrunkPort(
    device: string,
    portName: string,
    vlans: number[],
    options?: { nativeVlan?: number; description?: string; save?: boolean },
  ): Promise<void> {
    return this.semantic.configureTrunkPort(device, portName, vlans, options);
  }

  configureSubinterface(
    device: string,
    subinterfaceName: string,
    ip: string,
    mask: string,
    vlan: number,
    options?: { description?: string; save?: boolean },
  ): Promise<void> {
    return this.semantic.configureSubinterface(device, subinterfaceName, ip, mask, vlan, options);
  }

  configureStaticRoute(
    device: string,
    network: string,
    mask: string,
    nextHop: string,
    options?: { description?: string; save?: boolean },
  ): Promise<void> {
    return this.semantic.configureStaticRoute(device, network, mask, nextHop, options);
  }

  configureDhcpRelay(
    device: string,
    interfaceName: string,
    helperAddress: string,
    options?: { save?: boolean },
  ): Promise<void> {
    return this.semantic.configureDhcpRelay(device, interfaceName, helperAddress, options);
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
    return this.semantic.configureDhcpPool(
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
    return this.semantic.configureOspfNetwork(device, processId, network, wildcard, area, options);
  }

  configureSshAccess(
    device: string,
    domainName: string,
    username: string,
    password: string,
    options?: { save?: boolean },
  ): Promise<void> {
    return this.semantic.configureSshAccess(device, domainName, username, password, options);
  }

  configureAccessListStandard(
    device: string,
    aclNumber: number,
    entries: string[],
    options?: { save?: boolean },
  ): Promise<void> {
    return this.semantic.configureAccessListStandard(device, aclNumber, entries, options);
  }

  getConfidence(
    device: string,
    evidence: IosExecutionEvidence,
    verificationCheck?: string,
  ): Promise<IosConfidence> {
    return this.semantic.getConfidence(device, evidence, verificationCheck);
  }

  resolveCapabilities(device: string): Promise<DeviceCapabilities> {
    return this.semantic.resolveCapabilities(device);
  }
}
