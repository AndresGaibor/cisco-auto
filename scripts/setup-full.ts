#!/usr/bin/env bun
import { createDefaultPTController } from '@cisco-auto/pt-control';

async function setup() {
  const ctrl = createDefaultPTController();
  
  try {
    await ctrl.start();
    
    console.log('➕ Agregando router R1...');
    await ctrl.addDevice('R1', '2911', { x: 100, y: 100 });
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('➕ Agregando switch S1...');
    await ctrl.addDevice('S1', '2960-24TT', { x: 300, y: 100 });
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('➕ Agregando servidor DHCP...');
    await ctrl.addDevice('DHCP-SRV', 'Server', { x: 200, y: 250 });
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('➕ Agregando PCs...');
    await ctrl.addDevice('PC1', 'PC', { x: 450, y: 100 });
    await ctrl.addDevice('PC2', 'PC', { x: 450, y: 160 });
    await ctrl.addDevice('PC3', 'PC', { x: 450, y: 220 });
    await ctrl.addDevice('PC4', 'PC', { x: 450, y: 280 });
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('🔗 Conectando dispositivos...');
    await ctrl.addLink({
      endpointA: { device: 'R1', port: 'GigabitEthernet0/0' },
      endpointB: { device: 'S1', port: 'GigabitEthernet0/1' },
      type: 'copper_straight',
    });
    await ctrl.addLink({
      endpointA: { device: 'DHCP-SRV', port: 'FastEthernet0' },
      endpointB: { device: 'S1', port: 'FastEthernet0/1' },
      type: 'copper_straight',
    });
    await ctrl.addLink({
      endpointA: { device: 'PC1', port: 'FastEthernet0' },
      endpointB: { device: 'S1', port: 'FastEthernet0/2' },
      type: 'copper_straight',
    });
    await ctrl.addLink({
      endpointA: { device: 'PC2', port: 'FastEthernet0' },
      endpointB: { device: 'S1', port: 'FastEthernet0/3' },
      type: 'copper_straight',
    });
    await ctrl.addLink({
      endpointA: { device: 'PC3', port: 'FastEthernet0' },
      endpointB: { device: 'S1', port: 'FastEthernet0/4' },
      type: 'copper_straight',
    });
    await ctrl.addLink({
      endpointA: { device: 'PC4', port: 'FastEthernet0' },
      endpointB: { device: 'S1', port: 'FastEthernet0/5' },
      type: 'copper_straight',
    });
    
    console.log('🌐 Configurando VLANs en S1...');
    await ctrl.configIos('S1', [
      'enable', 'configure terminal',
      'vlan 10', 'name TI',
      'vlan 20', 'name ADMIN',
      'vlan 30', 'name VENTAS',
      'vlan 40', 'name CONTABILIDAD',
      'interface range GigabitEthernet0/1 - 2',
      'switchport mode trunk',
      'channel-group 1 mode active',
      'interface FastEthernet0/2', 'switchport mode access', 'switchport access vlan 10',
      'interface FastEthernet0/3', 'switchport mode access', 'switchport access vlan 20',
      'interface FastEthernet0/4', 'switchport mode access', 'switchport access vlan 30',
      'interface FastEthernet0/5', 'switchport mode access', 'switchport access vlan 40',
      'end', 'write memory',
    ]);
    
    console.log('🌐 Configurando subinterfaces en R1...');
    await ctrl.configIos('R1', [
      'enable', 'configure terminal',
      'interface GigabitEthernet0/0', 'no shutdown',
      'interface GigabitEthernet0/0.10', 'encapsulation dot1q 10', 'ip address 192.168.10.1 255.255.255.0', 'no shutdown',
      'interface GigabitEthernet0/0.20', 'encapsulation dot1q 20', 'ip address 192.168.20.1 255.255.255.0', 'no shutdown',
      'interface GigabitEthernet0/0.30', 'encapsulation dot1q 30', 'ip address 192.168.30.1 255.255.255.0', 'no shutdown',
      'interface GigabitEthernet0/0.40', 'encapsulation dot1q 40', 'ip address 192.168.40.1 255.255.255.0', 'no shutdown',
      'end', 'write memory',
    ]);
    
    console.log('✅ Topología configurada!');
    
    const devices = await ctrl.listDevices();
    console.log(`\nDispositivos: ${devices.length}`);
    devices.forEach(d => console.log(`  - ${d.name} (${d.type})`));
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await ctrl.stop();
  }
}

setup();