/**
 * DEVICE SPECIFICATION - MODELO CANÓNICO DE DISPOSITIVO
 *
 * Este es el modelo único y completo para representar un dispositivo de red.
 * Incluye todos los campos necesarios para:
 * - Configuración de red (IP, VLANs, routing)
 * - Configuración de seguridad (ACLs, NAT)
 * - Configuración de servicios (DHCP, NTP)
 * - Metadatos (posición, modelo, estado)
 */
import type { DeviceType, CanvasPosition, InterfaceStatus, SwitchportMode, DuplexMode, Speed } from './types';
import type { STPSpec, EtherChannelSpec, PortSecuritySpec, RIPSpec, BGPSpec, ServicesSpec } from './protocol.spec';
import type { VlanId, VlanName, VlanRange, VtpDomain, VtpMode, VtpVersion, VtpPassword } from '../value-objects/index.js';
export type { STPSpec, EtherChannelSpec, PortSecuritySpec, RIPSpec, BGPSpec, BGPNeighbor, ServicesSpec, NTPSpec, DHCPServerSpec, } from './protocol.spec';
export interface InterfaceSpec {
    /** Nombre de la interfaz (ej: GigabitEthernet0/0) */
    name: string;
    /** Descripción */
    description?: string;
    /** Dirección IP */
    ip?: string;
    /** Máscara de subred */
    subnetMask?: string;
    /** CIDR (alternativa a subnetMask) */
    cidr?: number;
    /** Dirección MAC */
    mac?: string;
    /** VLAN (para access ports) */
    vlan?: VlanId;
    /** VLAN nativa (para trunk) */
    nativeVlan?: VlanId;
    /** VLANs permitidas (para trunk) */
    allowedVlans?: VlanRange;
    /** Modo de switchport */
    switchportMode?: SwitchportMode;
    /** Estado administrativo */
    shutdown?: boolean;
    /** Estado del link */
    status?: InterfaceStatus;
    /** Velocidad */
    speed?: Speed;
    /** Duplex */
    duplex?: DuplexMode;
    /** Channel group (EtherChannel) */
    channelGroup?: number;
    /** Descripción del puerto conectado */
    connectedTo?: string;
}
export interface VLANSpec {
    /** ID de VLAN (1-4094) */
    id: VlanId;
    /** Nombre de la VLAN */
    name?: VlanName;
    /** Interfaces asignadas */
    interfaces?: string[];
}
export interface VTPSpec {
    /** Dominio VTP */
    domain: VtpDomain;
    /** Modo VTP */
    mode: VtpMode;
    /** Versión */
    version?: VtpVersion;
    /** Password */
    password?: VtpPassword;
    /** Pruning habilitado */
    pruning?: boolean;
}
export interface StaticRouteSpec {
    /** Red destino */
    network: string;
    /** Máscara de destino */
    mask?: string;
    /** Next hop */
    nextHop: string;
    /** Interface de salida */
    interface?: string;
    /** Distancia administrativa */
    distance?: number;
    /** Tag */
    tag?: number;
}
export interface OSPFAreaSpec {
    /** ID del área */
    areaId: string;
    /** Redes en el área */
    networks: string[];
    /** Tipo de área */
    type?: 'normal' | 'stub' | 'nssa';
    /** Stub settings */
    stubSettings?: {
        noSummary?: boolean;
    };
}
export interface OSPFSpec {
    /** Process ID */
    processId: number;
    /** Router ID */
    routerId?: string;
    /** Áreas */
    areas: OSPFAreaSpec[];
    /** Interfaces pasivas */
    passiveInterfaces?: string[];
    /** Redistribute */
    redistribute?: ('connected' | 'static' | 'eigrp')[];
}
export interface EIGRPSpec {
    /** AS number */
    asNumber: number;
    /** Router ID */
    routerId?: string;
    /** Redes */
    networks: string[];
    /** Interfaces pasivas */
    passiveInterfaces?: string[];
    /** No auto-summary */
    noAutoSummary?: boolean;
}
export interface RoutingSpec {
    /** Rutas estáticas */
    static?: StaticRouteSpec[];
    /** OSPF */
    ospf?: OSPFSpec;
    /** EIGRP */
    eigrp?: EIGRPSpec;
    /** RIP */
    rip?: RIPSpec;
    /** BGP */
    bgp?: BGPSpec;
    /** IPv6 routing habilitado */
    ipv6UnicastRouting?: boolean;
}
export interface ACLRuleSpec {
    /** Número de línea */
    line?: number;
    /** Acción */
    action: 'permit' | 'deny';
    /** Protocolo */
    protocol: 'ip' | 'tcp' | 'udp' | 'icmp' | 'ospf' | 'eigrp' | number;
    /** Origen */
    source: string;
    /** Wildcard origen */
    sourceWildcard?: string;
    /** Puerto origen */
    sourcePort?: string | number;
    /** Destino */
    destination?: string;
    /** Wildcard destino */
    destinationWildcard?: string;
    /** Puerto destino */
    destinationPort?: string | number;
    /** Opciones */
    options?: string;
    /** Log */
    log?: boolean;
}
export interface ACLSpec {
    /** Nombre o número */
    name: string;
    /** Tipo */
    type: 'standard' | 'extended' | 'named';
    /** Dirección de aplicación */
    direction?: 'in' | 'out';
    /** Reglas */
    rules: ACLRuleSpec[];
    /** Interface donde se aplica */
    appliedOn?: string;
}
export interface NATPoolSpec {
    /** Nombre del pool */
    name: string;
    /** IP inicial */
    startIp: string;
    /** IP final */
    endIp: string;
    /** Máscara */
    netmask: string;
}
export interface NATSpec {
    /** Tipo de NAT */
    type: 'static' | 'dynamic' | 'pat';
    /** NAT estático */
    static?: {
        inside: string;
        outside: string;
    }[];
    /** NAT dinámico */
    dynamic?: {
        pool: string;
        acl: string;
    }[];
    /** PAT (overload) */
    pat?: {
        interface: string;
        acl: string;
    };
    /** Pools */
    pools?: NATPoolSpec[];
    /** Inside interfaces */
    insideInterfaces?: string[];
    /** Outside interfaces */
    outsideInterfaces?: string[];
}
export interface SecuritySpec {
    /** ACLs */
    acls?: ACLSpec[];
    /** NAT */
    nat?: NATSpec;
    /** Zone-based firewall */
    firewall?: {
        enabled: boolean;
        zones?: string[];
        policies?: string[];
    };
}
export interface Layer2Spec {
    /** STP */
    stp?: STPSpec;
    /** EtherChannels */
    etherChannels?: EtherChannelSpec[];
    /** Port Security */
    portSecurity?: PortSecuritySpec[];
    /** CDP */
    cdp?: {
        enabled: boolean;
        interfaces?: string[];
    };
    /** LLDP */
    lldp?: {
        enabled: boolean;
        interfaces?: string[];
    };
}
export interface LineSpec {
    /** Tipo de línea */
    type: 'console' | 'vty' | 'aux';
    /** Rango (ej: 0 4 para vty) */
    range?: [number, number];
    /** Transport input */
    transportInput?: ('ssh' | 'telnet')[];
    /** Transport output */
    transportOutput?: ('ssh' | 'telnet')[];
    /** Login */
    login?: boolean;
    /** Password */
    password?: string;
    /** Timeout */
    execTimeout?: {
        minutes: number;
        seconds: number;
    };
    /** ACL de acceso */
    accessClass?: string;
    /** Privilege level */
    privilege?: number;
}
export interface DeviceModelSpec {
    /** Vendor */
    vendor?: string;
    /** Serie */
    series?: string;
    /** Modelo específico */
    model?: string;
    /** Versión de IOS */
    iosVersion?: string;
    /** Número de slots */
    slots?: number;
    /** Módulos instalados */
    modules?: {
        slot: number;
        type: string;
        name?: string;
    }[];
}
export interface DeviceCredentialsSpec {
    /** Username */
    username?: string;
    /** Password (enable) */
    enablePassword?: string;
    /** Secret (enable secret) */
    enableSecret?: string;
    /** Password de consola */
    consolePassword?: string;
    /** SSH key */
    sshKey?: string;
}
export interface DeviceSpec {
    /** ID único del dispositivo */
    id: string;
    /** Nombre del dispositivo */
    name: string;
    /** Tipo de dispositivo */
    type: DeviceType;
    /** Hostname (nombre en IOS) */
    hostname?: string;
    /** Dominio DNS para SSH (usado en 'ip domain-name') */
    domain?: string;
    /** Información del modelo */
    model?: DeviceModelSpec;
    /** Interfaces de red */
    interfaces: InterfaceSpec[];
    /** VLANs */
    vlans?: VLANSpec[];
    /** VTP */
    vtp?: VTPSpec;
    /** Configuración de routing */
    routing?: RoutingSpec;
    /** Configuración de seguridad */
    security?: SecuritySpec;
    /** Servicios de red */
    services?: ServicesSpec;
    /** Configuración L2 */
    layer2?: Layer2Spec;
    /** Líneas (console, vty, aux) */
    lines?: LineSpec[];
    /** Credenciales de acceso */
    credentials?: DeviceCredentialsSpec;
    /** IP de management */
    managementIp?: string;
    /** Máscara de management */
    managementMask?: string;
    /** Gateway default */
    defaultGateway?: string;
    /** Posición visual */
    position?: CanvasPosition;
    /** Descripción */
    description?: string;
    /** Etiquetas */
    tags?: string[];
    /** Notas */
    notes?: string;
    /** Estado de power */
    powerOn?: boolean;
    /** Running config completa */
    runningConfig?: string;
    /** Startup config */
    startupConfig?: string;
}
/**
 * Factory para crear dispositivos
 */
export declare class DeviceSpecFactory {
    /**
     * Crea un dispositivo con valores por defecto
     */
    static create(partial: Partial<DeviceSpec> & {
        name: string;
        type: DeviceType;
    }): DeviceSpec;
    /**
     * Crea un router con configuración básica
     */
    static createRouter(name: string, options?: Partial<DeviceSpec>): DeviceSpec;
    /**
     * Crea un switch con puertos por defecto (Fa0/1 - Fa0/24)
     */
    static createSwitch(name: string, options?: Partial<DeviceSpec>): DeviceSpec;
    /**
     * Crea un PC con interfaz básica
     */
    static createPC(name: string, options?: Partial<DeviceSpec>): DeviceSpec;
    /**
     * Crea un server
     */
    static createServer(name: string, options?: Partial<DeviceSpec>): DeviceSpec;
}
//# sourceMappingURL=device.spec.d.ts.map