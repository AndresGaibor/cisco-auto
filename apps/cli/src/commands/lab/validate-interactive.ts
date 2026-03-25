#!/usr/bin/env bun
/**
 * Comando validate-interactive - Validación interactiva de laboratorios
 * 
 * Muestra errores de validación con iconos y sugerencias de fix.
 * Ofrece opción de auto-corregir con confirmación del usuario.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync, writeFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { loadLab } from '../../../../../src/core/parser/yaml-parser.ts';
import { ptValidatePlanTool } from '../../../../../src/tools/topology/validate-plan.ts';
import { ptFixPlanTool } from '../../../../../src/tools/topology/fix-plan.ts';
import type { 
  TopologyPlan, 
  ValidationError, 
  ValidationWarning, 
  FixSuggestion 
} from '../../../../../src/core/types/tool.ts';

/**
 * Interfaz para preguntas interactivas usando readline nativo
 */
function crearReadline() {
  const readline = require('readline');
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Hace una pregunta y retorna la respuesta
 */
function preguntar(rl: ReturnType<typeof crearReadline>, pregunta: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta: string) => {
      resolve(respuesta);
    });
  });
}

/**
 * Cierra el interfaz readline
 */
function cerrarReadline(rl: ReturnType<typeof crearReadline>) {
  rl.close();
}

/**
 * Convierte un Lab a TopologyPlan para validación
 */
function labAPlan(lab: ReturnType<typeof loadLab>['lab']): TopologyPlan {
  // Extraer devices del lab
  const devices = lab.topology.devices.map((device, index) => {
    // Determinar tipo de dispositivo para el modelo
    let deviceType: 'router' | 'switch' | 'multilayer-switch' | 'pc' | 'server' = 'switch';
    if (device.type === 'router') deviceType = 'router';
    else if (device.type === 'server') deviceType = 'server';
    else if (device.type === 'pc') deviceType = 'pc';
    else if (device.type === 'multilayer-switch') deviceType = 'multilayer-switch';

    // Mapear puertos desde connections
    const interfaces: InterfacePlan[] = [];
    
    // Extraer IPs de las conexiones
    if (device.connections) {
      for (const conn of device.connections) {
        if (conn.ip) {
          interfaces.push({
            name: conn.port || `GigabitEthernet0/${index}`,
            ip: conn.ip,
            subnetMask: conn.subnet || '255.255.255.0',
            configured: true
          });
        }
      }
    }

    // Puerto default si no hay conexiones
    if (interfaces.length === 0) {
      interfaces.push({
        name: 'GigabitEthernet0/0',
        configured: false
      });
    }

    return {
      id: device.name || `device-${index}`,
      name: device.name || `Device-${index}`,
      model: {
        name: device.model || 'generic',
        type: deviceType,
        ptType: device.type || 'generic',
        ports: interfaces.map(iface => ({
          name: iface.name,
          type: 'ethernet' as const,
          available: !iface.configured
        }))
      },
      position: { x: 0, y: 0 },
      interfaces,
      credentials: device.credentials ? {
        username: device.credentials.username || 'admin',
        password: device.credentials.password || 'cisco',
        enablePassword: device.credentials.enablePassword
      } : undefined
    };
  });

  // Extraer links desde connections
  const links: LinkPlan[] = [];
  
  if (lab.topology.connections) {
    for (const conn of lab.topology.connections) {
      const fromDevice = devices.find(d => d.name === conn.from);
      const toDevice = devices.find(d => d.name === conn.to);
      
      if (fromDevice && toDevice) {
        links.push({
          id: `link-${fromDevice.id}-${toDevice.id}`,
          from: {
            deviceId: fromDevice.id,
            deviceName: fromDevice.name,
            port: conn.port || 'GigabitEthernet0/0'
          },
          to: {
            deviceId: toDevice.id,
            deviceName: toDevice.name,
            port: conn.port || 'GigabitEthernet0/0'
          },
          cableType: (conn.type as CableTypePlan) || 'auto',
          validated: false
        });
      }
    }
  }

  return {
    id: lab.metadata?.name || 'lab-plan',
    name: lab.metadata?.name || 'Lab Plan',
    description: lab.metadata?.description,
    devices,
    links,
    params: {
      routerCount: devices.filter(d => d.model.type === 'router').length,
      switchCount: devices.filter(d => d.model.type === 'switch' || d.model.type === 'multilayer-switch').length,
      pcCount: devices.filter(d => d.model.type === 'pc').length,
      serverCount: devices.filter(d => d.model.type === 'server').length,
      networkType: 'single_lan'
    }
  };
}

