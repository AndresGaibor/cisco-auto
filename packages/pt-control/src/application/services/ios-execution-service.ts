import type { FileBridgePort } from "../ports/file-bridge.port.js";
import type {
  ParsedOutput,
  ShowIpInterfaceBrief,
  ShowVlan,
  ShowIpRoute,
  ShowRunningConfig,
  ShowCdpNeighbors,
} from "../../contracts/index.js";
import type {
  IosExecutionEvidence,
  IosExecutionSuccess,
  IosConfigApplyResult,
} from "../../contracts/ios-execution-evidence.js";
import { getParser, parseShowRunningConfig, parseShowCdpNeighbors, CliSession } from "@cisco-auto/ios-domain";

export class IosExecutionService {
  constructor(
    private bridge: FileBridgePort,
    private generateId: () => string,
  ) {}

  private readonly sessions = new Map<string, CliSession>();

  getSession(device: string): CliSession {
    if (!this.sessions.has(device)) {
      this.sessions.set(
        device,
        new CliSession(device, this.createBridgeHandler(device), {
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

  private createBridgeHandler(device: string) {
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
          if (diagnostics.source !== "terminal") {
            status = 1;
          } else if (diagnostics.completionReason !== "command-ended") {
            status = 1;
          }
        } else {
          status = raw.includes("%") || raw.includes("Invalid") ? 1 : 0;
        }

        return [status, raw];
      },
    };
  }

  private normalizeEvidence(value: any): IosExecutionEvidence {
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

  private throwNormalizedIosError(action: string, device: string, value: any): never {
    const evidence = this.normalizeEvidence(value);

    if (evidence.source === "synthetic") {
      throw new Error(`${action} returned synthetic result for device '${device}'. Real terminal execution is not available.`);
    }

    const code = value?.code ? ` (${value.code})` : "";
    const message = value?.error || `${action} failed`;
    throw new Error(`${action} failed${code}: ${message}`);
  }

  async execIosRaw(
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

  async execIos<T = ParsedOutput>(device: string, command: string, parse = true, timeout = 5000): Promise<IosExecutionSuccess<T>> {
    const result = await this.bridge.sendCommandAndWait<any>("execIos", {
      id: this.generateId(),
      device,
      command,
      parse,
      timeout,
    });

    const value = result.value;
    const evidence = this.normalizeEvidence(value);

    if (!value || value.ok === false) {
      this.throwNormalizedIosError("execIos", device, value);
    }

    if (evidence.source !== "terminal") {
      this.throwNormalizedIosError("execIos", device, {
        ...value,
        error: `Execution did not come from a real terminal (source=${evidence.source})`,
        code: "NON_TERMINAL_SOURCE",
      });
    }

    return { ok: true, raw: value.raw || "", parsed: value.parsed as T | undefined, evidence };
  }

  async execInteractive(
    device: string,
    command: string,
    options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean }
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
    const evidence = this.normalizeEvidence(value);

    if (value?.raw) {
      const setupPatterns = [
        /initial configuration dialog/i,
        /Would you like to enter the initial configuration dialog\?/i,
        /Would you like to see the current interface summary\?/i,
        /Do you want to configure Vlan1 interface\?/i,
        /Enter enable secret:/i,
        /Enter enable password:/i,
        /Enter virtual terminal password:/i,
        /Configuring global parameters:/i,
        /Configuring interface parameters:/i,
        /Configure SNMP Network Management\?/i,
      ];

      for (const pattern of setupPatterns) {
        if (pattern.test(value.raw)) {
          console.warn(`[ios-service] WARNING: Device '${device}' está en modo setup interactivo. El comando puede no ejecutarse correctamente. Sal del setup mode y guarda con 'write memory'.`);
          break;
        }
      }
    }

    if (!value || value.ok === false) {
      this.throwNormalizedIosError("execInteractive", device, value);
    }

    if (evidence.source !== "terminal") {
      this.throwNormalizedIosError("execInteractive", device, {
        ...value,
        error: "Interactive execution did not come from a real terminal",
        code: "NON_TERMINAL_SOURCE",
      });
    }

    return { ok: true, raw: value.raw || "", parsed: value.parsed, evidence };
  }

  async configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<IosConfigApplyResult> {
    const result = await this.bridge.sendCommandAndWait<any>("configIos", {
      id: this.generateId(),
      device,
      commands,
      save: options?.save ?? true,
    });

    const value = result.value;

    if (value && typeof value === "object") {
      if (value.deferred === true) {
        return { executed: true, device, commands, evidence: { source: "unknown" as const } };
      }

      const evidence = this.normalizeEvidence(value);

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
        throw new Error(`IOS configuration returned synthetic result for device '${device}'. Terminal execution is not available.`);
      }
    }

    const evidence = value ? this.normalizeEvidence(value) : { source: "unknown" as const };
    return { executed: true, device, commands, evidence };
  }

  async showParsed<T = ParsedOutput>(device: string, command: string, options?: { ensurePrivileged?: boolean; timeout?: number }): Promise<IosExecutionSuccess<T>> {
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
        // El parser puede fallar; devolvemos el raw.
      }
    }

    return { ok: true, raw: result.raw, parsed, evidence: result.evidence };
  }

  async show(device: string, command: string): Promise<ParsedOutput> {
    const result = await this.showParsed<ParsedOutput>(device, command);
    return result.parsed ?? { raw: result.raw };
  }

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

  async showCdpNeighbors(device: string): Promise<ShowCdpNeighbors> {
    const result = await this.showParsed<ShowCdpNeighbors>(device, "show cdp neighbors");
    return result.parsed ?? parseShowCdpNeighbors(result.raw);
  }
}
