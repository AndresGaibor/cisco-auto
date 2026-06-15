// packages/pt-runtime/src/pt/kernel/execution-engine-native.ts
// Helpers puros para detección de modo IOS nativo y snapshots de terminal
import type { ActiveJob } from "./execution-engine-types";

export function isIosConfigPromptText(value: unknown): boolean {
  const text = String(value ?? "").trim();
  return /\(config[^)]*\)#\s*$/.test(text);
}

export function isIosConfigModeText(value: unknown): boolean {
  const text = String(value ?? "").trim().toLowerCase();
  return (
    text === "config" ||
    text === "global-config" ||
    text === "interface-config" ||
    text === "router-config" ||
    text === "line-config" ||
    text.startsWith("config") ||
    text.endsWith("-config")
  );
}

export function nativeSnapshotIsStillInConfigMode(snapshot: { prompt?: unknown; mode?: unknown }): boolean {
  return isIosConfigPromptText(snapshot.prompt) || isIosConfigModeText(snapshot.mode);
}

export function semanticErrorNeedsCleanupToPrivilegedExec(
  _job: any,
  prompt: unknown,
  mode: unknown,
): boolean {
  return nativeSnapshotIsStillInConfigMode({ prompt, mode });
}

export function isLikelyConfigStep(command: string): boolean {
  const normalized = String(command ?? "").trim().toLowerCase();
  return (
    normalized === "configure terminal" ||
    normalized === "end" ||
    /^interface\b/.test(normalized) ||
    /^vlan\b/.test(normalized) ||
    /^no\s+vlan\b/.test(normalized) ||
    /^router\b/.test(normalized) ||
    /^line\b/.test(normalized) ||
    /^hostname\b/.test(normalized) ||
    /^ip\s+/.test(normalized) ||
    /^no\s+ip\s+/.test(normalized) ||
    /^spanning-tree\b/.test(normalized) ||
    /^switchport\b/.test(normalized) ||
    /^shutdown$/.test(normalized) ||
    /^no\s+shutdown$/.test(normalized) ||
    /^description\b/.test(normalized) ||
    /^no\s+description$/.test(normalized)
  );
}

export function jobRequiresPrivilegedExecFinalMode(job: ActiveJob): boolean {
  const targetMode = String((job.context as any)?.targetMode ?? (job.context as any)?.plan?.targetMode ?? "").trim();
  return targetMode === "privileged-exec";
}

export function resolveJobSessionKind(job: ActiveJob): "ios" | "host" {
  const payload = job.context.plan.payload as any;
  const sessionKind = String(payload?.metadata?.sessionKind ?? payload?.sessionKind ?? "").trim().toLowerCase();
  if (sessionKind === "host") return "host";
  if (String(payload?.metadata?.deviceKind ?? "").trim().toLowerCase() === "host") return "host";
  return "ios";
}

export function getNextCommandStep(job: ActiveJob): string {
  const ctx = job.context;
  const nextStep = ctx.plan.plan[ctx.currentStep + 1];
  if (!nextStep || nextStep.type !== "command") return "";
  return String(nextStep.value ?? "").trim();
}

export function hasRemainingEndStep(job: ActiveJob): boolean {
  const ctx = job.context;
  for (let index = ctx.currentStep + 1; index < ctx.plan.plan.length; index += 1) {
    const step = ctx.plan.plan[index];
    if (step && step.type === "command" && String(step.value ?? "").trim().toLowerCase() === "end") {
      return true;
    }
  }
  return false;
}
