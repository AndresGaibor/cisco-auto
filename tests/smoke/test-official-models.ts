#!/usr/bin/env bun

import { FileBridgeV2 } from "../../packages/file-bridge/src/file-bridge-v2.js";
import { getSmokePtDevDir } from "./smoke-paths.js";

const PT_DEV_DIR = getSmokePtDevDir();

const tests = [
  { model: '3560-24PS', type: 16 },
  { model: '3650-24PS', type: 16 },
  { model: 'AccessPoint-PT', type: 7 },
  { model: 'AccessPoint-PT-A', type: 7 },
  { model: 'AccessPoint-PT-AC', type: 7 },
  { model: 'AccessPoint-PT-N', type: 7 },
  { model: 'Linksys-WRT300N', type: 11 },
  { model: 'Cloud-PT', type: 2 },
  { model: 'Printer-PT', type: 10 },
  { model: 'Laptop-PT', type: 18 },
  { model: 'PC-PT', type: 8 },
  { model: 'Server-PT', type: 9 },
];

async function main() {
  const bridge = new FileBridgeV2({ root: PT_DEV_DIR, consumerId: 'official-model-tester', maxPendingCommands: 5 });
  bridge.start();
  await new Promise(r => setTimeout(r, 1000));

  for (const t of tests) {
    process.stdout.write(`${t.model} (type ${t.type})... `);
    try {
      const res = await bridge.sendCommandAndWait('addDevice', {
        model: t.model,
        deviceType: t.type,
        name: `T_${t.model.replace(/[^a-zA-Z0-9]/g,'_')}`,
        x: 100,
        y: 100,
      }, 5000);
      console.log(res.ok ? '✅' : `❌ ${res.error?.message ?? 'unknown'}`);
      if (res.ok) {
        await bridge.sendCommandAndWait('removeDevice', { name: `T_${t.model.replace(/[^a-zA-Z0-9]/g,'_')}` }, 3000);
      }
    } catch (e) {
      console.log(`❌ ${(e as Error).message}`);
    }
  }

  bridge.stop();
}

main().catch(console.error);
