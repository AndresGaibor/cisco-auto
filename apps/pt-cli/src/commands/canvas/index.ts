#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { createDefaultPTController } from "@cisco-auto/pt-control";

export function createCanvasCommand(): Command {
  const cmd = new Command("canvas").description(
    "Operaciones globales sobre el lienzo de Packet Tracer",
  );

  cmd
    .command("clear")
    .description("Limpia todos los dispositivos del canvas usando la vía oficial del motor")
    .action(async () => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        process.stdout.write(chalk.cyan("🧹 Limpiando canvas oficialmente... "));

        // Usamos el nuevo handler oficial
        const res = await (controller as any).bridge.sendCommandAndWait("clearCanvas", {});

        if (res.ok) {
          const links = res.linksDeleted ?? 0;
          const devices = res.devicesDeleted ?? 0;
          console.log(chalk.green("OK."));
          console.log(
            chalk.bold.green(
              `\n✅ Canvas limpio: ${links} enlace(s), ${devices} dispositivo(s) eliminado(s).`,
            ),
          );
        } else {
          console.log(
            chalk.red(
              `FALLO. No se pudo limpiar el canvas. Verificá que Packet Tracer esté abierto con el runtime cargado.`,
            ),
          );
        }
      } catch (e: any) {
        console.error(chalk.red(`\n💥 Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  return cmd;
}
