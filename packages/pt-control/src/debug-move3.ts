import { createDefaultPTController } from "./controller/index.js";
import * as fs from "fs";
import { homedir } from "node:os";
import { join } from "node:path";

const devDir = process.env.PT_DEV_DIR ?? join(homedir(), "pt-dev");

async function main() {
  const controller = createDefaultPTController();
  await controller.start();
  
  try {
    const commandsDir = join(devDir, "commands");
    const resultsDir = join(devDir, "results");

    // Listar comandos y resultados antes
    const beforeCmds = fs.readdirSync(commandsDir).filter((f) => f.startsWith("cmd_"));
    const beforeResults = fs.readdirSync(resultsDir).filter((f) => f.startsWith("cmd_"));
    console.log("Before - Commands:", beforeCmds.length, "Results:", beforeResults.length);
    
    // Intentar mover el dispositivo
    console.log("Attempting to move R-GYE-2811...");
    const result = await controller.moveDevice("R-GYE-2811", 520, 40);
    console.log("Move result:", JSON.stringify(result, null, 2));
    
    // Listar comandos y resultados después
    await new Promise(r => setTimeout(r, 500));
    const afterCmds = fs.readdirSync(commandsDir).filter((f) => f.startsWith("cmd_"));
    const afterResults = fs.readdirSync(resultsDir).filter((f) => f.startsWith("cmd_"));
    console.log("After - Commands:", afterCmds.length, "Results:", afterResults.length);
    
    // Mostrar archivos nuevos
    const newCmds = afterCmds.filter(c => !beforeCmds.includes(c));
    const newResults = afterResults.filter(r => !beforeResults.includes(r));
    console.log("New commands:", newCmds);
    console.log("New results:", newResults);
    
    // Si hay comando nuevo, mostrar contenido
    if (newCmds.length > 0) {
      for (const cmdFile of newCmds) {
        const content = fs.readFileSync(join(commandsDir, cmdFile), "utf-8");
        console.log(`\nCommand file ${cmdFile}:`, content);
      }
    }
  } finally {
    await controller.stop();
  }
}

main().catch(console.error);
