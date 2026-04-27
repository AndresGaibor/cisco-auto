import { createPTController } from "./controller/index.js";
import { createDefaultPTController } from "./controller/factory.js";

async function main() {
  const controller1 = createPTController({ devDir: undefined });
  await controller1.start();
  
  try {
    const result1 = await controller1.listDevices();
    console.log("createPTController({ devDir: undefined }):");
    console.log("  isArray:", Array.isArray(result1));
    console.log("  count:", Array.isArray(result1) ? result1.length : "N/A");
  } finally {
    await controller1.stop();
  }

  const controller2 = createDefaultPTController();
  await controller2.start();
  
  try {
    const result2 = await controller2.listDevices();
    console.log("\ncreateDefaultPTController():");
    console.log("  isArray:", Array.isArray(result2));
    console.log("  count:", Array.isArray(result2) ? result2.length : "N/A");
  } finally {
    await controller2.stop();
  }
}

main().catch(console.error);
