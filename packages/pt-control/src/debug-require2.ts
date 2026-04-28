import { createDefaultPTController } from "./controller/index.js";

async function main() {
  const controller = createDefaultPTController();
  await controller.start();
  
  try {
    await new Promise(r => setTimeout(r, 1000));
    
    const result = await controller.listDevices();
    const devices = result;
    
    console.log("controller.listDevices():");
    console.log("  isArray:", Array.isArray(result));
    console.log("  count:", devices.length);
    console.log("  first 3:", devices.slice(0, 3).map(d => d.name));
    console.log("  found R-GYE-2811:", devices.find(d => d.name === "R-GYE-2811")?.name);
    
    // Ahora probar requireDevice
    try {
      const req = await controller.requireDevice("R-GYE-2811");
      console.log("requireDevice found:", req.name);
    } catch (error: unknown) {
      const err = error as { message?: string; details?: unknown };
      console.log("requireDevice error:", err.message);
      console.log("  details:", err.details);
    }
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
