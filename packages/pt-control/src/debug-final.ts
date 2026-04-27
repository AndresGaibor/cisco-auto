import { createPTController } from "./controller/index.js";

async function main() {
  const controller = createPTController({ devDir: "/Users/andresgaibor/pt-dev" });
  await controller.start();
  
  try {
    const devices = await controller.listDevices();
    console.log("listDevices result:");
    console.log("  typeof:", typeof devices);
    console.log("  isArray:", Array.isArray(devices));
    console.log("  has 'devices' property:", "devices" in (devices as any));
    console.log("  length/count:", Array.isArray(devices) ? devices.length : (devices as any).devices?.length);
    
    // Intentar requireDevice
    try {
      const device = await (controller as any).requireDevice("R-GYE-2811");
      console.log("requireDevice found:", device?.name);
    } catch (e: any) {
      console.log("requireDevice error:", e.message);
      console.log("  details:", JSON.stringify(e.details, null, 2));
    }
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
