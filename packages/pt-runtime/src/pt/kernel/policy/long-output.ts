import { normalizeEol, lastNonEmptyLine } from "./output-block.js";
import { isIosPrompt } from "./prompt-detect.js";
import { isPagerOnlyLine, outputHasPager } from "./pager-detect.js";
import { lineContainsCommandEcho } from "./echo-handlers.js";
import { detectIosSemanticErrorFromOutput } from "./semantic-errors.js";

export function normalizeCommandForFallback(command: unknown): string {
  return String(command ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function isLongOutputReadOnlyIosCommand(command: unknown): boolean {
  const cmd = normalizeCommandForFallback(command);

  return (
    /^show\s+version\b/.test(cmd) ||
    /^show\s+running-config\b/.test(cmd) ||
    /^show\s+startup-config\b/.test(cmd) ||
    /^show\s+interfaces?\b/.test(cmd) ||
    /^show\s+tech-support\b/.test(cmd) ||
    /^show\s+logging\b/.test(cmd) ||
    /^show\s+controllers\b/.test(cmd) ||
    /^show\s+processes\b/.test(cmd) ||
    /^show\s+inventory\b/.test(cmd) ||
    /^show\s+spanning-tree\b/.test(cmd) ||
    /^show\s+mac\s+address-table\b/.test(cmd) ||
    /^show\s+ip\s+route\b/.test(cmd)
  );
}

export function firstMeaningfulNativeOutputLine(output: unknown, command?: string): string {
  const lines = normalizeEol(output)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (isIosPrompt(line)) return false;
      if (isPagerOnlyLine(line)) return false;
      if (command && lineContainsCommandEcho(line, command)) return false;
      return true;
    });

  return lines[0] ?? "";
}

export function lineLooksLikeNativeInterfaceHeader(line: string): boolean {
  return /^(?:FastEthernet|GigabitEthernet|TenGigabitEthernet|Ethernet|Serial|Vlan|Port-channel|Loopback|Tunnel|Null)\S*\s+is\s+/i.test(
    String(line ?? "").trim(),
  );
}

export function nativeLongOutputLooksPartial(args: {
  command: string;
  block: string;
  hasCommandEcho: boolean;
}): boolean {
  if (!/^show\s+interfaces?\b/.test(normalizeCommandForFallback(args.command))) {
    return false;
  }

  const firstLine = firstMeaningfulNativeOutputLine(args.block, args.command);

  if (!firstLine) {
    return false;
  }

  return !lineLooksLikeNativeInterfaceHeader(firstLine);
}

export const PARTIAL_LONG_OUTPUT_WARNING =
  "Output posiblemente parcial: el comando largo terminó sin eco ni encabezado inicial esperado.";

export function buildNativeLongOutputWarnings(args: {
  command: string;
  block: string;
  hasCommandEcho: boolean;
}): string[] {
  return nativeLongOutputLooksPartial(args) ? [PARTIAL_LONG_OUTPUT_WARNING] : [];
}

export function nativeLongOutputCanCompleteWithoutEcho(args: { block: string; command: string; prompt: string }): boolean {
  if (!isLongOutputReadOnlyIosCommand(args.command)) {
    return false;
  }

  const block = normalizeEol(args.block);
  const prompt = String(args.prompt ?? "").trim();

  if (!block.trim()) {
    return false;
  }

  if (outputHasPager(block)) {
    return false;
  }

  if (!isIosPrompt(prompt) && !isIosPrompt(lastNonEmptyLine(block))) {
    return false;
  }

  if (detectIosSemanticErrorFromOutput(block)) {
    return false;
  }

  if (!nativeLongOutputHasCommandEvidence(args.command, block)) {
    return false;
  }

  const meaningfulLines = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (isIosPrompt(line)) return false;
      if (isPagerOnlyLine(line)) return false;
      return true;
    });

  const cmd = normalizeCommandForFallback(args.command);
  const minimumMeaningfulLines = /^show\s+startup-config\b/.test(cmd) ? 1 : 3;

  return meaningfulLines.length >= minimumMeaningfulLines;
}

export function nativeLongOutputHasCommandEvidence(command: string, block: string): boolean {
  const cmd = normalizeCommandForFallback(command);
  const text = normalizeEol(block);

  if (/^show\s+version\b/.test(cmd)) {
    return (
      /Cisco IOS Software/i.test(text) ||
      /System image file/i.test(text) ||
      /Configuration register is/i.test(text) ||
      /\bVersion\s+\d+(?:\.\d+)?/i.test(text)
    );
  }

  if (/^show\s+running-config\b/.test(cmd)) {
    return (
      /Building configuration/i.test(text) ||
      /Current configuration\s*:/i.test(text) ||
      /interface\s+Vlan\d+/i.test(text) ||
      /hostname\s+\S+/i.test(text) ||
      /(?:^|\n)version\s+\S+/i.test(text) ||
      /(?:^|\n)end\s*$/i.test(text)
    );
  }

  if (/^show\s+startup-config\b/.test(cmd)) {
    return (
      /Using\s+\d+\s+bytes/i.test(text) ||
      /startup-config/i.test(text) ||
      /Current configuration\s*:/i.test(text) ||
      /(?:^|\n)version\s+\S+/i.test(text)
    );
  }

  if (/^show\s+ip\s+interface\s+brief\b/.test(cmd)) {
    return /Interface\s+IP-Address\s+OK\?\s+Method\s+Status\s+Protocol/i.test(text);
  }

  if (/^show\s+interfaces?\b/.test(cmd)) {
    const firstLine = firstMeaningfulNativeOutputLine(text, command);
    return lineLooksLikeNativeInterfaceHeader(firstLine);
  }

  return true;
}
