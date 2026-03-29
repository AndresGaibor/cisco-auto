#!/usr/bin/env bun
/**
 * Config Wizard Script
 * 
 * Wizard interactivo para generar configuraciones Cisco IOS
 * paso a paso según requerimientos del usuario.
 * 
 * Uso: bun run config-wizard.ts
 */

import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

interface VLANConfig {
  id: number;
  name: string;
  subnet?: string;
  gateway?: string;
}

interface DeviceConfig {
  hostname: string;
  type: 'switch' | 'router';
  vlans: VLANConfig[];
  interfaces: InterfaceConfig[];
}

interface InterfaceConfig {
  name: string;
  mode: 'access' | 'trunk' | 'routed';
  vlan?: number;
  allowedVlans?: number[];
  ip?: string;
  mask?: string;
}

// Generar configuración de VLANs
function generateVLANConfig(vlans: VLANConfig[]): string {
  let config = '! --- CONFIGURACIÓN DE VLANs ---\n';
  
  for (const vlan of vlans) {
    config += `vlan ${vlan.id}\n`;
    config += ` name ${vlan.name}\n`;
    config += `!\n`;
  }
  
  return config;
}

// Generar configuración de interfaces
function generateInterfaceConfig(interfaces: InterfaceConfig[], deviceType: string): string {
  let config = '! --- CONFIGURACIÓN DE INTERFACES ---\n';
  
  for (const iface of interfaces) {
    config += `interface ${iface.name}\n`;
    
    if (iface.mode === 'access') {
      config += ` switchport mode access\n`;
      if (iface.vlan) {
        config += ` switchport access vlan ${iface.vlan}\n`;
      }
      config += ` spanning-tree portfast\n`;
      config += ` spanning-tree bpduguard enable\n`;
    } else if (iface.mode === 'trunk') {
      config += ` switchport mode trunk\n`;
      if (iface.allowedVlans && iface.allowedVlans.length > 0) {
        config += ` switchport trunk allowed vlan ${iface.allowedVlans.join(',')}\n`;
      }
      config += ` switchport nonegotiate\n`;
    } else if (iface.mode === 'routed' && deviceType === 'router') {
      if (iface.ip && iface.mask) {
        config += ` ip address ${iface.ip} ${iface.mask}\n`;
      }
    }
    
    config += ` no shutdown\n`;
    config += `!\n`;
  }
  
  return config;
}

// Generar configuración de router-on-a-stick
function generateRouterOnAStick(vlans: VLANConfig[], physicalInterface: string): string {
  let config = '! --- ROUTER-ON-A-STICK ---\n';
  
  // Interfaz física
  config += `interface ${physicalInterface}\n`;
  config += ` no ip address\n`;
  config += ` no shutdown\n`;
  config += `!\n`;
  
  // Subinterfaces
  for (const vlan of vlans) {
    if (vlan.gateway && vlan.subnet) {
      config += `interface ${physicalInterface}.${vlan.id}\n`;
      config += ` encapsulation dot1Q ${vlan.id}\n`;
      config += ` ip address ${vlan.gateway} ${vlan.subnet}\n`;
      config += ` description Gateway ${vlan.name}\n`;
      config += `!\n`;
    }
  }
  
  return config;
}

