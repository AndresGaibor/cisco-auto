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
import { IosSetupGuard } from "../../domain/ios/session/setup-guard.js";
import type { RuntimeTerminalPort, TerminalPlan } from "../../ports/runtime-terminal-port.js";

export class IosExecutionService {
  private readonly setupGuard: IosSetupGuard;

  constructor(
    private bridge: FileBridgePort,
    private generateId: () => string,
    private terminalPort: RuntimeTerminalPort,
  ) {
    this.setupGuard = new IosSetupGuard(bridge);
  }

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
        const plan: TerminalPlan = {
          id: this.generateId(),
          device,
          steps: [{ command: cmd, timeout: 30000 }],
        };
        const result = await this.terminalPort.runTerminalPlan(plan, { timeoutMs: 30000 });

        const status = result.ok ? 0 : 1;
        return [status, result.output];
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
    const plan: TerminalPlan = {
      id: this.generateId(),
      device,
      steps: [{ command, timeout }],
    };
    const result = await this.terminalPort.runTerminalPlan(plan, { timeoutMs: timeout });
    if (!result.ok) return { raw: result.output || "", parsed: undefined };
    return { raw: result.output || "", parsed: undefined };
  }

  async execIos<T = ParsedOutput>(device: string, command: string, parse = true, timeout = 5000): Promise<IosExecutionSuccess<T>> {
    const plan: TerminalPlan = {
      id: this.generateId(),
      device,
      steps: [{ command, timeout }],
    };
    const result = await this.terminalPort.runTerminalPlan(plan, { timeoutMs: timeout });

    if (!result.ok) {
      throw new Error(`execIos failed: command '${command}' returned status ${result.status}`);
    }

    const evidence: IosExecutionEvidence = {
      source: "terminal",
      status: result.status,
      mode: result.modeAfter,
      prompt: result.promptAfter,
      completionReason: result.status === 0 ? "command-ended" : undefined,
    };

    return { ok: true, raw: result.output || "", parsed: undefined, evidence };
  }

  async execInteractive(
    device: string,
    command: string,
    options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean }
  ): Promise<IosExecutionSuccess<ParsedOutput>> {
    const timeout = options?.timeout ?? 30000;
    const plan: TerminalPlan = {
      id: this.generateId(),
      device,
      steps: [{ command, timeout }],
    };
    const result = await this.terminalPort.runTerminalPlan(plan, { timeoutMs: timeout });

    if (!result.ok) {
      throw new Error(`execInteractive failed: command '${command}' returned status ${result.status}`);
    }

    const evidence: IosExecutionEvidence = {
      source: "terminal",
      status: result.status,
      mode: result.modeAfter,
      prompt: result.promptAfter,
      completionReason: result.status === 0 ? "command-ended" : undefined,
    };

    return { ok: true, raw: result.output || "", parsed: undefined, evidence };
  }

  async configIos(device: string, commands: string[], options?: { save?: boolean }): Promise<IosConfigApplyResult> {
    const steps = [
      { command: "configure terminal", timeout: 5000 },
      ...commands.map(cmd => ({ command: cmd, timeout: 5000 })),
      { command: "end", timeout: 5000 },
    ];

    if (options?.save) {
      steps.push({ command: "copy running-config startup-config", timeout: 10000 });
    }

    const plan: TerminalPlan = {
      id: this.generateId(),
      device,
      steps,
    };

    const result = await this.terminalPort.runTerminalPlan(plan);

    const evidence: IosExecutionEvidence = {
      source: "terminal",
      status: result.status,
      mode: result.modeAfter,
      completionReason: result.status === 0 ? "command-ended" : undefined,
    };

    if (!result.ok) {
      throw new Error(`IOS configuration failed: command returned status ${result.status}`);
    }

    const results = commands.map((cmd, index) => ({
      index,
      command: cmd,
      ok: true,
      output: "",
    }));

    return { executed: true, device, commands, results, evidence };
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
