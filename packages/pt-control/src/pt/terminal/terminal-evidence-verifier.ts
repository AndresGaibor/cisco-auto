import type { ParsedTerminalEvidence } from "./terminal-output-parsers.js";

export interface TerminalEvidenceVerdict {
  ok: boolean;
  reason?: string;
  warnings: string[];
  confidence: number;
  executionOk: boolean;
  evidenceOk: boolean;
  semanticSuccess?: boolean;
}

function baseVerdict(
  status: number,
  text: string,
  warnings: string[],
): { executionOk: boolean; evidenceOk: boolean; confidence: number } {
  const executionOk = status === 0;
  const evidenceOk = text.trim().length > 0;
  
  if (!executionOk) {
    return { executionOk: false, evidenceOk: false, confidence: 0 };
  }
  
  if (!evidenceOk) {
    return { executionOk: true, evidenceOk: false, confidence: 0.2 };
  }
  
  return { executionOk: true, evidenceOk: true, confidence: 0.7, ...warnings.length > 0 ? {} : {} };
}

export function verifyTerminalEvidence(
  capabilityId: string,
  output: string,
  parsed: ParsedTerminalEvidence | null,
  status: number,
): TerminalEvidenceVerdict {
  const warnings: string[] = [];
  const text = String(output ?? "");
  const base = baseVerdict(status, text, warnings);

  if (!base.executionOk) {
    return {
      ok: false,
      reason: `Terminal status != 0 (${status})`,
      warnings,
      confidence: base.confidence,
      executionOk: false,
      evidenceOk: false,
    };
  }

  if (!base.evidenceOk) {
    return {
      ok: false,
      reason: "Output vacío",
      warnings,
      confidence: base.confidence,
      executionOk: true,
      evidenceOk: false,
    };
  }

  switch (capabilityId) {
    case "terminal.show-version": {
      const hasVersion = /version/i.test(text);
      const hasCisco = /cisco/i.test(text);

      if (!hasVersion) warnings.push("No se detectó texto de versión");
      if (!hasCisco) warnings.push("No se detectó banner Cisco");

      const evidenceOk = hasVersion;
      const ok = evidenceOk;

      return {
        ok,
        reason: hasVersion ? undefined : "show version no produjo evidencia suficiente",
        warnings,
        confidence: hasVersion && hasCisco ? 1 : 0.8,
        executionOk: true,
        evidenceOk,
      };
    }

    case "terminal.show-running-config": {
      const hasHeader = /Building configuration/i.test(text) || /Current configuration/i.test(text);
      const lineCount = Number(parsed?.facts.lineCount ?? 0);

      if (!hasHeader) warnings.push("No se detectó cabecera típica de running-config");
      if (lineCount < 3) warnings.push("Salida demasiado corta para running-config");

      const evidenceOk = hasHeader || lineCount >= 3;
      const ok = evidenceOk;

      return {
        ok,
        reason: evidenceOk ? undefined : "show running-config no produjo evidencia suficiente",
        warnings,
        confidence: evidenceOk ? (hasHeader ? 1 : 0.75) : 0.3,
        executionOk: true,
        evidenceOk,
      };
    }

    case "terminal.show-ip-interface-brief": {
      const interfaceCount = Number(parsed?.facts.interfaceCount ?? 0);
      const evidenceOk = interfaceCount > 0;
      const ok = evidenceOk;

      if (!evidenceOk) warnings.push("No se detectaron interfaces en la salida");

      return {
        ok,
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
      const ok = evidenceOk;

      if (!evidenceOk) warnings.push("No se detectaron VLANs en la salida");

      return {
        ok,
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
      const ok = evidenceOk;

      if (neighborCount === 0) warnings.push("No se detectaron vecinos CDP");

      return {
        ok,
        warnings,
        confidence: neighborCount > 0 ? 0.95 : 0.7,
        executionOk: true,
        evidenceOk,
      };
    }

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
      const ok = evidenceOk;

      return {
        ok,
        reason: isZeroIp ? "Dispositivo no tiene IP configurada" : (evidenceOk ? undefined : "ipconfig no produjo evidencia suficiente"),
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
      if (!resolvedAddress && !hasError && !hasTimeout) warnings.push("No se encontró dirección IP en la respuesta");

      return {
        ok,
        reason: hasTimeout ? "Timeout DNS" : (hasError ? "Nombre no encontrado" : (ok ? undefined : "Fallo en resolución")),
        warnings,
        confidence: ok ? 1 : 0.4,
        executionOk: true,
        evidenceOk: text.includes("Server:"),
        semanticSuccess: ok,
      };
    }

    case "host.netstat": {
      const connections = (parsed?.facts.connections as any[]) ?? [];
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
      const ok = evidenceOk;

      return {
        ok,
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
      const hasConnection = lower.includes("open") || lower.includes("password:") || lower.includes("username:") || lower.includes(">") || lower.includes("#");
      const hasFailure = lower.includes("timeout") || lower.includes("connection closed") || lower.includes("refused") || lower.includes("unreachable");

      const ok = hasConnection && !hasFailure;

      if (hasFailure) warnings.push("Fallo en la conexión remota");
      if (!hasConnection && !hasFailure) warnings.push("No se recibió respuesta del host remoto");

      return {
        ok,
        reason: hasFailure ? "Conexión rechazada o timeout" : (ok ? undefined : "Sin respuesta coherente"),
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
      const ok = semanticSuccess;

      if (!hasStatistics) warnings.push("No se detectó bloque de estadísticas en ping");
      if (hasStatistics && successReplies === 0) {
        warnings.push("Ping completado pero sin respuestas exitosas (100% pérdida)");
      } else if (hasStatistics && lossPercent > 0) {
        warnings.push(`Ping completado con éxito parcial (${lossPercent}% pérdida)`);
      }

      return {
        ok,
        reason: ok ? undefined : (hasStatistics ? "Fallo de conectividad (100% pérdida)" : "Ping sin estadísticas"),
        warnings,
        confidence: ok ? (lossPercent === 0 ? 1 : 0.8) : (hasStatistics ? 0.75 : 0.3),
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
      const ok = semanticSuccess;

      if (!hopCount) warnings.push("No se detectaron saltos en tracert");
      if (!hasTraceComplete) warnings.push("Tracert no finalizó con 'Trace complete'");

      return {
        ok,
        reason: ok ? undefined : (hopCount > 0 ? "Tracert incompleto" : "tracert no produjo evidencia suficiente"),
        warnings,
        confidence: ok ? 1 : (hopCount > 0 ? 0.7 : 0.2),
        executionOk: true,
        evidenceOk,
        semanticSuccess,
      };
    }

    case "host.arp": {
      const entryCount = Number(parsed?.facts.entryCount ?? 0);
      const evidenceOk = true;
      const ok = evidenceOk;

      if (entryCount === 0) warnings.push("No se detectaron entradas ARP (puede ser normal)");

      return {
        ok,
        reason: undefined,
        warnings,
        confidence: entryCount > 0 ? 0.95 : 0.6,
        executionOk: true,
        evidenceOk,
        semanticSuccess: entryCount > 0,
      };
    }

    default:
      return {
        ok: true,
        warnings,
        confidence: 0.7,
        executionOk: true,
        evidenceOk: true,
      };
  }
}