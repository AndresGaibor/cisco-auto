/**
 * Protocolos de Routing - Tabla de rutas y lookup
 * 
 * Implementa lookup de rutas con longest prefix match,
 * gestión de rutas estáticas y generación de rutas conectadas.
 */

import { 
  ipToNumber, 
  getNetworkAddress, 
  cidrToMask, 
  maskToCidr,
  isValidIP,
  isIPInNetwork
} from './ipv4';

// =============================================================================
// ROUTE TYPES
// =============================================================================

/**
 * Protocolo de origen de una ruta
 */
export type RouteProtocol = 
  | 'connected'    // Directamente conectada
  | 'static'       // Ruta estática
  | 'ospf'         // Open Shortest Path First
  | 'eigrp'        // Enhanced Interior Gateway Routing Protocol
  | 'rip'          // Routing Information Protocol
  | 'bgp'          // Border Gateway Protocol
  | 'isis';        // Intermediate System to Intermediate System

/**
 * Entrada de tabla de rutas
 */
export interface RouteEntry {
  /** Red destino (ej: 192.168.1.0) */
  network: string;
  
  /** Máscara de subred (ej: 255.255.255.0) */
  mask: string;
  
  /** CIDR (ej: 24) */
  cidr: number;
  
  /** Next hop IP (null para rutas conectadas) */
  nextHop: string | null;
  
  /** Interface de salida */
  interface: string;
  
  /** Distancia administrativa */
  administrativeDistance: number;
  
  /** Métrica del protocolo */
  metric: number;
  
  /** Protocolo de origen */
  protocol: RouteProtocol;
  
  /** Tiempo de edad (segundos) */
  age: number;
  
  /** Tag opcional */
  tag?: number;
}

/**
 * Resultado de lookup de ruta
 */
export interface RouteLookupResult {
  /** Ruta encontrada */
  route: RouteEntry | null;
  
  /** Interface de salida */
  interface: string | null;
  
  /** Next hop */
  nextHop: string | null;
  
  /** ¿Es ruta default? */
  isDefaultRoute: boolean;
  
  /** ¿Es ruta conectada? */
  isConnected: boolean;
}

// =============================================================================
// ADMINISTRATIVE DISTANCES
// =============================================================================

/**
 * Distancias administrativas por defecto (Cisco)
 */
export const ADMINISTRATIVE_DISTANCES: Record<RouteProtocol, number> = {
  connected: 0,
  static: 1,
  eigrp: 90,
  ospf: 110,
  isis: 115,
  rip: 120,
  bgp: 20    // eBGP, iBGP es 200
};

// =============================================================================
// ROUTING TABLE CLASS
// =============================================================================

/**
 * Tabla de rutas con lookup optimizado
 */
export class RoutingTable {
  private routes: RouteEntry[] = [];
  private currentTime: number = 0;
  
  /**
   * Número de rutas en la tabla
   */
  get size(): number {
    return this.routes.length;
  }
  
  /**
   * Actualiza el tiempo actual (para simulación)
   */
  setTime(now: number): void {
    this.currentTime = now;
  }
  
  /**
   * Añade una ruta a la tabla
   */
  addRoute(route: Omit<RouteEntry, 'cidr' | 'age'>): RouteEntry {
    const cidr = maskToCidr(route.mask);
    
    const entry: RouteEntry = {
      ...route,
      cidr,
      age: 0
    };
    
    // Verificar si ya existe una ruta idéntica
    const existingIndex = this.routes.findIndex(r => 
      r.network === entry.network &&
      r.mask === entry.mask &&
      r.protocol === entry.protocol &&
      r.nextHop === entry.nextHop
    );
    
    if (existingIndex >= 0) {
      // Actualizar métrica y edad
      this.routes[existingIndex] = entry;
    } else {
      this.routes.push(entry);
    }
    
    // Ordenar por CIDR descendente (más específicas primero)
    this.sortRoutes();
    
    return entry;
  }
  
  /**
   * Añade una ruta conectada
   */
  addConnectedRoute(
    ip: string,
    mask: string,
    interfaceName: string
  ): RouteEntry {
    const network = getNetworkAddress(ip, mask);
    
    return this.addRoute({
      network,
      mask,
      nextHop: null,
      interface: interfaceName,
      administrativeDistance: ADMINISTRATIVE_DISTANCES.connected,
      metric: 0,
      protocol: 'connected'
    });
  }
  
