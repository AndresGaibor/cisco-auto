// ============================================================================
// Scenario Catalog - Catálogo de escenarios registrados
// Resolución de ID → path YAML y metadata asociada
// Sin lógica de negocio, solo consulta de catálogo
// ============================================================================

/**
 * Metadata de un escenario registrado
 */
export interface ScenarioMeta {
  id: number;
  nombre: string;
  desc: string;
}

/**
 * Mapa de IDs de escenario a paths relativos de archivos YAML
 */
export const SCENARIOS: Record<number, string> = {
  1: "labs/lan-basica.yaml",
  2: "labs/arp-learning.yaml",
  3: "labs/router-between-nets.yaml",
  4: "labs/gateway-misconfig.yaml",
  5: "labs/mask-misconfig.yaml",
  6: "labs/ip-duplicate.yaml",
  7: "labs/switch-documented.yaml",
  8: "labs/subnetting-basic.yaml",
};

/**
 * Metadata descriptiva de cada escenario
 */
export const ESCENARIOS_META: Record<number, { nombre: string; desc: string }> = {
  1: { nombre: "LAN mínima", desc: "2 PCs + 1 switch, conectividad básica" },
  2: { nombre: "ARP learning", desc: "3 PCs + 1 switch, tabla ARP" },
  3: { nombre: "Router entre redes", desc: "Router + 2 PCs, redes separadas" },
  4: { nombre: "Gateway mal configurado", desc: "Detectar fallo de gateway" },
  5: { nombre: "Máscara incorrecta", desc: "Detectar error de subnetting" },
  6: { nombre: "IP duplicada", desc: "Detectar conflicto de IP" },
  7: { nombre: "Switch documentado", desc: "Hostname y descripciones" },
  8: { nombre: "Subnetting básico", desc: "Dos LANs con /26" },
};

/**
 * Retorna el path YAML para un ID de escenario dado.
 * @param id - ID numérico del escenario
 * @returns Path relativo del archivo YAML o undefined si no existe
 */
export function getScenarioPath(id: number): string | undefined {
  return SCENARIOS[id];
}

/**
 * Retorna la metadata de un escenario por ID.
 * @param id - ID numérico del escenario
 * @returns Metadata del escenario o undefined si no existe
 */
export function getScenarioMeta(id: number): { nombre: string; desc: string } | undefined {
  return ESCENARIOS_META[id];
}

/**
 * Lista todos los escenarios disponibles en el catálogo.
 * @returns Array de metadata de escenarios ordenados por ID
 */
export function listScenarios(): ScenarioMeta[] {
  return Object.keys(SCENARIOS)
    .map((id) => {
      const num = parseInt(id, 10);
      const meta = ESCENARIOS_META[num];
      return { id: num, nombre: meta?.nombre ?? "?", desc: meta?.desc ?? "" };
    })
    .sort((a, b) => a.id - b.id);
}

/**
 * Verifica si un ID de escenario existe en el catálogo.
 * @param id - ID numérico del escenario
 * @returns true si el escenario existe
 */
export function scenarioExists(id: number): boolean {
  return id in SCENARIOS;
}

/**
 * Retorna el total de escenarios registrados.
 */
export const SCENARIO_COUNT = Object.keys(SCENARIOS).length;