import type { LabPlan, LabOperation, LabOperationStatus } from './lab-plan-types.js';
import type { LabReconciler, ReconcileResult } from './lab-reconciler.js';
import type { LabSpec } from '../../contracts/lab-spec.js';

export interface ExecutionProgress {
  planId: string;
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  skippedOperations: number;
  currentOperation?: LabOperation;
  lastResult?: ReconcileResult;
  completionPercentage: number;
  elapsedMs: number;
}

export interface ExecutionSummary {
  planId: string;
  totalOperations: number;
  completedOperations: number;
  failedOperations: number;
  skippedOperations: number;
  elapsedMs: number;
  success: boolean;
  errors: Array<{ operationId: string; error: string }>;
}

export class LabExecutor {
  constructor(
    private readonly reconciler: LabReconciler,
    private readonly labSpec: LabSpec
  ) {}

  async *execute(plan: LabPlan): AsyncGenerator<ExecutionProgress> {
    const startTime = Date.now();
    let completedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const operation of plan.operations) {
      const currentElapsed = Date.now() - startTime;

      yield {
        planId: plan.planId,
        totalOperations: plan.operations.length,
        completedOperations: completedCount,
        failedOperations: failedCount,
        skippedOperations: skippedCount,
        currentOperation: operation,
        completionPercentage: Math.round((completedCount / plan.operations.length) * 100),
        elapsedMs: currentElapsed,
      };

      operation.status = 'in-progress';
      operation.executedAt = Date.now();

      try {
        const result = await this.executeOperation(operation);

        if (result.action === 'failed') {
          operation.status = 'failed';
          operation.error = result.error;
          failedCount += 1;
        } else if (result.action === 'skipped') {
          operation.status = 'skipped';
          skippedCount += 1;
        } else {
          operation.status = 'completed';
          completedCount += 1;
        }

        operation.completedAt = Date.now();

        yield {
          planId: plan.planId,
          totalOperations: plan.operations.length,
          completedOperations: completedCount,
          failedOperations: failedCount,
          skippedOperations: skippedCount,
          lastResult: result,
          completionPercentage: Math.round(
            ((completedCount + skippedCount) / plan.operations.length) * 100
          ),
          elapsedMs: Date.now() - startTime,
        };
      } catch (error) {
        operation.status = 'failed';
        operation.error = error instanceof Error ? error.message : String(error);
        operation.completedAt = Date.now();
        failedCount += 1;

        yield {
          planId: plan.planId,
          totalOperations: plan.operations.length,
          completedOperations: completedCount,
          failedOperations: failedCount,
          skippedOperations: skippedCount,
          completionPercentage: Math.round(
            ((completedCount + skippedCount) / plan.operations.length) * 100
          ),
          elapsedMs: Date.now() - startTime,
        };
      }
    }
  }

  private async executeOperation(operation: LabOperation): Promise<ReconcileResult> {
    const observed = await this.reconciler.getObservedTopology();

    switch (operation.type) {
      case 'create-device': {
        const deviceSpec = this.labSpec.devices.find((d) => d.name === operation.resourceId);
        if (!deviceSpec) {
          return {
            action: 'failed',
            resourceType: 'device',
            resourceId: operation.resourceId,
            error: `Especificación de dispositivo no encontrada: ${operation.resourceId}`,
          };
        }
        return await this.reconciler.ensureDevice(deviceSpec, observed);
      }

      case 'move-device': {
        const x = operation.params.x as number;
        const y = operation.params.y as number;
        return await this.reconciler.ensureDevicePosition(operation.resourceId, x, y, observed);
      }

      case 'remove-device': {
        return await this.reconciler.removeExtraDevice(operation.resourceId);
      }

      case 'create-link': {
        const linkSpec = this.labSpec.links.find(
          (link) =>
            `${link.fromDevice}:${link.fromPort}<->${link.toDevice}:${link.toPort}` ===
            operation.resourceId
        );
        if (!linkSpec) {
          return {
            action: 'failed',
            resourceType: 'link',
            resourceId: operation.resourceId,
            error: `Especificación de enlace no encontrada: ${operation.resourceId}`,
          };
        }
        return await this.reconciler.ensureLink(linkSpec, observed);
      }

      case 'remove-link': {
        const [device, port] = operation.resourceId.split(':');
        if (!device || !port) {
          return {
            action: 'failed',
            resourceType: 'link',
            resourceId: operation.resourceId,
            error: `Formato de resourceId inválido: ${operation.resourceId}`,
          };
        }
        return await this.reconciler.removeExtraLink(device, port);
      }

      case 'unsupported-resource':
      case 'manual-step-required':
        return {
          action: 'skipped',
          resourceType: operation.resourceType,
          resourceId: operation.resourceId,
          details: { reason: `Operación no soportada: ${operation.type}` },
        };

      case 'no-op':
        return {
          action: 'skipped',
          resourceType: operation.resourceType,
          resourceId: operation.resourceId,
          details: { reason: 'No se requiere acción' },
        };

      default:
        return {
          action: 'failed',
          resourceType: operation.resourceType,
          resourceId: operation.resourceId,
          error: `Tipo de operación no implementado en Fase 3: ${operation.type}`,
        };
    }
  }

  async executePlan(plan: LabPlan): Promise<ExecutionSummary> {
    const startTime = Date.now();
    const errors: Array<{ operationId: string; error: string }> = [];

    for await (const _progress of this.execute(plan)) {
    }

    const completedOperations = plan.operations.filter((op) => op.status === 'completed').length;
    const failedOperations = plan.operations.filter((op) => op.status === 'failed').length;
    const skippedOperations = plan.operations.filter((op) => op.status === 'skipped').length;

    for (const operation of plan.operations) {
      if (operation.status === 'failed' && operation.error) {
        errors.push({
          operationId: operation.id,
          error: operation.error,
        });
      }
    }

    return {
      planId: plan.planId,
      totalOperations: plan.operations.length,
      completedOperations,
      failedOperations,
      skippedOperations,
      elapsedMs: Date.now() - startTime,
      success: failedOperations === 0,
      errors,
    };
  }
}
