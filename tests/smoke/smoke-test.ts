#!/usr/bin/env bun
/**
 * Smoke Test — PT Control + CLI
 * 
 * Valida la tubería mínima viva: build → connect → device → link → config-ios → show
 * Requiere: Packet Tracer corriendo con Script Module cargado (~/pt-dev/main.js)
 * 
 * Ejecución:
 *   bun run smoke-test.ts
 */

import { PTController } from "./packages/pt-control/src/index";
import { homedir } from "node:os";
import { resolve } from "node:path";

// ── Helpers ─────────────────────────────────────────────────────────────────

const ptDevDir = process.env.PT_DEV_DIR ?? resolve(homedir(), "pt-dev");

function paso(num: number, titulo: string): void {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`PASO ${num}: ${titulo}`);
  console.log("═".repeat(60));
}

function ok(msg: string): void {
  console.log(`  ✅ ${msg}`);
}

function fail(msg: string, err: unknown): void {
  console.log(`  ❌ ${msg}`);
  if (err instanceof Error) {
    console.log(`     Error: ${err.message}`);
  } else {
    console.log(`     Error: ${String(err)}`);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n🧪 PT Control — Smoke Test Suite");
  console.log(`   PT_DEV_DIR: ${ptDevDir}`);
  console.log(`   Fecha: ${new Date().toISOString()}`);

  const resultados: { paso: number; nombre: string; ok: boolean; detalle: string }[] = [];

  // ── PASO 1: Crear controller y verificar conectividad ──────────────────
  paso(1, "Conectar con Packet Tracer");
  let controller: PTController | null = null;
  try {
    controller = new PTController({ devDir: ptDevDir });
    await controller.start();
    await sleep(1500); // esperar a que el bridge se estabilice
    ok("Controller iniciado correctamente");
    resultados.push({ paso: 1, nombre: "Conectar con PT", ok: true, detalle: "Controller iniciado" });
  } catch (err) {
    fail("No se pudo conectar con PT", err);
    resultados.push({ paso: 1, nombre: "Conectar con PT", ok: false, detalle: String(err) });
    printResumen(resultados);
    process.exit(1);
  }

  // ── PASO 2: Snapshot inicial (canvas puede tener cosas) ───────────────
  paso(2, "Snapshot inicial del canvas");
  try {
    const snap = await controller!.snapshot();
    const deviceCount = Object.keys(snap.devices).length;
    const linkCount = Object.keys(snap.links).length;
    ok(`Canvas: ${deviceCount} dispositivos, ${linkCount} enlaces`);
    resultados.push({ paso: 2, nombre: "Snapshot inicial", ok: true, detalle: `${deviceCount} dev, ${linkCount} links` });
  } catch (err) {
    fail("Error al hacer snapshot", err);
    resultados.push({ paso: 2, nombre: "Snapshot inicial", ok: false, detalle: String(err) });
  }

  // ── PASO 3: Limpiar canvas ─────────────────────────────────────────────
  paso(3, "Limpiar canvas (clearTopology)");
  try {
    const result = await controller!.clearTopology();
    await sleep(2000); // dar tiempo a PT para procesar
    ok(`Limpiado: ${result.removedDevices} dispositivos, ${result.removedLinks} enlaces eliminados`);
    ok(`Remaining: ${result.remainingDevices} dispositivos, ${result.remainingLinks} enlaces`);
    resultados.push({ paso: 3, nombre: "Limpiar canvas", ok: true, detalle: `${result.removedDevices} dev removidos` });
  } catch (err) {
    fail("Error al limpiar canvas", err);
    resultados.push({ paso: 3, nombre: "Limpiar canvas", ok: false, detalle: String(err) });
  }

  // ── PASO 4: Verificar canvas vacío ─────────────────────────────────────
  paso(4, "Verificar canvas vacío");
  try {
    await sleep(1000);
    const snap = await controller!.snapshot();
    const deviceCount = Object.keys(snap.devices).length;
    if (deviceCount === 0) {
      ok("Canvas vacío confirmado");
      resultados.push({ paso: 4, nombre: "Canvas vacío", ok: true, detalle: "0 dispositivos" });
    } else {
      fail(`Canvas no está vacío: quedan ${deviceCount} dispositivos`, "");
      resultados.push({ paso: 4, nombre: "Canvas vacío", ok: false, detalle: `${deviceCount} dispositivos restantes` });
    }
  } catch (err) {
    fail("Error al verificar canvas vacío", err);
    resultados.push({ paso: 4, nombre: "Canvas vacío", ok: false, detalle: String(err) });
  }

  // ── PASO 5: Agregar router R1 ──────────────────────────────────────────
  paso(5, "Agregar router R1 (modelo 2911)");
  try {
    const r1 = await controller!.addDevice("R1", "2911", { x: 200, y: 200 });
    ok(`Router R1 agregado: ${r1.name}, modelo ${r1.model}, tipo ${r1.type}`);
    resultados.push({ paso: 5, nombre: "Agregar R1", ok: true, detalle: `${r1.name} (${r1.model})` });
  } catch (err) {
    fail("Error al agregar R1", err);
    resultados.push({ paso: 5, nombre: "Agregar R1", ok: false, detalle: String(err) });
  }

  // ── PASO 6: Agregar switch S1 ──────────────────────────────────────────
  paso(6, "Agregar switch S1 (modelo 2960)");
  try {
    const s1 = await controller!.addDevice("S1", "2960", { x: 400, y: 200 });
    ok(`Switch S1 agregado: ${s1.name}, modelo ${s1.model}, tipo ${s1.type}`);
    resultados.push({ paso: 6, nombre: "Agregar S1", ok: true, detalle: `${s1.name} (${s1.model})` });
  } catch (err) {
    fail("Error al agregar S1", err);
    resultados.push({ paso: 6, nombre: "Agregar S1", ok: false, detalle: String(err) });
  }

  // ── PASO 7: Agregar PC1 ────────────────────────────────────────────────
  paso(7, "Agregar PC1 (modelo PC-PT)");
  try {
    const pc1 = await controller!.addDevice("PC1", "PC-PT", { x: 400, y: 350 });
    ok(`PC1 agregado: ${pc1.name}, modelo ${pc1.model}, tipo ${pc1.type}`);
    resultados.push({ paso: 7, nombre: "Agregar PC1", ok: true, detalle: `${pc1.name} (${pc1.model})` });
  } catch (err) {
    fail("Error al agregar PC1", err);
    resultados.push({ paso: 7, nombre: "Agregar PC1", ok: false, detalle: String(err) });
  }

  // ── PASO 8: listDevices confirma 3 dispositivos ────────────────────────
  paso(8, "listDevices confirma 3 dispositivos");
  try {
    await sleep(1500);
    const devices = await controller!.listDevices();
    if (devices.length === 3) {
      ok(`3 dispositivos encontrados: ${devices.map((d) => d.name).join(", ")}`);
      resultados.push({ paso: 8, nombre: "listDevices=3", ok: true, detalle: devices.map((d) => d.name).join(", ") });
    } else {
      fail(`Esperados 3 dispositivos, encontrados ${devices.length}`, "");
      resultados.push({ paso: 8, nombre: "listDevices=3", ok: false, detalle: `${devices.length} encontrados` });
    }
  } catch (err) {
    fail("Error en listDevices", err);
    resultados.push({ paso: 8, nombre: "listDevices=3", ok: false, detalle: String(err) });
  }

  // ── PASO 9: Mover R1 ──────────────────────────────────────────────────
  paso(9, "Mover R1 a nuevas coordenadas");
  try {
    const moveResult = await controller!.moveDevice("R1", 150, 150);
    if (moveResult.ok) {
      ok(`R1 movido a (${moveResult.x}, ${moveResult.y})`);
      resultados.push({ paso: 9, nombre: "Mover R1", ok: true, detalle: `(${moveResult.x}, ${moveResult.y})` });
    } else {
      fail(`Error al mover R1: ${moveResult.error}`, "");
      resultados.push({ paso: 9, nombre: "Mover R1", ok: false, detalle: moveResult.error });
    }
  } catch (err) {
    fail("Error al mover R1", err);
    resultados.push({ paso: 9, nombre: "Mover R1", ok: false, detalle: String(err) });
  }

  // ── PASO 10: Crear link R1 ↔ S1 ───────────────────────────────────────
  paso(10, "Crear enlace R1 Gi0/0 ↔ S1 Gi0/1");
  try {
    const link = await controller!.addLink("R1", "GigabitEthernet0/0", "S1", "GigabitEthernet0/1", "auto");
    ok(`Enlace creado: ${link.device1}:${link.port1} ↔ ${link.device2}:${link.port2}`);
    resultados.push({ paso: 10, nombre: "Link R1-S1", ok: true, detalle: `${link.device1}:${link.port1} ↔ ${link.device2}:${link.port2}` });
  } catch (err) {
    fail("Error al crear enlace R1-S1", err);
    resultados.push({ paso: 10, nombre: "Link R1-S1", ok: false, detalle: String(err) });
  }

  // ── PASO 11: Crear link S1 ↔ PC1 ──────────────────────────────────────
  paso(11, "Crear enlace S1 Fa0/1 ↔ PC1 FastEthernet0");
  try {
    const link = await controller!.addLink("S1", "FastEthernet0/1", "PC1", "FastEthernet0", "auto");
    ok(`Enlace creado: ${link.device1}:${link.port1} ↔ ${link.device2}:${link.port2}`);
    resultados.push({ paso: 11, nombre: "Link S1-PC1", ok: true, detalle: `${link.device1}:${link.port1} ↔ ${link.device2}:${link.port2}` });
  } catch (err) {
    fail("Error al crear enlace S1-PC1", err);
    resultados.push({ paso: 11, nombre: "Link S1-PC1", ok: false, detalle: String(err) });
  }

  // ── PASO 12: Verificar links en snapshot ───────────────────────────────
  paso(12, "Verificar 2 enlaces en snapshot");
  try {
    await sleep(1500);
    const snap = await controller!.snapshot();
    const linkCount = Object.keys(snap.links).length;
    if (linkCount >= 2) {
      ok(`${linkCount} enlaces encontrados`);
      resultados.push({ paso: 12, nombre: "2 enlaces en snapshot", ok: true, detalle: `${linkCount} enlaces` });
    } else {
      fail(`Esperados >= 2 enlaces, encontrados ${linkCount}`, "");
      resultados.push({ paso: 12, nombre: "2 enlaces en snapshot", ok: false, detalle: `${linkCount} enlaces` });
    }
  } catch (err) {
    fail("Error al verificar enlaces", err);
    resultados.push({ paso: 12, nombre: "2 enlaces en snapshot", ok: false, detalle: String(err) });
  }

  // ── PASO 13: Configurar IP en PC1 ─────────────────────────────────────
  paso(13, "Configurar IP en PC1 (192.168.1.10/255.255.255.0)");
  try {
    await controller!.configHost("PC1", {
      ip: "192.168.1.10",
      mask: "255.255.255.0",
      gateway: "192.168.1.1",
      dhcp: false,
    });
    ok("PC1 configurado con IP estática");
    resultados.push({ paso: 13, nombre: "config-host PC1", ok: true, detalle: "192.168.1.10/24" });
  } catch (err) {
    fail("Error al configurar PC1", err);
    resultados.push({ paso: 13, nombre: "config-host PC1", ok: false, detalle: String(err) });
  }

  // ── PASO 14: Configurar interfaz en R1 ────────────────────────────────
  paso(14, "Configurar Gi0/0 en R1 con config-ios");
  try {
    await controller!.configIos("R1", [
      "enable",
      "configure terminal",
      "interface GigabitEthernet0/0",
      "ip address 192.168.1.1 255.255.255.0",
      "no shutdown",
      "exit",
      "exit",
    ]);
    ok("Interfaz Gi0/0 de R1 configurada: 192.168.1.1/24, no shutdown");
    resultados.push({ paso: 14, nombre: "config-ios R1 Gi0/0", ok: true, detalle: "192.168.1.1/24" });
  } catch (err) {
    fail("Error al configurar R1", err);
    resultados.push({ paso: 14, nombre: "config-ios R1 Gi0/0", ok: false, detalle: String(err) });
  }

  // ── PASO 15: show ip interface brief en R1 ────────────────────────────
  paso(15, "show ip interface brief en R1");
  try {
    await sleep(2000);
    const result = await controller!.showIpInterfaceBrief("R1");
    ok("show ip interface brief ejecutado");
    if (result && Array.isArray(result) && result.length > 0) {
      ok(`Interfaces encontradas: ${result.length}`);
      const gi00 = result.find((i: any) =>
        (i.interface ?? i.name ?? "").toLowerCase().includes("gigabitethernet0/0") ||
        (i.interface ?? i.name ?? "").toLowerCase().includes("gi0/0")
      );
      if (gi00) {
        ok(`Gi0/0 encontrada: ${JSON.stringify(gi00).slice(0, 120)}`);
      }
    }
    resultados.push({ paso: 15, nombre: "show ip-int-brief R1", ok: true, detalle: "Ejecutado" });
  } catch (err) {
    fail("Error en show ip interface brief", err);
    resultados.push({ paso: 15, nombre: "show ip-int-brief R1", ok: false, detalle: String(err) });
  }

  // ── PASO 16: Remover PC1 ──────────────────────────────────────────────
  paso(16, "Remover PC1 y verificar que desaparece");
  try {
    await controller!.removeDevice("PC1");
    await sleep(1500);
    const devices = await controller!.listDevices();
    const pc1StillExists = devices.some((d) => d.name === "PC1");
    if (!pc1StillExists) {
      ok("PC1 removido correctamente");
      resultados.push({ paso: 16, nombre: "Remover PC1", ok: true, detalle: "PC1 eliminado" });
    } else {
      fail("PC1 sigue apareciendo después de remover", "");
      resultados.push({ paso: 16, nombre: "Remover PC1", ok: false, detalle: "PC1 aún presente" });
    }
  } catch (err) {
    fail("Error al remover PC1", err);
    resultados.push({ paso: 16, nombre: "Remover PC1", ok: false, detalle: String(err) });
  }

  // ── PASO 17: Limpiar canvas al final ──────────────────────────────────
  paso(17, "Limpiar canvas al finalizar");
  try {
    const result = await controller!.clearTopology();
    ok(`Canvas limpiado: ${result.removedDevices} dispositivos removidos`);
    resultados.push({ paso: 17, nombre: "Limpiar canvas final", ok: true, detalle: `${result.removedDevices} removidos` });
  } catch (err) {
    fail("Error al limpiar canvas final", err);
    resultados.push({ paso: 17, nombre: "Limpiar canvas final", ok: false, detalle: String(err) });
  }

  // ── Stop controller ────────────────────────────────────────────────────
  try {
    await controller!.stop();
  } catch {
    // ignore
  }

  // ── Resumen ─────────────────────────────────────────────────────────────
  printResumen(resultados);
}

function printResumen(
  resultados: { paso: number; nombre: string; ok: boolean; detalle: string }[]
): void {
  console.log(`\n${"═".repeat(60)}`);
  console.log("RESUMEN DEL SMOKE TEST");
  console.log("═".repeat(60));

  const passCount = resultados.filter((r) => r.ok).length;
  const failCount = resultados.filter((r) => !r.ok).length;

  for (const r of resultados) {
    const icon = r.ok ? "✅" : "❌";
    console.log(`  ${icon} Paso ${r.paso}: ${r.nombre}`);
    if (!r.ok) {
      console.log(`     Detalle: ${r.detalle}`);
    }
  }

  console.log("");
  console.log(`Total: ${resultados.length} | ✅ ${passCount} passed | ❌ ${failCount} failed`);
  console.log("═".repeat(60));
  console.log("");

  if (failCount > 0) {
    console.log("💡 Recomendaciones:");
    console.log("   1. Verifica que Packet Tracer está corriendo");
    console.log("   2. Verifica que ~/pt-dev/main.js está cargado en PT");
    console.log("   3. Ejecuta: bun run pt doctor");
    console.log("   4. Revisa: bun run pt logs errors");
    console.log("");
    process.exit(1);
  } else {
    console.log("🎉 Todos los tests pasaron. El sistema está operativo.");
    console.log("");
  }
}

// ── Ejecutar ─────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("\n💥 Error fatal en smoke test:");
  console.error(err);
  process.exit(1);
});
