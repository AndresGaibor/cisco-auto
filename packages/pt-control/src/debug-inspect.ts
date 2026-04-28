import { createDefaultPTController } from "./controller/index.js";

async function main() {
  const controller = createDefaultPTController();
  await controller.start();
  
  try {
    await controller.moveDevice("R-GYE-2811", 550, 50);
    console.log("Moved to (550, 50)");
    
    await new Promise(r => setTimeout(r, 500));
    const inspect = await controller.inspectDevice("R-GYE-2811");
    console.log("inspectDevice result:");
    console.log("  name:", inspect?.name);
    console.log("  x:", inspect?.x);
    console.log("  y:", inspect?.y);
    console.log("  all keys:", Object.keys(inspect ?? {}));
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
