// IOSReconciler - Reconciliación idempotente de configuración IOS
// Fase 4: Reconciliación Progresiva de Configuración IOS

import type {
  LabVlanSpec,
  LabSviSpec,
  LabStaticRouteSpec,
  LabAccessPortSpec,
  LabTrunkSpec,
  LabResourceType,
} from "../../contracts/lab-spec.js";
import { IOSStateObserver } from "./ios-state-observer.js";
import type { IosService } from "../services/ios-service.js";

export interface IosReconcileResult {
  action: "configured" | "skipped" | "failed";
  resourceType: LabResourceType;
  resourceId: string;
  device: string;
  details?: Record<string, unknown>;
  error?: string;
}

export class IOSReconciler {
  private observer: IOSStateObserver;

  constructor(private ios: IosService) {
    this.observer = new IOSStateObserver(ios);
  }

  async ensureVlans(device: string, vlans: LabVlanSpec[]): Promise<IosReconcileResult[]> {
    const observed = await this.observer.getVlans(device);
    const results: IosReconcileResult[] = [];

    for (const vlan of vlans) {
      const existing = observed.find((v) => v.id === vlan.id);

      if (!existing) {
        const cmd = [`vlan ${vlan.id}`, `name ${vlan.name}`];
        try {
          await this.ios.configIos(device, cmd, { save: false });
          results.push({
            action: "configured",
            resourceType: "vlan",
            resourceId: `vlan-${vlan.id}`,
            device,
            details: { vlanId: vlan.id, name: vlan.name },
          });
        } catch (err) {
          results.push({
            action: "failed",
            resourceType: "vlan",
            resourceId: `vlan-${vlan.id}`,
            device,
            error: String(err),
          });
        }
      } else if (existing.name !== vlan.name) {
        const cmd = [`vlan ${vlan.id}`, `name ${vlan.name}`];
        try {
          await this.ios.configIos(device, cmd, { save: false });
          results.push({
            action: "configured",
            resourceType: "vlan",
            resourceId: `vlan-${vlan.id}`,
            device,
            details: { vlanId: vlan.id, name: vlan.name, updated: true },
          });
        } catch (err) {
          results.push({
            action: "failed",
            resourceType: "vlan",
            resourceId: `vlan-${vlan.id}`,
            device,
            error: String(err),
          });
        }
      } else {
        results.push({
          action: "skipped",
          resourceType: "vlan",
          resourceId: `vlan-${vlan.id}`,
          device,
          details: { vlanId: vlan.id, reason: "already configured" },
        });
      }
    }

    return results;
  }

  async ensureSvis(device: string, svis: LabSviSpec[]): Promise<IosReconcileResult[]> {
    const results: IosReconcileResult[] = [];

    for (const svi of svis) {
      try {
        await this.ios.configureSvi(device, svi.vlan, svi.ip, svi.mask, {
          description: svi.description,
          enableRouting: true,
          save: false,
        });
        results.push({
          action: "configured",
          resourceType: "svi",
          resourceId: `svi-${svi.vlan}`,
          device,
          details: { vlanId: svi.vlan, ipAddress: svi.ip },
        });
      } catch (err) {
        results.push({
          action: "failed",
          resourceType: "svi",
          resourceId: `svi-${svi.vlan}`,
          device,
          error: String(err),
        });
      }
    }

    return results;
  }

  async ensureStaticRoutes(device: string, routes: LabStaticRouteSpec[]): Promise<IosReconcileResult[]> {
    const observed = await this.observer.getStaticRoutes(device);
    const results: IosReconcileResult[] = [];

    for (const route of routes) {
      const existing = observed.find(
        (r) =>
          r.network === route.network &&
          r.mask === route.mask &&
          r.nextHop === route.nextHop
      );

      if (!existing) {
        try {
          await this.ios.configureStaticRoute(device, route.network, route.mask, route.nextHop, {
            save: false,
          });
          results.push({
            action: "configured",
            resourceType: "static-route",
            resourceId: `route-${route.network}-${route.mask}-${route.nextHop}`,
            device,
            details: { network: route.network, mask: route.mask, nextHop: route.nextHop },
          });
        } catch (err) {
          results.push({
            action: "failed",
            resourceType: "static-route",
            resourceId: `route-${route.network}-${route.mask}-${route.nextHop}`,
            device,
            error: String(err),
          });
        }
      } else {
        results.push({
          action: "skipped",
          resourceType: "static-route",
          resourceId: `route-${route.network}-${route.mask}-${route.nextHop}`,
          device,
          details: { network: route.network, reason: "already configured" },
        });
      }
    }

    return results;
  }

  async ensureAccessPorts(device: string, ports: LabAccessPortSpec[]): Promise<IosReconcileResult[]> {
    const results: IosReconcileResult[] = [];

    for (const port of ports) {
      try {
        await this.ios.configureAccessPort(
          device,
          port.port,
          port.vlan,
          { portfast: port.portfast, save: false }
        );
        results.push({
          action: "configured",
          resourceType: "access-port",
          resourceId: `${device}:${port.port}`,
          device,
          details: { interface: port.port, vlan: port.vlan },
        });
      } catch (err) {
        results.push({
          action: "failed",
          resourceType: "access-port",
          resourceId: `${device}:${port.port}`,
          device,
          error: String(err),
        });
      }
    }

    return results;
  }

  async ensureTrunkPorts(device: string, trunks: LabTrunkSpec[]): Promise<IosReconcileResult[]> {
    const results: IosReconcileResult[] = [];

    for (const trunk of trunks) {
      try {
        await this.ios.configureTrunkPort(
          device,
          trunk.port,
          trunk.allowedVlans ?? [],
          { nativeVlan: trunk.nativeVlan, save: false }
        );
        results.push({
          action: "configured",
          resourceType: "trunk-port",
          resourceId: `${device}:${trunk.port}`,
          device,
          details: { interface: trunk.port, vlans: trunk.allowedVlans },
        });
      } catch (err) {
        results.push({
          action: "failed",
          resourceType: "trunk-port",
          resourceId: `${device}:${trunk.port}`,
          device,
          error: String(err),
        });
      }
    }

    return results;
  }

  async reconcileDevice(
    device: string,
    vlans: LabVlanSpec[],
    svis: LabSviSpec[],
    staticRoutes: LabStaticRouteSpec[],
    accessPorts: LabAccessPortSpec[],
    trunkPorts: LabTrunkSpec[]
  ): Promise<IosReconcileResult[]> {
    const results: IosReconcileResult[] = [];

    const [vlanResults, sviResults, routeResults, accessResults, trunkResults] = await Promise.all([
      vlans.length ? this.ensureVlans(device, vlans) : Promise.resolve([]),
      svis.length ? this.ensureSvis(device, svis) : Promise.resolve([]),
      staticRoutes.length ? this.ensureStaticRoutes(device, staticRoutes) : Promise.resolve([]),
      accessPorts.length ? this.ensureAccessPorts(device, accessPorts) : Promise.resolve([]),
      trunkPorts.length ? this.ensureTrunkPorts(device, trunkPorts) : Promise.resolve([]),
    ]);

    results.push(...vlanResults, ...sviResults, ...routeResults, ...accessResults, ...trunkResults);

    return results;
  }
}
