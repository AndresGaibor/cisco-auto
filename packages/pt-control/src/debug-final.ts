import { createDefaultPTController } from "./controller/index.js";

async function main() {
  const controller = createDefaultPTController();
  await controller.start();
  
  try {
    const devices = await controller.listDevices();
    console.log("listDevices result:");
    console.log("  typeof:", typeof devices);
    console.log("  isArray:", Array.isArray(devices));
    console.log("  length/count:", devices.length);
    
    // Intentar requireDevice
    try {
      const device = await controller.requireDevice("R-GYE-2811");
      console.log("requireDevice found:", device?.name);
    } catch (error: unknown) {
      const err = error as { message?: string; details?: unknown };
      console.log("requireDevice error:", err.message);
      console.log("  details:", JSON.stringify(err.details, null, 2));
    }
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
