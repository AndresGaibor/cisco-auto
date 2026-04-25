#!/usr/bin/env bun
import { Command } from "commander";
import { readFileSync } from "fs";
import chalk from "chalk";
import { loadLabYaml, validateLabSafe, toLabSpec, type LabSpec } from "../../contracts/lab-spec";
import { compileLabIntent, type NetworkLabIntent } from "@cisco-auto/network-intent";
import { createDefaultPTController } from "@cisco-auto/pt-control";

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

export function createLabVerifyCommand(): Command {
  return new Command("verify-yaml")
    .description("Verificar laboratorio aplicado")
    .argument("<yaml-file>", "Archivo YAML del laboratorio")
    .action(async (yamlFile: string) => {
      const controller = createDefaultPTController();

      try {
        const parsedLab = loadLabYaml(yamlFile);
        const validation = validateLabSafe(parsedLab);
        
        if (!validation.success) {
          console.error("❌ Validación falló:");
          validation.errors?.forEach(e => console.error(`  - ${e}`));
          process.exit(1);
        }
        
        const spec = toLabSpec(parsedLab);
        
        console.log(`🔍 Verificando: ${spec.metadata.name}`);
        console.log(`   Dispositivos: ${spec.devices.length}`);
        console.log(`   Conexiones: ${spec.connections.length}`);
        
        const intent = labSpecToNetworkIntent(spec);
        const plan = compileLabIntent(intent);

        if (plan.verificationSteps.length === 0) {
          console.log(chalk.yellow("\n⚠️ No hay pasos de verificación definidos en el laboratorio"));
          return;
        }

        console.log(chalk.cyan(`\n🔬 Ejecutando ${plan.verificationSteps.length} verificaciones...`));

        await controller.start();

        let passed = 0;
        let failed = 0;

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
                failed++;
              } else {
                console.log(chalk.green(`   ✅ Verificación pasada`));
                passed++;
              }
            } else {
              console.log(chalk.gray(`   ℹ️ Sin criterios de verificación definidos`));
              passed++;
            }
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error(`   ❌ Excepción: ${msg}`);
            failed++;
          }
        }

        await controller.stop();

        if (failed > 0) {
          console.log(chalk.red(`\n❌ ${failed} verificaciones fallaron, ${passed} pasaron`));
          process.exit(1);
        } else {
          console.log(chalk.green(`\n✅ Todas las verificaciones pasaron (${passed})`));
        }
        
      } catch (e: unknown) {
        await controller.stop().catch(() => {});
        console.error(`❌ Error: ${e}`);
        process.exit(1);
      }
    });
}
