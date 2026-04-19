#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { createDefaultPTController } from "@cisco-auto/pt-control";
import { createDeviceListCommand } from "./list";

export function createDeviceCommand(): Command {
  const cmd = new Command("device")
    .alias("dev")
    .description("Gestión dinámica de dispositivos en el canvas");

  cmd
    .command("add <model> <name>")
    .description("Añade un dispositivo al laboratorio")
    .option("-x, --x <coord>", "Coordenada X", "100")
    .option("-y, --y <coord>", "Coordenada Y", "100")
    .action(async (model, name, options) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        process.stdout.write(chalk.cyan(`🏗️  Desplegando ${name} (${model})... `));

        const res = await (controller as any).bridge.sendCommandAndWait("addDevice", {
          model,
          name,
          x: parseInt(options.x, 10),
          y: parseInt(options.y, 10),
        });

        if (res.ok) {
          console.log(chalk.green("LISTO."));
        } else {
          console.log(chalk.red("ERROR."));
          console.error(chalk.red(`  └─ ${res.error}`));
        }
      } catch (e: any) {
        console.error(chalk.red(`\n💥 Error fatal: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  cmd
    .command("remove <name>")
    .alias("rm")
    .description("Elimina un dispositivo del canvas")
    .action(async (name) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        process.stdout.write(chalk.red(`🗑️  Eliminando ${name}... `));

        // Usamos el borrado seguro que aprendimos
        await controller.omniscience.evaluate(`
            (function() {
                var n = ipc.network();
                var d = n.getDevice('${name}');
                if (d) {
                    var pc = d.getPortCount();
                    for(var i=0; i<pc; i++) {
                        var p = d.getPortAt(i);
                        if (p && p.getLink && p.getLink()) p.getLink().disconnect();
                    }
                    n.removeDevice('${name}');
                    return "DELETED";
                }
                return "NOT_FOUND";
            })()
        `);
        console.log(chalk.green("OK."));
      } catch (e: any) {
        console.error(chalk.red(`\n💥 Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  cmd
    .command("get <name>")
    .description("Obtiene la radiografía completa de un dispositivo (Deep Context)")
    .action(async (name) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        process.stdout.write(chalk.cyan(`🧠 Analizando profundamente ${name}... `));

        const ctx = await controller.omniscience.getDeepDeviceContext(name);
        console.log(chalk.green("ANÁLISIS COMPLETADO.\n"));

        const { genome, interfaces } = ctx;

        // 1. HEADER: HARDWARE
        console.log(chalk.bgMagenta.white.bold(`  --- [ RADIOGRAFÍA DE HARDWARE: ${genome.name.toUpperCase()} ] ---  `));
        console.log(`  ${chalk.gray("Modelo:")}   ${chalk.white(genome.model)}`);
        console.log(`  ${chalk.gray("Serial:")}   ${chalk.white(genome.serialNumber)}`);
        console.log(`  ${chalk.gray("Estado:")}   ${genome.power ? chalk.green("● POWER ON") : chalk.red("○ POWER OFF")}`);
        console.log(`  ${chalk.gray("Posición:")} X:${genome.physicalLocation.x}, Y:${genome.physicalLocation.y}`);

        // 2. SOFTWARE (IOS)
        console.log(chalk.magenta(`\n  🆔 CAPA DE SOFTWARE (IOS):`));
        console.log(`    ${chalk.gray("Hostname:")} ${chalk.cyan(genome.ios.hostname)}`);
        console.log(`    ${chalk.gray("Versión:")}  ${chalk.cyan(genome.ios.version)}`);
        if (genome.ios.passwords.enable) console.log(`    ${chalk.gray("Clave Enb:")} ${chalk.yellow(genome.ios.passwords.enable)}`);
        if (genome.ios.passwords.secret) console.log(`    ${chalk.gray("Cisco Sec:")} ${chalk.yellow(genome.ios.passwords.secret)}`);

        // 3. INTERFACES TABLE
        console.log(chalk.magenta(`\n  🔌 TABLA DE INTERFACES:`));
        const head = `    ${'Interface'.padEnd(18)} ${'State'.padEnd(10)} ${'IP Address'.padEnd(16)} ${'MAC/BIA'.padEnd(18)} ${'Neighbor'}`;
        console.log(chalk.gray(head));
        console.log(chalk.gray(`    ${'-'.repeat(head.length)}`));

        for (const iface of interfaces) {
            const statusColor = iface.status === "UP" ? chalk.green : (iface.status === "NEGOTIATING" ? chalk.yellow : chalk.red);
            const ipStr = iface.logical.ip !== "0.0.0.0" ? chalk.yellow(iface.logical.ip) : chalk.gray("--");
            const neigh = iface.neighbor ? chalk.blue(iface.neighbor) : chalk.gray("--");
            
            console.log(`    ${iface.name.padEnd(18)} ${statusColor(iface.status.padEnd(10))} ${ipStr.padEnd(16)} ${chalk.gray(iface.physical.mac.padEnd(18))} ${neigh}`);
        }

        // 4. CONFIG PREVIEW
        if (genome.ios.runningConfig && genome.ios.runningConfig !== "N/A") {
            console.log(chalk.magenta(`\n  📄 CONFIGURACIÓN ACTUAL (Preview):`));
            const lines = genome.ios.runningConfig.split('\n').slice(0, 10).join('\n    ');
            console.log(chalk.gray(`    ${lines}\n    ... (usar pt show run-config para ver completo)`));
        }

        console.log("");
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error de Omnisciencia: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  cmd.addCommand(createDeviceListCommand());

  return cmd;
}
