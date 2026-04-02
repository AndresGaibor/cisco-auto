/**
 * MODULES CATALOG
 *
 * Catálogo de módulos de expansión para routers y switches
 */
// =============================================================================
// MODULE ENTRIES
// =============================================================================
export const moduleCatalog = [
    // === HWIC (High-Speed WAN Interface Cards) ===
    {
        code: 'HWIC-2T',
        name: '2-Port Serial WAN Interface Card',
        slotType: 'hwic',
        description: 'Provides 2 serial ports for WAN connectivity',
        ports: [
            {
                type: 'Serial',
                prefix: 'Se',
                module: 0,
                range: [0, 1],
                speed: 0,
                connector: 'serial',
                supportsCopper: false
            }
        ]
    },
    {
        code: 'HWIC-4ESW',
        name: '4-Port Ethernet Switch HWIC',
        slotType: 'hwic',
        description: 'Provides 4 FastEthernet switch ports',
        ports: [
            {
                type: 'FastEthernet',
                prefix: 'Fa',
                module: 0,
                range: [0, 3],
                speed: 100,
                connector: 'rj45',
                supportsCopper: true
            }
        ]
    },
    {
        code: 'HWIC-1GE-SFP',
        name: '1-Port Gigabit Ethernet SFP HWIC',
        slotType: 'hwic',
        description: 'Provides 1 Gigabit Ethernet SFP port',
        ports: [
            {
                type: 'GigabitEthernet',
                prefix: 'Gi',
                module: 0,
                range: [0, 0],
                speed: 1000,
                connector: 'sfp',
                supportsFiber: true
            }
        ]
    },
    {
        code: 'HWIC-AP',
        name: 'Wireless Access Point HWIC',
        slotType: 'hwic',
        description: 'Integrated 802.11a/b/g wireless access point',
        ports: [
            {
                type: 'Wireless',
                prefix: 'Wl',
                module: 0,
                range: [0, 0],
                speed: 0,
                connector: 'rj45'
            }
        ]
    },
    {
        code: 'HWIC-4A/S',
        name: '4-Port Async/Sync Serial HWIC',
        slotType: 'hwic',
        description: '4 async/sync serial ports',
        ports: [
            {
                type: 'Serial',
                prefix: 'Se',
                module: 0,
                range: [0, 3],
                speed: 0,
                connector: 'serial',
                supportsCopper: false
            }
        ]
    },
    // === WIC (WAN Interface Cards) - Legacy ===
    {
        code: 'WIC-2T',
        name: '2-Port Serial WAN Interface Card',
        slotType: 'wic',
        description: 'Legacy 2-port serial card for 2600 series',
        ports: [
            {
                type: 'Serial',
                prefix: 'Se',
                module: 0,
                range: [0, 1],
                speed: 0,
                connector: 'serial',
                supportsCopper: false
            }
        ]
    },
    {
        code: 'WIC-1ENET',
        name: '1-Port Ethernet WIC',
        slotType: 'wic',
        description: 'Legacy single Ethernet port',
        ports: [
            {
                type: 'Ethernet',
                prefix: 'Eth',
                module: 0,
                range: [0, 0],
                speed: 10,
                connector: 'rj45',
                supportsCopper: true
            }
        ]
    },
    {
        code: 'WIC-1ADSL',
        name: '1-Port ADSL WIC',
        slotType: 'wic',
        description: 'ADSL WAN interface',
        ports: [
            {
                type: 'ATM',
                prefix: 'ATM',
                module: 0,
                range: [0, 0],
                speed: 0,
                connector: 'rj45'
            }
        ]
    },
    // === NM (Network Modules) ===
    {
        code: 'NM-16ESW',
        name: '16-Port Ethernet Switch Network Module',
        slotType: 'nm',
        description: '16-port FastEthernet switch module',
        ports: [
            {
                type: 'FastEthernet',
                prefix: 'Fa',
                module: 1,
                range: [0, 15],
                speed: 100,
                connector: 'rj45',
                supportsCopper: true
            }
        ]
    },
    {
        code: 'NM-1FE-TX',
        name: '1-Port Fast Ethernet Network Module',
        slotType: 'nm',
        description: 'Single FastEthernet port module',
        ports: [
            {
                type: 'FastEthernet',
                prefix: 'Fa',
                module: 1,
                range: [0, 0],
                speed: 100,
                connector: 'rj45',
                supportsCopper: true
            }
        ]
    },
    {
        code: 'NM-4A/S',
        name: '4-Port Async/Sync Network Module',
        slotType: 'nm',
        description: '4 async/sync serial ports',
        ports: [
            {
                type: 'Serial',
                prefix: 'Se',
                module: 1,
                range: [0, 3],
                speed: 0,
                connector: 'serial',
                supportsCopper: false
            }
        ]
    },
    // === NME (Network Module Enhanced) ===
    {
        code: 'NME-16ES-1G',
        name: '16-Port Ethernet Switch with 1 GE Uplink',
        slotType: 'nme',
        description: '16 FastEthernet ports + 1 GigabitEthernet uplink',
        ports: [
            {
                type: 'FastEthernet',
                prefix: 'Fa',
                module: 1,
                range: [0, 15],
                speed: 100,
                connector: 'rj45',
                supportsCopper: true
            },
            {
                type: 'GigabitEthernet',
                prefix: 'Gi',
                module: 1,
                range: [0, 0],
                speed: 1000,
                connector: 'rj45',
                supportsCopper: true
            }
        ]
    },
    {
        code: 'NME-X-23ES-1G',
        name: '23-Port Ethernet Switch with 1 GE Uplink',
        slotType: 'nme',
        description: '23 FastEthernet ports + 1 GigabitEthernet uplink',
        ports: [
            {
                type: 'FastEthernet',
                prefix: 'Fa',
                module: 1,
                range: [0, 22],
                speed: 100,
                connector: 'rj45',
                supportsCopper: true
            },
            {
                type: 'GigabitEthernet',
                prefix: 'Gi',
                module: 1,
                range: [0, 0],
                speed: 1000,
                connector: 'rj45',
                supportsCopper: true
            }
        ]
    },
    // === SM (Service Modules) ===
    {
        code: 'SM-ES2-24',
        name: '24-Port Ethernet Switch Service Module',
        slotType: 'sm',
        description: '24-port Layer 2 Ethernet switch',
        ports: [
            {
                type: 'FastEthernet',
                prefix: 'Fa',
                module: 1,
                range: [0, 23],
                speed: 100,
                connector: 'rj45',
                supportsCopper: true
            }
        ]
    },
    {
        code: 'SM-ES3-24-P',
        name: '24-Port PoE Ethernet Switch Service Module',
        slotType: 'sm',
        description: '24-port PoE Layer 2/3 Ethernet switch',
        ports: [
            {
                type: 'GigabitEthernet',
                prefix: 'Gi',
                module: 1,
                range: [0, 23],
                speed: 1000,
                connector: 'rj45',
                supportsCopper: true,
                poe: true
            }
        ]
    },
    // === PVDM (Packet Voice DSP Modules) ===
    {
        code: 'PVDM3-16',
        name: 'PVDM3 16-Channel DSP Module',
        slotType: 'pvdm',
        description: '16 channels of voice DSP',
        ports: []
    },
    {
        code: 'PVDM3-32',
        name: 'PVDM3 32-Channel DSP Module',
        slotType: 'pvdm',
        description: '32 channels of voice DSP',
        ports: []
    },
    {
        code: 'PVDM3-64',
        name: 'PVDM3 64-Channel DSP Module',
        slotType: 'pvdm',
        description: '64 channels of voice DSP',
        ports: []
    }
];
// =============================================================================
// MODULE UTILITIES
// =============================================================================
/**
 * Busca un módulo por código
 */
export function getModuleByCode(code) {
    return moduleCatalog.find(m => m.code === code);
}
/**
 * Obtiene módulos por tipo de slot
 */
export function getModulesBySlotType(slotType) {
    return moduleCatalog.filter(m => m.slotType === slotType);
}
/**
 * Obtiene los puertos totales de un módulo
 */
export function getModuleTotalPorts(module) {
    return module.ports.reduce((sum, p) => {
        const [start, end] = p.range;
        return sum + (end - start + 1);
    }, 0);
}
export default moduleCatalog;
//# sourceMappingURL=modules.js.map