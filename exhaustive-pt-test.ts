#!/usr/bin/env bun

/**
 * 🏆 PLAN EXHAUSTIVO DE PRUEBAS - PT CONTROL V2
 * Verificación completa de todas las funcionalidades en arquitectura simplificada
 * 
 * Usa modelos verificados desde verified-models.ts (fuente de verdad tipada)
 */

import { FileBridgeV2 } from "./packages/file-bridge/src/file-bridge-v2.js";
import { join } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getPTDeviceType } from "./packages/pt-runtime/src/ptbuilder-spec.ts";

const PT_DEV_DIR = "/Users/andresgaibor/pt-dev";

interface TestResult {
  name: string;
  phase: string;
  success: boolean;
  duration: number;
  details?: string;
  error?: string;
  data?: any;
}

interface PhaseStats {
  total: number;
  passed: number;
  failed: number;
  successRate: number;
}

class ExhaustivePTTester {
  private bridge: FileBridgeV2;
  private results: TestResult[] = [];
  private events: any[] = [];
  private startTime: number = 0;
  private devices: string[] = [];
  private links: string[] = [];
  private runId: string = `r${Date.now().toString(36)}`;

  private n(name: string): string { return `${name}_${this.runId}`; }

  constructor() {
    this.bridge = new FileBridgeV2({
      root: PT_DEV_DIR,
      consumerId: "exhaustive-tester",
      autoSnapshotIntervalMs: 3000,
      heartbeatIntervalMs: 1500,
      maxPendingCommands: 50,
    });

    // Monitor events
    this.bridge.on("*", (event) => {
      this.events.push({
        ...event,
        timestamp: Date.now(),
      });
    });
  }

