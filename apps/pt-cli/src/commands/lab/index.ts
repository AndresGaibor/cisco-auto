#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { ScenarioService, createDefaultPTController } from "@cisco-auto/pt-control";

export function createLabCommand(): Command {
  const cmd = new Command("lab").description("Gestor de laboratorios CCNA interactivos");

  cmd
    .command("scenario <id>")
    .description("Inicia un escenario CCNA específico (1-76)")
    .action(async (id: string) => {
      const controller = createDefaultPTController();
      const scenarios = new ScenarioService((controller as any).bridge);
      try {
        await controller.start();
        await scenarios.startScenario(parseInt(id, 10));
        console.log(chalk.green(`\n✅ Escenario ${id} preparado en Packet Tracer.`));
        console.log(
          chalk.yellow(`\n💡 Sugerencia: Usa "pt lab validate ${id}" para revisar tu progreso.`),
        );
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error al iniciar escenario: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  cmd
    .command("force <id>")
    .description("Inyecta un escenario CCNA de forma atómica (Bypass total de bloqueos)")
    .action(async (id: string) => {
      const controller = createDefaultPTController();
      const scenarios = new ScenarioService((controller as any).bridge);
      try {
        await controller.start();
        await scenarios.forceScenario(parseInt(id, 10));
        console.log(chalk.bold.green(`\n✅ Escenario ${id} inyectado exitosamente.`));
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error en inyección forzada: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  cmd
    .command("list")
    .description("Lista escenarios CCNA disponibles (1-8)")
    .action(async () => {
      const scenarios = [
        { id: 1, name: "LAN mínima", desc: "2 PCs + 1 switch, conectividad básica" },
        { id: 2, name: "APR learning", desc: "3 PCs + 1 switch, tabla ARP" },
        { id: 3, name: "Router entre redes", desc: "Router + 2 PCs, redes separadas" },
        { id: 4, name: "Gateway mal configurado", desc: "Detectar fallo de gateway" },
        { id: 5, name: "Máscara incorrecta", desc: "Detectar error de subnetting" },
        { id: 6, name: "IP duplicada", desc: "Detectar conflicto de IP" },
        { id: 7, name: "Switch documentado", desc: "Hostname y descripciones" },
        { id: 8, name: "Subnetting básico", desc: "Dos LANs con /26" },
      ];
      console.log("\n📚 Escenarios CCNA (1-8):");
      scenarios.forEach((s) => console.log(`  ${s.id}. ${s.name} — ${s.desc}`));
      console.log("");
    });

  cmd
    .command("validate <id>")
    .description("Valida el cumplimiento del escenario CCNA")
    .action(async (id: string) => {
      const controller = createDefaultPTController();
      const scenarios = new ScenarioService((controller as any).bridge);
      try {
        await controller.start();
        console.log(chalk.bold.magenta("\n🔍 EJECUTANDO PLANTILLA UNIVERSAL DE VALIDACIÓN..."));

        const result = await scenarios.validateScenario(parseInt(id, 10));

        console.log(chalk.cyan("\n📡 CAPA 1: FÍSICA"));
        result.details.physical.forEach((d) => console.log(`  - ${d}`));

        console.log(chalk.cyan("\n📦 CAPA 2: ENLACE"));
        result.details.layer2.forEach((d) => console.log(`  - ${d}`));

        console.log(chalk.cyan("\n🌐 CAPA 3: RED"));
        result.details.layer3.forEach((d) => console.log(`  - ${d}`));

        console.log(chalk.cyan("\n🛠️  SERVICIOS"));
        result.details.services.forEach((d) => console.log(`  - ${d}`));

        const statusColor = result.status === "PASS" ? chalk.green : chalk.red;
        console.log(statusColor(`\n🏁 RESULTADO FINAL: ${result.status}`));
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error de validación: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  return cmd;
}
