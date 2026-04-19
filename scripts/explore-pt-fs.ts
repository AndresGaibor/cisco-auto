#!/usr/bin/env bun
/**
 * PT FILE SYSTEM EXPLORER V2
 * Usa los métodos correctos según la documentación confirmada.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function exploreFS() {
  const controller = createDefaultPTController();
  const fm = "systemFileManager()";
  const app = "appWindow()";

  try {
    await controller.start();
    console.log("\n📁 EXPLORANDO SISTEMA DE ARCHIVOS VIRTUAL (PT FS)...");

    // 1. Listar el directorio usando AppWindow (confirmado en doc)
    console.log("Intentando listar directorio '.' vía AppWindow...");
    const filesApp = await controller.deepInspect(app, "listDirectory", ["."]);
    console.log(`Contenido (AppWindow): ${JSON.stringify(filesApp.result)}`);

    // 2. Listar usando SystemFileManager (método getFilesInDirectory)
    console.log("\nIntentando listar directorio '.' vía SystemFileManager...");
    const filesFM = await controller.deepInspect(fm, "getFilesInDirectory", ["."]);
    console.log(`Contenido (FileManager): ${JSON.stringify(filesFM.result)}`);

    // 3. Obtener Base Path
    const basePath = await controller.deepInspect(app, "getBasePath", []);
    console.log(`\nBase Path de PT: ${basePath.result}`);

    // 4. Probar lectura de un archivo de configuración
    console.log("\nProbando lectura de 'config.xml'...");
    const content = await controller.deepInspect(fm, "getFileContents", ["config.xml"]);
    if (content.ok && content.result) {
        console.log(`✅ Lectura config.xml exitosa (${content.result.length} bytes)`);
        console.log("Primeros 100 caracteres:");
        console.log(content.result.substring(0, 100));
    } else {
        console.log("❌ Falló la lectura de config.xml");
    }

  } catch (error: any) {
    console.error(`\n💥 Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
exploreFS();
