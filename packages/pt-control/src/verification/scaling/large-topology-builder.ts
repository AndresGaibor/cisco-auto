/**
 * Large Topology Builder - Construye topologías grandes para stress testing
 *
 * @module verification/scaling/large-topology-builder
 */

import type { PTController } from "../../controller/index.js";
import type { DeviceState } from "@cisco-auto/types";

export interface LargeTopologyConfig {
  routerCount: number;
  switchCount: number;
  hostCount: number;
  networkSegments: number;
  enableRouting: boolean;
  routingProtocol: "ospf" | "eigrp" | "static" | "none";
}

export interface LargeTopologyResult {
  routers: DeviceState[];
  switches: DeviceState[];
  hosts: DeviceState[];
  networks: string[];
  topologyComplexity: number;
}

interface NetworkSegment {
  id: string;
  subnet: string;
  gateway: string;
  devices: string[];
}

function generarSubredes(segments: number): NetworkSegment[] {
  const subredes: NetworkSegment[] = [];
  for (let i = 0; i < segments; i++) {
    const octeto3 = 10 + i;
    subredes.push({
      id: `net-${i + 1}`,
      subnet: `10.${octeto3}.0.0/24`,
      gateway: `10.${octeto3}.0.1`,
      devices: [],
    });
  }
  return subredes;
}

function calcularComplexidad(routers: number, switches: number, hosts: number, segments: number): number {
  const enlacesTotal = (routers * (routers - 1)) / 2;
  const enlacesSwitchRouter = routers * switches;
  const enlacesHostSwitch = switches * hosts;
  const totalEnlaces = enlacesTotal + enlacesSwitchRouter + enlacesHostSwitch;
  const totalDevices = routers + switches + hosts;

  return (totalEnlaces + totalDevices + segments * 2) / 10;
}

function obtenerModeloSafely(arr: string[], index: number): string {
  return arr[index % arr.length] ?? arr[0] ?? "generic";
}

export async function buildLargeTopology(
  controller: PTController,
  config: LargeTopologyConfig
): Promise<LargeTopologyResult> {
  const { routerCount, switchCount, hostCount, networkSegments, enableRouting, routingProtocol } = config;

  const routers: DeviceState[] = [];
  const switches: DeviceState[] = [];
  const hosts: DeviceState[] = [];
  const networks = generarSubredes(networkSegments);

  const modelosRouter = ["2911", "1941", "2901"];
  const modelosSwitch = ["2960-24TT", "2960-24TT-L", "2950T-24"];
  const modelosHost = ["PC-PT", "Laptop-PT", "Server-PT"];

  const xBaseRouter = 50;
  const xBaseSwitch = 250;
  const xBaseHost = 450;
  const ySpacing = 100;

  for (let i = 0; i < routerCount; i++) {
    const nombre = `R${i + 1}`;
    const modelo = obtenerModeloSafely(modelosRouter, i);
    const y = 100 + i * ySpacing;

    try {
      const device = await controller.addDevice(nombre, modelo, { x: xBaseRouter, y });
      routers.push(device);
    } catch (e) {
      console.warn(`No se pudo crear router ${nombre}: ${e}`);
    }
  }

  for (let i = 0; i < switchCount; i++) {
    const nombre = `S${i + 1}`;
    const modelo = obtenerModeloSafely(modelosSwitch, i);
    const y = 100 + i * ySpacing;

    try {
      const device = await controller.addDevice(nombre, modelo, { x: xBaseSwitch, y });
      switches.push(device);
    } catch (e) {
      console.warn(`No se pudo crear switch ${nombre}: ${e}`);
    }
  }

  const hostsPorSwitch = Math.ceil(hostCount / switchCount);
  let hostCreados = 0;

  for (let si = 0; si < switches.length && hostCreados < hostCount; si++) {
    const switchActual = switches[si];
    if (!switchActual) continue;
    const switchY = 100 + si * ySpacing;

    for (let hi = 0; hi < hostsPorSwitch && hostCreados < hostCount; hi++) {
      const nombre = `H${hostCreados + 1}`;
      const modelo = obtenerModeloSafely(modelosHost, hostCreados);
      const y = switchY + (hi * 30);

      try {
        const device = await controller.addDevice(nombre, modelo, { x: xBaseHost, y });
        hosts.push(device);
        hostCreados++;

        const netIdx = hostCreados % networks.length;
        const networkActual = networks[netIdx];
        if (networkActual) {
          networkActual.devices.push(nombre);
        }
      } catch (e) {
        console.warn(`No se pudo crear host ${nombre}: ${e}`);
      }
    }
  }

  for (let ri = 0; ri < routers.length; ri++) {
    const routerActual = routers[ri];
    if (!routerActual) continue;
    for (let si = 0; si < switches.length; si++) {
      const switchActual = switches[si];
      if (!switchActual) continue;
      try {
        const portRouter = `GigabitEthernet0/${ri + 1}`;
        const portSwitch = `FastEthernet0/${si + 1}`;
        await controller.addLink(routerActual.name, portRouter, switchActual.name, portSwitch);
      } catch (e) {
        console.warn(`No se pudo crear enlace R${ri + 1}-S${si + 1}: ${e}`);
      }
    }
  }

  const hostsPorSegmento = Math.ceil(hosts.length / networkSegments);
  for (let si = 0; si < switches.length && si * hostsPorSegmento < hosts.length; si++) {
    const switchActual = switches[si];
    if (!switchActual) continue;
    const primerHost = si * hostsPorSegmento;

    for (let hi = primerHost; hi < Math.min(primerHost + hostsPorSegmento, hosts.length); hi++) {
      const hostActual = hosts[hi];
      if (!hostActual) continue;
      try {
        const hostNom = hostActual.name;
        const portSwitch = `FastEthernet0/${24 - (hi % 24)}`;
        await controller.addLink(hostNom, `FastEthernet0/1`, switchActual.name, portSwitch);
      } catch (e) {
        console.warn(`No se pudo crear enlace ${hostActual.name}-S${si + 1}: ${e}`);
      }
    }
  }

  if (enableRouting && routingProtocol !== "none" && routingProtocol === "ospf") {
    for (const router of routers) {
      if (!router) continue;
      try {
        const ospfCommands = [
          "configure terminal",
          "ip routing",
          "router ospf 1",
        ];
        for (let ni = 0; ni < networks.length; ni++) {
          const net = networks[ni];
          if (!net) continue;
          const partes = net.subnet.split(".");
          const a = parseInt(partes[0] ?? "10", 10);
          const b = parseInt(partes[1] ?? "0", 10);
          const c = parseInt(partes[2] ?? "0", 10);
          ospfCommands.push(`network ${a}.${b}.${c}.0 0.0.0.255 area ${(ni % 10) + 1}`);
        }
        ospfCommands.push("exit");
        await controller.configHost(router.name, { dhcp: false });
      } catch (e) {
        console.warn(`No se pudo configurar routing en ${router.name}: ${e}`);
      }
    }
  }

  const complejidad = calcularComplexidad(routers.length, switches.length, hosts.length, networkSegments);

  return {
    routers,
    switches,
    hosts,
    networks: networks.map((n) => n.subnet),
    topologyComplexity: complejidad,
  };
}