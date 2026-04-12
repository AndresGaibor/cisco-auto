// packages/types/src/pt-api/validate-catalog-consistency.ts
// Validador de consistencia entre CommandCatalog y CommandPayloadTypeMap
// Usa type-level checking para verificar consistencia

import type { CommandCatalogEntry } from "../command-catalog";
import { COMMAND_CATALOG } from "../command-catalog";

/**
 * Lista de todos los payload types definidos en CommandPayloadTypeMap.
 * Mantener sincronizado con pt-commands.ts CommandPayloadTypeMap interface.
 */
export const PAYLOAD_TYPE_NAMES = [
  "addDevice",
  "removeDevice",
  "listDevices",
  "renameDevice",
  "moveDevice",
  "clearTopology",
  "addModule",
  "removeModule",
  "addLink",
  "removeLink",
  "syncLinks",
  "configHost",
  "configureDhcpServer",
  "inspectDhcpServer",
  "configDhcpServer",
  "ensureVlans",
  "configVlanInterfaces",
  "configIos",
  "execIos",
  "execInteractive",
  "execPc",
  "snapshot",
  "inspect",
  "hardwareInfo",
  "hardwareCatalog",
  "commandLog",
  "listCanvasRects",
  "getRect",
  "devicesInRect",
  "resolveCapabilities",
  "__healthcheck__",
  "__pollDeferred",
] as const;

export type PayloadTypeName = typeof PAYLOAD_TYPE_NAMES[number];

/**
 * Verifica que todos los comandos del catálogo tengan un tipo de payload definido.
 */
export function getMissingPayloadTypes(): string[] {
  const catalogTypes = new Set(COMMAND_CATALOG.map(c => c.type));
  const payloadTypes = new Set(PAYLOAD_TYPE_NAMES);
  
  const missing: string[] = [];
  
  for (const type of catalogTypes) {
    if (!payloadTypes.has(type as any)) {
      missing.push(type);
    }
  }
  
  return missing;
}

/**
 * Verifica que todos los payload types existan en el catálogo.
 */
export function getOrphanPayloadTypes(): string[] {
  const catalogTypes = new Set(COMMAND_CATALOG.map(c => c.type));
  const payloadTypes = new Set(PAYLOAD_TYPE_NAMES);
  
  const orphan: string[] = [];
  
  for (const type of payloadTypes) {
    if (!catalogTypes.has(type)) {
      orphan.push(type);
    }
  }
  
  return orphan;
}

/**
 * Valida la consistencia completa entre catálogo y payload map.
 */
export interface CatalogConsistencyResult {
  valid: boolean;
  missingPayloadTypes: string[];
  orphanPayloadTypes: string[];
  totalCatalogCommands: number;
  totalPayloadTypes: number;
}

export function validateCatalogPayloadConsistency(): CatalogConsistencyResult {
  const missing = getMissingPayloadTypes();
  const orphan = getOrphanPayloadTypes();
  
  return {
    valid: missing.length === 0 && orphan.length === 0,
    missingPayloadTypes: missing,
    orphanPayloadTypes: orphan,
    totalCatalogCommands: COMMAND_CATALOG.length,
    totalPayloadTypes: PAYLOAD_TYPE_NAMES.length,
  };
}

/**
 * Helper para obtener el tipo de payload de un comando dado.
 */
export type PayloadForCommand<T extends string> = T extends typeof PAYLOAD_TYPE_NAMES[number]
  ? T
  : never;
