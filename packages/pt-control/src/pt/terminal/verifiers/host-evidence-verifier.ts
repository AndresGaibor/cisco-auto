import type { ParsedTerminalEvidence } from "../terminal-output-parsers.js";
import type { TerminalEvidenceVerdict } from "./evidence-verifier-types.js";

function asRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
      )
    : [];
}

export function verifyHostTerminalEvidence(
  capabilityId: string,
  text: string,
  parsed: ParsedTerminalEvidence | null,
  warnings: string[],
): TerminalEvidenceVerdict | null {
  switch (capabilityId) {
    case "host.ipconfig": {
      const hasIPv4 = Boolean(parsed?.facts.hasIPv4);
      const hasSubnet = Boolean(parsed?.facts.hasSubnetMask);
      const ipv4Line = String(parsed?.facts.ipv4Line ?? "");

      const isZeroIp = ipv4Line.includes("0.0.0.0");
      const isApipa = ipv4Line.includes("169.254.");

      if (!hasIPv4) warnings.push("No se detectó IPv4 en ipconfig");
      if (isZeroIp) warnings.push("Dispositivo sin IP (0.0.0.0)");
      if (isApipa) warnings.push("Dispositivo con IP APIPA (fallo de DHCP)");
      if (!hasSubnet) warnings.push("No se detectó subnet mask en ipconfig");

      const evidenceOk = hasIPv4 && !isZeroIp;

      return {
        ok: evidenceOk,
        reason: isZeroIp
          ? "Dispositivo no tiene IP configurada"
          : evidenceOk
            ? undefined
            : "ipconfig no produjo evidencia suficiente",
        warnings,
        confidence: evidenceOk ? (isApipa ? 0.6 : 1) : 0.1,
        executionOk: true,
        evidenceOk,
      };
    }

    case "host.nslookup": {
      const resolvedAddress = parsed?.facts.resolvedAddress;
      const hasError = Boolean(parsed?.facts.hasError);
      const hasTimeout = Boolean(parsed?.facts.hasTimeout);

      const ok = Boolean(resolvedAddress) && !hasError && !hasTimeout;

      if (hasError) warnings.push("Error en resolución DNS (Non-existent o Not found)");
      if (hasTimeout) warnings.push("Timeout en servidor DNS");
      if (!resolvedAddress && !hasError && !hasTimeout) {
        warnings.push("No se encontró dirección IP en la respuesta");
      }

      return {
        ok,
        reason: hasTimeout
          ? "Timeout DNS"
          : hasError
            ? "Nombre no encontrado"
            : ok
              ? undefined
              : "Fallo en resolución",
        warnings,
        confidence: ok ? 1 : 0.4,
        executionOk: true,
        evidenceOk: text.includes("Server:"),
        semanticSuccess: ok,
      };
    }

    case "host.netstat": {
      const connections = asRecordArray(parsed?.facts.connections);
      const hasProto = text.includes("Proto") && text.includes("Local Address");
      const ok = hasProto;

      return {
        ok,
        warnings,
        confidence: ok ? 0.9 : 0.2,
        executionOk: true,
        evidenceOk: hasProto,
        semanticSuccess: connections.length > 0,
      };
    }

    case "host.history": {
      const count = Number(parsed?.facts.count ?? 0);
      const evidenceOk = count >= 0;

      return {
        ok: evidenceOk,
        reason: undefined,
        warnings,
        confidence: 0.9,
        executionOk: true,
        evidenceOk,
        semanticSuccess: count > 0,
      };
    }

    case "host.command": {
      const raw = String(parsed?.facts.raw ?? "");
      const ok = raw.trim().length > 0;

      return {
        ok,
        reason: ok ? undefined : "Sin salida en el comando",
        warnings,
        confidence: ok ? 1 : 0.5,
        executionOk: true,
        evidenceOk: true,
        semanticSuccess: ok,
      };
    }

    case "host.route": {
      const raw = String(parsed?.facts.raw ?? "");
      const ok = raw.includes("Network Destination") || raw.includes("Active Routes");

      return {
        ok,
        reason: ok ? undefined : "No se detectó tabla de ruteo en el output",
        warnings,
        confidence: ok ? 1 : 0.4,
        executionOk: true,
        evidenceOk: true,
        semanticSuccess: ok,
      };
    }

    case "host.telnet":
    case "host.ssh": {
      const lower = text.toLowerCase();
      const hasConnection =
        lower.includes("open") ||
        lower.includes("password:") ||
        lower.includes("username:") ||
        lower.includes(">") ||
        lower.includes("#");
      const hasFailure =
        lower.includes("timeout") ||
        lower.includes("connection closed") ||
        lower.includes("refused") ||
        lower.includes("unreachable");

      const ok = hasConnection && !hasFailure;

      if (hasFailure) warnings.push("Fallo en la conexión remota");
      if (!hasConnection && !hasFailure) warnings.push("No se recibió respuesta del host remoto");

      return {
        ok,
        reason: hasFailure ? "Conexión rechazada o timeout" : ok ? undefined : "Sin respuesta coherente",
        warnings,
        confidence: ok ? 0.9 : 0.3,
        executionOk: true,
        evidenceOk: true,
        semanticSuccess: ok,
      };
    }

    case "host.ping": {
      const successReplies = Number(parsed?.facts.successReplies ?? 0);
      const lossPercent = Number(parsed?.facts.lossPercent ?? 100);
      const hasStatistics = Boolean(parsed?.facts.hasStatistics);

      const evidenceOk = hasStatistics;
      const semanticSuccess = hasStatistics && successReplies > 0 && lossPercent < 100;

      if (!hasStatistics) warnings.push("No se detectó bloque de estadísticas en ping");
      if (hasStatistics && successReplies === 0) {
        warnings.push("Ping completado pero sin respuestas exitosas (100% pérdida)");
      } else if (hasStatistics && lossPercent > 0) {
        warnings.push(`Ping completado con éxito parcial (${lossPercent}% pérdida)`);
      }

      return {
        ok: semanticSuccess,
        reason: semanticSuccess
          ? undefined
          : hasStatistics
            ? "Fallo de conectividad (100% pérdida)"
            : "Ping sin estadísticas",
        warnings,
        confidence: semanticSuccess ? (lossPercent === 0 ? 1 : 0.8) : hasStatistics ? 0.75 : 0.3,
        executionOk: true,
        evidenceOk,
        semanticSuccess,
      };
    }

    case "host.tracert": {
      const hopCount = Number(parsed?.facts.hopCount ?? 0);
      const hasTraceComplete = text.toLowerCase().includes("trace complete");

      const evidenceOk = hopCount > 0 || hasTraceComplete;
      const semanticSuccess = hasTraceComplete;

      if (!hopCount) warnings.push("No se detectaron saltos en tracert");
      if (!hasTraceComplete) warnings.push("Tracert no finalizó con 'Trace complete'");

      return {
        ok: semanticSuccess,
        reason: semanticSuccess
          ? undefined
          : hopCount > 0
            ? "Tracert incompleto"
            : "tracert no produjo evidencia suficiente",
        warnings,
        confidence: semanticSuccess ? 1 : hopCount > 0 ? 0.7 : 0.2,
        executionOk: true,
        evidenceOk,
        semanticSuccess,
      };
    }

    case "host.arp": {
      const entryCount = Number(parsed?.facts.entryCount ?? 0);
      const evidenceOk = true;

      if (entryCount === 0) warnings.push("No se detectaron entradas ARP (puede ser normal)");

      return {
        ok: evidenceOk,
        reason: undefined,
        warnings,
        confidence: entryCount > 0 ? 0.95 : 0.6,
        executionOk: true,
        evidenceOk,
        semanticSuccess: entryCount > 0,
      };
    }

    default:
      return null;
  }
}
