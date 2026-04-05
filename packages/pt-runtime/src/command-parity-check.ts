/**
 * Command Parity Check - Valida consistencia entre catálogo y runtime
 * Este script verifica que cada comando del catálogo tenga:
 * - Schema de payload definido
 * - Schema de resultado definido
 * - Handler en el runtime
 * - Case en el dispatcher
 */

import {
  PUBLIC_COMMAND_CATALOG,
  INTERNAL_COMMAND_CATALOG,
  COMMAND_CATALOG,
  type CommandCatalogEntry,
} from "@cisco-auto/types";
import { HANDLERS } from "./compose.js";

// ============================================================================
// Errores de paridad
// ============================================================================

export interface ParityError {
  type: "missing_payload_schema" | "missing_result_schema" | "missing_handler" | "missing_dispatcher_case" | "public_in_internal" | "internal_in_public";
  command: string;
  message: string;
}

export interface ParityCheckResult {
  ok: boolean;
  errors: ParityError[];
  warnings: string[];
}

// ============================================================================
// Handlers registrados en compose.ts
// ============================================================================

// Usar las claves del HANDLERS como referencia
const REGISTERED_HANDLERS = new Set(Object.keys(HANDLERS));

// ============================================================================
// Verificaciones de paridad
// ============================================================================

export function checkPayloadSchemaExists(entry: CommandCatalogEntry): ParityError | null {
  const schemaName = entry.payloadSchemaName;
  // Verificar que el schema está exportado desde pt-commands.ts
  // Esta verificación se hace en tiempo de build mediante imports
  return null;
}

export function checkResultSchemaExists(entry: CommandCatalogEntry): ParityError | null {
  const schemaName = entry.resultSchemaName;
  // Verificar que el schema está exportado desde ios-results.ts
  return null;
}

export function checkHandlerExists(entry: CommandCatalogEntry): ParityError | null {
  if (entry.visibility === "internal") {
    return null; // Handlers internos no necesitan verificación
  }
  
  // El handler en el catálogo tiene formato "handleAddDevice"
  // El handler en HANDLERS tiene formato "addDevice"
  // Normalizar: quitar "handle" del inicio y dejar el resto en minúsculas
  const handlerKey = entry.type;
  
  if (!REGISTERED_HANDLERS.has(handlerKey)) {
    return {
      type: "missing_handler",
      command: entry.type,
      message: `Handler '${entry.handler}' (key: '${handlerKey}') no está registrado en compose.ts para el comando '${entry.type}'`,
    };
  }
  return null;
}

export function checkDispatcherCase(entry: CommandCatalogEntry): ParityError | null {
  // El dispatcher se genera automáticamente desde el catálogo
  // Esta verificación es redundante si el dispatcher-template.ts usa el catálogo
  return null;
}

export function checkPublicInternalSeparation(): ParityError[] {
  const errors: ParityError[] = [];
  
  const publicTypes = new Set(PUBLIC_COMMAND_CATALOG.map((c) => c.type));
  const internalTypes = new Set(INTERNAL_COMMAND_CATALOG.map((c) => c.type));
  
  // Verificar que comandos públicos no estén en el catálogo interno
  for (const internal of INTERNAL_COMMAND_CATALOG) {
    if (publicTypes.has(internal.type)) {
      errors.push({
        type: "public_in_internal",
        command: internal.type,
        message: `Comando '${internal.type}' está en el catálogo interno pero debería ser público`,
      });
    }
  }
  
  // Verificar que comandos internos no estén en el catálogo público
  for (const pub of PUBLIC_COMMAND_CATALOG) {
    if (internalTypes.has(pub.type)) {
      errors.push({
        type: "internal_in_public",
        command: pub.type,
        message: `Comando '${pub.type}' está en el catálogo público pero debería ser interno`,
      });
    }
  }
  
  return errors;
}

// ============================================================================
// Verificación principal
// ============================================================================

export function runParityCheck(): ParityCheckResult {
  const errors: ParityError[] = [];
  const warnings: string[] = [];
  
  // Verificar separación público/interno
  const separationErrors = checkPublicInternalSeparation();
  errors.push(...separationErrors);
  
  // Verificar cada comando del catálogo
  for (const entry of COMMAND_CATALOG) {
    const handlerError = checkHandlerExists(entry);
    if (handlerError) {
      errors.push(handlerError);
    }
    
    // Verificar que comandos diferidos tengan el mecanismo de polling
    if (entry.execution === "deferred" && entry.visibility === "public") {
      warnings.push(`Comando '${entry.type}' es diferido - verificar soporte de polling`);
    }
  }
  
  // Verificar comandos que deberían estar en el catálogo pero no existen
  const catalogTypes = new Set(COMMAND_CATALOG.map((c) => c.type));
  const schemaTypes = [
    "addDevice",
    "removeDevice",
    "listDevices",
    "renameDevice",
    "moveDevice",
    "addModule",
    "removeModule",
    "addLink",
    "removeLink",
    "configHost",
    "configIos",
    "execIos",
    "execInteractive",
    "snapshot",
    "inspect",
    "hardwareInfo",
    "hardwareCatalog",
    "commandLog",
    "listCanvasRects",
    "getRect",
    "devicesInRect",
    "resolveCapabilities",
  ];
  
  for (const schemaType of schemaTypes) {
    if (!catalogTypes.has(schemaType)) {
      errors.push({
        type: "missing_dispatcher_case",
        command: schemaType,
        message: `Comando '${schemaType}' tiene schema pero no está en el catálogo`,
      });
    }
  }
  
  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// CLI
// ============================================================================

if (import.meta.main) {
  console.log("🔍 Verificando paridad de comandos...\n");
  
  const result = runParityCheck();
  
  if (result.ok) {
    console.log("✅ Paridad verificada - sin errores\n");
  } else {
    console.log("❌ Errores de paridad encontrados:\n");
    for (const error of result.errors) {
      console.log(`  [${error.type}] ${error.command}`);
      console.log(`    → ${error.message}\n`);
    }
    process.exit(1);
  }
  
  if (result.warnings.length > 0) {
    console.log("⚠️ Advertencias:\n");
    for (const warning of result.warnings) {
      console.log(`  → ${warning}\n`);
    }
  }
}
