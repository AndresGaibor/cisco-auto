// ============================================================================
// Default Rules Export
// ============================================================================

import { duplicateIpRule } from "./duplicate-ip.rule";
import { subnetMaskRule } from "./subnet-mask.rule";
import { gatewaySubnetRule } from "./gateway-subnet.rule";
import { noShutdownExpectedRule } from "./no-shutdown-expected.rule";
import { runningNotSavedRule } from "./running-not-saved.rule";

export const defaultRules = [
  duplicateIpRule,
  subnetMaskRule,
  gatewaySubnetRule,
  noShutdownExpectedRule,
  runningNotSavedRule,
];

export {
  duplicateIpRule,
  subnetMaskRule,
  gatewaySubnetRule,
  noShutdownExpectedRule,
  runningNotSavedRule,
};
