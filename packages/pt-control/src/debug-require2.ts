import { createPTController } from "./controller/index.js";

async function main() {
  const controller = createPTController({ devDir: "/Users/andresgaibor/pt-dev" });
  await controller.start();
  
  try {
    await new Promise(r => setTimeout(r, 1000));
    
    const result = await controller.listDevices();
    const devices = Array.isArray(result) ? result : (result as any).devices ?? [];
    
    console.log("controller.listDevices():");
    console.log("  isArray:", Array.isArray(result));
    console.log("  has 'devices':", "devices" in result);
    console.log("  count:", devices.length);
    console.log("  first 3:", devices.slice(0, 3).map(d => d.name));
    console.log("  found R-GYE-2811:", devices.find(d => d.name === "R-GYE-2811")?.name);
    
    // Ahora probar requireDevice
    try {
      const req = await controller.requireDevice("R-GYE-2811");
      console.log("requireDevice found:", req.name);
    } catch (e: any) {
      console.log("requireDevice error:", e.message);
      console.log("  details:", e.details);
    }
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
