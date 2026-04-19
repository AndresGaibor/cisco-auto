// ============================================================================
// Device Handlers - Entry point and aggregator
// ============================================================================

import type { HandlerDeps } from "../utils/helpers";
import {
  handleAddDevice,
  handleRemoveDevice,
  handleRenameDevice,
  handleMoveDevice,
} from "./device-crud";
import { handleListDevices } from "./device-discovery";

export * from "./device-crud";
export * from "./device-discovery";
export * from "./device-listing";
