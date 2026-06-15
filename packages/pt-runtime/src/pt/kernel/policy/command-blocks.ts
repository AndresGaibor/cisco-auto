import { normalizeEol } from "./output-block.js";
import { lineContainsCommandEcho } from "./echo-handlers.js";
import { isIosPrompt } from "./prompt-detect.js";

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
