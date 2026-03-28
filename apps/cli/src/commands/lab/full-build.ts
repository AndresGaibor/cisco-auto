#!/usr/bin/env bun
/**
 * Comando lab full-build - Pipeline completo con deploy
 * 
 * Ejecuta: Validate → Generate → Deploy (opcional)
 * Soporta modo offline y partial deploy.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createInterface } from 'readline';
import { loadLab } from '@cisco-auto/core';
import { ptValidatePlanTool } from '@cisco-auto/tools';
import { ptGenerateConfigsTool } from '@cisco-auto/tools';
import { ptLiveDeployTool } from '@cisco-auto/tools';

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
 * Verifica si el bridge está disponible
 */
async function verificarBridge(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Muestra banner
 */
function mostrarBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          FULL BUILD PIPELINE                                ║
║     Validate → Generate → Deploy                            ║
╚══════════════════════════════════════════════════════════════╝
`);
}

/**
 * Ejecuta el full build
 */
async function ejecutarFullBuild(
  archivo: string,
  deploy: boolean,
  offline: boolean,
  bridgeUrl: string,
  dispositivos?: string[]
): Promise<void> {
  const rl = crearReadline();
  
  try {
    mostrarBanner();
    
    // Paso 1: Cargar y validar
    console.log(chalk.blue('📂 Paso 1: Cargando laboratorio...'));
    const { lab } = loadLab(archivo);
    console.log(chalk.green(`   ✅ Laboratorio: ${(lab as any).name || 'unnamed'}`));
    
    console.log(chalk.blue('\n🔍 Validando plan...'));
    const validateResult = await ptValidatePlanTool.handler(
      { plan: lab },
      { logger: console as any, config: { workingDir: process.cwd() } }
    );
    
    if (!validateResult.success) {
      console.log(chalk.red('   ❌ Validación fallida'));
      console.log(chalk.red(`      ${(validateResult as any).error?.message || 'Errores encontrados'}`));
      rl.close();
      process.exit(1);
    }
    
    const warnings = (validateResult as any).data?.warnings || [];
    if (warnings.length > 0) {
      console.log(chalk.yellow(`   ⚠️  Warnings: ${warnings.length}`));
    } else {
      console.log(chalk.green('   ✅ Validación exitosa'));
    }
    
    // Paso 2: Generar configuraciones
    console.log(chalk.blue('\n⚙️  Paso 2: Generando configuraciones...'));
    
    const genResult = await ptGenerateConfigsTool.handler(
      { plan: lab },
      { logger: console as any, config: { workingDir: process.cwd() } }
    );
    
    if (!genResult.success) {
      console.log(chalk.red('   ❌ Error generando configuraciones'));
      rl.close();
      process.exit(1);
    }
    
    const configs = (genResult as any).data?.configs || [];
    console.log(chalk.green(`   ✅ Configuraciones generadas: ${configs.length} dispositivos`));
    
    // Mostrar preview
    configs.forEach((config: any) => {
      const lineCount = config.iosConfig?.split('\n').length || 0;
      console.log(`      📄 ${config.deviceName}: ${lineCount} líneas`);
    });
    
    // Paso 3: Deploy (opcional)
    if (deploy && !offline) {
      console.log(chalk.blue(`\n🚀 Paso 3: Verificando bridge...`));
      
      const bridgeAvailable = await verificarBridge(bridgeUrl);
      
      if (!bridgeAvailable) {
        console.log(chalk.yellow(`   ⚠️  Bridge no disponible en ${bridgeUrl}`));
        console.log(chalk.yellow('   💡 Usa --offline para modo sin deploy o inicia el bridge'));
        
        const respuesta = await preguntar(rl, chalk.cyan('\n¿Continuar sin deploy? (s/n): '));
        if (respuesta.toLowerCase() !== 's') {
          rl.close();
          process.exit(0);
        }
      } else {
        console.log(chalk.green('   ✅ Bridge disponible'));
        
        // Filtrar dispositivos si se especificó
        let deployDevices = lab.topology?.devices || [];
        if (dispositivos && dispositivos.length > 0) {
          deployDevices = deployDevices.filter((d: any) => 
            dispositivos.includes(d.name)
          );
          console.log(chalk.blue(`\n📋 Deploy parcial: ${deployDevices.length} dispositivos seleccionados`));
        } else {
          console.log(chalk.blue(`\n📋 Deploy total: ${deployDevices.length} dispositivos`));
        }
        
        // Confirmar deploy
        const confirmar = await preguntar(rl, chalk.yellow('\n¿Confirmar deploy? (s/n): '));
        
        if (confirmar.toLowerCase() === 's') {
          console.log(chalk.blue('\n🚀 Iniciando deploy...'));
          
          // Crear plan filtrado para deploy
          const planParaDeploy = {
            ...lab,
            topology: {
              ...lab.topology,
              devices: deployDevices
            }
          };
          
          const deployResult = await ptLiveDeployTool.handler(
            { 
              plan: planParaDeploy, 
              bridgeUrl,
              dryRun: false 
            },
            { logger: console as any, config: { workingDir: process.cwd() } }
          );
          
          if (deployResult.success) {
            const data = (deployResult as any).data;
            console.log(chalk.green('\n   ✅ Deploy completado'));
            console.log(chalk.green(`      ✅ Exitosos: ${data?.summary?.success || 0}`));
            console.log(chalk.red(`      ❌ Fallidos: ${data?.summary?.failed || 0}`));
            
            if (data?.failed?.length > 0) {
              console.log(chalk.red('\n   Dispositivos con error:'));
              data.failed.forEach((f: any) => {
                console.log(chalk.red(`      ❌ ${f.deviceName}: ${f.error}`));
              });
            }
          } else {
            console.log(chalk.red('\n   ❌ Deploy fallido'));
            console.log(chalk.red(`      ${(deployResult as any).error?.message || 'Error desconocido'}`));
          }
        } else {
          console.log(chalk.yellow('\n⏭️  Deploy cancelado por el usuario'));
        }
      }
    } else if (offline) {
      console.log(chalk.blue('\n💾 Modo offline: Configuraciones guardas localmente'));
    }
    
    rl.close();
    console.log(chalk.green('\n✅ Full build completado\n'));
    
  } catch (error) {
    rl.close();
    console.error(chalk.red('\n❌ Error:'), error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Crea el comando lab full-build
 */
export function createLabFullBuildCommand(): Command {
  const cmd = new Command('full-build')
    .description('Pipeline completo: Validate → Generate → Deploy')
    .argument('<file>', 'Archivo YAML del laboratorio')
    .option('--deploy', 'Incluir paso de deploy', false)
    .option('--offline', 'Modo offline (sin deploy)', false)
    .option('--bridge-url <url>', 'URL del bridge', 'http://localhost:54321')
    .option('--devices <list>', 'Lista de dispositivos para deploy parcial (ej: Router1,Router2)', '')
    .action(async (file, options) => {
      const dispositivos = options.devices ? options.devices.split(',').map((d: string) => d.trim()) : undefined;
      await ejecutarFullBuild(file, options.deploy, options.offline, options.bridgeUrl, dispositivos);
    });

  return cmd;
}