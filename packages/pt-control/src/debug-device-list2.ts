import { createPTController } from "./controller/index.js";

async function main() {
  const controller = createPTController({ devDir: undefined });
  await controller.start();
  
  try {
    // Acceder al topologyController interno para ver qué retorna
    const topoController = (controller as any)._topologyController;
    const topoService = (topoController as any)._topologyFacade;
    
    console.log("TopologyService listDevices type:", topoService.listDevices.toString().slice(0, 200));
    
    const result = await topoService.listDevices();
    console.log("\nlistDevices result:");
    console.log("  typeof:", typeof result);
    console.log("  isArray:", Array.isArray(result));
    console.log("  hasDevices:", result && typeof result === "object" && "devices" in result);
    console.log("  keys:", Object.keys(result));
    console.log("  length:", (result as any).length);
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
