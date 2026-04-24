/**
 * HSRP Diagnostics - Detect and diagnose HSRP inconsistencies
 */

export interface HSRPDiagnosticCheck {
  code: string;
  level: "error" | "warning" | "info" | "critical";
  message: string;
  details?: Record<string, unknown>;
}

export interface HSRPDiagnosticResult {
  device: string;
  group: number;
  diagnostics: HSRPDiagnosticCheck[];
  healthy: boolean;
}

export interface HSRPInconsistency {
  code: string;
  severity: "critical" | "warning";
  description: string;
  resolution: string;
}

export const HSRP_INCONSISTENCIES: HSRPInconsistency[] = [
  {
    code: "HSRP_NO_PREAMPT",
    severity: "warning",
    description: "HSRP preempt not configured - may cause suboptimal failover",
    resolution: "Configure 'standby <group> preempt' on standby router",
  },
  {
    code: "HSRP_NO_AUTH",
    severity: "critical",
    description: "HSRP without authentication - vulnerable to spoofing",
    resolution: "Configure 'standby <group> authentication <text>'",
  },
  {
    code: "HSRP_PRIORITY_CROSS",
    severity: "warning",
    description: "Active router has lower priority than standby",
    resolution: "Adjust priorities with 'standby <group> priority <N>'",
  },
  {
    code: "HSRP_NO_VIP",
    severity: "critical",
    description: "HSRP group has no virtual IP configured",
    resolution: "Configure 'standby <group> ip <virtual-ip>'",
  },
  {
    code: "HSRP_SAME_IP",
    severity: "critical",
    description: "Physical IP same as VIP - will cause ARP conflicts",
    resolution: "Use different IP for virtual IP address",
  },
  {
    code: "HSRP_STATE_MISMATCH",
    severity: "warning",
    description: "Routers report different states for same group",
    resolution: "Check hello timers and network connectivity",
  },
  {
    code: "HSRP_VERSION_MISMATCH",
    severity: "warning",
    description: "HSRP version mismatch between routers",
    resolution: "Ensure both routers use same version (1 or 2)",
  },
  {
    code: "HSRP_NO_TRACK",
    severity: "warning",
    description: "No interface tracking configured - may not fail over on link loss",
    resolution: "Consider 'standby <group> track <interface>'",
  },
];

export async function diagnoseHSRP(
  device: string,
  group: number,
  exec: (cmd: string) => Promise<string>,
): Promise<HSRPDiagnosticResult> {
  const diagnostics: HSRPDiagnosticCheck[] = [];

  try {
    const output = await exec(`show standby group ${group}`);
    const raw = output;

    const hasVip = /Virtual IP/i.test(raw);
    if (!hasVip) {
      diagnostics.push({
        code: "HSRP_NO_VIP",
        level: "error",
        message: "No virtual IP configured",
        details: { group },
      });
    }

    const preemptMatch = raw.match(/Preempt\s+(enabled|disabled)/i);
    if (!preemptMatch || preemptMatch[1] === "disabled") {
      diagnostics.push({
        code: "HSRP_NO_PREAMPT",
        level: "warning",
        message: "Preempt not enabled",
        details: { group },
      });
    }

    const authMatch = raw.match(/Authentication\s+(\S+)/i);
    if (!authMatch) {
      diagnostics.push({
        code: "HSRP_NO_AUTH",
        level: "error",
        message: "No authentication configured",
        details: { group },
      });
    }

    const priorityMatch = raw.match(/Priority\s+(\d+)/i);
    const stateMatch = raw.match(/State is (\w+)/i);
    if (priorityMatch && stateMatch && stateMatch[1] && parseInt(priorityMatch[1]!, 10) < 100 && stateMatch[1] === "Standby") {
      diagnostics.push({
        code: "HSRP_PRIORITY_CROSS",
        level: "warning",
        message: "Standby router has priority < 100",
        details: { priority: parseInt(priorityMatch[1]!, 10) },
      });
    }

    const versionMatch = raw.match(/HSRP\s+v(\d)/i);
    if (!versionMatch) {
      diagnostics.push({
        code: "HSRP_VERSION_MISMATCH",
        level: "warning",
        message: "Cannot determine HSRP version",
        details: { group },
      });
    }

    const trackMatch = raw.match(/Track\s+(\S+)/i);
    if (!trackMatch) {
      diagnostics.push({
        code: "HSRP_NO_TRACK",
        level: "warning",
        message: "No interface tracking configured",
        details: { group },
      });
    }

    const activeMatch = raw.match(/Active router is ([\w.-]+)/i);
    const standbyMatch = raw.match(/Standby router is ([\w.-]+)/i);
    if (activeMatch && standbyMatch && activeMatch[1] === standbyMatch[1]) {
      diagnostics.push({
        code: "HSRP_STATE_MISMATCH",
        level: "warning",
        message: "Active and standby point to same router",
        details: { active: activeMatch[1], standby: standbyMatch[1] },
      });
    }
  } catch (err) {
    diagnostics.push({
      code: "HSRP_EXEC_ERROR",
      level: "error",
      message: String(err),
      details: { group },
    });
  }

  const healthy = !diagnostics.some((d) => d.level === "error");

  return {
    device,
    group,
    diagnostics,
    healthy,
  };
}

export function formatDiagnosticReport(result: HSRPDiagnosticResult): string {
  const lines: string[] = [];
  lines.push(`HSRP Diagnostics for ${result.device} Group ${result.group}:`);
  lines.push("");

  if (result.diagnostics.length === 0) {
    lines.push("  No issues found");
    return lines.join("\n");
  }

  for (const d of result.diagnostics) {
    const icon = d.level === "error" ? "❌" : d.level === "warning" ? "⚠️" : "ℹ️";
    lines.push(`  ${icon} [${d.code}] ${d.message}`);
  }

  lines.push("");
  lines.push(result.healthy ? "✅ HSRP healthy" : "❌ HSRP has critical issues");

  return lines.join("\n");
}