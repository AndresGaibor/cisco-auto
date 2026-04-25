import {
  createTerminalCommandService,
  type TerminalControllerPort,
} from "../services/terminal-command-service.js";

import {
  Ipv4Address,
  SubnetMask,
} from "@cisco-auto/ios-primitives/value-objects";

export interface HostNetworkConfig {
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

export interface HostInspectState {
  name: string;
  model?: string;
  type?: string | number;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

export interface HostHistoryEntry {
  command: string;
  output: string;
  timestamp?: number;
}

export interface HostControllerPort extends TerminalControllerPort {
  configHost(device: string, options: HostNetworkConfig): Promise<void>;
  inspectHost(device: string): Promise<HostInspectState | null | undefined>;
  getHostHistory(device: string): Promise<{
    entries: HostHistoryEntry[];
    count: number;
    raw: string;
    methods?: string[];
  }>;
}

export interface HostConfigInput {
  deviceName: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

export interface HostConfigResult {
  device: string;
  ip: string | null;
  mask: string | null;
  gateway: string | null;
  dns: string | null;
  dhcp: boolean;
}

export interface HostInspectResult {
  name: string;
  model: string;
  type: string;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

export interface HostHistoryResult {
  device: string;
  entries: HostHistoryEntry[];
  count: number;
  raw: string;
  methods?: string[];
}

export interface HostExecInput {
  deviceName: string;
  command: string;
  timeoutMs?: number;
  generateId?: () => string;
}

export interface HostExecResult {
  device: string;
  command: string;
  output: string;
  success: boolean;
  status: number;
  deviceKind: string;
  verdict: {
    warnings: string[];
    reason?: string;
  };
  evidence?: unknown;
}

export type HostUseCaseResult<T> =
  | { ok: true; data: T; advice?: string[] }
  | { ok: false; error: { code?: string; message: string; details?: Record<string, unknown> } };

const DEVICE_TYPE_MAP: Record<number, string> = {
  0: "router",
  1: "switch",
  16: "switch_layer3",
};

export function normalizeHostDeviceType(type: string | number | undefined): string {
  if (typeof type === "string") return type;
  if (typeof type === "number") return DEVICE_TYPE_MAP[type] ?? "unknown";
  return "unknown";
}

function normalizeOptionalIpv4(value: string | undefined, label: string): string | undefined {
  if (!value || !value.trim()) return undefined;
  try {
    return new Ipv4Address(value).value;
  } catch {
    throw new Error(`${label} inválida: ${value}`);
  }
}

function normalizeRequiredIpv4(value: string | undefined, label: string): string {
  if (!value || !value.trim()) throw new Error(`${label} requerida`);
  return normalizeOptionalIpv4(value, label)!;
}

function normalizeRequiredSubnetMask(value: string | undefined): string {
  if (!value || !value.trim()) throw new Error("Máscara requerida");
  try {
    return new SubnetMask(value).value;
  } catch {
    throw new Error(`Máscara inválida: ${value}`);
  }
}

export function buildHostConfigPayload(input: HostConfigInput): HostNetworkConfig {
  const dhcp = input.dhcp === true;
  if (dhcp) return { dhcp: true };

  const ip = normalizeRequiredIpv4(input.ip, "IP");
  const mask = normalizeRequiredSubnetMask(input.mask);
  const gateway = normalizeOptionalIpv4(input.gateway, "Gateway");
  const dns = normalizeOptionalIpv4(input.dns, "DNS");

  return {
    dhcp: false,
    ip,
    mask,
    ...(gateway ? { gateway } : {}),
    ...(dns ? { dns } : {}),
  };
}

export function buildHostConfigPlanText(input: Partial<HostConfigInput>): string {
  const lines: string[] = [];
  lines.push("Plan de ejecución:");
  lines.push(`  1. Seleccionar dispositivo: ${input.deviceName ?? "<device>"}`);

  if (input.dhcp) {
    lines.push("  2. Activar DHCP en el host");
  } else {
    lines.push(`  2. Configurar IP: ${input.ip ?? "<ip>"}`);
    lines.push(`  3. Configurar máscara: ${input.mask ?? "<mask>"}`);
    if (input.gateway) lines.push(`  4. Configurar gateway: ${input.gateway}`);
    if (input.dns) lines.push(`  5. Configurar DNS: ${input.dns}`);
  }

  lines.push("  6. Aplicar configuración en Packet Tracer");
  lines.push("  7. Recomendar inspección posterior con host inspect");
  return lines.join("\n");
}

export async function executeHostConfig(
  controller: Pick<HostControllerPort, "configHost">,
  input: HostConfigInput,
): Promise<HostUseCaseResult<HostConfigResult>> {
  try {
    if (!input.deviceName?.trim()) {
      return { ok: false, error: { code: "HOST_DEVICE_REQUIRED", message: "Debes especificar el dispositivo host", details: { device: input.deviceName } } };
    }

    const payload = buildHostConfigPayload(input);
    await controller.configHost(input.deviceName, payload);

    return {
      ok: true,
      data: { device: input.deviceName, ip: payload.ip ?? null, mask: payload.mask ?? null, gateway: payload.gateway ?? null, dns: payload.dns ?? null, dhcp: payload.dhcp === true },
      advice: [`Ejecuta 'pt host inspect ${input.deviceName}' para verificar la configuración`],
    };
  } catch (error) {
    return { ok: false, error: { code: "HOST_CONFIG_FAILED", message: error instanceof Error ? error.message : String(error), details: { device: input.deviceName } } };
  }
}

export async function executeHostInspect(
  controller: Pick<HostControllerPort, "inspectHost">,
  input: { deviceName: string },
): Promise<HostUseCaseResult<HostInspectResult>> {
  try {
    if (!input.deviceName?.trim()) {
      return { ok: false, error: { code: "HOST_DEVICE_REQUIRED", message: "Debes especificar el dispositivo host" } };
    }

    const device = await controller.inspectHost(input.deviceName);
    if (!device?.name) {
      return { ok: false, error: { code: "HOST_NOT_FOUND", message: `Dispositivo host '${input.deviceName}' no encontrado`, details: { device: input.deviceName } } };
    }

    return {
      ok: true,
      data: { name: device.name, model: device.model ?? "unknown", type: normalizeHostDeviceType(device.type), ip: device.ip, mask: device.mask, gateway: device.gateway, dns: device.dns, dhcp: device.dhcp },
      advice: [`Usa 'pt host exec ${device.name} ipconfig' para validar desde consola`],
    };
  } catch (error) {
    return { ok: false, error: { code: "HOST_INSPECT_FAILED", message: error instanceof Error ? error.message : String(error), details: { device: input.deviceName } } };
  }
}

export async function executeHostHistory(
  controller: Pick<HostControllerPort, "getHostHistory">,
  input: { deviceName: string },
): Promise<HostUseCaseResult<HostHistoryResult>> {
  try {
    if (!input.deviceName?.trim()) {
      return { ok: false, error: { code: "HOST_DEVICE_REQUIRED", message: "Debes especificar el dispositivo host" } };
    }

    const history = await controller.getHostHistory(input.deviceName);
    return { ok: true, data: { device: input.deviceName, entries: history.entries, count: history.count, raw: history.raw, methods: history.methods } };
  } catch (error) {
    return { ok: false, error: { code: "HOST_HISTORY_FAILED", message: error instanceof Error ? error.message : String(error), details: { device: input.deviceName } } };
  }
}

export async function executeHostCommand(
  controller: TerminalControllerPort,
  input: HostExecInput,
): Promise<HostUseCaseResult<HostExecResult>> {
  try {
    if (!input.deviceName?.trim()) {
      return { ok: false, error: { code: "HOST_DEVICE_REQUIRED", message: "Debes especificar el dispositivo host" } };
    }
    if (!input.command?.trim()) {
      return { ok: false, error: { code: "HOST_COMMAND_REQUIRED", message: "Debes especificar el comando a ejecutar", details: { device: input.deviceName } } };
    }

    const service = createTerminalCommandService({
      controller,
      runtimeTerminal: null,
      generateId: input.generateId ?? (() => `host-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    });

    const result = await service.executeCommand(input.deviceName, input.command, { timeoutMs: input.timeoutMs ?? 45000 });

    if (result.ok) {
      return {
        ok: true,
        data: { device: result.device, command: result.command, output: result.output, success: true, status: result.status, deviceKind: result.deviceKind, verdict: { warnings: result.warnings }, evidence: result.evidence },
      };
    }

    return { ok: false, error: { code: result.error?.code ?? "HOST_EXEC_FAILED", message: result.error?.message ?? "Error desconocido en ejecución de comando", details: { device: result.device, command: result.command, output: result.output, evidence: result.evidence } } };
  } catch (error) {
    return { ok: false, error: { code: "HOST_EXEC_THROWN", message: error instanceof Error ? error.message : String(error), details: { device: input.deviceName, command: input.command, stack: error instanceof Error ? error.stack : undefined } } };
  }
}