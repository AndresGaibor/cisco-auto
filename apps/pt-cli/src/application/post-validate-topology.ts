#!/usr/bin/env bun
/**
 * Validaciones básicas post-ejecución para cambios topológicos (Fase 3)
 */

import type { PTController } from '@cisco-auto/pt-control';

export async function validateDeviceExists(controller: PTController, name: string): Promise<boolean> {
  try {
    const snapshot = await controller.snapshot();
    if (!snapshot || !snapshot.devices) return false;
    return !!snapshot.devices[name];
  } catch (err) {
    return false;
  }
}

export async function validateDeviceMissing(controller: PTController, name: string): Promise<boolean> {
  try {
    const snapshot = await controller.snapshot();
    if (!snapshot || !snapshot.devices) return true; // consider missing if snapshot empty
    return !snapshot.devices[name];
  } catch (err) {
    return false;
  }
}

export async function validateLinkExists(
  controller: PTController,
  device1: string,
  port1: string,
  device2: string,
  port2: string
): Promise<boolean> {
  try {
    const snapshot = await controller.snapshot();
    if (!snapshot || !snapshot.links) return false;
    const links = Object.values(snapshot.links ?? {});

    for (const l of links) {
      const direct = l.device1 === device1 && l.port1 === port1 && l.device2 === device2 && l.port2 === port2;
      const reverse = l.device1 === device2 && l.port1 === port2 && l.device2 === device1 && l.port2 === port1;
      if (direct || reverse) return true;
    }

    return false;
  } catch (err) {
    return false;
  }
}
