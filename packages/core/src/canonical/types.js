/**
 * TIPOS CANÓNICOS UNIFICADOS
 *
 * Este archivo es la ÚNICA fuente de verdad para tipos de dispositivos,
 * cables, conexiones, etc. Todos los demás módulos deben importar desde aquí.
 *
 * NO duplicar estos tipos en otros archivos.
 */
/**
 * Obtiene la familia de un tipo de dispositivo
 */
export function getDeviceFamily(type) {
    switch (type) {
        case 'router':
        case 'switch':
        case 'multilayer-switch':
        case 'hub':
        case 'cloud':
        case 'modem':
        case 'repeater':
            return 'infrastructure';
        case 'access-point':
        case 'wireless-router':
            return 'wireless';
        case 'firewall':
            return 'security';
        case 'pc':
        case 'laptop':
        case 'server':
        case 'printer':
        case 'ip-phone':
        case 'tablet':
        case 'smartphone':
        case 'tv':
            return 'end-device';
        case 'home-gateway':
        case 'sensor':
        case 'actuator':
        case 'mcu':
            return 'iot';
        case 'sniffer':
        case 'unknown':
        default:
            return 'other';
    }
}
// =============================================================================
// CABLE TYPES
// =============================================================================
/**
 * Tipos de cable/conexión
 * Valores compatibles con Packet Tracer XML
 */
export var CableType;
(function (CableType) {
    /** Cobre straight-through */
    CableType["STRAIGHT_THROUGH"] = "eStraightThrough";
    /** Cobre crossover */
    CableType["CROSSOVER"] = "eCrossOver";
    /** Fibra óptica */
    CableType["FIBER"] = "eFiber";
    /** Serial DCE */
    CableType["SERIAL_DCE"] = "eSerialDCE";
    /** Serial DTE */
    CableType["SERIAL_DTE"] = "eSerialDTE";
    /** Consola */
    CableType["CONSOLE"] = "eConsole";
    /** Coaxial */
    CableType["COAXIAL"] = "eCoaxial";
    /** Octal */
    CableType["OCTAL"] = "eOctal";
    /** Phone */
    CableType["PHONE"] = "ePhone";
    /** IoT */
    CableType["IOE"] = "eIoe";
    /** USB */
    CableType["USB"] = "eUsb";
    /** Wireless */
    CableType["WIRELESS"] = "eWireless";
})(CableType || (CableType = {}));
/**
 * Medio de transmisión
 */
export var LinkMedium;
(function (LinkMedium) {
    /** Cobre */
    LinkMedium["COPPER"] = "eCopper";
    /** Fibra óptica */
    LinkMedium["FIBER"] = "eFiber";
    /** Serial */
    LinkMedium["SERIAL"] = "eSerial";
    /** Inalámbrico */
    LinkMedium["WIRELESS"] = "eWireless";
    /** Coaxial */
    LinkMedium["COAXIAL"] = "eCoaxial";
    /** Phone */
    LinkMedium["PHONE"] = "ePhone";
})(LinkMedium || (LinkMedium = {}));
/**
 * Obtiene el medio a partir del tipo de cable
 */
export function getLinkMedium(cableType) {
    switch (cableType) {
        case CableType.STRAIGHT_THROUGH:
        case CableType.CROSSOVER:
            return LinkMedium.COPPER;
        case CableType.FIBER:
            return LinkMedium.FIBER;
        case CableType.SERIAL_DCE:
        case CableType.SERIAL_DTE:
            return LinkMedium.SERIAL;
        case CableType.COAXIAL:
            return LinkMedium.COAXIAL;
        case CableType.PHONE:
            return LinkMedium.PHONE;
        case CableType.WIRELESS:
            return LinkMedium.WIRELESS;
        default:
            return LinkMedium.COPPER;
    }
}
// =============================================================================
// PORT TYPES
// =============================================================================
/**
 * Tipos de puertos
 */
export var PortType;
(function (PortType) {
    /** Fast Ethernet (100Mbps) */
    PortType["FAST_ETHERNET"] = "FastEthernet";
    /** Gigabit Ethernet (1Gbps) */
    PortType["GIGABIT_ETHERNET"] = "GigabitEthernet";
    /** Ten Gigabit Ethernet (10Gbps) */
    PortType["TEN_GIGABIT_ETHERNET"] = "TenGigabitEthernet";
    /** Serial */
    PortType["SERIAL"] = "Serial";
    /** Fibra */
    PortType["FIBER"] = "Fiber";
    /** Consola */
    PortType["CONSOLE"] = "Console";
    /** Auxiliar */
    PortType["AUXILIARY"] = "Aux";
    /** USB */
    PortType["USB"] = "USB";
    /** Puerto genérico */
    PortType["ETHERNET"] = "Ethernet";
    /** Wireless */
    PortType["WIRELESS"] = "Wireless";
    /** DSL */
    PortType["DSL"] = "DSL";
    /** Cable */
    PortType["CABLE"] = "Cable";
})(PortType || (PortType = {}));
/**
 * Parsea el nombre de un puerto para obtener su tipo y número
 */
