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
    .description("Gestiona el laboratorio/canvas actual con scripts .ptcmd")
    .addHelpText(
      "after",
      `
Ejemplos:
  pt lab status
  pt lab run labs/vlan.ptcmd --dry-run

Formato .ptcmd:
  # Comentarios permitidos
  pt device add R1 2911
  pt device add SW1 2960-24TT
  pt link add R1:g0/0 SW1:g0/1
  pt cmd R1 "show ip interface brief"
  pt verify ping PC1 192.168.10.1

Regla:
  .ptcmd contiene comandos reales de la CLI, uno por línea.
`,
    );

  lab
    .command("status")
    .description("Muestra resumen del laboratorio actual")
    .action(async () => {
      process.stdout.write("\nUsa estos comandos para inspección detallada:\n");
      process.stdout.write("  pt device list\n");
      process.stdout.write("  pt link list\n");
      process.stdout.write("  pt verify ping PC1 <gateway>\n\n");
    });

  lab
    .command("run")
    .description("Ejecuta un script .ptcmd con comandos pt reales")
    .argument("<file>", "Archivo .ptcmd")
    .option("--dry-run", "Mostrar comandos sin ejecutar", false)
    .action(async (file: string, options: any) => {
      const commands = parsePtCmdFile(file);

      if (options.dryRun) {
        process.stdout.write(`\n${chalk.bold("Plan de ejecución")} ${file}\n`);
        commands.forEach((argv, index) => {
          process.stdout.write(`  ${index + 1}. ${argv.join(" ")}\n`);
        });
        process.stdout.write("\n");
        return;
      }

      process.stderr.write("pt lab run solo soporta --dry-run en esta versión.\n");
      process.stderr.write("Usa: pt lab run <file.ptcmd> --dry-run\n");
      process.exitCode = 2;
    });

  return lab;
}