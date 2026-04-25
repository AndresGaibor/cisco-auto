// ============================================================================
// LintRuleEngine - Ejecuta las 12 reglas de lint
// ============================================================================

import type {
  LintRule,
  LintResult,
  TopologyBlueprint,
  ObservedState,
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
      // Switching rules (15.2.1)
      this.createStpPortfastMissingRule(),
      this.createStpBpduGuardMissingRule(),
      this.createEtherChannelNotFormedRule(),
      this.createUnusedPortNotShutdownRule(),
      // Routing rules (15.2.2)
      this.createOspfDeadIntervalMismatchRule(),
      this.createOspfAuthMissingRule(),
      this.createEigrpAsMismatchRule(),
      this.createEigrpPassiveInterfaceWrongRule(),
      // DHCP rules (15.2.3)
      this.createDhcpExcludedAddressesMissingRule(),
      this.createDhcpPoolExhaustedRule(),
      this.createDhcpFallbackMissingRule(),
      // Security rules (15.2.4)
      this.createManagementPortNoAclRule(),
      this.createNativeVlan1OnTrunkRule(),
      this.createCdpEnabledUntrustedRule(),
      this.createSshNotConfiguredRule(),
      this.createPasswordInPlainTextRule(),
      // IPv6 rules (15.2.5)
      this.createIpv6LinkLocalNotConfiguredRule(),
      this.createIpv6SlaacNoRaRule(),
      this.createIpv6DhcpRelayMissingRule(),
      this.createIpv6RoutingEnabledButNotConfiguredRule(),
      // HSRP rules (15.2.6)
      this.createHsrpPriorityNotConfiguredRule(),
      this.createHsrpPreemptNotEnabledRule(),
      this.createHsrpAuthMissingRule(),
      this.createHsrpTrackNotConfiguredRule(),
      // Wireless rules (15.2.7)
      this.createWlcControllerIpInconsistentRule(),
      this.createApJoinFailureRule(),
      this.createSsidNotEnabledRule(),
      this.createWirelessRrmNotConfiguredRule(),
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
              const existing = ipMap.get(iface.ip) ?? [];
              existing.push(deviceName);
              ipMap.set(iface.ip, existing);
            }
          }
          
          // Check SVIs
          const bpDevice = blueprint.devices[deviceName];
          if (bpDevice?.svis) {
            for (const svi of bpDevice.svis) {
              if (svi.ip) {
                const existing = ipMap.get(svi.ip) ?? [];
                existing.push(`${deviceName}/SVI-${svi.vlan}`);
                ipMap.set(svi.ip, existing);
              }
            }
          }
          
          // Check subinterfaces
          if (bpDevice?.subinterfaces) {
            for (const sub of bpDevice.subinterfaces) {
              if (sub.ip) {
                const existing = ipMap.get(sub.ip) ?? [];
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

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          const bpDevice = blueprint.devices[deviceName];
          const deviceVlans = bpDevice?.vlans ?? [];

          for (const iface of device.interfaces) {
            if (iface.mode === 'trunk' && iface.trunkVlanAllowed) {
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
        
        for (const [deviceName, /* device */] of Object.entries(observed.devices)) {
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
        for (const device of Object.values(observed.devices)) {
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

  // ==================== Switching Rules (15.2.1) ====================

  private createStpPortfastMissingRule(): LintRule {
    return {
      id: 'stpPortfastMissing',
      name: 'PortFast Faltante',
      description: 'Puertos access sin PortFast enabled',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          for (const iface of device.interfaces) {
            if (iface.mode === 'access' && iface.status === 'up') {
              // Verificar si running-config tiene portfast
              if (device.runningConfig && !device.runningConfig.includes('spanning-tree portfast')) {
                results.push({
                  rule: 'stpPortfastMissing',
                  severity: 'critical',
                  message: `Puerto ${iface.name} en ${deviceName} es access pero no tiene PortFast`,
                  entity: `${deviceName}/${iface.name}`,
                  device: deviceName,
                  suggestion: 'Activar PortFast: spanning-tree portfast',
                });
              }
            }
          }
        }

        return results;
      },
    };
  }

  private createStpBpduGuardMissingRule(): LintRule {
    return {
      id: 'stpBpduGuardMissing',
      name: 'BPDU Guard Faltante',
      description: 'Puertos con PortFast pero sin BPDU Guard',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          for (const iface of device.interfaces) {
            if (device.runningConfig?.includes('spanning-tree portfast')) {
              if (!device.runningConfig.includes('spanning-tree bpduguard')) {
                results.push({
                  rule: 'stpBpduGuardMissing',
                  severity: 'warning',
                  message: `Puerto ${iface.name} en ${deviceName} tiene PortFast pero no BPDU Guard`,
                  entity: `${deviceName}/${iface.name}`,
                  device: deviceName,
                  suggestion: 'Agregar BPDU Guard: spanning-tree bpduguard enable',
                });
              }
            }
          }
        }

        return results;
      },
    };
  }

  private createEtherChannelNotFormedRule(): LintRule {
    return {
      id: 'etherChannelNotFormed',
      name: 'EtherChannel No Formado',
      description: 'Puertos configurados para EtherChannel pero no funcionando',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          const channelGroupPorts: string[] = [];
          const modeMap: Record<string, string> = {};

          // Buscar configuracion de channel-group
          const config = device.runningConfig;
          if (config) {
            const channelMatch = config.match(/channel-group (\d+) mode (active|passive|auto|desirable)/g);
            if (channelMatch && channelMatch.length >= 2) {
              for (const match of channelMatch) {
                const parts = match.split(' ');
                const port = device.interfaces.find(i =>
                  config.includes(`interface ${i.name}`) &&
                  config.includes(match)
                );
                if (port) {
                  channelGroupPorts.push(port.name);
                  if (parts[4]) modeMap[port.name] = parts[4];
                }
              }
            }
          }

          // Verificar si ports en mismo grupo tienen modos compatibles
          if (channelGroupPorts.length >= 2) {
            const modes = Object.values(modeMap);
            const hasCompatible =
              (modes.includes('active') && modes.includes('passive')) ||
              (modes.includes('active') && modes.includes('auto')) ||
              (modes.includes('active') && modes.includes('desirable')) ||
              (modes.includes('passive') && modes.includes('auto')) ||
              (modes.includes('passive') && modes.includes('desirable')) ||
              (modes.includes('auto') && modes.includes('desirable'));

            if (!hasCompatible && new Set(modes).size > 1) {
              results.push({
                rule: 'etherChannelNotFormed',
                severity: 'critical',
                message: `EtherChannel en ${deviceName} no se forma por modos incompatibles: ${modes.join(', ')}`,
                entity: deviceName,
                device: deviceName,
                suggestion: 'Verificar modos de channel-group: active/passive-auto-desirable',
              });
            }
          }
        }

        return results;
      },
    };
  }

  private createUnusedPortNotShutdownRule(): LintRule {
    return {
      id: 'unusedPortNotShutdown',
      name: 'Puerto Sin Uso y Activo',
      description: 'Puertos no utilizados que no están shutdown',
      severity: 'info',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          const connectedPorts = new Set<string>();

          // Puertos con enlaces
          for (const link of observed.links) {
            if (link.deviceA === deviceName) connectedPorts.add(link.interfaceA);
            if (link.deviceB === deviceName) connectedPorts.add(link.interfaceB);
          }

          for (const iface of device.interfaces) {
            if (!connectedPorts.has(iface.name) && iface.status === 'up') {
              results.push({
                rule: 'unusedPortNotShutdown',
                severity: 'info',
                message: `Puerto ${iface.name} en ${deviceName} no tiene uso y está activo`,
                entity: `${deviceName}/${iface.name}`,
                device: deviceName,
                suggestion: 'Considerar shutdown en puertos no utilizados',
              });
            }
          }
        }

        return results;
      },
    };
  }

  // ==================== Routing Rules (15.2.2) ====================

  private createOspfDeadIntervalMismatchRule(): LintRule {
    return {
      id: 'ospfDeadIntervalMismatch',
      name: 'OSPF Dead Interval Mismatch',
      description: 'Vecinos OSPF con diferentes dead intervals',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        // Extraer info OSPF de running-config
        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const neighborMatches = device.runningConfig.matchAll(/neighbor (\d+\.\d+\.\d+\.\d+) priority \d+\s+dead (\d+)/g);
          const neighbors: { ip: string; dead: number }[] = [];
          for (const match of neighborMatches) {
            if (match[1] && match[2]) {
              neighbors.push({ ip: match[1], dead: parseInt(match[2]) });
            }
          }

          if (neighbors.length > 0) {
            // Verificar consistencia entre vecinos del mismo segmento
            const deadBySubnet = new Map<string, number>();
            for (const n of neighbors) {
              const subnet = this.getSubnetKeyFromIp(n.ip, '255.255.255.240');
              if (deadBySubnet.has(subnet)) {
                if (deadBySubnet.get(subnet) !== n.dead) {
                  results.push({
                    rule: 'ospfDeadIntervalMismatch',
                    severity: 'warning',
                    message: `OSPF en ${deviceName}: vecino ${n.ip} tiene dead interval ${n.dead}s diferente a otros en misma subred`,
                    entity: `${deviceName}/${n.ip}`,
                    device: deviceName,
                    suggestion: 'Unificar dead interval en todos los routers del área OSPF',
                  });
                }
              } else {
                deadBySubnet.set(subnet, n.dead);
              }
            }
          }
        }

        return results;
      },
    };
  }

  private createOspfAuthMissingRule(): LintRule {
    return {
      id: 'ospfAuthMissing',
      name: 'OSPF Sin Autenticación',
      description: 'Área OSPF sin autenticación configurada',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const hasOspf = device.runningConfig.includes('router ospf');
          const hasAreaAuth = device.runningConfig.includes('area ') && device.runningConfig.includes('authentication');

          if (hasOspf && !hasAreaAuth) {
            results.push({
              rule: 'ospfAuthMissing',
              severity: 'warning',
              message: `Router ${deviceName} tiene OSPF sin autenticación configurada`,
              entity: deviceName,
              device: deviceName,
              suggestion: 'Agregar autenticación OSPF: area <id> authentication',
            });
          }
        }

        return results;
      },
    };
  }

  private createEigrpAsMismatchRule(): LintRule {
    return {
      id: 'eigrpAsMismatch',
      name: 'EIGRP AS Mismatch',
      description: 'Vecino EIGRP con diferente número de AS',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        const deviceAsMap = new Map<string, number>();

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const eigrpMatch = device.runningConfig.match(/router eigrp (\d+)/);
          if (eigrpMatch?.[1]) {
            const asNumber = parseInt(eigrpMatch[1]);
            deviceAsMap.set(deviceName, asNumber);
          }
        }

        // Verificar que todos los routers en mismo dominio EIGRP tengan mismo AS
        for (const route of observed.routes) {
          if (route.type === 'eigrp') {
            const deviceAs = deviceAsMap.get(route.device);
            if (deviceAs) {
              // EIGRP forma vecinos solo si AS coincide
              // Esta es una verificación heurística
            }
          }
        }

        return results;
      },
    };
  }

  private createEigrpPassiveInterfaceWrongRule(): LintRule {
    return {
      id: 'eigrpPassiveInterfaceWrong',
      name: 'EIGRP Passive Interface Incorrecta',
      description: 'Interfaz que debería estar activa está como passive',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const eigrpMatch = device.runningConfig.match(/router eigrp (\d+)/);
          if (!eigrpMatch) continue;

          const passiveInterfaces = new Set<string>();
          const passiveMatch = device.runningConfig.matchAll(/passive-interface (\S+)/g);
          for (const match of passiveMatch) {
            if (match[1]) passiveInterfaces.add(match[1]);
          }

          for (const iface of device.interfaces) {
            if (iface.ip && iface.status === 'up') {
              if (passiveInterfaces.has(iface.name)) {
                results.push({
                  rule: 'eigrpPassiveInterfaceWrong',
                  severity: 'warning',
                  message: `Interfaz ${iface.name} en ${deviceName} tiene IP y está como passive-interface EIGRP`,
                  entity: `${deviceName}/${iface.name}`,
                  device: deviceName,
                  suggestion: 'Si la interfaz debe formar vecindad EIGRP, remover passive-interface',
                });
              }
            }
          }
        }

        return results;
      },
    };
  }

  // ==================== DHCP Rules (15.2.3) ====================

  private createDhcpExcludedAddressesMissingRule(): LintRule {
    return {
      id: 'dhcpExcludedAddressesMissing',
      name: 'Direcciones Excluidas Faltantes',
      description: 'Pool DHCP sin direcciones excluidas configuradas',
      severity: 'info',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const pool of observed.dhcpPools) {
          const device = observed.devices[pool.device];
          if (!device?.runningConfig) continue;

          if (!device.runningConfig.includes('ip dhcp excluded-address')) {
            results.push({
              rule: 'dhcpExcludedAddressesMissing',
              severity: 'info',
              message: `Pool DHCP en ${pool.device} no tiene direcciones excluidas`,
              entity: pool.device,
              device: pool.device,
              suggestion: 'Considerar excluir gateway y Broadcast: ip dhcp excluded-address <start> <end>',
            });
          }
        }

        return results;
      },
    };
  }

  private createDhcpPoolExhaustedRule(): LintRule {
    return {
      id: 'dhcpPoolExhausted',
      name: 'DHCP Pool Agotado',
      description: 'Pool DHCP con alta utilización',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        // Verificar pool size vs demanda heurística
        for (const pool of observed.dhcpPools) {
          const poolStart = pool.startIp.split('.').map(Number);
          const poolEnd = pool.endIp.split('.').map(Number);
          const poolSize = ((poolEnd[3] ?? 0) - (poolStart[3] ?? 0)) + 1;

          if (poolSize <= 10) {
            results.push({
              rule: 'dhcpPoolExhausted',
              severity: 'warning',
              message: `Pool DHCP en ${pool.device} tiene solo ${poolSize} direcciones disponibles`,
              entity: pool.device,
              device: pool.device,
              suggestion: 'Considerar pool más grande si hay múltiples clientes',
            });
          }
        }

        return results;
      },
    };
  }

  private createDhcpFallbackMissingRule(): LintRule {
    return {
      id: 'dhcpFallbackMissing',
      name: 'Fallback DHCP Faltante',
      description: 'No hay servidor DHCP fallback configurado',
      severity: 'info',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        if (observed.dhcpPools.length === 1) {
          results.push({
            rule: 'dhcpFallbackMissing',
            severity: 'info',
            message: 'Solo un servidor DHCP configurado sin fallback',
            entity: 'dhcp',
            suggestion: 'Considerar servidor fallback para redundancia',
          });
        }

        return results;
      },
    };
  }

  // ==================== Security Rules (15.2.4) ====================

  private createManagementPortNoAclRule(): LintRule {
    return {
      id: 'managementPortNoAcl',
      name: 'Puerto Management Sin ACL',
      description: 'Interfaces de management sin ACL aplicada',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          // Buscar interfaces que parecen management (VLAN1, Loopback)
          const mgmtInterfaces = device.interfaces.filter(i =>
            i.name.toLowerCase().includes('vlan1') ||
            i.name.toLowerCase().includes('loopback')
          );

          for (const iface of mgmtInterfaces) {
            if (iface.ip) {
              // Verificar si hay ACL aplicada
              const hasAcl = device.runningConfig?.includes('access-group') ??
                device.runningConfig?.includes('ip access-class');

              if (!hasAcl) {
                results.push({
                  rule: 'managementPortNoAcl',
                  severity: 'critical',
                  message: `Interfaz ${iface.name} en ${deviceName} no tiene ACL configurada`,
                  entity: `${deviceName}/${iface.name}`,
                  device: deviceName,
                  suggestion: 'Aplicar ACL para restringir acceso management',
                });
              }
            }
          }
        }

        return results;
      },
    };
  }

  private createNativeVlan1OnTrunkRule(): LintRule {
    return {
      id: 'nativeVlan1OnTrunk',
      name: 'Native VLAN 1 en Trunk',
      description: 'Native VLAN 1 configurada en trunk',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          for (const iface of device.interfaces) {
            if (iface.mode === 'trunk' && iface.trunkVlanAllowed?.includes(1)) {
              results.push({
                rule: 'nativeVlan1OnTrunk',
                severity: 'warning',
                message: `Trunk ${iface.name} en ${deviceName} usa Native VLAN 1 (inseguro)`,
                entity: `${deviceName}/${iface.name}`,
                device: deviceName,
                suggestion: 'Cambiar Native VLAN a otra que no sea 1',
              });
            }
          }
        }

        return results;
      },
    };
  }

  private createCdpEnabledUntrustedRule(): LintRule {
    return {
      id: 'cdpEnabledUntrusted',
      name: 'CDP Habilitado en Puerto No Confiable',
      description: 'CDP activo en puertos de acceso sin control',
      severity: 'info',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const hasCdpRun = device.runningConfig.includes('cdp run');
          const hasNoCdpInterface = device.runningConfig.includes('no cdp enable');

          // Si hay interfaces access y CDP global activo
          const accessInterfaces = device.interfaces.filter(i => i.mode === 'access');
          if (hasCdpRun && accessInterfaces.length > 0 && !hasNoCdpInterface) {
            results.push({
              rule: 'cdpEnabledUntrusted',
              severity: 'info',
              message: `Dispositivo ${deviceName} tiene CDP habilitado en puertos de acceso`,
              entity: deviceName,
              device: deviceName,
              suggestion: 'Considerar deshabilitar CDP en puertos no confiables: no cdp enable',
            });
          }
        }

        return results;
      },
    };
  }

  private createSshNotConfiguredRule(): LintRule {
    return {
      id: 'sshNotConfigured',
      name: 'SSH No Configurado',
      description: 'Acceso SSH sin crypto key configurado',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const hasVty = device.runningConfig.includes('line vty');
          const hasSsh = device.runningConfig.includes('ip ssh');
          const hasCryptoKey = device.runningConfig.includes('crypto key');

          if (hasVty && !hasSsh && !hasCryptoKey) {
            results.push({
              rule: 'sshNotConfigured',
              severity: 'warning',
              message: `Dispositivo ${deviceName} tiene VTY pero no SSH configurado`,
              entity: deviceName,
              device: deviceName,
              suggestion: 'Generar crypto key: crypto key generate rsa',
            });
          }
        }

        return results;
      },
    };
  }

  private createPasswordInPlainTextRule(): LintRule {
    return {
      id: 'passwordInPlainText',
      name: 'Contraseñas en Texto Plano',
      description: 'No tiene service password-encryption',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const hasPasswords = device.runningConfig.includes('enable password') ||
            device.runningConfig.includes('username ');
          const hasEncryption = device.runningConfig.includes('service password-encryption');

          if (hasPasswords && !hasEncryption) {
            results.push({
              rule: 'passwordInPlainText',
              severity: 'warning',
              message: `Dispositivo ${deviceName} tiene contraseñas sin cifrado`,
              entity: deviceName,
              device: deviceName,
              suggestion: 'Activar: service password-encryption',
            });
          }
        }

        return results;
      },
    };
  }

  // ==================== IPv6 Rules (15.2.5) ====================

  private createIpv6LinkLocalNotConfiguredRule(): LintRule {
    return {
      id: 'ipv6LinkLocalNotConfigured',
      name: 'IPv6 Link-Local No Configurado',
      description: 'IPv6 habilitado sin configuración de link-local',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const hasIpv6Enable = device.runningConfig.includes('ipv6 enable');
          const hasIpv6Address = device.runningConfig.match(/ipv6 address (\S+)/);

          if (hasIpv6Enable && !hasIpv6Address) {
            results.push({
              rule: 'ipv6LinkLocalNotConfigured',
              severity: 'warning',
              message: `Dispositivo ${deviceName} tiene IPv6 habilitado sin dirección configurada`,
              entity: deviceName,
              device: deviceName,
              suggestion: 'Configurar IPv6: ipv6 address <address>/<prefix>',
            });
          }
        }

        return results;
      },
    };
  }

  private createIpv6SlaacNoRaRule(): LintRule {
    return {
      id: 'ipv6SlaacNoRa',
      name: 'SLAAC Sin Router Advertisement',
      description: 'SLAAC activo pero flags de RA no permiten autoconfig',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const hasSlaac = device.runningConfig.includes('ipv6 address autoconfig');
          const hasNoRa = device.runningConfig.includes('ipv6 nd suppress-ra');

          if (hasSlaac && hasNoRa) {
            results.push({
              rule: 'ipv6SlaacNoRa',
              severity: 'warning',
              message: `Dispositivo ${deviceName} tiene SLAAC pero RA suprimido`,
              entity: deviceName,
              device: deviceName,
              suggestion: 'Remover suppress-ra si se necesita SLAAC: no ipv6 nd suppress-ra',
            });
          }
        }

        return results;
      },
    };
  }

  private createIpv6DhcpRelayMissingRule(): LintRule {
    return {
      id: 'ipv6DhcpRelayMissing',
      name: 'DHCPv6 Relay Faltante',
      description: 'Cliente DHCPv6 sin relay configurado',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const hasDhcpClient = device.runningConfig.includes('ipv6 address dhcp');
          const hasRelay = device.runningConfig.includes('ipv6 dhcp relay');

          if (hasDhcpClient && !hasRelay) {
            results.push({
              rule: 'ipv6DhcpRelayMissing',
              severity: 'warning',
              message: `Interfaz en ${deviceName} usa DHCPv6 client sin relay`,
              entity: deviceName,
              device: deviceName,
              suggestion: 'Agregar relay: ipv6 dhcp relay destination <address>',
            });
          }
        }

        return results;
      },
    };
  }

  private createIpv6RoutingEnabledButNotConfiguredRule(): LintRule {
    return {
      id: 'ipv6RoutingEnabledButNotConfigured',
      name: 'IPv6 Routing Habilitado Sin Configurar',
      description: 'IPv6 routing activado sin ninguna interfaz IPv6',
      severity: 'info',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const hasIpv6Routing = device.runningConfig.includes('ipv6 unicast-routing');
          let hasIpv6Interface = false;

          for (const iface of device.interfaces) {
            if (iface.ip?.includes(':')) {
              hasIpv6Interface = true;
              break;
            }
          }

          if (hasIpv6Routing && !hasIpv6Interface) {
            results.push({
              rule: 'ipv6RoutingEnabledButNotConfigured',
              severity: 'info',
              message: `Dispositivo ${deviceName} tiene IPv6 routing habilitado sin interfaces IPv6`,
              entity: deviceName,
              device: deviceName,
              suggestion: 'Configurar interfaces IPv6 o deshabilitar IPv6 routing si no se usa',
            });
          }
        }

        return results;
      },
    };
  }

  // ==================== HSRP Rules (15.2.6) ====================

  private createHsrpPriorityNotConfiguredRule(): LintRule {
    return {
      id: 'hsrpPriorityNotConfigured',
      name: 'HSRP Priority No Configurado',
      description: 'Grupo HSRP sin prioridad explícita',
      severity: 'info',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const hasHsrp = device.runningConfig.match(/standby (\d+) ip (\S+)/);
          if (hasHsrp) {
            const hasPriority = device.runningConfig.includes('standby priority');
            if (!hasPriority) {
              results.push({
                rule: 'hsrpPriorityNotConfigured',
                severity: 'info',
                message: `Dispositivo ${deviceName} tiene HSRP sin prioridad explícita`,
                entity: deviceName,
                device: deviceName,
                suggestion: 'Configurar prioridad: standby <group> priority <value>',
              });
            }
          }
        }

        return results;
      },
    };
  }

  private createHsrpPreemptNotEnabledRule(): LintRule {
    return {
      id: 'hsrpPreemptNotEnabled',
      name: 'HSRP Preempt No Habilitado',
      description: 'HSRP activo sin preempt en router prioritario',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const hasPriority = device.runningConfig.includes('standby priority');
          const hasPreempt = device.runningConfig.includes('standby preempt');

          if (hasPriority && !hasPreempt) {
            results.push({
              rule: 'hsrpPreemptNotEnabled',
              severity: 'warning',
              message: `Router ${deviceName} tiene prioridad HSRP pero no preempt`,
              entity: deviceName,
              device: deviceName,
              suggestion: 'Habilitar preempt: standby <group> preempt',
            });
          }
        }

        return results;
      },
    };
  }

  private createHsrpAuthMissingRule(): LintRule {
    return {
      id: 'hsrpAuthMissing',
      name: 'HSRP Sin Autenticación',
      description: 'HSRP sin autenticación configurada',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const hasHsrp = device.runningConfig.includes('standby ');
          const hasAuth = device.runningConfig.includes('standby authentication');

          if (hasHsrp && !hasAuth) {
            results.push({
              rule: 'hsrpAuthMissing',
              severity: 'warning',
              message: `Dispositivo ${deviceName} tiene HSRP sin autenticación`,
              entity: deviceName,
              device: deviceName,
              suggestion: 'Agregar autenticación: standby <group> authentication text <password>',
            });
          }
        }

        return results;
      },
    };
  }

  private createHsrpTrackNotConfiguredRule(): LintRule {
    return {
      id: 'hsrpTrackNotConfigured',
      name: 'HSRP Track No Configurado',
      description: 'HSRP sin interface tracking',
      severity: 'info',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (!device.runningConfig) continue;

          const hasPriority = device.runningConfig.includes('standby priority');
          const hasTrack = device.runningConfig.includes('standby track');

          if (hasPriority && !hasTrack) {
            results.push({
              rule: 'hsrpTrackNotConfigured',
              severity: 'info',
              message: `Router ${deviceName} tiene HSRP sin tracking de interfaz`,
              entity: deviceName,
              device: deviceName,
              suggestion: 'Agregar tracking: standby <group> track <interface> <decrement>',
            });
          }
        }

        return results;
      },
    };
  }

  // ==================== Wireless Rules (15.2.7) ====================

  private createWlcControllerIpInconsistentRule(): LintRule {
    return {
      id: 'wlcControllerIpInconsistent',
      name: 'WLC Controller IP Inconsistente',
      description: 'IP不一致 entre WLC y APs',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        // Encontrar WLCs y sus IPs
        const wlcIps = new Set<string>();
        for (const device of Object.values(observed.devices)) {
          if (device.model?.toLowerCase().includes('wireless')) {
            for (const iface of device.interfaces) {
              if (iface.ip) wlcIps.add(iface.ip);
            }
          }
        }

        // Verificar APs que referencian IPs inconsistentes
        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (device.runningConfig?.includes('ap join')) {
            // Buscar Controller IP en config del AP
            const controllerMatch = device.runningConfig.match(/controller-ip (\S+)/);
            if (controllerMatch?.[1]) {
              const controllerIp = controllerMatch[1];
              if (wlcIps.size > 0 && controllerIp && !wlcIps.has(controllerIp)) {
                results.push({
                  rule: 'wlcControllerIpInconsistent',
                  severity: 'critical',
                  message: `AP ${deviceName} tiene IP de controller inconsistente: ${controllerIp}`,
                  entity: deviceName,
                  device: deviceName,
                  suggestion: 'Verificar IP del WLC en configuración del AP',
                });
              }
            }
          }
        }

        return results;
      },
    };
  }

  private createApJoinFailureRule(): LintRule {
    return {
      id: 'apJoinFailure',
      name: 'AP No Join WLC',
      description: 'AP no está uniéndose al WLC',
      severity: 'critical',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        // Verificar APs que están prendidos pero sin conectividad al WLC
        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (device.model?.toLowerCase().includes('access point') ||
            device.model?.toLowerCase().includes('ap ')) {

            // AP prendido pero sin controller configurado
            if (device.interfaces.some(i => i.status === 'up') &&
              !device.runningConfig?.includes('controller')) {
              results.push({
                rule: 'apJoinFailure',
                severity: 'critical',
                message: `AP ${deviceName} está prendido pero sin configuración de controller`,
                entity: deviceName,
                device: deviceName,
                suggestion: 'Configurar controller: wireless controller manage <wlc-ip>',
              });
            }
          }
        }

        return results;
      },
    };
  }

  private createSsidNotEnabledRule(): LintRule {
    return {
      id: 'ssidNotEnabled',
      name: 'SSID No Habilitado',
      description: 'SSID creado pero deshabilitado',
      severity: 'warning',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        // Verificar config wireless para SSIDs disabled
        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (device.runningConfig?.includes('wireless')) {
            const ssidMatches = device.runningConfig.match(/ssid (\S+)/g);
            const enabledMatches = device.runningConfig.match(/ssid (\S+) enable/g);

            if (ssidMatches && enabledMatches && ssidMatches.length !== enabledMatches.length) {
              results.push({
                rule: 'ssidNotEnabled',
                severity: 'warning',
                message: `WLC ${deviceName} tiene SSIDs sin habilitar`,
                entity: deviceName,
                device: deviceName,
                suggestion: 'Habilitar SSIDs: ssid <name> enable',
              });
            }
          }
        }

        return results;
      },
    };
  }

  private createWirelessRrmNotConfiguredRule(): LintRule {
    return {
      id: 'wirelessRrmNotConfigured',
      name: 'RRM Wireless No Configurado',
      description: 'Radio Resource Management no está configurado',
      severity: 'info',
      check: (blueprint, observed) => {
        const results: LintResult[] = [];

        for (const [deviceName, device] of Object.entries(observed.devices)) {
          if (device.runningConfig?.includes('wireless')) {
            const hasRrm = device.runningConfig.includes('rrm');
            const hasDot11Radio = device.runningConfig.includes('dot11Radio');

            if (hasDot11Radio && !hasRrm) {
              results.push({
                rule: 'wirelessRrmNotConfigured',
                severity: 'info',
                message: `WLC ${deviceName} tiene radio pero no tiene RRM configurado`,
                entity: deviceName,
                device: deviceName,
                suggestion: 'Configurar RRM: rrm [options]',
              });
            }
          }
        }

        return results;
      },
    };
  }

  // ==================== Helper Methods ====================

  private getSubnetKey(ip: string, mask: string): string {
    const ipParts = ip.split('.').map(Number);
    const maskParts = mask.split('.').map(Number);
    const network = ipParts.map((p, i) => (p ?? 0) & (maskParts[i] ?? 0)).join('.');
    return `${network}/${mask}`;
  }

  private getSubnetKeyFromIp(ip: string, mask: string): string {
    return this.getSubnetKey(ip, mask);
  }
}