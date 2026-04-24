/**
 * Registry de escenarios reales para verificación de red.
 *
 * Proporciona acceso centralizado a escenarios por ID, perfil o tags.
 * Los escenarios se registran automáticamente al importar este módulo.
 *
 * @module real-scenario-registry
 */

import type { RealScenarioDefinition } from "./scenarios/real-scenario-types.js";

import {
  switchMacLearningScenario,
  vlanBasicScenario,
  iosShowCommandsScenario,
  interactivePaginationScenario,
  hostCommandPromptConnectivityScenario,
  rstpBasicScenario,
  rstpFailoverScenario,
  stpRootControlScenario,
  etherchannelLacpScenario,
  etherchannelPagpScenario,
  etherchannelFailureMemberLossScenario,
  ospfBasicScenario,
  ospfFailoverScenario,
  ospfNegativeScenario,
  aclStandardBasicScenario,
  aclExtendedBasicScenario,
  aclRegressionGuardScenario,
  natStaticBasicScenario,
  natOverloadBasicScenario,
  natAclIntegrationScenario,
  httpServiceBasicScenario,
  dnsHttpIntegrationScenario,
  servicePolicyRegressionScenario,
  trunkBasicScenario,
  vlanIsolationScenario,
  multiSwitchVlanScenario,
  routerOnStickBasicScenario,
  routerOnStickNegativeScenario,
  dhcpSingleSubnetScenario,
  dhcpMultiVlanScenario,
  initialDialogRecoveryScenario,
  iosConfirmationPromptsScenario,
  iosSessionRecoveryScenario,
  emailBasicScenario,
  emailRegressionScenario,
  wirelessBasicScenario,
  wirelessSecurityWpa2Scenario,
} from "./scenarios/index.js";

/**
 * Almacenamiento central de escenarios registrados por ID.
 */
const SCENARIOS: Map<string, RealScenarioDefinition> = new Map();

/**
 * Registra un escenario en el registry global.
 * @param scenario - Escenario a registrar
 */
function registerScenario(scenario: RealScenarioDefinition): void {
  SCENARIOS.set(scenario.id, scenario);
}

registerScenario(switchMacLearningScenario);
registerScenario(vlanBasicScenario);
registerScenario(iosShowCommandsScenario);
registerScenario(interactivePaginationScenario);
registerScenario(hostCommandPromptConnectivityScenario);
registerScenario(rstpBasicScenario);
registerScenario(rstpFailoverScenario);
registerScenario(stpRootControlScenario);
registerScenario(etherchannelLacpScenario);
registerScenario(etherchannelPagpScenario);
registerScenario(etherchannelFailureMemberLossScenario);
registerScenario(ospfBasicScenario);
registerScenario(ospfFailoverScenario);
registerScenario(ospfNegativeScenario);
registerScenario(aclStandardBasicScenario);
registerScenario(aclExtendedBasicScenario);
registerScenario(aclRegressionGuardScenario);
registerScenario(natStaticBasicScenario);
registerScenario(natOverloadBasicScenario);
registerScenario(natAclIntegrationScenario);
registerScenario(httpServiceBasicScenario);
registerScenario(dnsHttpIntegrationScenario);
registerScenario(servicePolicyRegressionScenario);
registerScenario(trunkBasicScenario);
registerScenario(vlanIsolationScenario);
registerScenario(multiSwitchVlanScenario);
registerScenario(routerOnStickBasicScenario);
registerScenario(routerOnStickNegativeScenario);
registerScenario(dhcpSingleSubnetScenario);
registerScenario(dhcpMultiVlanScenario);
registerScenario(initialDialogRecoveryScenario);
registerScenario(iosConfirmationPromptsScenario);
registerScenario(iosSessionRecoveryScenario);
registerScenario(emailBasicScenario);
registerScenario(emailRegressionScenario);
registerScenario(wirelessBasicScenario);
registerScenario(wirelessSecurityWpa2Scenario);

/**
 * Obtiene un escenario por su ID único.
 * @param id - Identificador del escenario
 * @returns El escenario o undefined si no existe
 */
export function getScenario(id: string): RealScenarioDefinition | undefined {
  return SCENARIOS.get(id);
}

/**
 * Lista todos los escenarios registrados.
 * @returns Array con todos los escenarios
 */
export function listScenarios(): RealScenarioDefinition[] {
  return Array.from(SCENARIOS.values());
}

/**
 * Filtra escenarios por perfil (ej: "smoke", "ios-core").
 * @param profile - Perfil a filtrar
 * @returns Escenarios que coinciden con el perfil
 */
export function listScenariosByProfile(profile: string): RealScenarioDefinition[] {
  return Array.from(SCENARIOS.values()).filter((s) => s.profile.includes(profile));
}

/**
 * Filtra escenarios por uno o más tags.
 * @param tags - Tags a buscar
 * @returns Escenarios que contienen alguno de los tags
 */
export function listScenariosByTags(tags: string[]): RealScenarioDefinition[] {
  return Array.from(SCENARIOS.values()).filter((s) =>
    tags.some((tag) => s.tags.includes(tag))
  );
}

/**
 * Lista escenarios por perfil ordenados por dependencias.
 * Escenarios sin dependencias van primero.
 * @param profile - Perfil a filtrar
 * @returns Escenarios ordenados por dependencia
 */
export function listScenariosByProfileWithDeps(profile: string): RealScenarioDefinition[] {
  const scenarios = listScenariosByProfile(profile);
  return scenarios.sort((a, b) => {
    if (a.dependsOn.length === 0 && b.dependsOn.length > 0) return -1;
    if (b.dependsOn.length === 0 && a.dependsOn.length > 0) return 1;
    return 0;
  });
}

/**
 * Perfiles disponibles para ejecución de escenarios.
 */
export const PROFILES = {
  smoke: ["smoke"],
  "network-core": ["network-core"],
  "ios-core": ["ios-core"],
  "interactive-core": ["interactive-core"],
  host: ["host"],
  full: ["smoke", "network-core", "ios-core", "interactive-core", "host"],
  "switching-advanced": ["switching-advanced"],
  "routing-intervlan": ["routing-intervlan"],
  "dhcp-core": ["dhcp-core"],
  "interactive-resilience": ["interactive-resilience"],
  "switching-resilience": ["switching-resilience"],
  "etherchannel-core": ["etherchannel-core"],
  "dynamic-routing-core": ["dynamic-routing-core"],
  "acl-nat-core": ["acl-nat-core"],
  "services-advanced": ["services-advanced"],
  "stability-regression": ["stability-regression"],
  "security-core": ["security-core"],
  "ipv6-core": ["ipv6-core"],
  "hsrp-core": ["hsrp-core"],
  "wireless-core": ["wireless-core"],
} as const;

/**
 * Obtiene todos los escenarios para un perfil específico.
 * Resolve múltiples tags de perfil y elimina duplicados.
 * @param profile - Clave del perfil en PROFILES
 * @returns Escenarios únicos para el perfil
 */
export function getScenariosForProfile(
  profile: keyof typeof PROFILES
): RealScenarioDefinition[] {
  const profileTags = PROFILES[profile] ?? [profile];
  const result: RealScenarioDefinition[] = [];
  const seen = new Set<string>();

  for (const tag of profileTags) {
    const scenarios = listScenariosByTags([tag]);
    for (const s of scenarios) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        result.push(s);
      }
    }
  }

  return result;
}
