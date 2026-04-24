/**
 * Device Builder - Construcción programática de dispositivos en Packet Tracer
 *
 * Proporciona funciones de alto nivel para crear, mover, eliminar y listar
 * dispositivos usando el PTController.
 *
 * @module verification/builders/device-builder
 */

import type { PTController } from "../../controller/index.js";
import type { DeviceState } from "@cisco-auto/types";
import type { DeviceListResult } from "../../contracts/device-contracts.js";

export interface CreateDeviceOptions {
  x?: number;
  y?: number;
}

export interface CreateDeviceResult {
  name: string;
  model: string;
}

/**
 * Crea un nuevo dispositivo en Packet Tracer.
 *
 * @param controller - PTController activo
 * @param model - Modelo del dispositivo (ej: "2911", "2960", "PC1", "Server-PT")
 * @param name - Nombre único para el dispositivo
 * @param options - Parámetros opcionales de posición
 * @returns Resultado con name y model del dispositivo creado
 * @example
 * const result = await createDevice(controller, "2911", "R1", { x: 300, y: 200 });
 * console.log(`Router ${result.name} creado en posición`);
 */
export async function createDevice(
  controller: PTController,
  model: string,
  name: string,
  options?: CreateDeviceOptions,
): Promise<CreateDeviceResult> {
  const device = await controller.addDevice(name, model, options);
  return { name: device.name, model: device.model };
}

/**
 * Mueve un dispositivo existente a una nueva posición en el canvas.
 *
 * @param controller - PTController activo
 * @param name - Nombre del dispositivo a mover
 * @param x - Nueva coordenada X
 * @param y - Nueva coordenada Y
 * @returns Resultado de la operación con coordenadas nuevas
 */
export async function moveDevice(
  controller: PTController,
  name: string,
  x: number,
  y: number,
): Promise<{ ok: true; name: string; x: number; y: number } | { ok: false; error: string; code: string }> {
  return controller.moveDevice(name, x, y);
}

/**
 * Elimina un dispositivo de la topología.
 *
 * @param controller - PTController activo
 * @param name - Nombre del dispositivo a eliminar
 */
export async function removeDevice(
  controller: PTController,
  name: string,
): Promise<void> {
  await controller.removeDevice(name);
}

/**
 * Lista todos los dispositivos en la topología, opcionalmente filtrados.
 *
 * @param controller - PTController activo
 * @returns Lista de dispositivos con información de estado
 */
export async function listDevices(controller: PTController): Promise<DeviceListResult> {
  return controller.listDevices();
}

/**
 * Obtiene el estado completo de un dispositivo específico.
 *
 * @param controller - PTController activo
 * @param name - Nombre del dispositivo
 * @param includeXml - Si incluir XML del dispositivo
 * @returns Estado completo del dispositivo
 */
export async function getDevice(
  controller: PTController,
  name: string,
  includeXml = false,
): Promise<DeviceState> {
  return controller.inspectDevice(name, includeXml);
}