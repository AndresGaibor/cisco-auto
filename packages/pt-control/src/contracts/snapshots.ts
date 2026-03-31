/**
 * PT Control - Topology Snapshot Types
 *
 * Source of truth lives in @cisco-auto/types. This file now re-exports those
 * schemas so existing relative imports inside pt-control keep working while we
 * avoid divergence.
 */

export {
  PortStateSchema,
  DeviceTypeSchema,
  DeviceStateSchema,
  CableTypeSchema,
  LinkStateSchema,
  TopologySnapshotSchema,
  DeviceDeltaSchema,
  LinkDeltaSchema,
  TopologyDeltaSchema,
  createLinkId,
  createEmptySnapshot,
  calculateDelta,
} from '@cisco-auto/types';

export type {
  PortState,
  DeviceType,
  DeviceState,
  CableType,
  LinkState,
  TopologySnapshot,
  DeviceDelta,
  LinkDelta,
  TopologyDelta,
} from '@cisco-auto/types';
