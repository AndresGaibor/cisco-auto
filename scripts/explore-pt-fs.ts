#!/usr/bin/env bun
/**
 * PT FILE SYSTEM EXPLORER
 * Intenta leer archivos directamente del disco virtual de Packet Tracer.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function exploreFS() {
  const controller = createDefaultPTController();
  const fm = "systemFileManager()";

  try {
    await controller.start();
    console.log("\n📁 EXPLORANDO SISTEMA DE ARCHIVOS VIRTUAL (PT FS)...");

    // 1. Listar el directorio raíz
    console.log("Intentando listar directorio '.'...");
    const files = await controller.deepInspect(fm, "listDirectory", ["."]);
    console.log(`Contenido detectado: ${JSON.stringify(files.result)}`);

    // 2. ¿Dónde está Packet Tracer instalado realmente?
    const basePath = await controller.deepInspect("appWindow()", "getBasePath", []);
    console.log(`Base Path de PT: ${basePath.result}`);

    // 3. Probar lectura de un archivo conocido
    console.log("Probando lectura de 'config.xml'...");
    const content = await controller.deepInspect(fm, "getFileContents", ["config.xml"]);
    console.log(`Lectura config.xml: ${content.ok ? "ÉXITO (" + content.result.length + " bytes)" : "FALLÓ"}`);

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
exploreFS();
