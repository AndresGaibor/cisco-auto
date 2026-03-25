#!/usr/bin/env bun
/**
 * Comando device interactive - Selector interactivo de dispositivos
 * 
 * Muestra el catálogo de dispositivos y permite seleccionar
 * múltiples dispositivos con sus especificaciones.
 */

import { Command } from 'commander';
import { createInterface } from 'readline';
import { ptListDevicesTool } from '../../../../../src/tools/catalog/list-devices.ts';
import { ptGetDeviceDetailsTool } from '../../../../../src/tools/catalog/get-device-details.ts';

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
 * Hace una pregunta y retorna la respuesta
 */
function preguntar(rl: ReturnType<typeof createInterface>, pregunta: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta: string) => {
      resolve(respuesta);
    });
  });
}

/**
 * Valida que el input sea un número válido
 */
function validarNumero(valor: string, min: number, max: number): number | null {
  const num = parseInt(valor, 10);
  if (isNaN(num) || num < min || num > max) {
    return null;
  }
  return num;
}

/**
 * Muestra el banner del selector
 */
function mostrarBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          SELECTOR DE DISPOSITIVOS                           ║
║     Catálogo Cisco Packet Tracer                            ║
╚══════════════════════════════════════════════════════════════╝
`);
}

/**
 * Muestra lista de dispositivos
 */
async function mostrarDispositivos(tipo?: string): Promise<void> {
  const result = await ptListDevicesTool.handler(
    tipo ? { type: tipo } : {},
    { logger: console as any, config: { workingDir: process.cwd() } }
  );

  if (!result.success) {
    console.log('❌ Error al cargar catálogo');
    return;
  }

  const devices = result.data.devices;
  
  console.log('\n📋 Dispositivos disponibles:\n');
  console.log('─'.repeat(70));
  
  devices.forEach((device: any, index: number) => {
    const icono = device.type === 'router' ? '🔴' : 
                  device.type === 'switch' ? '🔵' : 
                  device.type === 'multilayer-switch' ? '🟣' : 
                  device.type === 'pc' ? '💻' : '🖥️';
    
    console.log(`\n  ${index + 1}. ${icono} ${device.name}`);
    console.log(`     Tipo: ${device.type}`);
    console.log(`     Descripción: ${device.description}`);
    console.log(`     Puertos: ${device.portCount}`);
  });
  
  console.log('\n' + '─'.repeat(70));
}

/**
 * Muestra detalles de un dispositivo
 */
async function mostrarDetalles(deviceName: string): Promise<void> {
  const result = await ptGetDeviceDetailsTool.handler(
    { name: deviceName },
    { logger: console as any, config: { workingDir: process.cwd() } }
  );

  if (!result.success) {
    console.log(`❌ No se encontró el dispositivo: ${deviceName}`);
    return;
  }

  const device = result.data.device;
  
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  📱 ${device.name.padEnd(54)} ║
╚══════════════════════════════════════════════════════════════╝
`);
  
  console.log(`  Tipo: ${device.type}`);
  console.log(`  Modelo PT: ${device.ptType}`);
  console.log(`  Descripción: ${device.description}`);
  console.log(`  IOS por defecto: ${device.defaultIOS || 'N/A'}`);
  console.log(`  Módulos máximos: ${device.maxModules || 'N/A'}`);
  
  console.log('\n  📎 Puertos disponibles:');
  device.ports.forEach((port: any) => {
    const status = port.available ? '✅' : '❌';
    console.log(`    ${status} ${port.name} (${port.type}, ${port.speed})`);
  });
  
  console.log('\n');
}

/**
 * Ejecuta el selector interactivo
 */
