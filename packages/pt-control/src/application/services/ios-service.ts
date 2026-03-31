// ============================================================================
// IosService - IOS device configuration and execution
// ============================================================================

import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type {
  ParsedOutput,
  ShowIpInterfaceBrief,
  ShowVlan,
  ShowIpRoute,
  ShowRunningConfig,
  DeviceState,
  NetworkTwin,
} from "../../contracts/index.js";
import {
  resolveCapabilities,
  type DeviceCapabilities,
} from "../../domain/ios/capabilities/pt-capability-resolver.js";
import { ValidationEngine, type ValidationResult } from "../../validation/validation-engine.js";
import type { Mutation, MutationKind, NetworkTwinLike } from "../../validation/validation-context.js";
import {
  planConfigureSvi,
  planConfigureAccessPort,
  planConfigureTrunkPort,
  planConfigureSubinterface,
  planConfigureStaticRoute,
  planConfigureDhcpRelay,
} from "../../domain/ios/operations/index.js";
import { resolveCapabilitySet } from "../../domain/ios/capabilities/pt-capability-resolver.js";
import type { CapabilitySet } from "../../domain/ios/capabilities/capability-set.js";
import { VlanId, Ipv4Address, SubnetMask, InterfaceName } from "../../domain/ios/value-objects/index.js";
import { CliSession, type CommandHistoryEntry } from "../../domain/ios/session/cli-session.js";

export class IosService {
  constructor(
    private bridge: FileBridgePort,
    private generateId: () => string,
    private inspectDevice: (device: string) => Promise<DeviceState>,
    private validationEngine?: ValidationEngine,
    private getTwin?: () => NetworkTwin | null,
  ) {}

  // CLI sessions — one per device, created on demand
  private readonly sessions = new Map<string, CliSession>();

  /**
   * Get or create a CliSession for a device.
   * The session maintains IOS mode state across commands.
   */
  getSession(device: string): CliSession {
    if (!this.sessions.has(device)) {
      this.sessions.set(
        device,
        new CliSession(device, this._createBridgeHandler(device), {
          commandTimeout: 30000,
          enableSilentTimeout: true,
        })
      );
    }
    return this.sessions.get(device)!;
  }

  /**
   * Clear the session for a device (useful after a config error)
   */
  clearSession(device: string): void {
    this.sessions.delete(device);
  }

  private _createBridgeHandler(device: string) {
    return {
      enterCommand: async (cmd: string): Promise<[number, string]> => {
        const { value } = await this.bridge.sendCommandAndWait<{
          raw: string;
          session?: { mode: string; paging?: boolean; awaitingConfirm?: boolean };
        }>({
          type: "execInteractive",
          id: this.generateId(),
          device,
          command: cmd,
          options: { timeout: 30000, parse: false, ensurePrivileged: false },
        });
        const raw = value?.raw ?? "";
        // execInteractive returns ok=1 for success in its value structure
        // Infer status from raw presence
        const status = raw.includes("%") || raw.includes("Invalid") ? 1 : 0;
        return [status, raw];
      },
    };
  }

  /**
   * Configure IOS device with multiple commands
   */
  async configIos(
    device: string,
    commands: string[],
    options?: { save?: boolean; mutationKind?: MutationKind }
  ): Promise<void> {
    // Run preflight validation if engine is wired
    const validation = this._maybeValidate(device, options?.mutationKind ?? "generic", "preflight");
    if (validation?.blocked) {
      const msgs = validation.diagnostics.map((d) => `[${d.severity}] ${d.message}`).join("; ");
      throw new Error(`Preflight blocked: ${msgs}`);
    }

    const { value } = await this.bridge.sendCommandAndWait<{ ok: boolean; error?: string }>({
      type: "configIos",
      id: this.generateId(),
      device,
      commands,
      save: options?.save ?? true,
    });

    if (value && typeof value === "object" && value.ok === false) {
      throw new Error(value.error || "IOS configuration failed");
    }

    // Run postflight validation
    this._maybeValidate(device, options?.mutationKind ?? "generic", "postflight");
  }

