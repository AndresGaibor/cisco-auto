import type { LabSpec, LabDeviceSpec, LabLinkSpec } from '../../contracts/lab-spec.js';
import type { TopologySnapshot, DeviceState, LinkState } from '../../contracts/index.js';
import type { LabDiff, LabDiffItem } from './lab-plan-types.js';

/**
 * Motor de comparación entre estado deseado (LabSpec) y estado observado (TopologySnapshot).
 * 
 * Genera un diff estructurado que identifica:
 * - missing: recursos que deberían existir pero no existen
 * - extra: recursos que existen pero no deberían
 * - drift: recursos que existen pero tienen configuración incorrecta
 * - ok: recursos correctos
 * - unsupported: recursos marcados como no soportados
 * - unreliable: recursos cuya verificación no es confiable
 */
export class LabDiffEngine {
  /**
   * Genera un diff completo entre estado deseado y observado.
   */
  diff(desired: LabSpec, observed: TopologySnapshot | null): LabDiff {
    const items: LabDiffItem[] = [];
    const now = Date.now();

    // Comparar dispositivos
    items.push(...this.diffDevices(desired.devices, observed?.devices ?? {}));

    // Comparar enlaces
    items.push(...this.diffLinks(desired.links, observed?.links ?? {}));

    // VLANs, trunks, access ports, SVIs: marcados como "unreliable" por ahora
    // (Fase 4 implementará observación real vía IOS)
    items.push(...this.diffVlans(desired.vlans));
    items.push(...this.diffTrunks(desired.trunks));
    items.push(...this.diffAccessPorts(desired.accessPorts));
    items.push(...this.diffSvis(desired.svis));
    items.push(...this.diffStaticRoutes(desired.staticRoutes));
    items.push(...this.diffDhcpPools(desired.dhcpPools));
    items.push(...this.diffHosts(desired.hosts));
    items.push(...this.diffServices(desired.services));

    const summary = this.computeSummary(items);

    return {
      labId: desired.labId,
      generatedAt: now,
      items,
      summary,
    };
  }

  /**
   * Comparar dispositivos: topología física observable.
   */
  private diffDevices(
    desiredDevices: LabDeviceSpec[],
    observedDevices: Record<string, DeviceState>
  ): LabDiffItem[] {
    const items: LabDiffItem[] = [];
    const observedNames = new Set(Object.keys(observedDevices));

    for (const desired of desiredDevices) {
      const observed = observedDevices[desired.name];

      // Dispositivo marcado como no soportado
      if (desired.supported === 'false') {
        items.push({
          resourceType: 'device',
          resourceId: desired.name,
          status: 'unsupported',
          expected: desired,
          observed: null,
          confidence: 1.0,
          notes: desired.notes ?? ['Dispositivo marcado como no soportado'],
        });
        observedNames.delete(desired.name);
        continue;
      }

      // Dispositivo falta
      if (!observed) {
        items.push({
          resourceType: 'device',
          resourceId: desired.name,
          status: 'missing',
          expected: desired,
          observed: null,
          confidence: 1.0,
        });
        continue;
      }

      // Dispositivo existe: verificar drift
      const ptModel = desired.ptModel ?? desired.model;
      const modelMatch = observed.model.toLowerCase() === ptModel.toLowerCase();
      const positionMatch = Math.abs((observed.x ?? 0) - desired.x) < 10 && Math.abs((observed.y ?? 0) - desired.y) < 10;

      if (!modelMatch) {
        items.push({
          resourceType: 'device',
          resourceId: desired.name,
          status: 'drift',
          expected: desired,
          observed,
          diff: {
            model: { expected: ptModel, observed: observed.model },
          },
          confidence: 1.0,
          notes: ['Modelo incorrecto'],
        });
      } else if (!positionMatch) {
        items.push({
          resourceType: 'device',
          resourceId: desired.name,
          status: 'drift',
          expected: desired,
          observed,
          diff: {
            position: { expected: { x: desired.x, y: desired.y }, observed: { x: observed.x, y: observed.y } },
          },
          confidence: 1.0,
          notes: ['Posición incorrecta'],
        });
      } else {
        items.push({
          resourceType: 'device',
          resourceId: desired.name,
          status: 'ok',
          expected: desired,
          observed,
          confidence: 1.0,
        });
      }

      observedNames.delete(desired.name);
    }

    // Dispositivos extra (existen pero no deberían)
    for (const name of observedNames) {
      items.push({
        resourceType: 'device',
        resourceId: name,
        status: 'extra',
        expected: null,
        observed: observedDevices[name],
        confidence: 1.0,
        notes: ['Dispositivo no esperado en el spec'],
      });
    }

    return items;
  }

