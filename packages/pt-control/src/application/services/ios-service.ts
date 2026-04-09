// ============================================================================
// IosService — Fase 4: capa de orquestación semántica de IOS
// ============================================================================

import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type {
  ParsedOutput,
  ShowIpInterfaceBrief,
  ShowVlan,
  ShowIpRoute,
  ShowRunningConfig,
  DeviceState,
} from "../../contracts/index.js";
import type {
  IosExecutionEvidence,
  IosExecutionSuccess,
  IosExecutionFailure,
  IosExecutionResult,
  IosConfigApplyResult,
  IosConfidence,
} from "../../contracts/ios-execution-evidence.js";
import { deriveIosConfidence } from "../../contracts/ios-execution-evidence.js";
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
import { classifyIosError, isHardFailure } from "../../domain/ios/ios-error-classifier.js";
import { IosVerificationService } from "./ios-verification-service.js";
import type { VerificationResult } from "../../contracts/verification-result.js";

export class IosService {
  constructor(
    private bridge: FileBridgePort,
    private generateId: () => string,
    private inspectDevice: (device: string) => Promise<DeviceState>,
  ) {}

  private readonly sessions = new Map<string, CliSession>();
  private _verifier?: IosVerificationService;
  private get verifier(): IosVerificationService {
    if (!this._verifier) this._verifier = new IosVerificationService(this.execIosRaw.bind(this));
    return this._verifier;
  }

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
        const diagnostics = result.value?.diagnostics;
        let status = 0;
        if (diagnostics) {
          if (diagnostics.source !== 'terminal') {
            status = 1;
          } else if (diagnostics.completionReason !== 'command-ended') {
            status = 1;
          }
        } else {
          status = raw.includes("%") || raw.includes("Invalid") ? 1 : 0;
        }
        return [status, raw];
      },
    };
  }

  // ==========================================================================
  // Fase 4: normalización de evidencia
  // ==========================================================================

  private _normalizeEvidence(value: any): IosExecutionEvidence {
    return {
      source: value?.diagnostics?.source ?? value?.source ?? "unknown",
      status: typeof value?.diagnostics?.commandStatus === "number"
        ? value.diagnostics.commandStatus
        : typeof value?.status === "number"
          ? value.status
          : undefined,
      mode: value?.session?.mode,
      prompt: value?.session?.prompt,
      paging: value?.session?.paging,
      awaitingConfirm: value?.session?.awaitingConfirm,
      autoDismissedInitialDialog: value?.session?.autoDismissedInitialDialog,
      completionReason: value?.diagnostics?.completionReason,
    };
  }

  private _throwNormalizedIosError(
    action: "execIos" | "execInteractive" | "configIos",
    device: string,
    value: any
  ): never {
    const evidence = this._normalizeEvidence(value);

    if (evidence.source === "synthetic") {
      throw new Error(
        `${action} returned synthetic result for device '${device}'. Real terminal execution is not available.`
      );
    }

    const code = value?.code ? ` (${value.code})` : "";
    const message = value?.error || `${action} failed`;
    throw new Error(`${action} failed${code}: ${message}`);
  }

  // ==========================================================================
  // execIosRaw — versión interna sin lanzar errores (para verificación)
  // ==========================================================================

  private async execIosRaw(
    device: string,
    command: string,
    parse = true,
    timeout = 5000
  ): Promise<{ raw: string; parsed?: any }> {
    const result = await this.bridge.sendCommandAndWait<any>("execIos", {
      id: this.generateId(),
      device,
      command,
      parse,
      timeout,
    });
    const value = result.value;
    if (!value) return { raw: "", parsed: undefined };
    return { raw: value.raw || "", parsed: value.parsed };
  }

  // ==========================================================================
  // execIos — ejecución con evidencia y chequeo de fuente
  // ==========================================================================

  async execIos<T = ParsedOutput>(
    device: string,
    command: string,
    parse = true,
    timeout = 5000
  ): Promise<IosExecutionSuccess<T>> {
    const result = await this.bridge.sendCommandAndWait<any>("execIos", {
      id: this.generateId(),
      device,
      command,
      parse,
      timeout,
    });

    const value = result.value;
    const evidence = this._normalizeEvidence(value);

    if (!value || value.ok === false) {
      this._throwNormalizedIosError("execIos", device, value);
    }

    if (evidence.source !== "terminal") {
      this._throwNormalizedIosError("execIos", device, {
        ...value,
        error: `Execution did not come from a real terminal (source=${evidence.source})`,
        code: "NON_TERMINAL_SOURCE",
      });
    }

    return {
      ok: true,
      raw: value.raw || "",
      parsed: value.parsed as T | undefined,
      evidence,
    };
  }

  // ==========================================================================
  // execInteractive — sesión interactiva con evidencia
  // ==========================================================================

  async execInteractive(
    device: string,
    command: string,
    options?: {
      timeout?: number;
      parse?: boolean;
      ensurePrivileged?: boolean;
    }
  ): Promise<IosExecutionSuccess<ParsedOutput>> {
    const result = await this.bridge.sendCommandAndWait<any>("execInteractive", {
      id: this.generateId(),
      device,
      command,
      options: {
        timeout: options?.timeout ?? 30000,
        parse: options?.parse ?? true,
        ensurePrivileged: options?.ensurePrivileged ?? false,
      },
    });

    const value = result.value;
    const evidence = this._normalizeEvidence(value);

    if (!value || value.ok === false) {
      this._throwNormalizedIosError("execInteractive", device, value);
    }

    if (evidence.source !== "terminal") {
      this._throwNormalizedIosError("execInteractive", device, {
        ...value,
        error: `Interactive execution did not come from a real terminal`,
        code: "NON_TERMINAL_SOURCE",
      });
    }

    return {
      ok: true,
      raw: value.raw || "",
      parsed: value.parsed,
      evidence,
    };
  }

  // ==========================================================================
  // configIos — devuelve IosConfigApplyResult (aplicar ≠ verificar)
  // ==========================================================================

  async configIos(
    device: string,
    commands: string[],
    options?: { save?: boolean }
  ): Promise<IosConfigApplyResult> {
    const result = await this.bridge.sendCommandAndWait<any>("configIos", {
      id: this.generateId(),
      device,
      commands,
      save: options?.save ?? true,
    });

    const value = result.value;

    if (value && typeof value === "object") {
      if (value.deferred === true) {
        return {
          executed: true,
          device,
          commands,
          evidence: { source: "unknown" as const },
        };
      }

      const evidence = this._normalizeEvidence(value);

      if (value.ok === false) {
        const errorMsg = value.error || "IOS configuration failed";
        if (errorMsg.includes("Cannot read property")) {
          throw new Error(
            `IOS simulator error on device '${device}'. The PT IOS simulator may not be available or the device may not support IOS commands in the current PT session.\n` +
            `Details: ${errorMsg}\n` +
            `Suggestion: Verify that Packet Tracer is running with the runtime scripts loaded, and that the device model supports IOS.`
          );
        }
        const code = value.code;
        if (code) {
          throw new Error(`IOS configuration failed (${code}): ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      if (evidence.source === "synthetic") {
        throw new Error(
          `IOS configuration returned synthetic result for device '${device}'. Terminal execution is not available.`
        );
      }
    }

    const evidence = value ? this._normalizeEvidence(value) : { source: "unknown" as const };
    return {
      executed: true,
      device,
      commands,
      evidence,
    };
  }

  // ==========================================================================
  // show / showParsed — pipeline coherente de parse
  // ==========================================================================

  async showParsed<T = ParsedOutput>(
    device: string,
    command: string,
    options?: {
      ensurePrivileged?: boolean;
      timeout?: number;
    }
  ): Promise<IosExecutionSuccess<T>> {
    const result = await this.execInteractive(device, command, {
      parse: false,
      ensurePrivileged: options?.ensurePrivileged ?? true,
      timeout: options?.timeout ?? 10000,
    });

    const parser = getParser(command);
    let parsed: T | undefined;

    if (parser) {
      try {
        parsed = parser(result.raw) as T;
      } catch {
        // Parser falló — devolvemos raw sin parsed
      }
    }

    return {
      ok: true,
      raw: result.raw,
      parsed,
      evidence: result.evidence,
    };
  }

  async show(device: string, command: string): Promise<ParsedOutput> {
    const result = await this.showParsed<ParsedOutput>(device, command);
    return result.parsed ?? { raw: result.raw };
  }

  // ==========================================================================
  // Convenience show methods — sobre showParsed
  // ==========================================================================

  async showIpInterfaceBrief(device: string): Promise<ShowIpInterfaceBrief> {
    const result = await this.showParsed<ShowIpInterfaceBrief>(device, "show ip interface brief");
    return result.parsed as ShowIpInterfaceBrief;
  }

  async showVlan(device: string): Promise<ShowVlan> {
    const result = await this.showParsed<ShowVlan>(device, "show vlan brief");
    return result.parsed as ShowVlan;
  }

  async showIpRoute(device: string): Promise<ShowIpRoute> {
    const result = await this.showParsed<ShowIpRoute>(device, "show ip route");
    return result.parsed as ShowIpRoute;
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
  // Operaciones semánticas IOS de primer nivel
  // ==========================================================================

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

    try {
      const v = await this.verifier.verifyInterfaceIp(device, `Vlan${vlan}`, ip);
      try { (this.bridge as any).appendEvent && (this.bridge as any).appendEvent({ type: 'verification', id: this.generateId(), device, verification: v }); } catch (e) {}
    } catch {}
  }

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

  // --- Nuevos métodos semánticos (Fase 4) ---

  async configureDhcpPool(
    device: string,
    poolName: string,
    network: string,
    mask: string,
    defaultRouter: string,
    dnsServer?: string,
    options?: { save?: boolean }
  ): Promise<void> {
    const commands = [
      `ip dhcp pool ${poolName}`,
      `network ${network} ${mask}`,
      `default-router ${defaultRouter}`,
    ];

    if (dnsServer) {
      commands.push(`dns-server ${dnsServer}`);
    }

    await this.configIos(device, commands, { save: options?.save ?? true });

    const verification = await this.execInteractive(device, "show running-config", {
      parse: false,
      ensurePrivileged: true,
      timeout: 15000,
    });

    if (!verification.raw.includes(`ip dhcp pool ${poolName}`)) {
      throw new Error(`DHCP pool '${poolName}' was not found after configuration.`);
    }
  }

  async configureOspfNetwork(
    device: string,
    processId: number,
    network: string,
    wildcard: string,
    area: number,
    options?: { save?: boolean }
  ): Promise<void> {
    await this.configIos(device, [
      `router ospf ${processId}`,
      `network ${network} ${wildcard} area ${area}`,
    ], { save: options?.save ?? true });

    const verification = await this.execInteractive(device, "show ip protocols", {
      parse: false,
      ensurePrivileged: true,
      timeout: 10000,
    });

    if (!verification.raw.toLowerCase().includes("ospf")) {
      throw new Error(`OSPF process ${processId} was not visible after configuration.`);
    }
  }

  async configureSshAccess(
    device: string,
    domainName: string,
    username: string,
    password: string,
    options?: { save?: boolean }
  ): Promise<void> {
    await this.configIos(device, [
      `ip domain-name ${domainName}`,
      `username ${username} secret ${password}`,
      `crypto key generate rsa`,
      `line vty 0 4`,
      `transport input ssh`,
      `login local`,
    ], { save: options?.save ?? true });

    const verification = await this.execInteractive(device, "show running-config", {
      parse: false,
      ensurePrivileged: true,
      timeout: 15000,
    });

    const raw = verification.raw.toLowerCase();
    if (!raw.includes("transport input ssh") || !raw.includes("login local")) {
      throw new Error(`SSH access configuration was not fully visible after apply.`);
    }
  }

  async configureAccessListStandard(
    device: string,
    aclNumber: number,
    entries: string[],
    options?: { save?: boolean }
  ): Promise<void> {
    const commands = entries.map(e => `access-list ${aclNumber} ${e}`);
    await this.configIos(device, commands, { save: options?.save ?? true });

    const verification = await this.execInteractive(device, "show access-lists", {
      parse: false,
      ensurePrivileged: true,
      timeout: 10000,
    });

    if (!verification.raw.includes(String(aclNumber))) {
      throw new Error(`ACL ${aclNumber} was not found after configuration.`);
    }
  }

  // ==========================================================================
  // Helpers de confianza y capacidades
  // ==========================================================================

  async getConfidence(
    device: string,
    evidence: IosExecutionEvidence,
    verificationCheck?: string
  ): Promise<IosConfidence> {
    if (evidence.source !== "terminal") return "non_terminal";

    if (!verificationCheck) return "executed";

    try {
      const [checkName, ...rest] = verificationCheck.split(":");
      let verification: VerificationResult | undefined;
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

  // ==========================================================================
  // Privados
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
