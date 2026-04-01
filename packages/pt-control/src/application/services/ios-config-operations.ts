import type { CliSession } from "../../domain/ios/session/cli-session.js";
import type { CommandResult } from "../../domain/ios/session/command-result.js";
import type { CapabilitySet } from "../../domain/ios/capabilities/capability-set.js";
import {
  planConfigureSvi,
  planConfigureAccessPort,
  planConfigureTrunkPort,
  planConfigureSubinterface,
  planConfigureStaticRoute,
  planConfigureDhcpRelay,
  type ConfigureSviInput,
  type ConfigureAccessPortInput,
  type ConfigureTrunkPortInput,
  type ConfigureSubinterfaceInput,
  type ConfigureStaticRouteInput,
  type ConfigureDhcpRelayInput,
} from "../../domain/ios/operations/index.js";
import type { CommandPlan } from "../../domain/ios/operations/command-plan.js";
import {
  parseVlanId as VlanId,
  parseIpv4Address as Ipv4Address,
  parseSubnetMask as SubnetMask,
  parseInterfaceName as InterfaceName,
} from "../../domain/ios/value-objects/index.js";

export class IosConfigOperations {
  constructor(
    private getSession: (device: string) => CliSession,
    private getCapabilities: (device: string) => CapabilitySet,
    private executePlan: (device: string, plan: CommandPlan | null) => Promise<CommandResult[]>,
  ) {}

  async configureSvi(
    device: string,
    vlanId: number,
    ipAddress: string,
    subnetMask: string,
  ): Promise<CommandResult[]> {
    const caps = this.getCapabilities(device);
    const vlan = VlanId(vlanId);
    const ip = Ipv4Address(ipAddress);
    const mask = SubnetMask(subnetMask);
    const input: ConfigureSviInput = { vlan, ip, mask };
    const plan = planConfigureSvi(caps, input);
    return this.executePlan(device, plan);
  }

  async configureAccessPort(
    device: string,
    interfaceName: string,
    vlanId: number,
  ): Promise<CommandResult[]> {
    const caps = this.getCapabilities(device);
    const ifName = InterfaceName(interfaceName);
    const vlan = VlanId(vlanId);
    const input: ConfigureAccessPortInput = { port: ifName, vlan };
    const plan = planConfigureAccessPort(caps, input);
    return this.executePlan(device, plan);
  }

  async configureTrunkPort(
    device: string,
    interfaceName: string,
    nativeVlan?: number,
  ): Promise<CommandResult[]> {
    const caps = this.getCapabilities(device);
    const ifName = InterfaceName(interfaceName);
    const nativeVlanId = nativeVlan ? VlanId(nativeVlan) : undefined;
    const input: ConfigureTrunkPortInput = { port: ifName, vlans: [], nativeVlan: nativeVlanId };
    const plan = planConfigureTrunkPort(caps, input);
    return this.executePlan(device, plan);
  }

  async configureSubinterface(
    device: string,
    interfaceName: string,
    subVlanId: number,
    ipAddress: string,
    subnetMask: string,
  ): Promise<CommandResult[]> {
    const caps = this.getCapabilities(device);
    const ifName = InterfaceName(interfaceName);
    const vlan = VlanId(subVlanId);
    const ip = Ipv4Address(ipAddress);
    const mask = SubnetMask(subnetMask);
    const input: ConfigureSubinterfaceInput = { parent: ifName, vlan, ip, mask };
    const plan = planConfigureSubinterface(caps, input);
    return this.executePlan(device, plan);
  }

  async configureStaticRoute(
    device: string,
    destinationNetwork: string,
    subnetMask: string,
    nextHopIpAddress: string,
  ): Promise<CommandResult[]> {
    const caps = this.getCapabilities(device);
    const destNetwork = Ipv4Address(destinationNetwork);
    const destMask = SubnetMask(subnetMask);
    const nextHop = Ipv4Address(nextHopIpAddress);
    const input: ConfigureStaticRouteInput = { network: destNetwork, mask: destMask, nextHop: nextHop };
    const plan = planConfigureStaticRoute(caps, input);
    return this.executePlan(device, plan);
  }

  async configureDhcpRelay(
    device: string,
    interfaceName: string,
    dhcpServerIp: string,
  ): Promise<CommandResult[]> {
    const caps = this.getCapabilities(device);
    const ifName = InterfaceName(interfaceName);
    const serverIp = Ipv4Address(dhcpServerIp);
    const input: ConfigureDhcpRelayInput = { interface: ifName, helperAddress: serverIp };
    const plan = planConfigureDhcpRelay(caps, input);
    return this.executePlan(device, plan);
  }
}
