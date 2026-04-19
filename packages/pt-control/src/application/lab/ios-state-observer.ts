// IOSStateObserver - Observación de estado IOS para reconciliación idempotente
// Fase 4: Reconciliación Progresiva de Configuración IOS

import type {
  ShowVlan,
  ShowIpRoute,
  ShowIpInterfaceBrief,
  VlanEntry,
  RouteEntry,
  InterfaceBrief,
} from "@cisco-auto/types";
import type { IosService } from "../services/ios-service.js";

/**
 * Estado observado de un dispositivo IOS.
 */
export interface ObservedIosState {
  device: string;
  vlans: ObservedVlan[];
  accessPorts: ObservedAccessPort[];
  trunks: ObservedTrunk[];
  svis: ObservedSvi[];
  staticRoutes: ObservedStaticRoute[];
  dhcpRelays: ObservedDhcpRelay[];
  hostname?: string;
}

export interface ObservedVlan {
  id: number;
  name: string;
  status: "active" | "suspended" | "act/unsup";
}

export interface ObservedAccessPort {
  interface: string;
  vlan: number;
}

export interface ObservedTrunk {
  interface: string;
  vlans: number[];
}

export interface ObservedSvi {
  vlan: number;
  ipAddress?: string;
}

export interface ObservedStaticRoute {
  network: string;
  mask?: string;
  nextHop: string;
}

export interface ObservedDhcpRelay {
  interface: string;
  helperAddress: string;
}

export class IOSStateObserver {
  constructor(private ios: IosService) {}

  /**
   * Obtiene estado completo observado de un dispositivo.
   */
  async getObservedState(device: string): Promise<ObservedIosState> {
    const [vlans, routes, interfaces, svis] = await Promise.all([
      this.getVlans(device),
      this.getStaticRoutes(device),
      this.getIpInterfaces(device),
      this.getSvisFromRoute(device),
    ]);

    return {
      device,
      vlans,
      accessPorts: [],
      trunks: [],
      svis,
      staticRoutes: routes,
      dhcpRelays: [],
      hostname: undefined,
    };
  }

  /**
   * Obtiene VLANs configuradas en switches.
   */
  async getVlans(device: string): Promise<ObservedVlan[]> {
    try {
      const showVlan = await this.ios.showVlan(device);
      return (showVlan?.vlans ?? []).map((v: VlanEntry) => ({
        id: Number(v.id),
        name: v.name ?? "",
        status: (v.status as "active" | "suspended" | "act/unsup") ?? "active",
      }));
    } catch (err) {
      console.warn(`Error obtaining VLANs from ${device}:`, err);
      return [];
    }
  }

  /**
   * Obtiene rutas estáticas.
   */
  async getStaticRoutes(device: string): Promise<ObservedStaticRoute[]> {
    try {
      const showRoute = await this.ios.showIpRoute(device);
      return (showRoute?.routes ?? [])
        .filter((r: RouteEntry) => r.type === "S")
        .map((r: RouteEntry) => ({
          network: r.network ?? "",
          mask: r.mask,
          nextHop: r.nextHop ?? "",
        }));
    } catch (err) {
      console.warn(`Error obtaining VLANs from ${device}:`, err);
      return [];
    }
  }

  /**
   * Obtiene interfaces IP desde show ip interface brief.
   */
  async getIpInterfaces(device: string): Promise<InterfaceBrief[]> {
    try {
      const result = await this.ios.showIpInterfaceBrief(device);
      return result?.interfaces ?? [];
    } catch (err) {
      console.warn(`Error obtaining VLANs from ${device}:`, err);
      return [];
    }
  }

  /**
   * Extrae SVIs detectables desde show ip route.
   */
  async getSvisFromRoute(device: string): Promise<ObservedSvi[]> {
    try {
      const showRoute = await this.ios.showIpRoute(device);
      const svis: ObservedSvi[] = [];

      for (const r of showRoute?.routes ?? []) {
        if (r.type === "C" && r.network && r.mask) {
          const maskBits = this.maskToBits(r.mask);
          if (maskBits >= 24) {
            const match = r.network.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
            if (match && match[3]) {
              const thirdOctet = parseInt(match[3], 10);
              if (thirdOctet >= 1 && thirdOctet <= 4094) {
                svis.push({
                  vlan: thirdOctet,
                  ipAddress: `${r.network}/${maskBits}`,
                });
              }
            }
          }
        }
      }

      return svis;
    } catch (err) {
      console.warn(`Error obtaining VLANs from ${device}:`, err);
      return [];
    }
  }

  private maskToBits(mask: string): number {
    const octets = mask.split(".").map((o) => parseInt(o, 10));
    let bits = 0;
    for (const octet of octets) {
      for (let i = 7; i >= 0; i--) {
        if (octet & (1 << i)) bits++;
        else break;
      }
    }
    return bits;
  }
}
