export type StatusWarningSeverity = "info" | "warning" | "error";

export interface StructuredStatusWarning {
  code: string;
  severity: StatusWarningSeverity;
  message: string;
  actionable?: boolean;
}

export interface ReconcilerInput {
  health: any;
  heartbeat: any;
  bridge: any;
  context: any;
  projectStatus?: any;
  deviceInventory?: any;
  queue?: any;
}

function numberOrZero(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function inventoryCount(deviceInventory: any): number {
  if (Array.isArray(deviceInventory?.devices)) return deviceInventory.devices.length;
  if (Array.isArray(deviceInventory)) return deviceInventory.length;
  return numberOrZero(deviceInventory?.count);
}

export function buildReconciledStatusFromParts(input: ReconcilerInput) {
  const heartbeatState = String(input.heartbeat?.state ?? input.health?.heartbeatState ?? "unknown");
  const bridgeReady = input.bridge?.ready === true || input.health?.bridgeReady === true;

  const projectDeviceCount = numberOrZero(input.projectStatus?.deviceCount);
  const projectLinkCount = numberOrZero(input.projectStatus?.linkCount);
  const inventoryDeviceCount = inventoryCount(input.deviceInventory);

  const activeFile =
    input.projectStatus?.activeFile ??
    input.projectStatus?.savedFilename ??
    input.context?.activeFile ??
    null;

  const appReady = heartbeatState === "ok" && bridgeReady;
  const projectReady =
    input.projectStatus?.ok === true &&
    Boolean(activeFile) &&
    projectDeviceCount > 0;

  const inventoryReady = inventoryDeviceCount > 0;
  const commandReady = heartbeatState === "ok" && bridgeReady;
  const topologyUsable = projectReady || inventoryReady;

  const warnings: StructuredStatusWarning[] = [];

  if (topologyUsable && input.context?.topologyMaterialized === false) {
    warnings.push({
      code: "TOPOLOGY_CACHE_NOT_MATERIALIZED",
      severity: "info",
      message:
        "Internal topology cache is not materialized, but project/device inventory are usable.",
      actionable: false,
    });
  }

  if (!topologyUsable && input.context?.topologyMaterialized === false) {
    warnings.push({
      code: "TOPOLOGY_NOT_READY",
      severity: "warning",
      message:
        "Topology is not ready and no usable project/device inventory was found.",
      actionable: true,
    });
  }

  if (input.bridge?.leaseValid === false && commandReady) {
    warnings.push({
      code: "LEASE_NOT_HELD",
      severity: "info",
      message:
        "Bridge lease is not held, but heartbeat is ok and command execution may still be available.",
      actionable: false,
    });
  }

  if (heartbeatState !== "ok") {
    warnings.push({
      code: "HEARTBEAT_NOT_OK",
      severity: "warning",
      message: `Packet Tracer heartbeat is '${heartbeatState}'. Runtime commands may fail.`,
      actionable: true,
    });
  }

  const nextActions = topologyUsable
    ? [
        "Use pt_device op='list' to inspect exact device names.",
        "Use pt_cmd_run with profile='fast' for quick IOS show commands.",
        "Use pt_project op='status' to verify the active Packet Tracer file.",
      ]
    : [
        "Use pt_app op='status' to check whether Packet Tracer is running.",
        "Use pt_app op='open' with wait=true and a .pkt path.",
        "Call pt_status op='summary' again after opening the project.",
      ];

  const reconciled = {
    appReady,
    projectReady,
    inventoryReady,
    commandReady,
    topologyUsable,
    activeFile,
    projectDeviceCount,
    projectLinkCount,
    inventoryDeviceCount,
    queue: input.queue ?? null,
  };

  return {
    health: {
      ...input.health,
      bridgeReady,
      heartbeatState,
      topologyHealth: topologyUsable ? "usable" : input.health?.topologyHealth,
      warnings,
    },
    context: {
      ...input.context,
      topologyMaterialized: topologyUsable || Boolean(input.context?.topologyMaterialized),
      deviceCount: inventoryDeviceCount || numberOrZero(input.context?.deviceCount),
      linkCount: projectLinkCount || numberOrZero(input.context?.linkCount),
      projectDeviceCount,
      projectLinkCount,
      inventoryDeviceCount,
      activeFile,
      commandReady,
      topologyUsable,
    },
    reconciled,
    warnings,
    nextActions,
  };
}
