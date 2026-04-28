import { createPTController } from "./controller/index.js";

async function main() {
  const controller = createPTController();
  await controller.start();
  
  try {
    const devices = await controller.listDevices();
    console.log("Result type:", typeof devices);
    console.log("Is array:", Array.isArray(devices));
    console.log("Devices count:", devices.length);
    console.log("First device:", devices[0]?.name);
    console.log("Result keys:", devices.length > 0 ? Object.keys(devices[0] ?? {}) : "N/A");
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
