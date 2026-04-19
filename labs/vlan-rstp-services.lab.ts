import type { LabSpec } from '../apps/pt-cli/src/contracts/lab-spec.js';

const CORE_NAME = 'CORE3650';
const SERVER_NAME = 'SRV1';
const VLAN_USERS = 10;
const VLAN_ADMIN = 20;
const VLAN_SERVERS = 30;
const VLAN_MGMT = 99;
const SERVER_IP = '192.168.30.10';
const MGMT_GATEWAY = '192.168.99.1';

export const vlanRstpServicesLab: LabSpec = {
  labId: 'vlan-rstp-services',
  version: '1.0.0',
  name: 'CORE3650 + 4SW + 4PC + Server - VLAN/RSTP/Services',
  description: 'Laboratorio completo con core L3, switches de acceso, VLANs, Rapid-PVST+, SVIs, DHCP y servidor',
  tags: ['vlan', 'rstp', 'dhcp', 'l3', 'svi', 'trunk', 'access'],

  devices: [
    { 
      name: CORE_NAME, 
      model: '3650', 
      ptModel: '3560',
      role: 'core',
      x: 520, 
      y: 120,
      supported: 'partial',
      notes: ['El modelo 3650 se mapea a 3560 en PT porque ese es el modelo real disponible'],
    },
    { name: 'SW1', model: '2960-24TT', role: 'access-switch', x: 200, y: 280 },
    { name: 'SW2', model: '2960-24TT', role: 'access-switch', x: 380, y: 280 },
    { name: 'SW3', model: '2960-24TT', role: 'access-switch', x: 660, y: 280 },
    { name: 'SW4', model: '2960-24TT', role: 'access-switch', x: 840, y: 280 },
    { name: 'PC1', model: 'PC-PT', role: 'pc', x: 200, y: 450 },
    { name: 'PC2', model: 'PC-PT', role: 'pc', x: 380, y: 450 },
    { name: 'PC3', model: 'PC-PT', role: 'pc', x: 660, y: 450 },
    { name: 'PC4', model: 'PC-PT', role: 'pc', x: 840, y: 450 },
    { name: SERVER_NAME, model: 'Server-PT', role: 'server', x: 520, y: 450 },
  ],

  links: [
    { fromDevice: CORE_NAME, fromPort: 'FastEthernet0/1', toDevice: 'SW1', toPort: 'GigabitEthernet0/1', cableType: 'straight' },
    { fromDevice: CORE_NAME, fromPort: 'FastEthernet0/2', toDevice: 'SW2', toPort: 'GigabitEthernet0/1', cableType: 'straight' },
    { fromDevice: CORE_NAME, fromPort: 'FastEthernet0/3', toDevice: 'SW3', toPort: 'GigabitEthernet0/1', cableType: 'straight' },
    { fromDevice: CORE_NAME, fromPort: 'FastEthernet0/4', toDevice: 'SW4', toPort: 'GigabitEthernet0/1', cableType: 'straight' },
    { fromDevice: 'SW1', fromPort: 'FastEthernet0/1', toDevice: 'PC1', toPort: 'FastEthernet0', cableType: 'straight' },
    { fromDevice: 'SW2', fromPort: 'FastEthernet0/1', toDevice: 'PC2', toPort: 'FastEthernet0', cableType: 'straight' },
    { fromDevice: 'SW3', fromPort: 'FastEthernet0/1', toDevice: 'PC3', toPort: 'FastEthernet0', cableType: 'straight' },
    { fromDevice: 'SW4', fromPort: 'FastEthernet0/1', toDevice: 'PC4', toPort: 'FastEthernet0', cableType: 'straight' },
    { fromDevice: CORE_NAME, fromPort: 'FastEthernet0/5', toDevice: SERVER_NAME, toPort: 'FastEthernet0', cableType: 'straight' },
  ],

  vlans: [
    { id: VLAN_USERS, name: 'USERS', devices: [CORE_NAME, 'SW1', 'SW2', 'SW3', 'SW4'] },
    { id: VLAN_ADMIN, name: 'ADMIN', devices: [CORE_NAME, 'SW1', 'SW2', 'SW3', 'SW4'] },
    { id: VLAN_SERVERS, name: 'SERVERS', devices: [CORE_NAME, 'SW1', 'SW2', 'SW3', 'SW4'] },
    { id: VLAN_MGMT, name: 'MGMT', devices: [CORE_NAME, 'SW1', 'SW2', 'SW3', 'SW4'] },
  ],

  trunks: [
    { device: CORE_NAME, port: 'FastEthernet0/1', nativeVlan: VLAN_MGMT, allowedVlans: [VLAN_USERS, VLAN_ADMIN, VLAN_SERVERS, VLAN_MGMT] },
    { device: CORE_NAME, port: 'FastEthernet0/2', nativeVlan: VLAN_MGMT, allowedVlans: [VLAN_USERS, VLAN_ADMIN, VLAN_SERVERS, VLAN_MGMT] },
    { device: CORE_NAME, port: 'FastEthernet0/3', nativeVlan: VLAN_MGMT, allowedVlans: [VLAN_USERS, VLAN_ADMIN, VLAN_SERVERS, VLAN_MGMT] },
    { device: CORE_NAME, port: 'FastEthernet0/4', nativeVlan: VLAN_MGMT, allowedVlans: [VLAN_USERS, VLAN_ADMIN, VLAN_SERVERS, VLAN_MGMT] },
    { device: 'SW1', port: 'GigabitEthernet0/1', nativeVlan: VLAN_MGMT, allowedVlans: [VLAN_USERS, VLAN_ADMIN, VLAN_SERVERS, VLAN_MGMT] },
    { device: 'SW2', port: 'GigabitEthernet0/1', nativeVlan: VLAN_MGMT, allowedVlans: [VLAN_USERS, VLAN_ADMIN, VLAN_SERVERS, VLAN_MGMT] },
    { device: 'SW3', port: 'GigabitEthernet0/1', nativeVlan: VLAN_MGMT, allowedVlans: [VLAN_USERS, VLAN_ADMIN, VLAN_SERVERS, VLAN_MGMT] },
    { device: 'SW4', port: 'GigabitEthernet0/1', nativeVlan: VLAN_MGMT, allowedVlans: [VLAN_USERS, VLAN_ADMIN, VLAN_SERVERS, VLAN_MGMT] },
  ],

  accessPorts: [
    { device: 'SW1', port: 'FastEthernet0/1', vlan: VLAN_USERS, portfast: true },
    { device: 'SW2', port: 'FastEthernet0/1', vlan: VLAN_USERS, portfast: true },
    { device: 'SW3', port: 'FastEthernet0/1', vlan: VLAN_ADMIN, portfast: true },
    { device: 'SW4', port: 'FastEthernet0/1', vlan: VLAN_ADMIN, portfast: true },
    { device: CORE_NAME, port: 'FastEthernet0/5', vlan: VLAN_SERVERS, portfast: false },
  ],

  svis: [
    { device: CORE_NAME, vlan: VLAN_USERS, ip: '192.168.10.1', mask: '255.255.255.0', description: 'Gateway VLAN USERS' },
    { device: CORE_NAME, vlan: VLAN_ADMIN, ip: '192.168.20.1', mask: '255.255.255.0', description: 'Gateway VLAN ADMIN' },
    { device: CORE_NAME, vlan: VLAN_SERVERS, ip: '192.168.30.1', mask: '255.255.255.0', description: 'Gateway VLAN SERVERS' },
    { device: CORE_NAME, vlan: VLAN_MGMT, ip: MGMT_GATEWAY, mask: '255.255.255.0', description: 'Gateway VLAN MGMT' },
    { device: 'SW1', vlan: VLAN_MGMT, ip: '192.168.99.2', mask: '255.255.255.0', description: 'MGMT SW1' },
    { device: 'SW2', vlan: VLAN_MGMT, ip: '192.168.99.3', mask: '255.255.255.0', description: 'MGMT SW2' },
    { device: 'SW3', vlan: VLAN_MGMT, ip: '192.168.99.4', mask: '255.255.255.0', description: 'MGMT SW3' },
    { device: 'SW4', vlan: VLAN_MGMT, ip: '192.168.99.5', mask: '255.255.255.0', description: 'MGMT SW4' },
  ],

  staticRoutes: [],

  dhcpPools: [
    {
      device: CORE_NAME,
      poolName: 'VLAN10',
      network: '192.168.10.0',
      mask: '255.255.255.0',
      defaultRouter: '192.168.10.1',
      dnsServer: SERVER_IP,
      excludedRanges: [{ start: '192.168.10.1', end: '192.168.10.20' }],
    },
    {
      device: CORE_NAME,
      poolName: 'VLAN20',
      network: '192.168.20.0',
      mask: '255.255.255.0',
      defaultRouter: '192.168.20.1',
      dnsServer: SERVER_IP,
      excludedRanges: [{ start: '192.168.20.1', end: '192.168.20.20' }],
    },
  ],

  hosts: [
    { device: 'PC1', dhcp: true },
    { device: 'PC2', dhcp: true },
    { device: 'PC3', dhcp: true },
    { device: 'PC4', dhcp: true },
    { device: SERVER_NAME, dhcp: false, ip: SERVER_IP, mask: '255.255.255.0', gateway: '192.168.30.1', dns: SERVER_IP },
  ],

  services: [
    { 
      device: SERVER_NAME, 
      type: 'dns', 
      enabled: true, 
      supportedByApi: 'false',
      notes: ['La configuración de DNS en Server-PT debe hacerse manualmente desde la GUI'],
    },
    { 
      device: SERVER_NAME, 
      type: 'web', 
      enabled: true, 
      supportedByApi: 'false',
      notes: ['La configuración de HTTP en Server-PT debe hacerse manualmente desde la GUI'],
    },
    { 
      device: SERVER_NAME, 
      type: 'email', 
      enabled: true, 
      supportedByApi: 'false',
      notes: ['La configuración de Email en Server-PT debe hacerse manualmente desde la GUI'],
    },
  ],

  checks: [
    { name: 'topology.devices', type: 'topology', description: 'Verificar que existen 10 dispositivos', reliable: true, params: { expected: 10 } },
    { name: 'topology.links', type: 'topology', description: 'Verificar que existen 9 enlaces', reliable: true, params: { expected: 9 } },
    { name: 'core.hostname', type: 'topology', description: 'Verificar hostname del core', reliable: true, params: { device: CORE_NAME } },
    { name: 'core.rapid-pvst', type: 'topology', description: 'Verificar Rapid-PVST+ habilitado', reliable: true, params: { device: CORE_NAME } },
    { name: 'core.ip-routing', type: 'routing', description: 'Verificar IP routing habilitado', reliable: true, params: { device: CORE_NAME } },
    { name: 'core.vlans', type: 'vlan', description: 'Verificar VLANs configuradas', reliable: true, params: { device: CORE_NAME, vlans: [VLAN_USERS, VLAN_ADMIN, VLAN_SERVERS, VLAN_MGMT] } },
    { name: 'core.svis-up', type: 'svi', description: 'Verificar SVIs activas', reliable: true, params: { device: CORE_NAME } },
    { name: 'pc1.dhcp', type: 'host', description: 'Verificar PC1 obtuvo IP por DHCP', reliable: true, params: { device: 'PC1' } },
    { name: 'server.address', type: 'host', description: 'Verificar IP del servidor', reliable: true, params: { device: SERVER_NAME, ip: SERVER_IP } },
    { name: 'switch.management', type: 'host', description: 'Verificar IPs de management de switches', reliable: true, params: { devices: ['SW1', 'SW2', 'SW3', 'SW4'] } },
    { 
      name: 'server.services', 
      type: 'service', 
      description: 'Verificar servicios del servidor (verificación parcial)', 
      reliable: false,
      params: { device: SERVER_NAME, services: ['dns', 'web', 'email'] },
    },
  ],

  repairPolicy: {
    defaultMode: 'incremental',
    clearTopologyOnRebuild: true,
    verifyAfterApply: true,
    maxRetries: 3,
    operationTimeout: 30000,
  },

  notes: [
    'El modelo CORE3650 lógico se mapea a 3560 porque es el modelo disponible en PT',
    'Los servicios DNS/WEB/EMAIL del Server-PT deben configurarse manualmente desde la GUI',
    'La verificación de servicios es parcial porque PT no expone su estado vía API',
    'Las PCs usan DHCP y el servidor tiene IP estática en VLAN 30',
    'Cada switch de acceso tiene una IP de management en VLAN 99',
  ],

  createdAt: Date.now(),
  updatedAt: Date.now(),
};
