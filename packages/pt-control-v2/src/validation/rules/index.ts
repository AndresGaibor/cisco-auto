// ============================================================================
// Default Rules Export
// ============================================================================

import { duplicateIpRule } from "./duplicate-ip.rule";
import { subnetMaskRule } from "./subnet-mask.rule";
import { gatewaySubnetRule } from "./gateway-subnet.rule";
import { noShutdownExpectedRule } from "./no-shutdown-expected.rule";
import { runningNotSavedRule } from "./running-not-saved.rule";
import { subnetOverlapRule } from "./subnet-overlap.rule";
import { vlanExistsRule } from "./vlan-exists.rule";
import { aclMatchOrderRule } from "./acl-match-order.rule";
import { natOverlapRule } from "./nat-overlap.rule";
import { gatewayReachabilityRule } from "./gateway-reachability.rule";

export const defaultRules = [
  duplicateIpRule,
  subnetMaskRule,
  gatewaySubnetRule,
  noShutdownExpectedRule,
  runningNotSavedRule,
  subnetOverlapRule,
  vlanExistsRule,
  aclMatchOrderRule,
  natOverlapRule,
  gatewayReachabilityRule,
];

export {
  duplicateIpRule,
  subnetMaskRule,
  gatewaySubnetRule,
  noShutdownExpectedRule,
  runningNotSavedRule,
  subnetOverlapRule,
  vlanExistsRule,
  aclMatchOrderRule,
  natOverlapRule,
  gatewayReachabilityRule,
};
