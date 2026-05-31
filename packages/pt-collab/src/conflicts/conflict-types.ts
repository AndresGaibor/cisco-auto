export type CollabConflictType =
  | "device.concurrent_edit"
  | "port.already_used"
  | "device.removed_vs_edited"
  | "vlan.name_conflict"
  | "config.concurrent_section_edit"
  | "link.port_busy"
  | "xml.unsafe_merge"
  | "checkpoint.discard_pending_changes";

export interface CollabConflict {
  id: string;
  roomId: string;
  type: CollabConflictType;
  scope: string;
  createdAt: string;
  resolvedAt?: string;
  resolution?: ConflictResolution;
  peerIds: string[];
  description: string;
  deltas?: string[];
}

export type ConflictResolutionKind = "take_local" | "take_remote" | "checkpoint" | "auto_merge";

export interface ConflictResolution {
  kind: ConflictResolutionKind;
  resolvedBy: string;
  resolvedAt: string;
  checkpointId?: string;
  notes?: string;
}

export type ConflictDecision =
  | { action: "apply"; reason: string }
  | { action: "autoMerge"; reason: string; mergedDelta: unknown }
  | { action: "conflict"; reason: string; conflict: Omit<CollabConflict, "id" | "createdAt"> }
  | { action: "resync"; reason: string; checkpointId?: string };