  private _maybeValidate(
    device: string,
    mutationKind: MutationKind,
    phase: "preflight" | "postflight",
  ): ValidationResult | null {
    if (!this.validationEngine || !this.getTwin) return null;
    const twin = this.getTwin();
    if (!twin) return null;

    const mutation: Mutation = { kind: mutationKind, targetDevice: device, input: {} };
    // NetworkTwin has more fields than NetworkTwinLike but shares the required ones
    const ctx = { twin: twin as unknown as NetworkTwinLike, mutation, phase };

    return phase === "preflight"
      ? this.validationEngine.preflight(ctx)
      : this.validationEngine.postflight(ctx);
  }

  /**
   * Execute an IOS command and get the raw output
   */
  async execIos<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000
  ): Promise<{ raw: string; parsed?: T }> {
    const { event } = await this.bridge.sendCommandAndWait<{ raw: string; parsed?: T }>({
      type: "execIos",
      id: this.generateId(),
      device,
      command,
      parse,
      timeout,
    });

    const value = (event as { value?: { raw: string; parsed?: T } }).value;
    return value ?? { raw: "", parsed: undefined };
  }

  /**
   * Execute an IOS command and parse the output
   */
  async show(device: string, command: string): Promise<ParsedOutput> {
    const { parsed } = await this.execIos<ParsedOutput>(device, command, true);
    return parsed ?? { raw: "" };
  }

  /**
   * Execute an IOS command with full session state management
   */
  async execInteractive(
    device: string,
    command: string,
    options?: {
      timeout?: number;
      parse?: boolean;
      ensurePrivileged?: boolean;
    }
  ): Promise<{ raw: string; parsed?: ParsedOutput; session?: { mode: string } }> {
    const { value } = await this.bridge.sendCommandAndWait<{
      raw: string;
      parsed?: ParsedOutput;
      session?: { mode: string; paging?: boolean; awaitingConfirm?: boolean };
    }>({
      type: "execInteractive",
      id: this.generateId(),
      device,
      command,
      options: {
        timeout: options?.timeout ?? 30000,
        parse: options?.parse ?? true,
        ensurePrivileged: options?.ensurePrivileged ?? false,
      },
    });

    return value ?? { raw: "" };
  }

  /**
   * Get IOS device capabilities based on model
   */
  async resolveCapabilities(device: string): Promise<DeviceCapabilities> {
    const deviceState = await this.inspectDevice(device);
    const model = deviceState.model || "unknown";
    return resolveCapabilities(model);
  }

  // Convenience show command methods
  async showIpInterfaceBrief(device: string): Promise<ShowIpInterfaceBrief> {
    return this.show(device, "show ip interface brief") as Promise<ShowIpInterfaceBrief>;
  }

  async showVlan(device: string): Promise<ShowVlan> {
    return this.show(device, "show vlan brief") as Promise<ShowVlan>;
  }

  async showIpRoute(device: string): Promise<ShowIpRoute> {
    return this.show(device, "show ip route") as Promise<ShowIpRoute>;
  }

  async showRunningConfig(device: string): Promise<ShowRunningConfig> {
    return this.show(device, "show running-config") as Promise<ShowRunningConfig>;
  }

  // ==========================================================================
  // Semantic Configuration Methods (use CommandPlan builders)
  // ==========================================================================

  /**
   * Configure an SVI (Layer 3 interface) on a multilayer switch
   */
  async configureSvi(
    device: string,
    vlan: number,
    ip: string,
    mask: string,
    options?: { description?: string; enableRouting?: boolean; save?: boolean }
  ): Promise<void> {
    const caps = await this._getCapabilitySet(device);
    const plan = planConfigureSvi(caps, {
      vlan: new VlanId(vlan),
      ip: new Ipv4Address(ip),
      mask: new SubnetMask(mask),
      description: options?.description,
      enableRouting: options?.enableRouting,
    });
    if (!plan) throw new Error(`${device} does not support SVIs`);
    await this._executePlan(device, plan, "configureSvi", options?.save);
  }

  /**
   * Configure an access port on a switch
   */
  async configureAccessPort(
    device: string,
    portName: string,
    vlan: number,
    options?: { description?: string; portfast?: boolean; bpduguard?: boolean; save?: boolean }
  ): Promise<void> {
    const caps = await this._getCapabilitySet(device);
    const plan = planConfigureAccessPort(caps, {
      port: new InterfaceName(portName),
      vlan: new VlanId(vlan),
      description: options?.description,
      portfast: options?.portfast,
      bpduguard: options?.bpduguard,
    });
    if (!plan) throw new Error(`${device} does not support access port configuration`);
    await this._executePlan(device, plan, "configureAccessPort", options?.save);
  }

  /**
   * Configure a trunk port on a switch
   */
  async configureTrunkPort(
    device: string,
    portName: string,
    vlans: number[],
    options?: { nativeVlan?: number; description?: string; save?: boolean }
  ): Promise<void> {
    const caps = await this._getCapabilitySet(device);
    const plan = planConfigureTrunkPort(caps, {
      port: new InterfaceName(portName),
      vlans: vlans.map((v) => new VlanId(v)),
      nativeVlan: options?.nativeVlan ? new VlanId(options.nativeVlan) : undefined,
      description: options?.description,
    });
    if (!plan) throw new Error(`${device} does not support trunk configuration`);
    await this._executePlan(device, plan, "configureTrunkPort", options?.save);
  }

  /**
   * Configure a subinterface (router-on-a-stick)
   */
  async configureSubinterface(
    device: string,
    subinterfaceName: string,
    ip: string,
    mask: string,
    vlan: number,
    options?: { description?: string; save?: boolean }
  ): Promise<void> {
    const caps = await this._getCapabilitySet(device);
    const plan = planConfigureSubinterface(caps, {
      parent: new InterfaceName(subinterfaceName),
      vlan: new VlanId(vlan),
      ip: new Ipv4Address(ip),
      mask: new SubnetMask(mask),
      description: options?.description,
    });
    if (!plan) throw new Error(`${device} does not support subinterfaces`);
    await this._executePlan(device, plan, "configureSubinterface", options?.save);
  }

  /**
   * Configure a static route
   */
  async configureStaticRoute(
    device: string,
    network: string,
    mask: string,
    nextHop: string,
    options?: { description?: string; save?: boolean }
  ): Promise<void> {
    const caps = await this._getCapabilitySet(device);
    const plan = planConfigureStaticRoute(caps, {
      network: new Ipv4Address(network),
      mask: new SubnetMask(mask),
      nextHop: new Ipv4Address(nextHop),
      description: options?.description,
    });
    if (!plan) throw new Error(`${device} does not support static routes`);
    await this._executePlan(device, plan, "configureStaticRoute", options?.save);
  }

  /**
   * Configure DHCP relay (ip helper-address) on an interface
   */
  async configureDhcpRelay(
    device: string,
    interfaceName: string,
    helperAddress: string,
    options?: { save?: boolean }
  ): Promise<void> {
    const caps = await this._getCapabilitySet(device);
    const plan = planConfigureDhcpRelay(caps, {
      interface: new InterfaceName(interfaceName),
      helperAddress: new Ipv4Address(helperAddress),
    });
    if (!plan) throw new Error(`${device} does not support DHCP relay`);
    await this._executePlan(device, plan, "configureDhcpRelay", options?.save);
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  private async _getCapabilitySet(device: string): Promise<CapabilitySet> {
    const deviceState = await this.inspectDevice(device);
    const model = deviceState.model || "unknown";
    return resolveCapabilitySet(model);
  }

  private async _executePlan(
    device: string,
    plan: { steps: { command: string }[]; rollback?: { command: string }[] },
    mutationKind: MutationKind,
    save?: boolean
  ): Promise<void> {
    const commands = plan.steps.map((s) => s.command);
    await this.configIos(device, commands, { save: save ?? true, mutationKind });
  }
}
