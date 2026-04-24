#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function forceEnable() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🚀 CONFIGURACIÓN INTELIGENTE (V5 - Robust Terminal)...");

    // 1. Descubrimiento de hardware
    const devices = await controller.listDevices();
    const router = devices.find(d => d.type === "router");
    const pc = devices.find(d => d.type === "pc" || d.type === "server");

    console.log(`🔍 Hardware detectado: Router=${router?.name || "N/A"}, PC=${pc?.name || "N/A"}`);

    if (!router) throw new Error("No se encontró ningún Router en el canvas.");

    // 2. Configurar el Router usando el motor robusto
    console.log(`⏳ Configurando ${router.name}...`);
    await controller.configIos(router.name, [
        "interface GigabitEthernet0/0",
        "ip address 192.168.1.1 255.255.255.0",
        "no shutdown"
    ], { save: true });
    console.log(`✅ ${router.name} configurado.`);

    // 3. Configurar PC usando el motor robusto
    if (pc) {
        console.log(`⏳ Configurando ${pc.name}...`);
        await controller.configHost(pc.name, {
            ip: "192.168.1.10",
            mask: "255.255.255.0",
            gateway: "192.168.1.1"
        });
        console.log(`✅ ${pc.name} configurada.`);
    }

    console.log("\n📡 Verificando conectividad L3...");
    if (pc) {
        const ping = await controller.sendPing(pc.name, "192.168.1.1");
        if (ping.success) {
            console.log(`✅ PING EXITOSO: ${pc.name} → Gateway (192.168.1.1)`);
            console.log(`   Estadísticas: ${ping.stats?.sent} enviados, ${ping.stats?.received} recibidos (${ping.stats?.lossPercent}% pérdida)`);
        } else {
            console.log(`❌ PING FALLIDO: ${pc.name} → Gateway`);
            console.log(`   Detalles: ${ping.raw}`);
        }
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
forceEnable();
