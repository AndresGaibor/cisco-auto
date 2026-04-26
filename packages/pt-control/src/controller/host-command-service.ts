/**
 * HostCommandService - Servicio para comandos de host (PC/Server-PT).
 *
 * Maneja la ejecución de comandos como ping, ipconfig, arp, tracert, nslookup,
 * netstat, route, telnet, ssh en dispositivos host de la topología.
 *
 * @example
 * ```typescript
 * const hostService = new HostCommandService(terminalPort, deviceService);
 * const ping = await hostService.sendPing("PC1", "192.168.1.1");
 * const ipconfig = await hostService.getHostIpconfig("PC1");
 * ```
 */

import type { DeviceState } from "../contracts/index.js";
import type { RuntimeTerminalPort } from "../ports/runtime-terminal-port.js";
import type { TerminalEvidenceVerdict } from "../pt/terminal/terminal-evidence-verifier.js";
import { createHostCommandPlan } from "../pt/terminal/standard-terminal-plans.js";
import { parseTerminalOutput } from "../pt/terminal/terminal-output-parsers.js";
import { verifyTerminalEvidence } from "../pt/terminal/terminal-evidence-verifier.js";

export interface HostCommandResult {
  success: boolean;
  raw: string;
  verdict: TerminalEvidenceVerdict;
  parsed: unknown;
}

export interface PingStats {
  sent: number;
  received: number;
  lost: number;
  lossPercent: number;
}

export interface HostHistoryEntry {
  command: string;
  output: string;
  timestamp?: number;
}

export interface HostHistoryResult {
  entries: HostHistoryEntry[];
  count: number;
  raw: string;
  methods?: string[];
}

export interface PingResult {
  success: boolean;
  raw: string;
  stats?: PingStats;
}

export class HostCommandService {
  constructor(
    private readonly terminalPort: RuntimeTerminalPort,
    private readonly deviceService: {
      inspect(name: string, includeXml?: boolean): Promise<DeviceState>;
    },
  ) {}

  private async runTerminalPlan(
    plan: import("../ports/runtime-terminal-port.js").TerminalPlan,
    options?: { timeoutMs?: number },
  ): Promise<import("../ports/runtime-terminal-port.js").TerminalPortResult> {
    return this.terminalPort.runTerminalPlan(plan, options);
  }

  private async execHost(
    device: string,
    command: string,
    capabilityId: string,
    options?: { timeoutMs?: number },
  ): Promise<HostCommandResult> {
    const timeoutMs = options?.timeoutMs ?? 30000;

    const execute = async () => {
      const plan = createHostCommandPlan(device, command, { timeout: timeoutMs });
      const result = await this.runTerminalPlan(plan, { timeoutMs });
      const raw = result.output;
      const parsed = parseTerminalOutput(capabilityId, raw);
      const verdict = verifyTerminalEvidence(capabilityId, raw, parsed, result.status);
      return { raw, parsed, verdict, result };
    };

    let { raw, parsed, verdict } = await execute();

    if (!verdict.ok && raw.trim().length === 0) {
      try {
        await this.runTerminalPlan(createHostCommandPlan(device, "", { timeout: 2000 }), { timeoutMs: 2500 });
      } catch (_e) {
        // Ignore errors in recovery attempt
      }
      ({ raw, parsed, verdict } = await execute());
    }

    return {
      success: verdict.ok,
      raw: raw || (verdict.reason ?? "Sin salida"),
      verdict,
      parsed,
    };
  }

  async sendPing(device: string, target: string, timeoutMs = 30000): Promise<PingResult> {
    const result = await this.execHost(device, `ping ${target}`, "host.ping", { timeoutMs });

    const raw = result.raw;
    const statsIndex = raw.lastIndexOf("Ping statistics");
    const relevantRaw = statsIndex !== -1 ? raw.slice(statsIndex) : raw;

    return {
      success: result.success,
      raw: relevantRaw,
      stats: result.parsed?.facts
        ? {
            sent: Number(result.parsed.facts.sent ?? 0),
            received: Number(result.parsed.facts.received ?? 0),
            lost: Number(result.parsed.facts.lost ?? 0),
            lossPercent: Number(result.parsed.facts.lossPercent ?? 100),
          }
        : undefined,
    };
  }

  async getHostIpconfig(device: string, timeoutMs = 15000): Promise<HostCommandResult> {
    return this.execHost(device, "ipconfig /all", "host.ipconfig", { timeoutMs });
  }

  async getHostArp(device: string, timeoutMs = 15000): Promise<HostCommandResult> {
    return this.execHost(device, "arp -a", "host.arp", { timeoutMs });
  }

  async getHostTracert(device: string, target: string, timeoutMs = 60000): Promise<HostCommandResult> {
    return this.execHost(device, `tracert ${target}`, "host.tracert", { timeoutMs });
  }

  async getHostNslookup(device: string, target: string, timeoutMs = 20000): Promise<HostCommandResult> {
    return this.execHost(device, `nslookup ${target}`, "host.nslookup", { timeoutMs });
  }

  async getHostNetstat(device: string, timeoutMs = 15000): Promise<HostCommandResult> {
    return this.execHost(device, "netstat", "host.netstat", { timeoutMs });
  }

  async getHostRoute(device: string, timeoutMs = 15000): Promise<HostCommandResult> {
    return this.execHost(device, "route print", "host.route", { timeoutMs });
  }

  async getHostTelnet(device: string, target: string, timeoutMs = 20000): Promise<HostCommandResult> {
    return this.execHost(device, `telnet ${target}`, "host.telnet", { timeoutMs });
  }

  async getHostSsh(
    device: string,
    user: string,
    target: string,
    timeoutMs = 20000,
  ): Promise<HostCommandResult> {
    return this.execHost(device, `ssh -l ${user} ${target}`, "host.ssh", { timeoutMs });
  }

  async inspectHost(device: string): Promise<DeviceState> {
    const deviceState = await this.deviceService.inspect(device);
    if (deviceState.type !== "pc" && deviceState.type !== "server") {
      throw new Error(
        `Dispositivo '${device}' no es un host (PC/Server-PT). Tipo: ${deviceState.type}`,
      );
    }
    return deviceState;
  }

  async getHostHistory(device: string): Promise<HostHistoryResult> {
    const result = await this.terminalPort.runPrimitive("readTerminal", { device });
    const data = (result as any).value || {};
    const raw = data.raw || "";
    const methods = data.methods || [];
    const historyFromSession = data.history || [];

    if (historyFromSession.length > 0) {
      return {
        entries: historyFromSession,
        count: historyFromSession.length,
        raw,
        methods,
      };
    }

    const parsed = parseTerminalOutput("host.history", raw);

    return {
      entries: (parsed?.facts.entries as HostHistoryEntry[]) ?? [],
      count: Number(parsed?.facts.count ?? 0),
      raw,
      methods,
    };
  }
}
