import type { ShowRunningConfig } from "@cisco-auto/types";

/**
 * Parser para output de "show running-config".
 * Extrae hostname, version, secciones de configuración e interfaces.
 * Agrupa líneas en secciones basadas en keywords (interface, router, vlan, etc.).
 * Skip headers como "Building configuration..." y prompts de sesión.
 * @param output - Output crudo del comando
 * @returns ShowRunningConfig con hostname, version, secciones e interfaces
 */
export function parseShowRun(output: string): ShowRunningConfig {
  const lines = output.split("\n");
  const sections: { section: string; content: string }[] = [];
  const interfaces: Record<string, string> = {};
  const configLines: string[] = [];
  
  let hostname: string | undefined;
  let version: string | undefined;
  let currentSection: string | undefined;
  let currentContent: string[] = [];

  function pushCurrentSection() {
    if (!currentSection || currentContent.length === 0) return;

    const content = currentContent.join("\n");
    sections.push({ section: currentSection, content });

    if (currentSection.startsWith("interface ")) {
      interfaces[currentSection.substring(10).trim()] = content;
    }

    currentSection = undefined;
    currentContent = [];
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip non-content lines
    if (trimmed === "!" || trimmed === "--More--") {
      pushCurrentSection();
      continue;
    }

    if (!trimmed) {
      pushCurrentSection();
      continue;
    }

    if (trimmed.startsWith("show running-config") ||
        trimmed.startsWith("Building configuration...") ||
        trimmed.startsWith("Router>") ||
        trimmed.startsWith("Router#")) {
      continue;
    }

    // Hostname
    if (trimmed.startsWith("hostname ")) {
      hostname = trimmed.substring(9).trim();
    }

    // Version
    if (trimmed.startsWith("version ")) {
      version = trimmed.substring(8).trim();
    }

    if (trimmed.length > 0 &&
        !trimmed.startsWith("show running-config") &&
        trimmed !== "Building configuration..." &&
        !trimmed.includes("--More--")) {
      configLines.push(trimmed);
    }

    const startsNewSection =
      trimmed.startsWith("interface ") ||
      trimmed.startsWith("vlan ") ||
      trimmed.startsWith("router ") ||
      trimmed.startsWith("ip access-list ") ||
      trimmed.startsWith("line ") ||
      trimmed.startsWith("class-map ") ||
      trimmed.startsWith("policy-map ") ||
      trimmed.startsWith("control-plane") ||
      trimmed.startsWith("banner ") ||
      trimmed.startsWith("aaa ");

    if (startsNewSection) {
      pushCurrentSection();
      currentSection = trimmed;
      currentContent = [trimmed];
      continue;
    }

    if (!currentSection) {
      currentSection = "global";
    }

    currentContent.push(trimmed);
  }

  pushCurrentSection();

  return {
    raw: output,
    hostname,
    version,
    sections,
    interfaces,
    lines: configLines,
  };
}