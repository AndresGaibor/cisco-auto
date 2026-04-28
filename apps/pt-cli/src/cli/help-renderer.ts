#!/usr/bin/env bun
import chalk from "chalk";
import type { PtCommandDefinition, PtCommandGroup } from "./command-definition.js";

const GROUP_LABELS: Record<PtCommandGroup, string> = {
  core: "Base",
  runtime: "Runtime",
  lab: "Laboratorio",
  topology: "Topología",
  terminal: "Terminal universal",
  configuration: "Configuración API/GUI",
  verification: "Validación",
  debug: "Diagnóstico avanzado",
};

const GROUP_ORDER: PtCommandGroup[] = [
  "core",
  "lab",
  "topology",
  "terminal",
  "configuration",
  "verification",
  "runtime",
  "debug",
];

export function renderRootHelp(commands: PtCommandDefinition[]): string {
  const publicCommands = commands.filter((command) => !command.hidden && !command.legacy);

  const lines: string[] = [];
  lines.push("");
  lines.push(chalk.bold.cyan("PT Control — CLI profesional para Cisco Packet Tracer"));
  lines.push("");
  lines.push(chalk.bold("Uso:"));
  lines.push("  pt <comando> [subcomando] [args] [flags]");
  lines.push("");

  for (const group of GROUP_ORDER) {
    const groupCommands = publicCommands.filter((command) => command.group === group);
    if (groupCommands.length === 0) continue;

    lines.push(chalk.bold.underline(`${GROUP_LABELS[group]}:`));
    for (const command of groupCommands) {
      const aliases = command.aliases ? ` (${command.aliases.join(", ")})` : "";
      lines.push(`  ${chalk.green(command.name)}${aliases.padEnd(15 - command.name.length)} ${command.summary}`);
    }
    lines.push("");
  }

  lines.push(chalk.bold.underline("Ejemplos rápidos:"));
  lines.push(`  ${chalk.cyan("pt doctor")}                           Verificar entorno`);
  lines.push(`  ${chalk.cyan('pt cmd R1 "show ip int br"')}       Ver interfaces`);
  lines.push(`  ${chalk.cyan("pt device list --json")}                Lista JSON`);
  lines.push(`  ${chalk.cyan("pt link suggest PC1 SW1")}              Sugerir puertos`);
  lines.push(`  ${chalk.cyan("pt verify ping PC1 192.168.1.1")}      Validar conectividad`);
  lines.push("");
  
  lines.push(chalk.bold.underline("Ayuda:"));
  lines.push(`  ${chalk.yellow("pt <comando> --help")}               Ayuda de un comando`);
  lines.push(`  ${chalk.yellow("pt <comando> <sub> --help")}         Ayuda de subcomando`);
  lines.push(`  ${chalk.yellow("pt doctor")}                         Diagnóstico completo`);
  lines.push("");

  return lines.join("\n");
}

export function renderCommandExamples(def: PtCommandDefinition): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(chalk.bold(def.name));
  lines.push(def.description);
  lines.push("");

  if (def.examples.length > 0) {
    lines.push(chalk.bold("Ejemplos:"));
    for (const example of def.examples) {
      lines.push(`  ${example.command}`);
      lines.push(`    ${example.description}`);
    }
    lines.push("");
  }

  if (def.agentHints.length > 0) {
    lines.push(chalk.bold("Notas para agentes autónomos:"));
    for (const hint of def.agentHints) {
      lines.push(`  - ${hint}`);
    }
    lines.push("");
  }

  if (def.related.length > 0) {
    lines.push(chalk.bold("Comandos relacionados:"));
    for (const related of def.related) {
      lines.push(`  ${related}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
