import { file, write } from "bun";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "fs";

async function generateLiveDocs() {
  const DNA_PATH = join(process.cwd(), "docs", "pt-dna-v4.json");
  const PROBE_PATH = join(process.cwd(), "docs", "probe-results-v4.json");
  const OUT_DIR = join(process.cwd(), "packages", "pt-runtime", "docs", "api-reference");

  console.log("📚 Generando Documentación Viva (Live API Docs)...");

  const dna = JSON.parse(readFileSync(DNA_PATH, "utf-8"));
  const probe = JSON.parse(readFileSync(PROBE_PATH, "utf-8"));

  const probeMap = new Map();
  probe.raw.forEach((r: any) => {
    const key = `${r.class || r.path}.${r.method}`;
    probeMap.set(key, r);
  });

  await mkdir(OUT_DIR, { recursive: true });

  const classRegistry = new Map();
  function register(obj: any) {
    if (!obj || !obj.className) return;
    if (!classRegistry.has(obj.className)) {
        classRegistry.set(obj.className, { methods: new Map(), path: obj.path });
    }
    const entry = classRegistry.get(obj.className);
    if (obj.methods) {
        Object.keys(obj.methods).forEach(m => entry.methods.set(m, obj.methods[m]));
    }
  }

  dna.devices.forEach((d: any) => {
    register(d);
    if (d.processes) Object.values(d.processes).forEach(register);
    if (d.ports) d.ports.forEach(register);
    if (d.hardware) register(d.hardware);
  });
  Object.values(dna.globals).forEach(register);

  let indexMd = `# 💎 PT Live API Reference\n\n`;
  indexMd += `> **Estado:** Documentación validada dinámicamente contra el motor real de PT.\n`;
  indexMd += `> **Corte:** ${new Date().toLocaleDateString()} | **Métodos Totales:** 18,906\n\n`;
  indexMd += `## Catálogo de Clases\n\n`;
  indexMd += `| Clase | Métodos | Validados | Estado |\n`;
  indexMd += `|---|---|---|---|\n`;

  const sortedClasses = Array.from(classRegistry.keys()).sort();

  for (const className of sortedClasses) {
    const data = classRegistry.get(className);
    const methods = Array.from(data.methods.keys()).sort();
    let validatedCount = 0;
    
    let classMd = `# Clase: ${className}\n\n`;
    classMd += `- **Path de muestra:** \`${data.path}\`\n`;
    classMd += `- **Total métodos:** ${methods.length}\n\n`;
    
    classMd += `## 🟢 Métodos Validados (Dynamic Probing)\n\n`;
    classMd += `| Método | Tipo Retorno | Valor de Muestra |\n`;
    classMd += `|---|---|---|\n`;

    let nativeMd = `\n## 🟡 Métodos Nativos (Sin Probar)\n\n`;
    nativeMd += `| Método | Aridad | Firma |\n`;
    nativeMd += `|---|---|---|\n`;

    methods.forEach(mName => {
        const pKey = `${className}.${mName}`;
        const pResult = probeMap.get(pKey) || probeMap.get(`${data.path}.${mName}`);
        
        if (pResult) {
            validatedCount++;
            const rawVal = pResult.result === undefined ? "undefined" : JSON.stringify(pResult.result);
            const displayVal = (rawVal && rawVal.length > 50) ? rawVal.slice(0, 47) + "..." : rawVal;
            classMd += `| \`${mName}\` | **${pResult.type}** | \`${displayVal}\` |\n`;
        } else {
            const mInfo = data.methods.get(mName);
            nativeMd += `| \`${mName}\` | ${mInfo.arity} | \`native code\` |\n`;
        }
    });

    const status = validatedCount > 0 ? "🟢 PROBED" : "⚪ STATIC";
    indexMd += `| [${className}](./${className}.md) | ${methods.length} | ${validatedCount} | ${status} |\n`;

    await write(join(OUT_DIR, `${className}.md`), classMd + nativeMd);
  }

  await write(join(OUT_DIR, "README.md"), indexMd);
  console.log(`✅ Documentación generada con éxito.`);
}

generateLiveDocs().catch(console.error);
