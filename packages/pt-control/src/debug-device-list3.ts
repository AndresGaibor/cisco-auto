import { createPTController } from "./controller/index.js";

async function main() {
  const controller = createPTController();
  await controller.start();
  
  try {
    const result = await controller.listDevices();
    const devices = Array.isArray(result) ? result : (result as { devices?: Array<{ name: string }> }).devices ?? [];
    console.log("Result:", JSON.stringify({
      type: typeof result,
      isArray: Array.isArray(result),
      hasDevices: !Array.isArray(result) && !!(result as { devices?: unknown[] }).devices,
      devicesCount: devices.length,
      keys: Object.keys(result),
    }, null, 2));
    
    // Verificar requireDevice directamente
    try {
      const device = await controller.requireDevice("R-GYE-2811");
      console.log("requireDevice found:", device?.name);
    } catch (error: unknown) {
      const err = error as { message?: string; details?: unknown };
      console.log("requireDevice error:", err.message);
      console.log("Details:", JSON.stringify(err.details, null, 2));
    }
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
