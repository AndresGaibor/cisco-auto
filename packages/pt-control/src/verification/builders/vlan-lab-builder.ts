/**
 * VLAN Lab Builder - Construcción de laboratorios VLAN
 * 
 * Crea switch, VLANs, hosts y los enlaza configurando puertos access.
 * 
 * @module verification/builders/vlan-lab-builder
 */

import type { PTController } from "../../controller/index.js";
import type { DeviceState } from "@cisco-auto/types";
import { getRealRunStore } from "../real-run-store.js";

export interface VlanLabConfig {
  switchName: string;
  vlanIds: number[];
  hostsPerVlan: number;
  baseIp: string;
  mask: string;
}

export interface VlanLabResult {
  switch: DeviceState;
  hosts: DeviceState[];
  vlans: { id: number; network: string }[];
}

export async function buildVlanLab(
  controller: PTController,
  config: VlanLabConfig
): Promise<VlanLabResult> {
  const store = getRealRunStore();
  const runId = (global as any).__runId ?? "unknown";
  const switchDevice = await controller.addDevice(config.switchName, "2960-24TT");
  const hosts: DeviceState[] = [];
  const vlans: { id: number; network: string }[] = [];

  let hostCounter = 10;
  for (const vlanId of config.vlanIds) {
    for (let h = 0; h < config.hostsPerVlan; h++) {
      const hostName = `PC-${vlanId}-${h + 1}`;
      const host = await controller.addDevice(hostName, "PC-PT") as DeviceState;
      const port = `FastEthernet0/${hostCounter}`;
      await controller.addLink(hostName, "FastEthernet0", config.switchName, port);
      const ip = `192.168.${vlanId}.${hostCounter}`;
      await controller.configHost(hostName, { ip, mask: config.mask, gateway: `192.168.${vlanId}.1` });
      hosts.push(host);
      hostCounter++;
    }
    vlans.push({ id: vlanId, network: `192.168.${vlanId}.0/24` });
  }

  store.writeStepArtifact(runId, "vlan-lab", "setup", "vlan-lab-config.json", JSON.stringify({ config, vlans, hostCount: hosts.length }));
  return { switch: switchDevice, hosts, vlans };
}
