#!/usr/bin/env bun
/**
 * REALITY MANIPULATOR - FASE 4
 * Control total de la Simulación y la Interfaz de Usuario.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`
};

async function manipulateReality() {
  const controller = createDefaultPTController();
  const optPath = "options()";
  const simPath = "simulation()";

  try {
    await controller.start();
    console.log(colors.bold("\n🌌 INICIANDO MANIPULACIÓN DE LA REALIDAD DE PT..."));

    // 1. CONTROL DE UI (Censura dinámica)
    console.log(colors.yellow("\n🎭 Modificando Interfaz de Usuario..."));
    
    // Ocultar pestañas críticas (útil para exámenes)
    console.log("  -> Ocultando pestaña de Configuración...");
    await controller.deepInspect(optPath, "setConfigTabHidden", [true]);
    
    console.log("  -> Ocultando pestaña de CLI...");
    await controller.deepInspect(optPath, "setCliTabHidden", [true]);
    
    console.log("  -> Desactivando animaciones para máxima velocidad...");
    await controller.deepInspect(optPath, "setAnimation", [false]);

    // 2. CONTROL DEL TIEMPO (Simulación)
    console.log(colors.magenta("\n⏳ Entrando en el Flujo Temporal..."));
    
    console.log("  -> Activando Modo Simulación...");
    await controller.deepInspect(simPath, "setSimulationMode", [true]);
    
    const isSim = await controller.deepInspect(simPath, "isSimulationMode", []);
    console.log(`     Modo Simulación: ${isSim.result ? colors.green("ACTIVO") : colors.red("FALLÓ")}`);

    console.log("  -> Avanzando un paso en el tiempo (Forward)...");
    await controller.deepInspect(simPath, "forward", []);
    
    const simTime = await controller.deepInspect(simPath, "getCurrentSimTime", []);
    console.log(`     Tiempo de simulación actual: ${colors.cyan(simTime.result)}`);

    // 3. REGRESO A LA REALIDAD
    console.log(colors.yellow("\n🧹 Restaurando interfaz para el usuario..."));
    await new Promise(r => setTimeout(r, 3000));
    await controller.deepInspect(optPath, "setConfigTabHidden", [false]);
    await controller.deepInspect(optPath, "setCliTabHidden", [false]);
    
    console.log(colors.bold.green("\n✨ EXPERIMENTO COMPLETADO: El entorno ha sido dominado."));

  } catch (error: any) {
    console.error(`\n💥 Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

manipulateReality();
