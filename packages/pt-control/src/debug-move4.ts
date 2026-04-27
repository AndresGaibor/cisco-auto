import { createPTController } from "./controller/index.js";
import * as fs from "fs";

async function main() {
  const devDir = "/Users/andresgaibor/pt-dev";
  const controller = createPTController({ devDir });
  await controller.start();
  
  try {
    // Limpiar archivos anteriores
    const resultsBefore = fs.readdirSync(`${devDir}/results`);
    console.log("Results before:", resultsBefore.length);
    
    // Monitorear directorio de resultados
    console.log("Attempting to move R-GYE-2811...");
    const result = await controller.moveDevice("R-GYE-2811", 520, 40);
    console.log("Move result:", JSON.stringify(result, null, 2));
    
    // Esperar un poco y verificar
    await new Promise(r => setTimeout(r, 2000));
    const resultsAfter = fs.readdirSync(`${devDir}/results`);
    console.log("Results after:", resultsAfter.length);
    
    // Mostrar todos los resultados nuevos
    const newResults = resultsAfter.filter(r => !resultsBefore.includes(r));
    for (const r of newResults) {
      const content = fs.readFileSync(`${devDir}/results/${r}`, "utf-8");
      const parsed = JSON.parse(content);
      console.log(`Result ${r}:`, {
        status: parsed.status,
        ok: parsed.ok,
        id: parsed.id,
        completedAt: new Date(parsed.completedAt).toISOString()
      });
    }
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
