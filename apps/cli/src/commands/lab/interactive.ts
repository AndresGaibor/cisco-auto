import { Command } from 'commander';
import { createInterface } from 'readline';
import { writeFileSync } from 'fs';
import type { TopologyPlanParams } from '../../../../../src/core/types/tool.ts';

const NETWORK_TYPES = [
  { value: 'single_lan', label: 'LAN Única', description: 'Todos los dispositivos en una sola red' },
  { value: 'multi_lan', label: 'Multi-LAN', description: 'Múltiples segmentos LAN con VLANs' },
  { value: 'star', label: 'Estrella', description: 'Topología en estrella con switch central' },
  { value: 'router_on_a_stick', label: 'Router-on-a-Stick', description: 'Inter-VLAN routing con subinterfaces' },
  { value: 'triangle', label: 'Triángulo', description: 'Redundancia con 3 routers' },
];

const ROUTING_PROTOCOLS = [
  { value: 'static', label: 'Estático', description: 'Rutas estáticas manuales' },
  { value: 'ospf', label: 'OSPF', description: 'Open Shortest Path First' },
  { value: 'eigrp', label: 'EIGRP', description: 'Enhanced Interior Gateway Routing Protocol' },
  { value: 'none', label: 'Sin routing', description: 'Sin protocolo de routing (solo LAN)' },
];

const COMMON_SUBNETS = [
  { value: '255.255.255.0', label: '/24 (254 hosts)' },
  { value: '255.255.255.128', label: '/25 (126 hosts)' },
  { value: '255.255.255.192', label: '/26 (62 hosts)' },
  { value: '255.255.255.224', label: '/27 (30 hosts)' },
  { value: '255.255.255.240', label: '/28 (14 hosts)' },
  { value: '255.255.255.248', label: '/29 (6 hosts)' },
];

function createReadlineInterface() {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl: ReturnType<typeof createInterface>, texto: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(texto, resolve);
  });
}

export function validarNumero(valor: string, min: number, max: number): number | null {
  const num = parseInt(valor, 10);
  if (isNaN(num) || num < min || num > max) {
    return null;
  }
  return num;
}