  /**
   * Añade una ruta estática
   */
  addStaticRoute(
    network: string,
    mask: string,
    nextHop: string | null,
    interfaceName: string,
    options: {
      administrativeDistance?: number;
      metric?: number;
    } = {}
  ): RouteEntry {
    return this.addRoute({
      network,
      mask,
      nextHop,
      interface: interfaceName,
      administrativeDistance: options.administrativeDistance ?? ADMINISTRATIVE_DISTANCES.static,
      metric: options.metric ?? 0,
      protocol: 'static'
    });
  }
  
  /**
   * Añade una ruta default (0.0.0.0/0)
   */
  addDefaultRoute(
    nextHop: string | null,
    interfaceName: string,
    options: {
      administrativeDistance?: number;
    } = {}
  ): RouteEntry {
    return this.addRoute({
      network: '0.0.0.0',
      mask: '0.0.0.0',
      nextHop,
      interface: interfaceName,
      administrativeDistance: options.administrativeDistance ?? ADMINISTRATIVE_DISTANCES.static,
      metric: 0,
      protocol: 'static'
    });
  }
  
  /**
   * Elimina una ruta
   */
  removeRoute(network: string, mask: string, protocol?: RouteProtocol): number {
    const initialSize = this.routes.length;
    
    this.routes = this.routes.filter(r => {
      if (r.network !== network || r.mask !== mask) return true;
      if (protocol && r.protocol !== protocol) return true;
      return false;
    });
    
    return initialSize - this.routes.length;
  }
  
  /**
   * Elimina todas las rutas de un protocolo
   */
  removeRoutesByProtocol(protocol: RouteProtocol): number {
    const initialSize = this.routes.length;
    this.routes = this.routes.filter(r => r.protocol !== protocol);
    return initialSize - this.routes.length;
  }
  
  /**
   * Elimina rutas de una interfaz
   */
  removeRoutesByInterface(interfaceName: string): number {
    const initialSize = this.routes.length;
    this.routes = this.routes.filter(r => r.interface !== interfaceName);
    return initialSize - this.routes.length;
  }
  
  /**
   * Lookup de ruta con longest prefix match
   */
  lookup(destinationIP: string): RouteLookupResult {
    let bestMatch: RouteEntry | null = null;
    let bestCIDR = -1;
    let bestAD = Infinity;
    let bestMetric = Infinity;
    
    for (const route of this.routes) {
      // Verificar si la IP está en la red de la ruta
      if (!isIPInNetwork(destinationIP, route.network, route.mask)) {
        continue;
      }
      
      // Longest prefix match
      if (route.cidr > bestCIDR) {
        bestMatch = route;
        bestCIDR = route.cidr;
        bestAD = route.administrativeDistance;
        bestMetric = route.metric;
      } else if (route.cidr === bestCIDR) {
        // Mismo CIDR, comparar por distancia administrativa
        if (route.administrativeDistance < bestAD) {
          bestMatch = route;
          bestAD = route.administrativeDistance;
          bestMetric = route.metric;
        } else if (route.administrativeDistance === bestAD) {
          // Misma AD, comparar por métrica
          if (route.metric < bestMetric) {
            bestMatch = route;
            bestMetric = route.metric;
          }
        }
      }
    }
    
    if (!bestMatch) {
      return {
        route: null,
        interface: null,
        nextHop: null,
        isDefaultRoute: false,
        isConnected: false
      };
    }
    
    return {
      route: bestMatch,
      interface: bestMatch.interface,
      nextHop: bestMatch.nextHop,
      isDefaultRoute: bestMatch.cidr === 0,
      isConnected: bestMatch.protocol === 'connected'
    };
  }
  
  /**
   * Obtiene todas las rutas
   */
  getAllRoutes(): RouteEntry[] {
    return [...this.routes];
  }
  
  /**
   * Obtiene rutas por protocolo
   */
  getRoutesByProtocol(protocol: RouteProtocol): RouteEntry[] {
    return this.routes.filter(r => r.protocol === protocol);
  }
  
  /**
   * Obtiene rutas de una interfaz
   */
  getRoutesByInterface(interfaceName: string): RouteEntry[] {
    return this.routes.filter(r => r.interface === interfaceName);
  }
  
  /**
   * Limpia todas las rutas
   */
  clear(): void {
    this.routes = [];
  }
  
  /**
   * Actualiza edades de las rutas
   */
  updateAges(deltaSeconds: number): void {
    for (const route of this.routes) {
      route.age += deltaSeconds;
    }
  }
  
