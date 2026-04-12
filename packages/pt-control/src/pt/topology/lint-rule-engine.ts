// ============================================================================
// LintRuleEngine - Ejecuta las 12 reglas de lint
// ============================================================================

import type {
  LintRule,
  LintResult,
  TopologyBlueprint,
  ObservedState,
  ObservedDevice,
  ObservedInterface,
  ObservedVlan,
  ObservedRoute,
  ObservedDhcpPool,
  ObservedAcl,
} from './topology-lint-types.js';

/**
 * LintRuleEngine - ejecuta todas las reglas de lint
 */
export class LintRuleEngine {
  private rules: LintRule[];

  constructor() {
    this.rules = this.initializeRules();
  }

  /**
   * Inicializar todas las reglas
   */
  private initializeRules(): LintRule[] {
    return [
      this.createIpDuplicateRule(),
      this.createSubnetNoGatewayRule(),
      this.createAccessPortVlanMissingRule(),
      this.createTrunkVlanNotAllowedRule(),
      this.createNativeVlanMismatchRule(),
      this.createSubinterfaceEncapsRule(),
      this.createDhcpPoolSubnetMismatchRule(),
      this.createDhcpHelperMissingRule(),
      this.createAclNotAppliedRule(),
      this.createStaticRouteNoReachRule(),
      this.createOrphanLinkRule(),
      this.createPortConflictRule(),
    ];
  }

  /**
   * Obtener todas las reglas
   */
  getRules(): LintRule[] {
    return [...this.rules];
  }

  /**
   * Ejecutar todas las reglas
   */
  run(blueprint: TopologyBlueprint, observed: ObservedState): LintResult[] {
    const results: LintResult[] = [];
    
    for (const rule of this.rules) {
      try {
        const ruleResults = rule.check(blueprint, observed);
        results.push(...ruleResults);
      } catch (error) {
        // Log error but continue
        console.warn(`Rule ${rule.id} failed:`, error);
      }
    }
    
    return results;
  }

  // ==================== Rule Implementations ====================