function ipToLong(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

function longToIp(long: number): string {
  return [(long >>> 24) & 255, (long >>> 16) & 255, (long >>> 8) & 255, long & 255].join('.');
}

function getNextIp(baseIp: string, offset: number): string {
  return longToIp(ipToLong(baseIp) + offset);
}

function printBanner() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║          CISCO-AUTO LAB WIZARD                              ║
║     Creador Interactivo de Laboratorios                     ║
╚══════════════════════════════════════════════════════════════╝
`);
}

function printSection(titulo: string) {
  console.log(`\n📍 ${titulo}`);
  console.log('─'.repeat(50));
}

async function seleccionarOpcion<T extends { value: string; label: string; description: string }>(
  rl: ReturnType<typeof createInterface>,
  opciones: T[],
  pregunta: string
): Promise<string> {
  console.log(`\n${pregunta}`);
  opciones.forEach((op, idx) => {
    console.log(`  ${idx + 1}. ${op.label}`);
    console.log(`     ${op.description}`);
  });

  let seleccion: number | null = null;
  while (seleccion === null) {
    const respuesta = await question(rl, '\n  Selección (número): ');
    seleccion = validarNumero(respuesta, 1, opciones.length);
    if (seleccion === null) {
      console.log('  ⚠️  Opción inválida. Intenta de nuevo.');
    }
  }

  return opciones[seleccion! - 1]!.value;
}

async function runInteractiveWizard(): Promise<{ nombre: string; params: TopologyPlanParams; outputFile: string }> {
  const rl = createReadlineInterface();

  printBanner();

  printSection('Datos del Laboratorio');
  let nombreLab = '';
  while (!nombreLab.trim()) {
    nombreLab = await question(rl, '  Nombre del laboratorio: ');
    if (!nombreLab.trim()) {
      console.log('  ⚠️  El nombre no puede estar vacío.');
    }
  }

  printSection('Topología de Red');
  const networkType = await seleccionarOpcion(
    rl,
    NETWORK_TYPES,
    '¿Qué tipo de topología necesitas?'
  );

  printSection('Dispositivos');
  let routerCount = 1;
  let switchCount = 1;
  let pcCount = 2;
  let serverCount = 0;

  let routersStr = await question(rl, '  Número de routers (1-10) [1]: ');
  if (routersStr.trim()) {
    const parsed = validarNumero(routersStr, 1, 10);
    if (parsed !== null) routerCount = parsed;
    else console.log('  ⚠️  Valor inválido, usando 1.');
  }

  let switchesStr = await question(rl, '  Número de switches (1-10) [1]: ');
  if (switchesStr.trim()) {
    const parsed = validarNumero(switchesStr, 1, 10);
    if (parsed !== null) switchCount = parsed;
    else console.log('  ⚠️  Valor inválido, usando 1.');
  }

  let pcsStr = await question(rl, '  Número de PCs (1-50) [2]: ');
  if (pcsStr.trim()) {
    const parsed = validarNumero(pcsStr, 1, 50);
    if (parsed !== null) pcCount = parsed;
    else console.log('  ⚠️  Valor inválido, usando 2.');
  }

  let serversStr = await question(rl, '  Número de servidores (0-10) [0]: ');
  if (serversStr.trim()) {
    const parsed = validarNumero(serversStr, 0, 10);
    if (parsed !== null) serverCount = parsed;
    else console.log('  ⚠️  Valor inválido, usando 0.');
  }

  printSection('Configuración de Routing');
  const routingProtocol = await seleccionarOpcion(
    rl,
    ROUTING_PROTOCOLS,
    '¿Qué protocolo de routing usar?'
  );

  printSection('DHCP');
  let dhcpRespuesta = await question(rl, '  ¿Habilitar servidor DHCP? (s/n) [s]: ');
  const dhcpEnabled = dhcpRespuesta.toLowerCase() !== 'n';

  let vlans: number[] | undefined;
  if (networkType === 'multi_lan' || networkType === 'router_on_a_stick' || networkType === 'star') {
    printSection('VLANs');
    console.log('  Configura las VLANs para segmentar la red');
    let vlansStr = await question(rl, '  IDs de VLANs (separados por coma, ej: 10,20,30) [10,20]: ');
    if (vlansStr.trim()) {
      vlans = vlansStr.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v) && v > 0 && v <= 4094);
      if (vlans.length === 0) {
        console.log('  ⚠️  VLANs inválidas, usando 10,20 por defecto.');
        vlans = [10, 20];
      }
    } else {
      vlans = [10, 20];
    }
  }

  printSection('Red IP');
  let baseNetwork = '192.168.1.0';
  let subnetMask = '255.255.255.0';

  let networkStr = await question(rl, '  Red base (ej: 192.168.1.0) [192.168.1.0]: ');
  if (networkStr.trim()) {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipRegex.test(networkStr.trim())) {
      baseNetwork = networkStr.trim();
    } else {
      console.log('  ⚠️  Red inválida, usando 192.168.1.0.');
    }
  }

  console.log('\n  Máscaras comunes:');
  COMMON_SUBNETS.forEach((sub, idx) => {
    console.log(`    ${idx + 1}. ${sub.label}`);
  });
  let maskIdx: number | null = null;
  while (maskIdx === null) {
    const maskStr = await question(rl, '  Selección (número) [1]: ');
    if (!maskStr.trim()) {
      maskIdx = 1;
    } else {
      maskIdx = validarNumero(maskStr, 1, COMMON_SUBNETS.length);
    }
    if (maskIdx === null) {
      console.log('  ⚠️  Opción inválida.');
    }
  }
  subnetMask = COMMON_SUBNETS[maskIdx! - 1]!.value;

  printSection('Guardar');
  const nombreArchivo = nombreLab.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  let outputFile = await question(rl, `  Archivo de salida [${nombreArchivo}.yaml]: `);
  if (!outputFile.trim()) {
    outputFile = `${nombreArchivo}.yaml`;
  }
  if (!outputFile.endsWith('.yaml') && !outputFile.endsWith('.yml')) {
    outputFile += '.yaml';
  }

  rl.close();

  return {
    nombre: nombreLab,
    params: {
      routerCount,
      switchCount,
      pcCount,
      serverCount,
      networkType: networkType as TopologyPlanParams['networkType'],
      routingProtocol: routingProtocol as TopologyPlanParams['routingProtocol'],
      dhcpEnabled,
      vlans,
      baseNetwork,
      subnetMask,
    },
    outputFile,
  };
}

export function generarYaml(nombre: string, params: TopologyPlanParams): string {
  let yaml = '';
  let ipOffset = 1;
  const baseIp = params.baseNetwork?.replace(/\.\d+$/, '') || '192.168.1';

  yaml += `# Laboratorio: ${nombre}\n`;
  yaml += `# Generado por Cisco-Auto Lab Wizard\n`;
  yaml += `# Fecha: ${new Date().toISOString()}\n`;
  yaml += `name: ${nombre}\n`;
  yaml += `version: "1.0"\n`;
  yaml += `difficulty: intermediate\n`;
  yaml += `description: "Laboratorio de topología ${params.networkType}"\n`;
  yaml += `author: "Cisco-Auto Wizard"\n`;
  yaml += '\n';
  yaml += `topology:\n`;
  yaml += `  devices:\n`;

  for (let i = 0; i < params.routerCount; i++) {
    const routerIp = `${baseIp}.${ipOffset}`;
    ipOffset++;
    yaml += `    - name: Router${i + 1}\n`;
    yaml += `      type: router\n`;
    yaml += `      model: "2911"\n`;
    yaml += `      hostname: Router${i + 1}\n`;
    yaml += `      management:\n`;
    yaml += `        ip: ${routerIp}\n`;
    yaml += `        subnetMask: ${params.subnetMask}\n`;
    yaml += `        vlan: 1\n`;
    yaml += `      interfaces:\n`;
    yaml += `        - name: GigabitEthernet0/0\n`;
    yaml += `          ip: ${routerIp}\n`;
    yaml += `          subnetMask: ${params.subnetMask}\n`;
    yaml += `          type: gigabitethernet\n`;
    yaml += `          enabled: true\n`;
  }

  for (let i = 0; i < params.switchCount; i++) {
    yaml += `    - name: Switch${i + 1}\n`;
    yaml += `      type: switch\n`;
    yaml += `      model: "2960-24TT"\n`;
    yaml += `      hostname: Switch${i + 1}\n`;
    yaml += `      interfaces:\n`;
    for (let p = 1; p <= 4; p++) {
      yaml += `        - name: FastEthernet0/${p}\n`;
      yaml += `          type: fastethernet\n`;
      yaml += `          enabled: false\n`;
    }
  }

  for (let i = 0; i < params.pcCount; i++) {
    const pcIp = `${baseIp}.${ipOffset}`;
    ipOffset++;
    yaml += `    - name: PC${i + 1}\n`;
    yaml += `      type: pc\n`;
    yaml += `      model: "PC1"\n`;
    yaml += `      hostname: PC${i + 1}\n`;
    yaml += `      management:\n`;
    yaml += `        ip: ${pcIp}\n`;
    yaml += `        subnetMask: ${params.subnetMask}\n`;
    yaml += `        gateway: ${baseIp}.1\n`;
    yaml += `      interfaces:\n`;
    yaml += `        - name: FastEthernet0\n`;
    yaml += `          ip: ${pcIp}\n`;
    yaml += `          subnetMask: ${params.subnetMask}\n`;
    yaml += `          type: fastethernet\n`;
    yaml += `          enabled: true\n`;
  }

  for (let i = 0; i < (params.serverCount || 0); i++) {
    const serverIp = `${baseIp}.${ipOffset}`;
    ipOffset++;
    yaml += `    - name: Server${i + 1}\n`;
    yaml += `      type: server\n`;
    yaml += `      model: "Server"\n`;
    yaml += `      hostname: Server${i + 1}\n`;
    yaml += `      management:\n`;
    yaml += `        ip: ${serverIp}\n`;
    yaml += `        subnetMask: ${params.subnetMask}\n`;
    yaml += `        gateway: ${baseIp}.1\n`;
    yaml += `      interfaces:\n`;
    yaml += `        - name: FastEthernet0\n`;
    yaml += `          ip: ${serverIp}\n`;
    yaml += `          subnetMask: ${params.subnetMask}\n`;
    yaml += `          type: fastethernet\n`;
    yaml += `          enabled: true\n`;
  }

  yaml += '\n';
  yaml += '  connections:\n';
  let linkIdx = 1;
  for (let i = 0; i < params.routerCount; i++) {
    for (let j = 0; j < params.switchCount; j++) {
      if (i === j || i === 0) {
        yaml += `    - from: Router${i + 1}\n`;
        yaml += `      fromInterface: GigabitEthernet0/${j}\n`;
        yaml += `      to: Switch${j + 1}\n`;
        yaml += `      toInterface: GigabitEthernet0/1\n`;
        yaml += `      type: ethernet\n`;
        linkIdx++;
      }
    }
  }
  const pcsPerSwitch = Math.ceil(params.pcCount / Math.max(params.switchCount, 1));
  for (let i = 0; i < params.pcCount; i++) {
    const switchIdx = Math.floor(i / pcsPerSwitch);
    const portIdx = (i % pcsPerSwitch) + 1;
    yaml += `    - from: Switch${switchIdx + 1}\n`;
    yaml += `      fromInterface: FastEthernet0/${portIdx}\n`;
    yaml += `      to: PC${i + 1}\n`;
    yaml += `      toInterface: FastEthernet0\n`;
    yaml += `      type: ethernet\n`;
  }

  if (params.vlans && params.vlans.length > 0) {
    yaml += '\n  vlans:\n';
    for (const vlanId of params.vlans) {
      yaml += `    - id: ${vlanId}\n`;
      yaml += `      name: VLAN${vlanId}\n`;
      yaml += `      active: true\n`;
    }
  }

  if (params.dhcpEnabled) {
    yaml += '\n  dhcp:\n';
    yaml += `    enabled: true\n`;
    yaml += `    pool: ${params.baseNetwork}\n`;
    yaml += `    subnet: ${params.subnetMask}\n`;
    yaml += `    excluded:\n`;
    yaml += `      - ${baseIp}.1\n`;
  }

  yaml += '\nconfig:\n';
  yaml += `  routerCount: ${params.routerCount}\n`;
  yaml += `  switchCount: ${params.switchCount}\n`;
  yaml += `  pcCount: ${params.pcCount}\n`;
  yaml += `  serverCount: ${params.serverCount || 0}\n`;
  yaml += `  networkType: ${params.networkType}\n`;
  yaml += `  routingProtocol: ${params.routingProtocol}\n`;
  yaml += '\nvalidation:\n';
  yaml += `  checked: true\n`;
  yaml += `  generatorVersion: "1.0.0"\n`;

  return yaml;
}

