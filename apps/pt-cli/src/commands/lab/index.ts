#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { Command } from "commander";
import chalk from "chalk";

function parsePtCmdFile(path: string): string[][] {
  const content = readFileSync(path, "utf-8");

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      if (!line.startsWith("pt ")) {
        throw new Error(`Línea inválida en ${path}: "${line}". Cada línea debe iniciar con "pt ".`);
      }

      return line.split(/\s+/);
    });
}

export function createLabCommand(): Command {
  const lab = new Command("lab")
    .description("Gestiona el laboratorio/canvas actual sin YAML")
    .addHelpText(
      "after",
      `
Ejemplos:
  pt lab status
  pt lab clear
  pt lab run labs/vlan.ptcmd
  pt lab report
  pt lab grade

Formato .ptcmd:
  # Comentarios permitidos
  pt device add R1 2911
  pt device add SW1 2960-24TT
  pt link add R1:g0/0 SW1:g0/1
  pt cmd R1 "show ip interface brief"
  pt verify all

Regla:
  .ptcmd contiene comandos reales de la CLI, no YAML.
`,
    );

  lab
    .command("status")
    .description("Muestra resumen del laboratorio actual")
    .action(async () => {
      process.stdout.write("\nUsa estos comandos para inspección detallada:\n");
      process.stdout.write("  pt device list\n");
      process.stdout.write("  pt link list\n");
      process.stdout.write("  pt verify all\n\n");
    });

  lab
    .command("clear")
    .description("Limpia el canvas/lab actual")
    .option("--yes", "Confirmar limpieza")
    .action(async (options) => {
      if (!options.yes) {
        process.stderr.write("Operación destructiva. Ejecuta: pt lab clear --yes\n");
        process.exitCode = 2;
        return;
      }

      process.stderr.write("TODO: conectar con controller.clearTopology() o bridge equivalente.\n");
      process.stderr.write("Criterio: debe borrar dispositivos/enlaces y devolver JSON con conteos.\n");
    });

  lab
    .command("run")
    .description("Ejecuta un script .ptcmd con comandos pt reales")
    .argument("<file>", "Archivo .ptcmd")
    .option("--dry-run", "Mostrar comandos sin ejecutar", false)
    .action(async (file: string, options) => {
      const commands = parsePtCmdFile(file);

      if (options.dryRun) {
        process.stdout.write(`\n${chalk.bold("Plan de ejecución")} ${file}\n`);
        commands.forEach((argv, index) => {
          process.stdout.write(`  ${index + 1}. ${argv.join(" ")}\n`);
        });
        process.stdout.write("\n");
        return;
      }

      process.stderr.write("Ejecución .ptcmd recomendada para fase siguiente:\n");
      process.stderr.write("  1. Crear runner interno que invoque createProgram().parseAsync(['bun','pt',...])\n");
      process.stderr.write("  2. Continuar aunque un comando falle si se pasa --continue-on-error\n");
      process.stderr.write("  3. Guardar reporte en logs/lab-runs/<timestamp>.json\n");
      process.stderr.write("\nComandos parseados:\n");
      for (const argv of commands) {
        process.stderr.write(`  ${argv.join(" ")}\n`);
      }
    });

  lab
    .command("report")
    .description("Genera reporte del lab actual")
    .action(() => {
      process.stdout.write("TODO: agregar reporte combinando pt device list, pt link list y pt verify all.\n");
    });

  lab
    .command("grade")
    .description("Califica el lab actual con verificaciones disponibles")
    .action(() => {
      process.stdout.write("TODO: usar pt verify all y producir score 0-100 con evidencias.\n");
    });

  return lab;
}