#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function forceEnable() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🚀 CONFIGURACIÓN INTELIGENTE (V4 - Model Discovery)...");

    const discovery = `
        (function() {
            var net = ipc.network();
            var count = net.getDeviceCount();
            var targetRouter = null;
            var targetPc = null;
            
            for(var i=0; i<count; i++) {
                var d = net.getDeviceAt(i);
                if (d.getClassName() === "Router" && !targetRouter) targetRouter = d.getName();
                if (d.getClassName() === "Pc" && !targetPc) targetPc = d.getName();
            }
            return { router: targetRouter, pc: targetPc };
        })()
    `;
    const found = await controller.send("__evaluate", { code: discovery });
    console.log(`🔍 Hardware detectado: Router=${found.router}, PC=${found.pc}`);

    if (!found.router) throw new Error("No se encontró ningún Router en el canvas.");

    // Configurar el Router encontrado
    const rConfig = `
        (function() {
            var dev = ipc.network().getDevice('${found.router}');
            var cli = dev.getCommandLine();
            cli.enterCommand("no"); // Exit wizard
            cli.enterCommand("enable");
            cli.enterCommand("conf t");
            cli.enterCommand("interface GigabitEthernet0/0");
            cli.enterCommand("ip address 192.168.1.1 255.255.255.0");
            cli.enterCommand("no shutdown");
            cli.enterCommand("end");
            return "OK";
        })()
    `;
    await controller.send("__evaluate", { code: rConfig });
    console.log(`✅ ${found.router} configurado.`);

    // Configurar PC
    if (found.pc) {
        const pConfig = `
            (function() {
                var dev = ipc.network().getDevice('${found.pc}');
                dev.setIpSubnetMask("192.168.1.10", "255.255.255.0");
                dev.setDefaultGateway("192.168.1.1");
                return "OK";
            })()
        `;
        await controller.send("__evaluate", { code: pConfig });
        console.log(`✅ ${found.pc} configurada.`);
    }

    console.log("\n📡 Verificando LED físico...");
    await new Promise(r => setTimeout(r, 2000));
    const led = await controller.send("__evaluate", { code: "ipc.network().getDevice('${found.router}').getPortAt(0).getLightStatus()" });
    console.log(`LED Status: ${led === 1 ? "🟢 VERDE" : "🔴 ROJO (" + led + ")"}`);

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
forceEnable();
