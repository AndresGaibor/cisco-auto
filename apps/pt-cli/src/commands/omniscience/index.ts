#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { createDefaultPTController } from "@cisco-auto/pt-control";

export function createOmniscienceCommand(): Command {
  const cmd = new Command("omniscience")
    .alias("omni")
    .description("Módulo de Omnisciencia para auditoría, hacking y capability harness");

  cmd
    .command("env")
    .description("Manipula el entorno de realidad de Packet Tracer")
    .option("--no-anim", "Desactiva animaciones")
    .option("--no-sound", "Silencia el simulador")
    .action(async (options) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        await controller.omniscience.setReality({
          animation: options.anim,
          sound: options.sound,
        });
        console.log(chalk.green("\n✨ Modo Turbo Activado."));
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  cmd
    .command("raw <code>")
    .description("Ejecuta JS puro en el motor PT")
    .action(async (code: string) => {
      const controller = createDefaultPTController();
      try {
        await controller.start();
        const res = await controller.omniscience.evaluate(code);
        console.log(chalk.cyan("\n🚀 RESULTADO:"), res);
      } catch (e: any) {
        console.error(chalk.red(`\n❌ Error: ${e.message}`));
      } finally {
        await controller.stop();
      }
    });

  addCapabilityCommands(cmd);
  addMatrixCommands(cmd);
  addRegressionCommands(cmd);

  return cmd;
}

function addCapabilityCommands(cmd: Command): void {
  let omniModule: any;

  async function ensureOmni() {
    if (!omniModule) {
      omniModule = await import("@cisco-auto/pt-control");
    }
    return omniModule;
  }

  const capCmd = new Command("capability");
  capCmd.description("Gestión de capabilities");

  capCmd
    .command("list")
    .description("Listar todas las capabilities")
    .option("-d, --domain <domain>", "Filtrar por dominio")
    .option("-k, --kind <kind>", "Filtrar por tipo")
    .option("-r, --risk <risk>", "Filtrar por riesgo")
    .action(async (opts) => {
      const m = await ensureOmni();
      const caps = opts.domain || opts.kind || opts.risk
        ? m.filterCapabilities({ domain: opts.domain, kind: opts.kind, risk: opts.risk })
        : m.listCapabilities();

      console.log(`\n## Capabilities (${caps.length})\n`);
      for (const cap of caps) {
        console.log(`- ${cap.id} [${cap.kind}] ${cap.risk} (${cap.domain})`);
      }
      console.log("");
    });

  capCmd
    .command("show")
    .description("Mostrar detalle de una capability")
    .argument("<id>", "ID de capability")
    .action(async (id: string) => {
      const m = await ensureOmni();
      const cap = m.getCapability(id);
      if (!cap) {
        console.error(`Capability no encontrada: ${id}`);
        process.exit(1);
      }
      console.log(`\n## ${cap.id}`);
      console.log(`Title: ${cap.title}`);
      console.log(`Domain: ${cap.domain}`);
      console.log(`Kind: ${cap.kind}`);
      console.log(`Risk: ${cap.risk}`);
      console.log(`Description: ${cap.description}`);
      console.log(`Prerequisites: ${cap.prerequisites.length > 0 ? cap.prerequisites.map((p: any) => p.constraint).join(", ") : "none"}`);
      console.log("");
    });

  capCmd
    .command("run")
    .description("Ejecutar una capability")
    .argument("<id>", "ID de capability")
    .action(async (id: string) => {
      const m = await ensureOmni();
      const result = await m.runCapability(id);
      console.log(`\n## Result: ${result.ok ? "OK" : "FAILED"}`);
      console.log(`Capability: ${result.capabilityId}`);
      console.log(`Duration: ${result.durationMs}ms`);
      console.log(`Support Status: ${result.supportStatus}`);
      console.log(`Confidence: ${result.confidence}`);
      if (result.error) console.log(`Error: ${result.error}`);
      if (result.warnings.length > 0) console.log(`Warnings: ${result.warnings.join(", ")}`);
      console.log("");
    });

  cmd.addCommand(capCmd);

  const suiteCmd = new Command("suite");
  suiteCmd.description("Ejecución de suites");

  suiteCmd
    .command("list")
    .description("Listar suites disponibles")
    .action(async () => {
      const m = await ensureOmni();
      const suites = m.listSuites();
      console.log(`\n## Suites (${suites.length})\n`);
      for (const s of suites) {
        console.log(`- ${s.id}: ${s.description}`);
        console.log(`  Risk: ${s.risk}, Duration: ~${s.estimatedDurationMs}ms`);
      }
      console.log("");
    });

  suiteCmd
    .command("run")
    .description("Ejecutar una suite de capabilities")
    .argument("<suite-id>", "ID de la suite")
    .option("-l, --label <label>", "Etiqueta para esta ejecución", "current")
    .option("--baseline", "Marcar como baseline")
    .action(async (suiteId: string, opts) => {
      const m = await ensureOmni();
      const { runRegression } = m;
      const result = await runRegression({ suiteId, label: opts.label, baseline: opts.baseline });
      console.log(`\n## Suite: ${result.suiteId}`);
      console.log(`Label: ${result.label}`);
      console.log(`Total: ${result.total}, Passed: ${result.passed}, Failed: ${result.failed}`);
      console.log(`Duration: ${result.results.reduce((a: number, r: any) => a + r.durationMs, 0)}ms`);
      console.log("");
    });

  cmd.addCommand(suiteCmd);
}

function addMatrixCommands(cmd: Command): void {
  async function ensureOmni() {
    return await import("@cisco-auto/pt-control");
  }

  const matrixCmd = new Command("matrix");
  matrixCmd.description("Support Matrix - estado de soporte de capabilities");

  matrixCmd
    .command("report")
    .description("Generar report de support matrix")
    .option("-d, --domain <domain>", "Filtrar por dominio", "all")
    .option("-s, --suite <suite-id>", "Suite específica")
    .option("-f, --format <format>", "Formato de salida", "table")
    .action(async (opts) => {
      const m = await ensureOmni();
      const result = await m.runMatrix({
        domain: opts.domain === "all" ? undefined : opts.domain,
        suite: opts.suite,
        format: opts.format,
      });
      m.printMatrixReport(result, opts.format);
    });

  cmd.addCommand(matrixCmd);
}

function addRegressionCommands(cmd: Command): void {
  async function ensureOmni() {
    return await import("@cisco-auto/pt-control");
  }

  async function getRegressionRunner() {
    const pt: any = await import("@cisco-auto/pt-control");
    return pt.runRegressionSmoke;
  }

  const regCmd = new Command("regression");
  regCmd.description("Regression testing");

  regCmd
    .command("run")
    .description("Ejecutar smoke regression")
    .option("-l, --label <label>", "Etiqueta")
    .option("--baseline", "Marcar como baseline")
    .action(async (opts) => {
      const reg = await getRegressionRunner();
      const result = await reg.runRegressionSmoke({ label: opts.label, baseline: opts.baseline });
      console.log(`\n## Regression: ${result.label}`);
      console.log(`Total: ${result.total}, Passed: ${result.passed}, Failed: ${result.failed}`);
      console.log("");
    });

  regCmd
    .command("compare")
    .description("Ejecutar regression y comparar con baseline")
    .argument("<suite-id>", "ID de la suite")
    .option("-l, --label <label>", "Etiqueta para esta ejecución", "current")
    .option("-b, --baseline-label <label>", "Label del baseline a comparar", "baseline")
    .option("-f, --format <format>", "Formato de salida", "table")
    .action(async (suiteId: string, opts) => {
      const m = await ensureOmni();
      const { runRegressionWithComparison, printComparisonReport } = await import("@cisco-auto/pt-control");
      const result = await runRegressionWithComparison({
        suite: suiteId,
        label: opts.label,
        baseline: opts.baseline,
      });
      printComparisonReport(result, opts.format);
    });

  cmd.addCommand(regCmd);
}