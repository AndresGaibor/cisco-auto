#!/usr/bin/env bun
/**
 * Script de automatización de topología
 * - Conecta automáticamente PCs a puertos disponibles del switch
 * - Asigna VLAN según el tercer octeto de la IP (10,20,30,40)
 * - Activa DHCP en cada PC
 */

import { createDefaultPTController, type PTController } from '@cisco-auto/pt-control';

interface PCConfig {
  name: string;
  vlan: number;
  x: number;
  y: number;
}

const PC_CONFIGS: PCConfig[] = [
  { name: 'PC1', vlan: 10, x: 400, y: 100 },
  { name: 'PC2', vlan: 20, x: 400, y: 180 },
  { name: 'PC3', vlan: 30, x: 400, y: 260 },
  { name: 'PC4', vlan: 40, x: 400, y: 340 },
];

const SWITCH_NAME = 'S1';
const ROUTER_NAME = 'R1';
const VLAN_MAPPING: Record<number, string> = {
  10: '192.168.10.0/24',
  20: '192.168.20.0/24',
  30: '192.168.30.0/24',
  40: '192.168.40.0/24',
};

const SWITCH_PORTS = [
  'FastEthernet0/3',
  'FastEthernet0/4', 
  'FastEthernet0/5',
  'FastEthernet0/6',
  'FastEthernet0/7',
  'FastEthernet0/8',
  'FastEthernet0/9',
  'FastEthernet0/10',
];

async function setupTopology() {
  console.log('🔧 Configurando topología automáticamente...\n');

  const controller = createDefaultPTController();

  try {
    await controller.start();

    const existingDevices = await controller.listDevices();
    console.log(`📱 Dispositivos existentes: ${existingDevices.length}`);

    for (let i = 0; i < PC_CONFIGS.length; i++) {
      const pc = PC_CONFIGS[i];
      const port = SWITCH_PORTS[i];

      const pcExists = existingDevices.some(d => d.name === pc.name);

      if (!pcExists) {
        console.log(`\n➕ Agregando ${pc.name}...`);
        await controller.addDevice(pc.name, 'PC', { x: pc.x, y: pc.y });
        await new Promise(r => setTimeout(r, 500));
      } else {
        console.log(`\n✓ ${pc.name} ya existe`);
      }

      console.log(`🔗 Conectando ${pc.name} a ${SWITCH_NAME}:${port}...`);
      await controller.addLink({
        endpointA: { device: pc.name, port: 'FastEthernet0' },
        endpointB: { device: SWITCH_NAME, port },
        type: 'copper_straight',
      });
      await new Promise(r => setTimeout(r, 500));

      console.log(`🌐 Configurando VLAN ${pc.vlan} en ${port}...`);
      await controller.configIos(SWITCH_NAME, [
        `interface ${port}`,
        'switchport mode access',
        `switchport access vlan ${pc.vlan}`,
        'no shutdown',
      ]);
      await new Promise(r => setTimeout(r, 300));

      console.log(`📡 Configurando DHCP para ${pc.name}...`);
      await controller.configHost(pc.name, { dhcp: true });

      const subnet = VLAN_MAPPING[pc.vlan];
      console.log(`   ✅ ${pc.name} -> VLAN ${pc.vlan} (${subnet}) -> DHCP`);
    }

    console.log('\n✅ Configuración completada!');
    console.log('\n📊 Resumen:');
    console.log(`   - Router: ${ROUTER_NAME} con subinterfaces VLAN 10,20,30,40`);
    console.log(`   - Switch: ${SWITCH_NAME} con EtherChannel + trunk`);
    console.log(`   - PCs: ${PC_CONFIGS.length} conectadas a VLANs correspondientes`);
    console.log(`   - DHCP: Habilitado en todas las PCs`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await controller.stop();
  }
}

setupTopology();