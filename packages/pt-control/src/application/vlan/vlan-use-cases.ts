import { resolveCapabilitySet, type CapabilitySet } from "@cisco-auto/ios-domain/capabilities";
import {
  planConfigureTrunkPort,
  planConfigureVlan,
} from "@cisco-auto/ios-domain/operations";
import {
  Ipv4Address,
  SubnetMask,
  VlanId,
  parseInterfaceName,
} from "@cisco-auto/ios-primitives/value-objects";

const VLAN_LIST_SEPARATOR = ",";

export interface VlanDeviceTarget {
  name: string;
  model?: string;
  type?: string | number;
}

export interface VlanControllerPort {
  listDevices(): Promise<{ devices: VlanDeviceTarget[] } | VlanDeviceTarget[]>;
  configIosWithResult(
    device: string,
    commands: string[],
    options: { save: boolean },
  ): Promise<unknown>;
}

export interface VlanCreateResult {
  vlanId: number;
  name: string;
  description?: string;
  commands: string[];
}

export interface VlanApplyResult {
  device: string;
  vlanIds: number[];
  commands: string[];
  commandsGenerated: number;
}

export interface VlanTrunkResult {
  device: string;
  interface: string;
  allowedVlans: number[];
  commands: string[];
}

export interface VlanEnsureSpec {
  id: number;
  name: string;
}

export interface VlanEnsureResult {
  device: string;
  vlans: VlanEnsureSpec[];
  commands: string[];
  commandsGenerated: number;
}

export interface SviConfig {
  vlanId: number;
  ip: string;
  mask: string;
}

export interface VlanConfigInterfacesResult {
  device: string;
  interfaces: SviConfig[];
  commands: string[];
  commandsGenerated: number;
}

export type VlanUseCaseResult<T> =
  | {
      ok: true;
      data: T;
      advice?: string[];
    }
  | {
      ok: false;
      error: {
        message: string;
        details?: Record<string, unknown>;
      };
    };

function toVlanId(value: number | VlanId): VlanId {
  return value instanceof VlanId ? value : VlanId.from(value);
}

function planToCommands(plan: { steps: Array<{ command: string }> }): string[] {
  return plan.steps.map((step, index) => (index === 0 ? step.command : ` ${step.command}`));
}

function normalizeDeviceList(
  result: { devices: VlanDeviceTarget[] } | VlanDeviceTarget[],
): VlanDeviceTarget[] {
  return Array.isArray(result) ? result : result.devices;
}

function isIosCapableDevice(device: VlanDeviceTarget): boolean {
  const type = device.type;

  if (typeof type === "number") {
    return type === 0 || type === 1 || type === 16;
  }

  return type === "router" || type === "switch" || type === "switch_layer3";
}

async function findIosTarget(
  controller: VlanControllerPort,
  deviceName: string,
): Promise<VlanUseCaseResult<VlanDeviceTarget>> {
  const devices = normalizeDeviceList(await controller.listDevices());
  const iosDevices = devices.filter(isIosCapableDevice);
  const selected = iosDevices.find((device) => device.name === deviceName);

  if (!selected) {
    return {
      ok: false,
      error: {
        message: `Dispositivo "${deviceName}" no encontrado`,
        details: {
          availableIosDevices: iosDevices.map((device) => ({
            name: device.name,
            model: device.model,
            type: device.type,
          })),
        },
      },
    };
  }

  return {
    ok: true,
    data: selected,
  };
}

export function parseVlanIds(raw: string): VlanId[] {
  try {
    const ids = raw
      .split(VLAN_LIST_SEPARATOR)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => {
        if (!/^\d+$/.test(token)) {
          throw new Error(`VLAN ID inválido: "${token}"`);
        }

        return VlanId.from(Number(token));
      });

    if (ids.length === 0) {
      throw new Error("La lista de VLANs debe contener al menos un ID");
    }

    return ids;
  } catch {
    throw new Error("La lista de VLANs debe contener IDs válidos entre 1 y 4094");
  }
}

export function parseVlanEnsureSpecs(rawSpecs: string[]): VlanEnsureSpec[] {
  if (rawSpecs.length === 0) {
    throw new Error("Debes especificar al menos una VLAN con --vlan");
  }

  return rawSpecs.map((spec) => {
    const parts = spec.split(",").map((part) => part.trim());

    if (parts.length !== 2) {
      throw new Error(`VLAN inválida: "${spec}". Formato esperado: id,nombre`);
    }

    const vlan = VlanId.from(Number(parts[0]));
    const name = parts[1];

    if (!name) {
      throw new Error(`Nombre de VLAN vacío en "${spec}"`);
    }

    return {
      id: vlan.value,
      name,
    };
  });
}

export function parseSviSpecs(rawSpecs: string[]): SviConfig[] {
  if (rawSpecs.length === 0) {
    throw new Error("Debes especificar al menos una interfaz con --interface");
  }

  return rawSpecs.map((spec) => {
    const parts = spec.split(",").map((part) => part.trim());

    if (parts.length !== 3) {
      throw new Error(`SVI inválida: "${spec}". Formato esperado: vlanId,ip,mask`);
    }

    const vlan = VlanId.from(Number(parts[0]));
    const ip = new Ipv4Address(parts[1]!);
    const mask = new SubnetMask(parts[2]!);

    return {
      vlanId: vlan.value,
      ip: ip.value,
      mask: mask.value,
    };
  });
}

