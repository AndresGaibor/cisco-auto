/**
 * Host Lab Builder - Construcción de PCs y Servers en Packet Tracer
 *
 * Proporciona funciones para crear hosts, configurar DHCP cliente
 * y configuración de IP estática.
 *
 * @module verification/builders/host-lab-builder
 */

import type { PTController } from "../../controller/index.js";
import type { DeviceState } from "@cisco-auto/types";

const PC_MODEL = "PC";
const SERVER_MODEL = "Server-PT";

export interface CreateHostOptions {
  x?: number;
  y?: number;
  ip?: string;
  mask?: string;
  gateway?: string;
  dns?: string;
  dhcp?: boolean;
}

export interface HostConfigStatic {
  ip: string;
  mask: string;
  gateway: string;
  dns?: string;
}

/**
 * Crea un PC genérico en Packet Tracer.
 *
 * @param controller - PTController activo
 * @param name - Nombre para el PC
 * @param options - Parámetros opcionales (posición, configuración IP)
 * @returns Estado del dispositivo creado
 * @example
 * const pc = await createHostPc(controller, "PC1", { x: 100, y: 200 });
 */
export async function createHostPc(
  controller: PTController,
  name: string,
  options?: CreateHostOptions,
): Promise<DeviceState> {
  const device = await controller.addDevice(name, PC_MODEL, {
    x: options?.x,
    y: options?.y,
  });

  if (options) {
    await controller.configHost(name, {
      ip: options.ip,
      mask: options.mask,
      gateway: options.gateway,
      dns: options.dns,
      dhcp: options.dhcp,
    });
  }

  return controller.inspectHost(name);
}

/**
 * Crea un servidor genérico en Packet Tracer.
 *
 * @param controller - PTController activo
 * @param name - Nombre para el servidor
 * @param options - Parámetros opcionales (posición, configuración IP)
 * @returns Estado del dispositivo creado
 * @example
 * const server = await createHostServer(controller, "Server1", { x: 400, y: 300 });
 */
export async function createHostServer(
  controller: PTController,
  name: string,
  options?: CreateHostOptions,
): Promise<DeviceState> {
  const device = await controller.addDevice(name, SERVER_MODEL, {
    x: options?.x,
    y: options?.y,
  });

  if (options) {
    await controller.configHost(name, {
      ip: options.ip,
      mask: options.mask,
      gateway: options.gateway,
      dns: options.dns,
      dhcp: options.dhcp,
    });
  }

  return controller.inspectHost(name);
}

/**
 * Configura un host para obtener IP por DHCP.
 *
 * @param controller - PTController activo
 * @param device - Nombre del host
 * @returns Dispositivo configurado con DHCP
 * @example
 * await configHostDhcp(controller, "PC1");
 */
export async function configHostDhcp(
  controller: PTController,
  device: string,
): Promise<void> {
  await controller.configHost(device, { dhcp: true });
}

/**
 * Configura un host con IP estática.
 *
 * @param controller - PTController activo
 * @param device - Nombre del host
 * @param ip - Dirección IP (ej: "192.168.1.10")
 * @param mask - Máscara de subred (ej: "255.255.255.0")
 * @param gateway - Gateway default (ej: "192.168.1.1")
 * @param dns - Servidor DNS opcional
 * @returns Dispositivo configurado con IP estática
 * @example
 * await configHostStatic(controller, "PC1", "192.168.1.10", "255.255.255.0", "192.168.1.1");
 */
export async function configHostStatic(
  controller: PTController,
  device: string,
  ip: string,
  mask: string,
  gateway: string,
  dns?: string,
): Promise<void> {
  await controller.configHost(device, {
    ip,
    mask,
    gateway,
    dns,
    dhcp: false,
  });
}

/**
 * Obtiene la configuración IP actual de un host.
 *
 * @param controller - PTController activo
 * @param device - Nombre del host
 * @returns Información de IP, máscara, gateway y DNS
 */
export async function getHostIpConfig(
  controller: PTController,
  device: string,
): Promise<{ ip: string; mask: string; gateway: string; dns: string; dhcp: boolean }> {
  const state = await controller.inspectHost(device);

  return {
    ip: state.ip ?? "0.0.0.0",
    mask: state.mask ?? "0.0.0.0",
    gateway: state.gateway ?? "0.0.0.0",
    dns: state.dns ?? "",
    dhcp: state.dhcp ?? false,
  };
}