import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePTModel } from './validated-models.js';

type PortMap = Record<string, Record<string, string>>;
type ModuleCatalog = Record<string, { code: string; slotType: string; name: string }>;
type DeviceModuleSlots = Record<string, { type: string; count: number; supportedModules: string[] }[]>;

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedPortMapPath = join(__dirname, '../templates/generated-port-map.ts');
const generatedModuleMapPath = join(__dirname, '../templates/generated-module-map.ts');

function extractObjectLiteral(source: string, variableName: string): string {
  const match = source.match(new RegExp(`var ${variableName} = (\\{[\\s\\S]*?\\});`));
  return match?.[1] ?? '{}';
}

function loadGeneratedPortMap(): PortMap {
  try {
    const content = readFileSync(generatedPortMapPath, 'utf-8');
    return Function(`return (${extractObjectLiteral(content, 'PT_PORT_MAP')});`)() as PortMap;
  } catch {
    return {};
  }
}

function loadGeneratedModuleMap(): { catalog: ModuleCatalog; slots: DeviceModuleSlots } {
  try {
    const content = readFileSync(generatedModuleMapPath, 'utf-8');
    return {
      catalog: Function(`return (${extractObjectLiteral(content, 'PT_MODULE_CATALOG')});`)() as ModuleCatalog,
      slots: Function(`return (${extractObjectLiteral(content, 'PT_DEVICE_MODULE_SLOTS')});`)() as DeviceModuleSlots,
    };
  } catch {
    return { catalog: {}, slots: {} };
  }
}

export const PT_PORT_MAP = loadGeneratedPortMap();
export const { catalog: PT_MODULE_CATALOG, slots: PT_DEVICE_MODULE_SLOTS } = loadGeneratedModuleMap();

export function validatePortExists(deviceModel: string, portName: string): { valid: boolean; error?: string; connector?: string } {
  const rawModel = (deviceModel || '').trim();
  const requestedModel = (() => {
    try {
      return validatePTModel(rawModel);
    } catch {
      return rawModel;
    }
  })();
  const modelKeys = Array.from(new Set([
    requestedModel,
    requestedModel.toLowerCase(),
    requestedModel.toUpperCase(),
    rawModel,
    rawModel.toLowerCase(),
    rawModel.toUpperCase(),
  ].filter(Boolean)));
  const ports = modelKeys.map((key) => PT_PORT_MAP[key]).find((value) => value);

  if (!ports) {
    return { valid: false, error: `Modelo '${deviceModel}' no encontrado en PT_PORT_MAP` };
  }

  const requested = (portName || '').replace(/\s+/g, '').toLowerCase();
  const connector = ports[requested];

  if (!connector) {
    return { valid: false, error: `Puerto '${portName}' no existe en ${deviceModel}` };
  }

  return { valid: true, connector };
}

export function validateModuleExists(moduleCode: string): { valid: boolean; error?: string; module?: { code: string; slotType: string; name: string } } {
  const moduleKey = (moduleCode || '').toUpperCase();
  const moduleInfo = PT_MODULE_CATALOG[moduleKey];

  if (!moduleInfo) {
    return { valid: false, error: `Módulo '${moduleCode}' no encontrado en catálogo` };
  }

  return { valid: true, module: moduleInfo };
}

export function validateModuleSlotCompatible(deviceModel: string, slot: number | string, moduleCode: string): { valid: boolean; error?: string } {
  const modelKey = (deviceModel || '').toLowerCase();
  const deviceSlots = PT_DEVICE_MODULE_SLOTS[modelKey];
  const moduleInfo = validateModuleExists(moduleCode);

  if (!deviceSlots) {
    return { valid: false, error: `Modelo '${deviceModel}' no tiene información de slots de módulos` };
  }

  if (!moduleInfo.valid || !moduleInfo.module) {
    return { valid: false, error: moduleInfo.error ?? `Módulo '${moduleCode}' no encontrado` };
  }

  const slotIndex = typeof slot === 'number' ? slot : parseInt(String(slot).replace(/[^0-9]/g, ''), 10) || 0;
  const slotInfo = deviceSlots[slotIndex];

  if (!slotInfo) {
    return { valid: false, error: `Slot '${slot}' no existe en ${deviceModel}` };
  }

  if (moduleInfo.module.slotType !== slotInfo.type) {
    const supported = slotInfo.supportedModules?.join(', ') || 'ninguno';
    return { valid: false, error: `Módulo '${moduleCode}' no compatible con slot ${slot} en ${deviceModel}. Compatibles: ${supported}` };
  }

  return { valid: true };
}
