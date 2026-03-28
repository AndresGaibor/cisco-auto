#!/usr/bin/env bun
/**
 * Comando lab pipeline - Pipeline de integración Plan → Validate → Fix
 * 
 * Ejecuta un pipeline completo de validación y corrección sobre un laboratorio.
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import { createInterface } from 'readline';
import { loadLab } from '@cisco-auto/core';
import { ptValidatePlanTool } from '@cisco-auto/tools';
import { ptFixPlanTool } from '@cisco-auto/tools';

/**
 * Crea interfaz readline
 */
function crearReadline() {
  return createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Hace una pregunta
 */
function preguntar(rl: ReturnType<typeof createInterface>, pregunta: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta: string) => {
      resolve(respuesta);
    });
  });
}

/**
 * Muestra banner del pipeline
 */
function mostrarBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          PIPELINE: PLAN → VALIDATE → FIX                    ║
╚══════════════════════════════════════════════════════════════╝
`);
}

/**
 * Ejecuta el pipeline
 */
async function ejecutarPipeline(archivo: string, autoFix: boolean = false): Promise<void> {
  const rl = autoFix ? null : crearReadline();
  
  try {
    mostrarBanner();
    
    // Paso 1: Cargar plan
    console.log(chalk.blue('📂 Paso 1: Cargando laboratorio...'));
    const { lab } = loadLab(archivo);
    console.log(chalk.green(`   ✅ Laboratorio cargado: ${lab.name}`));
    console.log(`   📊 Dispositivos: ${lab.topology?.devices?.length || 0}`);
    
    // Paso 2: Validar
    console.log(chalk.blue('\n🔍 Paso 2: Validando plan...'));
    const validateResult = await ptValidatePlanTool.handler(
      { plan: lab },
      { logger: console as any, config: { workingDir: process.cwd() } }
    );
    
    if (!validateResult.success) {
      console.log(chalk.yellow('   ⚠️  Validación completada con observaciones'));
    } else {
      console.log(chalk.green('   ✅ Validación exitosa'));
      if (validateResult.data.warnings?.length === 0) {
        console.log(chalk.green('\n✨ El plan está perfecto. No se requieren correcciones.'));
        if (rl) rl.close();
        return;
      }
    }
    
    // Mostrar errores y warnings
    const errors = validateResult.data?.errors || [];
    const warnings = validateResult.data?.warnings || [];
    
    if (errors.length > 0) {
      console.log(chalk.red(`\n   ❌ Errores encontrados: ${errors.length}`));
      errors.forEach((err: any, idx: number) => {
        console.log(chalk.red(`      ${idx + 1}. ${err.message}`));
      });
    }
    
    if (warnings.length > 0) {
      console.log(chalk.yellow(`\n   ⚠️  Warnings encontrados: ${warnings.length}`));
      warnings.forEach((warn: any, idx: number) => {
        console.log(chalk.yellow(`      ${idx + 1}. ${warn.message}`));
      });
    }
    
    // Paso 3: Preguntar si aplicar fixes
    let aplicarFixes = autoFix;
    
    if (!autoFix && rl) {
      const respuesta = await preguntar(rl, chalk.cyan('\n¿Deseas aplicar correcciones automáticas? (s/n): '));
      aplicarFixes = respuesta.toLowerCase() === 's';
    }
    
    if (aplicarFixes) {
      console.log(chalk.blue('\n🔧 Paso 3: Aplicando correcciones...'));
      
      const fixResult = await ptFixPlanTool.handler(
        { plan: lab, autoApply: true },
        { logger: console as any, config: { workingDir: process.cwd() } }
      );
      
      if (fixResult.success) {
        console.log(chalk.green('   ✅ Correcciones aplicadas'));
        
        if (fixResult.data.appliedFixes?.length > 0) {
          console.log(chalk.green(`\n   📝 Fixes aplicados: ${fixResult.data.appliedFixes.length}`));
          fixResult.data.appliedFixes.forEach((fix: any, idx: number) => {
            console.log(chalk.green(`      ${idx + 1}. ${fix.description}`));
          });
        }
        
        // Guardar plan corregido
        const outputFile = archivo.replace('.yaml', '-fixed.yaml');
        writeFileSync(outputFile, JSON.stringify(fixResult.data.fixedPlan, null, 2));
        console.log(chalk.green(`\n💾 Plan corregido guardado en: ${outputFile}`));
      } else {
        console.log(chalk.red('   ❌ No se pudieron aplicar correcciones'));
        console.log(chalk.red(`      ${fixResult.error?.message || 'Error desconocido'}`));
      }
    } else {
      console.log(chalk.yellow('\n⏭️  Correcciones omitidas por el usuario'));
    }
    
    if (rl) rl.close();
    console.log(chalk.green('\n✅ Pipeline completado\n'));
    
  } catch (error) {
    if (rl) rl.close();
    console.error(chalk.red('\n❌ Error en pipeline:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Crea el comando lab pipeline
 */
export function createLabPipelineCommand(): Command {
  const cmd = new Command('pipeline')
    .description('Ejecutar pipeline Plan → Validate → Fix')
    .argument('<file>', 'Archivo YAML del laboratorio')
    .option('--auto-fix', 'Aplicar correcciones automáticamente sin preguntar', false)
    .action(async (file, options) => {
      await ejecutarPipeline(file, options.autoFix);
    });

  return cmd;
}