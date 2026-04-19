#!/usr/bin/env bun
/**
 * JAILBREAK EXPERIMENT: SCRIPT ENGINE ESCAPE
 * Intenta ejecutar código en el motor interno de PT.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function jailbreak() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n💀 INICIANDO JAILBREAK V1: SCRIPT ENGINE ESCAPE...");

    // Intentar acceder a globales prohibidos vía scriptEngine
    const payload = "this.ipc.appWindow().getMenu().getMenuCount()"; // Esto normalmente está protegido
    console.log(`Evaluating: ${payload}`);
    
    const res = await controller.deepInspect("scriptEngine", "evaluate", [payload]);
    
    if (res.ok) {
        console.log(`✅ EXPLOIT ÉXITO: Acceso a Menú concedido. Resultado: ${res.result}`);
    } else {
        console.log(`❌ FALLÓ: El motor bloqueó la ejecución o el objeto scriptEngine es ciego.`);
    }

    // Ataque 2: Intentar listar procesos del sistema (si el motor es débil)
    console.log("\n🧪 Intentando listar archivos de sistema vía _ScriptModule...");
    const res2 = await controller.deepInspect("privileged", "getFilesInDirectory", ["/"]);
    console.log(`Raíz del sistema: ${JSON.stringify(res2.result)}`);

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
jailbreak();
