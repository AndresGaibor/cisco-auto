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
import { resolveCapabilities, type DeviceCapabilities } from "../../domain/ios/capabilities/pt-capability-resolver.js";
import {
  planConfigureSvi,
  planConfigureAccessPort,
  planConfigureTrunkPort,
  planConfigureSubinterface,
  planConfigureStaticRoute,
  planConfigureDhcpRelay,
  getParser,
  parseShowRunningConfig,
} from "@cisco-auto/ios-domain";
import { resolveCapabilitySet } from "@cisco-auto/ios-domain";
import type { CapabilitySet } from "@cisco-auto/ios-domain";
import { VlanId, Ipv4Address, SubnetMask, InterfaceName } from "@cisco-auto/ios-domain";
import { CliSession, type CommandHistoryEntry } from "@cisco-auto/ios-domain";
import type { IosInteractiveResult } from "../../contracts/ios-interactive-result.js";
import { classifyIosError, isHardFailure } from "../../domain/ios/ios-error-classifier.js";

// Verification service
import { IosVerificationService } from "./ios-verification-service.js";
import type { VerificationResult } from "../../contracts/verification-result.js";

export class IosService {
  constructor(
    private bridge: FileBridgePort,
    private generateId: () => string,
    private inspectDevice: (device: string) => Promise<DeviceState>,
  ) {}

  // CLI sessions — one per device, created on demand
  private readonly sessions = new Map<string, CliSession>();

  // Lazy verifier instance
  private _verifier?: IosVerificationService;
  private get verifier(): IosVerificationService {
    if (!this._verifier) this._verifier = new IosVerificationService(this.execIos.bind(this));
    return this._verifier;
  }

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
        const result = await this.bridge.sendCommandAndWait<any>("execInteractive", {
          id: this.generateId(),
          device,
          command: cmd,
          options: { timeout: 30000, parse: false, ensurePrivileged: false },
        });

        const raw = result.value?.raw ?? "";

