// ============================================================================
// DriftDetector - Detecta drift entre blueprint y estado observado
// ============================================================================

import type {
  TopologyBlueprint,
  ObservedState,
  DriftQueryResult,
  LintResult,
} from './topology-lint-types.js';

/**
 * DriftDetector - compara blueprint vs estado observado
 */
export class DriftDetector {
  /**
   * Comparar blueprint con estado observado
   */
  compare(blueprint: TopologyBlueprint, observed: ObservedState): {
    missing: LintResult[];
    conflicts: LintResult[];
    stale: LintResult[];
  } {
    const missing: LintResult[] = [];
    const conflicts: LintResult[] = [];
    const stale: LintResult[] = [];

    // Check missing: items in blueprint but not in observed
    missing.push(...this.checkMissingVlans(blueprint, observed));
    missing.push(...this.checkMissingDhcpPools(blueprint, observed));
    missing.push(...this.checkMissingRoutes(blueprint, observed));
    missing.push(...this.checkMissingAcls(blueprint, observed));

    // Check conflicts: items exist but differ
    conflicts.push(...this.checkConflictingInterfaces(blueprint, observed));
    conflicts.push(...this.checkConflictingVlans(blueprint, observed));

    // Check stale: items in observed but not in blueprint
    stale.push(...this.checkStaleConfigurations(blueprint, observed));

    return { missing, conflicts, stale };
  }

  /**
   * Query drift para una entidad específica
   */
  query(blueprint: TopologyBlueprint, observed: ObservedState, entity: string): DriftQueryResult {
    const missing: string[] = [];
    const conflicts: string[] = [];
    const suggestions: string[] = [];
    let severity: 'critical' | 'warning' | 'info' = 'info';

    // Parse entity (e.g., "VLAN 20", "PC7", "192.168.10.0/24")
    const entityMatch = entity.match(/^(VLAN|vlan)\s*(\d+)$/);
    const ipMatch = entity.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
    const deviceMatch = entity.match(/^([A-Za-z]\w+)$/);

    if (entityMatch) {
      // VLAN query
      const vlanId = parseInt(entityMatch[2], 10);
      const vlan = blueprint.vlans.find(v => v.id === vlanId);
      
      if (!vlan) {
        missing.push(`VLAN ${vlanId} no existe en blueprint`);
        severity = 'critical';
      } else {
        // Check if VLAN is operational
        const observedVlan = observed.vlans.find(v => v.id === vlanId);
        if (!observedVlan) {
          missing.push(`VLAN ${vlanId} no está configurada en switches`);
          suggestions.push(`Ejecutar: vlan ${vlanId}`);
        } else if (observedVlan.state !== 'active') {
          conflicts.push(`VLAN ${vlanId} no está activa (estado: ${observedVlan.state})`);
          suggestions.push(`Verificar: show vlan ${vlanId}`);
          severity = 'warning';
        }
      }
    } else if (ipMatch) {
      // Subnet query
      const subnet = `${ipMatch[1]}/${ipMatch[2]}`;
      const pools = blueprint.dhcpPools.filter(p => p.network === ipMatch[1]);
      const routes = blueprint.routes.filter(r => r.network === ipMatch[1]);
      
      if (pools.length === 0 && routes.length === 0) {
        missing.push(`No hay configuración de DHCP ni rutas para subred ${subnet}`);
        suggestions.push('Crear pool DHCP o ruta según necesidad');
      }
    } else if (deviceMatch) {
      // Device query
      const deviceName = deviceMatch[1];
      const bpDevice = blueprint.devices[deviceName];
      
      if (!bpDevice) {
        missing.push(`Device ${deviceName} no está en blueprint`);
        severity = 'critical';
      } else {
        const obsDevice = observed.devices[deviceName];
        
        if (!obsDevice) {
          missing.push(`Device ${deviceName} no está visible en PT`);
          suggestions.push('Verificar que el device existe y está energizado');
          severity = 'critical';
        } else {
          // Check interfaces
          const bpIfaceNames = new Set(bpDevice.interfaces.map(i => i.name));
          const obsIfaceNames = new Set(obsDevice.interfaces.map(i => i.name));
          
          for (const name of Array.from(bpIfaceNames)) {
            if (!obsIfaceNames.has(name)) {
              missing.push(`Interfaz ${name} no visible en ${deviceName}`);
            }
          }
          
          // Check SVIs
          if (bpDevice.svis.length > 0) {
            const hasSviConfig = obsDevice.runningConfig?.includes('interface Vlan');
            if (!hasSviConfig) {
              missing.push('SVIs configuradas pero no visibles en running-config');
              severity = 'warning';
            }
          }
        }
      }
    }

    return {
      entity,
      missing,
      conflicts,
      suggestions,
      severity,
    };
  }

  // ==================== Private Check Methods ====================

  private checkMissingVlans(blueprint: TopologyBlueprint, observed: ObservedState): LintResult[] {
    const results: LintResult[] = [];
    const observedVlanIds = new Set(observed.vlans.map(v => v.id));

    for (const vlan of blueprint.vlans) {
      if (!observedVlanIds.has(vlan.id)) {
        results.push({
          rule: 'missingVlan',
          severity: 'critical',
          message: `VLAN ${vlan.id} (${vlan.name}) está en blueprint pero no configurada`,
          entity: `VLAN ${vlan.id}`,
          suggestion: `Ejecutar: vlan ${vlan.id} en switches`,
        });
      }
    }

    return results;
  }

