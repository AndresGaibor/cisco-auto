#!/usr/bin/env bun
/**
 * ROUTER GUTS EXTRACTOR (V2)
 * Usa el ataque Rosetta para mapear el 100% de la API de un Router real.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";
import { readFileSync } from "fs";

async function routerGuts() {
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
    console.log("\n🛰️  PENETRANDO EN LAS TRIPAS DEL ROUTER...");

    for (let i = 0; i < methodList.length; i++) {
        const m = methodList[i];
        
        const probeCode = `
            (function() {
                try {
                    var dev = ipc.network().getDeviceAt(0);
                    if (!dev) return "NO_DEV";
                    if (typeof dev['${m}'] === "function") {
                        try {
                            var r = dev['${m}']();
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
            console.log(`  [${i}] \x1b[35m${m}\x1b[0m: ${res.result}`);
        }
        if (i % 100 === 0) process.stdout.write(".");
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

routerGuts();
