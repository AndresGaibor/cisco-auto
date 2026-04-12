#!/usr/bin/env bun
/**
 * Comando device interactive - Selector interactivo de dispositivos
 * 
 * Implementación local sin dependencias de @cisco-auto/core.
 * Usa catálogo de dispositivos directamente.
 */

import { Command } from 'commander';
import { createInterface } from 'readline';

interface DeviceCatalogEntry {
  name: string;
  type: string;
  ptType: string;
  description: string;
  ports: Array<{ name: string; type: string; speed: string; available: boolean }>;
  portCount: number;
  maxModules: number;
  defaultIOS: string | null;
}

const deviceCatalog: DeviceCatalogEntry[] = [
  {
    name: '1941',
    type: 'router',
    ptType: 'Router-PT',
    description: 'Router Cisco 1941 con 2 puertos GigabitEthernet',
    ports: [
      { name: 'GigabitEthernet0/0', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/1', type: 'gigabitethernet', speed: '1Gbps', available: true }
    ],
    maxModules: 2,
    defaultIOS: '15.1',
    portCount: 2
  },
  {
    name: '2901',
    type: 'router',
    ptType: 'Router-PT',
    description: 'Router Cisco 2901 con 2 puertos GigabitEthernet',
    ports: [
      { name: 'GigabitEthernet0/0', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/1', type: 'gigabitethernet', speed: '1Gbps', available: true }
    ],
    maxModules: 2,
    defaultIOS: '15.1',
    portCount: 2
  },
  {
    name: '2911',
    type: 'router',
    ptType: 'Router-PT',
    description: 'Router Cisco 2911 con 3 puertos GigabitEthernet',
    ports: [
      { name: 'GigabitEthernet0/0', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/1', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/2', type: 'gigabitethernet', speed: '1Gbps', available: true }
    ],
    maxModules: 0,
    defaultIOS: '15.1',
    portCount: 3
  },
  {
    name: '4321',
    type: 'router',
    ptType: 'Router-PT',
    description: 'Router Cisco 4321 con 4 puertos GigabitEthernet',
    ports: [
      { name: 'GigabitEthernet0/0/0', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/0/1', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/0/2', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/0/3', type: 'gigabitethernet', speed: '1Gbps', available: true }
    ],
    maxModules: 2,
    defaultIOS: '16.1',
    portCount: 4
  },
  {
    name: '2960-24TT',
    type: 'switch',
    ptType: 'Switch-PT',
    description: 'Switch Cisco 2960 con 24 puertos FastEthernet y 2 puertos GigabitEthernet',
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        name: `FastEthernet0/${i}`,
        type: 'fastethernet',
        speed: '100Mbps',
        available: true
      })),
      { name: 'GigabitEthernet0/1', type: 'gigabitethernet', speed: '1Gbps', available: true },
      { name: 'GigabitEthernet0/2', type: 'gigabitethernet', speed: '1Gbps', available: true }
    ],
    maxModules: 0,
    defaultIOS: '15.0',
    portCount: 26
  },
  {
    name: '3560-24PS',
    type: 'multilayer-switch',
    ptType: 'Multilayer Switch-PT',
    description: 'Switch multicapa Cisco 3560 con 24 puertos FastEthernet PoE y 4 puertos GigabitEthernet',
    ports: [
      ...Array.from({ length: 24 }, (_, i) => ({
        name: `FastEthernet0/${i}`,
        type: 'fastethernet',
        speed: '100Mbps',
        available: true
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        name: `GigabitEthernet0/${i + 1}`,
        type: 'gigabitethernet',
        speed: '1Gbps',
        available: true
      }))
    ],
    maxModules: 0,
    defaultIOS: '15.0',
    portCount: 28
  },
  {
    name: 'PC-PT',
    type: 'pc',
    ptType: 'PC-PT',
    description: 'PC genérica con interfaz FastEthernet',
    ports: [
      { name: 'FastEthernet0', type: 'fastethernet', speed: '100Mbps', available: true }
    ],
    maxModules: 0,
    defaultIOS: null,
    portCount: 1
  },
  {
    name: 'Server-PT',
    type: 'server',
    ptType: 'Server-PT',
    description: 'Servidor genérico con interfaz FastEthernet',
    ports: [
      { name: 'FastEthernet0', type: 'fastethernet', speed: '100Mbps', available: true }
    ],
    maxModules: 0,
    defaultIOS: null,
    portCount: 1
  },
  {
    name: 'Laptop-PT',
    type: 'pc',
    ptType: 'Laptop-PT',
    description: 'Laptop genérica con interfaz FastEthernet',
    ports: [
      { name: 'FastEthernet0', type: 'fastethernet', speed: '100Mbps', available: true }
    ],
    maxModules: 0,
    defaultIOS: null,
    portCount: 1
  }
];

function getDevicesByType(type?: string): DeviceCatalogEntry[] {
  if (!type) return deviceCatalog;
  return deviceCatalog.filter(d => d.type === type);
}

function getDeviceDetails(name: string): DeviceCatalogEntry | undefined {
  return deviceCatalog.find(d => d.name === name);
}

function crearReadline() {
  return createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

function preguntar(rl: ReturnType<typeof createInterface>, pregunta: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta: string) => {
      resolve(respuesta);
    });
  });
}

function validarNumero(valor: string, min: number, max: number): number | null {
  const num = parseInt(valor, 10);
  if (isNaN(num) || num < min || num > max) {
    return null;
  }
  return num;
}

function mostrarBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          SELECTOR DE DISPOSITIVOS                           ║
║     Catálogo Cisco Packet Tracer                            ╚══════════════════════════════════════════════════════════════╝
`);
}

async function mostrarDispositivos(tipo?: string): Promise<void> {
  const devices = getDevicesByType(tipo);

  console.log('\n📋 Dispositivos disponibles:\n');
  console.log('─'.repeat(70));

  devices.forEach((device, index) => {
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

async function mostrarDetalles(deviceName: string): Promise<void> {
  const device = getDeviceDetails(deviceName);

  if (!device) {
    console.log(`❌ No se encontró el dispositivo: ${deviceName}`);
    return;
  }

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
  device.ports.forEach((port) => {
    const status = port.available ? '✅' : '❌';
    console.log(`    ${status} ${port.name} (${port.type}, ${port.speed})`);
  });

  console.log('\n');
}

async function ejecutarSelector(): Promise<void> {
  const rl = crearReadline();
  const seleccionados: string[] = [];

  try {
    mostrarBanner();

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

    await mostrarDispositivos(tipo);

    let continuar = true;
    while (continuar) {
      const opcion = await preguntar(rl, '\n  Opciones:\n    [número] Ver detalles\n    [s] Seleccionar dispositivo\n    [q] Salir\n\n  Tu elección: ');

      if (opcion.toLowerCase() === 'q') {
        continuar = false;
      } else if (opcion.toLowerCase() === 's') {
        const deviceName = await preguntar(rl, '  Nombre del dispositivo a seleccionar: ');
        if (deviceName.trim()) {
          seleccionados.push(deviceName.trim());
          console.log(`  ✅ ${deviceName} agregado a la selección`);
        }
      } else {
        const deviceNum = validarNumero(opcion, 1, 50);
        if (deviceNum !== null) {
          const devices = getDevicesByType(tipo);
          if (devices[deviceNum - 1]) {
            const deviceName = devices[deviceNum - 1]!.name;
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

export function createDeviceInteractiveCommand(): Command {
  const cmd = new Command('interactive')
    .alias('i')
    .description('Selector interactivo de dispositivos del catálogo')
    .action(async () => {
      await ejecutarSelector();
    });

  return cmd;
}
