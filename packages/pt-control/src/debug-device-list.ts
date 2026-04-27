import { createPTController } from "./controller/index.js";

async function main() {
  const controller = createPTController({ devDir: undefined });
  await controller.start();
  
  try {
    const result = await controller.listDevices();
    console.log("Result type:", typeof result);
    console.log("Is array:", Array.isArray(result));
    console.log("Has devices property:", result && typeof result === "object" && "devices" in result);
    if ("devices" in result && Array.isArray((result as any).devices)) {
      console.log("Devices count:", (result as any).devices.length);
      console.log("First device:", (result as any).devices[0]?.name);
    }
    console.log("Result keys:", result && typeof result === "object" ? Object.keys(result) : "N/A");
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
