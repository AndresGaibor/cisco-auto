#!/usr/bin/env bun
/**
 * PORT GUTS EXTRACTOR
 * Extrae el 100% de la API de un puerto físico.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";
import { readFileSync } from "fs";

async function portGuts() {
  const controller = createDefaultPTController();
  const dna = JSON.parse(readFileSync("./docs/pt-dna-v4.json", "utf-8"));
  
  const dictionary = new Set<string>();
  function collect(obj: any) {
    if (!obj || typeof obj !== "object") return;
    if (obj.methods) { Object.keys(obj.methods).forEach(m => dictionary.add(m)); }
    Object.values(obj).forEach(v => collect(v));
  }
  collect(dna);
  const methodList = Array.from(dictionary).sort();

  try {
    await controller.start();
    console.log("\n🔌 PENETRANDO EN LAS TRIPAS DEL PUERTO...");

    for (let i = 0; i < methodList.length; i++) {
        const m = methodList[i];
        
        const probeCode = `
            (function() {
                try {
                    var port = ipc.network().getDeviceAt(0).getPortAt(0);
                    if (!port) return "NO_PORT";
                    if (typeof port['${m}'] === "function") {
                        try {
                            var r = port['${m}']();
                            return "LIVE() -> " + String(r).substring(0, 30);
                        } catch(e) {
                            if (String(e).includes("Insufficient")) return "LIVE(args_req)";
                            return "LIVE_ERR: " + String(e).substring(0, 30);
                        }
                    }
                    return null;
                } catch(e) { return null; }
            })()
        `;

        const res = await controller.send("__evaluate", { code: probeCode });
        if (res.ok && res.result) {
            console.log(`  [${i}] \x1b[36m${m}\x1b[0m: ${res.result}`);
        }
        if (i % 100 === 0) process.stdout.write(".");
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

portGuts();
