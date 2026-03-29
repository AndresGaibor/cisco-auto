// ============================================================================
// Agent Session State
// ============================================================================

import type { AgentSessionState } from "../contracts/twin-types.js";

export const DEFAULT_SESSION_STATE: AgentSessionState = {
  selectedDevice: undefined,
  selectedZone: undefined,
  focusDevices: [],
  lastTask: undefined,
  lastPlan: undefined,
  verbosity: "normal",
};

export function createSessionState(
  partial?: Partial<AgentSessionState>
): AgentSessionState {
  return {
    ...DEFAULT_SESSION_STATE,
    ...partial,
  };
}
