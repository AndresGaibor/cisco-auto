import { createPTController } from "./controller/index.js";

async function main() {
  const controller = createPTController({ devDir: undefined });
  await controller.start();
  
  try {
    const result = await controller.listDevices();
    console.log("Result:", JSON.stringify({
      type: typeof result,
      isArray: Array.isArray(result),
      hasDevices: "devices" in (result as any),
      devicesCount: Array.isArray(result) ? result.length : (result as any).devices?.length,
      keys: Object.keys(result),
    }, null, 2));
    
    // Verificar requireDevice directamente
    try {
      const device = await (controller as any).requireDevice("R-GYE-2811");
      console.log("requireDevice found:", device?.name);
    } catch (e: any) {
      console.log("requireDevice error:", e.message);
      console.log("Details:", JSON.stringify(e.details, null, 2));
    }
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
