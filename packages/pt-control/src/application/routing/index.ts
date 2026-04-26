/**
 * Routing Application Module
 *
 * Re-exports routing use cases, IOS builders, and types.
 */

export type { RoutingConfigInput, OspfConfig, EigrpConfig, BgpConfig, StaticRouteConfig, RoutingResult } from './routing-types.js';

export {
  validarIPv4,
  validarCIDR,
  parseEnteroObligatorio,
  cidrToSubnetMask,
  buildStaticRouteCommands,
  buildOspfEnableCommands,
  buildOspfAddNetworkCommands,
  buildEigrpEnableCommands,
  buildBgpEnableCommands,
} from './ios-builders.js';

export {
  executeStaticRoute,
  executeOspfEnable,
  executeOspfAddNetwork,
  executeEigrpEnable,
  executeBgpEnable,
  type StaticRouteInput,
  type StaticRouteResult,
  type OspfEnableInput,
  type OspfEnableResult,
  type OspfAddNetworkInput,
  type OspfAddNetworkResult,
  type EigrpEnableInput,
  type EigrpEnableResult,
  type BgpEnableInput,
  type BgpEnableResult,
} from './routing-use-cases.js';
