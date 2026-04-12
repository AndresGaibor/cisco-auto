// ============================================================================
// BlueprintStore - Almacena operaciones incrementales del blueprint
// ============================================================================

import type {
  TopologyBlueprint,
  NetworkOperation,
  DeviceBlueprint,
  LinkBlueprint,
  DhcpPoolBlueprint,
  VlanBlueprint,
  RouteBlueprint,
  AclBlueprint,
} from './topology-lint-types.js';

const EMPTY_BLUEPRINT: TopologyBlueprint = {
  devices: {},
  operations: [],
  links: [],
  dhcpPools: [],
  vlans: [],
  routes: [],
  acls: [],
};

/**
 * BlueprintStore - construcción incremental del blueprint desde operaciones
 */
export class BlueprintStore {
  private blueprint: TopologyBlueprint = { ...EMPTY_BLUEPRINT };
  private operationListeners: ((op: NetworkOperation) => void)[] = [];

  /**
   * Registrar operación
   */
  recordOperation(op: Omit<NetworkOperation, 'id' | 'timestamp'>): void {
    const operation: NetworkOperation = {
      ...op,
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.blueprint.operations.push(operation);
    this.applyOperationToBlueprint(operation);
    
    // Notify listeners
    for (const listener of this.operationListeners) {
      listener(operation);
    }
  }

  /**
   * Aplicar operación al blueprint
   */
  private applyOperationToBlueprint(op: NetworkOperation): void {
    switch (op.type) {
      case 'CREATE_VLAN':
        this.applyCreateVlan(op);
        break;
      case 'CONFIGURE_TRUNK':
        this.applyConfigureTrunk(op);
        break;
      case 'CONFIGURE_ACCESS_PORT':
        this.applyConfigureAccessPort(op);
        break;
      case 'CREATE_SVI':
        this.applyCreateSvi(op);
        break;
      case 'CREATE_SUBINTERFACE':
        this.applyCreateSubinterface(op);
        break;
      case 'CREATE_DHCP_POOL':
        this.applyCreateDhcpPool(op);
        break;
      case 'CREATE_STATIC_ROUTE':
        this.applyCreateStaticRoute(op);
        break;
      case 'CONFIGURE_OSPF':
      case 'CONFIGURE_EIGRP':
      case 'CONFIGURE_BGP':
        this.applyConfigureRouting(op);
        break;
      case 'CREATE_ACL':
        this.applyCreateAcl(op);
        break;
      case 'SET_IP_ADDRESS':
        this.applySetIpAddress(op);
        break;
    }
  }

  private applyCreateVlan(op: NetworkOperation): void {
    const vlan: VlanBlueprint = {
      id: op.expected['id'] as number,
      name: op.expected['name'] as string,
      devices: [op.device],
    };
    
    // Add or update VLAN
    const existing = this.blueprint.vlans.find(v => v.id === vlan.id);
    if (existing) {
      if (!existing.devices.includes(op.device)) {
        existing.devices.push(op.device);
      }
    } else {
      this.blueprint.vlans.push(vlan);
    }
  }

  private applyConfigureTrunk(op: NetworkOperation): void {
    const device = this.getOrCreateDevice(op.device);
    const iface = op.expected['interface'] as string;
    const allowedVlans = op.expected['allowedVlans'] as number[];
    const nativeVlan = op.expected['nativeVlan'] as number | undefined;
    
    const existing = device.interfaces.find(i => i.name === iface);
    if (existing) {
      existing.mode = 'trunk';
      existing.trunkVlanAllowed = allowedVlans;
      existing.trunkNativeVlan = nativeVlan;
    } else {
      device.interfaces.push({
        name: iface,
        mode: 'trunk',
        trunkVlanAllowed: allowedVlans,
        trunkNativeVlan: nativeVlan,
      });
    }
  }

  private applyConfigureAccessPort(op: NetworkOperation): void {
    const device = this.getOrCreateDevice(op.device);
    const iface = op.expected['interface'] as string;
    const vlan = op.expected['vlan'] as number;
    
    const existing = device.interfaces.find(i => i.name === iface);
    if (existing) {
      existing.mode = 'access';
      existing.vlan = vlan;
    } else {
      device.interfaces.push({
        name: iface,
        mode: 'access',
        vlan: vlan,
      });
    }
  }

  private applyCreateSvi(op: NetworkOperation): void {
    const device = this.getOrCreateDevice(op.device);
    const vlan = op.expected['vlan'] as number;
    const ip = op.expected['ip'] as string | undefined;
    const mask = op.expected['mask'] as string | undefined;
    
    const existing = device.svis.find(s => s.vlan === vlan);
    if (existing) {
      existing.ip = ip;
      existing.mask = mask;
    } else {
      device.svis.push({ vlan, ip, mask });
    }
    
    // Also track VLAN
    if (!device.vlans.includes(String(vlan))) {
      device.vlans.push(String(vlan));
    }
  }

  private applyCreateSubinterface(op: NetworkOperation): void {
    const device = this.getOrCreateDevice(op.device);
    const number = op.expected['number'] as string;
    const encapsulation = op.expected['encapsulation'] as string | undefined;
    const vlan = op.expected['vlan'] as number | undefined;
    const ip = op.expected['ip'] as string | undefined;
    const mask = op.expected['mask'] as string | undefined;
    
    const existing = device.subinterfaces.find(s => s.number === number);
    if (existing) {
      existing.encapsulation = encapsulation as 'dot1q' | 'isl';
      existing.vlan = vlan;
      existing.ip = ip;
      existing.mask = mask;
    } else {
      device.subinterfaces.push({
        number,
        encapsulation: encapsulation as 'dot1q' | 'isl',
        vlan,
        ip,
        mask,
      });
    }
  }

  private applyCreateDhcpPool(op: NetworkOperation): void {
    const pool: DhcpPoolBlueprint = {
      id: op.entity,
      device: op.device,
      network: op.expected['network'] as string,
      mask: op.expected['mask'] as string,
      startIp: op.expected['startIp'] as string,
      endIp: op.expected['endIp'] as string,
      defaultRouter: op.expected['defaultRouter'] as string,
      vlan: op.expected['vlan'] as number | undefined,
    };
    
    this.blueprint.dhcpPools.push(pool);
  }

  private applyCreateStaticRoute(op: NetworkOperation): void {
    const route: RouteBlueprint = {
      id: op.entity,
      device: op.device,
      type: 'static',
      network: op.expected['network'] as string | undefined,
      mask: op.expected['mask'] as string | undefined,
      nextHop: op.expected['nextHop'] as string | undefined,
      metric: op.expected['metric'] as number | undefined,
    };
    
    this.blueprint.routes.push(route);
  }

  private applyConfigureRouting(op: NetworkOperation): void {
    const isType = op.type === 'CONFIGURE_OSPF' ? 'ospf' : 
                   op.type === 'CONFIGURE_EIGRP' ? 'eigrp' : 
                   op.type === 'CONFIGURE_BGP' ? 'bgp' : 'static';
    
    const route: RouteBlueprint = {
      id: op.entity,
      device: op.device,
      type: isType,
      network: op.expected['network'] as string | undefined,
      mask: op.expected['mask'] as string | undefined,
      nextHop: op.expected['nextHop'] as string | undefined,
    };
    
    this.blueprint.routes.push(route);
  }

  private applyCreateAcl(op: NetworkOperation): void {
    const acl: AclBlueprint = {
      id: op.entity,
      name: op.expected['name'] as string,
      type: op.expected['type'] as 'standard' | 'extended',
      device: op.device,
      appliedTo: op.expected['appliedTo'] as string[] | undefined,
    };
    
    this.blueprint.acls.push(acl);
  }

  private applySetIpAddress(op: NetworkOperation): void {
    const device = this.getOrCreateDevice(op.device);
    const iface = op.expected['interface'] as string;
    const ip = op.expected['ip'] as string | undefined;
    const mask = op.expected['mask'] as string | undefined;
    
    const existing = device.interfaces.find(i => i.name === iface);
    if (existing) {
      existing.ip = ip;
      existing.mask = mask;
    } else {
      device.interfaces.push({
        name: iface,
        ip,
        mask,
      });
    }
  }

  /**
   * Obtener o crear device
   */
  private getOrCreateDevice(name: string): DeviceBlueprint {
    if (!this.blueprint.devices[name]) {
      this.blueprint.devices[name] = {
        name,
        type: 'router', // default
        interfaces: [],
        vlans: [],
        svis: [],
        subinterfaces: [],
      };
    }
    return this.blueprint.devices[name];
  }

  /**
   * Obtener blueprint actual
   */
  getBlueprint(): TopologyBlueprint {
    return { ...this.blueprint };
  }

  /**
   * Obtener operaciones
   */
  getOperations(): NetworkOperation[] {
    return [...this.blueprint.operations];
  }

  /**
   * Obtener operaciones por tipo
   */
  getOperationsByType(type: string): NetworkOperation[] {
    return this.blueprint.operations.filter(op => op.type === type);
  }

  /**
   * Obtener operaciones por device
   */
  getOperationsByDevice(device: string): NetworkOperation[] {
    return this.blueprint.operations.filter(op => op.device === device);
  }

  /**
   * Limpiar blueprint
   */
  clear(): void {
    this.blueprint = { ...EMPTY_BLUEPRINT };
  }

  /**
   * Agregar listener para operaciones
   */
  addOperationListener(listener: (op: NetworkOperation) => void): void {
    this.operationListeners.push(listener);
  }

  /**
   * Remover listener
   */
  removeOperationListener(listener: (op: NetworkOperation) => void): void {
    const index = this.operationListeners.indexOf(listener);
    if (index >= 0) {
      this.operationListeners.splice(index, 1);
    }
  }
}