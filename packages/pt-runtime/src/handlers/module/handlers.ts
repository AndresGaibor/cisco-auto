// ============================================================================
// Module Handlers - Pure functions for module operations (HWIC, NMs, etc.)
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../../utils/helpers";
import { safeString, isHWICOrWIC } from "./helpers";
import { inspectModuleSlots } from "../../primitives/module/index.js";
import {
  MODULE_TYPE,
  getSlotCountOrZero,
  getSlotTypeOrMinus,
  getModuleCountOrZero,
  collectSlotCandidates,
  findBestSlot,
} from "./slot-finder";
import type { AddModulePayload, RemoveModulePayload } from "./types";

export type { AddModulePayload, RemoveModulePayload };

/**
 * Add a module to a modular device (router, switch)
 * Uses tree-based module insertion discovered via PT API research.
 *
 * Strategy per model:
 * - 2911/1941: HWIC/WIC modules go into slot type 2 (eInterfaceCard)
 * - 2811: NM modules go into slot type 1 (eNetworkModule);
 *          HWIC/WIC modules require NM container first
 *
 * Note: Modules require the device to be powered off first
 */
export function handleAddModule(payload: AddModulePayload, deps: HandlerDeps): HandlerResult {
  const { getNet, dprint } = deps;
  const net = getNet();
  const { device: deviceName, slot: slotArg, module: moduleId } = payload;

  const device = net.getDevice(deviceName);
  if (!device) {
    return { ok: false, error: `Device not found: ${deviceName}`, code: "DEVICE_NOT_FOUND" };
  }

  const model = safeString(device.getModel()).toUpperCase();
  const is2811 = model.includes("2811");

  const wasPowered = device.getPower();

  if (wasPowered) {
    device.setPower(false);
    dprint(`[addModule] ${deviceName} powered off`);
  }

  try {
    const root = device.getRootModule?.() ?? null;

    if (!root) {
      dprint(`[addModule] ${deviceName} no getRootModule, using device.addModule`);
      const result = device.addModule(slotArg, moduleId);

      if (wasPowered) {
        device.setPower(true);
        if (device.skipBoot) device.skipBoot();
      }

      if (!result) {
        return { ok: false, error: `Failed to add module "${moduleId}" to slot ${slotArg}` };
      }

      return {
        ok: true,
        device: deviceName,
        slot: slotArg,
        module: moduleId,
        wasPoweredOff: wasPowered,
      };
    }

    // Two-step insertion for 2811 + HWIC/WIC
    if (is2811 && isHWICOrWIC(moduleId)) {
      const hasNMChild = getModuleCountOrZero(root) > 1;

      if (!hasNMChild) {
        dprint(`[addModule] ${deviceName} 2811 HWIC/WIC - inserting NM-2W first`);

        const rootSlotCount = getSlotCountOrZero(root);
        let nmSlotIndex = -1;

        for (let s = 0; s < rootSlotCount; s++) {
          if (getSlotTypeOrMinus(root, s) === MODULE_TYPE.eNetworkModule) {
            nmSlotIndex = s;
            break;
          }
        }

        if (nmSlotIndex >= 0) {
          const nmResult = root.addModuleAt("NM-2W", nmSlotIndex);
          dprint(`[addModule] ${deviceName} NM-2W at root slot ${nmSlotIndex}: ${nmResult}`);

          if (!nmResult) {
            if (wasPowered) {
              device.setPower(true);
              if (device.skipBoot) device.skipBoot();
            }
            return { ok: false, error: `Failed to add NM-2W container for ${moduleId}` };
          }
        }
      }
    }

    const candidates = collectSlotCandidates(root);
    dprint(`[addModule] ${deviceName} model=${model} candidates=${candidates.length}`);

    const best = findBestSlot(candidates, moduleId);

    if (!best) {
      dprint(`[addModule] ${deviceName} no suitable slot for ${moduleId}`);
      if (wasPowered) {
        device.setPower(true);
        if (device.skipBoot) device.skipBoot();
      }
      return { ok: false, error: `No suitable slot for module "${moduleId}" on ${deviceName}` };
    }

    dprint(
      `[addModule] ${deviceName} inserting ${moduleId} at ${best.label} slot ${best.slotIndex} (type=${best.slotType})`,
    );

    const result = best.parent.addModuleAt(moduleId, best.slotIndex);

    if (wasPowered) {
      device.setPower(true);
      if (device.skipBoot) device.skipBoot();
      dprint(`[addModule] ${deviceName} powered back on`);
    }

    if (!result) {
      dprint(`[addModule] ${deviceName} addModuleAt returned false`);
      return {
        ok: false,
        error: `Failed to add module "${moduleId}" at ${best.label} slot ${best.slotIndex}`,
      };
    }

    dprint(
      `[addModule] ${deviceName} SUCCESS: ${moduleId} at ${best.label} slot ${best.slotIndex}`,
    );

    return {
      ok: true,
      device: deviceName,
      slot: `${best.label}:${best.slotIndex}`,
      module: moduleId,
      wasPoweredOff: wasPowered,
    };
  } catch (err) {
    if (wasPowered) {
      device.setPower(true);
      if (device.skipBoot) device.skipBoot();
    }

    const errorMsg = err instanceof Error ? err.message : safeString(err);
    dprint(`[addModule] ${deviceName} exception: ${errorMsg}`);

    return { ok: false, error: errorMsg, code: "MODULE_ADD_ERROR" };
  }
}

/**
 * Remove a module from a modular device
 * Note: Modules require the device to be powered off first
 */
export function handleRemoveModule(payload: RemoveModulePayload, deps: HandlerDeps): HandlerResult {
  const { getNet, dprint } = deps;
  const net = getNet();
  const { device: deviceName, slot } = payload;

  const device = net.getDevice(deviceName);
  if (!device) {
    return { ok: false, error: `Device not found: ${deviceName}`, code: "DEVICE_NOT_FOUND" };
  }

  if (!device.removeModule) {
    return {
      ok: false,
      error: "Device does not support modular expansion",
      code: "UNSUPPORTED_OPERATION",
    };
  }

  const wasPowered = device.getPower();

  if (wasPowered) {
    device.setPower(false);
    dprint(`[removeModule] ${deviceName} powered off`);
  }

  try {
    const result = device.removeModule(slot);

    if (wasPowered) {
      device.setPower(true);
      if (device.skipBoot) device.skipBoot();
      dprint(`[removeModule] ${deviceName} powered back on`);
    }

    if (!result) {
      return { ok: false, error: `Failed to remove module from slot ${slot}` };
    }

    return { ok: true, device: deviceName, slot, wasPoweredOff: wasPowered };
  } catch (err) {
    if (wasPowered) {
      device.setPower(true);
      if (device.skipBoot) device.skipBoot();
    }

    const errorMsg = err instanceof Error ? err.message : safeString(err);
    dprint(`[removeModule] ${deviceName} exception: ${errorMsg}`);

    return { ok: false, error: errorMsg, code: "MODULE_REMOVE_ERROR" };
  }
}

export function handleInspectModuleSlots(payload: { device: string }, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const result = inspectModuleSlots(payload.device, getNet());
  return {
    ok: result.ok,
    value: result.value,
    error: result.error,
    code: result.code,
    warnings: result.warnings,
    evidence: result.evidence,
    confidence: result.confidence,
  } as HandlerResult;
}
