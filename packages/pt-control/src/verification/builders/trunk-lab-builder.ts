/**
 * Trunk Lab Builder - Construcción de laboratorios con trunk entre switches
 * 
 * @module verification/builders/trunk-lab-builder
 */

import type { PTController } from "../../controller/index.js";
import type { DeviceState, LinkState } from "@cisco-auto/types";
import { getRealRunStore } from "../real-run-store.js";

export interface TrunkLabConfig {
  switchCount: number;
  hostsPerSwitch: number;
  vlanId: number;
}

export interface TrunkLabResult {
  switches: DeviceState[];
  hosts: DeviceState[];
  trunkLinks: LinkState[];
}

export async function buildTrunkLab(
  controller: PTController,
  config: TrunkLabConfig
): Promise<TrunkLabResult> {
  const store = getRealRunStore();
  const runId = (global as any).__runId ?? "unknown";
  const switches: DeviceState[] = [];
  const hosts: DeviceState[] = [];

  for (let i = 0; i < config.switchCount; i++) {
    const sw = await controller.addDevice(`Switch${i + 1}`, "2960-24TT") as DeviceState;
    switches.push(sw);
  }

  for (let i = 0; i < config.switchCount - 1; i++) {
    await controller.addLink(`Switch${i + 1}`, `GigabitEthernet0/1`, `Switch${i + 2}`, `GigabitEthernet0/1`);
  }

  let hostCounter = 10;
  for (let i = 0; i < config.switchCount; i++) {
    for (let h = 0; h < config.hostsPerSwitch; h++) {
      const hostName = `PC-S${i + 1}-${h + 1}`;
      const host = await controller.addDevice(hostName, "PC-PT") as DeviceState;
      const port = `FastEthernet0/${hostCounter}`;
      await controller.addLink(hostName, "FastEthernet0", `Switch${i + 1}`, port);
      await controller.configHost(hostName, { ip: `192.168.${config.vlanId}.${hostCounter}`, mask: "255.255.255.0", gateway: `192.168.${config.vlanId}.1` });
      hosts.push(host);
      hostCounter++;
    }
  }

  store.writeStepArtifact(runId, "trunk-lab", "setup", "trunk-lab-config.json", JSON.stringify({ switches: switches.length, hosts: hosts.length, vlanId: config.vlanId }));
  return { switches, hosts, trunkLinks: [] };
}
