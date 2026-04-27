import { createPTController } from "./controller/index.js";
import { fetchDeviceList } from "../apps/pt-cli/src/utils/device-utils.js";

async function main() {
  const controller = createPTController({ devDir: "/Users/andresgaibor/pt-dev" });
  await controller.start();
  
  try {
    await new Promise(r => setTimeout(r, 1000));
    const devices = await fetchDeviceList(controller);
    console.log("fetchDeviceList result:");
    console.log("  isArray:", Array.isArray(devices));
    console.log("  count:", devices.length);
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