  private async runTest(name: string, phase: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 ${phase} - ${name}...`);
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      const testResult: TestResult = {
        name,
        phase,
        success: true,
        duration,
        details: "✅ Success",
        data: result,
      };
      
      this.results.push(testResult);
      console.log(`   ✅ ${name} - ${duration}ms`);
      return testResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const testResult: TestResult = {
        name,
        phase,
        success: false,
        duration,
        error: (error as Error).message,
        details: `❌ Error: ${(error as Error).message}`,
      };
      
      this.results.push(testResult);
      console.log(`   ❌ ${name} - ${(error as Error).message} (${duration}ms)`);
      return testResult;
    }
  }

  private async waitBetweenTests(ms: number = 1000) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  // ============================================================================
  // FASE 1: INFRAESTRUCTURA BÁSICA
  // ============================================================================
  
  async runPhase1(): Promise<void> {
    console.log("\n🏗️ FASE 1: INFRAESTRUCTURA BÁSICA");
    console.log("=" .repeat(50));

    await this.runTest("Bridge startup", "PHASE-1", async () => {
      this.bridge.start();
      if (!this.bridge.isReady()) {
        throw new Error("Bridge not ready - lease not acquired");
      }
      return { ready: true };
    });

    await this.runTest("Auto-monitoring startup", "PHASE-1", async () => {
      this.bridge.startAutoSnapshot();
      this.bridge.startHeartbeatMonitoring();
      return { autoSnapshot: true, heartbeat: true };
    });

    await this.runTest("PT files verification", "PHASE-1", async () => {
      const mainExists = existsSync(join(PT_DEV_DIR, "main.js"));
      const runtimeExists = existsSync(join(PT_DEV_DIR, "runtime.js"));
      
      if (!mainExists || !runtimeExists) {
        throw new Error(`Missing files: main.js=${mainExists}, runtime.js=${runtimeExists}`);
      }
      
      return { mainJs: mainExists, runtimeJs: runtimeExists };
    });

    await this.runTest("Basic snapshot", "PHASE-1", async () => {
      const result = await this.bridge.sendCommandAndWait("snapshot", {}, 15000);
      if (!result.ok) {
        throw new Error(result.error?.message || "Snapshot failed");
      }
      return result.value;
    });

    await this.runTest("Hardware info", "PHASE-1", async () => {
      const result = await this.bridge.sendCommandAndWait("hardwareInfo", {}, 15000);
      if (!result.ok) {
        throw new Error(result.error?.message || "Hardware info failed");
      }
      return result.value;
    });

    await this.waitBetweenTests(2000); // Let events generate
  }

  // ============================================================================
  // FASE 2: GESTIÓN DE DISPOSITIVOS
  // ============================================================================
  
  async runPhase2(): Promise<void> {
    console.log("\n⚙️ FASE 2: GESTIÓN DE DISPOSITIVOS");
    console.log("=" .repeat(50));

    const r1Name = this.n("R1");
    const r2Name = this.n("R2");
    const sw1Name = this.n("SW1");
    const sw2Name = this.n("SW2");
    const pc1Name = this.n("PC1");
    const srv1Name = this.n("SRV1");
    const wr1Name = this.n("WR1");

    // 2.1 - Routers
    await this.runTest("Add Router 2811", "PHASE-2", async () => {
      const result = await this.bridge.sendCommandAndWait("addDevice", {
        model: "2811",
        deviceType: getPTDeviceType("2811") as number,
        name: r1Name,
        x: 100,
        y: 100,
      }, 30000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to add router");
      }
      
      this.devices.push(r1Name);
      return result.value;
    });

    await this.waitBetweenTests(500);

    await this.runTest("Add Router 2911", "PHASE-2", async () => {
      const result = await this.bridge.sendCommandAndWait("addDevice", {
        model: "2911",
        deviceType: getPTDeviceType("2911") as number,
        name: r2Name, 
        x: 300,
        y: 100,
      }, 30000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to add router 2911");
      }
      
      this.devices.push(r2Name);
      return result.value;
    });

    // 2.2 - Switches (usando modelos verificados en verified-models.ts)
    await this.runTest("Add Switch 2960-24TT", "PHASE-2", async () => {
      const result = await this.bridge.sendCommandAndWait("addDevice", {
        model: "2960-24TT",  // ✅ Modelo verificado en PT 9.0.0
        deviceType: getPTDeviceType("2960-24TT") as number,
        name: sw1Name,
        x: 150,
        y: 250,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to add switch 2960-24TT");
      }
      
      this.devices.push(sw1Name);
      return result.value;
    });

    await this.runTest("Add Switch 3560-24PS", "PHASE-2", async () => {
      const result = await this.bridge.sendCommandAndWait("addDevice", {
        model: "3560-24PS",  // Modelo verificado en PT 9.0.0
        deviceType: getPTDeviceType("3560-24PS") as number,
        name: sw2Name, 
        x: 350,
        y: 250,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to add switch 3560-24PS");
      }
      
      this.devices.push(sw2Name);
      return result.value;
    });

    // 2.3 - End devices
    await this.runTest("Add PC", "PHASE-2", async () => {
      const result = await this.bridge.sendCommandAndWait("addDevice", {
        model: "PC-PT",
        deviceType: getPTDeviceType("PC-PT") as number,
        name: pc1Name,
        x: 50,
        y: 400,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to add PC");
      }
      
      this.devices.push(pc1Name);
      return result.value;
    });

    await this.runTest("Add Server", "PHASE-2", async () => {
      const result = await this.bridge.sendCommandAndWait("addDevice", {
        model: "Server-PT",
        deviceType: getPTDeviceType("Server-PT") as number,
        name: srv1Name,
        x: 250,
        y: 400,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to add server");
      }
      
      this.devices.push(srv1Name);
      return result.value;
    });

    // 2.4 - Wireless devices
    await this.runTest("Add Wireless Router", "PHASE-2", async () => {
      const result = await this.bridge.sendCommandAndWait("addDevice", {
        model: "Linksys-WRT300N",
        deviceType: getPTDeviceType("Linksys-WRT300N") as number,
        name: wr1Name,
        x: 450,
        y: 150,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to add wireless router");
      }
      
      this.devices.push(wr1Name);
      return result.value;
    });

    // 2.5 - Device operations
    await this.runTest("List all devices", "PHASE-2", async () => {
      const result = await this.bridge.sendCommandAndWait("listDevices", {}, 15000);
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to list devices");
      }
      
      // Verify we have devices
      const deviceList = result.value as any;
      if (!deviceList || !Array.isArray(deviceList.devices) || deviceList.devices.length < this.devices.length) {
        throw new Error(`Expected at least ${this.devices.length} devices, got ${deviceList?.devices?.length || 0}`);
      }
      
      return { 
        count: deviceList.devices.length,
        devices: deviceList.devices.map((d: any) => d.name),
      };
    });

    await this.runTest("Inspect device", "PHASE-2", async () => {
      const result = await this.bridge.sendCommandAndWait("inspect", { 
        device: r1Name 
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to inspect device");
      }
      
      return result.value;
    });

    await this.runTest("Move device", "PHASE-2", async () => {
      const result = await this.bridge.sendCommandAndWait("moveDevice", {
        name: r1Name,
        x: 120,
        y: 120,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to move device");
      }
      
      return result.value;
    });

    await this.runTest("Rename device", "PHASE-2", async () => {
      const router1Name = `${r1Name}_renamed`;
      const result = await this.bridge.sendCommandAndWait("renameDevice", {
        oldName: r1Name,
        newName: router1Name,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to rename device");
      }
      
      // Update our tracking
      const index = this.devices.indexOf(r1Name);
      if (index >= 0) {
        this.devices[index] = router1Name;
      }
      
      return result.value;
    });

    await this.waitBetweenTests(2000);
  }

  // ============================================================================
  // FASE 3: GESTIÓN DE ENLACES
  // ============================================================================
  
  async runPhase3(): Promise<void> {
    console.log("\n🔗 FASE 3: GESTIÓN DE ENLACES");
    console.log("=" .repeat(50));

    const r1Name = this.n("R1");
    const r2Name = this.n("R2");
    const sw1Name = this.n("SW1");
    const sw2Name = this.n("SW2");
    const pc1Name = this.n("PC1");
    const srv1Name = this.n("SRV1");
    const wr1Name = this.n("WR1");
    const router1Renamed = `${r1Name}_renamed`;

    await this.runTest("Link Router-Router (Ethernet)", "PHASE-3", async () => {
      const result = await this.bridge.sendCommandAndWait("addLink", {
        device1: router1Renamed,
        port1: "FastEthernet0/0", 
        device2: r2Name,
        port2: "GigabitEthernet0/0",
        linkType: "auto",
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to create router-router link");
      }

      // Configurar IPs en ambos routers para levantar el enlace
      const r1Config = await this.bridge.sendCommandAndWait("configIos", {
        device: router1Renamed,
        commands: [
          "interface FastEthernet0/0",
          "ip address 10.0.0.1 255.255.255.0",
          "no shutdown",
          "end",
        ],
        save: false,
      }, 15000);

      const r2Config = await this.bridge.sendCommandAndWait("configIos", {
        device: r2Name,
        commands: [
          "interface GigabitEthernet0/0",
          "ip address 10.0.0.2 255.255.255.0",
          "no shutdown",
          "end",
        ],
        save: false,
      }, 15000);

      if (!r1Config.ok || !r2Config.ok) {
        throw new Error("Failed to configure router-router IPs");
      }
      
      this.links.push((result.value as any)?.id || `${router1Renamed}-${r2Name}`);
      return result.value;
    });

    await this.runTest("Link Router-Switch", "PHASE-3", async () => {
      const result = await this.bridge.sendCommandAndWait("addLink", {
        device1: router1Renamed,
        port1: "FastEthernet0/1",
        device2: sw1Name, 
        port2: "GigabitEthernet0/1",
        linkType: "auto",
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to create router-switch link");
      }
      
      this.links.push((result.value as any)?.id || `${router1Renamed}-${sw1Name}`);
      return result.value;
    });

    await this.runTest("Link Switch-Switch", "PHASE-3", async () => {
      const result = await this.bridge.sendCommandAndWait("addLink", {
        device1: sw1Name,
        port1: "GigabitEthernet0/2",
        device2: sw2Name,
        port2: "GigabitEthernet0/1", 
        linkType: "auto",
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to create switch-switch link");
      }
      
      this.links.push((result.value as any)?.id || `${sw1Name}-${sw2Name}`);
      return result.value;
    });

    await this.runTest("Link PC-Switch", "PHASE-3", async () => {
      const result = await this.bridge.sendCommandAndWait("addLink", {
        device1: sw1Name,
        port1: "FastEthernet0/3",
        device2: pc1Name,
        port2: "FastEthernet0",
        linkType: "straight",
      }, 15000);

      if (!result.ok) {
        console.log("PC-Switch FULL RESULT:", JSON.stringify(result, null, 2));
        const err = (result as any).value?.error || result.error;
        const details = (result as any).value?.details || (result as any).details;
        throw new Error(`Link PC-Switch failed: ${err}\n${JSON.stringify(details, null, 2)}`);
      }

      console.log(`    Link PC-Switch created (swapped: ${(result.value as any)?.swapped})`);
      this.links.push((result.value as any)?.id || `${pc1Name}-${sw1Name}`);
      return result.value;
    });

    await this.runTest("Link Server-Switch", "PHASE-3", async () => {
      const result = await this.bridge.sendCommandAndWait("addLink", {
        device1: srv1Name, 
        port1: "FastEthernet0",
        device2: sw2Name,
        port2: "FastEthernet0/2",
        linkType: "straight",
      }, 15000);

      if (!result.ok) {
        throw new Error(`Link Server-Switch failed: ${result.error}\n${JSON.stringify((result as any).details, null, 2)}`);
      }

      console.log(`    Link Server-Switch created (swapped: ${(result.value as any)?.swapped})`);
      this.links.push((result.value as any)?.id || `${srv1Name}-${sw2Name}`);
      return result.value;
    });

    await this.runTest("Link WRT300N-Switch", "PHASE-3", async () => {
      const result = await this.bridge.sendCommandAndWait("addLink", {
        device1: sw1Name,
        port1: "FastEthernet0/4",
        device2: wr1Name,
        port2: "Internet",
        linkType: "straight",
      }, 15000);
      if (!result.ok) {
        const ports = (result as any).details?.port2?.availablePorts || [];
        throw new Error(`WR1 link failed. Available ports: ${JSON.stringify(ports)}`);
      }
      console.log(`    Link WRT300N-Switch created (swapped: ${(result.value as any)?.swapped})`);
      this.links.push((result.value as any)?.id || `${wr1Name}-${sw1Name}`);
      return result.value;
    });

    await this.runTest("Verify links in snapshot", "PHASE-3", async () => {
      const result = await this.bridge.sendCommandAndWait("snapshot", {}, 15000);
      if (!result.ok) {
        throw new Error("Failed to get snapshot for link verification");
      }
      
      const snapshot = result.value as any;
      const linkCount = Object.keys(snapshot.links || {}).length;
      
      if (linkCount < this.links.length) {
        throw new Error(`Expected at least ${this.links.length} links, got ${linkCount}`);
      }
      
      return {
        expectedLinks: this.links.length,
        actualLinks: linkCount,
        links: Object.keys(snapshot.links || {}),
      };
    });

    await this.waitBetweenTests(2000);
  }

  // ============================================================================
  // FASE 4: CONFIGURACIÓN DE RED
  // ============================================================================
  
  async runPhase4(): Promise<void> {
    console.log("\n🌐 FASE 4: CONFIGURACIÓN DE RED");
    console.log("=" .repeat(50));

    const pc1Name = this.n("PC1");
    const srv1Name = this.n("SRV1");
    const router1Renamed = `${this.n("R1")}_renamed`;

    await this.runTest("Configure PC IP (Static)", "PHASE-4", async () => {
      const result = await this.bridge.sendCommandAndWait("configHost", {
        device: pc1Name,
        ip: "192.168.10.100",
        mask: "255.255.255.0", 
        gateway: "192.168.10.1",
        dns: "8.8.8.8",
        dhcp: false,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to configure PC IP");
      }
      
      return result.value;
    });

    await this.runTest("Configure Server IP (Static)", "PHASE-4", async () => {
      const result = await this.bridge.sendCommandAndWait("configHost", {
        device: srv1Name,
        ip: "192.168.20.100",
        mask: "255.255.255.0",
        gateway: "192.168.20.1", 
        dns: "8.8.8.8",
        dhcp: false,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to configure server IP");
      }
      
      return result.value;
    });

    await this.runTest("Configure Router hostname", "PHASE-4", async () => {
      const result = await this.bridge.sendCommandAndWait("configIos", {
        device: router1Renamed,
        commands: ["hostname MainRouter"],
        save: false,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to configure router hostname");
      }
      
      return result.value;
    });

    await this.runTest("Configure Router interface", "PHASE-4", async () => {
      const result = await this.bridge.sendCommandAndWait("configIos", {
        device: router1Renamed,
        commands: [
          "interface FastEthernet0/1",
          "ip address 192.168.10.1 255.255.255.0",
          "no shutdown",
          "exit",
        ],
        save: false,
      }, 15000);

      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to configure router interface");
      }

      return result.value;
    });

    await this.runTest("Show router version", "PHASE-4", async () => {
      const result = await this.bridge.sendCommandAndWait("execIos", {
        device: router1Renamed,
        command: "show version",
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to execute show version");
      }
      
      return {
        hasOutput: !!(result.value as any)?.raw,
        outputLength: (result.value as any)?.raw?.length || 0,
      };
    });

    await this.runTest("Show running config", "PHASE-4", async () => {
      const result = await this.bridge.sendCommandAndWait("execIos", {
        device: router1Renamed, 
        command: "show running-config",
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to show running config");
      }
      
      return {
        hasOutput: !!(result.value as any)?.raw,
        outputLength: (result.value as any)?.raw?.length || 0,
      };
    });

    await this.waitBetweenTests(2000);
  }

  // ============================================================================
  // FASE 5: VLAN Y SWITCHING  
  // ============================================================================
  
  async runPhase5(): Promise<void> {
    console.log("\n🏢 FASE 5: VLAN Y SWITCHING");
    console.log("=" .repeat(50));

    const sw1Name = this.n("SW1");

    await this.runTest("Create VLANs on SW1", "PHASE-5", async () => {
      const result = await this.bridge.sendCommandAndWait("configIos", {
        device: sw1Name,
        commands: [
          "vlan 10",
          "name ADMIN",
          "exit",
          "vlan 20", 
          "name USERS",
          "exit",
          "vlan 30",
          "name SERVERS",
          "exit",
        ],
        save: false,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to create VLANs");
      }
      
      return result.value;
    });

    await this.runTest("Configure access port on SW1", "PHASE-5", async () => {
      const result = await this.bridge.sendCommandAndWait("configIos", {
        device: sw1Name,
        commands: [
          "interface FastEthernet0/1",
          "switchport mode access",
          "switchport access vlan 10", 
          "exit",
        ],
        save: false,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to configure access port");
      }
      
      return result.value;
    });

    await this.runTest("Configure trunk port on SW1", "PHASE-5", async () => {
      const result = await this.bridge.sendCommandAndWait("configIos", {
        device: sw1Name,
        commands: [
          "interface FastEthernet0/24",
          "switchport mode trunk",
          "switchport trunk allowed vlan 10,20,30",
          "exit",
        ],
        save: false,
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to configure trunk port");
      }
      
      return result.value;
    });

    await this.runTest("Show VLAN brief", "PHASE-5", async () => {
      const result = await this.bridge.sendCommandAndWait("execIos", {
        device: sw1Name,
        command: "show vlan brief",
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to show VLAN brief");
      }
      
      const output = (result.value as any)?.raw || "";
      const hasVlan10 = output.includes("10") && output.includes("ADMIN");
      const hasVlan20 = output.includes("20") && output.includes("USERS");
      
      return {
        hasOutput: !!output,
        hasVlan10,
        hasVlan20,
        outputLength: output.length,
      };
    });

    await this.runTest("Show interfaces trunk", "PHASE-5", async () => {
      const result = await this.bridge.sendCommandAndWait("execIos", {
        device: sw1Name,
        command: "show interfaces trunk",
      }, 15000);
      
      if (!result.ok) {
        throw new Error(result.error?.message || "Failed to show interfaces trunk");
      }
      
      return {
        hasOutput: !!(result.value as any)?.raw,
        outputLength: (result.value as any)?.raw?.length || 0,
      };
    });

    await this.waitBetweenTests(2000);
  }

  // ============================================================================
  // FASE 6: VALIDACIÓN DE ERRORES
  // ============================================================================
  
  async runPhase6(): Promise<void> {
    console.log("\n🔬 FASE 6: VALIDACIÓN DE ERRORES");
    console.log("=" .repeat(50));

    const r1Name = this.n("R1_VALID");
    const r2Name = this.n("R2_VALID");
    const sw1Name = this.n("SW1_VALID");

    await this.runTest("Add Router for validation tests", "PHASE-6", async () => {
      const result = await this.bridge.sendCommandAndWait("addDevice", {
        model: "2811",
        deviceType: getPTDeviceType("2811") as number,
        name: r1Name,
        x: 100,
        y: 100,
      }, 15000);
      if (!result.ok) throw new Error(result.error?.message || "Failed to add router");
      this.devices.push(r1Name);
      return result.value;
    });

    await this.runTest("Add Switch for validation tests", "PHASE-6", async () => {
      const result = await this.bridge.sendCommandAndWait("addDevice", {
        model: "2960-24TT",
        deviceType: getPTDeviceType("2960-24TT") as number,
        name: sw1Name,
        x: 300,
        y: 100,
      }, 15000);
      if (!result.ok) throw new Error(result.error?.message || "Failed to add switch");
      this.devices.push(sw1Name);
      return result.value;
    });

    await this.runTest("REJECT Invalid port (Gi0/5 on 2811)", "PHASE-6", async () => {
      const result = await this.bridge.sendCommandAndWait("addLink", {
        device1: r1Name,
        port1: "GigabitEthernet0/5",
        device2: sw1Name,
        port2: "FastEthernet0/1",
        linkType: "auto",
      }, 15000);
      
      if (result.ok) {
        throw new Error("Debería haber fallado: GigabitEthernet0/5 no existe en 2811");
      }
      const errMsg1 = String(result.error?.message || result.error || "");
      if (!errMsg1.includes("no existe") && !errMsg1.includes("not found") && !errMsg1.includes("Puerto")) {
        throw new Error("Error esperado sobre puerto inválido, got: " + errMsg1);
      }
      return { rejected: true, error: errMsg1 };
    });

    await this.runTest("REJECT Invalid cable type", "PHASE-6", async () => {
      const result = await this.bridge.sendCommandAndWait("addLink", {
        device1: r1Name,
        port1: "FastEthernet0/0",
        device2: sw1Name,
        port2: "FastEthernet0/2",
        linkType: "invalid-cable-xyz",
      }, 15000);
      
      if (result.ok) {
        throw new Error("Debería haber fallado: tipo de cable inválido");
      }
      const errMsg2 = String(result.error?.message || result.error || "");
      if (!errMsg2.includes("no es válido") && !errMsg2.includes("no válido")) {
        throw new Error("Error esperado sobre tipo de cable inválido, got: " + errMsg2);
      }
      return { rejected: true, error: errMsg2 };
    });

    await this.runTest("REJECT Fiber cable on RJ45 port", "PHASE-6", async () => {
      const result = await this.bridge.sendCommandAndWait("addLink", {
        device1: r1Name,
        port1: "FastEthernet0/0",
        device2: sw1Name,
        port2: "FastEthernet0/3",
        linkType: "fiber",
      }, 15000);
      
      if (result.ok) {
        throw new Error("Debería haber fallado: cable fiber en puerto RJ45");
      }
      const errMsg3 = String(result.error?.message || result.error || "");
      if (!errMsg3.includes("no es compatible") && !errMsg3.includes("compatible")) {
        throw new Error("Error esperado sobre incompatibilidad cable-puerto, got: " + errMsg3);
      }
      return { rejected: true, error: errMsg3 };
    });

    await this.runTest("REJECT Port validation skips for unknown model", "PHASE-6", async () => {
      const pcName = this.n("PC_VALID");
      const pcResult = await this.bridge.sendCommandAndWait("addDevice", {
        model: "PC-PT",
        deviceType: getPTDeviceType("PC-PT") as number,
        name: pcName,
        x: 500,
        y: 100,
      }, 15000);
      if (!pcResult.ok) throw new Error("Failed to add PC");
      this.devices.push(pcName);

      const linkResult = await this.bridge.sendCommandAndWait("addLink", {
        device1: sw1Name,
        port1: "FastEthernet0/4",
        device2: pcName,
        port2: "FastEthernet0",
        linkType: "straight",
      }, 15000);
      
      if (!linkResult.ok) {
        throw new Error("PC-PT no está en PT_PORT_MAP así que debería usar auto-detect: " + linkResult.error);
      }
      return { ok: true };
    });

    await this.waitBetweenTests(1000);
  }

  // ============================================================================
  // MAIN TEST RUNNER
  // ============================================================================
  
  async runAllTests(): Promise<void> {
    this.startTime = Date.now();
    
    console.log("🚀 INICIANDO PLAN EXHAUSTIVO DE PRUEBAS - PT CONTROL V2");
    console.log("=" .repeat(80));
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Target: ${PT_DEV_DIR}`);
    console.log();

