import {
  getParser,
  parseShowRunningConfig,
  parseShowCdpNeighbors,
  CliSession,
} from "@cisco-auto/ios-domain";
import type {
  ParsedOutput,
  ShowIpInterfaceBrief,
  ShowVlan,
  ShowIpRoute,
  ShowRunningConfig,
  ShowCdpNeighbors,
} from "@cisco-auto/types";
import type {
  IosExecutionEvidence,
  IosExecutionSuccess,
  IosConfigApplyResult,
} from "../../contracts/ios-execution-evidence";
import type {
  RuntimeTerminalPort,
  TerminalPlan,
  TerminalPlanTimeouts,
  TerminalPlanPolicies,
  TerminalMode,
} from "../../ports/runtime-terminal-port.js";
import { classifyIosCommand } from "./terminal-command-classifier.js";

/**
 * Servicio de ejecución de comandos IOS.
 *
 * Maneja sesiones CLI, sanitización de output, ejecución de planes
 * terminales con políticas de retry/confirm/pager, y generación
 * de evidence para verificación.
 *
 * @param generateId - Generador de IDs único para tracking de sesiones
 * @param terminalPort - Puerto para ejecutar planes terminal en PT
 * @param readRunningConfig - Función opcional para leer configuración directamente desde PT
 */
export class IosExecutionService {
  constructor(
    private readonly generateId: () => string,
    private readonly terminalPort: RuntimeTerminalPort,
    private readonly readRunningConfig?: (device: string) => Promise<string>,
  ) {}

  private readonly sessions = new Map<string, CliSession>();

  getSession(device: string): CliSession {
    if (!this.sessions.has(device)) {
      this.sessions.set(
        device,
        new CliSession(device, this.createTerminalBridgeHandler(device), {
          commandTimeout: 30000,
          enableSilentTimeout: true,
        }),
      );
    }
    return this.sessions.get(device)!;
  }

  clearSession(device: string): void {
    this.sessions.delete(device);
  }

  private createTerminalBridgeHandler(device: string) {
    return {
      enterCommand: async (cmd: string): Promise<[number, string]> => {
        const plan: TerminalPlan = {
          id: this.generateId(),
          device,
          steps: [{ command: cmd, timeout: 30000 }],
        };

        const result = await this.terminalPort.runTerminalPlan(plan, { timeoutMs: 30000 });
        
        // IMPORTANTE: Sanitizar la salida antes de devolverla a CliSession.
        // CommandExecutor ya manejó la paginación, wizards, etc.
        // Si le pasamos la salida cruda con "--More--", CliSession intentará manejarla de nuevo.
        const rawOutput = result.output;
        const sanitized = this.sanitizeForCliSession(cmd, rawOutput);
        
        return [result.ok ? 0 : 1, sanitized];
      },
    };
  }

