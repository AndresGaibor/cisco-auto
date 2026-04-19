#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function exploreRaw() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🧪 EXPLORANDO ESTRUCTURA CRUDA DEL DISPOSITIVO...");

    const exploit = `
        (function() {
            var net = ipc.network();
            var d = net.getDeviceAt(0);
            var info = {
                name: d.getName(),
                keys: []
            };
            for(var k in d) { info.keys.push(k); }
            return info;
        })()
    `;
    const res = await controller.send("__evaluate", { code: exploit });
    console.log(JSON.stringify(res, null, 2));

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
exploreRaw();
