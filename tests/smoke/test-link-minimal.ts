#!/usr/bin/env bun
/**
 * Test mínimo para verificar lw.createLink directamente en PT.
 * Solo crea 2 routers y un enlace para aislar el problema.
 */

import { FileBridgeV2 } from "../../packages/file-bridge/src/file-bridge-v2.js";
import { getSmokePtDevDir } from "./smoke-paths.js";

const PT_DEV_DIR = getSmokePtDevDir();

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const bridge = new FileBridgeV2({
    root: PT_DEV_DIR,
    consumerId: "minimal-link-test",
    autoSnapshotIntervalMs: 0,
    heartbeatIntervalMs: 0,
    maxPendingCommands: 10,
  });

  bridge.start();
  await sleep(1000);

  try {
    console.log("=== LIMPIEZA ===");
    const clear = await bridge.sendCommandAndWait("clearTopology", {}, 15000);
    console.log("clearTopology:", JSON.stringify(clear.value, null, 2));
    await sleep(2000);

    console.log("\n=== SNAPSHOT INICIAL ===");
    const snap1 = await bridge.sendCommandAndWait("snapshot", {}, 15000);
    const devs1 = Object.keys((snap1.value as any)?.devices || {});
    const links1 = Object.keys((snap1.value as any)?.links || {});
    console.log("Devices:", devs1.length, devs1);
    console.log("Links:", links1.length, links1);

    console.log("\n=== CREAR ROUTER1 ===");
    const r1 = await bridge.sendCommandAndWait("addDevice", {
      model: "2811",
      deviceType: 0,
      name: "R1",
      x: 100,
      y: 100,
    }, 30000);
    console.log("R1 result:", r1.ok ? "OK" : "FAIL", JSON.stringify(r1.value, null, 2));
    await sleep(1000);

    console.log("\n=== CREAR ROUTER2 ===");
    const r2 = await bridge.sendCommandAndWait("addDevice", {
      model: "2811",
      deviceType: 0,
      name: "R2",
      x: 300,
      y: 100,
    }, 30000);
    console.log("R2 result:", r2.ok ? "OK" : "FAIL", JSON.stringify(r2.value, null, 2));
    await sleep(2000);

    console.log("\n=== SNAPSHOT PRE-LINK ===");
    const snap2 = await bridge.sendCommandAndWait("snapshot", {}, 15000);
    const devs2 = Object.keys((snap2.value as any)?.devices || {});
    console.log("Devices:", devs2);

    console.log("\n=== CREAR LINK R1-FA0/0 <-> R2-FA0/0 ===");
    const link = await bridge.sendCommandAndWait("addLink", {
      device1: "R1",
      port1: "FastEthernet0/0",
      device2: "R2",
      port2: "FastEthernet0/0",
      linkType: "auto",
    }, 15000);
    console.log("Link result:", JSON.stringify(link, null, 2));

    console.log("\n=== SNAPSHOT FINAL ===");
    const snap3 = await bridge.sendCommandAndWait("snapshot", {}, 15000);
    const devs3 = Object.keys((snap3.value as any)?.devices || {});
    const links3 = Object.keys((snap3.value as any)?.links || {});
    console.log("Devices:", devs3);
    console.log("Links:", links3);
    if (links3.length > 0) {
      console.log("Link details:", JSON.stringify((snap3.value as any)?.links, null, 2));
    }

  } finally {
    await bridge.stop();
  }
}

main().catch(console.error);
