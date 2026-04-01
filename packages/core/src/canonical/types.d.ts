/**
 * TIPOS CANÓNICOS UNIFICADOS
 *
 * Este archivo es la ÚNICA fuente de verdad para tipos de dispositivos,
 * cables, conexiones, etc. Todos los demás módulos deben importar desde aquí.
 *
 * NO duplicar estos tipos en otros archivos.
 */
/**
 * Tipos de dispositivos soportados
 * Incluye todos los tipos de Packet Tracer
 */
export type DeviceType = 'router' | 'switch' | 'multilayer-switch' | 'hub' | 'access-point' | 'wireless-router' | 'firewall' | 'cloud' | 'modem' | 'pc' | 'laptop' | 'server' | 'printer' | 'ip-phone' | 'tablet' | 'smartphone' | 'tv' | 'home-gateway' | 'sensor' | 'actuator' | 'mcu' | 'repeater' | 'sniffer' | 'unknown';
/**
 * Familias de dispositivos para categorización
 */
export type DeviceFamily = 'infrastructure' | 'end-device' | 'wireless' | 'security' | 'iot' | 'industrial' | 'other';
/**
 * Obtiene la familia de un tipo de dispositivo
 */
export declare function getDeviceFamily(type: DeviceType): DeviceFamily;
/**
 * Tipos de cable/conexión
 * Valores compatibles con Packet Tracer XML
 */
export declare enum CableType {
    /** Cobre straight-through */
    STRAIGHT_THROUGH = "eStraightThrough",
    /** Cobre crossover */
    CROSSOVER = "eCrossOver",
    /** Fibra óptica */
    FIBER = "eFiber",
    /** Serial DCE */
    SERIAL_DCE = "eSerialDCE",
    /** Serial DTE */
    SERIAL_DTE = "eSerialDTE",
    /** Consola */
    CONSOLE = "eConsole",
    /** Coaxial */
    COAXIAL = "eCoaxial",
    /** Octal */
    OCTAL = "eOctal",
    /** Phone */
    PHONE = "ePhone",
    /** IoT */
    IOE = "eIoe",
    /** USB */
    USB = "eUsb",
    /** Wireless */
    WIRELESS = "eWireless"
}
/**
 * Medio de transmisión
 */
export declare enum LinkMedium {
    /** Cobre */
    COPPER = "eCopper",
    /** Fibra óptica */
    FIBER = "eFiber",
    /** Serial */
    SERIAL = "eSerial",
    /** Inalámbrico */
    WIRELESS = "eWireless",
    /** Coaxial */
    COAXIAL = "eCoaxial",
    /** Phone */
    PHONE = "ePhone"
}
/**
 * Obtiene el medio a partir del tipo de cable
 */
export declare function getLinkMedium(cableType: CableType): LinkMedium;
/**
 * Tipos de puertos
 */
export declare enum PortType {
    /** Fast Ethernet (100Mbps) */
    FAST_ETHERNET = "FastEthernet",
    /** Gigabit Ethernet (1Gbps) */
    GIGABIT_ETHERNET = "GigabitEthernet",
    /** Ten Gigabit Ethernet (10Gbps) */
    TEN_GIGABIT_ETHERNET = "TenGigabitEthernet",
    /** Serial */
    SERIAL = "Serial",
    /** Fibra */
    FIBER = "Fiber",
    /** Consola */
    CONSOLE = "Console",
    /** Auxiliar */
    AUXILIARY = "Aux",
    /** USB */
    USB = "USB",
    /** Puerto genérico */
    ETHERNET = "Ethernet",
    /** Wireless */
    WIRELESS = "Wireless",
    /** DSL */
    DSL = "DSL",
    /** Cable */
    CABLE = "Cable"
}
/**
 * Parsea el nombre de un puerto para obtener su tipo y número
 */
export declare function parsePortName(portName: string): {
    type: PortType;
    module: number;
    number: number;
    fullName: string;
};
/**
 * Estado de una interfaz
 */
export type InterfaceStatus = 'up' | 'down' | 'administratively-down';
/**
 * Modo de switchport
 */
export type SwitchportMode = 'access' | 'trunk' | 'dynamic' | 'none';
/**
 * Modo de negociación
 */
export type DuplexMode = 'auto' | 'full' | 'half';
/**
 * Velocidad
 */
export type Speed = 'auto' | '10' | '100' | '1000' | '10000';
/**
 * Dificultad de un laboratorio
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
/**
 * Tipo de validación
 */
export type ValidationType = 'ping' | 'traceroute' | 'http' | 'https' | 'ftp' | 'dns' | 'dhcp' | 'telnet' | 'ssh' | 'custom';
/**
 * Posición en el canvas
 */
export interface CanvasPosition {
    x: number;
    y: number;
    width?: number;
    height?: number;
    rotation?: number;
}
/**
 * Genera un ID único
 */
export declare function generateId(): string;
/**
 * Valida formato de IP
 */
export declare function isValidIP(ip: string): boolean;
/**
 * Valida formato de MAC
 */
export declare function isValidMAC(mac: string): boolean;
/**
 * Convierte CIDR a máscara de subred
 * Usa método aritmético para evitar bugs con signed 32-bit bitwise operations
 */
export declare function cidrToMask(cidr: number): string;
/**
 * Convierte máscara a CIDR
 */
export declare function maskToCidr(mask: string): number;
/**
 * Obtiene la dirección de red
 */
export declare function getNetworkAddress(ip: string, mask: string): string;
/**
 * Obtiene la dirección de broadcast
 */
export declare function getBroadcastAddress(ip: string, mask: string): string;
//# sourceMappingURL=types.d.ts.map