// Importar tipos adicionales de tool.ts
interface InterfacePlan {
  name: string;
  ip?: string;
  subnetMask?: string;
  configured: boolean;
  vlan?: number;
  description?: string;
}

interface LinkPlan {
  id: string;
  from: { deviceId: string; deviceName: string; port: string };
  to: { deviceId: string; deviceName: string; port: string };
  cableType: CableTypePlan;
  validated: boolean;
  errors?: string[];
}

type CableTypePlan = 'straight-through' | 'crossover' | 'fiber' | 'serial' | 'console' | 'auto';

/**
 * Muestra los errores de validación con iconos y colores
 */
function mostrarErrores(errores: ValidationError[]) {
  console.log('\n' + chalk.bold.red('❌ ERRORES DE VALIDACIÓN:'));
  console.log(chalk.red('─'.repeat(50)));
  
  errores.forEach((error, index) => {
    const icono = error.severity === 'critical' ? '🔴' : '❌';
    const severidad = error.severity === 'critical' 
      ? chalk.bgRed.white(' CRÍTICO ') 
      : chalk.red(' error ');
    
    console.log(`\n${icono} ${chalk.bold(`[${index + 1}]`)} ${severidad}`);
    console.log(`   📝 ${error.message}`);
    
    if (error.affected) {
      console.log(`   🎯 Afecta: ${chalk.cyan(error.affected)}`);
    }
    
    if (error.type) {
      console.log(`   🔍 Tipo: ${chalk.gray(error.type)}`);
    }
  });
}

/**
 * Muestra las advertencias de validación
 */
function mostrarWarnings(warnings: ValidationWarning[]) {
  if (warnings.length === 0) return;
  
  console.log('\n' + chalk.bold.yellow('⚠️  ADVERTENCIAS:'));
  console.log(chalk.yellow('─'.repeat(50)));
  
  warnings.forEach((warning, index) => {
    console.log(`\n⚡ ${chalk.bold(`[${index + 1}]`)} ${chalk.yellow(warning.message)}`);
    
    if (warning.affected) {
      console.log(`   🎯 Afecta: ${chalk.cyan(warning.affected)}`);
    }
    
    if (warning.type) {
      console.log(`   🔍 Tipo: ${chalk.gray(warning.type)}`);
    }
  });
}

/**
 * Muestra las sugerencias de fix
 */
function mostrarSugerencias(sugerencias: FixSuggestion[]) {
  if (sugerencias.length === 0) return;
  
  console.log('\n' + chalk.bold.green('💡 SUGERENCIAS DE CORRECCIÓN:'));
  console.log(chalk.green('─'.repeat(50)));
  
  sugerencias.forEach((sugerencia, index) => {
    const autoIcon = sugerencia.autoFixable ? '✅' : '❌';
    console.log(`\n${autoIcon} ${chalk.bold(`[${index + 1}]`)} ${sugerencia.description}`);
    
    if (sugerencia.action) {
      console.log(`   🔧 Acción: ${chalk.gray(sugerencia.action.type)}`);
    }
  });
}

/**
 * Ejecuta la validación de forma interactiva
 */
