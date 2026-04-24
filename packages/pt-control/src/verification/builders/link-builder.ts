/**
 * Link Builder - Construcción programática de enlaces entre dispositivos
 *
 * Proporciona funciones para crear, eliminar y consultar enlaces
 * usando el PTController.
 *
 * @module verification/builders/link-builder
 */

import type { PTController } from "../../controller/index.js";
import type { LinkState, CableType } from "@cisco-auto/types";

export interface CreateLinkOptions {
  linkType?: CableType;
}

export interface FreePortSuggestion {
  device: string;
  port: string;
  index: number;
}

/**
 * Crea un enlace entre dos dispositivos en Packet Tracer.
 *
 * @param controller - PTController activo
 * @param device1 - Nombre del primer dispositivo
 * @param port1 - Puerto del primer dispositivo (ej: "Gig0/0")
 * @param device2 - Nombre del segundo dispositivo
 * @param port2 - Puerto del segundo dispositivo
 * @param linkType - Tipo de cable (auto, straight, cross, etc.)
 * @returns Estado del enlace creado
 * @example
 * const link = await createLink(controller, "R1", "Gig0/0", "S1", "Gig0/1");
 */
export async function createLink(
  controller: PTController,
  device1: string,
  port1: string,
  device2: string,
  port2: string,
  linkType: CableType = "auto",
): Promise<LinkState> {
  return controller.addLink(device1, port1, device2, port2, linkType);
}

/**
 * Elimina un enlace conectado a un puerto específico de un dispositivo.
 *
 * @param controller - PTController activo
 * @param device - Nombre del dispositivo
 * @param port - Puerto cuya conexión se eliminará
 */
export async function removeLink(
  controller: PTController,
  device: string,
  port: string,
): Promise<void> {
  await controller.removeLink(device, port);
}

/**
 * Sugiere un puerto libre en un dispositivo para nuevas conexiones.
 *
 * @param controller - PTController activo
 * @param device - Nombre del dispositivo
 * @returns Información del puerto libre sugerido
 * @example
 * const suggestion = await getFreePort(controller, "R1");
 * if (suggestion) {
 *   console.log(`Usar ${suggestion.port} en ${suggestion.device}`);
 * }
 */
export async function getFreePort(
  controller: PTController,
  device: string,
): Promise<FreePortSuggestion | null> {
  const state = await controller.inspectDevice(device);

  if (!state.ports || state.ports.length === 0) {
    return null;
  }

  for (let i = 0; i < state.ports.length; i++) {
    const port = state.ports[i];
    if (!port.link || port.link === "") {
      return {
        device,
        port: port.name,
        index: i,
      };
    }
  }

  return null;
}

/**
 * Encuentra el enlace directo entre dos dispositivos.
 *
 * @param controller - PTController activo
 * @param device1 - Nombre del primer dispositivo
 * @param device2 - Nombre del segundo dispositivo
 * @returns Enlace encontrado o null
 */
export async function findLinkBetween(
  controller: PTController,
  device1: string,
  device2: string,
): Promise<LinkState | null> {
  const cache = controller.getTopologyCache();
  return cache.findLinkBetween(device1, device2) ?? null;
}

/**
 * Lista todos los enlaces en la topología actual.
 *
 * @param controller - PTController activo
 * @returns Array de estados de enlace
 */
export async function listLinks(controller: PTController): Promise<LinkState[]> {
  const cache = controller.getTopologyCache();
  return cache.getLinks();
}