    try {
      // Limpiar canvas antes de comenzar
      console.log("🧹 Limpiando canvas...");
      this.bridge.start();
      const clearResult = await this.bridge.sendCommandAndWait("clearTopology", {}, 15000);
      const clearOk = clearResult.ok;
      const clearedLinks = (clearResult.value as any)?.removedLinks ?? 0;
      const clearedDevices = (clearResult.value as any)?.removedDevices ?? 0;
      console.log(`   Canvas limpio: ${clearedDevices} dispositivos, ${clearedLinks} enlaces eliminados`);
      this.devices = [];
      this.links = [];
      console.log();

      await this.runPhase1();
      await this.runPhase2(); 
      await this.runPhase3();
      await this.runPhase4();
      await this.runPhase5();
      await this.runPhase6();
      
    } catch (error) {
      console.error("❌ Critical error during testing:", error);
    } finally {
      // Always cleanup and generate report
      await this.cleanup();
      this.generateReport();
    }
  }

  private async cleanup(): Promise<void> {
    console.log("\n🧹 CLEANUP");
    console.log("=" .repeat(30));
    
    try {
      this.bridge.stopMonitoring();
      await this.bridge.stop();
      console.log("✅ Bridge stopped");
    } catch (error) {
      console.log("⚠️ Error during cleanup:", (error as Error).message);
    }
  }

  private generateReport(): void {
    const totalTime = Date.now() - this.startTime;
    
    // Calculate phase statistics
    const phases = [...new Set(this.results.map(r => r.phase))];
    const phaseStats: Record<string, PhaseStats> = {};
    
    phases.forEach(phase => {
      const phaseResults = this.results.filter(r => r.phase === phase);
      const passed = phaseResults.filter(r => r.success).length;
      const total = phaseResults.length;
      
      phaseStats[phase] = {
        total,
        passed,
        failed: total - passed,
        successRate: Math.round((passed / total) * 100),
      };
    });

    // Overall statistics
    const totalTests = this.results.length;
    const totalPassed = this.results.filter(r => r.success).length;
    const totalFailed = totalTests - totalPassed;
    const overallSuccessRate = Math.round((totalPassed / totalTests) * 100);

    // Generate Markdown report
    const report = this.generateMarkdownReport({
      totalTime,
      totalTests,
      totalPassed,
      totalFailed,
      overallSuccessRate,
      phaseStats,
      deviceCount: this.devices.length,
      linkCount: this.links.length,
      eventCount: this.events.length,
    });

    // Save report
    const reportPath = join(PT_DEV_DIR, "exhaustive-test-report.md");
    writeFileSync(reportPath, report);
    
    // Console summary
    console.log("\n📊 RESUMEN FINAL");
    console.log("=" .repeat(50));
    console.log(`⏱️  Tiempo total: ${Math.round(totalTime / 1000)}s`);
    console.log(`📈 Tests ejecutados: ${totalTests}`);
    console.log(`✅ Exitosos: ${totalPassed}`);
    console.log(`❌ Fallidos: ${totalFailed}`);
    console.log(`📊 Tasa de éxito: ${overallSuccessRate}%`);
    console.log(`🖥️  Dispositivos creados: ${this.devices.length}`);
    console.log(`🔗 Enlaces creados: ${this.links.length}`);
    console.log(`📡 Eventos capturados: ${this.events.length}`);
    console.log();
    console.log(`📄 Reporte detallado: ${reportPath}`);
    
    if (overallSuccessRate >= 90) {
      console.log("🎉 ¡EXCELENTE! Sistema funcionando correctamente");
    } else if (overallSuccessRate >= 75) {
      console.log("✅ BUENO - Sistema mayormente funcional");
    } else if (overallSuccessRate >= 50) {
      console.log("⚠️  ACEPTABLE - Algunos problemas detectados");
    } else {
      console.log("❌ CRÍTICO - Problemas serios detectados");
    }
  }

  private generateMarkdownReport(stats: any): string {
    const timestamp = new Date().toISOString();
    
    return `# 📋 Reporte Exhaustivo - PT Control V2

**Fecha:** ${timestamp}  
**Duración:** ${Math.round(stats.totalTime / 1000)}s  
**Arquitectura:** PT Main.js Simplificado + FileBridge V2  

---

## 📈 Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| **Tests Ejecutados** | ${stats.totalTests} |
| **Exitosos** | ${stats.totalPassed} ✅ |
| **Fallidos** | ${stats.totalFailed} ❌ |
| **Tasa de Éxito** | **${stats.overallSuccessRate}%** |
| **Dispositivos Creados** | ${stats.deviceCount} |
| **Enlaces Creados** | ${stats.linkCount} |
| **Eventos Capturados** | ${stats.eventCount} |

---

## 🎯 Resultados por Fase

${Object.entries(stats.phaseStats).map(([phase, stat]: [string, any]) => `
### ${phase}
- **Tests:** ${stat.total}
- **Exitosos:** ${stat.passed} ✅
- **Fallidos:** ${stat.failed} ❌  
- **Tasa de éxito:** **${stat.successRate}%**
`).join('\n')}

---

## 📝 Detalle de Tests

${this.results.map(result => `
### ${result.phase} - ${result.name}
- **Estado:** ${result.success ? '✅ PASS' : '❌ FAIL'}
- **Duración:** ${result.duration}ms
- **Detalles:** ${result.details || result.error || 'N/A'}
${result.data ? `- **Datos:** \`${JSON.stringify(result.data)}\`` : ''}
`).join('\n')}

---

## 📡 Eventos Monitoreados

**Total de eventos:** ${this.events.length}

${this.events.slice(-10).map(event => `
- **${event.type}** (${new Date(event.timestamp).toISOString()})
`).join('')}

---

## 🎯 Dispositivos Creados

${this.devices.map(device => `- ${device}`).join('\n')}

---

## 🔗 Enlaces Creados  

${this.links.map(link => `- ${link}`).join('\n')}

---

## 🏆 Conclusión

${stats.overallSuccessRate >= 90 ? 
  '🎉 **EXCELENTE** - La nueva arquitectura simplificada funciona correctamente. PT Control V2 está listo para producción.' :
  stats.overallSuccessRate >= 75 ?
  '✅ **BUENO** - Sistema mayormente funcional. Algunos ajustes menores requeridos.' :
  stats.overallSuccessRate >= 50 ?
  '⚠️ **ACEPTABLE** - Problemas detectados que requieren atención.' :
  '❌ **CRÍTICO** - Problemas serios detectados. Revisión urgente necesaria.'
}

**Arquitectura validada:** PT main.js (213 líneas) + FileBridge V2 con auto-snapshot y heartbeat monitoring.

---
*Generado automáticamente por ExhaustivePTTester v2.0*
`;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const tester = new ExhaustivePTTester();
  await tester.runAllTests();
}

main().catch(console.error);
