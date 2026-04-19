#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";
import { readFileSync } from "fs";

async function discoverVisuals() {
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
    console.log("\n🔍 BUSCANDO MÉTODOS VISUALES EN AppWindow...");

    for (let i = 0; i < methodList.length; i++) {
        const m = methodList[i];
        if (!m.toLowerCase().includes("image") && !m.toLowerCase().includes("save") && !m.toLowerCase().includes("export")) continue;
        
        const code = `
            (function() {
                try {
                    var app = ipc.appWindow();
                    if (typeof app['${m}'] === "function") return "FOUND";
                } catch(e) {}
                return null;
            })()
        `;
        const res = await controller.send("__evaluate", { code });
        if (res.ok && res.result === "FOUND") {
            console.log(`  \x1b[32m${m}\x1b[0m: ACTIVO`);
        }
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
discoverVisuals();
