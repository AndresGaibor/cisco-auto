#!/usr/bin/env bun
/**
 * THE ROSETTA STONE SWEEP (V8)
 * Usa el dump de 18k métodos como diccionario para forzar la respuesta de PT.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";
import { readFileSync } from "fs";

async function rosettaSweep() {
  const controller = createDefaultPTController();
  console.log("\n📖 Cargando Piedra de Rosetta (DNA V4)...");
  
  const dna = JSON.parse(readFileSync("./docs/pt-dna-v4.json", "utf-8"));
  
  // Extraer todos los nombres de métodos únicos de todo el dump
  const dictionary = new Set<string>();
  
  // Función recursiva para recolectar todos los nombres de métodos del dump
  function collect(obj: any) {
    if (!obj || typeof obj !== "object") return;
    if (obj.methods) {
        Object.keys(obj.methods).forEach(m => dictionary.add(m));
    }
    Object.values(obj).forEach(v => collect(v));
  }
  collect(dna);

  const methodList = Array.from(dictionary).sort();
  console.log(`✅ Diccionario cargado: ${methodList.length} métodos únicos detectados.`);

  try {
    await controller.start();
    console.log("\n🚀 INICIANDO BARRIDO DE DICCIONARIO SOBRE network()...");

    for (let i = 0; i < methodList.length; i++) {
        const m = methodList[i];
        
        // Probamos el método en el objeto network()
        const probeCode = `
            (function() {
                try {
                    var target = ipc.network();
                    if (typeof target['${m}'] === "function") {
                        try {
                            var r = target['${m}']();
                            return "LIVE() -> " + String(r).substring(0, 40);
                        } catch(e) {
                            if (String(e).includes("Insufficient")) return "LIVE(args_req)";
                            return "LIVE_ERR: " + String(e).substring(0, 40);
                        }
                    }
                    return null;
                } catch(e) { return null; }
            })()
        `;

        const res = await controller.send("__evaluate", { code: probeCode });
        
        if (res.ok && res.result) {
            console.log(`  [${i}/${methodList.length}] \x1b[32m${m}\x1b[0m: ${res.result}`);
        }
        
        // Mostrar progreso cada 100
        if (i % 100 === 0) process.stdout.write(".");
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

rosettaSweep();
