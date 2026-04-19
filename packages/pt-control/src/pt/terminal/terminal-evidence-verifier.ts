import type { ParsedTerminalEvidence } from "./terminal-output-parsers.js";

export interface TerminalEvidenceVerdict {
  ok: boolean;
  reason?: string;
  warnings: string[];
  confidence: number;
}

export function verifyTerminalEvidence(
  capabilityId: string,
  output: string,
  parsed: ParsedTerminalEvidence | null,
  status: number,
): TerminalEvidenceVerdict {
  const warnings: string[] = [];
  const text = String(output ?? "");

  if (status !== 0) {
    return {
      ok: false,
      reason: `Terminal status != 0 (${status})`,
      warnings,
      confidence: 0,
    };
  }

  if (!text.trim()) {
    return {
      ok: false,
      reason: "Output vacío",
      warnings,
      confidence: 0.2,
    };
  }

  switch (capabilityId) {
    case "terminal.show-version": {
      const hasVersion = /version/i.test(text);
      const hasCisco = /cisco/i.test(text);

      if (!hasVersion) warnings.push("No se detectó texto de versión");
      if (!hasCisco) warnings.push("No se detectó banner Cisco");

      return {
        ok: hasVersion,
        reason: hasVersion ? undefined : "show version no produjo evidencia suficiente",
        warnings,
        confidence: hasVersion && hasCisco ? 1 : 0.8,
      };
    }

    case "terminal.show-running-config": {
      const hasHeader = /Building configuration/i.test(text) || /Current configuration/i.test(text);
      const lineCount = Number(parsed?.facts.lineCount ?? 0);

      if (!hasHeader) warnings.push("No se detectó cabecera típica de running-config");
      if (lineCount < 3) warnings.push("Salida demasiado corta para running-config");

      const ok = hasHeader || lineCount >= 3;

      return {
        ok,
        reason: ok ? undefined : "show running-config no produjo evidencia suficiente",
        warnings,
        confidence: ok ? (hasHeader ? 1 : 0.75) : 0.3,
      };
    }

    case "terminal.show-ip-interface-brief": {
      const interfaceCount = Number(parsed?.facts.interfaceCount ?? 0);
      const ok = interfaceCount > 0;

      if (!ok) warnings.push("No se detectaron interfaces en la salida");

      return {
        ok,
        reason: ok ? undefined : "No se pudieron parsear interfaces",
        warnings,
        confidence: ok ? 0.95 : 0.2,
      };
    }

    case "terminal.show-vlan-brief": {
      const vlanCount = Number(parsed?.facts.vlanCount ?? 0);
      const ok = vlanCount > 0;

      if (!ok) warnings.push("No se detectaron VLANs en la salida");

      return {
        ok,
        reason: ok ? undefined : "No se pudieron parsear VLANs",
        warnings,
        confidence: ok ? 0.95 : 0.2,
      };
    }

    case "terminal.show-cdp-neighbors": {
      const neighborCount = Number(parsed?.facts.neighborCount ?? 0);
      const ok = neighborCount >= 0;

      if (neighborCount === 0) warnings.push("No se detectaron vecinos CDP");

      return {
        ok,
        warnings,
        confidence: neighborCount > 0 ? 0.95 : 0.7,
      };
    }

    case "host.ipconfig": {
      const hasIPv4 = Boolean(parsed?.facts.hasIPv4);
      const hasSubnet = Boolean(parsed?.facts.hasSubnetMask);

      if (!hasIPv4) warnings.push("No se detectó IPv4 en ipconfig");
      if (!hasSubnet) warnings.push("No se detectó subnet mask en ipconfig");

      const ok = hasIPv4 || hasSubnet;

      return {
        ok,
        reason: ok ? undefined : "ipconfig no produjo evidencia suficiente",
        warnings,
        confidence: ok ? (hasIPv4 && hasSubnet ? 1 : 0.8) : 0.25,
      };
    }

    case "host.ping": {
      const successReplies = Number(parsed?.facts.successReplies ?? 0);
      const hasStatistics = Boolean(parsed?.facts.hasStatistics);

      if (!hasStatistics) warnings.push("No se detectó bloque de estadísticas en ping");
      if (successReplies === 0) warnings.push("No se detectaron replies exitosos");

      const ok = hasStatistics;

      return {
        ok,
        reason: ok ? undefined : "ping no produjo evidencia suficiente",
        warnings,
        confidence: ok ? (successReplies > 0 ? 0.95 : 0.75) : 0.3,
      };
    }

    default:
      return {
        ok: true,
        warnings,
        confidence: 0.7,
      };
  }
}