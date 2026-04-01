export type DeviceTypeValue = string | number | null | undefined;

const DEVICE_TYPE_MAP: Record<number, string> = {
  0: 'router',
  1: 'switch',
  2: 'hub',
  3: 'pc',
  4: 'server',
  5: 'printer',
  6: 'wireless',
  7: 'cloud',
  8: 'pc',
  45: 'power_distribution',
};

export function formatDeviceType(type: DeviceTypeValue): string {
  if (typeof type === 'string' && type.trim() !== '') {
    return type;
  }

  if (typeof type === 'number' && Number.isFinite(type)) {
    return DEVICE_TYPE_MAP[type] ?? `type-${type}`;
  }

  return 'unknown';
}
