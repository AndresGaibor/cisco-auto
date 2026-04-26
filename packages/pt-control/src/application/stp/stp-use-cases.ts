import {
  generateStpCommands,
  validateStpConfig,
  type StpConfigInput,
} from "@cisco-auto/kernel/plugins/switching";
import {
  type StpApplyInput,
  type StpApplyResult,
  type StpRootInput,
  type StpRootResult,
  type StpUseCaseOutput,
  type StpControllerPort,
  type StpDeviceTarget,
  type StpValidationResult,
} from "./stp-types";

function normalizeDeviceList(
  result: { devices: StpDeviceTarget[] } | StpDeviceTarget[],
): StpDeviceTarget[] {
  return Array.isArray(result) ? result : result.devices;
}

function isIosCapableDevice(device: StpDeviceTarget): boolean {
  const type = device.type;
  if (typeof type === "number") {
    return type === 0 || type === 1 || type === 16;
  }
  return type === "router" || type === "switch" || type === "switch_layer3";
}

export function validateStpMode(mode: string): StpValidationResult {
  if (!["pvst", "rapid-pvst", "mst"].includes(mode)) {
    return {
      ok: false,
      errors: [{ message: "Modo inválido. Use pvst, rapid-pvst o mst" }],
    };
  }
  return { ok: true };
}

export function buildStpModeCommands(
  mode: "pvst" | "rapid-pvst" | "mst",
): string[] {
  const config: StpConfigInput = { mode };
  const validation = validateStpConfig(config);
  if (!validation.ok) {
    throw new Error(validation.errors.map((e) => e.message).join(", "));
  }
  return generateStpCommands(config);
}

export function buildStpRootCommands(
  vlanIds: number[],
  priority?: number,
  rootPrimary?: boolean,
  rootSecondary?: boolean,
): string[] {
  const vlanEntries = vlanIds.map((vlanId) => ({
    vlanId,
    priority,
    rootPrimary: rootPrimary || undefined,
    rootSecondary: rootSecondary || undefined,
  }));

  const config: StpConfigInput = {
    mode: "pvst",
    vlanConfig: vlanEntries,
  };

  const validation = validateStpConfig(config);
  if (!validation.ok) {
    throw new Error(validation.errors.map((e) => e.message).join(", "));
  }

  return generateStpCommands(config);
}

export function validateVlanId(vlanId: number): boolean {
  return !Number.isNaN(vlanId) && vlanId >= 1 && vlanId <= 4094;
}

export function validatePriority(priority: number): boolean {
  return (
    !Number.isNaN(priority) &&
    priority >= 0 &&
    priority <= 61440 &&
    priority % 4096 === 0
  );
}

export async function executeStpApply(
  controller: StpControllerPort,
  input: StpApplyInput,
  dryRun = false,
): Promise<StpUseCaseOutput<StpApplyResult>> {
  try {
    const modeValidation = validateStpMode(input.mode);
    if (!modeValidation.ok) {
      return {
        ok: false,
        error: {
          message: modeValidation.errors[0]!.message,
        },
      };
    }

    const commands = buildStpModeCommands(input.mode);

    if (dryRun) {
      return {
        ok: true,
        data: {
          device: input.deviceName,
          mode: input.mode,
          commands,
          commandsGenerated: commands.length,
        },
      };
    }

    const devices = normalizeDeviceList(await controller.listDevices());
    const iosDevices = devices.filter(isIosCapableDevice);
    const selected = iosDevices.find((d) => d.name === input.deviceName);

    if (!selected) {
      return {
        ok: false,
        error: {
          message: `Dispositivo "${input.deviceName}" no encontrado`,
          details: {
            availableIosDevices: iosDevices.map((d) => ({
              name: d.name,
              model: d.model,
              type: d.type,
            })),
          },
        },
      };
    }

    await controller.configIosWithResult(selected.name, commands, { save: true });

    return {
      ok: true,
      data: {
        device: selected.name,
        mode: input.mode,
        commandsGenerated: commands.length,
      },
      advice: [`Usa pt show spanning-tree summary ${selected.name} para verificar`],
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

export async function executeStpSetRoot(
  controller: StpControllerPort,
  input: StpRootInput,
  dryRun = false,
): Promise<StpUseCaseOutput<StpRootResult>> {
  try {
    for (const vlanId of input.vlanIds) {
      if (!validateVlanId(vlanId)) {
        return {
          ok: false,
          error: {
            message: `VLAN inválida: ${vlanId}. Debe estar entre 1 y 4094`,
          },
        };
      }
    }

    if (input.priority !== undefined && !validatePriority(input.priority)) {
      return {
        ok: false,
        error: {
          message:
            "Prioridad inválida. Debe ser múltiplo de 4096 entre 0 y 61440",
        },
      };
    }

    const commands = buildStpRootCommands(
      input.vlanIds,
      input.priority,
      input.rootPrimary,
      input.rootSecondary,
    );

    if (dryRun) {
      return {
        ok: true,
        data: {
          device: input.deviceName,
          vlan: input.vlanIds[0]!,
          priority: input.priority,
          commands,
          commandsGenerated: commands.length,
        },
      };
    }

    const devices = normalizeDeviceList(await controller.listDevices());
    const iosDevices = devices.filter(isIosCapableDevice);
    const selected = iosDevices.find((d) => d.name === input.deviceName);

    if (!selected) {
      return {
        ok: false,
        error: {
          message: `Dispositivo "${input.deviceName}" no encontrado`,
        },
      };
    }

    await controller.configIosWithResult(selected.name, commands, { save: true });

    return {
      ok: true,
      data: {
        device: selected.name,
        vlan: input.vlanIds[0]!,
        priority: input.priority,
        commandsGenerated: commands.length,
      },
      advice: [
        `Usa pt show spanning-tree vlan ${input.vlanIds[0]} ${selected.name} para verificar`,
      ],
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

export function parseVlanIdsFromString(vlanIdStr: string): number[] {
  return vlanIdStr
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => !Number.isNaN(v) && v >= 1 && v <= 4094);
}

export function parsePriority(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const priority = Number(value);
  if (Number.isNaN(priority)) return undefined;
  return priority;
}