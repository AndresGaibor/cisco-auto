#!/usr/bin/env bun

/**
 * TEST EXHAUSTIVO - Todas las funcionalidades de PT Control V2
 * Nueva arquitectura simplificada con file-bridge
 */

import { FileBridgeV2 } from "./packages/file-bridge/src/file-bridge-v2.js";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const PT_DEV_DIR = "/Users/andresgaibor/pt-dev";

async function testAllFunctionalities() {
  console.log("🚀 TESTING ALL PT CONTROL V2 FUNCTIONALITIES");
  console.log("=" .repeat(60));
  console.log();

  const bridge = new FileBridgeV2({
    root: PT_DEV_DIR,
    consumerId: "exhaustive-test",
    autoSnapshotIntervalMs: 2000,  // Cada 2s para test más activo
    heartbeatIntervalMs: 1000,     // Cada 1s para monitoreo activo
    maxPendingCommands: 20,
  });

  let testsPassed = 0;
  let testsFailed = 0;
  const results: string[] = [];

  function logTest(name: string, success: boolean, details?: string) {
    const status = success ? "✅ PASS" : "❌ FAIL";
    const message = `${status} ${name}${details ? ` - ${details}` : ""}`;
    console.log(message);
    results.push(message);
    if (success) testsPassed++;
    else testsFailed++;
  }

  // Event listeners para monitorear todos los eventos
  const events: any[] = [];
  bridge.on("*", (event) => {
    events.push(event);
  });

  try {
    // ============================================================================
    // 1. INFRASTRUCTURE TESTS
    // ============================================================================
    console.log("📋 1. INFRASTRUCTURE TESTS");
    console.log("-".repeat(40));

    console.log("1.1 Starting bridge...");
    bridge.start();
    logTest("Bridge startup", bridge.isReady(), "Bridge should acquire lease and be ready");

    console.log("1.2 Starting monitoring...");
    bridge.startAutoSnapshot();
    bridge.startHeartbeatMonitoring();
    logTest("Auto-monitoring startup", true, "Auto-snapshot and heartbeat monitoring started");

    console.log("1.3 Checking PT files...");
    const mainJsExists = existsSync(join(PT_DEV_DIR, "main.js"));
    const runtimeJsExists = existsSync(join(PT_DEV_DIR, "runtime.js"));
    logTest("PT files exist", mainJsExists && runtimeJsExists, `main.js: ${mainJsExists}, runtime.js: ${runtimeJsExists}`);

    // ============================================================================
    // 2. BASIC COMMAND TESTS
    // ============================================================================
    console.log("\n📋 2. BASIC COMMAND TESTS");
    console.log("-".repeat(40));

    console.log("2.1 Testing snapshot command...");
    try {
      const result = await bridge.sendCommandAndWait("snapshot", {}, 10000);
      const success = result.ok && result.value && typeof result.value === 'object';
      logTest("Snapshot command", !!success, success ? "Returns valid snapshot object" : (result.error?.message || "Unknown error"));
    } catch (error) {
      logTest("Snapshot command", false, (error as Error).message);
    }

    console.log("2.2 Testing listDevices command...");
    try {
      const result = await bridge.sendCommandAndWait("listDevices", {}, 10000);
      const success = result.ok && Array.isArray(result.value);
      logTest("ListDevices command", success, success ? `Found ${(result.value as any[]).length} devices` : result.error?.message);
    } catch (error) {
      logTest("ListDevices command", false, (error as Error).message);
    }

    // ============================================================================
    // 3. DEVICE MANAGEMENT TESTS
    // ============================================================================
    console.log("\n📋 3. DEVICE MANAGEMENT TESTS");
    console.log("-".repeat(40));

    console.log("3.1 Adding a router...");
    try {
      const result = await bridge.sendCommandAndWait("addDevice", {
        model: "2811"  // Solo modelo, el handler resolverá deviceType automáticamente
      }, 10000);
      const success = result.ok;
      logTest("Add router", success, success ? `Router added: ${JSON.stringify(result.value)}` : (result.error?.message || "Unknown error"));
    } catch (error) {
      logTest("Add router", false, (error as Error).message);
    }

    console.log("3.2 Adding a switch...");
    try {
      const result = await bridge.sendCommandAndWait("addDevice", {
        model: "2960"  // Solo modelo, el handler resolverá deviceType automáticamente
      }, 10000);
      const success = result.ok;
      logTest("Add switch", success, success ? `Switch added: ${JSON.stringify(result.value)}` : (result.error?.message || "Unknown error"));
    } catch (error) {
      logTest("Add switch", false, (error as Error).message);
    }

    console.log("3.3 Checking devices after additions...");
    try {
      const result = await bridge.sendCommandAndWait("listDevices", {}, 10000);
      const success = result.ok && Array.isArray(result.value) && (result.value as any[]).length >= 2;
      logTest("Device count after additions", success, success ? `Found ${(result.value as any[]).length} devices` : "Expected at least 2 devices");
    } catch (error) {
      logTest("Device count after additions", false, (error as Error).message);
    }

    // ============================================================================
    // 4. LINK MANAGEMENT TESTS
    // ============================================================================
    console.log("\n📋 4. LINK MANAGEMENT TESTS");
    console.log("-".repeat(40));

    // Primero obtener la lista de dispositivos para hacer el link
    let deviceNames: string[] = [];
    try {
      const devicesResult = await bridge.sendCommandAndWait("listDevices", {}, 10000);
      if (devicesResult.ok && Array.isArray(devicesResult.value)) {
        deviceNames = (devicesResult.value as any[]).map(d => d.name || d.deviceName).filter(Boolean);
      }
    } catch (e) {
      // Continue with empty list
    }

    if (deviceNames.length >= 2) {
      console.log(`4.1 Adding link between ${deviceNames[0]} and ${deviceNames[1]}...`);
      try {
        const result = await bridge.sendCommandAndWait("addLink", {
          device1: deviceNames[0],
          port1: "FastEthernet0/0",
          device2: deviceNames[1], 
          port2: "FastEthernet0/1",
          cableType: "Copper Straight-Through"
        }, 10000);
        const success = result.ok;
        logTest("Add link", success, success ? "Link created successfully" : result.error?.message);
      } catch (error) {
        logTest("Add link", false, (error as Error).message);
      }
    } else {
      logTest("Add link", false, "Not enough devices to create link");
    }

    // ============================================================================
    // 5. CONFIGURATION TESTS
    // ============================================================================
    console.log("\n📋 5. CONFIGURATION TESTS");
    console.log("-".repeat(40));

    if (deviceNames.length >= 1) {
      console.log(`5.1 Configuring hostname on ${deviceNames[0]}...`);
      try {
        const result = await bridge.sendCommandAndWait("configIos", {
          deviceName: deviceNames[0],
          commands: ["hostname TestRouter"]
        }, 10000);
        const success = result.ok;
        logTest("Configure hostname", success, success ? "Hostname configured" : result.error?.message);
      } catch (error) {
        logTest("Configure hostname", false, (error as Error).message);
      }

      console.log(`5.2 Executing show version on ${deviceNames[0]}...`);
      try {
        const result = await bridge.sendCommandAndWait("execIos", {
          deviceName: deviceNames[0],
          command: "show version"
        }, 10000);
        const success = result.ok && result.value && typeof result.value === 'object';
        logTest("Execute show version", !!success, success ? "Command executed successfully" : (result.error?.message || "Unknown error"));
      } catch (error) {
        logTest("Execute show version", false, (error as Error).message);
      }
    } else {
      logTest("Configure hostname", false, "No devices available for configuration");
      logTest("Execute show version", false, "No devices available for configuration");
    }

    // ============================================================================
    // 6. ADVANCED COMMAND TESTS
    // ============================================================================
    console.log("\n📋 6. ADVANCED COMMAND TESTS");
    console.log("-".repeat(40));

    console.log("6.1 Testing inspect command...");
    try {
      const result = await bridge.sendCommandAndWait("inspect", {}, 10000);
      const success = result.ok;
      logTest("Inspect command", success, success ? "Inspection completed" : result.error?.message);
    } catch (error) {
      logTest("Inspect command", false, (error as Error).message);
    }

    console.log("6.2 Testing hardware info command...");
    try {
      const result = await bridge.sendCommandAndWait("hardwareInfo", {}, 10000);
      const success = result.ok;
      logTest("Hardware info", success, success ? "Hardware info retrieved" : result.error?.message);
    } catch (error) {
      logTest("Hardware info", false, (error as Error).message);
    }

    // ============================================================================
    // 7. MONITORING & EVENTS TESTS
    // ============================================================================
    console.log("\n📋 7. MONITORING & EVENTS TESTS");
    console.log("-".repeat(40));

    console.log("7.1 Monitoring events for 5 seconds...");
    const eventsBefore = events.length;
    await new Promise(resolve => setTimeout(resolve, 5000));
    const eventsAfter = events.length;
    const eventsGenerated = eventsAfter - eventsBefore;
    logTest("Event generation", eventsGenerated > 0, `Generated ${eventsGenerated} events in 5 seconds`);

    console.log("7.2 Checking heartbeat...");
    const heartbeatFile = join(PT_DEV_DIR, "heartbeat.json");
    let heartbeatValid = false;
    if (existsSync(heartbeatFile)) {
      try {
        const heartbeat = JSON.parse(readFileSync(heartbeatFile, "utf8"));
        const age = Date.now() - heartbeat.ts;
        heartbeatValid = age < 10000; // Less than 10 seconds old
        logTest("Heartbeat freshness", heartbeatValid, `Heartbeat age: ${age}ms`);
      } catch {
        logTest("Heartbeat freshness", false, "Invalid heartbeat JSON");
      }
    } else {
      logTest("Heartbeat freshness", false, "Heartbeat file not found");
    }

    console.log("7.3 Checking auto-snapshot events...");
    const snapshotEvents = events.filter(e => e.type === 'topology-initial' || e.type === 'topology-changed');
    logTest("Auto-snapshot events", snapshotEvents.length > 0, `Found ${snapshotEvents.length} snapshot events`);

    // ============================================================================
    // 8. STRESS TESTS
    // ============================================================================
    console.log("\n📋 8. STRESS TESTS");
    console.log("-".repeat(40));

    console.log("8.1 Rapid command execution (5 snapshots)...");
    let rapidCommandsSuccess = 0;
    for (let i = 0; i < 5; i++) {
      try {
        const result = await bridge.sendCommandAndWait("snapshot", {}, 5000);
        if (result.ok) rapidCommandsSuccess++;
      } catch (e) {
        // Continue
      }
    }
    logTest("Rapid commands", rapidCommandsSuccess >= 3, `${rapidCommandsSuccess}/5 commands succeeded`);

    console.log("8.2 Testing backpressure stats...");
    const stats = bridge.getBackpressureStats();
    const validStats = stats && typeof stats.currentPending === 'number';
    logTest("Backpressure stats", !!validStats, validStats ? `Pending: ${stats.currentPending}/${stats.maxPending}` : "Invalid stats");

    // ============================================================================
    // 9. DIAGNOSTICS TESTS
    // ============================================================================
    console.log("\n📋 9. DIAGNOSTICS TESTS");
    console.log("-".repeat(40));

    console.log("9.1 Bridge diagnostics...");
    const diagnostics = bridge.diagnostics();
    const diagSuccess = diagnostics && diagnostics.status && diagnostics.lease;
    logTest("Bridge diagnostics", !!diagSuccess, diagSuccess ? `Status: ${diagnostics.status}` : "Invalid diagnostics");

    console.log("9.2 Garbage collection...");
    const gcResult = bridge.gc();
    const gcSuccess = gcResult && typeof gcResult.deletedResults === 'number';
    logTest("Garbage collection", gcSuccess, gcSuccess ? `Deleted ${gcResult.deletedResults} results, ${gcResult.deletedLogs} logs` : "GC failed");

    // ============================================================================
    // 10. FINAL SNAPSHOT TEST
    // ============================================================================
    console.log("\n📋 10. FINAL STATE VERIFICATION");
    console.log("-".repeat(40));

    console.log("10.1 Final snapshot comparison...");
    try {
      const finalSnapshot = await bridge.sendCommandAndWait("snapshot", {}, 10000);
      if (finalSnapshot.ok && finalSnapshot.value) {
        const snapshot = finalSnapshot.value as any;
        const deviceCount = Object.keys(snapshot.devices || {}).length;
        const linkCount = Object.keys(snapshot.links || {}).length;
        logTest("Final state", true, `Final topology: ${deviceCount} devices, ${linkCount} links`);
      } else {
        logTest("Final state", false, "Could not get final snapshot");
      }
    } catch (error) {
      logTest("Final state", false, (error as Error).message);
    }

  } finally {
    // ============================================================================
    // CLEANUP
    // ============================================================================
    console.log("\n📋 CLEANUP");
    console.log("-".repeat(40));
    
    console.log("Stopping monitoring and bridge...");
    bridge.stopMonitoring();
    await bridge.stop();
    logTest("Cleanup", true, "Bridge stopped successfully");
  }

  // ============================================================================
  // RESULTS SUMMARY
  // ============================================================================
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(60));
  console.log();
  
  results.forEach(result => console.log(result));
  
  console.log();
  console.log(`📈 STATISTICS:`);
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📊 Success Rate: ${Math.round(testsPassed / (testsPassed + testsFailed) * 100)}%`);
  console.log(`   🎯 Events Generated: ${events.length}`);
  
  if (testsFailed === 0) {
    console.log("\n🎉 ALL TESTS PASSED! PT Control V2 is fully functional!");
  } else if (testsPassed > testsFailed) {
    console.log("\n✅ MOSTLY SUCCESSFUL! Most functionalities working correctly.");
  } else {
    console.log("\n⚠️  SOME ISSUES FOUND. Please review failed tests.");
  }
  
  // Save detailed results
  const reportPath = join(PT_DEV_DIR, "test-report.json");
  writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    testsPassed,
    testsFailed,
    successRate: Math.round(testsPassed / (testsPassed + testsFailed) * 100),
    eventsGenerated: events.length,
    results: results,
    events: events.slice(-10) // Last 10 events
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
}

testAllFunctionalities().catch(console.error);