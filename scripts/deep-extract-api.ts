import { file, write } from "bun";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

async function deepExtract() {
  const jsonPath = join(process.cwd(), "docs", "pt-script-result.json");
  const outDir = join(process.cwd(), "packages", "pt-runtime", "docs", "api-reference");
  
  const rawText = await file(jsonPath).text();
  const data = JSON.parse(rawText.substring(rawText.indexOf("{"), rawText.lastIndexOf("}") + 1));
  
  const apiMap = new Map();

  function registerItem(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (!obj.className && !obj.name) return;
    
    const name = obj.className || obj.name;
    if (!apiMap.has(name)) {
      apiMap.set(name, {
        methods: new Map(),
        properties: new Set(),
        samplePath: obj.path || 'unknown'
      });
    }
    
    const entry = apiMap.get(name);
    
    if (obj.methods) {
      obj.methods.forEach(m => {
        if (!entry.methods.has(m.name)) {
          entry.methods.set(m.name, m);
        }
      });
    }
    
    if (obj.keys) {
      obj.keys.forEach(k => entry.properties.add(k));
    }
    
    // Recorrer anidación de forma robusta
    const iterate = (items) => {
      if (!items) return;
      if (Array.isArray(items)) {
        items.forEach(i => registerItem(i));
      } else if (typeof items === 'object') {
        Object.values(items).forEach(i => registerItem(i));
      }
    };

    iterate(obj.ports);
    iterate(obj.modules);
    iterate(obj.processes);
    iterate(obj.slots);
  }

  // Escanear todas las secciones
  (data.globals || []).forEach(g => registerItem(g));
  (data.surfaces || []).forEach(s => registerItem(s));
  (data.devices || []).forEach(d => registerItem(d));
  (data.objects || []).forEach(o => registerItem(o));
  if (data.objectsInspected) data.objectsInspected.forEach(o => registerItem(o));

  await mkdir(outDir, { recursive: true });
  
  let indexMd = `# Referencia TOTAL de la API de Packet Tracer (Deep Extraction)\n\n`;
  indexMd += `> Este documento contiene TODOS los métodos detectados en el dump de 14MB.\n\n`;
  
  const sortedClasses = Array.from(apiMap.keys()).sort();
  
  for (const className of sortedClasses) {
    const data = apiMap.get(className);
    const methods = Array.from(data.methods.values()).sort((a, b) => a.name.localeCompare(b.name));
    const properties = Array.from(data.properties).sort();
    
    // Solo generar archivo si hay métodos o propiedades reales
    if (methods.length === 0 && properties.length === 0) continue;

    const safeName = className.replace(/[^a-zA-Z0-9_-]/g, "_");
    const docPath = `full_${safeName}.md`;
    indexMd += `- [${className}](./${docPath}) (${methods.length} métodos, ${properties.length} props)\n`;
    
    let md = `# Clase: ${className}\n\n`;
    md += `- **Vía de acceso de muestra:** \`${data.samplePath}\`\n`;
    md += `- **Total de métodos únicos:** ${methods.length}\n`;
    md += `- **Total de propiedades únicas:** ${properties.length}\n\n`;
    
    if (properties.length > 0) {
      md += `## Propiedades / Keys\n\n`;
      md += properties.map(p => `- \`${p}\``).join("\n") + "\n\n";
    }
    
    if (methods.length > 0) {
      md += `## Métodos Detallados\n\n`;
      md += `| Método | Aridad | Firma |\n`;
      md += `|---|---|---|\n`;
      md += methods.map(m => `| \`${m.name}\` | ${m.arity ?? 0} | \`${(m.signature || "").replace(/\n/g, " ").replace(/\|/g, "\\|")}\` |`).join("\n");
    }
    
    await write(join(outDir, docPath), md);
  }
  
  await write(join(outDir, "README.md"), indexMd);
  console.log(`Deep extraction completa: ${apiMap.size} clases analizadas.`);
}

deepExtract().catch(console.error);