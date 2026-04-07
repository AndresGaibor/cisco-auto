import type { LabCheckSpec } from '../../contracts/lab-spec.js';
import type { TopologySnapshot } from '../../contracts/index.js';

export interface CheckResult {
  checkName: string;
  passed: boolean;
  confidence: number;
  message: string;
  details?: Record<string, unknown>;
}

export class LabCheckRunner {
  async runCheck(check: LabCheckSpec, snapshot: TopologySnapshot | null): Promise<CheckResult> {
    if (!check.reliable) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 0.0,
        message: `Check marcado como no confiable: ${check.description}`,
      };
    }

    switch (check.type) {
      case 'topology':
        return this.checkTopology(check, snapshot);
      case 'vlan':
        return this.checkVlan(check, snapshot);
      case 'trunk':
        return this.checkTrunk(check, snapshot);
      case 'svi':
        return this.checkSvi(check, snapshot);
      case 'routing':
        return this.checkRouting(check, snapshot);
      case 'host':
        return this.checkHost(check, snapshot);
      case 'service':
        return this.checkService(check, snapshot);
      case 'connectivity':
        return this.checkConnectivity(check, snapshot);
      default:
        return {
          checkName: check.name,
          passed: false,
          confidence: 0.0,
          message: `Tipo de check no soportado: ${check.type}`,
        };
    }
  }

  private checkTopology(check: LabCheckSpec, snapshot: TopologySnapshot | null): CheckResult {
    if (!snapshot) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 1.0,
        message: 'No hay snapshot de topología disponible',
      };
    }

    const expectedDeviceCount = check.params?.deviceCount as number | undefined;
    const expectedLinkCount = check.params?.linkCount as number | undefined;
    const actualDeviceCount = Object.keys(snapshot.devices).length;
    const actualLinkCount = Object.keys(snapshot.links).length;

    const deviceMatch = !expectedDeviceCount || actualDeviceCount === expectedDeviceCount;
    const linkMatch = !expectedLinkCount || actualLinkCount === expectedLinkCount;

    return {
      checkName: check.name,
      passed: deviceMatch && linkMatch,
      confidence: 1.0,
      message: deviceMatch && linkMatch
        ? 'Topología correcta'
        : `Topología incorrecta: dispositivos esperados=${expectedDeviceCount}, actuales=${actualDeviceCount}; enlaces esperados=${expectedLinkCount}, actuales=${actualLinkCount}`,
      details: {
        expectedDeviceCount,
        actualDeviceCount,
        expectedLinkCount,
        actualLinkCount,
      },
    };
  }

  private checkVlan(check: LabCheckSpec, snapshot: TopologySnapshot | null): CheckResult {
    return {
      checkName: check.name,
      passed: false,
      confidence: 0.0,
      message: 'Verificación de VLAN no implementada en Fase 2',
    };
  }

  private checkTrunk(check: LabCheckSpec, snapshot: TopologySnapshot | null): CheckResult {
    return {
      checkName: check.name,
      passed: false,
      confidence: 0.0,
      message: 'Verificación de trunk no implementada en Fase 2',
    };
  }

  private checkSvi(check: LabCheckSpec, snapshot: TopologySnapshot | null): CheckResult {
    return {
      checkName: check.name,
      passed: false,
      confidence: 0.0,
      message: 'Verificación de SVI no implementada en Fase 2',
    };
  }

  private checkRouting(check: LabCheckSpec, snapshot: TopologySnapshot | null): CheckResult {
    return {
      checkName: check.name,
      passed: false,
      confidence: 0.0,
      message: 'Verificación de routing no implementada en Fase 2',
    };
  }

  private checkHost(check: LabCheckSpec, snapshot: TopologySnapshot | null): CheckResult {
    return {
      checkName: check.name,
      passed: false,
      confidence: 0.0,
      message: 'Verificación de host no implementada en Fase 2',
    };
  }

  private checkService(check: LabCheckSpec, snapshot: TopologySnapshot | null): CheckResult {
    return {
      checkName: check.name,
      passed: false,
      confidence: 0.0,
      message: 'Verificación de servicio no implementada en Fase 2',
    };
  }

  private checkConnectivity(check: LabCheckSpec, snapshot: TopologySnapshot | null): CheckResult {
    return {
      checkName: check.name,
      passed: false,
      confidence: 0.0,
      message: 'Verificación de conectividad no implementada en Fase 2',
    };
  }
}
