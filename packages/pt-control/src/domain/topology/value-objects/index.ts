// ============================================================================
// Topology Value Objects - Exports
// ============================================================================

export {
  DeviceId,
  parseDeviceId,
  parseOptionalDeviceId,
  isValidDeviceId,
} from './device-id.js';

export {
  PortId,
  parsePortId,
  parsePortIdString,
  isValidPortId,
} from './port-id.js';

export {
  LinkId,
  parseLinkId,
  parseLinkIdString,
  isValidLinkId,
} from './link-id.js';

export {
  Coordinate2D,
  parseCoordinate2D,
  parseCoordinate2DObject,
  isValidCoordinate2D,
} from './coordinate-2d.js';

export {
  CableMedia,
  parseCableMediaFromType,
  parseCableMedia,
  isValidCableType,
  type CableMediaType,
} from './cable-media.js';

export {
  ColorHex,
  parseColorHex,
  parseOptionalColorHex,
  isValidColorHex,
  inferVlanFromColor,
} from './color-hex.js';

export {
  ZoneGeometry,
  parseZoneGeometry,
  parseZoneGeometryFromPosition,
  isValidZoneGeometry,
} from './zone-geometry.js';
