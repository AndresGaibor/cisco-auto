#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function globalWakeUp() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🔥 DESPERTANDO TODA LA INFRAESTRUCTURA...");

    const wakeup = `
        (function() {
            var net = ipc.network();
            var dCount = net.getDeviceCount();
            var logs = [];
            
            for(var i=0; i<dCount; i++) {
                var dev = net.getDeviceAt(i);
                if (dev.getClassName() === "Router" || dev.getClassName() === "Switch") {
                    var cli = dev.getCommandLine();
                    cli.enterCommand("enable");
                    cli.enterCommand("conf t");
                    // Levantamos las primeras 3 interfaces Gigabit
                    cli.enterCommand("interface GigabitEthernet0/0");
                    cli.enterCommand("no shutdown");
                    cli.enterCommand("interface GigabitEthernet0/1");
                    cli.enterCommand("no shutdown");
                    cli.enterCommand("interface GigabitEthernet0/2");
                    cli.enterCommand("no shutdown");
                    cli.enterCommand("end");
                    logs.push(dev.getName() + ": AWAKE");
                }
            }
            return logs.join(", ");
        })()
    `;

    const res = await controller.send("__evaluate", { code: wakeup });
    console.log(`✅ Equipos despertados: ${res.result}`);

    console.log("\n⏳ Esperando 10 segundos para que los enlaces se activen...");
    await new Promise(r => setTimeout(r, 10000));

    console.log("\n🕸️  EXTRAYENDO MAPA DE CONECTIVIDAD FINAL...");
    // Lanzamos el crawler V4 (ahora los links ya no deberían ser opacos)
    const crawlRes = await controller.send("__evaluate", { code: `
        (function() {
            var net = ipc.network();
            var connections = [];
            for(var i=0; i<net.getDeviceCount(); i++) {
                var dev = net.getDeviceAt(i);
                for(var j=0; j<dev.getPortCount(); j++) {
                    var link = dev.getPortAt(j).getLink();
                    if (link) {
                        try {
                            var ep1 = link.getEndPoint1();
                            var ep2 = link.getEndPoint2();
                            var line = ep1.getOwnerDevice().getName() + ":" + ep1.getName() + " ➔ " + 
                                       ep2.getOwnerDevice().getName() + ":" + ep2.getName();
                            if (connections.indexOf(line) === -1) connections.push(line);
                        } catch(e) {}
                    }
                }
            }
            return connections.join("|||");
        })()
    ` });

    if (crawlRes.ok && crawlRes.result) {
        console.log("\n🔗 MAPA DE RED REAL:");
        crawlRes.result.split("|||").forEach((l: string) => console.log(`  🟢 ${l}`));
    } else {
        console.log("\n⚠️  Los enlaces siguen siendo opacos. Esto confirma que el motor protege la topología manual.");
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
globalWakeUp();
