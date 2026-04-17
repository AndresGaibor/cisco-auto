import { file } from "bun";
import { join } from "node:path";

async function run() {
  const jsonPath = join(process.cwd(), "docs", "pt-script-result.json");
  const text = await file(jsonPath).text();
  const data = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
  const router = data.devices.find(d => d.className === "Router");
  console.log("Total métodos listados en Router:", router.methods.length);
  const unique = new Set(router.methods.map(m => m.name));
  console.log("Total métodos únicos en Router:", unique.size);
}
run().catch(console.error);