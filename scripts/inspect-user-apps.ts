#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";
import { readFileSync } from "fs";

async function rosettaPc() {
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
    console.log("\n🔍 ESCANEANDO MÉTODOS DE ESCRITORIO EN PC0...");

    for (let i = 0; i < methodList.length; i++) {
        const m = methodList[i];
        if (!m.toLowerCase().includes("app") && !m.toLowerCase().includes("desktop") && !m.toLowerCase().includes("process")) continue;
        
        const code = `
            (function() {
                try {
                    var pc = ipc.network().getDevice('PC0');
                    if (typeof pc['${m}'] === "function") return "FOUND";
                } catch(e) {}
                return null;
            })()
        `;
        const res = await controller.send("__evaluate", { code });
        if (res.ok && res.result === "FOUND") {
            console.log(`  \x1b[32m${m}\x1b[0m: DETECTADO`);
        }
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
rosettaPc();