        // Fase 6+: prefer diagnostics when available
        const diagnostics = result.value?.diagnostics;
        let status = 0;
        if (diagnostics) {
          if (diagnostics.source !== 'terminal') {
            status = 1; // synthetic or unreliable
          } else if (diagnostics.completionReason !== 'command-ended') {
            status = 1; // didn't complete normally
          }
        } else {
          status = raw.includes("%") || raw.includes("Invalid") ? 1 : 0;
        }

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
    options?: { save?: boolean }
  ): Promise<void> {
    const result = await this.bridge.sendCommandAndWait<{
      ok: boolean;
      error?: string;
      code?: string;
      deferred?: boolean;
      ticket?: string;
    }>(
      "configIos",
      {
        id: this.generateId(),
        device,
        commands,
        save: options?.save ?? true,
      },
    );

    const value = result.value;

    if (value && typeof value === "object") {
      if (value.deferred === true) return;

      if (value.ok === false) {
        const errorMsg = value.error || "IOS configuration failed";
        const code = value.code;
        if (errorMsg.includes("Cannot read property")) {
          throw new Error(
            `IOS simulator error on device '${device}'. The PT IOS simulator may not be available or the device may not support IOS commands in the current PT session.\n` +
            `Details: ${errorMsg}\n` +
            `Suggestion: Verify that Packet Tracer is running with the runtime scripts loaded, and that the device model supports IOS.`
          );
        }
        if (code) {
          throw new Error(`IOS configuration failed (${code}): ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const source = (value as { source?: string }).source;
      if (source === "synthetic") {
        throw new Error(
          `IOS configuration returned synthetic result for device '${device}'. Terminal execution is not available.`
        );
      }
    }
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
    const result = await this.bridge.sendCommandAndWait<{
      raw: string;
      parsed?: T;
      ok: boolean;
      error?: string;
      code?: string;
      source?: string;
      deferred?: boolean;
    }>(
      "execIos",
      {
        id: this.generateId(),
        device,
        command,
        parse,
        timeout,
      },
    );

    const value = result.value;

    if (!value) return { raw: "", parsed: undefined };

    if (value.ok === false) {
      const errorMsg = value.error || "IOS execution failed";
      const code = value.code;
      if (code) throw new Error(`IOS execution failed (${code}): ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const source = value.source;
    if (source === "synthetic") throw new Error(`IOS execution returned synthetic result for device '${device}'. Terminal execution is not available.`);

    return { raw: value.raw || "", parsed: value.parsed };
  }

  /**
   * Execute an IOS command and parse the output
   */
  async show(device: string, command: string): Promise<ParsedOutput> {
    const result = await this.execIos<ParsedOutput>(device, command, false);
    const raw = result.raw || "";
    const parser = getParser(command);

    if (parser) {
      try {
        return parser(raw);
      } catch {
        // Si el parser falla, devolvemos la salida cruda.
      }
    }

    return { raw };
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
    const result = await this.bridge.sendCommandAndWait<{
      raw: string;
      parsed?: ParsedOutput;
      session?: { mode: string; paging?: boolean; awaitingConfirm?: boolean };
      ok: boolean;
      error?: string;
      code?: string;
      source?: string;
      deferred?: boolean;
    }>(
      "execInteractive",
      {
        id: this.generateId(),
        device,
        command,
        options: {
          timeout: options?.timeout ?? 30000,
          parse: options?.parse ?? true,
          ensurePrivileged: options?.ensurePrivileged ?? false,
        },
      },
    );

    const value = result.value;
    if (!value) return { raw: "" };
    if (value.ok === false) {
      const errorMsg = value.error || "IOS execution failed";
      const code = value.code;
      if (code) throw new Error(`IOS execution failed (${code}): ${errorMsg}`);
      throw new Error(errorMsg);
    }
    const source = value.source;
    if (source === "synthetic") throw new Error(`IOS execution returned synthetic result for device '${device}'. Terminal execution is not available.`);
    return value;
  }

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
    const result = await this.execInteractive(device, "show running-config", {
      parse: false,
      ensurePrivileged: true,
      timeout: 15000,
    });

    const raw = result.raw || "";
    const marker = raw.lastIndexOf("show running-config");
    const normalizedRaw = marker >= 0 ? raw.slice(marker) : raw;

    return parseShowRunningConfig(normalizedRaw);
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
    await this._executePlan(device, plan, options?.save);

    // Best-effort verification and attach event for traceability
    try {
      const v = await this.verifier.verifyInterfaceIp(device, `Vlan${vlan}`, ip);
      try { (this.bridge as any).appendEvent && (this.bridge as any).appendEvent({ type: 'verification', id: this.generateId(), device, verification: v }); } catch (e) {}
    } catch {}
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
    await this._executePlan(device, plan, options?.save);

    try {
      const v = await this.verifier.verifyAccessPort(device, portName, vlan);
      try { (this.bridge as any).appendEvent && (this.bridge as any).appendEvent({ type: 'verification', id: this.generateId(), device, verification: v }); } catch (e) {}
    } catch {}
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
    await this._executePlan(device, plan, options?.save);

    try {
      const v = await this.verifier.verifyTrunkPort(device, portName, vlans);
      try { (this.bridge as any).appendEvent && (this.bridge as any).appendEvent({ type: 'verification', id: this.generateId(), device, verification: v }); } catch (e) {}
    } catch {}
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
    await this._executePlan(device, plan, options?.save);

    try {
      const v = await this.verifier.verifySubinterface(device, subinterfaceName, ip);
      try { (this.bridge as any).appendEvent && (this.bridge as any).appendEvent({ type: 'verification', id: this.generateId(), device, verification: v }); } catch (e) {}
    } catch {}
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
    await this._executePlan(device, plan, options?.save);

    try {
      const v = await this.verifier.verifyStaticRoute(device, network, mask, nextHop);
      try { (this.bridge as any).appendEvent && (this.bridge as any).appendEvent({ type: 'verification', id: this.generateId(), device, verification: v }); } catch (e) {}
    } catch {}
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
    await this._executePlan(device, plan, options?.save);

    try {
      const v = await this.verifier.verifyDhcpRelay(device, interfaceName, helperAddress);
      try { (this.bridge as any).appendEvent && (this.bridge as any).appendEvent({ type: 'verification', id: this.generateId(), device, verification: v }); } catch (e) {}
    } catch {}
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
    save?: boolean
  ): Promise<void> {
    const commands = plan.steps.map((s) => s.command);
    await this.configIos(device, commands, { save: save ?? true });
  }
}
