import { file } from "bun";
import { join } from "node:path";

async function inspect() {
  const jsonPath = join(process.cwd(), "docs", "pt-script-result.json");
  const rawText = await file(jsonPath).text();
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  const data = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
  
  for (const glob of data.globals || []) {
    console.log(`Global: ${glob.name}`);
    console.log(`- Type: ${glob.type}`);
    console.log(`- Has methods array: ${!!glob.methods}`);
    console.log(`- Keys: ${Object.keys(glob).join(", ")}`);
    console.log("---");
  }
}

inspect().catch(console.error);
