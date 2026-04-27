// ============================================================================
// Module Primitives - Operaciones de módulo
// ============================================================================

import { registerPrimitive } from "../primitive-registry";
import type { PrimitiveDomain } from "../primitive-registry";
import { PT_DEVICE_MODULE_SLOTS } from "../../templates/generated-module-map.js";

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

export interface ModulePrimitiveResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  code?: string;
  warnings?: string[];
  evidence?: Record<string, unknown>;
  confidence?: number;
}

export function addModule(payload: AddModulePayload, net: any): ModulePrimitiveResult {
  try {
    const device = net.getDevice(payload.device);
    if (!device) {
      return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
    }

    const result = device.addModule(payload.slot, payload.module);
    if (!result) {
      return { ok: false, error: "Failed to add module", code: "MODULE_ADD_FAILED" };
    }

    return {
      ok: true,
      value: { device: payload.device, slot: payload.slot, module: payload.module },
      evidence: { slot: payload.slot, module: payload.module },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "MODULE_ADD_FAILED" };
  }
}

export function removeModule(payload: RemoveModulePayload, net: any): ModulePrimitiveResult {
  try {
    const device = net.getDevice(payload.device);
    if (!device) {
      return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
    }

    const result = device.removeModule(payload.slot);
    if (!result) {
      return { ok: false, error: "Failed to remove module", code: "MODULE_REMOVE_FAILED" };
    }

    return {
      ok: true,
      value: { device: payload.device, slot: payload.slot },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "MODULE_REMOVE_FAILED" };
  }
}

export function inspectModuleSlots(deviceName: string, net: any): ModulePrimitiveResult {
  try {
    const device = net.getDevice(deviceName);
    if (!device) {
      return { ok: false, error: "Device not found", code: "DEVICE_NOT_FOUND" };
    }

    const rootModule = device.getRootModule?.();
    if (!rootModule) {
      return { ok: true, value: { slots: [] }, evidence: { slots: [], slotCount: 0 } };
    }

    const modelKey = String(device.getModel?.() ?? "").toLowerCase();
    const deviceSlots = PT_DEVICE_MODULE_SLOTS[modelKey] ?? [];
    const slotCount = rootModule.getSlotCount?.() || 0;
    const slots: Array<{ index: number; type: number; occupied: boolean; installedModule?: string | null; compatibleModules: string[] }> = [];

    for (let i = 0; i < slotCount; i++) {
      const type = rootModule.getSlotTypeAt?.(i);
      const child = rootModule.getModuleAt?.(i) ?? null;
      const slotMeta = deviceSlots[i];
      slots.push({
        index: i,
        type: type ?? -1,
        occupied: Boolean(child),
        installedModule: child?.getModuleNameAsString?.() ?? null,
        compatibleModules: slotMeta?.supportedModules ?? [],
      });
    }

    return {
      ok: true,
      value: { slots },
      evidence: { slots, slotCount },
      confidence: 1,
    };
  } catch (e) {
    return { ok: false, error: String(e), code: "MODULE_INSPECT_FAILED" };
  }
}

export function inspectModuleSlotsPrimitive(payload: { device: string }, net: any): ModulePrimitiveResult {
  return inspectModuleSlots(payload.device, net);
}

registerPrimitive({
  id: "module.add",
  domain: "module" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => addModule(payload, ctx.net)) as any,
});

registerPrimitive({
  id: "module.remove",
  domain: "module" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => removeModule(payload, ctx.net)) as any,
});

registerPrimitive({
  id: "module.slots",
  domain: "module" as PrimitiveDomain,
  implementation: ((payload: any, ctx: { net: any; lw: any }) => inspectModuleSlotsPrimitive(payload, ctx.net)) as any,
});