async function ejecutarValidacionInteractiva(filepath: string): Promise<number> {
  console.log(chalk.bold.cyan('\n🔍 VALIDACIÓN INTERACTIVA DE LABORATORIO'));
  console.log(chalk.cyan('═'.repeat(50)));
  console.log(`\n📂 Archivo: ${chalk.bold(filepath)}`);
  
  // Cargar y parsear el lab
  let parsedLab;
  try {
    parsedLab = loadLab(filepath);
    console.log(`✅ Lab cargado: ${chalk.green(parsedLab.lab.metadata.name)}`);
  } catch (error) {
    console.error(chalk.red(`\n❌ Error al cargar el archivo: ${error instanceof Error ? error.message : error}`));
    return 1;
  }
  
  // Convertir a TopologyPlan para validación
  const plan = labAPlan(parsedLab.lab);
  
  // Ejecutar validación
  console.log('\n⏳ Ejecutando validación...');
  
  const resultadoValidacion = await ptValidatePlanTool.handler({ plan });
  
  if (!resultadoValidacion.success) {
    console.error(chalk.red('\n❌ Error en la validación:'), resultadoValidacion.error);
    return 1;
  }
  
  const datosValidacion = resultadoValidacion.data as { valid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] };
  
  // Mostrar resultados
  if (datosValidacion.valid && datosValidacion.warnings.length === 0) {
    console.log('\n' + chalk.bold.green('✅ LAB VÁLIDO'));
    console.log(chalk.green('─'.repeat(50)));
    console.log(chalk.green('No se encontraron errores de validación.'));
    return 0;
  }
  
  // Mostrar errores
  if (datosValidacion.errors.length > 0) {
    mostrarErrores(datosValidacion.errors);
  }
  
  // Mostrar warnings
  if (datosValidacion.warnings.length > 0) {
    mostrarWarnings(datosValidacion.warnings);
  }
  
  // Obtener sugerencias de fix
  console.log('\n⏳ Analizando posibles correcciones...');
  
  const resultadoFix = await ptFixPlanTool.handler({ plan, applyFixes: false });
  
  let sugerencias: FixSuggestion[] = [];
  let fixesAplicados: FixSuggestion[] = [];
  
  if (resultadoFix.success) {
    const datosFix = resultadoFix.data as { appliedFixes: FixSuggestion[]; remainingErrors: ValidationError[] };
    sugerencias = datosFix.appliedFixes;
    fixesAplicados = datosFix.appliedFixes;
  }
  
  // Mostrar sugerencias
  if (sugerencias.length > 0) {
    mostrarSugerencias(sugerencias);
  }
  
  // Si no hay errores, terminar
  if (datosValidacion.errors.length === 0) {
    console.log('\n' + chalk.bold.green('✅ LAB VÁLIDO (con advertencias)'));
    return 0;
  }
  
  // Preguntar si desea aplicar fixes
  if (sugerencias.length > 0) {
    console.log('\n' + chalk.bold.cyan('─'.repeat(50)));
    console.log(chalk.bold('\n🎯 OPCIONES DE CORRECCIÓN:'));
    console.log(`   ${chalk.green('[1]')} Aplicar correcciones automáticas`);
    console.log(`   ${chalk.yellow('[2]'} Ver detalles de errores`);
    console.log(`   ${chalk.red('[3]'} Salir sin corregir`);
    
    const rl = crearReadline();
    
    try {
      const respuesta = await preguntar(rl, chalk.bold('\n❓ ¿Qué desea hacer? [1/2/3]: '));
      
      if (respuesta.trim() === '1') {
        // Aplicar fixes
        console.log(chalk.cyan('\n⏳ Aplicando correcciones...'));
        
        const resultadoAplicarFix = await ptFixPlanTool.handler({ plan, applyFixes: true });
        
        if (resultadoAplicarFix.success) {
          const datosFixAplicados = resultadoAplicarFix.data as { 
            plan: TopologyPlan; 
            appliedFixes: FixSuggestion[]; 
            remainingErrors: ValidationError[] 
          };
          
          console.log(chalk.green(`\n✅ Se aplicaron ${datosFixAplicados.appliedFixes.length} corrección(es)`));
          
          // Mostrar fixes aplicados
          datosFixAplicados.appliedFixes.forEach((fix, index) => {
            console.log(`   ${index + 1}. ${fix.description}`);
          });
          
          // Guardar archivo corregido
          const archivoCorregido = filepath.replace('.yaml', '-corregido.yaml').replace('.yml', '-corregido.yml');
          
          try {
            // Convertir el plan corregido de vuelta a formato lab
            const labCorregido = convertirPlanALab(datosFixAplicados.plan, parsedLab.lab);
            const yamlCorregido = yaml.dump(labCorregido, { indent: 2, lineWidth: -1 });
            writeFileSync(archivoCorregido, yamlCorregido, 'utf-8');
            
            console.log(chalk.green(`\n💾 Archivo corregido guardado: ${chalk.bold(archivoCorregido)}`));
          } catch (error) {
            console.error(chalk.red(`\n❌ Error al guardar: ${error instanceof Error ? error.message : error}`));
          }
          
          // Mostrar errores restantes
          if (datosFixAplicados.remainingErrors.length > 0) {
            console.log(chalk.yellow(`\n⚠️  ${datosFixAplicados.remainingErrors.length} error(es) no pudieron ser corregidos`));
          }
          
        } else {
          console.error(chalk.red('\n❌ Error al aplicar correcciones'));
        }
      } else if (respuesta.trim() === '2') {
        // Mostrar más detalles
        console.log(chalk.bold('\n📋 DETALLES DE ERRORES:'));
        datosValidacion.errors.forEach((error, index) => {
          console.log(chalk.red(`\n${index + 1}. ${error.message}`));
          console.log(`   Tipo: ${error.type}`);
          console.log(`   Severidad: ${error.severity}`);
          if (error.affected) {
            console.log(`   Afecta: ${error.affected}`);
          }
        });
      }
    } finally {
      cerrarReadline(rl);
    }
  }
  
  return datosValidacion.errors.length > 0 ? 1 : 0;
}

