import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const RESULTS_PATH = join(process.cwd(), "docs", "probe-results-v4.json");
const REGISTRY_PATH = join(process.cwd(), "packages", "pt-runtime", "src", "pt-api", "pt-api-registry.ts");

async function runAutoTyper() {
  console.log("🚀 Iniciando Auto-Typer - Endureciendo el registro de la API...");

  const results = JSON.parse(readFileSync(RESULTS_PATH, "utf-8"));
  let registry = readFileSync(REGISTRY_PATH, "utf-8");
  let updates = 0;

  // Mapa para consolidar el mejor tipo encontrado para cada método por clase
  const typeMap = new Map();
  results.raw.forEach(r => {
    const key = `${r.class || r.path}.${r.method}`;
    if (!typeMap.has(key)) typeMap.set(key, r.type);
  });

  for (const [key, confirmedType] of typeMap.entries()) {
    const [className, method] = key.split('.');
    
    // Heurística de reemplazo: Buscamos el método dentro de la interfaz
    // Ejemplo: getName(): any; -> getName(): string;
    const regex = new RegExp(`(${method}\\s*\\(.*\\)\\s*:\\s*)(any|unknown|void|undefined|string|number|boolean)([^;]*)`, 'g');
    
    if (registry.includes(method)) {
      const tsType = confirmedType.startsWith("PTObject") ? "any" : confirmedType;
      
      const newRegistry = registry.replace(regex, (match, prefix, oldType, suffix) => {
        if (oldType !== tsType || !match.includes("[CONFIRMED]")) {
          updates++;
          return `${prefix}${tsType}${suffix} // [CONFIRMED]`;
        }
        return match;
      });
      
      registry = newRegistry;
    }
  }

  writeFileSync(REGISTRY_PATH, registry);
  console.log(`✅ Auto-Typer finalizado. ${updates} firmas endurecidas en el registro.`);
}

runAutoTyper().catch(console.error);
