#!/usr/bin/env bun
import { FileBridgeV2 } from "../../packages/file-bridge/src/file-bridge-v2.js";
import { getSmokePtDevDir } from "./smoke-paths.js";

const bridge = new FileBridgeV2({ root: getSmokePtDevDir(), consumerId: "smoke-wireless" });
bridge.start();
await new Promise(r => setTimeout(r, 1000));
for (const model of ["Linksys-WRT300N", "AccessPoint-PT"]) {
  const res = await bridge.sendCommandAndWait("addDevice", { model, name: `S_${model.replace(/[^a-zA-Z0-9]/g,'_')}`, x: 100, y: 100 }, 5000);
  console.log(model, res.ok, res.error?.message || "");
  if (res.ok) await bridge.sendCommandAndWait("removeDevice", { name: `S_${model.replace(/[^a-zA-Z0-9]/g,'_')}` }, 3000);
}
bridge.stop();