/**
 * Convierte un TopologyPlan de vuelta a formato Lab para guardar
 */
function convertirPlanALab(plan: TopologyPlan, labOriginal: ReturnType<typeof loadLab>['lab']): typeof labOriginal {
  // Actualizar los dispositivos con las correcciones
  const devicesActualizados = plan.devices.map(devicePlan => {
    const deviceOriginal = labOriginal.topology.devices.find(d => d.name === devicePlan.name);
    
    return {
      ...deviceOriginal,
      name: devicePlan.name,
      model: devicePlan.model.name,
      type: devicePlan.model.type,
      connections: devicePlan.interfaces
        .filter(iface => iface.configured && iface.ip)
        .map(iface => ({
          to: '',
          port: iface.name,
          ip: iface.ip,
          subnet: iface.subnetMask
        })),
      credentials: devicePlan.credentials ? {
        username: devicePlan.credentials.username,
        password: devicePlan.credentials.password,
        enablePassword: devicePlan.credentials.enablePassword
      } : undefined
    };
  });
  
  // Actualizar conexiones
  const conexionesActualizadas = plan.links.map(link => ({
    from: link.from.deviceName,
    to: link.to.deviceName,
    port: link.from.port,
    type: link.cableType
  }));
  
  return {
    ...labOriginal,
    topology: {
      ...labOriginal.topology,
      devices: devicesActualizados,
      connections: conexionesActualizadas
    }
  };
}

export function createLabValidateInteractiveCommand(): Command {
  const cmd = new Command('validate-interactive')
    .alias('validate-i')
    .description('Validar archivo YAML de laboratorio de forma interactiva con sugerencias de fix')
    .argument('<file>', 'Archivo YAML a validar')
    .action(async (file) => {
      const exitCode = await ejecutarValidacionInteractiva(file);
      process.exit(exitCode);
    });
  
  return cmd;
}
