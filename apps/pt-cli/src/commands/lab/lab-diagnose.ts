#!/usr/bin/env bun
import { Command } from "commander";
import { readFileSync } from "fs";
import chalk from "chalk";
import { loadLabYaml, validateLabSafe, toLabSpec } from "../../contracts/lab-spec";
import { createDiagnosisService } from "@cisco-auto/pt-control";

export function createLabDiagnoseCommand(): Command {
  return new Command("diagnose")
    .description("Diagnosticar problemas en laboratorio")
    .argument("<yaml-file>", "Archivo YAML del laboratorio")
    .option("--symptom <symptom>", "Síntoma específico a diagnosticar")
    .action(async (yamlFile: string, options: { symptom?: string }) => {
      try {
        const parsedLab = loadLabYaml(yamlFile);
        const validation = validateLabSafe(parsedLab);
        
        if (!validation.success) {
          console.error("❌ Validación falló:");
          validation.errors?.forEach(e => console.error(`  - ${e}`));
          process.exit(1);
        }
        
        const spec = toLabSpec(parsedLab);
        const diagnosisService = createDiagnosisService();
        
        console.log(chalk.cyan(`\n🔬 Diagnosticando: ${spec.metadata.name}`));
        
        const symptomType = options.symptom || "no-access";
        const devices = spec.devices.map(d => d.hostname);
        
        const result = await diagnosisService.diagnose([{
          type: symptomType as any,
          devices: devices,
        }]);
        
        if (result.rootCauses.length > 0) {
          console.log(`\n📊 Causas raíz encontradas: ${result.rootCauses.length}`);
          result.rootCauses.forEach((rc, i) => {
            console.log(`\n   ${i + 1}. ${chalk.yellow(rc.category)} en ${rc.device}`);
            console.log(`      ${rc.description}`);
          });
          
          if (result.recommendations.length > 0) {
            console.log(chalk.bold("\n💡 Sugerencias:"));
            result.recommendations.forEach((rec, i) => {
              const riskColor = rec.risk === "high" ? chalk.red : rec.risk === "medium" ? chalk.yellow : chalk.green;
              console.log(`   ${i + 1}. ${rec.description}`);
              console.log(`      Acción: ${rec.action}`);
              console.log(`      Riesgo: ${riskColor(rec.risk)}`);
            });
          }
        } else {
          console.log(chalk.green("\n✅ No se detectaron problemas"));
        }
        
      } catch (e: unknown) {
        console.error(`❌ Error: ${e}`);
        process.exit(1);
      }
    });
}
