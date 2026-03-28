#!/usr/bin/env bun

/**
 * Demo Script - Create a simple network in PT
 */

import { writeFileSync, readFileSync, existsSync } from "fs";

const DEV_DIR = `${process.env.HOME ?? "/Users/andresgaibor"}/pt-dev`;
const COMMAND_FILE = `${DEV_DIR}/command.json`;
const EVENTS_FILE = `${DEV_DIR}/events.ndjson`;

type PTEvent = { type: string; id?: string; ok?: boolean; value?: any };

function writeCommand(payload: any) {
  const command = {
    id: `cmd_${Date.now()}`,
    ts: Date.now(),
    payload,
  };
  
  console.log(`📤 Sending: ${payload.kind}...`);
  writeFileSync(COMMAND_FILE, JSON.stringify(command, null, 2));
  return command.id;
}

async function waitForResult(cmdId: string, timeoutMs = 10000): Promise<PTEvent> {
  const startTime = Date.now();
  let lastPos = 0;
  
  if (existsSync(EVENTS_FILE)) {
    const content = readFileSync(EVENTS_FILE, "utf-8");
    lastPos = content.length;
  }
  
  while (Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (!existsSync(EVENTS_FILE)) continue;
    
    const content = readFileSync(EVENTS_FILE, "utf-8");
    const newContent = content.slice(lastPos);
    
    if (!newContent.trim()) continue;
    
    lastPos = content.length;
    
    const lines = newContent.trim().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const event = JSON.parse(line);
        
        if (event.type === "result" && event.id === cmdId) {
          return event;
        }
        
        if (event.type === "error" && event.id === cmdId) {
          throw new Error(event.message);
        }
        
        // Show other events
        if (event.type === "log") {
          console.log(`   [PT] ${event.message}`);
        }
      } catch (err) {
        // Ignore parse errors
      }
    }
  }
  
  throw new Error(`Timeout waiting for result ${cmdId}`);
}

async function removeIfExists(name: string, devices: any[]) {
  if (!Array.isArray(devices)) return;
  const matches = devices.filter((d) => d && d.name === name).length;
  if (!matches) return;
  console.log(`   • Removing ${matches} instance(s) of ${name}`);
  for (let i = 0; i < matches; i++) {
    const id = writeCommand({ kind: "removeDevice", name });
    try {
      await waitForResult(id, 5000);
    } catch (err) {
      console.warn(`     (warn) Could not remove ${name}:`, err);
      break;
    }
  }
}

async function main() {
  console.log("🚀 Creating simple network in Packet Tracer...\n");
  
  try {
    // Step 1: Check initial state
    console.log("Step 1: Getting initial snapshot");
    let id = writeCommand({ kind: "listDevices" });
    let result = await waitForResult(id);
    const currentDevices = result.value?.devices ?? [];
    console.log(`✅ Current devices: ${result.value?.count ?? currentDevices.length}`);
    if (currentDevices.length) {
      console.log("   Devices: " + currentDevices.map((d: any) => d.name).join(", "));
    }
    await removeIfExists("R1", currentDevices);
    await removeIfExists("S1", currentDevices);
    await removeIfExists("PC1", currentDevices);
    console.log();
    
    // Step 2: Add Router
    console.log("Step 2: Adding Router R1");
    id = writeCommand({
      kind: "addDevice",
      name: "R1",
      model: "2911",
      x: 100,
      y: 100,
    });
    result = await waitForResult(id);
    if (result.ok) {
      console.log(`✅ Router R1 created`);
    }
    console.log();
    
    // Step 3: Add Switch
    console.log("Step 3: Adding Switch S1");
    id = writeCommand({
      kind: "addDevice",
      name: "S1",
      model: "2960-24TT",
      x: 300,
      y: 100,
    });
    result = await waitForResult(id);
    if (result.ok) {
      console.log(`✅ Switch S1 created`);
    }
    console.log();
    
    // Step 4: Add PC
    console.log("Step 4: Adding PC1");
    id = writeCommand({
      kind: "addDevice",
      name: "PC1",
      model: "PC-PT",
      x: 500,
      y: 100,
    });
    result = await waitForResult(id);
    if (result.ok) {
      console.log(`✅ PC1 created`);
    }
    console.log();
    
    // Step 5: Create Link R1-S1
    console.log("Step 5: Connecting R1 to S1");
    id = writeCommand({
      kind: "addLink",
      dev1: "R1",
      port1: "GigabitEthernet0/0",
      dev2: "S1",
      port2: "GigabitEthernet0/1",
      cableType: "straight",
    });
    result = await waitForResult(id);
    if (result.ok) {
      console.log(`✅ Link created: R1 ←→ S1`);
    }
    console.log();
    
    // Step 6: Create Link S1-PC1
    console.log("Step 6: Connecting S1 to PC1");
    id = writeCommand({
      kind: "addLink",
      dev1: "S1",
      port1: "FastEthernet0/1",
      dev2: "PC1",
      port2: "FastEthernet0",
      cableType: "straight",
    });
    result = await waitForResult(id);
    if (result.ok) {
      console.log(`✅ Link created: S1 ←→ PC1`);
    }
    console.log();
    
    // Step 7: Configure PC1 IP
    console.log("Step 7: Configuring PC1 IP");
    id = writeCommand({
      kind: "configHost",
      device: "PC1",
      ip: "192.168.1.10",
      mask: "255.255.255.0",
      gateway: "192.168.1.1",
    });
    result = await waitForResult(id);
    if (result.ok) {
      console.log(`✅ PC1 configured: 192.168.1.10/24`);
    }
    console.log();
    
    // Step 8: Configure Router
    console.log("Step 8: Configuring Router R1");
    id = writeCommand({
      kind: "configIos",
      device: "R1",
      commands: [
        "conf t",
        "hostname R1",
        "int g0/0",
        "ip address 192.168.1.1 255.255.255.0",
        "no shut",
        "end",
      ],
    });
    result = await waitForResult(id);
    if (result.ok) {
      console.log(`✅ R1 configured`);
    }
    console.log();
    
    // Step 9: Final snapshot
    console.log("Step 9: Getting final snapshot");
    id = writeCommand({ kind: "snapshot" });
    result = await waitForResult(id);
    if (result.ok && result.value.snapshot) {
      const snap = result.value.snapshot;
      console.log(`✅ Snapshot complete:`);
      console.log(`   Devices: ${snap.deviceCount}`);
      console.log(`   Links: ${snap.linkCount ?? "N/A"}`);
      console.log();
      console.log("   Devices:");
      snap.devices.forEach((dev: any) => {
        console.log(`   - ${dev.name} (${dev.model}) [${dev.power ? "ON" : "OFF"}]`);
      });
    }
    console.log();
    
    console.log("🎉 Network created successfully!");
    console.log();
    console.log("Check Packet Tracer to see your network!");
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