  private checkMissingDhcpPools(blueprint: TopologyBlueprint, observed: ObservedState): LintResult[] {
    const results: LintResult[] = [];
    const observedPools = new Set(observed.dhcpPools.map(p => `${p.device}:${p.network}`));

    for (const pool of blueprint.dhcpPools) {
      const key = `${pool.device}:${pool.network}`;
      if (!observedPools.has(key)) {
        results.push({
          rule: 'missingDhcpPool',
          severity: 'critical',
          message: `Pool DHCP para ${pool.network} en ${pool.device} no está configurado`,
          entity: pool.network,
          device: pool.device,
          suggestion: `Crear pool DHCP para ${pool.network}`,
        });
      }
    }

    return results;
  }

  private checkMissingRoutes(blueprint: TopologyBlueprint, observed: ObservedState): LintResult[] {
    const results: LintResult[] = [];

    for (const route of blueprint.routes) {
      const obsDevice = observed.devices[route.device];
      if (!obsDevice?.runningConfig) {
        results.push({
          rule: 'missingRoute',
          severity: 'warning',
          message: `Ruta en ${route.device} no visible en configuración`,
          entity: route.device,
          device: route.device,
        });
      }
    }

    return results;
  }

  private checkMissingAcls(blueprint: TopologyBlueprint, observed: ObservedState): LintResult[] {
    const results: LintResult[] = [];
    const observedAcls = new Set(observed.acls.map(a => `${a.device}:${a.name}`));

    for (const acl of blueprint.acls) {
      const key = `${acl.device}:${acl.name}`;
      if (!observedAcls.has(key)) {
        results.push({
          rule: 'missingAcl',
          severity: 'warning',
          message: `ACL ${acl.name} en ${acl.device} no visible en configuración`,
          entity: acl.name,
          device: acl.device,
        });
      }
    }

    return results;
  }

  private checkConflictingInterfaces(blueprint: TopologyBlueprint, observed: ObservedState): LintResult[] {
    const results: LintResult[] = [];

    for (const [deviceName, bpDevice] of Object.entries(blueprint.devices)) {
      const obsDevice = observed.devices[deviceName];
      if (!obsDevice) continue;

      for (const bpIface of bpDevice.interfaces) {
        const obsIface = obsDevice.interfaces.find(i => i.name === bpIface.name);
        if (!obsIface) continue;

        // IP conflict
        if (bpIface.ip && obsIface.ip && bpIface.ip !== obsIface.ip) {
          results.push({
            rule: 'ipConflict',
            severity: 'critical',
            message: `IP conflicto en ${deviceName}/${bpIface.name}: blueprint=${bpIface.ip}, observed=${obsIface.ip}`,
            entity: `${deviceName}/${bpIface.name}`,
            device: deviceName,
            suggestion: 'Sincronizar configuración entre blueprint y device',
          });
        }

        // VLAN conflict on access port
        if (bpIface.mode === 'access' && bpIface.vlan && obsIface.vlan && bpIface.vlan !== obsIface.vlan) {
          results.push({
            rule: 'vlanConflict',
            severity: 'critical',
            message: `VLAN conflicto en ${deviceName}/${bpIface.name}: blueprint=${bpIface.vlan}, observed=${obsIface.vlan}`,
            entity: `${deviceName}/${bpIface.name}`,
            device: deviceName,
          });
        }
      }
    }

    return results;
  }

  private checkConflictingVlans(blueprint: TopologyBlueprint, observed: ObservedState): LintResult[] {
    const results: LintResult[] = [];

    for (const vlan of blueprint.vlans) {
      const obsVlan = observed.vlans.find(v => v.id === vlan.id);
      if (obsVlan && obsVlan.name !== vlan.name) {
        results.push({
          rule: 'vlanNameConflict',
          severity: 'warning',
          message: `Nombre de VLAN ${vlan.id}不一致: blueprint=${vlan.name}, observed=${obsVlan.name}`,
          entity: `VLAN ${vlan.id}`,
        });
      }
    }

    return results;
  }

  private checkStaleConfigurations(blueprint: TopologyBlueprint, observed: ObservedState): LintResult[] {
    const results: LintResult[] = [];

    // Check for interfaces in observed but not in blueprint
    for (const [deviceName, obsDevice] of Object.entries(observed.devices)) {
      const bpDevice = blueprint.devices[deviceName];
      const bpIfaceNames = new Set(bpDevice?.interfaces.map(i => i.name) || []);

      for (const iface of obsDevice.interfaces) {
        if (!bpIfaceNames.has(iface.name) && iface.ip) {
          results.push({
            rule: 'staleConfig',
            severity: 'info',
            message: `Interfaz ${iface.name} en ${deviceName} tiene IP ${iface.ip} pero no está en blueprint`,
            entity: `${deviceName}/${iface.name}`,
            device: deviceName,
          });
        }
      }
    }

    return results;
  }
}