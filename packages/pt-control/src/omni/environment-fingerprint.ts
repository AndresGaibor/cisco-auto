// ============================================================================
// Environment Fingerprint - Captura de entorno para comparación
// ============================================================================

import type { EnvironmentFingerprint } from "./capability-types.js";

const NODE_VERSION = process.version.replace(/^v/, "");

export function captureFingerprint(): EnvironmentFingerprint {
  return {
    ptVersion: capturePTVersion(),
    hostPlatform: process.platform,
    nodeVersion: NODE_VERSION,
    executionMode: detectExecutionMode(),
    runtimeDeployed: captureRuntimeVersion(),
    timestamp: Date.now(),
  };
}

function capturePTVersion(): string | undefined {
  try {
    const version = process.env.PT_VERSION;
    return version;
  } catch {
    return undefined;
  }
}

function detectExecutionMode(): string {
  const isDev = process.env.NODE_ENV === "development";
  const isTest = process.env.NODE_ENV === "test";
  return isDev ? "development" : isTest ? "test" : "production";
}

function captureRuntimeVersion(): string | undefined {
  try {
    const pkg = require("../../pt-runtime/package.json");
    return pkg.version;
  } catch {
    return undefined;
  }
}

export function fingerprintToString(fp: EnvironmentFingerprint): string {
  return [
    fp.ptVersion || "unknown-pt",
    fp.hostPlatform,
    fp.nodeVersion,
    fp.executionMode,
    fp.runtimeDeployed || "unknown-runtime",
  ].join("-");
}

export function fingerprintsMatch(a: EnvironmentFingerprint, b: EnvironmentFingerprint): boolean {
  return (
    a.ptVersion === b.ptVersion &&
    a.hostPlatform === b.hostPlatform &&
    a.nodeVersion === b.nodeVersion &&
    a.executionMode === b.executionMode &&
    a.runtimeDeployed === b.runtimeDeployed
  );
}