  /**
   * Ordena las rutas por CIDR descendente, luego por AD ascendente
   */
  private sortRoutes(): void {
    this.routes.sort((a, b) => {
      // Primero por CIDR descendente (más específicas primero)
      if (a.cidr !== b.cidr) return b.cidr - a.cidr;
      // Luego por AD ascendente
      if (a.administrativeDistance !== b.administrativeDistance) {
        return a.administrativeDistance - b.administrativeDistance;
      }
      // Finalmente por métrica ascendente
      return a.metric - b.metric;
    });
  }
  
  /**
   * Serializa la tabla de rutas
   */
  serialize(): Array<{
    network: string;
    mask: string;
    cidr: number;
    nextHop: string | null;
    interface: string;
    administrativeDistance: number;
    metric: number;
    protocol: RouteProtocol;
    age: number;
  }> {
    return this.routes.map(r => ({
      network: r.network,
      mask: r.mask,
      cidr: r.cidr,
      nextHop: r.nextHop,
      interface: r.interface,
      administrativeDistance: r.administrativeDistance,
      metric: r.metric,
      protocol: r.protocol,
      age: r.age
    }));
  }
  
  /**
   * Formato tipo Cisco "show ip route"
   */
  toString(): string {
    const lines: string[] = [
      'Codes: C - connected, S - static, R - RIP, O - OSPF, E - EIGRP, B - BGP',
      ''
    ];
    
    for (const route of this.routes) {
      const protocolCode = this.getProtocolCode(route.protocol);
      const prefix = `${route.network}/${route.cidr}`;
      
      if (route.protocol === 'connected') {
        lines.push(`${protocolCode}    ${prefix} is directly connected, ${route.interface}`);
      } else if (route.nextHop) {
        lines.push(`${protocolCode}    ${prefix} [${route.administrativeDistance}/${route.metric}] via ${route.nextHop}, ${route.interface}`);
      } else {
        lines.push(`${protocolCode}    ${prefix} is directly connected, ${route.interface}`);
      }
    }
    
    return lines.join('\n');
  }
  
  private getProtocolCode(protocol: RouteProtocol): string {
    switch (protocol) {
      case 'connected': return 'C';
      case 'static': return 'S';
      case 'ospf': return 'O';
      case 'eigrp': return 'D';
      case 'rip': return 'R';
      case 'bgp': return 'B';
      case 'isis': return 'i';
      default: return '?';
    }
  }
}

// =============================================================================
// ROUTE GENERATION UTILITIES
// =============================================================================

/**
 * Genera rutas conectadas a partir de la configuración de interfaces
 */
export function generateConnectedRoutes(
  interfaces: Array<{
    name: string;
    ip?: string;
    subnetMask?: string;
    linkStatus: 'up' | 'down';
  }>
): RouteEntry[] {
  const routes: RouteEntry[] = [];
  
  for (const iface of interfaces) {
    if (iface.ip && iface.subnetMask && iface.linkStatus === 'up') {
      const network = getNetworkAddress(iface.ip, iface.subnetMask);
      const cidr = maskToCidr(iface.subnetMask);
      
      routes.push({
        network,
        mask: iface.subnetMask,
        cidr,
        nextHop: null,
        interface: iface.name,
        administrativeDistance: ADMINISTRATIVE_DISTANCES.connected,
        metric: 0,
        protocol: 'connected',
        age: 0
      });
    }
  }
  
  return routes;
}

/**
 * Crea una ruta estática
 */
export function createStaticRoute(
  network: string,
  mask: string,
  nextHop: string | null,
  interfaceName: string,
  options: {
    administrativeDistance?: number;
    metric?: number;
  } = {}
): RouteEntry {
  const cidr = maskToCidr(mask);
  
  return {
    network,
    mask,
    cidr,
    nextHop,
    interface: interfaceName,
    administrativeDistance: options.administrativeDistance ?? ADMINISTRATIVE_DISTANCES.static,
    metric: options.metric ?? 0,
    protocol: 'static',
    age: 0
  };
}

/**
 * Valida una ruta
 */
export function validateRoute(route: Partial<RouteEntry>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!route.network || !isValidIP(route.network)) {
    errors.push('Invalid network address');
  }
  
  if (!route.mask || !isValidIP(route.mask)) {
    errors.push('Invalid subnet mask');
  }
  
  if (route.nextHop && !isValidIP(route.nextHop)) {
    errors.push('Invalid next hop address');
  }
  
  if (!route.interface) {
    errors.push('Interface is required');
  }
  
  if (route.administrativeDistance !== undefined && 
      (route.administrativeDistance < 0 || route.administrativeDistance > 255)) {
    errors.push('Administrative distance must be between 0 and 255');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
