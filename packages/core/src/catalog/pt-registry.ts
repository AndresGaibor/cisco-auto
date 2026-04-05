/**
 * Registro PT - helpers programáticos para modelos y puertos.
 *
 * Centraliza la lógica que usan los generadores de pt-runtime.
 */

import { deviceCatalog } from './service';
import { generatePorts, getTotalPorts, type DeviceCatalogEntry } from './schema';

export const PT_DEFAULT_MODEL = '1941';

export const PT_NON_CREATABLE_MODELS = [
  'Power Distribution Device',
  'Copper Patch Panel',
  'Fiber Patch Panel',
  'Copper Wall Mount',
  'Fiber Wall Mount',
] as const;

export const PT_MODEL_ALIASES: Record<string, string> = {
  router: '1941',
  switch: '2960-24TT',
  pc: 'PC-PT',
  laptop: 'Laptop-PT',
  server: 'Server-PT',
  cloud: 'Cloud-PT',
  printer: 'Printer-PT',
  ap: 'AccessPoint-PT',
  accesspoint: 'AccessPoint-PT',
  wrt300n: 'WRT300N',
  'linksys-wrt300n': 'WRT300N',
  'homerouter-pt-ac': 'HomeRouter-PT-AC',
  '2960': '2960-24TT',
  '2960-24tt-l': '2960-24TT',
  '3560-24ps-l': '3560-24PS',
  '819hg-4g-iox': '819',
  '819hgw': '819',
  'router-pt-empty': 'Router-PT',
  'cloud-pt-empty': 'Cloud-PT',
  'switch-pt': 'Switch-PT',
  'switch-pt-empty': 'Switch-PT',
  'hub-pt': 'Hub-PT',
  'wiredenddevice-pt': 'WiredDevice-PT',
  '3702i': '3702i',
  'aironet-3702i': '3702i',
  '5506-x': '5506-X',
  'asa-5505': '5505',
  'asa-5506': '5506-X',
  'ie-2000': 'IE-2000',
  'ie2000': 'IE-2000',
  'ir8340': 'IR-8340',
  '5505': '5505',
  '5506': '5506-X',
  'isa-3000': 'ISA-3000',
};

export interface PTDeviceSummary {
  model: string;
  portNames: string[];
  totalPorts: number;
  isGeneric?: boolean;
  isLegacy?: boolean;
}

function normalizeKey(value: string): string {
  return String(value || '').trim().toLowerCase();
}

export function isNonCreatableModel(model: string): boolean {
  const key = normalizeKey(model);
  return PT_NON_CREATABLE_MODELS.some((item) => normalizeKey(item) === key);
}

export function getCreatableCatalogDevices(): DeviceCatalogEntry[] {
  return deviceCatalog.getAll().filter((device) => !isNonCreatableModel(device.model));
}

export function buildPtModelMap(): Record<string, string> {
  const map: Record<string, string> = {};

  for (const device of getCreatableCatalogDevices()) {
    map[normalizeKey(device.model)] = device.model;
  }

  for (const [alias, model] of Object.entries(PT_MODEL_ALIASES)) {
    if (map[normalizeKey(model)]) {
      map[normalizeKey(alias)] = model;
    }
  }

  return map;
}

export function buildPtPortMap(): Record<string, Record<string, string>> {
  const map: Record<string, Record<string, string>> = {};

  for (const device of getCreatableCatalogDevices()) {
    const ports: Record<string, string> = {};
    for (const portDef of device.fixedPorts || []) {
      for (const portName of generatePorts(portDef)) {
        ports[normalizeKey(portName)] = portDef.connector;
      }
    }

    map[device.model] = ports;

    for (const [alias, canonical] of Object.entries(PT_MODEL_ALIASES)) {
      if (normalizeKey(canonical) === normalizeKey(device.model)) {
        map[alias] = ports;
      }
    }
  }

  return map;
}

export function buildPtDeviceSummaries(): Record<string, PTDeviceSummary> {
  const summaries: Record<string, PTDeviceSummary> = {};

  for (const device of getCreatableCatalogDevices()) {
    summaries[device.model] = {
      model: device.model,
      portNames: device.fixedPorts.flatMap((port) => generatePorts(port)),
      totalPorts: getTotalPorts(device.fixedPorts),
      isGeneric: device.isGeneric,
      isLegacy: device.isLegacy,
    };
  }

  return summaries;
}
