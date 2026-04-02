import { firewallCapabilities, giPort, giPorts4 } from './device-capabilities';
export const otherDeviceCatalog = [
    // === Cloud ===
    {
        id: 'cloud-pt',
        model: 'Cloud-PT',
        series: 'Cloud',
        family: 'WAN',
        vendor: 'generic',
        type: 'cloud',
        deviceFamily: 'infrastructure',
        fixedPorts: [giPorts4],
        moduleSlots: [],
        capabilities: {
            ...firewallCapabilities,
            supportsVlans: false,
            supportsRouting: true,
            routingProtocols: ['static', 'bgp'],
            supportsAcl: false,
            supportsNat: true,
            supportsVpn: false,
            supportsFirewall: false
        },
        displayName: 'Cloud-PT',
        description: 'Internet/Cloud simulation',
        ptCategory: 'WAN Emulation',
        tags: ['cloud', 'wan', 'internet'],
        isGeneric: true
    },
    // === Modems ===
    {
        id: 'dsl-modem-pt',
        model: 'DSL-Modem-PT',
        series: 'Modem',
        family: 'DSL',
        vendor: 'generic',
        type: 'modem',
        deviceFamily: 'infrastructure',
        fixedPorts: [
            {
                type: 'DSL',
                prefix: 'DSL',
                module: 0,
                range: [0, 0],
                speed: 0,
                connector: 'rj45'
            },
            giPort
        ],
        moduleSlots: [],
        capabilities: {
            ...firewallCapabilities,
            supportsVlans: false,
            supportsRouting: false,
            supportsAcl: false,
            supportsNat: true
        },
        displayName: 'DSL Modem-PT',
        description: 'DSL Modem',
        ptCategory: 'WAN Emulation',
        tags: ['modem', 'dsl', 'wan'],
        isGeneric: true
    },
    {
        id: 'cable-modem-pt',
        model: 'Cable-Modem-PT',
        series: 'Modem',
        family: 'Cable',
        vendor: 'generic',
        type: 'modem',
        deviceFamily: 'infrastructure',
        fixedPorts: [
            {
                type: 'Cable',
                prefix: 'Ca',
                module: 0,
                range: [0, 0],
                speed: 0,
                connector: 'rj45'
            },
            giPort
        ],
        moduleSlots: [],
        capabilities: {
            ...firewallCapabilities,
            supportsVlans: false,
            supportsRouting: false,
            supportsAcl: false,
            supportsNat: true
        },
        displayName: 'Cable Modem-PT',
        description: 'Cable Modem',
        ptCategory: 'WAN Emulation',
        tags: ['modem', 'cable', 'wan'],
        isGeneric: true
    },
    // === Cell Tower ===
    {
        id: 'cell-tower-pt',
        model: 'Cell-Tower',
        series: 'Cellular',
        family: 'Tower',
        vendor: 'generic',
        type: 'cloud',
        deviceFamily: 'infrastructure',
        fixedPorts: [giPort],
        moduleSlots: [],
        capabilities: {
            ...firewallCapabilities,
            supportsVlans: false,
            supportsRouting: true,
            routingProtocols: ['static'],
            supportsAcl: false,
            supportsNat: true
        },
        displayName: 'Cell Tower',
        description: 'Cellular network simulation',
        ptCategory: 'WAN Emulation',
        tags: ['cellular', 'tower', 'mobile'],
        isGeneric: true
    },
    // === Central Office ===
    {
        id: 'central-office-server',
        model: 'Central-Office-Server',
        series: 'CO',
        family: 'Server',
        vendor: 'generic',
        type: 'server',
        deviceFamily: 'infrastructure',
        fixedPorts: [giPort],
        moduleSlots: [],
        capabilities: {
            ...firewallCapabilities,
            supportsRouting: true,
            routingProtocols: ['static', 'ospf', 'bgp']
        },
        displayName: 'Central Office Server',
        description: 'Central Office for WAN simulation',
        ptCategory: 'WAN Emulation',
        tags: ['co', 'central-office', 'wan'],
        isGeneric: true
    }
];
//# sourceMappingURL=other-devices.js.map