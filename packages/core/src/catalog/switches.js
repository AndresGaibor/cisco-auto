/**
 * SWITCH CATALOG
 *
 * Catálogo de switches soportados en Packet Tracer
 */
// =============================================================================
// CAPABILITIES BASE
// =============================================================================
const baseSwitchCapabilities = {
    // Layer 2
    supportsVlans: true,
    maxVlans: 255,
    supportsVtp: true,
    supportsStp: true,
    stpModes: ['pvst', 'rapid-pvst'],
    supportsEtherchannel: true,
    maxEtherchannels: 6,
    supportsPortSecurity: true,
    // Layer 3
    supportsRouting: false,
    supportsIpv6: false,
    routingProtocols: [],
    // Security
    supportsAcl: true,
    maxAcls: 50,
    supportsNat: false,
    supportsVpn: false,
    supportsFirewall: false,
    // Services
    supportsDhcp: false,
    supportsDns: false,
    supportsNtp: true,
    supportsSnmp: true,
    supportsSsh: true,
    supportsTelnet: true,
    supportsHttp: true,
    // Wireless
    supportsWireless: false,
    wirelessStandards: [],
    // Voice
    supportsVoice: true,
    supportsPoe: false,
    // QoS
    supportsQos: true,
    // Hardware
    supportsModules: false,
    moduleSlots: 0,
    supportedModules: [],
    // Management
    supportsConsole: true,
    supportsUsb: false,
    supportsSdCard: false,
    ptSupportedVersion: '7.0'
};
const baseL3SwitchCapabilities = {
    ...baseSwitchCapabilities,
    supportsRouting: true,
    supportsIpv6: true,
    routingProtocols: ['static', 'ospf', 'eigrp'],
    maxVlans: 1005
};
// =============================================================================
// SWITCH PORT DEFINITIONS
// =============================================================================
const faPorts24 = () => [
    {
        type: 'FastEthernet',
        prefix: 'Fa',
        module: 0,
        range: [1, 24], // CORREGIDO: Empieza en 1
        speed: 100,
        connector: 'rj45',
        supportsCopper: true
    }
];
const faPorts24PoE = () => [
    {
        type: 'FastEthernet',
        prefix: 'Fa',
        module: 0,
        range: [1, 24],
        speed: 100,
        connector: 'rj45',
        supportsCopper: true,
        poe: true
    }
];
const giPorts24 = () => [
    {
        type: 'GigabitEthernet',
        prefix: 'Gi',
        module: 0,
        range: [1, 24],
        speed: 1000,
        connector: 'rj45',
        supportsCopper: true
    }
];
const giPorts24PoE = () => [
    {
        type: 'GigabitEthernet',
        prefix: 'Gi',
        module: 0,
        range: [1, 24],
        speed: 1000,
        connector: 'rj45',
        supportsCopper: true,
        poe: true
    }
];
const giPorts48 = () => [
    {
        type: 'GigabitEthernet',
        prefix: 'Gi',
        module: 0,
        range: [1, 48],
        speed: 1000,
        connector: 'rj45',
        supportsCopper: true
    }
];
const sfpPorts = (count, start = 25) => [
    {
        type: 'GigabitEthernet',
        prefix: 'Gi',
        module: 0,
        range: [start, start + count - 1],
        speed: 1000,
        connector: 'sfp',
        supportsFiber: true
    }
];
const consolePort = {
    type: 'Console',
    prefix: 'Con',
    module: 0,
    range: [0, 0],
    speed: 0,
    connector: 'console'
};
// =============================================================================
// SWITCH ENTRIES
// =============================================================================
export const switchCatalog = [
    // === Catalyst 2960 Series ===
    {
        id: 'switch-2960-24tt',
        model: '2960-24TT-L',
        series: 'Catalyst 2960',
        family: 'Catalyst',
        vendor: 'cisco',
        type: 'switch',
        deviceFamily: 'infrastructure',
        fixedPorts: [
            ...faPorts24(),
            ...sfpPorts(2), // 2 SFP uplinks
            consolePort
        ],
        moduleSlots: [],
        capabilities: {
            ...baseSwitchCapabilities,
            maxEtherchannels: 6,
            ptSupportedVersion: '6.0'
        },
        displayName: 'Cisco 2960-24TT-L',
        description: '24 FastEthernet + 2 Gigabit SFP',
        ptCategory: 'Switches',
        tags: ['switch', '2960', 'layer2', 'fastethernet'],
        releaseYear: 2005
    },
    {
        id: 'switch-2960-24tc',
        model: '2960-24TC-L',
        series: 'Catalyst 2960',
        family: 'Catalyst',
        vendor: 'cisco',
        type: 'switch',
        deviceFamily: 'infrastructure',
        fixedPorts: [
            ...faPorts24(),
            ...sfpPorts(2),
            consolePort
        ],
        moduleSlots: [],
        capabilities: {
            ...baseSwitchCapabilities,
            ptSupportedVersion: '6.0'
        },
        displayName: 'Cisco 2960-24TC-L',
        description: '24 FastEthernet + 2 dual-purpose uplinks',
        ptCategory: 'Switches',
        tags: ['switch', '2960', 'layer2'],
        releaseYear: 2005
    },
    // === Catalyst 2950 Series (Legacy) ===
    {
        id: 'switch-2950-24',
        model: '2950-24',
        series: 'Catalyst 2950',
        family: 'Catalyst',
        vendor: 'cisco',
        type: 'switch',
        deviceFamily: 'infrastructure',
        fixedPorts: [
            ...faPorts24(),
            consolePort
        ],
        moduleSlots: [],
        capabilities: {
            ...baseSwitchCapabilities,
            supportsEtherchannel: false,
            maxEtherchannels: 0,
            ptSupportedVersion: '5.0'
        },
        displayName: 'Cisco 2950-24',
        description: 'Legacy 24-port FastEthernet switch',
        ptCategory: 'Switches',
        tags: ['switch', '2950', 'legacy', 'layer2'],
        releaseYear: 2000,
        isLegacy: true
    },
    {
        id: 'switch-2950t-24',
        model: '2950T-24',
        series: 'Catalyst 2950',
        family: 'Catalyst',
        vendor: 'cisco',
        type: 'switch',
        deviceFamily: 'infrastructure',
        fixedPorts: [
            ...faPorts24(),
            {
                type: 'GigabitEthernet',
                prefix: 'Gi',
                module: 0,
                range: [1, 2],
                speed: 1000,
                connector: 'rj45',
                supportsCopper: true
            },
            consolePort
        ],
        moduleSlots: [],
        capabilities: {
            ...baseSwitchCapabilities,
            supportsEtherchannel: false,
            maxEtherchannels: 0,
            ptSupportedVersion: '5.0'
        },
        displayName: 'Cisco 2950T-24',
        description: 'Legacy 24-port FE + 2 GE uplinks',
        ptCategory: 'Switches',
        tags: ['switch', '2950', 'legacy', 'layer2'],
        releaseYear: 2000,
        isLegacy: true
    },
    // === Catalyst 3560 (L3) ===
    {
        id: 'switch-3560-24ps',
        model: '3560-24PS',
        series: 'Catalyst 3560',
        family: 'Catalyst',
        vendor: 'cisco',
        type: 'multilayer-switch',
        deviceFamily: 'infrastructure',
        fixedPorts: [
            ...faPorts24PoE(),
            ...sfpPorts(2),
            consolePort
        ],
        moduleSlots: [],
        capabilities: {
            ...baseL3SwitchCapabilities,
            supportsPoe: true,
            poeBudget: 370,
            maxEtherchannels: 8,
            ptSupportedVersion: '6.0'
        },
        displayName: 'Cisco 3560-24PS',
        description: '24 FE PoE + 2 SFP, Layer 3',
        ptCategory: 'Switches',
        tags: ['switch', '3560', 'layer3', 'poe'],
        releaseYear: 2003
    },
    // === Catalyst 3650 ===
    {
        id: 'switch-3650-24ps',
        model: '3650-24PS',
        series: 'Catalyst 3650',
        family: 'Catalyst',
        vendor: 'cisco',
        type: 'multilayer-switch',
        deviceFamily: 'infrastructure',
        fixedPorts: [
            ...giPorts24PoE(),
            {
                type: 'GigabitEthernet',
                prefix: 'Gi',
                module: 0,
                range: [25, 28],
                speed: 1000,
                connector: 'sfp',
                supportsFiber: true
            },
            consolePort
        ],
        moduleSlots: [],
        capabilities: {
            ...baseL3SwitchCapabilities,
            supportsPoe: true,
            poeBudget: 740,
            maxEtherchannels: 8,
            ptSupportedVersion: '7.0'
        },
        displayName: 'Cisco 3650-24PS',
        description: '24 GE PoE + 4 SFP, Layer 3',
        ptCategory: 'Switches',
        tags: ['switch', '3650', 'layer3', 'poe', 'gigabit'],
        releaseYear: 2013
    },
    // === Industrial Switches ===
    {
        id: 'switch-ie2000',
        model: 'IE2000',
        series: 'IE 2000',
        family: 'Industrial',
        vendor: 'cisco',
        type: 'switch',
        deviceFamily: 'infrastructure',
        fixedPorts: [
            {
                type: 'FastEthernet',
                prefix: 'Fa',
                module: 0,
                range: [1, 8],
                speed: 100,
                connector: 'rj45',
                supportsCopper: true
            },
            ...sfpPorts(2, 9),
            consolePort
        ],
        moduleSlots: [],
        capabilities: {
            ...baseSwitchCapabilities,
            ptSupportedVersion: '7.0'
        },
        displayName: 'Cisco IE 2000',
        description: 'Industrial Ethernet Switch',
        ptCategory: 'Switches',
        tags: ['switch', 'industrial', 'ie2000'],
        releaseYear: 2012
    },
    {
        id: 'switch-ie3400',
        model: 'IE-3400',
        series: 'IE 3400',
        family: 'Industrial',
        vendor: 'cisco',
        type: 'switch',
        deviceFamily: 'infrastructure',
        fixedPorts: [
            ...giPorts24(),
            consolePort
        ],
        moduleSlots: [],
        capabilities: {
            ...baseSwitchCapabilities,
            ptSupportedVersion: '8.0'
        },
        displayName: 'Cisco IE 3400',
        description: 'Industrial Gigabit Switch',
        ptCategory: 'Switches',
        tags: ['switch', 'industrial', 'ie3400', 'gigabit'],
        releaseYear: 2017
    },
    {
        id: 'switch-ie9320',
        model: 'IE-9320',
        series: 'IE 9320',
        family: 'Industrial',
        vendor: 'cisco',
        type: 'multilayer-switch',
        deviceFamily: 'infrastructure',
        fixedPorts: [
            ...giPorts48(),
            consolePort
        ],
        moduleSlots: [],
        capabilities: {
            ...baseL3SwitchCapabilities,
            ptSupportedVersion: '8.0'
        },
        displayName: 'Cisco IE 9320',
        description: 'Industrial L3 Gigabit Switch',
        ptCategory: 'Switches',
        tags: ['switch', 'industrial', 'layer3', 'gigabit'],
        releaseYear: 2019
    },
    // === Bridge-PT (Generic) ===
    {
        id: 'switch-bridge-pt',
        model: 'Bridge-PT',
        series: 'Packet Tracer',
        family: 'Generic',
        vendor: 'cisco',
        type: 'switch',
        deviceFamily: 'infrastructure',
        fixedPorts: [
            ...faPorts24(),
            consolePort
        ],
        moduleSlots: [],
        capabilities: {
            ...baseSwitchCapabilities,
            supportsVtp: false,
            supportsStp: true,
            stpModes: ['pvst'],
            supportsEtherchannel: false,
            maxEtherchannels: 0,
            ptSupportedVersion: '5.0'
        },
        displayName: 'Bridge-PT',
        description: 'Generic Layer 2 Bridge',
        ptCategory: 'Switches',
        tags: ['switch', 'bridge', 'generic'],
        isGeneric: true
    }
];
export default switchCatalog;
//# sourceMappingURL=switches.js.map