  /**
   * Comparar enlaces: topología física observable.
   */
  private diffLinks(
    desiredLinks: LabLinkSpec[],
    observedLinks: Record<string, LinkState>
  ): LabDiffItem[] {
    const items: LabDiffItem[] = [];
    const observedIds = new Set(Object.keys(observedLinks));

    for (const desired of desiredLinks) {
      const linkId = `${desired.fromDevice}:${desired.fromPort}<->${desired.toDevice}:${desired.toPort}`;

      // Enlace marcado como no soportado
      if (desired.supported === 'false') {
        items.push({
          resourceType: 'link',
          resourceId: linkId,
          status: 'unsupported',
          expected: desired,
          observed: null,
          confidence: 1.0,
          notes: ['Enlace marcado como no soportado'],
        });
        continue;
      }

      // Buscar enlace observado (bidireccional)
      const observed = Object.values(observedLinks).find(
        (link) =>
          (link.device1 === desired.fromDevice &&
            link.port1 === desired.fromPort &&
            link.device2 === desired.toDevice &&
            link.port2 === desired.toPort) ||
          (link.device1 === desired.toDevice &&
            link.port1 === desired.toPort &&
            link.device2 === desired.fromDevice &&
            link.port2 === desired.fromPort)
      );

      if (!observed) {
        items.push({
          resourceType: 'link',
          resourceId: linkId,
          status: 'missing',
          expected: desired,
          observed: null,
          confidence: 1.0,
        });
      } else {
        // Enlace existe, verificar tipo de cable si se especificó
        const cableMatch = !desired.cableType || observed.cableType === desired.cableType;

        if (!cableMatch) {
          items.push({
            resourceType: 'link',
            resourceId: linkId,
            status: 'drift',
            expected: desired,
            observed,
            diff: {
              cableType: { expected: desired.cableType, observed: observed.cableType },
            },
            confidence: 0.8,
            notes: ['Tipo de cable incorrecto'],
          });
        } else {
          items.push({
            resourceType: 'link',
            resourceId: linkId,
            status: 'ok',
            expected: desired,
            observed,
            confidence: 1.0,
          });
        }

        observedIds.delete(observed.id);
      }
    }

    // Enlaces extra (existen pero no deberían)
    for (const id of observedIds) {
      const link = observedLinks[id];
      items.push({
        resourceType: 'link',
        resourceId: id,
        status: 'extra',
        expected: null,
        observed: link,
        confidence: 1.0,
        notes: ['Enlace no esperado en el spec'],
      });
    }

    return items;
  }

  /**
   * Comparar VLANs: no observable de forma fiable en Fase 2.
   * Marcamos como "unreliable" para que el planner planee la configuración.
   */
  private diffVlans(desiredVlans: LabSpec['vlans']): LabDiffItem[] {
    return desiredVlans.map((vlan) => ({
      resourceType: 'vlan' as const,
      resourceId: `vlan-${vlan.id}`,
      status: 'unreliable' as const,
      expected: vlan,
      observed: null,
      confidence: 0.0,
      notes: ['Verificación de VLAN no implementada en Fase 2 - se asume missing'],
    }));
  }