// Wizard principal
async function runWizard() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           CISCO CONFIG WIZARD                                ║
║     Generador de Configuraciones Interactivo                 ║
╚══════════════════════════════════════════════════════════════╝
`);

  const deviceType = await question('Tipo de dispositivo (switch/router): ');
  const hostname = await question('Hostname del dispositivo: ');
  
  const device: DeviceConfig = {
    hostname,
    type: deviceType.toLowerCase() as 'switch' | 'router',
    vlans: [],
    interfaces: []
  };
  
  // Configurar VLANs
  const vlanCount = parseInt(await question('¿Cuántas VLANs necesitas? '));
  
  for (let i = 0; i < vlanCount; i++) {
    console.log(`\n--- VLAN ${i + 1} ---`);
    const vlanId = parseInt(await question('  ID de VLAN: '));
    const vlanName = await question('  Nombre de VLAN: ');
    
    const vlan: VLANConfig = {
      id: vlanId,
      name: vlanName
    };
    
    if (deviceType.toLowerCase() === 'router') {
      const hasGateway = await question('  ¿Tiene gateway? (s/n): ');
      if (hasGateway.toLowerCase() === 's') {
        vlan.gateway = await question('  IP Gateway: ');
        vlan.subnet = await question('  Máscara de subred: ');
      }
    }
    
    device.vlans.push(vlan);
  }
  
  // Configurar interfaces
  const interfaceCount = parseInt(await question('\n¿Cuántas interfaces vas a configurar? '));
  
  for (let i = 0; i < interfaceCount; i++) {
    console.log(`\n--- Interfaz ${i + 1} ---`);
    const ifaceName = await question('  Nombre de interfaz (ej: GigabitEthernet0/1): ');
    
    let mode: 'access' | 'trunk' | 'routed';
    if (deviceType.toLowerCase() === 'switch') {
      const modeStr = await question('  Modo (access/trunk): ');
      mode = modeStr.toLowerCase() as 'access' | 'trunk';
    } else {
      const modeStr = await question('  Modo (routed/subinterface): ');
      mode = modeStr.toLowerCase() === 'subinterface' ? 'routed' : 'routed';
    }
    
    const iface: InterfaceConfig = {
      name: ifaceName,
      mode
    };
    
    if (mode === 'access') {
      const vlanId = parseInt(await question('  VLAN de acceso: '));
      iface.vlan = vlanId;
    } else if (mode === 'trunk') {
      const allowedVlansStr = await question('  VLANs permitidas (separadas por coma, o "all"): ');
      if (allowedVlansStr.toLowerCase() !== 'all') {
        iface.allowedVlans = allowedVlansStr.split(',').map(v => parseInt(v.trim()));
      }
    } else if (mode === 'routed' && deviceType.toLowerCase() === 'router') {
      iface.ip = await question('  IP Address: ');
      iface.mask = await question('  Máscara de subred: ');
    }
    
    device.interfaces.push(iface);
  }
  
  // Generar configuración completa
  console.log('\n\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           CONFIGURACIÓN GENERADA                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  let fullConfig = `! =========================================\n`;
  fullConfig += `! Configuración generada por Config Wizard\n`;
  fullConfig += `! Dispositivo: ${device.hostname}\n`;
  fullConfig += `! Tipo: ${device.type.toUpperCase()}\n`;
  fullConfig += `! =========================================\n\n`;
  
  fullConfig += `hostname ${device.hostname}\n!\n`;
  
  if (device.type === 'switch' && device.vlans.length > 0) {
    fullConfig += generateVLANConfig(device.vlans);
    fullConfig += `!\n`;
  }
  
  if (device.interfaces.length > 0) {
    fullConfig += generateInterfaceConfig(device.interfaces, device.type);
    fullConfig += `!\n`;
  }
  
  // Si es router con VLANs, ofrecer Router-on-a-stick
  if (device.type === 'router' && device.vlans.length > 0) {
    const useRoAS = await question('\n¿Generar configuración Router-on-a-Stick? (s/n): ');
    if (useRoAS.toLowerCase() === 's') {
      const physicalInterface = await question('Interfaz física (ej: GigabitEthernet0/0): ');
      fullConfig += generateRouterOnAStick(device.vlans, physicalInterface);
      fullConfig += `!\n`;
    }
  }
  
  fullConfig += `! Fin de configuración\n`;
  fullConfig += `end\n`;
  fullConfig += `write memory\n`;
  
  console.log(fullConfig);
  
  // Guardar en archivo
  const saveToFile = await question('\n¿Guardar configuración en archivo? (s/n): ');
  if (saveToFile.toLowerCase() === 's') {
    const filename = await question('Nombre del archivo (ej: config-switch.txt): ');
    const fs = await import('fs');
    fs.writeFileSync(filename, fullConfig);
    console.log(`\n✅ Configuración guardada en: ${filename}`);
  }
  
  console.log('\n¡Gracias por usar Config Wizard!\n');
  rl.close();
}

// Menú de plantillas rápidas
async function quickTemplates() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           PLANTILLAS RÁPIDAS                                 ║
╚══════════════════════════════════════════════════════════════╝

1. Switch básico con VLANs
2. Router-on-a-Stick
3. OSPF Single Area
4. ACL Básica
5. NAT Overload

0. Volver al menú principal
`);

  const choice = await question('Selecciona una opción: ');
  
  switch(choice) {
    case '1':
      console.log(`
! --- PLANTILLA: SWITCH BÁSICO CON VLANs ---
!
enable
configure terminal
hostname SW-BASICO
!
vlan 10
 name VENTAS
vlan 20
 name CONTABILIDAD
vlan 99
 name MANAGEMENT
!
interface GigabitEthernet0/1
 switchport mode trunk
 switchport trunk allowed vlan 10,20,99
 switchport trunk native vlan 99
!
interface range FastEthernet0/1-12
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast
 spanning-tree bpduguard enable
!
interface range FastEthernet0/13-24
 switchport mode access
 switchport access vlan 20
 spanning-tree portfast
 spanning-tree bpduguard enable
!
interface vlan 99
 ip address 192.168.99.2 255.255.255.0
 no shutdown
!
ip default-gateway 192.168.99.1
!
end
write memory
`);
      break;
      
    case '2':
      console.log(`
! --- PLANTILLA: ROUTER-ON-A-STICK ---
!
enable
configure terminal
hostname R1
!
interface GigabitEthernet0/0
 no ip address
 no shutdown
!
interface GigabitEthernet0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
 description Gateway VLAN 10
!
interface GigabitEthernet0/0.20
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
 description Gateway VLAN 20
!
interface GigabitEthernet0/0.99
 encapsulation dot1Q 99 native
 ip address 192.168.99.1 255.255.255.0
 description Management
!
end
write memory
`);
      break;
      
    case '3':
      console.log(`
! --- PLANTILLA: OSPF SINGLE AREA ---
!
enable
configure terminal
hostname R1-OSPF
!
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
!
interface GigabitEthernet0/1
 ip address 10.0.0.1 255.255.255.252
 no shutdown
!
router ospf 1
 router-id 1.1.1.1
 network 192.168.1.0 0.0.0.255 area 0
 network 10.0.0.0 0.0.0.3 area 0
 auto-cost reference-bandwidth 1000
!
end
write memory
`);
      break;
      
    case '4':
      console.log(`
! --- PLANTILLA: ACL BÁSICA ---
!
enable
configure terminal
!
ip access-list standard MGMT-ACCESS
 permit 192.168.99.0 0.0.0.255
 deny any log
!
ip access-list extended INTERNET-OUT
 permit tcp 192.168.1.0 0.0.0.255 any eq 80
 permit tcp 192.168.1.0 0.0.0.255 any eq 443
 permit udp 192.168.1.0 0.0.0.255 any eq 53
 deny ip any any log
!
! Aplicar a interfaz
interface GigabitEthernet0/0
 ip access-group INTERNET-OUT out
!
line vty 0 15
 access-class MGMT-ACCESS in
 transport input ssh
!
end
write memory
`);
      break;
      
    case '5':
      console.log(`
! --- PLANTILLA: NAT OVERLOAD ---
!
enable
configure terminal
!
! Definir interfaz inside
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 ip nat inside
 no shutdown
!
! Definir interfaz outside
interface GigabitEthernet0/1
 ip address 203.0.113.1 255.255.255.252
 ip nat outside
 no shutdown
!
! ACL para tráfico a traducir
access-list 1 permit 192.168.1.0 0.0.0.255
access-list 1 permit 192.168.2.0 0.0.0.255
!
! Configurar NAT Overload
ip nat inside source list 1 interface GigabitEthernet0/1 overload
!
! Ruta por defecto
ip route 0.0.0.0 0.0.0.0 203.0.113.2
!
end
write memory
`);
      break;
      
    case '0':
      return;
      
    default:
      console.log('Opción no válida');
  }
  
  await question('\nPresiona Enter para continuar...');
  await quickTemplates();
}

// Menú principal
async function mainMenu() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           CONFIG WIZARD - MENÚ PRINCIPAL                     ║
╚══════════════════════════════════════════════════════════════╝

1. Iniciar Wizard Interactivo
2. Plantillas Rápidas
3. Ver Guías de Referencia

0. Salir
`);

  const choice = await question('Selecciona una opción: ');
  
  switch(choice) {
    case '1':
      await runWizard();
      break;
    case '2':
      await quickTemplates();
      await mainMenu();
      break;
    case '3':
      console.log(`
Guías de referencia disponibles en:
- .iflow/skills/cisco-networking-assistant/references/
  * vlan-guide.md
  * routing-guide.md
  * security-guide.md
  * troubleshooting-guide.md
`);
      await question('\nPresiona Enter para continuar...');
      await mainMenu();
      break;
    case '0':
      console.log('¡Hasta luego!');
      rl.close();
      break;
    default:
      console.log('Opción no válida\n');
      await mainMenu();
  }
}

// Iniciar
mainMenu();
