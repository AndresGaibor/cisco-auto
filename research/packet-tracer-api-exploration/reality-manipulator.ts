#!/usr/bin/env bun
/**
 * SCREEN THIEF EXPLOIT
 * Usa el motor visual de PT para exportar el canvas al disco del host.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function stealScreen() {
  const controller = createDefaultPTController();
  const targetPath = "/Users/andresgaibor/Desktop/hacked_canvas.png";

  try {
    await controller.start();
    console.log("\n📷 INTENTANDO CAPTURAR EL CANVAS VISUAL...");

    const exploit = `
        (function() {
            try {
                var app = ipc.appWindow();
                // exportToImage es un método detectado en el dump
                // Parámetros probables: (path, quality)
                app.exportToImage("${targetPath}");
                return "SNAPSHOT_COMMAND_SENT";
            } catch(e) { return "ERROR: " + e; }
        })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    console.log(`\x1b[32m✅ Resultado: ${res.result}\x1b[0m`);
    console.log(`\n💡 REVISA TU ESCRITORIO: ¿Apareció un archivo 'hacked_canvas.png'?`);

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

stealScreen();
