/**
 * DHCP Lab Builder - Construcción de laboratorios DHCP
 * 
 * @module verification/builders/dhcp-lab-builder
 */

import type { PTController } from "../../controller/index.js";
import type { DeviceState } from "@cisco-auto/types";
import { getRealRunStore } from "../real-run-store.js";

export interface DhcpLabConfig {
  routerName: string;
  vlans: { id: number; network: string; poolStart: string; poolEnd: string; gateway: string }[];
  useRouterAsDhcpServer: boolean;
}

export interface DhcpLabResult {
  router: DeviceState;
  hosts: DeviceState[];
  dhcpPools: { vlanId: number; pool: string }[];
}

export async function buildDhcpLab(
  controller: PTController,
  config: DhcpLabConfig
): Promise<DhcpLabResult> {
  const store = getRealRunStore();
  const runId = (global as any).__runId ?? "unknown";
  const router = await controller.addDevice(config.routerName, "2911") as DeviceState;
  const hosts: DeviceState[] = [];

  let hostCounter = 10;
  for (const vlan of config.vlans) {
    for (let h = 0; h < 2; h++) {
      const hostName = `PC-V${vlan.id}-${h + 1}`;
      const host = await controller.addDevice(hostName, "PC-PT") as DeviceState;
      await controller.configHost(hostName, { dhcp: true });
      hosts.push(host);
      hostCounter++;
    }
  }

  store.writeStepArtifact(runId, "dhcp-lab", "setup", "dhcp-lab-config.json", JSON.stringify({ router: config.routerName, vlans: config.vlans, hostCount: hosts.length }));
  return { router, hosts, dhcpPools: config.vlans.map(v => ({ vlanId: v.id, pool: v.network })) };
}
