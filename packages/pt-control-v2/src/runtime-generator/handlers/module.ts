// ============================================================================
// Module Handlers - Pure functions for module operations (HWIC, NMs, etc.)
// ============================================================================

import { HandlerDeps, HandlerResult } from "../utils/helpers";

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
// Handlers
// ============================================================================

/**
 * Add a module to a modular device (router, switch)
 * Note: Modules require the device to be powered off first
 */
export function handleAddModule(payload: AddModulePayload, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const net = getNet();

  const device = net.getDevice(payload.device);
  if (!device) {
    return { ok: false, error: `Device not found: ${payload.device}` };
  }

  // Check if device supports modules
  if (!device.addModule) {
    return { ok: false, error: "Device does not support modular expansion" };
  }

  // Modules require device to be powered off
  const wasPowered = device.getPower();

  if (wasPowered) {
    device.setPower(false);
  }

  // Add the module
  const result = device.addModule(payload.slot, payload.module);

  // Restore power
  if (wasPowered) {
    device.setPower(true);
    if (device.skipBoot) {
      device.skipBoot();
    }
  }

  if (!result) {
    return {
      ok: false,
      error: `Failed to add module "${payload.module}" to slot ${payload.slot}`,
    };
  }

  return {
    ok: true,
    device: payload.device,
    slot: payload.slot,
    module: payload.module,
    wasPoweredOff: wasPowered,
  };
}

/**
 * Remove a module from a modular device
 * Note: Modules require the device to be powered off first
 */
export function handleRemoveModule(payload: RemoveModulePayload, deps: HandlerDeps): HandlerResult {
  const { getNet } = deps;
  const net = getNet();

  const device = net.getDevice(payload.device);
  if (!device) {
    return { ok: false, error: `Device not found: ${payload.device}` };
  }

  // Check if device supports modules
  if (!device.removeModule) {
    return { ok: false, error: "Device does not support modular expansion" };
  }

  // Modules require device to be powered off
  const wasPowered = device.getPower();

  if (wasPowered) {
    device.setPower(false);
  }

  // Remove the module
  const result = device.removeModule(payload.slot);

  // Restore power
  if (wasPowered) {
    device.setPower(true);
    if (device.skipBoot) {
      device.skipBoot();
    }
  }

  if (!result) {
    return {
      ok: false,
      error: `Failed to remove module from slot ${payload.slot}`,
    };
  }

  return {
    ok: true,
    device: payload.device,
    slot: payload.slot,
    wasPoweredOff: wasPowered,
  };
}
