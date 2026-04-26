export type OmniGuardMode = "strict" | "warn" | "off";

export interface OmniPolicyVerdict {
  ok: boolean;
  risk: "safe" | "elevated" | "dangerous" | "experimental";
  blockedPatterns: string[];
  warnings: string[];
  requiresUnsafe: boolean;
}

const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; label: string; reason: string }> = [
  {
    pattern: /\bprivileged\b/,
    label: "privileged",
    reason: "Acceso privilegiado al host o al sandbox interno de PT",
  },
  {
    pattern: /\bgetFileContents\s*\(/,
    label: "getFileContents",
    reason: "Puede leer archivos del host",
  },
  {
    pattern: /\bwriteFile\b|\bsetFileContents\b|\bfileSaveToBytes\b/,
    label: "file write/save",
    reason: "Puede escribir o extraer archivos",
  },
  {
    pattern: /\bremove\b|\bdelete\b|\bunlink\b/,
    label: "delete/remove",
    reason: "Puede borrar objetos o archivos",
  },
  {
    pattern: /\bsetCliTabHidden\s*\(/,
    label: "setCliTabHidden",
    reason: "Puede ocultar UI y dificultar diagnóstico",
  },
  {
    pattern: /\bsystemFileManager\s*\(/,
    label: "systemFileManager",
    reason: "Acceso sensible al sistema de archivos",
  },
];

const ELEVATED_PATTERNS: Array<{ pattern: RegExp; label: string; reason: string }> = [
  {
    pattern: /\bserializeToXml\s*\(/,
    label: "serializeToXml",
    reason: "Extrae información profunda del dispositivo",
  },
  {
    pattern: /\bAssessmentModel\b/,
    label: "AssessmentModel",
    reason: "Acceso a evaluación y configuraciones internas",
  },
  {
    pattern: /\bgetRunningConfig\s*\(/,
    label: "getRunningConfig",
    reason: "Lee configuración sin pasar por CLI",
  },
  {
    pattern: /\bskipBoot\s*\(/,
    label: "skipBoot",
    reason: "Manipula estado de boot del dispositivo",
  },
];

export function evaluateOmniRawPolicy(code: string, guard: OmniGuardMode): OmniPolicyVerdict {
  const blockedPatterns: string[] = [];
  const warnings: string[] = [];

  for (const item of DANGEROUS_PATTERNS) {
    if (item.pattern.test(code)) {
      blockedPatterns.push(item.label);
      warnings.push(`${item.label}: ${item.reason}`);
    }
  }

  for (const item of ELEVATED_PATTERNS) {
    if (item.pattern.test(code)) {
      warnings.push(`${item.label}: ${item.reason}`);
    }
  }

  const requiresUnsafe = blockedPatterns.length > 0;
  const risk =
    blockedPatterns.length > 0
      ? "dangerous"
      : warnings.length > 0
        ? "elevated"
        : "safe";

  if (guard === "off") {
    return {
      ok: true,
      risk,
      blockedPatterns,
      warnings,
      requiresUnsafe,
    };
  }

  if (guard === "warn") {
    return {
      ok: true,
      risk,
      blockedPatterns,
      warnings,
      requiresUnsafe,
    };
  }

  return {
    ok: blockedPatterns.length === 0,
    risk,
    blockedPatterns,
    warnings,
    requiresUnsafe,
  };
}

export function hasRawApproval(options: { yes?: boolean; approve?: boolean }): boolean {
  return Boolean(options.yes) ||
    Boolean(options.approve) ||
    process.env.PT_OMNI_AUTO_APPROVE === "1";
}
