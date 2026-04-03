#!/usr/bin/env bun

/**
 * GENERADOR DE MODELO MAPA - FUENTE ÚNICA DE VERDAD
 * 
 * Extrae directamente de los archivos del catálogo de core.ts
 * No depende de imports compilados, solo de lectura de archivos.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// LEER CATÁLOGOS DIRECTAMENTE
// =============================================================================

interface CatalogEntry {
  model: string;
  type: string;
}

function extractModelsFromCatalog(filePath: string): CatalogEntry[] {
  const content = readFileSync(filePath, 'utf-8');
  const models: CatalogEntry[] = [];
  
  // Regex para extraer model y type
  const modelRegex = /model:\s*['"]([^'"]+)['"]/g;
  const typeRegex = /type:\s*['"]([^'"]+)['"]/g;
  
  const entries = content.match(/{\s*(?:id:|model:|type:)/g) || [];
  
  // Extraer bloques de dispositivos
  const blockRegex = /id:\s*['"]([^'"]+)['"][\s\S]*?model:\s*['"]([^'"]+)['"][\s\S]*?type:\s*['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = blockRegex.exec(content)) !== null) {
    models.push({
      model: match[2],
      type: match[3]
    });
  }
  
  return models;
}

console.log('📚 Extrayendo modelos desde catálogo de core...\n');

const catalogDir = join(__dirname, '../../../core/src/catalog');

// Leer todos los catálogos
const routers = extractModelsFromCatalog(join(catalogDir, 'routers.ts'));
const switches = extractModelsFromCatalog(join(catalogDir, 'switches.ts'));
const endDevices = extractModelsFromCatalog(join(catalogDir, 'end-devices.ts'));
const otherDevices = extractModelsFromCatalog(join(catalogDir, 'other-devices.ts'));
const wireless = extractModelsFromCatalog(join(catalogDir, 'wireless.ts'));
const security = extractModelsFromCatalog(join(catalogDir, 'security.ts'));

const allModels = [...routers, ...switches, ...endDevices, ...otherDevices, ...wireless, ...security];

console.log(`✅ Modelos encontrados: ${allModels.length}`);
console.log(`  - Routers: ${routers.length}`);
console.log(`  - Switches: ${switches.length}`);
console.log(`  - End devices: ${endDevices.length}`);
console.log(`  - Other: ${otherDevices.length}`);
console.log(`  - Wireless: ${wireless.length}`);
console.log(`  - Security: ${security.length}\n`);

// =============================================================================
// CONSTRUIR MAPAS
// =============================================================================

const PT_MODEL_MAP: Record<string, string> = {};
const PT_DEVICE_TYPE_MAP: Record<string, number> = {};

const TYPE_TO_NUM: Record<string, number> = {
  'router': 0,
  'switch': 1,
  'multilayer-switch': 1,
  'pc': 3,
  'server': 4,
  'printer': 5,
  'laptop': 3,
  'ip-phone': 3,
  'tablet': 3,
  'smartphone': 3,
  'tv': 3,
  'sniffer': 3,
  'wireless': 6,
  'access-point': 6,
  'cloud': 7,
  'modem': 7,
};

// Mapear cada modelo desde catálogo
for (const device of allModels) {
  const model = device.model;
  const typeNum = TYPE_TO_NUM[device.type] ?? 0;
  
  PT_MODEL_MAP[model.toLowerCase()] = model;
  PT_DEVICE_TYPE_MAP[model.toLowerCase()] = typeNum;
}

// Agregar aliases comunes
const COMMON_ALIASES: Record<string, string> = {
  '1841': '1841',
  '1941': '1941',
  '2811': '2811',
  '2901': '2901',
  '2911': '2911',
  '4331': '4331',
  '2620xm': '2620XM',
  '2621xm': '2621XM',
  'router': '1941',
  '2950': '2950-24',
  '2960': '2960-24TT-L',
  '3560': '3560-24PS',
  'switch': '2960-24TT-L',
  'pc': 'PC-PT',
  'laptop': 'Laptop-PT',
  'server': 'Server-PT',
  'cloud': 'Cloud-PT',
  'ap': 'AccessPoint-PT',
};

console.log('🔄 Agregando aliases comunes...');
for (const [alias, model] of Object.entries(COMMON_ALIASES)) {
  if (PT_MODEL_MAP[model.toLowerCase()]) {
    PT_MODEL_MAP[alias.toLowerCase()] = model;
    PT_DEVICE_TYPE_MAP[alias.toLowerCase()] = PT_DEVICE_TYPE_MAP[model.toLowerCase()]!;
  }
}

console.log(`✅ ${Object.keys(PT_MODEL_MAP).length} entradas en mapa\n`);

// =============================================================================
// GENERAR ARCHIVOS
// =============================================================================

// TypeScript
const tsCode = `// AUTO-GENERATED FROM CORE CATALOG
// Source: packages/core/src/catalog/
// DO NOT EDIT MANUALLY - Run: bun packages/pt-runtime/src/scripts/generate-validated-model-map.ts

export const PT_MODEL_MAP: Record<string, string> = ${JSON.stringify(PT_MODEL_MAP, null, 2)};

export const PT_DEVICE_TYPE_MAP: Record<string, number> = ${JSON.stringify(PT_DEVICE_TYPE_MAP, null, 2)};

/**
 * Valida si un modelo existe en el catálogo validado
 * @throws Error si el modelo no existe
 */
