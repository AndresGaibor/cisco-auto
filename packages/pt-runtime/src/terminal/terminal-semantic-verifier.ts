// ============================================================================
// Semantic Verifier - Detección semántica de errores en output terminal
// ============================================================================

export interface SemanticVerdict {
  ok: boolean;
  status: number;
  code?: string;
  message?: string;
  warnings: string[];
}

function baseVerdict(ok: boolean, code: string, status = 1, message?: string, warnings: string[] = []): SemanticVerdict {
  return { ok, status, code, message, warnings };
}

function okVerdict(): SemanticVerdict {
  return { ok: true, status: 0, warnings: [] };
}

export function verifyIosOutput(output: string): SemanticVerdict {
  if (!output || output.length === 0) {
    return okVerdict();
  }

  const recent = output.split("\n").slice(-20).join("\n");

  if (recent.includes("% Invalid input detected")) {
    return baseVerdict(false, "IOS_INVALID_INPUT", 1,
      "Comando IOS con input inválido detectado");
  }

  if (recent.includes("% Incomplete command")) {
    return baseVerdict(false, "IOS_INCOMPLETE_COMMAND", 1,
      "Comando IOS incompleto");
  }

  if (recent.includes("% Ambiguous command")) {
    return baseVerdict(false, "IOS_AMBIGUOUS_COMMAND", 1,
      "Comando IOS ambiguo");
  }

  if (recent.includes("% Unknown command")) {
    return baseVerdict(false, "IOS_INVALID_INPUT", 1,
      "Comando IOS desconocido");
  }

  if (recent.includes("Translating...")) {
    return baseVerdict(false, "IOS_DNS_LOOKUP_TRIGGERED", 1,
      "DNS lookup activado durante ejecución de comando", [
        "DNS lookup fue activado; considerar 'no ip domain-lookup'."
      ]);
  }

  if (recent.includes("% Bad secrets")) {
    return baseVerdict(false, "IOS_PRIVILEGE_REQUIRED", 1,
      "Se requiere privilegio elevado (modo privilegiado)");
  }

  if (recent.includes("% Not in config mode")) {
    return baseVerdict(false, "IOS_CONFIG_MODE_REQUIRED", 1,
      "Se requiere modo configuración");
  }

  return okVerdict();
}

export function verifyHostOutput(output: string): SemanticVerdict {
  if (!output || output.length === 0) {
    return okVerdict();
  }

  const recent = output.split("\n").slice(-20).join("\n");
  const lower = recent.toLowerCase();

  if (lower.includes("invalid command") || lower.includes("bad command or file name")) {
    return baseVerdict(false, "HOST_INVALID_COMMAND", 1,
      "Comando inválido en host");
  }

  if (lower.includes("request timed out")) {
    return baseVerdict(false, "HOST_NETWORK_TIMEOUT", 1,
      "Request de red expiró (timeout)");
  }

  if (lower.includes("destination host unreachable")) {
    return baseVerdict(false, "HOST_UNREACHABLE", 1,
      "Host de destino inalcanzable");
  }

  if (lower.includes("could not find host") || lower.includes("unknown host")) {
    return baseVerdict(false, "HOST_DNS_FAILURE", 1,
      "No se pudo resolver el host (DNS failure)");
  }

  if (lower.includes("ping request could not find host")) {
    return baseVerdict(false, "HOST_DNS_FAILURE", 1,
      "Ping no pudo encontrar el host");
  }

  return okVerdict();
}
