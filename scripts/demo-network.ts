#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function dominateEnvironment() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🌀 DOMINANDO EL ENTORNO DE PACKET TRACER...");

    const ops = [
      { msg: "Desactivando Animaciones", code: "ipc.options().setAnimation(false)" },
      { msg: "Apagando Sonidos", code: "ipc.options().setSound(false)" },
      { msg: "Ocultando Etiquetas de Modelo", code: "ipc.options().setHideDevModelLabel()" },
      { msg: "Forzando Modo de Accesibilidad", code: "ipc.options().setAccessible(true)" },
    ];

    for (const op of ops) {
      process.stdout.write(`  -> ${op.msg}... `);
      const res = await controller.send("__evaluate", { code: op.code });
      console.log(res.ok ? "✅" : "❌");
    }

    console.log("\n✨ ¡REALIDAD ALTERADA! Mira los cambios en Packet Tracer.");
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
dominateEnvironment();
