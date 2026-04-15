// ============================================================================
// Module Handlers - Pure functions for module operations (HWIC, NMs, etc.)
// ============================================================================

import type { HandlerDeps, HandlerResult } from "../utils/helpers";
import type { PTModule } from "../pt-api/pt-api-registry";

// ============================================================================
// Module Type Constants (from PT API)
// ============================================================================

const MODULE_TYPE = {
  eLineCard: 0,
  eNetworkModule: 1,
  eInterfaceCard: 2,
  ePtRouterModule: 3,
  ePtSwitchModule: 4,
  ePtCloudModule: 5,
  ePtRepeaterModule: 6,
  ePtHostModule: 7,
  ePtModemModule: 8,
  ePtLaptopModule: 9,
  ePtTVModule: 10,
  eIpPhonePowerAdapter: 11,
  ePtTabletPCModule: 12,
  ePtPdaModule: 13,
  ePtWirelessEndDeviceModule: 14,
  ePtWiredEndDeviceModule: 15,
  eTrs35: 16,
  eUsb: 17,
  eNonRemovableModule: 18,
  eASAModule: 19,
  eASAPowerAdapter: 20,
  ePtCellTowerModule: 21,
  ePtIoeModule: 22,
  ePtIoeNetworkModule: 23,
  ePtIoeAnalogModule: 24,
  ePtIoeDigitalModule: 25,
  ePtIoeCustomIOModule: 26,
  ePtIoePowerAdapter: 27,
  ePtIoeMcuComponentPowerAdapter: 28,
  ePtRouterPowerAdapter: 29,
  eSfpModule: 30,
  eAccessPointPowerAdaptor: 31,
  eNonRemovableInterfaceCard: 32,
  eCustomModuleType: 2000,
};

// ============================================================================
// Payload Types
// ============================================================================

export interface AddModulePayload {
  type: "addModule";
  device: string;
  slot: string;
  module: string;
}

export interface RemoveModulePayload {
  type: "removeModule";
  device: string;
  slot: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function safeString(v: unknown): string {
  if (v === null || v === undefined) return "";
  try {
    return String(v);
  } catch {
    return "";
  }
}

function isHWICOrWIC(moduleId: string): boolean {
  const id = safeString(moduleId).toUpperCase();
  return id.startsWith("HWIC-") || id.startsWith("WIC-");
}

function isNetworkModule(moduleId: string): boolean {
  const id = safeString(moduleId).toUpperCase();
  return id.startsWith("NM-");
}

// PT Module interface (from actual PT API)
interface SlotCandidate {
  parent: PTModule;
  label: string;
  slotIndex: number;
  slotType: number;
}

// ============================================================================
// Slot Finder - traverses module tree to find best slot
// ============================================================================

function getSlotCountOrZero(mod: PTModule | null): number {
  if (!mod) return 0;
  try {
    return mod.getSlotCount();
  } catch {
    return 0;
  }
}

function getSlotTypeOrMinus(mod: PTModule | null, index: number): number {
  if (!mod) return -1;
  try {
    return mod.getSlotTypeAt(index);
  } catch {
    return -1;
  }
}

function getModuleCountOrZero(mod: PTModule | null): number {
  if (!mod) return 0;
  try {
    return mod.getModuleCount();
  } catch {
    return 0;
  }
}

function getModuleAtOrNull(mod: PTModule | null, index: number): PTModule | null {
  if (!mod) return null;
  try {
    return mod.getModuleAt(index);
  } catch {
    return null;
  }
}

function collectParentsRecursive(
  mod: PTModule | null,
  label: string,
  depth: number,
  outArr: SlotCandidate[],
): void {
  if (!mod || depth > 10) return;

  const count = getSlotCountOrZero(mod);
  if (count > 0) {
    for (let s = 0; s < count; s++) {
      const slotType = getSlotTypeOrMinus(mod, s);
      outArr.push({ parent: mod, label, slotIndex: s, slotType });
    }
  }

  const childCount = getModuleCountOrZero(mod);
  for (let i = 0; i < childCount; i++) {
    const child = getModuleAtOrNull(mod, i);
    if (child) {
      collectParentsRecursive(child, `${label}/child[${i}]`, depth + 1, outArr);
    }
  }
}

function collectSlotCandidates(root: PTModule | null): SlotCandidate[] {
  const result: SlotCandidate[] = [];
  collectParentsRecursive(root, "root", 0, result);
  return result;
}

function findBestSlot(candidates: SlotCandidate[], moduleId: string): SlotCandidate | null {
  const isHWIC = isHWICOrWIC(moduleId);
  const isNM = isNetworkModule(moduleId);

  // First pass: find type-compatible slot
  for (const c of candidates) {
    // Skip non-removable
    if (c.slotType === MODULE_TYPE.eNonRemovableModule) continue;
    if (c.slotType === MODULE_TYPE.eNonRemovableInterfaceCard) continue;

    if (isNM && c.slotType === MODULE_TYPE.eNetworkModule) return c;
    if (isHWIC && c.slotType === MODULE_TYPE.eInterfaceCard) return c;
  }

  // Second pass: any compatible slot
  for (const c of candidates) {
    if (c.slotType === MODULE_TYPE.eNonRemovableModule) continue;
    if (c.slotType === MODULE_TYPE.eNonRemovableInterfaceCard) continue;
    if (isNM && c.slotType === MODULE_TYPE.eNetworkModule) return c;
    if (isHWIC && c.slotType === MODULE_TYPE.eInterfaceCard) return c;
  }

  return null;
}

// ============================================================================
// Handlers
// ============================================================================

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

  // Modules require device to be powered off
  const wasPowered = device.getPower();

  if (wasPowered) {
    device.setPower(false);
    dprint(`[addModule] ${deviceName} powered off`);
  }

  try {
    // Get root module
    const root = device.getRootModule?.() ?? null;

    if (!root) {
      // No getRootModule - fallback to old addModule API
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
        // Need to insert NM module first to create WIC slots
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

    // Collect all slot candidates from the tree
    const candidates = collectSlotCandidates(root);
    dprint(`[addModule] ${deviceName} model=${model} candidates=${candidates.length}`);

    // Find best slot for this module
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

    // Attempt module insertion
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