export function buildVlanCreateCommands(
  name: string,
  id: number,
  description?: string,
): string[] {
  const vlan = VlanId.from(id);
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("El nombre de la VLAN no puede estar vacío");
  }

  const commands = ["! Configuración de VLANs"];
  commands.push(`vlan ${vlan.value}`);
  commands.push(` name ${trimmedName}`);

  if (description?.trim()) {
    commands.push(` description ${description.trim()}`);
  }

  commands.push(" exit");
  return commands;
}

export function buildVlanApplyCommands(
  vlanIds: Array<number | VlanId>,
  caps: CapabilitySet,
): string[] {
  const commands = ["! Configuración de VLANs"];

  for (const id of vlanIds) {
    const vlanId = toVlanId(id);
    const plan = planConfigureVlan(caps, {
      vlan: vlanId,
      name: `VLAN${vlanId.value}`,
    });

    if (!plan) {
      throw new Error("El dispositivo no soporta configuración de VLANs");
    }

    commands.push(...planToCommands(plan));
  }

  return commands;
}

export function buildVlanEnsureCommands(
  specs: VlanEnsureSpec[],
  caps: CapabilitySet,
): string[] {
  const commands = ["! Configuración de VLANs"];

  for (const spec of specs) {
    const plan = planConfigureVlan(caps, {
      vlan: VlanId.from(spec.id),
      name: spec.name,
    });

    if (!plan) {
      throw new Error("El dispositivo no soporta configuración de VLANs");
    }

    commands.push(...planToCommands(plan));
  }

  return commands;
}

export function buildVlanTrunkCommands(
  iface: string,
  allowedVlans: Array<number | VlanId>,
  caps: CapabilitySet,
): string[] {
  const vlans = allowedVlans.map((value) => toVlanId(value));
  const port = parseInterfaceName(iface);
  const plan = planConfigureTrunkPort(caps, { port, vlans });

  if (!plan) {
    throw new Error("El dispositivo no soporta configuración trunk");
  }

  return ["! Configuración de interfaces", ...planToCommands(plan)];
}

export function buildSviCommands(interfaces: SviConfig[]): string[] {
  const commands: string[] = [];

  for (const svi of interfaces) {
    commands.push(`interface vlan${svi.vlanId}`);
    commands.push(` ip address ${svi.ip} ${svi.mask}`);
    commands.push(" no shutdown");
    commands.push(" exit");
  }

  return commands;
}

export async function executeVlanApply(
  controller: VlanControllerPort,
  input: {
    deviceName: string;
    vlansRaw: string;
  },
): Promise<VlanUseCaseResult<VlanApplyResult>> {
  try {
    const target = await findIosTarget(controller, input.deviceName);
    if (!target.ok) {
      return target;
    }

    const vlanIds = parseVlanIds(input.vlansRaw);
    const caps = resolveCapabilitySet(target.data.model ?? "");
    const commands = buildVlanApplyCommands(vlanIds, caps).slice(1);

    await controller.configIosWithResult(target.data.name, commands, { save: true });

    return {
      ok: true,
      data: {
        device: target.data.name,
        vlanIds: vlanIds.map((vlanId) => vlanId.value),
        commands,
        commandsGenerated: commands.length,
      },
      advice: [`Usa pt show vlan ${target.data.name} para verificar`],
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function executeVlanTrunk(
  controller: VlanControllerPort,
  input: {
    deviceName: string;
    iface: string;
    allowedRaw: string;
  },
): Promise<VlanUseCaseResult<VlanTrunkResult>> {
  try {
    const target = await findIosTarget(controller, input.deviceName);
    if (!target.ok) {
      return target;
    }

    const vlanIds = parseVlanIds(input.allowedRaw);
    const caps = resolveCapabilitySet(target.data.model ?? "");
    const commands = buildVlanTrunkCommands(input.iface, vlanIds, caps).slice(1);

    await controller.configIosWithResult(target.data.name, commands, { save: true });

    return {
      ok: true,
      data: {
        device: target.data.name,
        interface: input.iface,
        allowedVlans: vlanIds.map((vlanId) => vlanId.value),
        commands,
      },
      advice: [`Usa pt show interfaces trunk ${target.data.name} para verificar`],
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function executeVlanEnsure(
  controller: VlanControllerPort,
  input: {
    deviceName: string;
    vlanSpecsRaw: string[];
  },
): Promise<VlanUseCaseResult<VlanEnsureResult>> {
  try {
    const target = await findIosTarget(controller, input.deviceName);
    if (!target.ok) {
      return target;
    }

    const parsedVlans = parseVlanEnsureSpecs(input.vlanSpecsRaw);
    const caps = resolveCapabilitySet(target.data.model ?? "");
    const commands = buildVlanEnsureCommands(parsedVlans, caps).slice(1);

    await controller.configIosWithResult(target.data.name, commands, { save: true });

    return {
      ok: true,
      data: {
        device: target.data.name,
        vlans: parsedVlans,
        commands,
        commandsGenerated: commands.length,
      },
      advice: [`Usa pt show vlan ${target.data.name} para verificar`],
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function executeVlanConfigInterfaces(
  controller: VlanControllerPort,
  input: {
    deviceName: string;
    interfaceSpecsRaw: string[];
  },
): Promise<VlanUseCaseResult<VlanConfigInterfacesResult>> {
  try {
    const target = await findIosTarget(controller, input.deviceName);
    if (!target.ok) {
      return target;
    }

    const interfaces = parseSviSpecs(input.interfaceSpecsRaw);
    const commands = buildSviCommands(interfaces);

    await controller.configIosWithResult(target.data.name, commands, { save: true });

    return {
      ok: true,
      data: {
        device: target.data.name,
        interfaces,
        commands,
        commandsGenerated: commands.length,
      },
      advice: [`Usa pt show ip int brief ${target.data.name} para verificar`],
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}