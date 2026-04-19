#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function bruteForceProps() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n💀 INICIANDO JAILBREAK V7: BRUTE-FORCE PROPERTY SCANNER...");

    const exploit = `
        (function() {
            var target = AssessmentModel;
            var results = {
                proto: [],
                own: [],
                keys: []
            };

            try {
                // 1. Own Property Names (El más potente)
                results.own = Object.getOwnPropertyNames(target);
            } catch(e) { results.ownError = String(e); }

            try {
                // 2. Keys del prototipo
                var p = Object.getPrototypeOf(target);
                results.proto = Object.getOwnPropertyNames(p);
            } catch(e) { results.protoError = String(e); }

            // 3. Serialización forzada a string para saltar el bridge
            return JSON.stringify(results);
        })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    
    if (res.ok) {
        const data = JSON.parse(res.result);
        console.log(`\n✅ PROPIEDADES DESCUBIERTAS:`);
        console.log(`- Own Properties: ${data.own.length}`);
        console.log(data.own.sort().join(", "));
        
        console.log(`\n- Prototype Properties: ${data.proto.length}`);
        console.log(data.proto.sort().join(", "));
        
        if (data.ownError) console.log(`\n❌ Error en Own: ${data.ownError}`);
    } else {
        console.log(`❌ Falló la evaluación: ${res.error}`);
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
bruteForceProps();
