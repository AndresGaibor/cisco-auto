import type { LabSpec } from '../../contracts/lab-spec.js';
import type { LabDiff, LabDiffItem, LabPlan, LabOperation } from './lab-plan-types.js';

/**
 * Generador de planes de operaciones a partir de un diff.
 * 
 * Convierte el diff (missing, drift, extra, unsupported, unreliable) en operaciones
 * atómicas ordenadas con dependencias explícitas.
 * 
 * NO planea clearTopology() por defecto - solo en modo 'rebuild' explícito.
 */
export class LabPlanner {
  constructor(private generateId: () => string) {}

  /**
   * Genera un plan de operaciones para llevar el estado observado al deseado.
   */
  plan(spec: LabSpec, diff: LabDiff, mode: 'incremental' | 'rebuild' = 'incremental'): LabPlan {
    const operations: LabOperation[] = [];

    if (mode === 'rebuild') {
      operations.push(this.createClearTopologyOperation());
    }

    for (const item of diff.items) {
      operations.push(...this.planItem(spec, item, mode));
    }

    const sorted = this.topologicalSort(operations);
    const summary = this.computePlanSummary(sorted);

    return {
      labId: spec.labId,
      planId: this.generateId(),
      createdAt: Date.now(),
      operations: sorted,
      summary,
      metadata: {
        desiredVersion: spec.version,
        observedHash: this.hashDiff(diff),
        mode,
      },
    };
  }

  private createClearTopologyOperation(): LabOperation {
    return {
      id: this.generateId(),
      type: 'remove-device',
      resourceType: 'device',
      resourceId: '*',
      description: 'Limpiar topología completa (modo rebuild)',
      params: { all: true },
      status: 'pending',
    };
  }

  private planItem(spec: LabSpec, item: LabDiffItem, mode: 'incremental' | 'rebuild'): LabOperation[] {
    switch (item.status) {
      case 'missing':
        return this.planMissing(item, mode);
      case 'drift':
        return this.planDrift(item, mode);
      case 'extra':
        return this.planExtra(item, mode);
      case 'unsupported':
        return this.planUnsupported(item);
      case 'unreliable':
        return this.planUnreliable(item);
      case 'ok':
        return [];
      default:
        return [];
    }
  }

  private planMissing(item: LabDiffItem, mode: 'incremental' | 'rebuild'): LabOperation[] {
    const expected = item.expected as any;

    switch (item.resourceType) {
      case 'device':
        return [
          {
            id: this.generateId(),
            type: 'create-device',
            resourceType: 'device',
            resourceId: item.resourceId,
            description: `Crear dispositivo ${expected.name}`,
            device: expected.name,
            params: {
              name: expected.name,
              model: expected.ptModel ?? expected.model,
              x: expected.x,
              y: expected.y,
            },
            status: 'pending',
          },
        ];

      case 'link':
        return [
          {
            id: this.generateId(),
            type: 'create-link',
            resourceType: 'link',
            resourceId: item.resourceId,
            description: `Crear enlace ${expected.fromDevice}:${expected.fromPort} <-> ${expected.toDevice}:${expected.toPort}`,
            params: {
              fromDevice: expected.fromDevice,
              fromPort: expected.fromPort,
              toDevice: expected.toDevice,
              toPort: expected.toPort,
              cableType: expected.cableType ?? 'auto',
            },
            dependsOn: [expected.fromDevice, expected.toDevice],
            status: 'pending',
          },
        ];

      case 'vlan':
        return [
          {
            id: this.generateId(),
            type: 'configure-vlan',
            resourceType: 'vlan',
            resourceId: item.resourceId,
            description: `Configurar VLAN ${expected.id} (${expected.name})`,
            params: expected,
            status: 'pending',
          },
        ];

      case 'trunk':
        return [
          {
            id: this.generateId(),
            type: 'configure-trunk',
            resourceType: 'trunk',
            resourceId: item.resourceId,
            description: `Configurar trunk ${expected.device}:${expected.port}`,
            device: expected.device,
            params: expected,
            dependsOn: [expected.device],
            status: 'pending',
          },
        ];

      case 'access-port':
        return [
          {
            id: this.generateId(),
            type: 'configure-access-port',
            resourceType: 'access-port',
            resourceId: item.resourceId,
            description: `Configurar puerto access ${expected.device}:${expected.port} VLAN ${expected.vlan}`,
            device: expected.device,
            params: expected,
            dependsOn: [expected.device],
            status: 'pending',
          },
        ];

      case 'svi':
        return [
          {
            id: this.generateId(),
            type: 'configure-svi',
            resourceType: 'svi',
            resourceId: item.resourceId,
            description: `Configurar SVI ${expected.device} VLAN ${expected.vlan}`,
            device: expected.device,
            params: expected,
            dependsOn: [expected.device],
            status: 'pending',
          },
        ];

      case 'static-route':
        return [
          {
            id: this.generateId(),
            type: 'configure-static-route',
            resourceType: 'static-route',
            resourceId: item.resourceId,
            description: `Configurar ruta estática ${expected.network} via ${expected.nextHop}`,
            device: expected.device,
            params: expected,
            dependsOn: [expected.device],
            status: 'pending',
          },
        ];

      case 'dhcp-pool':
        return [
          {
            id: this.generateId(),
            type: 'configure-dhcp-pool',
            resourceType: 'dhcp-pool',
            resourceId: item.resourceId,
            description: `Configurar pool DHCP ${expected.poolName}`,
            device: expected.device,
            params: expected,
            dependsOn: [expected.device],
            status: 'pending',
          },
        ];

      case 'host':
        return [
          {
            id: this.generateId(),
            type: 'configure-host',
            resourceType: 'host',
            resourceId: item.resourceId,
            description: `Configurar host ${expected.device}`,
            device: expected.device,
            params: expected,
            dependsOn: [expected.device],
            status: 'pending',
          },
        ];

      case 'service':
        return [
          {
            id: this.generateId(),
            type: 'configure-service',
            resourceType: 'service',
            resourceId: item.resourceId,
            description: `Configurar servicio ${expected.type} en ${expected.device}`,
            device: expected.device,
            params: expected,
            dependsOn: [expected.device],
            status: 'pending',
          },
        ];

      default:
        return [];
    }
  }

