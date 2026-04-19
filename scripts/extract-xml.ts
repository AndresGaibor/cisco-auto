#!/usr/bin/env bun
/**
 * XML GENOMIC EXTRACTOR
 * Extrae la estructura completa de un dispositivo en formato XML.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function extractXml() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🧬 EXTRACCIÓN GENÓMICA (XML) INICIADA...");

    // 1. Identificar el primer Router
    const discovery = `
        (function() {
            var net = ipc.network();
            var count = net.getDeviceCount();
            for(var i=0; i<count; i++) {
                var d = net.getDeviceAt(i);
                if (d.getClassName() === "Router") return d.getName();
            }
            return null;
        })()
    `;
    const routerName = (await controller.send("__evaluate", { code: discovery })).result;

    if (!routerName) {
        console.log("❌ No se encontró ningún Router en el canvas.");
        return;
    }

    console.log(`🎯 Objetivo: ${routerName}`);

    // 2. Extraer Serialización de Dispositivo (Hardware + Lógica)
    console.log("\n📦 Generando 'serializeToXml'...");
    const serializeRes = await controller.send("__evaluate", { 
        code: "ipc.network().getDevice('" + routerName + "').serializeToXml()" 
    });

    if (serializeRes.ok) {
        const xml = serializeRes.result;
        const filePath = `docs/device_${routerName}_full.xml`;
        await Bun.write(filePath, xml);
        console.log(`✅ XML de Dispositivo guardado en: ${filePath} (${xml.length} bytes)`);
    }

    // 3. Extraer Árbol de Actividad (Lógica de Evaluación)
    console.log("\n🌳 Generando 'activityTreeToXml'...");
    const treeRes = await controller.send("__evaluate", { 
        code: "ipc.network().getDevice('" + routerName + "').activityTreeToXml()" 
    });

    if (treeRes.ok) {
        const xmlTree = treeRes.result;
        const treePath = `docs/device_${routerName}_activity.xml`;
        await Bun.write(treePath, xmlTree);
        console.log(`✅ Árbol de Actividad guardado en: ${treePath} (${xmlTree.length} bytes)`);
    }

    console.log("\n✨ EXTRACCIÓN COMPLETADA. Revisa la carpeta 'docs/' para ver las tripas.");

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

extractXml();
