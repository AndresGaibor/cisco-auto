#!/usr/bin/env bun
/**
 * Heurísticas simples para calcular health de topología (Fase 3)
 */

export function computeTopologyHealth(input: {
  topologyMaterialized: boolean;
  deviceCount: number;
  linkCount: number;
  warnings: string[];
}): 'healthy' | 'warming' | 'stale' | 'desynced' | 'unknown' {
  const { topologyMaterialized, deviceCount, linkCount, warnings } = input;

  if (!topologyMaterialized) return 'warming';

  // If materialized and no warnings -> healthy
  if (topologyMaterialized && (!warnings || warnings.length === 0)) return 'healthy';

  // If there are warnings that mention "no está" or "no fue" treat as stale
  const strong = (warnings || []).some((w) => /no está|no fue|no se|no aparece|desincron|desincroniz/i.test(w));
  if (strong) return 'stale';

  // desynced reserved for explicit post-validation failures (caller may override)
  return 'unknown';
}
