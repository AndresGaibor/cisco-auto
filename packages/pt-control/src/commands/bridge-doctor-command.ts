#!/usr/bin/env bun
/**
 * BridgeDoctorReport y lógica de diagnóstico del bridge CLI ↔ PT
 * Verifica directorios, heartbeat, queues, y runtime markers.
 */

import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface BridgeDoctorReport {
  ok: boolean;
  bridgeReady: boolean;
  heartbeatState: "ok" | "stale" | "missing" | "unknown";
  heartbeatAgeMs: number | null;
  queuedCount: number;
  inFlightCount: number;
  deadLetterCount: number;
  staleInFlight: string[];
  runtimeMarkers: {
    hasCommandTimeout: boolean;
    hasPagerAdvance: boolean;
    hasTerminalExecutionResult: boolean;
    gitSha?: string;
    builtAt?: string;
  };
  ptDevDirectory: string;
  runtimeJsPath: string;
  warnings: string[];
  issues: string[];
}

export function getBridgeRoot(): string {
  const home = homedir();
  const isWindows = process.platform === "win32";

  if (isWindows) {
    return process.env.PT_BRIDGE_ROOT ?? process.env.PT_DEV_DIR ?? join(process.env.USERPROFILE ?? home, "pt-dev");
  }

  return process.env.PT_BRIDGE_ROOT ?? process.env.PT_DEV_DIR ?? join(home, "pt-dev");
}

function checkDirectoryExists(path: string): { ok: boolean; message: string } {
  if (!existsSync(path)) {
    return { ok: false, message: `Directory missing: ${path}` };
  }
  return { ok: true, message: `Exists: ${path}` };
}

function countJsonFiles(dir: string): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => /^cmd_\d+\.json$/.test(f)).length;
}

function getStaleInFlight(dir: string, maxAgeMs: number = 60000): string[] {
  if (!existsSync(dir)) return [];
  const now = Date.now();
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .filter((f) => {
      const mtime = statSync(join(dir, f)).mtimeMs;
      return now - mtime > maxAgeMs;
    });
}

interface HeartbeatData {
  timestamp?: number;
  lastSeen?: number;
  state?: string;
}

function readHeartbeat(ptDevDir: string): { data: HeartbeatData | null; ageMs: number | null } {
  const heartbeatPath = join(ptDevDir, "heartbeat.json");
  if (!existsSync(heartbeatPath)) {
    return { data: null, ageMs: null };
  }
  try {
    const content = readFileSync(heartbeatPath, "utf-8");
    const data = JSON.parse(content) as HeartbeatData;
    const ageMs = data.timestamp ? Date.now() - data.timestamp : null;
    return { data, ageMs };
  } catch {
    return { data: null, ageMs: null };
  }
}