  private createIpDuplicateRule(): LintRule {
    return {
      id: 'ipDuplicate',
      name: 'IP Duplicada',
      description: 'Detectar IPs duplicadas entre dispositivos',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];
        const ipMap = new Map<string, string[]>();
        
        // Check observed devices
        for (const [deviceName, device] of Object.entries(observed.devices)) {
          for (const iface of device.interfaces) {
            if (iface.ip) {
              const existing = ipMap.get(iface.ip) || [];
              existing.push(deviceName);
              ipMap.set(iface.ip, existing);
            }
          }
          
          // Check SVIs
          const bpDevice = blueprint.devices[deviceName];
          if (bpDevice?.svis) {
            for (const svi of bpDevice.svis) {
              if (svi.ip) {
                const existing = ipMap.get(svi.ip) || [];
                existing.push(`${deviceName}/SVI-${svi.vlan}`);
                ipMap.set(svi.ip, existing);
              }
            }
          }
          
          // Check subinterfaces
          if (bpDevice?.subinterfaces) {
            for (const sub of bpDevice.subinterfaces) {
              if (sub.ip) {
                const existing = ipMap.get(sub.ip) || [];
                existing.push(`${deviceName}/${sub.number}`);
                ipMap.set(sub.ip, existing);
              }
            }
          }
        }
        
        // Find duplicates
        for (const [ip, devices] of Array.from(ipMap.entries())) {
          if (devices.length > 1) {
            results.push({
              rule: 'ipDuplicate',
              severity: 'critical',
              message: `IP ${ip} está asignada a múltiples dispositivos: ${devices.join(', ')}`,
              entity: ip,
              suggestion: 'Revisar configuración de IPs y eliminar duplicados',
            });
          }
        }
        
        return results;
      },
    };
  }

  private createSubnetNoGatewayRule(): LintRule {
    return {
      id: 'subnetNoGateway',
      name: 'Subred sin Gateway',
      description: 'Detectar subredes sin default gateway configurado',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];
        
        for (const [deviceName, device] of Object.entries(observed.devices)) {
          // Check interfaces for subnet without gateway
          const subnets = new Map<string, { ip: string; mask: string; hasGateway: boolean }>();
          
          for (const iface of device.interfaces) {
            if (iface.ip && iface.mask) {
              const subnetKey = this.getSubnetKey(iface.ip, iface.mask);
              if (!subnets.has(subnetKey)) {
                subnets.set(subnetKey, { ip: iface.ip, mask: iface.mask, hasGateway: false });
              }
            }
          }
          
          // Check SVIs for gateway
          const bpDevice = blueprint.devices[deviceName];
          if (bpDevice?.svis) {
            for (const svi of bpDevice.svis) {
              if (svi.ip && svi.mask) {
                const subnetKey = this.getSubnetKey(svi.ip, svi.mask);
                const existing = subnets.get(subnetKey);
                if (existing) {
                  existing.hasGateway = true; // SVI acts as gateway
                }
              }
            }
          }
          
          // Check subinterfaces
          if (bpDevice?.subinterfaces) {
            for (const sub of bpDevice.subinterfaces) {
              if (sub.ip && sub.mask) {
                const subnetKey = this.getSubnetKey(sub.ip, sub.mask);
                const existing = subnets.get(subnetKey);
                if (existing) {
                  existing.hasGateway = true;
                }
              }
            }
          }
          
          // Find subnets without gateway
          for (const [subnet, info] of Array.from(subnets.entries())) {
            if (!info.hasGateway) {
              results.push({
                rule: 'subnetNoGateway',
                severity: 'critical',
                message: `Subred ${subnet} en ${deviceName} no tiene gateway configurado`,
                entity: subnet,
                device: deviceName,
                suggestion: 'Configurar IP en interfaz como gateway o crear SVI',
              });
            }
          }
        }
        
        return results;
      },
    };
  }

  private createAccessPortVlanMissingRule(): LintRule {
    return {
      id: 'accessPortVlanMissing',
      name: 'Access Port VLAN Inexistente',
      description: 'Detectar puertos access en VLANs que no existen',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];
        
        // Get all VLANs from observed
        const observedVlans = new Set(observed.vlans.map(v => v.id));
        
        for (const [deviceName, device] of Object.entries(observed.devices)) {
          const bpDevice = blueprint.devices[deviceName];
          
          for (const iface of device.interfaces) {
            if (iface.mode === 'access' && iface.vlan) {
              if (!observedVlans.has(iface.vlan)) {
                results.push({
                  rule: 'accessPortVlanMissing',
                  severity: 'critical',
                  message: `Puerto ${iface.name} en ${deviceName} usa VLAN ${iface.vlan} que no existe`,
                  entity: `${deviceName}/${iface.name}`,
                  device: deviceName,
                  suggestion: `Crear VLAN ${iface.vlan} o cambiar puerto a VLAN existente`,
                });
              }
            }
          }
        }
        
        return results;
      },
    };
  }

  private createTrunkVlanNotAllowedRule(): LintRule {
    return {
      id: 'trunkVlanNotAllowed',
      name: 'Trunk no Permite VLAN',
      description: 'Detectar trunks que no permiten VLANs necesarias',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];
        
        // Get VLANs from blueprint
        const blueprintVlanIds = new Set(blueprint.vlans.map(v => v.id));
        
        for (const [deviceName, device] of Object.entries(observed.devices)) {
          const bpDevice = blueprint.devices[deviceName];
          
          for (const iface of device.interfaces) {
            if (iface.mode === 'trunk' && iface.trunkVlanAllowed) {
              // Check if required VLANs are allowed
              const deviceVlans = bpDevice?.vlans || [];
              for (const vlanId of deviceVlans) {
                if (!iface.trunkVlanAllowed.includes(Number(vlanId))) {
                  results.push({
                    rule: 'trunkVlanNotAllowed',
                    severity: 'critical',
                    message: `Trunk ${iface.name} en ${deviceName} no permite VLAN ${vlanId}`,
                    entity: `${deviceName}/${iface.name}`,
                    device: deviceName,
                    suggestion: `Agregar VLAN ${vlanId} al trunk: switchport trunk allowed vlan add ${vlanId}`,
                  });
                }
              }
            }
          }
        }
        
        return results;
      },
    };
  }

  private createNativeVlanMismatchRule(): LintRule {
    return {
      id: 'nativeVlanMismatch',
      name: 'Native VLAN Mismatch',
      description: 'Detectar Native VLAN diferente entre extremos de trunk',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];
        
        // Check links
        for (const link of observed.links) {
          const deviceA = observed.devices[link.deviceA];
          const deviceB = observed.devices[link.deviceB];
          
          if (!deviceA || !deviceB) continue;
          
          const ifaceA = deviceA.interfaces.find(i => i.name === link.interfaceA);
          const ifaceB = deviceB.interfaces.find(i => i.name === link.interfaceB);
          
          if (ifaceA?.mode === 'trunk' && ifaceB?.mode === 'trunk') {
            const nativeA = ifaceA.trunkVlanAllowed?.[0]; // First allowed is often native in PT
            const nativeB = ifaceB.trunkVlanAllowed?.[0];
            
            if (nativeA !== nativeB && nativeA !== undefined && nativeB !== undefined) {
              results.push({
                rule: 'nativeVlanMismatch',
                severity: 'warning',
                message: `Native VLAN mismatch en enlace ${link.deviceA}-${link.deviceB}: ${nativeA} vs ${nativeB}`,
                entity: `${link.deviceA}-${link.deviceB}`,
                suggestion: 'Configurar misma native VLAN en ambos extremos',
              });
            }
          }
        }
        
        return results;
      },
    };
  }

  private createSubinterfaceEncapsRule(): LintRule {
    return {
      id: 'subinterfaceEncaps',
      name: 'Subinterfaz sin Encapsulation',
      description: 'Detectar subinterfaces sin encapsulación consistente',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];
        
        for (const [deviceName, device] of Object.entries(observed.devices)) {
          const bpDevice = blueprint.devices[deviceName];
          
          if (bpDevice?.subinterfaces) {
            for (const sub of bpDevice.subinterfaces) {
              if (!sub.encapsulation || !sub.vlan) {
                results.push({
                  rule: 'subinterfaceEncaps',
                  severity: 'warning',
                  message: `Subinterfaz ${sub.number} en ${deviceName} no tiene encapsulación o VLAN`,
                  entity: `${deviceName}/${sub.number}`,
                  device: deviceName,
                  suggestion: 'Configurar: encapsulation dot1q <vlan>',
                });
              }
            }
          }
        }
        
        return results;
      },
    };
  }

  private createDhcpPoolSubnetMismatchRule(): LintRule {
    return {
      id: 'dhcpPoolSubnetMismatch',
      name: 'DHCP Pool no coincide con Subred',
      description: 'Detectar pools DHCP cuya red no coincide con la subred',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];
        
        // Check observed DHCP pools against device subnets
        for (const pool of observed.dhcpPools) {
          const device = observed.devices[pool.device];
          if (!device) continue;
          
          // Get all subnets on device
          const subnets = new Set<string>();
          for (const iface of device.interfaces) {
            if (iface.ip && iface.mask) {
              subnets.add(this.getSubnetKey(iface.ip, iface.mask));
            }
          }
          
          const poolSubnet = this.getSubnetKey(pool.network, pool.mask);
          if (!subnets.has(poolSubnet)) {
            results.push({
              rule: 'dhcpPoolSubnetMismatch',
              severity: 'critical',
              message: `Pool DHCP en ${pool.device} para ${poolSubnet} no coincide con ninguna subred del device`,
              entity: pool.device,
              device: pool.device,
              suggestion: 'Ajustar pool DHCP para usar subred existente',
            });
          }
        }
        
        return results;
      },
    };
  }

  private createDhcpHelperMissingRule(): LintRule {
    return {
      id: 'dhcpHelperMissing',
      name: 'DHCP Helper Faltante',
      description: 'Detectar cuando servidor DHCP está remoto sin helper-address',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];
        
        // Find subnets with DHCP pools
        const poolSubnets = new Map<string, string>(); // subnet -> pool device
        for (const pool of observed.dhcpPools) {
          const subnetKey = this.getSubnetKey(pool.network, pool.mask);
          poolSubnets.set(subnetKey, pool.device);
        }
        
        // Check if devices in those subnets have helper-address
        for (const [deviceName, device] of Object.entries(observed.devices)) {
          for (const iface of device.interfaces) {
            if (iface.ip && iface.mask) {
              const subnetKey = this.getSubnetKey(iface.ip, iface.mask);
              const dhcpDevice = poolSubnets.get(subnetKey);
              
              // If DHCP server is on different device, need helper-address
              if (dhcpDevice && dhcpDevice !== deviceName) {
                // Check if running-config has helper-address for this interface
                if (device.runningConfig && !device.runningConfig.includes(`ip helper-address`)) {
                  results.push({
                    rule: 'dhcpHelperMissing',
                    severity: 'critical',
                    message: `Device ${deviceName} en subred ${subnetKey} no tiene ip helper-address para DHCP en ${dhcpDevice}`,
                    entity: `${deviceName}/${iface.name}`,
                    device: deviceName,
                    suggestion: `Agregar: ip helper-address <dhcp-server-ip>`,
                  });
                }
              }
            }
          }
        }
        
        return results;
      },
    };
  }

  private createAclNotAppliedRule(): LintRule {
    return {
      id: 'aclNotApplied',
      name: 'ACL no Aplicada',
      description: 'Detectar ACLs creadas pero no aplicadas a ninguna interfaz',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];
        
        for (const acl of observed.acls) {
          if (!acl.appliedTo || acl.appliedTo.length === 0) {
            results.push({
              rule: 'aclNotApplied',
              severity: 'warning',
              message: `ACL ${acl.name} en ${acl.device} no está aplicada a ninguna interfaz`,
              entity: acl.name,
              device: acl.device,
              suggestion: 'Aplicar ACL a interfaz: ip access-group <acl-name> in/out',
            });
          }
        }
        
        return results;
      },
    };
  }

  private createStaticRouteNoReachRule(): LintRule {
    return {
      id: 'staticRouteNoReach',
      name: 'Ruta Estática con Next-Hop Inalcanzable',
      description: 'Detectar rutas estáticas con next-hop no alcanzable',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];
        
        // Get all reachable IPs (interfaces, SVIs, subinterfaces)
        const reachableIps = new Set<string>();
        for (const [_, device] of Object.entries(observed.devices)) {
          for (const iface of device.interfaces) {
            if (iface.ip) reachableIps.add(iface.ip);
          }
        }
        
        // Check static routes
        for (const route of observed.routes) {
          if (route.type === 'static' && route.nextHop) {
            // Check if next-hop is reachable
            const nextHopSubnet = this.getSubnetKeyFromIp(route.nextHop, '255.255.255.255');
            let reachable = false;
            
            for (const ip of Array.from(reachableIps)) {
              const ipSubnet = this.getSubnetKeyFromIp(ip, '255.255.255.255');
              if (ipSubnet === nextHopSubnet || reachableIps.has(route.nextHop)) {
                reachable = true;
                break;
              }
            }
            
            if (!reachable) {
              results.push({
                rule: 'staticRouteNoReach',
                severity: 'critical',
                message: `Ruta estática en ${route.device} tiene next-hop ${route.nextHop} no alcanzable`,
                entity: route.device,
                device: route.device,
                suggestion: 'Verificar que el next-hop sea alcanzable directamente',
              });
            }
          }
        }
        
        return results;
      },
    };
  }

  private createOrphanLinkRule(): LintRule {
    return {
      id: 'orphanLink',
      name: 'Enlace Huérfano',
      description: 'Detectar cables sin ambos extremos conectados',
      severity: 'info',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];
        
        for (const link of observed.links) {
          if (link.status === 'disconnected') {
            results.push({
              rule: 'orphanLink',
              severity: 'info',
              message: `Enlace entre ${link.deviceA}/${link.interfaceA} y ${link.deviceB}/${link.interfaceB} está desconectado`,
              entity: `${link.deviceA}-${link.deviceB}`,
              suggestion: 'Verificar conexiones físicas y configuración de puertos',
            });
          }
        }
        
        return results;
      },
    };
  }

  private createPortConflictRule(): LintRule {
    return {
      id: 'portConflict',
      name: 'Conflicto de Puerto',
      description: 'Detectar mismo puerto usado inconsistentemente',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];
        
        // Track port usage per device
        const portUsage = new Map<string, Map<string, string>>();
        
        for (const [deviceName, device] of Object.entries(observed.devices)) {
          const devicePorts = new Map<string, string>();
          
          for (const iface of device.interfaces) {
            const existing = devicePorts.get(iface.name);
            if (existing) {
              results.push({
                rule: 'portConflict',
                severity: 'warning',
                message: `Puerto ${iface.name} en ${deviceName} tiene configuración conflictiva`,
                entity: `${deviceName}/${iface.name}`,
                device: deviceName,
              });
            }
            devicePorts.set(iface.name, 'used');
          }
          
          portUsage.set(deviceName, devicePorts);
        }
        
        return results;
      },
    };
  }

  // ==================== Helper Methods ====================

  private getSubnetKey(ip: string, mask: string): string {
    const ipParts = ip.split('.').map(Number);
    const maskParts = mask.split('.').map(Number);
    const network = ipParts.map((p, i) => p & maskParts[i]).join('.');
    return `${network}/${mask}`;
  }

  private getSubnetKeyFromIp(ip: string, mask: string): string {
    return this.getSubnetKey(ip, mask);
  }
}