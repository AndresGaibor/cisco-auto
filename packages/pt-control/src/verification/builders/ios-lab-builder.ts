/**
 * IOS Lab Builder - Construcción de laboratorios IOS (routers/switches)
 *
 * Proporciona funciones de alto nivel para crear dispositivos IOS,
 * abrir sesiones CLI y asegurar el modo privilegiado.
 *
 * @module verification/builders/ios-lab-builder
 */

import type { PTController } from "../../controller/index.js";
import type { DeviceState } from "@cisco-auto/types";

const ROUTER_MODEL_2911 = "2911";
const SWITCH_MODEL_2960 = "2960";

export interface BuildBasicRouterOptions {
  x?: number;
  y?: number;
  skipBoot?: boolean;
}

export interface BuildBasicSwitchOptions {
  x?: number;
  y?: number;
}

export interface SessionInfo {
  device: string;
  mode: string;
  sessionId: string;
}

/**
 * Crea un router básico 2911, abre sesión CLI y resuelve el diálogo inicial.
 *
 * Incluye:
 * - Creación del dispositivo router 2911
 * - Apertura de sesión CLI
 * - Manejo de initial dialog (confirmación de salir del setup)
 * - SkipBoot si el router tiene configuración inicial
 *
 * @param controller - PTController activo
 * @param name - Nombre para el router
 * @param options - Parámetros opcionales (posición, skipBoot)
 * @returns Dispositivo creado y sesión resuelta
 * @example
 * const router = await buildBasicRouter(controller, "R1");
 * // Listo para ejecutar comandos de configuración
 */
export async function buildBasicRouter(
  controller: PTController,
  name: string,
  options?: BuildBasicRouterOptions,
): Promise<{ device: DeviceState; session: SessionInfo }> {
  const device = await controller.addDevice(name, ROUTER_MODEL_2911, {
    x: options?.x,
    y: options?.y,
  });

  const session = await openSession(controller, name);

  if (options?.skipBoot !== false) {
    await ensureSkipBootIfNeeded(controller, name);
  }

  return { device, session };
}

/**
 * Crea un switch básico 2960 y abre sesión CLI.
 *
 * @param controller - PTController activo
 * @param name - Nombre para el switch
 * @param options - Parámetros opcionales de posición
 * @returns Dispositivo creado y sesión activa
 * @example
 * const sw = await buildBasicSwitch(controller, "S1");
 */
export async function buildBasicSwitch(
  controller: PTController,
  name: string,
  options?: BuildBasicSwitchOptions,
): Promise<{ device: DeviceState; session: SessionInfo }> {
  const device = await controller.addDevice(name, SWITCH_MODEL_2960, {
    x: options?.x,
    y: options?.y,
  });

  const session = await openSession(controller, name);

  return { device, session };
}

/**
 * Abre una sesión IOS interactiva con un dispositivo.
 *
 * @param controller - PTController activo
 * @param device - Nombre del dispositivo
 * @returns Información de la sesión abierta
 */
export async function openSession(
  controller: PTController,
  device: string,
): Promise<SessionInfo> {
  const result = await controller.ensureTerminalSession(device);

  return {
    device,
    mode: "unknown",
    sessionId: result.sessionId ?? `session-${device}-${Date.now()}`,
  };
}

/**
 * Asegura que la sesión esté en modo privilegiado (enable).
 *
 * Si no está en modo privilegiado, intenta entrar automáticamente.
 *
 * @param controller - PTController activo
 * @param device - Nombre del dispositivo
 * @returns Modo actual de la sesión
 */
export async function ensurePrivileged(
  controller: PTController,
  device: string,
): Promise<string> {
  await controller.ensureTerminalSession(device);

  await controller.runTerminalPlan({
    id: `enable-${device}`,
    device,
    steps: [
      {
        command: "enable",
        expectedPrompt: "#",
        timeout: 5000,
      },
    ],
  });

  return "privileged";
}

/**
 * Resuelve el diálogo inicial de un dispositivo IOS (setup dialog).
 *
 * Envía "no" para rechazar la configuración inicial y permite
 * continuar con comandos normales.
 *
 * @param controller - PTController activo
 * @param device - Nombre del dispositivo
 */
export async function resolveInitialDialog(
  controller: PTController,
  device: string,
): Promise<void> {
  await controller.runTerminalPlan({
    id: `init-dialog-${device}`,
    device,
    steps: [
      {
        command: "no",
        expectedPrompt: "#",
        timeout: 10000,
      },
    ],
  });
}

/**
 * Aplica skipBoot en un dispositivo IOS para evitar el diálogo de configuración.
 *
 * @param controller - PTController activo
 * @param device - Nombre del dispositivo
 */
async function ensureSkipBootIfNeeded(
  controller: PTController,
  device: string,
): Promise<void> {
  try {
    await controller.runOmniCapability("skipBoot", { device });
  } catch {
    // SkipBoot puede no estar disponible o el dispositivo ya está limpio
  }
}