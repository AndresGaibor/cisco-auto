#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function callParser() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🧪 LLAMANDO A LA FUNCIÓN NATIVA _parser...");

    // Intentar llamar a _parser como función global
    // Usamos el path "ipc" pero llamamos a "_parser" como método del scope global (si lo inyectamos bien)
    const res = await controller.deepInspect("ipc", "_parser", ["getDeviceCount", null]);
    
    if (res.ok) {
        console.log(`✅ Resultado del Parser: ${JSON.stringify(res.result)}`);
    } else {
        console.log(`❌ Falló la llamada: ${res.error}`);
        
        console.log("\n🔍 Intentando vía ScriptModule...");
        const res2 = await controller.deepInspect("privileged", "ipcSingleCall", ["PTNetwork", "getDeviceCount", []]);
        console.log(`✅ Resultado via ipcSingleCall: ${JSON.stringify(res2.result)}`);
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
callParser();
