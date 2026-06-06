/**
 * Rule Registry - construye el registro de todas las reglas
 */

import type { LintRule } from '../topology-lint-types.js';

import {
  createIpDuplicateRule,
  createSubnetNoGatewayRule,
  createAccessPortVlanMissingRule,
  createTrunkVlanNotAllowedRule,
  createNativeVlanMismatchRule,
  createSubinterfaceEncapsRule,
  createDhcpPoolSubnetMismatchRule,
  createDhcpHelperMissingRule,
  createAclNotAppliedRule,
  createStaticRouteNoReachRule,
  createOrphanLinkRule,
  createPortConflictRule,
  createStpPortfastMissingRule,
  createStpBpduGuardMissingRule,
  createEtherChannelNotFormedRule,
  createUnusedPortNotShutdownRule,
} from './rules/l2-rules.js';

import {
  createOspfDeadIntervalMismatchRule,
  createOspfAuthMissingRule,
  createEigrpAsMismatchRule,
  createEigrpPassiveInterfaceWrongRule,
  createDhcpExcludedAddressesMissingRule,
  createDhcpPoolExhaustedRule,
  createDhcpFallbackMissingRule,
} from './rules/routing-and-dhcp.js';

import {
  createManagementPortNoAclRule,
  createNativeVlan1OnTrunkRule,
  createCdpEnabledUntrustedRule,
  createSshNotConfiguredRule,
  createPasswordInPlainTextRule,
  createIpv6LinkLocalNotConfiguredRule,
  createIpv6SlaacNoRaRule,
  createIpv6DhcpRelayMissingRule,
  createIpv6RoutingEnabledButNotConfiguredRule,
} from './rules/security-and-ipv6.js';

import {
  createHsrpPriorityNotConfiguredRule,
  createHsrpPreemptNotEnabledRule,
  createHsrpAuthMissingRule,
  createHsrpTrackNotConfiguredRule,
  createWlcControllerIpInconsistentRule,
  createApJoinFailureRule,
  createSsidNotEnabledRule,
  createWirelessRrmNotConfiguredRule,
} from './rules/hsrp-and-wireless.js';

/**
 * Construir todas las reglas de lint
 */
export function buildRuleRegistry(): LintRule[] {
  return [
    // Basic/L2 rules (12 rules)
    createIpDuplicateRule(),
    createSubnetNoGatewayRule(),
    createAccessPortVlanMissingRule(),
    createTrunkVlanNotAllowedRule(),
    createNativeVlanMismatchRule(),
    createSubinterfaceEncapsRule(),
    createDhcpPoolSubnetMismatchRule(),
    createDhcpHelperMissingRule(),
    createAclNotAppliedRule(),
    createStaticRouteNoReachRule(),
    createOrphanLinkRule(),
    createPortConflictRule(),
    // Switching rules (4 rules)
    createStpPortfastMissingRule(),
    createStpBpduGuardMissingRule(),
    createEtherChannelNotFormedRule(),
    createUnusedPortNotShutdownRule(),
    // Routing rules (4 rules)
    createOspfDeadIntervalMismatchRule(),
    createOspfAuthMissingRule(),
    createEigrpAsMismatchRule(),
    createEigrpPassiveInterfaceWrongRule(),
    // DHCP rules (3 rules)
    createDhcpExcludedAddressesMissingRule(),
    createDhcpPoolExhaustedRule(),
    createDhcpFallbackMissingRule(),
    // Security rules (5 rules)
    createManagementPortNoAclRule(),
    createNativeVlan1OnTrunkRule(),
    createCdpEnabledUntrustedRule(),
    createSshNotConfiguredRule(),
    createPasswordInPlainTextRule(),
    // IPv6 rules (4 rules)
    createIpv6LinkLocalNotConfiguredRule(),
    createIpv6SlaacNoRaRule(),
    createIpv6DhcpRelayMissingRule(),
    createIpv6RoutingEnabledButNotConfiguredRule(),
    // HSRP rules (4 rules)
    createHsrpPriorityNotConfiguredRule(),
    createHsrpPreemptNotEnabledRule(),
    createHsrpAuthMissingRule(),
    createHsrpTrackNotConfiguredRule(),
    // Wireless rules (4 rules)
    createWlcControllerIpInconsistentRule(),
    createApJoinFailureRule(),
    createSsidNotEnabledRule(),
    createWirelessRrmNotConfiguredRule(),
  ];
}
