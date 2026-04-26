#!/usr/bin/env bun
import { Command } from "commander";
import { readFileSync } from "fs";
import chalk from "chalk";
import { loadLabYaml, validateLabSafe, toLabSpec, type LabSpec } from "../../contracts/lab-spec";
import { compileLabIntent, type NetworkLabIntent } from "@cisco-auto/network-intent";
import { createDefaultPTController } from "@cisco-auto/pt-control/controller";

function labSpecToNetworkIntent(spec: LabSpec): NetworkLabIntent {
  return {
    name: spec.metadata.name,
    devices: spec.devices.map(d => ({
      name: d.hostname,
      model: d.model ?? "generic",
      role: (d.role ?? "core") as "core" | "access" | "edge-router" | "services" | "client" | "wireless-ap" | "wlc",
    })),
  };
}

interface StepResult {
  device: string;
  command: string;
  ok: boolean;
  raw: string;
}

export function createLabApplyCommand(): Command {
  return new Command("apply")
    .description("Aplicar laboratorio desde archivo YAML")
    .argument("<yaml-file>", "Archivo YAML del laboratorio")
    .option("--dry-run", "Solo validar sin ejecutar")
    .option("--rollback", "Habilitar rollback automático")
    .action(async (yamlFile: string, options: { dryRun?: boolean; rollback?: boolean }) => {
      const controller = createDefaultPTController();

      try {
        const content = readFileSync(yamlFile, "utf-8");
        
        const parsedLab = loadLabYaml(yamlFile);
        const validation = validateLabSafe(parsedLab);
        
        if (!validation.success) {
          console.error("❌ Validación falló:");
          validation.errors?.forEach(e => console.error(`  - ${e}`));
          process.exit(1);
        }
        
        if (validation.warnings && validation.warnings.length > 0) {
          console.warn("⚠️ Warnings:");
          validation.warnings.forEach(w => console.warn(`  - ${w}`));
        }
        
        const spec = toLabSpec(parsedLab);
        
        console.log(`📋 Plan: ${spec.metadata.name}`);
        console.log(`   Dispositivos: ${spec.devices.length}`);
        console.log(`   Conexiones: ${spec.connections.length}`);
        
        if (options.dryRun) {
          console.log("\n🔍 Dry-run - mostrando dispositivos:");
          spec.devices.forEach(device => {
            console.log(`   ${device.hostname}> ${device.type}`);
          });
          return;
        }

        const intent = labSpecToNetworkIntent(spec);
        const plan = compileLabIntent(intent);

        console.log(`\n🚀 Ejecutando plan (${plan.configSteps.length} pasos)...`);

        await controller.start();

        const results: StepResult[] = [];

        for (const step of plan.configSteps) {
          if (!step.device) continue;
          console.log(`[${step.device}] ${step.command}`);
          try {
            const result = await controller.execIos(step.device, step.command);
            const ok = result.ok ?? true;
            if (!ok) {
              console.error(`   ❌ Error: ${result.raw?.slice(0, 100)}`);
            }
            results.push({ device: step.device, command: step.command, ok, raw: result.raw ?? "" });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`   ❌ Excepción: ${msg}`);
            results.push({ device: step.device, command: step.command, ok: false, raw: msg });
          }
        }

        if (plan.verificationSteps.length > 0) {
          console.log(chalk.cyan("\n✅ Verificando..."));
          for (const step of plan.verificationSteps) {
            if (!step.device) continue;
            console.log(`[VERIF] [${step.device}] ${step.command}`);
            try {
              const result = await controller.execIos(step.device, step.command);
              const raw = result.raw ?? "";

              if (step.verify?.includes) {
                const missing = (step.verify.includes as string[]).filter(term => !raw.includes(term));
                if (missing.length > 0) {
                  console.error(`   ❌ Verificación falló: falta "${missing[0]}"`);
                } else {
                  console.log(chalk.green(`   ✅ Verificación pasada`));
                }
              }

              results.push({ device: step.device, command: step.command, ok: true, raw });
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              console.error(`   ❌ Excepción: ${msg}`);
              results.push({ device: step.device, command: step.command, ok: false, raw: msg });
            }
          }
        }

        await controller.stop();

        const failed = results.filter(r => !r.ok).length;
        if (failed > 0) {
          console.log(chalk.red(`\n❌ ${failed} pasos fallaron`));
          process.exit(1);
        } else {
          console.log(chalk.green("\n✅ Laboratorio aplicado exitosamente"));
        }
        
      } catch (e: unknown) {
        await controller.stop().catch(() => {});
        console.error(`❌ Error: ${e}`);
        process.exit(1);
      }
    });
}