  /**
   * Comparar trunks: no observable de forma fiable en Fase 2.
   */
  private diffTrunks(desiredTrunks: LabSpec['trunks']): LabDiffItem[] {
    return desiredTrunks.map((trunk) => ({
      resourceType: 'trunk' as const,
      resourceId: `${trunk.device}:${trunk.port}`,
      status: 'unreliable' as const,
      expected: trunk,
      observed: null,
      confidence: 0.0,
      notes: ['Verificación de trunk no implementada en Fase 2 - se asume missing'],
    }));
  }

  /**
   * Comparar puertos access: no observable de forma fiable en Fase 2.
   */
  private diffAccessPorts(desiredPorts: LabSpec['accessPorts']): LabDiffItem[] {
    return desiredPorts.map((port) => ({
      resourceType: 'access-port' as const,
      resourceId: `${port.device}:${port.port}`,
      status: 'unreliable' as const,
      expected: port,
      observed: null,
      confidence: 0.0,
      notes: ['Verificación de puerto access no implementada en Fase 2 - se asume missing'],
    }));
  }

  /**
   * Comparar SVIs: no observable de forma fiable en Fase 2.
   */
  private diffSvis(desiredSvis: LabSpec['svis']): LabDiffItem[] {
    return desiredSvis.map((svi) => ({
      resourceType: 'svi' as const,
      resourceId: `${svi.device}:vlan${svi.vlan}`,
      status: 'unreliable' as const,
      expected: svi,
      observed: null,
      confidence: 0.0,
      notes: ['Verificación de SVI no implementada en Fase 2 - se asume missing'],
    }));
  }

  /**
   * Comparar rutas estáticas: no observable de forma fiable en Fase 2.
   */
  private diffStaticRoutes(desiredRoutes: LabSpec['staticRoutes']): LabDiffItem[] {
    return desiredRoutes.map((route, idx) => ({
      resourceType: 'static-route' as const,
      resourceId: `${route.device}:route-${idx}`,
      status: 'unreliable' as const,
      expected: route,
      observed: null,
      confidence: 0.0,
      notes: ['Verificación de ruta estática no implementada en Fase 2 - se asume missing'],
    }));
  }

  /**
   * Comparar pools DHCP: no observable de forma fiable en Fase 2.
   */
  private diffDhcpPools(desiredPools: LabSpec['dhcpPools']): LabDiffItem[] {
    return desiredPools.map((pool) => ({
      resourceType: 'dhcp-pool' as const,
      resourceId: `${pool.device}:${pool.poolName}`,
      status: 'unreliable' as const,
      expected: pool,
      observed: null,
      confidence: 0.0,
      notes: ['Verificación de pool DHCP no implementada en Fase 2 - se asume missing'],
    }));
  }

  /**
   * Comparar hosts: no observable de forma fiable en Fase 2.
   */
  private diffHosts(desiredHosts: LabSpec['hosts']): LabDiffItem[] {
    return desiredHosts.map((host) => ({
      resourceType: 'host' as const,
      resourceId: host.device,
      status: 'unreliable' as const,
      expected: host,
      observed: null,
      confidence: 0.0,
      notes: ['Verificación de host no implementada en Fase 2 - se asume missing'],
    }));
  }

  /**
   * Comparar servicios: explícitamente marcados como no soportados por API.
   */
  private diffServices(desiredServices: LabSpec['services']): LabDiffItem[] {
    return desiredServices.map((service) => ({
      resourceType: 'service' as const,
      resourceId: `${service.device}:${service.type}`,
      status: service.supportedByApi === 'false' ? 'unsupported' : 'unreliable',
      expected: service,
      observed: null,
      confidence: service.supportedByApi === 'false' ? 1.0 : 0.0,
      notes:
        service.supportedByApi === 'false'
          ? ['Servicio no soportado por PT API - requiere configuración manual']
          : ['Verificación de servicio no implementada'],
    }));
  }

  /**
   * Computar resumen del diff.
   */
  private computeSummary(items: LabDiffItem[]): LabDiff['summary'] {
    const summary = {
      missing: 0,
      extra: 0,
      drift: 0,
      ok: 0,
      unsupported: 0,
      unreliable: 0,
    };

    for (const item of items) {
      summary[item.status] += 1;
    }

    return summary;
  }
}
