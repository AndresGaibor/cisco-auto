/**
 * ReportGenerator - Crea reportes JSON y MD para E2E smoke suite.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { E2eSuiteResult } from "./e2e-runner.js";

export interface ReportPaths {
  reportsDir: string;
}

export class ReportGenerator {
  constructor(private readonly opts: ReportPaths) {}

  generate(result: E2eSuiteResult): { jsonPath: string; mdPath: string } {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toISOString().split("T")[1]!.replace(/:/g, "");
    const dirName = dateStr + "-" + timeStr;
    const reportDir = join(this.opts.reportsDir, "pt-e2e", dirName);

    mkdirSync(reportDir, { recursive: true });

    const jsonPath = join(reportDir, "report.json");
    const mdPath = join(reportDir, "report.md");

    const jsonReport = this.buildJson(result);
    writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), "utf-8");

    const mdReport = this.buildMd(result);
    writeFileSync(mdPath, mdReport, "utf-8");

    return { jsonPath, mdPath };
  }

  private buildJson(result: E2eSuiteResult): Record<string, unknown> {
    const passed = result.cases.filter((c) => c.severity === "pass").length;
    const failed = result.cases.filter((c) => c.severity === "fail").length;
    const degraded = result.cases.filter((c) => c.severity === "degraded").length;

    return {
      schemaVersion: "1.0",
      suite: result.suite,
      status: result.status,
      summary: {
        total: result.cases.length,
        passed,
        failed,
        degraded,
      },
      timing: {
        startedAt: new Date(result.startedAt).toISOString(),
        finishedAt: new Date(result.finishedAt).toISOString(),
        durationMs: result.durationMs,
      },
      doctorCheck: result.doctorCheck,
      cases: result.cases.map((c) => ({
        name: c.name,
        ok: c.ok,
        severity: c.severity,
        durationMs: c.durationMs,
        error: c.error,
        output: c.output,
      })),
    };
  }

  private buildMd(result: E2eSuiteResult): string {
    const lines: string[] = [];
    const statusIcon = result.status === "pass" ? "✅" : result.status === "degraded" ? "⚠️" : "❌";
    const statusLabel = result.status.toUpperCase();

    lines.push(`# E2E Smoke Report — ${statusIcon} ${statusLabel}`);
    lines.push("");
    lines.push(`**Suite:** ${result.suite}`);
    lines.push(`**Started:** ${new Date(result.startedAt).toISOString()}`);
    lines.push(`**Duration:** ${result.durationMs}ms`);
    lines.push("");

    const passed = result.cases.filter((c) => c.severity === "pass").length;
    const failed = result.cases.filter((c) => c.severity === "fail").length;
    const degraded = result.cases.filter((c) => c.severity === "degraded").length;

    lines.push("## Summary");
    lines.push("");
    lines.push(`| Status | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| ✅ Pass | ${passed} |`);
    if (degraded > 0) lines.push(`| ⚠️ Degraded | ${degraded} |`);
    if (failed > 0) lines.push(`| ❌ Fail | ${failed} |`);
    lines.push("");

    lines.push("## Cases");
    lines.push("");
    lines.push("| Case | Severity | OK | Error | Output |");
    lines.push("|------|----------|-----|-------|--------|");
    for (const c of result.cases) {
      const icon = c.severity === "pass" ? "✅" : c.severity === "degraded" ? "⚠️" : "❌";
      const error = c.error ?? "";
      const output = c.output ?? "";
      lines.push(`| ${c.name} | ${icon} ${c.severity} | ${c.ok ? "yes" : "no"} | ${error.slice(0, 60)} | ${output.slice(0, 60)} |`);
    }
    lines.push("");

    if (result.doctorCheck) {
      lines.push("## Doctor Checks");
      lines.push("");
      for (const check of result.doctorCheck.checks) {
        const icon = check.ok ? "✅" : "❌";
        lines.push(`- ${icon} **${check.name}** — ${check.message}`);
      }
      lines.push("");
    }

    lines.push("*Generado por cisco-auto E2E smoke suite*");

    return lines.join("\n");
  }
}