function detectRuntimeMarkers(runtimeJsPath: string): BridgeDoctorReport["runtimeMarkers"] {
  const markers: BridgeDoctorReport["runtimeMarkers"] = {
    hasCommandTimeout: false,
    hasPagerAdvance: false,
    hasTerminalExecutionResult: false,
  };

  if (!existsSync(runtimeJsPath)) return markers;

  try {
    const content = readFileSync(runtimeJsPath, "utf-8");
    markers.hasCommandTimeout = content.includes("command-timeout") || content.includes("CommandTimeout");
    markers.hasPagerAdvance = content.includes("pager-advance") || content.includes("PagerAdvance");
    markers.hasTerminalExecutionResult = content.includes("terminal-execution-result") || content.includes("TerminalExecutionResult");

    const gitShaMatch = content.match(/git_sha["\s:]+["']?([a-f0-9]+)/i);
    if (gitShaMatch) markers.gitSha = gitShaMatch[1];

    const builtAtMatch = content.match(/built_at["\s:]+["']?([\w-:. ]+)/i);
    if (builtAtMatch) markers.builtAt = builtAtMatch[1];
  } catch {
    // Ignore read errors
  }

  return markers;
}

function getHeartbeatState(heartbeat: HeartbeatData | null, ageMs: number | null): BridgeDoctorReport["heartbeatState"] {
  if (!heartbeat) return "missing";
  if (ageMs === null) return "unknown";
  if (ageMs > 120000) return "stale";
  return "ok";
}

export function runBridgeDoctor(): BridgeDoctorReport {
  const ptDevDir = getBridgeRoot();
  const commandsDir = join(ptDevDir, "commands");
  const inFlightDir = join(ptDevDir, "in-flight");
  const resultsDir = join(ptDevDir, "results");
  const deadLetterDir = join(ptDevDir, "dead-letter");
  const runtimeJsPath = join(ptDevDir, "runtime.js");

  const report: BridgeDoctorReport = {
    ok: true,
    bridgeReady: false,
    heartbeatState: "unknown",
    heartbeatAgeMs: null,
    queuedCount: 0,
    inFlightCount: 0,
    deadLetterCount: 0,
    staleInFlight: [],
    runtimeMarkers: {
      hasCommandTimeout: false,
      hasPagerAdvance: false,
      hasTerminalExecutionResult: false,
    },
    ptDevDirectory: ptDevDir,
    runtimeJsPath,
    warnings: [],
    issues: [],
  };

  const issues: string[] = [];
  const warnings: string[] = [];

  const ptDevCheck = checkDirectoryExists(ptDevDir);
  if (!ptDevCheck.ok) {
    issues.push(`pt-dev directory does not exist: ${ptDevDir}`);
    report.ok = false;
  } else {
    report.bridgeReady = true;
  }

  const dirs = [
    { path: commandsDir, name: "commands" },
    { path: inFlightDir, name: "in-flight" },
    { path: resultsDir, name: "results" },
    { path: deadLetterDir, name: "dead-letter" },
  ];

  for (const dir of dirs) {
    const check = checkDirectoryExists(dir.path);
    if (!check.ok) {
      warnings.push(`Directory ${dir.name} does not exist: ${dir.path}`);
    }
  }

  report.queuedCount = countJsonFiles(commandsDir);
  report.inFlightCount = countJsonFiles(inFlightDir);
  report.deadLetterCount = countJsonFiles(deadLetterDir);

  report.staleInFlight = getStaleInFlight(inFlightDir);
  if (report.staleInFlight.length > 0) {
    warnings.push(`${report.staleInFlight.length} in-flight commands are stale (>60s)`);
  }

  if (report.deadLetterCount > 0) {
    issues.push(`${report.deadLetterCount} dead-letter commands found`);
    report.ok = false;
  }

  const { data: heartbeat, ageMs } = readHeartbeat(ptDevDir);
  report.heartbeatAgeMs = ageMs;
  report.heartbeatState = getHeartbeatState(heartbeat, ageMs);

  if (report.heartbeatState === "stale") {
    issues.push("Heartbeat is stale (>120s)");
    report.ok = false;
  } else if (report.heartbeatState === "missing") {
    warnings.push("No heartbeat.json found");
  }

  report.runtimeMarkers = detectRuntimeMarkers(runtimeJsPath);

  if (!existsSync(runtimeJsPath)) {
    issues.push("runtime.js not found");
    report.ok = false;
  }

  const runtimeMtime = existsSync(runtimeJsPath) ? statSync(runtimeJsPath).mtimeMs : null;
  if (runtimeMtime) {
    const ageDays = (Date.now() - runtimeMtime) / (1000 * 60 * 60 * 24);
    if (ageDays > 1) {
      warnings.push(`runtime.js is ${ageDays.toFixed(1)} days old`);
    }
  }

  report.warnings = warnings;
  report.issues = issues;

  return report;
}

export function printBridgeDoctorReport(report: BridgeDoctorReport): void {
  console.log("");
  console.log("=== PT Bridge Doctor ===\n");

  console.log(`Bridge Ready  : ${report.bridgeReady ? "✅" : "❌"}`);
  if (report.heartbeatState === "ok" && report.heartbeatAgeMs !== null) {
    const ageSec = (report.heartbeatAgeMs / 1000).toFixed(1);
    console.log(`Heartbeat     : ✅ (${ageSec}s ago)`);
  } else if (report.heartbeatState === "stale") {
    console.log(`Heartbeat     : ⚠️ stale (${report.heartbeatAgeMs ? `${(report.heartbeatAgeMs / 1000).toFixed(1)}s ago` : "unknown"})`);
  } else if (report.heartbeatState === "missing") {
    console.log(`Heartbeat     : ❌ missing`);
  } else {
    console.log(`Heartbeat     : ❓ unknown`);
  }
  console.log(`Queued        : ${report.queuedCount}`);
  console.log(`In-Flight     : ${report.inFlightCount}${report.staleInFlight.length > 0 ? ` (stale: ${report.staleInFlight.length})` : ""}`);
  console.log(`Dead Letter   : ${report.deadLetterCount}`);

  console.log("\nRuntime Markers:");
  console.log(`  - command-timeout           : ${report.runtimeMarkers.hasCommandTimeout ? "✅" : "❌ (missing)"}`);
  console.log(`  - pager-advance             : ${report.runtimeMarkers.hasPagerAdvance ? "✅" : "❌ (missing)"}`);
  console.log(`  - terminal-execution-result : ${report.runtimeMarkers.hasTerminalExecutionResult ? "✅" : "❌ (missing)"}`);

  if (report.runtimeMarkers.gitSha) {
    console.log(`  - git_sha                   : ${report.runtimeMarkers.gitSha}`);
  }
  if (report.runtimeMarkers.builtAt) {
    console.log(`  - built_at                  : ${report.runtimeMarkers.builtAt}`);
  }

  if (report.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of report.warnings) {
      console.log(`  ⚠️ ${w}`);
    }
  }

  console.log("\nResult: " + (report.ok ? "✅ OK" : "❌ ISSUES FOUND"));
  console.log("");
}
