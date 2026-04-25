#!/usr/bin/env bun
/**
 * JAILBREAK V5: EVENT HIJACKING
 * Intenta capturar objetos con privilegios mediante el sistema de eventos.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function hijack() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n💀 INICIANDO JAILBREAK V5: EVENT HIJACKING...");

    // 1. Registrar el Evento (Cuelga de ipc)
    console.log("Suscribiendo al evento 'deviceAdded'...");
    
    // Inyectamos el listener directamente en el Kernel vía evaluate
    const exploit = `
      ipc.registerEvent("deviceAdded", ipc, function(device) {
        dprint("[HIJACK] Nuevo equipo detectado: " + device.getName());
        // Intentamos usar el objeto device para algo prohibido
        try {
            var cfg = AssessmentModel.getRunningConfig(device.getName());
            dprint("[HIJACK] Config capturada: " + cfg.substring(0, 50));
        } catch(e) {
            dprint("[HIJACK] Error en callback: " + e);
        }
      });
      "LISTENER_ACTIVE";
    `;

    const res = await controller.deepInspect("scriptEngine", "evaluate", [exploit]);
    console.log(`Estado del Secuestro: ${res.result}`);

    console.log(colors.yellow("\n💡 ACCIÓN REQUERIDA: Ve a Packet Tracer y arrastra CUALQUIER router al canvas."));
    console.log("El Kernel debería imprimir los datos en el log de PT.");

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    // No detenemos el controlador para dejar el listener vivo
    console.log("\nEsperando eventos (Ctrl+C para salir)...");
  }
}

const colors = { yellow: (s: string) => `\x1b[33m${s}\x1b[0m` };
hijack();
