#!/usr/bin/env bun
import { FileBridgeV2 } from "./packages/file-bridge/src/file-bridge-v2.js";
const bridge = new FileBridgeV2({ root: "/Users/andresgaibor/pt-dev", consumerId: "smoke-official" });
bridge.start();
await new Promise(r => setTimeout(r, 1000));
for (const [model, type] of [["3560-24PS",16],["3650-24PS",16],["AccessPoint-PT",7],["Linksys-WRT300N",11],["Cloud-PT",2],["Printer-PT",10]]) {
  const name = `S_${String(model).replace(/[^a-zA-Z0-9]/g,'_')}`;
  const res = await bridge.sendCommandAndWait("addDevice", { model, deviceType: type, name, x: 100, y: 100 }, 5000);
  console.log(model, res.ok, res.error?.message || "");
  if (res.ok) await bridge.sendCommandAndWait("removeDevice", { name }, 3000);
}
bridge.stop();
