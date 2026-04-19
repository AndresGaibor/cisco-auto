#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function multiuser() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n👥 AUDITANDO SESIONES MULTI-USUARIO...");

    const exploit = `
      (function() {
        try {
            var mum = ipc.multiUserManager();
            return {
                enabled: mum.isMultiuserEnabled(),
                port: mum.getListenPort(),
                clients: mum.getClientCount(),
                name: mum.getLocalName()
            };
        } catch(e) { return "MUM_ERROR: " + e; }
      })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    console.log(JSON.stringify(res.result, null, 2));

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
multiuser();
