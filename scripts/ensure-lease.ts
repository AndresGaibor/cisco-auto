#!/usr/bin/env bun
/**
 * Script auxiliar para asegurar que el lease exista antes de cargar PT
 * Genera un lease válido si no existe o está expirado
 */

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import type { BridgeLease } from "@cisco-auto/types";

const DEV_DIR = process.env.PT_DEV_DIR || resolve(homedir(), "pt-dev");
const LEASE_FILE = resolve(DEV_DIR, "bridge-lease.json");

function isValidLease(lease: BridgeLease): boolean {
  const now = Date.now();

  // Verificar campos requeridos
  if (!lease.ownerId || !lease.expiresAt || !lease.updatedAt) {
    return false;
  }

  // Verificar que no esté expirado
  if (now > lease.expiresAt) {
    return false;
  }

  // Verificar que no esté stale (muy viejo)
  const ageMs = now - lease.updatedAt;
  if (ageMs > lease.ttlMs * 2) {
    return false;
  }

  return true;
}

function generateLease(): BridgeLease {
  const now = Date.now();

  return {
    ownerId: `manual-${Date.now()}`,
    pid: process.pid,
    hostname: require("node:os").hostname(),
    startedAt: now,
    updatedAt: now,
    expiresAt: 9999999999000, // Año 2286
    ttlMs: 60000,
    processTitle: "ensure-lease",
    version: "2.0.0",
  };
}

function ensureLease(): void {
  console.log("🔍 Verificando lease...");

  // Si ya existe un lease válido, terminar
  if (existsSync(LEASE_FILE)) {
    try {
      const content = readFileSync(LEASE_FILE, "utf-8");
      const lease = JSON.parse(content) as BridgeLease;

      if (isValidLease(lease)) {
        console.log("✅ Lease válido encontrado:");
        console.log(`   Owner: ${lease.ownerId.substring(0, 12)}...`);
        console.log(`   Expires: ${new Date(lease.expiresAt).toISOString()}`);
        return;
      }

      console.log("⚠️  Lease existente está expirado o stale");
    } catch (error) {
      console.log("⚠️  Lease existente está corrupto");
    }
  }

  // Generar nuevo lease
  console.log("📝 Generando nuevo lease...");
  const lease = generateLease();

  try {
    writeFileSync(LEASE_FILE, JSON.stringify(lease, null, 2));
    console.log("✅ Lease generado correctamente:");
    console.log(`   Archivo: ${LEASE_FILE}`);
    console.log(`   Owner: ${lease.ownerId}`);
    console.log(`   Expires: ${new Date(lease.expiresAt).toISOString()}`);
  } catch (error) {
    console.error("❌ Error escribiendo lease:", error);
    process.exit(1);
  }
}

// Exportar para uso programático
export { ensureLease, generateLease, isValidLease };

// Ejecutar si se llama directamente
if (import.meta.main) {
  ensureLease();
}
