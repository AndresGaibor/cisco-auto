#!/usr/bin/env bun
/**
 * JAILBREAK V6: META-OBJECT CRAWLER
 * Intenta extraer metadatos de C++ del motor Qt.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function metaHack() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n💀 INICIANDO JAILBREAK V6: EXTRACCIÓN DE META-OBJETOS QT...");

    const exploit = `
        (function() {
            var target = AssessmentModel;
            var info = {
                className: target.getClassName ? target.getClassName() : "Unknown",
                internalName: target.objectName,
                methods: []
            };

            // Hack: Intentar forzar la enumeración de métodos que no aparecen en for..in
            // Usamos una lista de verbos comunes en C++ para "adivinar" métodos ocultos
            var verbs = ["is", "get", "set", "has", "can", "add", "remove", "clear", "reset", "fire", "trigger"];
            var nouns = ["Assessment", "Item", "Node", "Score", "Time", "State", "Config", "Process", "Value", "Feedback"];
            
            for(var v=0; v<verbs.length; v++) {
                for(var n=0; n<nouns.length; n++) {
                    var m = verbs[v] + nouns[n];
                    if (typeof target[m] === "function") {
                        info.methods.push(m);
                    }
                }
            }

            // Intentar detectar si existe el metaObject (esto es C++ puro)
            if (target.metaObject) {
                info.hasMetaObject = true;
                try {
                    info.metaClassName = target.metaObject().className();
                } catch(e) { info.metaError = String(e); }
            }

            return JSON.stringify(info);
        })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    
    if (res.ok) {
        const data = JSON.parse(res.result);
        console.log(`\n✅ INFORMACIÓN EXTRAÍDA:`);
        console.log(`- Clase Real (C++): ${data.className}`);
        console.log(`- MetaClassName: ${data.metaClassName || "Protegido"}`);
        console.log(`- Métodos Ocultos Descubiertos: ${data.methods.length}`);
        if (data.methods.length > 0) {
            console.log(data.methods.sort().join(", "));
        }
    } else {
        console.log(`❌ Falló la introspección meta: ${res.error}`);
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
metaHack();
