import { file, write } from "bun";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

async function generateDocs() {
  const jsonPath = join(process.cwd(), "docs", "pt-script-result.json");
  const outDir = join(process.cwd(), "packages", "pt-runtime", "docs", "api-reference");
  
  const rawText = await file(jsonPath).text();
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  const data = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
  
  await mkdir(outDir, { recursive: true });
  
  let indexMd = `# API Reference - Cisco Packet Tracer (Raw Dump)\n\n`;
  indexMd += `> Extracción completa sin filtros de 14MB de la API interna.\n\n`;
  indexMd += `## Objetos Globales\n`;
  
  for (const glob of data.globals || []) {
    const safeName = glob.name.replace(/[^a-zA-Z0-9_-]/g, "_");
    const docPath = `global_${safeName}.md`;
    indexMd += `- [${glob.name}](./${docPath})\n`;
    
    let md = `# Global API: ${glob.name}\n\n`;
    md += `- **Type:** ${glob.type}\n`;
    if (glob.className) md += `- **ClassName:** ${glob.className}\n`;
    if (glob.signature) md += `- **Signature:** \`${glob.signature.replace(/\n/g, " ")}\`\n`;
    
    if (glob.keys && glob.keys.length > 0) {
      md += `\n## Keys / Properties\n\n`;
      md += glob.keys.map(k => `- \`${k}\``).join("\n");
      md += `\n`;
    } else {
      md += `\n*No keys or enumerable properties detected.*\n`;
    }
    
    await write(join(outDir, docPath), md);
  }
  
  indexMd += `\n## Device Classes (Component APIs)\n`;
  
  const classMap = new Map();
  for (const dev of data.devices || []) {
    if (!dev.className) continue;
    const existing = classMap.get(dev.className);
    const existingCount = existing?.methods ? existing.methods.length : 0;
    const newCount = dev.methods ? dev.methods.length : 0;
    if (newCount > existingCount) {
      classMap.set(dev.className, dev);
    }
  }
  
  for (const [className, dev] of classMap.entries()) {
    const docPath = `class_${className}.md`;
    const methodsCount = dev.methods ? dev.methods.length : 0;
    indexMd += `- [${className}](./${docPath}) (${methodsCount} methods)\n`;
    
    let md = `# Class API: ${className}\n\n`;
    md += `- **Sample Label:** ${dev.label || 'N/A'}\n`;
    md += `- **Total Methods:** ${methodsCount}\n\n`;
    
    md += `## Full Methods List\n\n`;
    if (methodsCount > 0) {
      md += `| Name | Arity | Signature |\n`;
      md += `|---|---|---|\n`;
      const uniqueMethods = Array.from(new Map(dev.methods.map(m => [m.name, m])).values());
      uniqueMethods.sort((a, b) => a.name.localeCompare(b.name)).forEach(m => {
        md += `| \`${m.name}\` | ${m.arity ?? '-'} | \`${(m.signature || "").replace(/\n/g, " ").replace(/\|/g, "\\|")}\` |\n`;
      });
    } else {
      md += `*No methods detected.*\n`;
    }
    
    await write(join(outDir, docPath), md);
  }
  
  await write(join(outDir, "README.md"), indexMd);
  console.log(`Documentación actualizada.`);
}

generateDocs().catch(console.error);