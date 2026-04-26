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
  lines.push(chalk.bold("PT Control — CLI profesional para Cisco Packet Tracer"));
  lines.push("");
  lines.push("Uso:");
  lines.push("  pt <comando> [subcomando] [args] [flags]");
  lines.push("");
  lines.push("Reglas mentales:");
  lines.push("  pt cmd      Ejecuta comandos dentro de routers, switches, PCs y servers");
  lines.push("  pt set      Cambia propiedades/API/GUI que no son terminal");
  lines.push("  pt device   Crea, lista y modifica dispositivos");
  lines.push("  pt link     Crea y valida cableado");
  lines.push("  pt verify   Comprueba si el laboratorio está bien");
  lines.push("  pt omni     Inspección profunda, fallback experimental y raw eval controlado");
  lines.push("");

  for (const group of GROUP_ORDER) {
    const groupCommands = publicCommands.filter((command) => command.group === group);
    if (groupCommands.length === 0) continue;

    lines.push(chalk.bold(`${GROUP_LABELS[group]}:`));
    for (const command of groupCommands) {
      lines.push(`  ${command.name.padEnd(12)} ${command.summary}`);
    }
    lines.push("");
  }

  lines.push(chalk.bold("Primeros pasos:"));
  lines.push("  pt doctor");
  lines.push("  pt device list");
  lines.push('  pt cmd R1 "show ip interface brief"');
  lines.push('  pt cmd PC1 "ipconfig"');
  lines.push("  pt verify ping PC1 <gateway>");
  lines.push("");
  lines.push(chalk.bold("Ayuda por comando:"));
  lines.push("  pt cmd --help");
  lines.push("  pt set --help");
  lines.push("  pt verify --help");
  lines.push("  pt omni --help");
  lines.push("  pt omni status");
  lines.push("  pt omni raw --help");
  lines.push("");
  lines.push(chalk.bold("Salida para agentes/autómatas:"));
  lines.push("  pt device list --json");
  lines.push('  pt cmd R1 "show version" --json');
  lines.push("  pt verify ping PC1 <gateway> --json");
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