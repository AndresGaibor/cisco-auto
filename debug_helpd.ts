import { createDefaultPTController } from "@cisco-auto/pt-control";
import { resolve } from "path";

async function run() {
  const controller = createDefaultPTController();
  await controller.start();
  console.log("Started, running helpd on PC3...");
  const t0 = Date.now();
  const res = await controller.execHost("PC3", "helpd", "host.exec", { timeoutMs: 15000 });
  console.log("Done in", Date.now() - t0, "ms");
  console.log(res);
  await controller.stop();
}

run().catch(console.error);
