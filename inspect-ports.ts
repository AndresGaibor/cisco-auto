#!/usr/bin/env bun
import { FileBridgeV2 } from "./packages/file-bridge/src/file-bridge-v2.js";
const bridge = new FileBridgeV2({ root: "/Users/andresgaibor/pt-dev", consumerId: "inspect-ports" });
bridge.start();
await new Promise(r => setTimeout(r, 1000));
const devices = [
  { model: '2911', type: 0, name: 'R1' },
  { model: '2960-24TT', type: 1, name: 'SW1' },
  { model: '3560-24PS', type: 16, name: 'SW2' },
  { model: 'PC-PT', type: 8, name: 'PC1' },
  { model: 'Server-PT', type: 9, name: 'SRV1' },
];
for (const d of devices) {
  const res = await bridge.sendCommandAndWait('inspect', { device: d.name }, 5000);
  console.log('\n', d.name, d.model, res.ok);
  if (res.ok) console.log(JSON.stringify((res.value as any).ports, null, 2));
}
bridge.stop();
