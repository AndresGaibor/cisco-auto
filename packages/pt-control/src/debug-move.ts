import { createPTController } from "./controller/index.js";

async function main() {
  const controller = createPTController();
  await controller.start();
  
  try {
    // Verificar que el dispositivo existe
    const devices = await controller.listDevices();
    console.log("Devices found:", devices.length);
    
    // Intentar mover el dispositivo
    console.log("Attempting to move R-GYE-2811 to (520, 40)...");
    const result = await controller.moveDevice("R-GYE-2811", 520, 40);
    console.log("Move result:", JSON.stringify(result, null, 2));
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