async function ejecutarSelector(): Promise<void> {
  const rl = crearReadline();
  const seleccionados: string[] = [];

  try {
    mostrarBanner();

    // Preguntar si filtrar por tipo
    console.log('\n  Tipos de dispositivos:');
    console.log('    1. Todos');
    console.log('    2. Routers');
    console.log('    3. Switches');
    console.log('    4. Multilayer Switches');
    console.log('    5. PCs');
    console.log('    6. Servers');
    
    let tipo: string | undefined;
    const tipoStr = await preguntar(rl, '\n  Selecciona tipo (1-6) [1]: ');
    const tipoNum = validarNumero(tipoStr || '1', 1, 6);
    
    switch (tipoNum) {
      case 2: tipo = 'router'; break;
      case 3: tipo = 'switch'; break;
      case 4: tipo = 'multilayer-switch'; break;
      case 5: tipo = 'pc'; break;
      case 6: tipo = 'server'; break;
      default: tipo = undefined;
    }

    // Mostrar dispositivos
    await mostrarDispositivos(tipo);

    // Ciclo de selección
    let continuar = true;
    while (continuar) {
      const opcion = await preguntar(rl, '\n  Opciones:\n    [número] Ver detalles\n    [s] Seleccionar dispositivo\n    [q] Salir\n\n  Tu elección: ');
      
      if (opcion.toLowerCase() === 'q') {
        continuar = false;
      } else if (opcion.toLowerCase() === 's') {
        // Seleccionar dispositivo
        const deviceName = await preguntar(rl, '  Nombre del dispositivo a seleccionar: ');
        if (deviceName.trim()) {
          seleccionados.push(deviceName.trim());
          console.log(`  ✅ ${deviceName} agregado a la selección`);
        }
      } else {
        // Ver detalles
        const deviceNum = validarNumero(opcion, 1, 50);
        if (deviceNum !== null) {
          // Obtener lista para mapear número a nombre
          const result = await ptListDevicesTool.handler(
            tipo ? { type: tipo } : {},
            { logger: console as any, config: { workingDir: process.cwd() } }
          );
          
          if (result.success && result.data.devices[deviceNum - 1]) {
            const deviceName = result.data.devices[deviceNum - 1].name;
            await mostrarDetalles(deviceName);
            
            const agregar = await preguntar(rl, '  ¿Agregar a selección? (s/n): ');
            if (agregar.toLowerCase() === 's') {
              seleccionados.push(deviceName);
              console.log(`  ✅ ${deviceName} agregado a la selección`);
            }
          } else {
            console.log('  ❌ Dispositivo no encontrado');
          }
        } else {
          console.log('  ❌ Opción inválida');
        }
      }
    }

    // Mostrar resumen
    if (seleccionados.length > 0) {
      console.log('\n╔══════════════════════════════════════════════════════════════╗');
      console.log('║           DISPOSITIVOS SELECCIONADOS                        ║');
      console.log('╚══════════════════════════════════════════════════════════════╝');
      seleccionados.forEach((device, idx) => {
        console.log(`  ${idx + 1}. ${device}`);
      });
      
      const guardar = await preguntar(rl, '\n  ¿Guardar selección en archivo? (s/n): ');
      if (guardar.toLowerCase() === 's') {
        const fs = await import('fs');
        const nombreArchivo = await preguntar(rl, '  Nombre del archivo [seleccion.json]: ');
        const archivo = nombreArchivo.trim() || 'seleccion.json';
        
        fs.writeFileSync(archivo, JSON.stringify({
          dispositivos: seleccionados,
          fecha: new Date().toISOString(),
          total: seleccionados.length
        }, null, 2));
        
        console.log(`  ✅ Selección guardada en: ${archivo}`);
      }
    } else {
      console.log('\n  ℹ️  No seleccionaste ningún dispositivo');
    }

    rl.close();
    console.log('\n  👋 ¡Hasta luego!\n');

  } catch (error) {
    rl.close();
    console.error('\n❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * Crea el comando device interactive
 */
export function createDeviceInteractiveCommand(): Command {
  const cmd = new Command('interactive')
    .alias('i')
    .description('Selector interactivo de dispositivos del catálogo')
    .action(async () => {
      await ejecutarSelector();
    });

  return cmd;
}