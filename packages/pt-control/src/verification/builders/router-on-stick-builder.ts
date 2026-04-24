/**
 * Router-on-Stick Builder - Construcción de laboratorio router-on-a-stick
 * 
 * @module verification/builders/router-on-stick-builder
 */

import type { PTController } from "../../controller/index.js";
import type { DeviceState } from "@cisco-auto/types";
import { getRealRunStore } from "../real-run-store.js";

export interface RouterOnStickConfig {
  routerName: string;
  switchName: string;
  vlans: { id: number; network: string; gateway: string; hostCount: number }[];
}

export interface RouterOnStickResult {
  router: DeviceState;
  switch: DeviceState;
  hosts: DeviceState[];
  subinterfaces: { vlanId: number; ip: string }[];
}

export async function buildRouterOnStickLab(
  controller: PTController,
  config: RouterOnStickConfig
): Promise<RouterOnStickResult> {
  const store = getRealRunStore();
  const runId = (global as any).__runId ?? "unknown";
  const router = await controller.addDevice(config.routerName, "2911") as DeviceState;
  const switchDevice = await controller.addDevice(config.switchName, "2960-24TT") as DeviceState;

  await controller.addLink(config.routerName, "GigabitEthernet0/0", config.switchName, "GigabitEthernet0/1");

  const subinterfaces: { vlanId: number; ip: string }[] = [];
  let hostCounter = 10;
  const hosts: DeviceState[] = [];

  for (const vlan of config.vlans) {
    const subintIp = `192.168.${vlan.id}.1`;
    subinterfaces.push({ vlanId: vlan.id, ip: subintIp });

    for (let h = 0; h < vlan.hostCount; h++) {
      const hostName = `PC-V${vlan.id}-${h + 1}`;
      const host = await controller.addDevice(hostName, "PC-PT") as DeviceState;
      const port = `FastEthernet0/${hostCounter}`;
      await controller.addLink(hostName, "FastEthernet0", config.switchName, port);
      await controller.configHost(hostName, { ip: `192.168.${vlan.id}.${hostCounter}`, mask: "255.255.255.0", gateway: vlan.gateway });
      hosts.push(host);
      hostCounter++;
    }
  }

  store.writeStepArtifact(runId, "ros-lab", "setup", "ros-lab-config.json", JSON.stringify({ router: config.routerName, switch: config.switchName, subinterfaces, hostCount: hosts.length }));
  return { router, switch: switchDevice, hosts, subinterfaces };
}
