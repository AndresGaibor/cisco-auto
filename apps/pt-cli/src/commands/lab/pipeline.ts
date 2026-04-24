#!/usr/bin/env bun
/**
 * Comando lab pipeline - Pipeline de validación de laboratorio
 * 
 * Ejecuta un pipeline completo de validación sobre un laboratorio.
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import chalk from 'chalk';
import { createInterface } from 'readline';
import { loadLabYaml, validateLabSafe, toLabSpec, analyzeTopology } from '../../contracts/lab-spec';

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
║              PIPELINE DE VALIDACIÓN DE LAB                   ║
╚══════════════════════════════════════════════════════════════╝
`);
}

/**
 * Ejecuta el pipeline
 */
async function ejecutarPipeline(archivo: string, _autoFix: boolean = false): Promise<void> {
  const rl = null; // Modo interactivo deshabilitado temporalmente
  
  try {
    mostrarBanner();
    
    // Paso 1: Cargar lab
    console.log(chalk.blue('📂 Paso 1: Cargando laboratorio...'));
    const parsedLab = loadLabYaml(archivo);
    const lab = parsedLab.lab;
    console.log(chalk.green(`   ✅ Laboratorio cargado: ${lab?.metadata?.name || 'Lab'}`));
    console.log(`   📊 Dispositivos: ${lab?.topology?.devices?.length || 0}`);
    console.log(`   🔗 Conexiones: ${lab?.topology?.connections?.length || 0}`);
    
    // Paso 2: Validar estructura
    console.log(chalk.blue('\n🔍 Paso 2: Validando estructura...'));
    const validation = validateLabSafe(lab);

    if (validation.success) {
      console.log(chalk.green('   ✅ Validación estructural exitosa'));
    } else {
      console.log(chalk.yellow('   ⚠️  Validación completada con observaciones'));
    }

    // Mostrar errores y warnings
    const errors = validation.errors || [];
    const warnings = validation.warnings || [];

    if (errors.length > 0) {
      console.log(chalk.red(`\n   ❌ Errores encontrados: ${errors.length}`));
      errors.forEach((err, idx) => {
        console.log(chalk.red(`      ${idx + 1}. ${err}`));
      });
    }

    if (warnings.length > 0) {
      console.log(chalk.yellow(`\n   ⚠️  Warnings encontrados: ${warnings.length}`));
      warnings.forEach((warn, idx) => {
        const msg = typeof warn === 'object' ? (warn as any).message : warn;
        console.log(chalk.yellow(`      ${idx + 1}. ${msg}`));
      });
    }

    // Paso 3: Análisis de topología
    console.log(chalk.blue('\n📈 Paso 3: Analizando topología...'));
    const labSpec = toLabSpec(parsedLab);
    const stats = analyzeTopology(labSpec);
    
    console.log(chalk.green('   ✅ Análisis completado'));
    console.log(`   📊 Densidad: ${(stats.density * 100).toFixed(1)}%`);
    console.log(`   🔗 Componentes conectados: ${stats.connectedComponents}`);
    console.log(`   📈 Promedio conexiones/dispositivo: ${stats.avgConnections.toFixed(1)}`);

    if (stats.connectedComponents > 1) {
      console.log(chalk.yellow('\n   ⚠️  La topología tiene múltiples componentes desconectados'));
    }
    
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
    .description('Ejecutar pipeline de validación de laboratorio')
    .argument('<file>', 'Archivo YAML del laboratorio')
    .option('--auto-fix', 'Aplicar correcciones automáticamente sin preguntar', false)
    .action(async (file, options) => {
      await ejecutarPipeline(file, options.autoFix);
    });

  return cmd;
}