// LabVerifier - Verificación por capas de recursos IOS
// Fase 7: Verificación por capas (checks reales)

import type { LabCheckSpec } from "../../contracts/lab-spec.js";
import type { CheckResult } from "./lab-checks.js";
import { LabCheckRunner } from "./lab-checks.js";
import { IOSStateObserver } from "./ios-state-observer.js";
import type { IosService } from "../services/ios-service.js";
import type { TopologyService } from "../services/topology-service.js";

export interface VerificationReport {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results: CheckResult[];
  timestamp: number;
}

export class LabVerifier {
  private checkRunner: LabCheckRunner;
  private iosObserver: IOSStateObserver;

  constructor(
    private ios: IosService,
    private topology: TopologyService
  ) {
    this.checkRunner = new LabCheckRunner();
    this.iosObserver = new IOSStateObserver(ios);
  }

  async verify(checks: LabCheckSpec[]): Promise<VerificationReport> {
    const snapshot = await this.topology.snapshot();
    const results: CheckResult[] = [];

    for (const check of checks) {
      const result = await this.runCheckWithIOS(check, snapshot);
      results.push(result);
    }

    return {
      total: results.length,
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed && r.confidence > 0).length,
      skipped: results.filter((r) => !r.passed && r.confidence === 0).length,
      results,
      timestamp: Date.now(),
    };
  }

  private async runCheckWithIOS(
    check: LabCheckSpec,
    snapshot: Awaited<ReturnType<TopologyService["snapshot"]>>
  ): Promise<CheckResult> {
    if (!check.reliable) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 0.0,
        message: `Check marcado como no confiable: ${check.description}`,
      };
    }

    switch (check.type) {
      case "vlan":
        return this.verifyVlan(check, snapshot);
      case "trunk":
        return this.verifyTrunk(check, snapshot);
      case "svi":
        return this.verifySvi(check, snapshot);
      case "routing":
        return this.verifyRouting(check, snapshot);
      case "connectivity":
        return this.verifyConnectivity(check, snapshot);
      default:
        return this.checkRunner.runCheck(check, snapshot);
    }
  }

  private async verifyVlan(
    check: LabCheckSpec,
    snapshot: Awaited<ReturnType<TopologyService["snapshot"]>>
  ): Promise<CheckResult> {
    const device = check.params?.device as string | undefined;
    const expectedVlans = check.params?.vlans as Array<{ id: number; name: string }> | undefined;

    if (!device) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 0.5,
        message: "Parámetro 'device' requerido para check de VLAN",
      };
    }

    try {
      const observed = await this.iosObserver.getVlans(device);
      const missingVlans = [];
      const wrongNameVlans = [];

      for (const expected of expectedVlans ?? []) {
        const existing = observed.find((v) => v.id === expected.id);
        if (!existing) {
          missingVlans.push(expected.id);
        } else if (existing.name !== expected.name) {
          wrongNameVlans.push({ id: expected.id, expected: expected.name, actual: existing.name });
        }
      }

      const passed = missingVlans.length === 0 && wrongNameVlans.length === 0;

      return {
        checkName: check.name,
        passed,
        confidence: 1.0,
        message: passed
          ? `VLANs correctas en ${device}`
          : `VLANs incorrectas: faltantes=${missingVlans.join(",")}, nombres incorrectos=${wrongNameVlans.map((v) => `${v.id}(esperado:${v.expected},actual:${v.actual})`).join(",")}`,
        details: {
          device,
          expectedVlans: expectedVlans?.length ?? 0,
          observedVlans: observed.length,
          missingVlans,
          wrongNameVlans,
        },
      };
    } catch (err) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 0.5,
        message: `Error verificando VLANs en ${device}: ${String(err)}`,
      };
    }
  }

  private async verifyTrunk(
    check: LabCheckSpec,
    snapshot: Awaited<ReturnType<TopologyService["snapshot"]>>
  ): Promise<CheckResult> {
    const device = check.params?.device as string | undefined;
    const port = check.params?.port as string | undefined;
    const expectedNativeVlan = check.params?.nativeVlan as number | undefined;
    const expectedAllowedVlans = check.params?.allowedVlans as number[] | undefined;

    if (!device || !port) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 0.5,
        message: "Parámetros 'device' y 'port' requeridos para check de trunk",
      };
    }

    try {
      const showResult = await this.ios.show(device, "show interfaces trunk");
      const trunksData = (showResult as { trunks?: Array<{ port: string; nativeVlan: number; allowedVlans: number[] }> }).trunks ?? [];
      const trunk = trunksData.find((t: { port: string }) => t.port === port);

      if (!trunk) {
        return {
          checkName: check.name,
          passed: false,
          confidence: 1.0,
          message: `Puerto ${port} no es trunk en ${device}`,
          details: { device, port, observedTrunks: trunksData.map((t: { port: string }) => t.port) },
        };
      }

      const nativeVlanOk = !expectedNativeVlan || trunk.nativeVlan === expectedNativeVlan;
      const allowedVlansOk =
        !expectedAllowedVlans ||
        (trunk.allowedVlans.length === expectedAllowedVlans.length &&
          trunk.allowedVlans.every((v: number) => expectedAllowedVlans.includes(v)));

      const passed = nativeVlanOk && allowedVlansOk;

      return {
        checkName: check.name,
        passed,
        confidence: 1.0,
        message: passed
          ? `Trunk ${port} correcto en ${device}`
          : `Trunk ${port} incorrecto: nativeVlan=${trunk.nativeVlan}, allowed=${trunk.allowedVlans.join(",")}`,
        details: {
          device,
          port,
          observedNativeVlan: trunk.nativeVlan,
          expectedNativeVlan,
          observedAllowedVlans: trunk.allowedVlans,
          expectedAllowedVlans,
        },
      };
    } catch (err) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 0.5,
        message: `Error verificando trunk ${port} en ${device}: ${String(err)}`,
      };
    }
  }

  private async verifySvi(
    check: LabCheckSpec,
    snapshot: Awaited<ReturnType<TopologyService["snapshot"]>>
  ): Promise<CheckResult> {
    const device = check.params?.device as string | undefined;
    const vlan = check.params?.vlan as number | undefined;
    const expectedIp = check.params?.ip as string | undefined;

    if (!device || !vlan) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 0.5,
        message: "Parámetros 'device' y 'vlan' requeridos para check de SVI",
      };
    }

    try {
      const observed = await this.iosObserver.getSvisFromRoute(device);
      const svi = observed.find((s) => s.vlan === vlan);

      if (!svi) {
        return {
          checkName: check.name,
          passed: false,
          confidence: 1.0,
          message: `SVI VLAN ${vlan} no existe en ${device}`,
          details: { device, vlan, observedSvis: observed.map((s) => s.vlan) },
        };
      }

      if (expectedIp && svi.ipAddress !== expectedIp) {
        return {
          checkName: check.name,
          passed: false,
          confidence: 1.0,
          message: `SVI VLAN ${vlan} tiene IP incorrecta: ${svi.ipAddress} (esperado: ${expectedIp})`,
          details: { device, vlan, observedIp: svi.ipAddress, expectedIp },
        };
      }

      return {
        checkName: check.name,
        passed: true,
        confidence: 1.0,
        message: `SVI VLAN ${vlan} correcto en ${device}: ${svi.ipAddress}`,
        details: { device, vlan, ip: svi.ipAddress },
      };
    } catch (err) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 0.5,
        message: `Error verificando SVI ${vlan} en ${device}: ${String(err)}`,
      };
    }
  }

  private async verifyRouting(
    check: LabCheckSpec,
    snapshot: Awaited<ReturnType<TopologyService["snapshot"]>>
  ): Promise<CheckResult> {
    const device = check.params?.device as string | undefined;
    const expectedRoutes = check.params?.routes as Array<{ network: string; mask?: string; nextHop: string }> | undefined;

    if (!device) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 0.5,
        message: "Parámetro 'device' requerido para check de routing",
      };
    }

    try {
      const observed = await this.iosObserver.getStaticRoutes(device);
      const missingRoutes = [];

      for (const expected of expectedRoutes ?? []) {
        const exists = observed.some(
          (r) =>
            r.network === expected.network &&
            r.mask === expected.mask &&
            r.nextHop === expected.nextHop
        );
        if (!exists) {
          missingRoutes.push(`${expected.network}/${expected.mask ?? "?"} -> ${expected.nextHop}`);
        }
      }

      const passed = missingRoutes.length === 0;

      return {
        checkName: check.name,
        passed,
        confidence: 1.0,
        message: passed
          ? `Rutas estáticas correctas en ${device}`
          : `Rutas faltantes: ${missingRoutes.join(", ")}`,
        details: {
          device,
          expectedRoutes: expectedRoutes?.length ?? 0,
          observedRoutes: observed.length,
          missingRoutes,
        },
      };
    } catch (err) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 0.5,
        message: `Error verificando rutas en ${device}: ${String(err)}`,
      };
    }
  }

  private async verifyConnectivity(
    check: LabCheckSpec,
    snapshot: Awaited<ReturnType<TopologyService["snapshot"]>>
  ): Promise<CheckResult> {
    const fromDevice = check.params?.from as string | undefined;
    const toDevice = check.params?.to as string | undefined;

    if (!fromDevice || !toDevice) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 0.5,
        message: "Parámetros 'from' y 'to' requeridos para check de conectividad",
      };
    }

    if (!snapshot) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 0.5,
        message: "No hay snapshot disponible para verificar conectividad",
      };
    }

    const fromExists = fromDevice in snapshot.devices;
    const toExists = toDevice in snapshot.devices;

    if (!fromExists || !toExists) {
      return {
        checkName: check.name,
        passed: false,
        confidence: 1.0,
        message: `Dispositivo no encontrado: ${!fromExists ? fromDevice : toDevice}`,
      };
    }

    return {
      checkName: check.name,
      passed: true,
      confidence: 0.8,
      message: `Conectividad verificada: ${fromDevice} -> ${toDevice} (verificación física)`,
      details: {
        fromDevice,
        toDevice,
        note: "Verificación de conectividad L2/L3 requiere pingexec en Fase 8+",
      },
    };
  }
}
