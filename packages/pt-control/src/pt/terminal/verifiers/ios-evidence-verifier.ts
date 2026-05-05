import type { ParsedTerminalEvidence } from "../terminal-output-parsers.js";
import type { TerminalEvidenceVerdict } from "./evidence-verifier-types.js";

export function verifyIosTerminalEvidence(
  capabilityId: string,
  text: string,
  parsed: ParsedTerminalEvidence | null,
  warnings: string[],
): TerminalEvidenceVerdict | null {
  switch (capabilityId) {
    case "terminal.show-version": {
      const hasVersionText = /version/i.test(text) || Boolean(parsed?.facts.versionLine);
      const hasCisco = /cisco/i.test(text) || Boolean(parsed?.facts.hasCiscoBanner);
      const hasUptime = /uptime is/i.test(text) || Boolean(parsed?.facts.uptimeLine);
      const hasSystemImage =
        /system image file/i.test(text) || Boolean(parsed?.facts.systemImage);
      const hasIosSoftware = /Cisco IOS Software/i.test(text);

      if (!hasVersionText) warnings.push("No se detectó texto literal de versión");
      if (!hasCisco) warnings.push("No se detectó banner Cisco");
      if (!hasUptime && !hasSystemImage) {
        warnings.push("No se detectó uptime ni system image");
      }

      const evidenceOk = hasVersionText || hasIosSoftware || hasSystemImage || hasUptime;

      return {
        ok: evidenceOk,
        reason: evidenceOk ? undefined : "show version no produjo evidencia suficiente",
        warnings,
        confidence:
          hasCisco && (hasVersionText || hasIosSoftware) && (hasSystemImage || hasUptime)
            ? 1
            : evidenceOk
              ? 0.8
              : 0.2,
        executionOk: true,
        evidenceOk,
      };
    }

    case "terminal.show-running-config": {
      const hasCanonicalHeader =
        /Building configuration/i.test(text) ||
        /Current configuration\s*:/i.test(text) ||
        Boolean(parsed?.facts.hasBuildingConfiguration) ||
        Boolean(parsed?.facts.hasCurrentConfiguration);

      const hasStandaloneEnd =
        /(?:^|\n)\s*end\s*(?:\n|$)/i.test(text) ||
        Boolean(parsed?.facts.hasConfigTerminator);

      const hasConfigBody = Boolean(parsed?.facts.hasConfigBody);

      const hasForeignShowCommand =
        /(?:^|\n)\s*[A-Za-z0-9._-]+[>#]?\s*show\s+(version|ip\s+interface\s+brief)\b/i.test(
          text,
        );

      const hasEnableTail =
        /(?:^|\n)\s*[A-Za-z0-9._-]+[>#]?\s*enable\s*$/i.test(text.trim());

      if (!hasCanonicalHeader) warnings.push("No se detectó cabecera típica de running-config");
      if (!hasConfigBody) warnings.push("No se detectó cuerpo típico de configuración IOS");
      if (!hasStandaloneEnd) warnings.push("No se detectó terminador end de running-config");
      if (hasForeignShowCommand) warnings.push("El output contiene eco de otro comando show");
      if (hasEnableTail) warnings.push("El output termina con enable, no con running-config");

      const evidenceOk =
        !hasForeignShowCommand &&
        !hasEnableTail &&
        (hasCanonicalHeader || (hasConfigBody && hasStandaloneEnd));

      return {
        ok: evidenceOk,
        reason: evidenceOk ? undefined : "show running-config no produjo evidencia suficiente",
        warnings,
        confidence: evidenceOk ? (hasCanonicalHeader ? 1 : 0.85) : 0.2,
        executionOk: true,
        evidenceOk,
      };
    }

    case "terminal.show-ip-interface-brief": {
      const interfaceCount = Number(parsed?.facts.interfaceCount ?? 0);
      const evidenceOk = interfaceCount > 0;

      if (!evidenceOk) warnings.push("No se detectaron interfaces en la salida");

      return {
        ok: evidenceOk,
        reason: evidenceOk ? undefined : "No se pudieron parsear interfaces",
        warnings,
        confidence: evidenceOk ? 0.95 : 0.2,
        executionOk: true,
        evidenceOk,
      };
    }

    case "terminal.show-vlan-brief": {
      const vlanCount = Number(parsed?.facts.vlanCount ?? 0);
      const evidenceOk = vlanCount > 0;

      if (!evidenceOk) warnings.push("No se detectaron VLANs en la salida");

      return {
        ok: evidenceOk,
        reason: evidenceOk ? undefined : "No se pudieron parsear VLANs",
        warnings,
        confidence: evidenceOk ? 0.95 : 0.2,
        executionOk: true,
        evidenceOk,
      };
    }

    case "terminal.show-cdp-neighbors": {
      const neighborCount = Number(parsed?.facts.neighborCount ?? 0);
      const evidenceOk = neighborCount >= 0;

      if (neighborCount === 0) warnings.push("No se detectaron vecinos CDP");

      return {
        ok: evidenceOk,
        warnings,
        confidence: neighborCount > 0 ? 0.95 : 0.7,
        executionOk: true,
        evidenceOk,
      };
    }

    default:
      return null;
  }
}
