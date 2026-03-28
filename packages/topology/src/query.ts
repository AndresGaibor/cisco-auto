import type {
  DeviceInfo,
  DeviceQuery,
  FullQuery,
  LinkInfo,
  LinkQuery,
  TopologyQuery,
  TopologyQueryOptions,
  TopologyResult,
} from './types';

export interface TopologyNodeLike {
  name?: string;
  id?: string;
  type?: string;
  ip?: string;
  ports?: Array<{ name?: string } | string>;
}

export interface TopologyLinkLike {
  from?: string;
  to?: string;
  device1?: string;
  device2?: string;
  port1?: string;
  port2?: string;
  fromPort?: string;
  toPort?: string;
  cableType?: string;
}

export interface TopologySourceLike {
  devices?: Record<string, TopologyNodeLike> | TopologyNodeLike[];
  links?: Record<string, TopologyLinkLike> | TopologyLinkLike[];
}

/**
 * Consulta una topología compatible con PT control v2.
 */
export function queryTopology(
  query: TopologyQuery,
  source?: TopologySourceLike | null,
): TopologyResult {
  if (!source) {
    return {
      found: false,
      error: 'No hay topología disponible',
    };
  }

  const devices = collectDevices(source.devices);
  const links = collectLinks(source.links);

  switch (query.type) {
    case 'device':
      return queryDevice(devices, query);
    case 'link':
      return queryLinks(links, devices, query);
    case 'full':
      return queryFull(devices, links, query);
  }
}

function queryDevice(
  devices: DeviceInfo[],
  query: DeviceQuery,
): TopologyResult {
  const device = devices.find((entry) => entry.name === query.name);

  if (!device) {
    return { found: false };
  }

  if (!matchesDeviceType(device, query.options)) {
    return { found: false };
  }

  return {
    found: true,
    device: applyDeviceOptions(device, query.options),
  };
}

function queryLinks(
  links: LinkInfo[],
  devices: DeviceInfo[],
  query: LinkQuery,
): TopologyResult {
  const matchingLinks = query.between
    ? links.filter((link) => matchesBetween(link, query.between!))
    : query.device
      ? links.filter((link) => link.from === query.device || link.to === query.device)
      : links;

  const filteredLinks = query.options?.deviceType
    ? matchingLinks.filter((link) => {
        const endpointDevices = [link.from, link.to]
          .map((name) => devices.find((device) => device.name === name))
          .filter((device): device is DeviceInfo => Boolean(device));

        return endpointDevices.some((device) => matchesDeviceType(device, query.options));
      })
    : matchingLinks;

  if (filteredLinks.length === 0) {
    return { found: false, links: [] };
  }

  return {
    found: true,
    links: filteredLinks.map((link) => applyLinkOptions(link, query.options)),
  };
}

function queryFull(
  devices: DeviceInfo[],
  links: LinkInfo[],
  query: FullQuery,
): TopologyResult {
  const filteredDevices = query.options?.deviceType
    ? devices.filter((device) => matchesDeviceType(device, query.options))
    : devices;

  const normalizedDevices = filteredDevices.map((device) => applyDeviceOptions(device, query.options));
  const normalizedLinks = links.map((link) => applyLinkOptions(link, query.options));

  return {
    found: normalizedDevices.length > 0 || normalizedLinks.length > 0,
    devices: normalizedDevices,
    links: normalizedLinks,
  };
}

function collectDevices(source: TopologySourceLike['devices']): DeviceInfo[] {
  if (!source) {
    return [];
  }

  if (Array.isArray(source)) {
    return source.map((entry) => toDeviceInfo(entry, entry.name ?? entry.id ?? 'unknown'));
  }

  return Object.entries(source).map(([name, entry]) => toDeviceInfo(entry, name));
}

function collectLinks(source: TopologySourceLike['links']): LinkInfo[] {
  if (!source) {
    return [];
  }

  if (Array.isArray(source)) {
    return source.map((entry) => toLinkInfo(entry));
  }

  return Object.values(source).map((entry) => toLinkInfo(entry));
}

function toDeviceInfo(device: TopologyNodeLike, fallbackName: string): DeviceInfo {
  const info: DeviceInfo = {
    name: device.name ?? device.id ?? fallbackName,
  };

  if (device.type) {
    info.type = device.type;
  }

  if (device.ip) {
    info.ip = device.ip;
  }

  const ports = normalizePorts(device.ports);
  if (ports.length > 0) {
    info.ports = ports;
  }

  return info;
}

function toLinkInfo(link: TopologyLinkLike): LinkInfo {
  const from = link.from ?? link.device1 ?? 'unknown';
  const to = link.to ?? link.device2 ?? 'unknown';

  const info: LinkInfo = {
    from,
    to,
  };

  if (link.port1 || link.fromPort) {
    info.fromPort = link.port1 ?? link.fromPort;
  }

  if (link.port2 || link.toPort) {
    info.toPort = link.port2 ?? link.toPort;
  }

  if (link.cableType) {
    info.cableType = link.cableType;
  }

  return info;
}

function normalizePorts(ports?: Array<{ name?: string } | string>): string[] {
  if (!ports) {
    return [];
  }

  return ports
    .map((port) => (typeof port === 'string' ? port : port.name))
    .filter((port): port is string => Boolean(port));
}

function matchesBetween(link: LinkInfo, between: [string, string]): boolean {
  return (
    (link.from === between[0] && link.to === between[1]) ||
    (link.from === between[1] && link.to === between[0])
  );
}

function matchesDeviceType(device: DeviceInfo, options?: TopologyQueryOptions): boolean {
  if (!options?.deviceType) {
    return true;
  }

  const expected = normalizeText(options.deviceType);
  const actual = normalizeText(device.type ?? '');

  if (!actual) {
    return false;
  }

  return actual.includes(expected);
}

function applyDeviceOptions(device: DeviceInfo, options?: TopologyQueryOptions): DeviceInfo {
  const result: DeviceInfo = {
    name: device.name,
  };

  if (device.type) {
    result.type = device.type;
  }

  if (options?.includeIPs !== false && device.ip) {
    result.ip = device.ip;
  }

  if (options?.includePorts !== false && device.ports) {
    result.ports = [...device.ports];
  }

  return result;
}

function applyLinkOptions(link: LinkInfo, options?: TopologyQueryOptions): LinkInfo {
  const result: LinkInfo = {
    from: link.from,
    to: link.to,
  };

  if (link.fromPort) {
    result.fromPort = link.fromPort;
  }

  if (link.toPort) {
    result.toPort = link.toPort;
  }

  if (options?.includeCableTypes !== false && link.cableType) {
    result.cableType = link.cableType;
  }

  return result;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}
