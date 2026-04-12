import type { DeviceState } from "../../contracts/index.js";
import type { IosConfidence, IosExecutionEvidence } from "../../contracts/ios-execution-evidence.js";
import { deriveIosConfidence } from "../../contracts/ios-execution-evidence.js";
import { resolveCapabilities, type DeviceCapabilities } from "../../domain/ios/capabilities/pt-capability-resolver.js";
import { planConfigureSvi, planConfigureAccessPort, planConfigureTrunkPort, planConfigureSubinterface, planConfigureStaticRoute, planConfigureDhcpRelay, resolveCapabilitySet } from "@cisco-auto/ios-domain";
import { IosVerificationService } from "./ios-verification-service.js";
import { IosExecutionService } from "./ios-execution-service.js";
import { parseIpv4Address as Ipv4Address, parseSubnetMask as SubnetMask, parseInterfaceName as InterfaceName, parseVlanId as VlanId } from "@cisco-auto/kernel/domain/ios/value-objects";

export class IosSemanticService {
  private readonly verifier: IosVerificationService;

  constructor(
    private bridge: { appendEvent?: (event: any) => void },
    private execution: IosExecutionService,
    private inspectDevice: (device: string) => Promise<DeviceState>,
  ) {
    this.verifier = new IosVerificationService(this.execution.execIosRaw.bind(this.execution));
  }

  private recordVerification(device: string, verification: any): void {
    try {
      this.bridge?.appendEvent?.({ type: "verification", id: Date.now().toString(), device, verification });
    } catch {
      // No bloquear la operación si el bridge no puede registrar el evento
    }
  }

  private async getCapabilitySet(device: string) {
    const deviceState = await this.inspectDevice(device);
    const model = deviceState.model || "unknown";
    return resolveCapabilitySet(model);
  }

  async configureSvi(device: string, vlan: number, ip: string, mask: string, options?: { description?: string; enableRouting?: boolean; save?: boolean }): Promise<void> {
    const caps = await this.getCapabilitySet(device);
    const plan = planConfigureSvi(caps, {
      vlan: VlanId(vlan),
      ip: Ipv4Address(ip),
      mask: SubnetMask(mask),
      description: options?.description,
      enableRouting: options?.enableRouting,
    });
    if (!plan) throw new Error(`${device} does not support SVIs`);
    await this.execution.configIos(device, plan.steps.map((step: any) => step.command), { save: options?.save });
    try { this.recordVerification(device, await this.verifier.verifyInterfaceIp(device, `Vlan${vlan}`, ip)); } catch {}
  }

  async configureAccessPort(device: string, portName: string, vlan: number, options?: { description?: string; portfast?: boolean; bpduguard?: boolean; save?: boolean }): Promise<void> {
    const caps = await this.getCapabilitySet(device);
    const plan = planConfigureAccessPort(caps, {
      port: InterfaceName(portName),
      vlan: VlanId(vlan),
      description: options?.description,
      portfast: options?.portfast,
      bpduguard: options?.bpduguard,
    });
    if (!plan) throw new Error(`${device} does not support access port configuration`);
    await this.execution.configIos(device, plan.steps.map((step: any) => step.command), { save: options?.save });
    try { this.recordVerification(device, await this.verifier.verifyAccessPort(device, portName, vlan)); } catch {}
  }

  async configureTrunkPort(device: string, portName: string, vlans: number[], options?: { nativeVlan?: number; description?: string; save?: boolean }): Promise<void> {
    const caps = await this.getCapabilitySet(device);
    const plan = planConfigureTrunkPort(caps, {
      port: InterfaceName(portName),
      vlans: vlans.map((v) => VlanId(v)),
      nativeVlan: options?.nativeVlan ? VlanId(options.nativeVlan) : undefined,
      description: options?.description,
    });
    if (!plan) throw new Error(`${device} does not support trunk configuration`);
    await this.execution.configIos(device, plan.steps.map((step: any) => step.command), { save: options?.save });
    try { this.recordVerification(device, await this.verifier.verifyTrunkPort(device, portName, vlans)); } catch {}
  }

  async configureSubinterface(device: string, subinterfaceName: string, ip: string, mask: string, vlan: number, options?: { description?: string; save?: boolean }): Promise<void> {
    const caps = await this.getCapabilitySet(device);
    const plan = planConfigureSubinterface(caps, {
      parent: InterfaceName(subinterfaceName),
      vlan: VlanId(vlan),
      ip: Ipv4Address(ip),
      mask: SubnetMask(mask),
      description: options?.description,
    });
    if (!plan) throw new Error(`${device} does not support subinterfaces`);
    await this.execution.configIos(device, plan.steps.map((step: any) => step.command), { save: options?.save });
    try { this.recordVerification(device, await this.verifier.verifySubinterface(device, subinterfaceName, ip)); } catch {}
  }

  async configureStaticRoute(device: string, network: string, mask: string, nextHop: string, options?: { description?: string; save?: boolean }): Promise<void> {
    const caps = await this.getCapabilitySet(device);
    const plan = planConfigureStaticRoute(caps, {
      network: Ipv4Address(network),
      mask: SubnetMask(mask),
      nextHop: Ipv4Address(nextHop),
      description: options?.description,
    });
    if (!plan) throw new Error(`${device} does not support static routes`);
    await this.execution.configIos(device, plan.steps.map((step: any) => step.command), { save: options?.save });
    try { this.recordVerification(device, await this.verifier.verifyStaticRoute(device, network, mask, nextHop)); } catch {}
  }