export function validatePTModel(model: string): string {
  const key = model.toLowerCase();
  if (!(key in PT_MODEL_MAP)) {
    throw new Error(\`Invalid device model: '\${model}'. Must be one of: \${Object.keys(PT_MODEL_MAP).join(', ')}\`);
  }
  return PT_MODEL_MAP[key];
}

/**
 * Obtiene el tipo PT para un modelo
 */
export function getPTDeviceType(model: string): number {
  const key = model.toLowerCase();
  return PT_DEVICE_TYPE_MAP[key] ?? 0;
}

/**
 * Obtiene todos los modelos válidos
 */
export function getAllValidModels(): string[] {
  return [...new Set(Object.values(PT_MODEL_MAP))];
}
`;

const tsPath = join(__dirname, '../value-objects/validated-models.ts');
writeFileSync(tsPath, tsCode);
console.log(`📝 TypeScript generado: ${tsPath}`);

// JavaScript (para PT runtime)
const jsCode = `// AUTO-GENERATED FROM CORE CATALOG
var PT_MODEL_MAP = ${JSON.stringify(PT_MODEL_MAP, null, 2)};
var PT_DEVICE_TYPE_MAP = ${JSON.stringify(PT_DEVICE_TYPE_MAP, null, 2)};

function validatePTModel(model) {
  var key = (model || '').toLowerCase();
  if (!(key in PT_MODEL_MAP)) {
    throw new Error("Invalid device model: '" + model + "'");
  }
  return PT_MODEL_MAP[key];
}

function getPTDeviceType(model) {
  var key = (model || '').toLowerCase();
  return PT_DEVICE_TYPE_MAP[key] || 0;
}
`;

const jsPath = join(__dirname, '../templates/generated-validated-models.js');
writeFileSync(jsPath, jsCode);
console.log(`📝 JavaScript generado: ${jsPath}\n`);

console.log('═'.repeat(60));
console.log('📊 RESUMEN FINAL');
console.log('═'.repeat(60));
console.log(`Modelos únicos: ${Object.keys(PT_MODEL_MAP).length}`);

const byType: Record<number, number> = {};
for (const type of Object.values(PT_DEVICE_TYPE_MAP)) {
  byType[type] = (byType[type] || 0) + 1;
}

const typeNames: Record<number, string> = {
  0: 'Router', 1: 'Switch', 3: 'PC', 4: 'Server', 6: 'Wireless', 7: 'Cloud'
};

console.log('\nPor tipo:');
for (const [type, count] of Object.entries(byType).sort()) {
  const name = typeNames[parseInt(type)] || 'Other';
  console.log(`  ${name.padEnd(12)}: ${count}`);
}

console.log('\n✅ Validación lista');
console.log('💡 Uso: import { validatePTModel } from "./value-objects/validated-models"');
console.log('   validatePTModel("2960") // → "2960-24TT-L" o throw');
