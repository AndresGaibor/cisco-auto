import { createPTController } from "./controller/index.js";

async function main() {
  const controller = createPTController();
  await controller.start();
  
  try {
    // Acceder al topologyController interno para ver qué retorna
    const topoController = controller as unknown as { _topologyController?: { _topologyFacade?: { listDevices: () => Promise<unknown> } } };
    const topoService = topoController._topologyController?._topologyFacade;
    if (!topoService) {
      console.log("Topology facade not available");
      return;
    }
    
    console.log("TopologyService listDevices type:", topoService.listDevices.toString().slice(0, 200));
    
    const result = await topoService.listDevices();
    const devices = Array.isArray(result) ? result : (result as { devices?: unknown[] }).devices ?? [];
    console.log("\nlistDevices result:");
    console.log("  typeof:", typeof result);
    console.log("  isArray:", Array.isArray(result));
    console.log("  hasDevices:", !Array.isArray(result) && !!(result as { devices?: unknown[] }).devices);
    console.log("  keys:", typeof result === "object" && result !== null ? Object.keys(result) : []);
    console.log("  length:", devices.length);
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