  private sanitizeForCliSession(command: string, output: string): string {
    const lines = output.split(/\r?\n/);
    const cleaned: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Eliminar el eco del comando
      if (line === command.trim()) continue;
      
      // Eliminar indicadores de paginación (ya procesados por CommandExecutor)
      if (/^--More--$/i.test(line) || /^More$/i.test(line)) continue;
      
      // Eliminar indicadores de wizards ya resueltos
      if (/Would you like to enter the initial configuration dialog/i.test(line)) continue;
      if (/% Please answer 'yes' or 'no'\./i.test(line)) continue;
      
      // Eliminar ruido de DNS hangups ya rotos por el executor
      if (/Translating\s+["']?.+["']?\.\.\./i.test(line)) continue;
      if (/Unknown host or address/i.test(line)) continue;
      
      cleaned.push(rawLine);
    }

    return cleaned.join("\n").trim();
  }

  private buildEvidence(result: {
    status: number;
    modeAfter: string;
    promptAfter: string;
    warnings: string[];
    raw?: string;
    output?: string;
    events?: any[];
    parsed?: any;
  }): IosExecutionEvidence {
    const parsedEvents = Array.isArray(result.parsed?.events)
      ? result.parsed.events
      : [];

    const adapterEvents = Array.isArray(result.events)
      ? result.events
      : [];

    const events = parsedEvents.length > 0 ? parsedEvents : adapterEvents;

    return {
      source: "terminal",
      raw: result.raw ?? result.output ?? "",
      status: result.status,
      mode: result.modeAfter,
      prompt: result.promptAfter,
      events,
      completionReason: result.status === 0 ? "command-ended" : undefined,
      paging: result.warnings.some((w) => w.toLowerCase().includes("paginación")),
      awaitingConfirm: result.warnings.some((w) => w.toLowerCase().includes("confirmación")),
    };
  }

  private buildPlanDefaults(): {
    timeouts: TerminalPlanTimeouts;
    policies: TerminalPlanPolicies;
  } {
    return {
      timeouts: {
        commandTimeoutMs: 8000,
        stallTimeoutMs: 15000,
      },
      policies: {
        autoBreakWizard: true,
        autoAdvancePager: true,
        maxPagerAdvances: 50,
        maxConfirmations: 3,
        abortOnPromptMismatch: false,
        abortOnModeMismatch: true,
      },
    };
  }

  async execIosRaw(
    device: string,
    command: string,
    _parse = true,
    timeout = 5000,
  ): Promise<{ raw: string; parsed?: unknown }> {
    const { timeouts, policies } = this.buildPlanDefaults();
    const profile = classifyIosCommand(command);
    const targetMode = profile.preserveCurrentMode ? undefined : "privileged-exec";

    const plan: TerminalPlan = {
      id: this.generateId(),
      device,
      targetMode,
      steps: [
        {
          kind: "command",
          command,
          timeout,
          expectMode: profile.expectedMode,
        },
      ],
      timeouts,
      policies,
    };

    const result = await this.terminalPort.runTerminalPlan(plan, { timeoutMs: timeout });

    return { raw: result.output || "", parsed: result.parsed };
  }

  async execIos<T = ParsedOutput>(
    device: string,
    command: string,
    _parse = true,
    timeout = 5000,
  ): Promise<IosExecutionSuccess<T>> {
    const { timeouts, policies } = this.buildPlanDefaults();
    const profile = classifyIosCommand(command);
    const targetMode = profile.preserveCurrentMode ? undefined : "privileged-exec";

    const plan: TerminalPlan = {
      id: this.generateId(),
      device,
      targetMode,
      steps: [
        {
          kind: "command",
          command,
          timeout,
          expectMode: profile.expectedMode,
        },
      ],
      timeouts,
      policies,
    };

    const result = await this.terminalPort.runTerminalPlan(plan, { timeoutMs: timeout });

    return {
      ok: result.ok,
      raw: result.output || "",
      parsed: result.parsed as T,
      evidence: this.buildEvidence(result),
    };
  }

  async execInteractive(
    device: string,
    command: string,
    options?: { timeout?: number; parse?: boolean; ensurePrivileged?: boolean },
  ): Promise<IosExecutionSuccess<ParsedOutput>> {
    const { timeouts, policies } = this.buildPlanDefaults();
    const timeout = options?.timeout ?? 30000;
    const profile = classifyIosCommand(command);
    const targetMode: TerminalMode | undefined = profile.preserveCurrentMode
      ? undefined
      : options?.ensurePrivileged
        ? "privileged-exec"
        : "user-exec";

    const plan: TerminalPlan = {
      id: this.generateId(),
      device,
      targetMode,
      steps: [
        {
          kind: "command",
          command,
          timeout,
          expectMode: profile.expectedMode,
        },
      ],
      timeouts,
      policies,
    };

    const result = await this.terminalPort.runTerminalPlan(plan, { timeoutMs: timeout });

    return {
      ok: result.ok,
      raw: result.output || "",
      parsed: result.parsed as ParsedOutput,
      evidence: this.buildEvidence(result),
    };
  }

  async configIos(
    device: string,
    commands: string[],
    options?: { save?: boolean },
  ): Promise<IosConfigApplyResult> {
    const configStepTimeoutMs = 60000;
    const saveStepTimeoutMs = 60000;
    const { timeouts, policies } = this.buildPlanDefaults();

    const steps: TerminalPlan["steps"] = [
      { kind: "ensureMode" as const, expectMode: "privileged-exec" },
      {
        kind: "command" as const,
        command: "configure terminal",
        timeout: configStepTimeoutMs,
        expectMode: "global-config",
      },
      ...commands.map((cmd) => {
        const cmdProfile = classifyIosCommand(cmd);
        return {
          kind: "command" as const,
          command: cmd,
          timeout: configStepTimeoutMs,
          expectMode: cmdProfile.expectedMode,
        };
      }),
      {
        kind: "command" as const,
        command: "end",
        timeout: configStepTimeoutMs,
        expectMode: "privileged-exec",
      },
    ];

    if (options?.save) {
      steps.push({
        kind: "command" as const,
        command: "copy running-config startup-config",
        allowConfirm: true,
        timeout: saveStepTimeoutMs,
      });
    }

    const timeoutMs = Math.max(
      30000,
      steps.reduce((total, step) => total + (step.timeout ?? 5000), 0) + 5000,
    );

    const plan: TerminalPlan = {
      id: this.generateId(),
      device,
      targetMode: "global-config",
      steps,
      timeouts,
      policies,
    };

    const result = await this.terminalPort.runTerminalPlan(plan, { timeoutMs });

    if (!result.ok) {
      throw new Error(`IOS configuration failed: command returned status ${result.status}`);
    }

    const results = commands.map((cmd, index) => ({
      index,
      command: cmd,
      ok: true,
      output: "",
    }));

    return {
      ok: true,
      raw: result.output,
      executed: true,
      device,
      commands,
      results,
      evidence: this.buildEvidence({ ...result, raw: result.output }),
    };
  }

  async showParsed<T = ParsedOutput>(
    device: string,
    command: string,
    options?: { ensurePrivileged?: boolean; timeout?: number },
  ): Promise<IosExecutionSuccess<T>> {
    const result = await this.execInteractive(device, command, {
      parse: false,
      ensurePrivileged: options?.ensurePrivileged ?? true,
      timeout: options?.timeout ?? 30000,
    });

    const parser = getParser(command);
    let parsed: T | undefined;

    if (parser) {
      try {
        parsed = parser(result.raw) as T;
      } catch {
        // Si falla el parser, devolvemos raw y evidence igualmente.
      }
    }

    return {
      ok: result.ok,
      raw: result.raw,
      parsed,
      evidence: result.evidence,
    };
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

    let raw = result.raw || "";
    let normalizedRaw = raw;
    let parsed = parseShowRunningConfig(normalizedRaw);

    if ((!this.hasMeaningfulRunningConfig(parsed) || !raw.trim()) && this.readRunningConfig) {
      raw = await this.readRunningConfig(device).catch(() => "");
      normalizedRaw = raw;
      parsed = parseShowRunningConfig(normalizedRaw);
    }

    const marker = normalizedRaw.lastIndexOf("show running-config");
    const finalRaw = marker >= 0 ? normalizedRaw.slice(marker) : normalizedRaw;

    return parseShowRunningConfig(finalRaw);
  }

  private hasMeaningfulRunningConfig(result: ShowRunningConfig): boolean {
    return (result.lines ?? []).some((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed === "!" || trimmed === "--More--") return false;
      if (trimmed.startsWith("show running-config")) return false;
      if (trimmed.startsWith("Building configuration...")) return false;
      return !/^[A-Za-z0-9_.-]+(?:\s+[A-Za-z0-9_.-]+)*[>#]$/.test(trimmed);
    });
  }

  async showCdpNeighbors(device: string): Promise<ShowCdpNeighbors> {
    const result = await this.showParsed<ShowCdpNeighbors>(device, "show cdp neighbors");
    return result.parsed ?? parseShowCdpNeighbors(result.raw);
  }
}
