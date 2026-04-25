#!/usr/bin/env bun
/**
 * JAILBREAK EXPERIMENT: PROTOTYPE POLLUTION
 * Inyecta un espía en Object.prototype para capturar datos internos.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function pollution() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n💀 INICIANDO JAILBREAK V3: PROTOTYPE POLLUTION...");

    // El código a inyectar: modifica toString para que nos diga qué es el objeto real
    const exploit = `
      Object.prototype.toString = function() {
        var keys = [];
        for (var k in this) { keys.push(k); }
        return "[POLLUTED:" + (this.getClassName ? this.getClassName() : "Unknown") + " - Keys: " + keys.join(",") + "]";
      };
      "VULNERABILITY INJECTED";
    `;

    console.log("Inyectando exploit en el scope global...");
    const res = await controller.deepInspect("scriptEngine", "evaluate", [exploit]);
    console.log(`Resultado inyección: ${res.result}`);

    // Ahora pedimos un objeto que antes fallaba
    console.log("\n🧪 Pidiendo objeto AssessmentModel (debería mostrar nuestro log ahora)...");
    const res2 = await controller.deepInspect("scriptEngine", "evaluate", ["AssessmentModel"]);
    console.log(`Respuesta del Calificador: ${JSON.stringify(res2.result)}`);

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
pollution();