export function parsePortName(portName) {
    // Patrones comunes: FastEthernet0/1, Gi0/0/1, Serial0/0/0:0
    const patterns = [
        {
            regex: /^(Fa|FastEthernet)(\d+)\/(\d+)$/i,
            type: PortType.FAST_ETHERNET,
            extract: (m) => ({ module: parseInt(m[2]), number: parseInt(m[3]) })
        },
        {
            regex: /^(Gi|GigabitEthernet)(\d+)\/(\d+)(\/(\d+))?$/i,
            type: PortType.GIGABIT_ETHERNET,
            extract: (m) => ({ module: parseInt(m[2]), number: parseInt(m[4] ?? m[3]) })
        },
        {
            regex: /^(Te|TenGigabitEthernet)(\d+)\/(\d+)$/i,
            type: PortType.TEN_GIGABIT_ETHERNET,
            extract: (m) => ({ module: parseInt(m[2]), number: parseInt(m[3]) })
        },
        {
            regex: /^(Se|Serial)(\d+)\/(\d+)(\/(\d+))?(:\d+)?$/i,
            type: PortType.SERIAL,
            extract: (m) => ({ module: parseInt(m[2]), number: parseInt(m[4] ?? m[3]) })
        },
        {
            regex: /^(Console|Con)(\d*)$/i,
            type: PortType.CONSOLE,
            extract: (m) => ({ module: 0, number: parseInt(m[2]) || 0 })
        },
        {
            regex: /^(Aux)(\d*)$/i,
            type: PortType.AUXILIARY,
            extract: (m) => ({ module: 0, number: parseInt(m[2]) || 0 })
        },
        {
            regex: /^(USB)(\d*)$/i,
            type: PortType.USB,
            extract: (m) => ({ module: 0, number: parseInt(m[2]) || 0 })
        },
        {
            regex: /^(Eth|Ethernet)(\d+)\/(\d+)$/i,
            type: PortType.ETHERNET,
            extract: (m) => ({ module: parseInt(m[2]), number: parseInt(m[3]) })
        }
    ];
    for (const pattern of patterns) {
        const match = portName.match(pattern.regex);
        if (match) {
            const { module, number } = pattern.extract(match);
            return {
                type: pattern.type,
                module,
                number,
                fullName: portName
            };
        }
    }
    // Default a Ethernet genérico
    return {
        type: PortType.ETHERNET,
        module: 0,
        number: 0,
        fullName: portName
    };
}
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Genera un ID único
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Valida formato de IP
 */
export function isValidIP(ip) {
    const pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!pattern.test(ip))
        return false;
    const octets = ip.split('.').map(Number);
    return octets.every(octet => octet >= 0 && octet <= 255);
}
/**
 * Valida formato de MAC
 */
export function isValidMAC(mac) {
    const pattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return pattern.test(mac);
}
/**
 * Convierte CIDR a máscara de subred
 * Usa método aritmético para evitar bugs con signed 32-bit bitwise operations
 */
export function cidrToMask(cidr) {
    if (cidr < 0 || cidr > 32) {
        throw new Error('CIDR must be between 0 and 32');
    }
    // Método aritmético seguro - evita problemas con signed/unsigned bitwise
    const octets = [];
    for (let i = 0; i < 4; i++) {
        const bits = Math.max(0, Math.min(8, cidr - i * 8));
        octets.push(256 - Math.pow(2, 8 - bits));
    }
    return octets.join('.');
}
/**
 * Convierte máscara a CIDR
 */
export function maskToCidr(mask) {
    const octets = mask.split('.').map(Number);
    let cidr = 0;
    for (const octet of octets) {
        let bits = octet;
        while (bits) {
            cidr += bits & 1;
            bits >>= 1;
        }
    }
    return cidr;
}
/**
 * Obtiene la dirección de red
 */
export function getNetworkAddress(ip, mask) {
    const ipOctets = ip.split('.').map(Number);
    const maskOctets = mask.split('.').map(Number);
    return ipOctets
        .map((octet, i) => octet & (maskOctets[i] ?? 0))
        .join('.');
}
/**
 * Obtiene la dirección de broadcast
 */
export function getBroadcastAddress(ip, mask) {
    const ipOctets = ip.split('.').map(Number);
    const maskOctets = mask.split('.').map(Number);
    return ipOctets
        .map((octet, i) => (octet & (maskOctets[i] ?? 0)) | (~(maskOctets[i] ?? 0) & 255))
        .join('.');
}
//# sourceMappingURL=types.js.map