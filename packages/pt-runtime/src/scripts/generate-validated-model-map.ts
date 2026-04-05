#!/usr/bin/env bun

/**
 * Genera PT_MODEL_MAP y PT_DEVICE_TYPE_MAP desde el catálogo de core.
 *
 * La fuente de verdad es `packages/core/src/catalog/`.
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { allDeviceTypes } from '../ptbuilder-spec.ts';
import {
  PT_MODEL_ALIASES,
  PT_NON_CREATABLE_MODELS,
  buildPtModelMap,
  getCreatableCatalogDevices,
  isNonCreatableModel,
} from '../../../core/src/catalog/pt-registry.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const normalize = (value: string): string => String(value || '').trim().toLowerCase();

const creatableDevices = getCreatableCatalogDevices();
const PT_MODEL_MAP = buildPtModelMap();
const PT_DEVICE_TYPE_MAP: Record<string, number> = {};

function getTypeIdForModel(model: string): number {
  const direct = (allDeviceTypes as Record<string, number>)[model];
  if (typeof direct === 'number') {
    return direct;
  }

  const normalized = normalize(model);
  for (const [key, value] of Object.entries(allDeviceTypes as Record<string, number>)) {
    if (normalize(key) === normalized) {
      return value;
    }
  }

  return 0;
}

for (const device of creatableDevices) {
  PT_DEVICE_TYPE_MAP[normalize(device.model)] = getTypeIdForModel(device.model);
}

for (const [alias, canonical] of Object.entries(PT_MODEL_ALIASES)) {
  if (PT_MODEL_MAP[normalize(canonical)]) {
    PT_DEVICE_TYPE_MAP[normalize(alias)] = PT_DEVICE_TYPE_MAP[normalize(canonical)] ?? getTypeIdForModel(canonical);
  }
}

const nonCreatableSet = new Set(PT_NON_CREATABLE_MODELS.map((model) => normalize(model)));

console.log('📚 Generando mapas desde catálogo de core...\n');
console.log(`✅ Modelos creatables: ${creatableDevices.length}`);
console.log(`✅ Modelos auto-creados: ${nonCreatableSet.size}\n`);

const tsCode = [
  '// AUTO-GENERATED FROM CORE CATALOG',
  '// Source: packages/core/src/catalog/',
  '// DO NOT EDIT MANUALLY - Run: bun packages/pt-runtime/src/scripts/generate-validated-model-map.ts',
  '',
  `export const PT_MODEL_MAP: Record<string, string> = ${JSON.stringify(PT_MODEL_MAP, null, 2)};`,
  '',
  `export const PT_DEVICE_TYPE_MAP: Record<string, number> = ${JSON.stringify(PT_DEVICE_TYPE_MAP, null, 2)};`,
  '',
  `export const PT_NON_CREATABLE_MODELS: string[] = ${JSON.stringify([...PT_NON_CREATABLE_MODELS], null, 2)};`,
  '',
  '/**',
  ' * Valida si un modelo existe en el catálogo validado.',
  ' * @throws Error si el modelo no existe o es auto-creado.',
  ' */',
  'export function validatePTModel(model: string): string {',
  '  const key = model.toLowerCase();',
  '  if (PT_NON_CREATABLE_MODELS.some((item) => item.toLowerCase() === key)) {',
  '    throw new Error(`Invalid device model: \'${model}\'. This model is auto-created by Packet Tracer and cannot be added manually.`);',
  '  }',
  '  if (!(key in PT_MODEL_MAP)) {',
  '    throw new Error(`Invalid device model: \'${model}\'. Must be one of: ${Object.keys(PT_MODEL_MAP).join(", ")}`);',
  '  }',
  '  return PT_MODEL_MAP[key];',
  '}',
  '',
  '/**',
  ' * Obtiene el tipo PT para un modelo.',
  ' */',
  'export function getPTDeviceType(model: string): number {',
  '  const key = model.toLowerCase();',
  '  return PT_DEVICE_TYPE_MAP[key] ?? 0;',
  '}',
  '',
  '/**',
  ' * Obtiene todos los modelos válidos.',
  ' */',
  'export function getAllValidModels(): string[] {',
  '  return [...new Set(Object.values(PT_MODEL_MAP))];',
  '}',
  '',
  '/**',
  ' * Indica si un modelo es auto-creado por Packet Tracer.',
  ' */',
  'export function isNonCreatableModel(model: string): boolean {',
  '  return PT_NON_CREATABLE_MODELS.some((item) => item.toLowerCase() === model.toLowerCase());',
  '}',
  '',
].join('\n');

const tsPath = join(__dirname, '../value-objects/validated-models.ts');
writeFileSync(tsPath, tsCode);
console.log(`📝 TypeScript generado: ${tsPath}`);

const jsCode = `// AUTO-GENERATED FROM CORE CATALOG
var PT_MODEL_MAP = ${JSON.stringify(PT_MODEL_MAP, null, 2)};
var PT_DEVICE_TYPE_MAP = ${JSON.stringify(PT_DEVICE_TYPE_MAP, null, 2)};
var PT_NON_CREATABLE_MODELS = ${JSON.stringify([...PT_NON_CREATABLE_MODELS], null, 2)};

function validatePTModel(model) {
  var key = (model || '').toLowerCase();
  for (var i = 0; i < PT_NON_CREATABLE_MODELS.length; i++) {
    if (String(PT_NON_CREATABLE_MODELS[i]).toLowerCase() === key) {
      throw new Error("Invalid device model: '" + model + "'. This model is auto-created by Packet Tracer and cannot be added manually.");
    }
  }
  if (!(key in PT_MODEL_MAP)) {
    throw new Error("Invalid device model: '" + model + "'. Must be one of: " + Object.keys(PT_MODEL_MAP).join(', '));
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
console.log(`Modelos válidos: ${Object.keys(PT_MODEL_MAP).length}`);
console.log(`Auto-creados excluidos: ${PT_NON_CREATABLE_MODELS.length}`);
console.log('\n✅ Validación lista');
console.log('💡 Uso: import { validatePTModel } from "./value-objects/validated-models"');
console.log('   validatePTModel("2960") // → "2960-24TT" o throw');
