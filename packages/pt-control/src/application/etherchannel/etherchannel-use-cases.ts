/**
 * EtherChannel Use Cases
 *
 * Business logic for EtherChannel operations: create, remove, list.
 * Delegates IOS command generation to kernel plugin.
 */

import {
  generateEtherChannelCommands,
  validateEtherChannelConfig,
  type EtherChannelConfigInput,
} from "@cisco-auto/kernel/plugins/switching";

import type {
  EtherchannelControllerPort,
  EtherchannelDevice,
  EtherchannelCreateResult,
  EtherchannelRemoveResult,
  EtherchannelListResult,
  EtherchannelUseCaseResult,
} from "./etherchannel-types.js";

function isIosCapableDevice(device: EtherchannelDevice): boolean {
  const type = device.type;

  if (typeof type === "number") {
    return type === 0 || type === 1 || type === 16;
  }

  return type === "router" || type === "switch" || type === "switch_layer3";
}

function normalizeDeviceList(
  result: { devices: EtherchannelDevice[] } | EtherchannelDevice[],
): EtherchannelDevice[] {
  return Array.isArray(result) ? result : result.devices;
}

async function findIosTarget(
  controller: EtherchannelControllerPort,
  deviceName: string,
): Promise<EtherchannelUseCaseResult<EtherchannelDevice>> {
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

function buildRemoveCommands(groupId: number): string[] {
  return [`no interface Port-channel${groupId}`];
}

export interface CreateEtherChannelInput {
  deviceName: string;
  groupId: number;
  mode: "active" | "passive" | "on" | "desirable" | "auto";
  interfaces: string[];
  trunkMode?: "trunk" | "access";
  nativeVlan?: number;
  allowedVlans?: number[] | "all";
  description?: string;
}

export async function createEtherChannel(
  controller: EtherchannelControllerPort,
  input: CreateEtherChannelInput,
): Promise<EtherchannelUseCaseResult<EtherchannelCreateResult>> {
  try {
    const target = await findIosTarget(controller, input.deviceName);
    if (!target.ok) {
      return target;
    }

    if (input.groupId < 1 || input.groupId > 64) {
      return {
        ok: false,
        error: {
          message: "Group ID inválido. Debe estar entre 1 y 64",
        },
      };
    }

    if (input.interfaces.length === 0) {
      return {
        ok: false,
        error: {
          message: "Se requiere al menos una interfaz",
        },
      };
    }

    const ecConfig: EtherChannelConfigInput = {
      groupId: input.groupId,
      mode: input.mode,
      interfaces: input.interfaces,
      portChannel: `Port-channel${input.groupId}`,
      trunkMode: input.trunkMode,
      nativeVlan: input.nativeVlan,
      allowedVlans: input.allowedVlans,
      description: input.description,
    };

    const validation = validateEtherChannelConfig(ecConfig);
    if (!validation.ok) {
      return {
        ok: false,
        error: {
          message: validation.errors.map((e) => e.message).join(", "),
          details: { errors: validation.errors },
        },
      };
    }

    const commands = generateEtherChannelCommands(ecConfig);

    await controller.configIosWithResult(target.data.name, commands, { save: true });

    return {
      ok: true,
      data: {
        device: target.data.name,
        groupId: input.groupId,
        interfaces: input.interfaces,
        commands,
        commandsGenerated: commands.length,
      },
      advice: [`Usa pt etherchannel list ${target.data.name} para verificar`],
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

export async function removeEtherChannel(
  controller: EtherchannelControllerPort,
  input: { deviceName: string; groupId: number },
): Promise<EtherchannelUseCaseResult<EtherchannelRemoveResult>> {
  try {
    const target = await findIosTarget(controller, input.deviceName);
    if (!target.ok) {
      return target;
    }

    const commands = buildRemoveCommands(input.groupId);

    await controller.configIosWithResult(target.data.name, commands, { save: true });

    return {
      ok: true,
      data: {
        device: target.data.name,
        groupId: input.groupId,
        commands,
      },
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

export async function listEtherChannel(
  controller: EtherchannelControllerPort,
  input: { deviceName: string },
): Promise<EtherchannelUseCaseResult<EtherchannelListResult>> {
  try {
    const target = await findIosTarget(controller, input.deviceName);
    if (!target.ok) {
      return target;
    }

    const output = await controller.execIos(target.data.name, "show etherchannel summary", true);

    return {
      ok: true,
      data: {
        device: target.data.name,
        output: output.raw,
      },
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