  private planDrift(item: LabDiffItem, mode: 'incremental' | 'rebuild'): LabOperation[] {
    const expected = item.expected as any;

    switch (item.resourceType) {
      case 'device':
        if (item.diff?.model) {
          return [
            {
              id: this.generateId(),
              type: 'remove-device',
              resourceType: 'device',
              resourceId: item.resourceId,
              description: `Remover dispositivo ${item.resourceId} (modelo incorrecto)`,
              device: item.resourceId,
              params: { name: item.resourceId },
              status: 'pending',
            },
            {
              id: this.generateId(),
              type: 'create-device',
              resourceType: 'device',
              resourceId: item.resourceId,
              description: `Recrear dispositivo ${expected.name} con modelo correcto`,
              device: expected.name,
              params: {
                name: expected.name,
                model: expected.ptModel ?? expected.model,
                x: expected.x,
                y: expected.y,
              },
              dependsOn: [item.resourceId],
              status: 'pending',
            },
          ];
        }

        if (item.diff?.position) {
          return [
            {
              id: this.generateId(),
              type: 'move-device',
              resourceType: 'device',
              resourceId: item.resourceId,
              description: `Mover dispositivo ${item.resourceId} a posición correcta`,
              device: item.resourceId,
              params: {
                name: item.resourceId,
                x: expected.x,
                y: expected.y,
              },
              status: 'pending',
            },
          ];
        }

        return [];

      case 'link':
        return [
          {
            id: this.generateId(),
            type: 'repair-link',
            resourceType: 'link',
            resourceId: item.resourceId,
            description: `Reparar enlace ${item.resourceId} (tipo de cable incorrecto)`,
            params: { ...expected },
            status: 'pending',
          },
        ];

      default:
        return [];
    }
  }

  private planExtra(item: LabDiffItem, mode: 'incremental' | 'rebuild'): LabOperation[] {
    if (mode === 'rebuild') {
      return [];
    }

    switch (item.resourceType) {
      case 'device':
        return [
          {
            id: this.generateId(),
            type: 'remove-device',
            resourceType: 'device',
            resourceId: item.resourceId,
            description: `Remover dispositivo extra ${item.resourceId}`,
            device: item.resourceId,
            params: { name: item.resourceId },
            status: 'pending',
          },
        ];

      case 'link':
        const observed = item.observed as any;
        return [
          {
            id: this.generateId(),
            type: 'remove-link',
            resourceType: 'link',
            resourceId: item.resourceId,
            description: `Remover enlace extra ${item.resourceId}`,
            params: {
              device: observed.device1,
              port: observed.port1,
            },
            status: 'pending',
          },
        ];

      default:
        return [];
    }
  }

  private planUnsupported(item: LabDiffItem): LabOperation[] {
    return [
      {
        id: this.generateId(),
        type: 'unsupported-resource',
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        description: `Recurso no soportado: ${item.resourceId}`,
        params: { reason: item.notes?.join(', ') ?? 'No soportado' },
        status: 'skipped',
      },
    ];
  }

  private planUnreliable(item: LabDiffItem): LabOperation[] {
    return this.planMissing(item, 'incremental');
  }

  private topologicalSort(operations: LabOperation[]): LabOperation[] {
    const sorted: LabOperation[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const opMap = new Map(operations.map((op) => [op.id, op]));
    const deviceDepMap = new Map<string, string>();

    for (const op of operations) {
      if (op.type === 'create-device' && op.device) {
        deviceDepMap.set(op.device, op.id);
      }
    }

    const visit = (opId: string) => {
      if (visited.has(opId)) return;
      if (visiting.has(opId)) {
        return;
      }

      visiting.add(opId);
      const op = opMap.get(opId);

      if (op?.dependsOn) {
        for (const dep of op.dependsOn) {
          const depOpId = deviceDepMap.get(dep);
          if (depOpId) {
            visit(depOpId);
          }
        }
      }

      visiting.delete(opId);
      visited.add(opId);
      if (op) {
        sorted.push(op);
      }
    };

    for (const op of operations) {
      visit(op.id);
    }

    return sorted;
  }

  private computePlanSummary(operations: LabOperation[]): LabPlan['summary'] {
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const op of operations) {
      byType[op.type] = (byType[op.type] ?? 0) + 1;
      byStatus[op.status] = (byStatus[op.status] ?? 0) + 1;
    }

    return {
      total: operations.length,
      byType,
      byStatus,
    };
  }

  private hashDiff(diff: LabDiff): string {
    const summary = `${diff.summary.missing}-${diff.summary.drift}-${diff.summary.extra}`;
    return `${diff.generatedAt}-${summary}`;
  }
}
