#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import * as fs from "fs";
import { ScenarioService } from "@cisco-auto/pt-control/services";
import { createDefaultPTController } from "@cisco-auto/pt-control/controller";
import { createLabListCommand } from "./list";
import { createLabCreateCommand } from "./create";
import { createLabLiftCommand } from "./lift";
import { createLabValidateCommand } from "./validate";
import { createLabInteractiveCommand } from "./interactive";
import { createLabParseCommand } from "./parse";
import { createLabPipelineCommand } from "./pipeline";
import { createAuditCommand } from "./audit";
import { createLabApplyCommand } from "./apply";
import { createLabVerifyCommand } from "./verify";
import { createLabDiagnoseCommand } from "./lab-diagnose";

export function createLabCommand(): Command {
  const cmd = new Command("lab")
    .description("Gestor de laboratorios CCNA y automatización de topologías");

  // --- ESCENARIOS CCNA (Inline) ---
  
  cmd
    .command("scenario <id>")
    .description("Inicia un escenario CCNA específico (1-76)")
    .action(async (id: string) => {
      const scenarioMap: Record<string, string> = {
        '1': '../../labs/lan-basica.yaml',
        '2': '../../labs/arp-learning.yaml',
        '3': '../../labs/router-between-nets.yaml',
        '4': '../../labs/gateway-misconfig.yaml',
        '5': '../../labs/mask-misconfig.yaml',
        '6': '../../labs/ip-duplicate.yaml',
        '7': '../../labs/switch-documented.yaml',
        '8': '../../labs/subnetting-basic.yaml',
      };
      
      const file = scenarioMap[id];
      if (!file) {
        console.error(chalk.red(`\n❌ Escenario ${id} no mapeado.`));
        return;
      }

      console.log(chalk.cyan(`🚀 Iniciando Escenario ${id} desde ${file}...`));
      
      const controller = createDefaultPTController();
      try {
        await controller.start();
        // Cargar el archivo y usar el deployer interno
        const content = fs.readFileSync(file, 'utf-8');
        // TODO: Implementar lógica de despliegue aquí o llamar al comando deploy
        console.log(chalk.green(`\n✅ Archivo ${file} cargado.`));
        console.log(chalk.yellow(`\n💡 Próximamente: Inyección automática de topología.`));
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error: ${e.message}`));
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
    .command("scenarios")
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
    .command("verify <id>")
    .description("Valida el cumplimiento del escenario CCNA")
    .action(async (id: string) => {
      const controller = createDefaultPTController();
      const scenarios = new ScenarioService((controller as any).bridge);
      try {
        await controller.start();
        console.log(chalk.bold.magenta("\n🔍 EJECUTANDO PLANTILLA UNIVERSAL DE VALIDACIÓN..."));

        const result = await scenarios.validateScenario(parseInt(id, 10));

        console.log(chalk.cyan("\n📡 CAPA 1: FÍSICA"));
        result.details.physical.forEach((d: string) => console.log(`  - ${d}`));

        console.log(chalk.cyan("\n📦 CAPA 2: ENLACE"));
        result.details.layer2.forEach((d: string) => console.log(`  - ${d}`));

        console.log(chalk.cyan("\n🌐 CAPA 3: RED"));
        result.details.layer3.forEach((d: string) => console.log(`  - ${d}`));

        console.log(chalk.cyan("\n🛠️  SERVICIOS"));
        result.details.services.forEach((d: string) => console.log(`  - ${d}`));

        const statusColor = result.status === "PASS" ? chalk.green : chalk.red;
        console.log(statusColor(`\n🏁 RESULTADO FINAL: ${result.status}`));
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error de validación: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  // --- GESTIÓN DE ARCHIVOS YAML ---
  
  // Registrar subcomandos desde archivos dedicados
  cmd.addCommand(createLabListCommand());      // Alias: list
  cmd.addCommand(createLabCreateCommand());    // Alias: create
  cmd.addCommand(createLabLiftCommand());      // Alias: lift
  cmd.addCommand(createLabValidateCommand());  // Alias: validate (conflicto potencial, manejado por argumentos)
  cmd.addCommand(createLabInteractiveCommand()); // Alias: interactive | wizard
  cmd.addCommand(createLabParseCommand());     // Alias: parse
  cmd.addCommand(createLabPipelineCommand());  // Alias: pipeline
  cmd.addCommand(createAuditCommand());        // Alias: audit
  cmd.addCommand(createLabApplyCommand());    // Alias: apply
  cmd.addCommand(createLabVerifyCommand());   // Alias: verify-yaml (avoid conflict with lab verify <id>)
  cmd.addCommand(createLabDiagnoseCommand()); // Alias: diagnose

  return cmd;
}
