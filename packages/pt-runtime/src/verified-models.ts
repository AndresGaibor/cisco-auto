/**
 * Fuente de verdad tipada para modelos verificados en Packet Tracer.
 *
 * Esta capa se apoya en `ptbuilder-spec.ts`, que contiene el mapa oficial
 * de deviceTypes, linkTypes y moduleTypes extraído de PTBuilder.
 */

import { allDeviceTypes, getPTDeviceType } from './ptbuilder-spec';

export const PTDeviceTypeNames: Record<number, string> = {
  0: 'router',
  1: 'switch',
  2: 'cloud',
  7: 'wireless',
  8: 'pc',
  9: 'server',
  10: 'printer',
  11: 'wireless-router',
  16: 'multilayer-switch',
  18: 'laptop',
  34: 'iot',
  41: 'wlc',
  44: 'aironet',
} as const;

export const VERIFIED_MODELS = {
  routers: {
    '1841': { model: '1841', type: 0, verified: true },
    '1941': { model: '1941', type: 0, verified: true },
    '2811': { model: '2811', type: 0, verified: true },
    '2901': { model: '2901', type: 0, verified: true },
    '2911': { model: '2911', type: 0, verified: true },
    '4331': { model: '4331', type: 0, verified: true },
  } as const,
  switches: {
    '2950-24': { model: '2950-24', type: 1, verified: true },
    '2950T-24': { model: '2950T-24', type: 1, verified: true },
    '2960-24TT': { model: '2960-24TT', type: 1, verified: true },
    '3560-24PS': { model: '3560-24PS', type: 16, verified: true },
    '3650-24PS': { model: '3650-24PS', type: 16, verified: true },
  } as const,
  wireless: {
    'AccessPoint-PT': { model: 'AccessPoint-PT', type: 7, verified: true },
    'AccessPoint-PT-A': { model: 'AccessPoint-PT-A', type: 7, verified: true },
    'AccessPoint-PT-AC': { model: 'AccessPoint-PT-AC', type: 7, verified: true },
    'AccessPoint-PT-N': { model: 'AccessPoint-PT-N', type: 7, verified: true },
    'Linksys-WRT300N': { model: 'Linksys-WRT300N', type: 11, verified: true },
  } as const,
  endDevices: {
    'PC-PT': { model: 'PC-PT', type: 8, verified: true },
    'Laptop-PT': { model: 'Laptop-PT', type: 18, verified: true },
    'Server-PT': { model: 'Server-PT', type: 9, verified: true },
    'Printer-PT': { model: 'Printer-PT', type: 10, verified: true },
    'Cloud-PT': { model: 'Cloud-PT', type: 2, verified: true },
  } as const,
} as const;

export const MODEL_ALIASES: Record<string, string> = {
  '1841': '1841',
  '1941': '1941',
  '2811': '2811',
  '2901': '2901',
  '2911': '2911',
  '4331': '4331',
  '2950': '2950-24',
  '2950-24': '2950-24',
  '2950t-24': '2950T-24',
  '3560': '3560-24PS',
  '3650': '3650-24PS',
  '2960': '2960-24TT',
  '2960-24': '2960-24TT',
  '2960-24tt': '2960-24TT',
  '3560-24ps': '3560-24PS',
  '3650-24ps': '3650-24PS',
  '3560-24PS': '3560-24PS',
  '3650-24PS': '3650-24PS',
  'wrt300n': 'Linksys-WRT300N',
  'wireless': 'AccessPoint-PT',
  'accesspoint': 'AccessPoint-PT',
  'pc': 'PC-PT',
  'laptop': 'Laptop-PT',
  'server': 'Server-PT',
  'printer': 'Printer-PT',
  'cloud': 'Cloud-PT',
} as const;

export type VerifiedModel =
  | keyof typeof VERIFIED_MODELS.routers
  | keyof typeof VERIFIED_MODELS.switches
  | keyof typeof VERIFIED_MODELS.wireless
  | keyof typeof VERIFIED_MODELS.endDevices;

export type ModelAlias = keyof typeof MODEL_ALIASES;

export type ModelInfo = {
  model: string;
  type: number;
  verified: true;
};

const VERIFIED_INDEX: Record<string, ModelInfo> = {};

for (const category of Object.values(VERIFIED_MODELS)) {
  for (const [key, info] of Object.entries(category)) {
    VERIFIED_INDEX[key] = info as ModelInfo;
  }
}

export function getVerifiedModel(modelOrAlias: VerifiedModel | ModelAlias): ModelInfo | undefined {
  const resolved = MODEL_ALIASES[modelOrAlias as ModelAlias] || modelOrAlias;
  return VERIFIED_INDEX[resolved];
}

export function isVerifiedModel(model: string): model is VerifiedModel {
  return Boolean(getVerifiedModel(model as VerifiedModel));
}

export function getDeviceType(modelOrAlias: string): number {
  const resolved = MODEL_ALIASES[modelOrAlias as ModelAlias] || modelOrAlias;
  const type = getPTDeviceType(resolved);
  if (type === undefined) {
    throw new Error(`Modelo no verificado: ${modelOrAlias}`);
  }
  return type;
}

export function resolveModel(alias: string): string {
  return MODEL_ALIASES[alias as ModelAlias] || alias;
}

export function listVerifiedModels(): VerifiedModel[] {
  return [
    ...Object.keys(VERIFIED_MODELS.routers),
    ...Object.keys(VERIFIED_MODELS.switches),
    ...Object.keys(VERIFIED_MODELS.wireless),
    ...Object.keys(VERIFIED_MODELS.endDevices),
  ] as VerifiedModel[];
}

export function listModelsByCategory(category: 'routers' | 'switches' | 'wireless' | 'endDevices'): string[] {
  return Object.keys(VERIFIED_MODELS[category]);
}

export function generateES5ModelMap(): string {
  const modelMap: Record<string, string> = {};
  const typeMap: Record<string, number> = {};

  for (const model of listVerifiedModels()) {
    const info = getVerifiedModel(model as VerifiedModel);
    if (!info) continue;
    modelMap[model.toLowerCase()] = info.model;
    typeMap[model.toLowerCase()] = info.type;
  }

  for (const [alias, model] of Object.entries(MODEL_ALIASES)) {
    const info = getVerifiedModel(model as VerifiedModel);
    if (!info) continue;
    modelMap[alias.toLowerCase()] = model;
    typeMap[alias.toLowerCase()] = info.type;
  }

  return `var PT_MODEL_MAP = ${JSON.stringify(modelMap, null, 2)};\n\nvar PT_DEVICE_TYPE_MAP = ${JSON.stringify(typeMap, null, 2)};`;
}

export default {
  VERIFIED_MODELS,
  MODEL_ALIASES,
  PTDeviceTypeNames,
  getVerifiedModel,
  isVerifiedModel,
  getDeviceType,
  resolveModel,
  listVerifiedModels,
  listModelsByCategory,
  generateES5ModelMap,
};
