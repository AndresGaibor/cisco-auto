#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function checkPower() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n⚡ VERIFICANDO ESTADO DE ENERGÍA DE LOS EQUIPOS...");

    const exploit = `
        (function() {
            var net = ipc.network();
            var count = net.getDeviceCount();
            var results = [];
            for(var i=0; i<count; i++) {
                var d = net.getDeviceAt(i);
                results.push(d.getName() + ":::Power:" + d.getPower() + ":::Model:" + d.getModel());
            }
            return results.join("|||");
        })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    console.log("--------------------------------------------------");
    res.result.split("|||").forEach((r: string) => {
        const [name, pwr, model] = r.split(":::");
        const color = pwr.includes("true") ? "\x1b[32m" : "\x1b[31m";
        console.log(`  ${color}${name.padEnd(20)}\x1b[0m | ${pwr} | ${model}`);
    });
    console.log("--------------------------------------------------");

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
checkPower();