async function ejecutarWizard(): Promise<void> {
  try {
    const { nombre, params, outputFile } = await runInteractiveWizard();

    console.log('\n\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           GENERANDO TOPOLOGÍA                              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');

    const deviceCount = params.routerCount + params.switchCount + params.pcCount + (params.serverCount || 0);
    const linkCount = (params.routerCount * params.switchCount) + params.pcCount;

    console.log(`\n  ✅ Topología generada:`);
    console.log(`     - ${deviceCount} dispositivos`);
    console.log(`     - ${linkCount} conexiones`);
    console.log(`     - Red: ${params.baseNetwork}/${params.subnetMask}`);

    const yaml = generarYaml(nombre, params);
    writeFileSync(outputFile, yaml);

    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           LABORATORIO CREADO                               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`\n  ✅ Archivo guardado: ${outputFile}`);
    console.log(`\n  Próximos pasos:`);
    console.log(`    1. Revisa el archivo: cisco-auto lab parse ${outputFile}`);
    console.log(`    2. Valida la topología: cisco-auto lab validate ${outputFile}`);
    console.log(`    3. Genera configuraciones: cisco-auto config generate ${outputFile}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Error durante el wizard:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export function createLabInteractiveCommand(): Command {
  const cmd = new Command('interactive')
    .alias('wizard')
    .description('Crear laboratorio de forma interactiva con wizard')
    .alias('i')
    .action(async () => {
      await ejecutarWizard();
    });

  return cmd;
}
