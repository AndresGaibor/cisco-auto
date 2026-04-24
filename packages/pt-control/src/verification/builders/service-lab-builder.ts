/**
 * Service Lab Builder - Construcción de laboratorios de servicios
 * 
 * @module verification/builders/service-lab-builder
 */

import type { PTController } from "../../controller/index.js";
import type { DeviceState } from "@cisco-auto/types";
import { getRealRunStore } from "../real-run-store.js";

export interface ServiceLabConfig {
  serverName: string;
  service: "dns" | "http" | "dhcp";
  clientNames: string[];
}

export interface ServiceLabResult {
  server: DeviceState;
  clients: DeviceState[];
}

export async function buildServiceLab(
  controller: PTController,
  config: ServiceLabConfig
): Promise<ServiceLabResult> {
  const store = getRealRunStore();
  const runId = (global as any).__runId ?? "unknown";
  const server = await controller.addDevice(config.serverName, "Server-PT") as DeviceState;
  const clients: DeviceState[] = [];

  for (let i = 0; i < config.clientNames.length; i++) {
    const clientName = config.clientNames[i]!;
    const client = await controller.addDevice(clientName, "PC-PT") as DeviceState;
    await controller.configHost(clientName, { ip: `192.168.1.${10 + i}`, mask: "255.255.255.0", gateway: "192.168.1.1" });
    clients.push(client);
  }

  store.writeStepArtifact(runId, "service-lab", "setup", "service-lab-config.json", JSON.stringify({ server: config.serverName, service: config.service, clientCount: clients.length }));
  return { server, clients };
}