  async configureDhcpRelay(device: string, interfaceName: string, helperAddress: string, options?: { save?: boolean }): Promise<void> {
    const caps = await this.getCapabilitySet(device);
    const plan = planConfigureDhcpRelay(caps, {
      interface: InterfaceName(interfaceName),
      helperAddress: Ipv4Address(helperAddress),
    });
    if (!plan) throw new Error(`${device} does not support DHCP relay`);
    await this.execution.configIos(device, plan.steps.map((step: any) => step.command), { save: options?.save });
    try { this.recordVerification(device, await this.verifier.verifyDhcpRelay(device, interfaceName, helperAddress)); } catch {}
  }

  async configureDhcpPool(device: string, poolName: string, network: string, mask: string, defaultRouter: string, dnsServer?: string, options?: { save?: boolean }): Promise<void> {
    const commands = [
      `ip dhcp pool ${poolName}`,
      `network ${network} ${mask}`,
      `default-router ${defaultRouter}`,
    ];
    if (dnsServer) commands.push(`dns-server ${dnsServer}`);
    await this.execution.configIos(device, commands, { save: options?.save ?? true });
    const verification = await this.execution.execInteractive(device, "show running-config", { parse: false, ensurePrivileged: true, timeout: 15000 });
    if (!verification.raw.includes(`ip dhcp pool ${poolName}`)) throw new Error(`DHCP pool '${poolName}' was not found after configuration.`);
  }

  async configureOspfNetwork(device: string, processId: number, network: string, wildcard: string, area: number, options?: { save?: boolean }): Promise<void> {
    await this.execution.configIos(device, [
      `router ospf ${processId}`,
      `network ${network} ${wildcard} area ${area}`,
    ], { save: options?.save ?? true });
    const verification = await this.execution.execInteractive(device, "show ip protocols", { parse: false, ensurePrivileged: true, timeout: 10000 });
    if (!verification.raw.toLowerCase().includes("ospf")) throw new Error(`OSPF process ${processId} was not visible after configuration.`);
  }

  async configureSshAccess(device: string, domainName: string, username: string, password: string, options?: { save?: boolean }): Promise<void> {
    await this.execution.configIos(device, [
      `ip domain-name ${domainName}`,
      `username ${username} secret ${password}`,
      `crypto key generate rsa`,
      `line vty 0 4`,
      `transport input ssh`,
      `login local`,
    ], { save: options?.save ?? true });
    const verification = await this.execution.execInteractive(device, "show running-config", { parse: false, ensurePrivileged: true, timeout: 15000 });
    const raw = verification.raw.toLowerCase();
    if (!raw.includes("transport input ssh") || !raw.includes("login local")) throw new Error(`SSH access configuration was not fully visible after apply.`);
  }

  async configureAccessListStandard(device: string, aclNumber: number, entries: string[], options?: { save?: boolean }): Promise<void> {
    const commands = entries.map((e) => `access-list ${aclNumber} ${e}`);
    await this.execution.configIos(device, commands, { save: options?.save ?? true });
    const verification = await this.execution.execInteractive(device, "show access-lists", { parse: false, ensurePrivileged: true, timeout: 10000 });
    if (!verification.raw.includes(String(aclNumber))) throw new Error(`ACL ${aclNumber} was not found after configuration.`);
  }

  async getConfidence(device: string, evidence: IosExecutionEvidence, verificationCheck?: string): Promise<IosConfidence> {
    if (evidence.source !== "terminal") return "non_terminal";
    if (!verificationCheck) return "executed";

    try {
      const [checkName, ...rest] = verificationCheck.split(":");
      let verification: any;
      const first = rest[0] ?? "";
      const second = rest[1] ?? "";
      const third = rest[2] ?? "";

      switch (checkName) {
        case "interface-ip":
          if (!first || !second) return "unverified";
          verification = await this.verifier.verifyInterfaceIp(device, first, second);
          break;
        case "access-port":
          if (!first) return "unverified";
          verification = await this.verifier.verifyAccessPort(device, first, second ? parseInt(second) : undefined);
          break;
        case "trunk-port":
          if (!first) return "unverified";
          verification = await this.verifier.verifyTrunkPort(device, first, rest.slice(1).filter(Boolean).map(Number));
          break;
        case "static-route":
          if (!first || !second || !third) return "unverified";
          verification = await this.verifier.verifyStaticRoute(device, first, second, third);
          break;
        case "subinterface":
          if (!first || !second) return "unverified";
          verification = await this.verifier.verifySubinterface(device, first, second);
          break;
        case "dhcp-relay":
          if (!first || !second) return "unverified";
          verification = await this.verifier.verifyDhcpRelay(device, first, second);
          break;
        case "dhcp-pool":
          if (!first) return "unverified";
          verification = await this.verifier.verifyDhcpPool(device, first);
          break;
        case "ospf":
          verification = await this.verifier.verifyOspf(device, first ? parseInt(first) : undefined);
          break;
        case "acl":
          if (!first) return "unverified";
          verification = await this.verifier.verifyAcl(device, parseInt(first));
          break;
        default:
          return "unverified";
      }

      return deriveIosConfidence(evidence, verification);
    } catch {
      return "unverified";
    }
  }

  async resolveCapabilities(device: string): Promise<DeviceCapabilities> {
    const deviceState = await this.inspectDevice(device);
    const model = deviceState.model || "unknown";
    return resolveCapabilities(model);
  }
}
