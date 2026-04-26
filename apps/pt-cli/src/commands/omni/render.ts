import { writeFileSync } from "node:fs";
import chalk from "chalk";
import type { OmniCliResult } from "./types.js";

export function printOmniResult(
  result: OmniCliResult,
  options: {
    json?: boolean;
    raw?: boolean;
    quiet?: boolean;
    save?: string;
  },
): void {
  if (options.save) {
    writeFileSync(options.save, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  }

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (options.raw) {
    if (result.value === undefined || result.value === null) {
      process.stdout.write("");
    } else if (typeof result.value === "string") {
      process.stdout.write(`${result.value}\n`);
    } else {
      process.stdout.write(`${JSON.stringify(result.value, null, 2)}\n`);
    }
    return;
  }

  if (options.quiet) return;

  process.stdout.write("\n");

  if (result.ok) {
    process.stdout.write(`${chalk.green("✓")} Omni ejecutado correctamente\n`);
  } else {
    process.stdout.write(`${chalk.red("✗")} Omni falló\n`);
  }

  process.stdout.write(`Acción: ${result.action}\n`);
  if (result.capabilityId) process.stdout.write(`Capability: ${result.capabilityId}\n`);
  process.stdout.write(`Riesgo: ${result.risk}\n`);
  process.stdout.write(`Confianza: ${Math.round(result.confidence * 100)}%\n`);

  if (result.warnings.length > 0) {
    process.stdout.write("\nWarnings:\n");
    for (const warning of result.warnings) {
      process.stdout.write(`  ${chalk.yellow("⚠")} ${warning}\n`);
    }
  }

  if (result.error) {
    process.stdout.write("\nError:\n");
    process.stdout.write(`  ${result.error.code ?? "OMNI_ERROR"}: ${result.error.message}\n`);
  }

  if (result.value !== undefined) {
    process.stdout.write("\nResultado:\n");
    process.stdout.write("────────────────────────────────────────\n");
    if (typeof result.value === "string") {
      process.stdout.write(`${result.value}\n`);
    } else {
      process.stdout.write(`${JSON.stringify(result.value, null, 2)}\n`);
    }
    process.stdout.write("────────────────────────────────────────\n");
  }

  if (options.save) {
    process.stdout.write(`\nGuardado en: ${options.save}\n`);
  }

  if (result.nextSteps.length > 0) {
    process.stdout.write("\nSiguientes pasos:\n");
    for (const step of result.nextSteps) {
      process.stdout.write(`  ${step}\n`);
    }
  }

  process.stdout.write("\n");
}
