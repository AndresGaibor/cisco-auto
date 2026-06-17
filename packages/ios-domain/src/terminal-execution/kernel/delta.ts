// packages/pt-runtime/src/pt/kernel/execution-engine-delta.ts
// Helpers puros para extraer bloques de comando del output del terminal
import {
  normalizeEol,
  isIosPrompt,
  lineContainsCommandEcho,
  isPromptOnlyTransitionCommand,
  lastNonEmptyLine,
} from "./output-detectors.js";

interface NativeDeltaJob {
  context: {
    nativeBaselineOutput: string;
    nativeBaselineStep: number;
    currentStep: number;
  };
}

export function extractLatestCommandBlock(output: string, command: string): string {
  const text = normalizeEol(output);
  const cmd = String(command || "").trim();

  if (!text.trim() || !cmd) return text;

  const lines = text.split("\n");
  let startIndex = -1;

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = String(lines[i] || "").trim();

    if (line === cmd || line.endsWith(">" + cmd) || line.endsWith("#" + cmd)) {
      startIndex = i;
      break;
    }
  }

  if (startIndex === -1) {
    const idx = text.lastIndexOf(cmd);
    if (idx >= 0) return text.slice(idx);
    return text;
  }

  return lines.slice(startIndex).join("\n");
}

export function extractCurrentCommandBlockStrict(
  output: string,
  command: string,
): { block: string; hasCommandEcho: boolean } {
  const text = normalizeEol(output);
  const cmd = String(command || "").trim();

  if (!text.trim() || !cmd) {
    return { block: "", hasCommandEcho: false };
  }

  const lines = text.split("\n");
  let startIndex = -1;

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lineContainsCommandEcho(lines[index] || "", cmd)) {
      startIndex = index;
      break;
    }
  }

  if (startIndex < 0) {
    return { block: "", hasCommandEcho: false };
  }

  let endIndex = lines.length;

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = String(lines[index] || "").trim();

    if (index > startIndex + 1 && isIosPrompt(line)) {
      endIndex = index + 1;
      break;
    }
  }

  return {
    block: lines.slice(startIndex, endIndex).join("\n").trim(),
    hasCommandEcho: true,
  };
}

export function getNativeDeltaForCurrentStep(
  _job: NativeDeltaJob,
  currentOutput: string,
  command: string,
): string {
  const ctx = _job.context;
  const output = normalizeEol(currentOutput);
  const strict = extractCurrentCommandBlockStrict(output, command);
  const baseline = normalizeEol(ctx.nativeBaselineOutput || "");

  if (ctx.nativeBaselineStep !== ctx.currentStep) {
    if (strict.hasCommandEcho) return strict.block;
    if (isPromptOnlyTransitionCommand(command)) return extractLatestCommandBlock(output, command).trim();
    return "";
  }

  if (!baseline) {
    if (strict.hasCommandEcho) return strict.block;
    if (isPromptOnlyTransitionCommand(command)) return extractLatestCommandBlock(output, command).trim();
    return "";
  }

  if (output.length >= baseline.length && output.slice(0, baseline.length) === baseline) {
    const delta = output.slice(baseline.length).trim();
    if (!delta) {
      return isPromptOnlyTransitionCommand(command) ? extractLatestCommandBlock(output, command).trim() : "";
    }
    const deltaStrict = extractCurrentCommandBlockStrict(delta, command);
    if (deltaStrict.hasCommandEcho) return deltaStrict.block;
    const deltaBlock = extractLatestCommandBlock(delta, command).trim();
    return deltaBlock || "";
  }

  const marker = lastNonEmptyLine(baseline);
  const overlapStart = marker ? output.lastIndexOf(marker) : -1;

  if (overlapStart >= 0) {
    const afterOverlap = output.slice(overlapStart);
    const markerIndex = afterOverlap.indexOf(marker);

    if (markerIndex >= 0) {
      const sliced = afterOverlap.slice(markerIndex + marker.length).trim();
      if (sliced) {
        const slicedStrict = extractCurrentCommandBlockStrict(sliced, command);
        if (slicedStrict.hasCommandEcho) return slicedStrict.block;
        const slicedBlock = extractLatestCommandBlock(sliced, command).trim();
        if (slicedBlock) return slicedBlock;
      }
    }
  }

  if (isPromptOnlyTransitionCommand(command)) {
    return extractLatestCommandBlock(output, command).trim();
  }

  return strict.hasCommandEcho ? strict.block : "";
}