import { createPTController } from "./controller/index.js";

async function main() {
  const controller = createPTController();
  await controller.start();
  
  try {
    // Verificar que existe la carpeta de comandos
    console.log("Checking bridge status...");
    const status = controller.getBridgeStatus();
    console.log("Bridge status:", JSON.stringify(status, null, 2));
    
    // Intentar con el primitivePort directamente
    const controllerInterno = controller as unknown as { _composition?: { primitivePort?: unknown } };
    const primitivePort = controllerInterno._composition?.primitivePort;
    console.log("PrimitivePort exists:", !!primitivePort);
    
    // Intentar mover el dispositivo
    console.log("Attempting to move R-GYE-2811 to (520, 40)...");
    const result = await controller.moveDevice("R-GYE-2811", 520, 40);
    console.log("Move result:", JSON.stringify(result, null, 2));
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
