import type { ShowRunningConfig } from "@cisco-auto/types";

/**
 * Parse "show running-config" output
 */
export function parseShowRun(output: string): ShowRunningConfig {
  const lines = output.split("\n");
  const sections: ShowRunningConfig["sections"] = [];
  const interfaces: ShowRunningConfig["interfaces"] = {};
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

    if (!trimmed) {
      pushCurrentSection();
      continue;
    }

    if (trimmed === "!" || trimmed === "--More--") {
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
        trimmed !== "!" && 
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
      trimmed.startsWith("control-plane");

    if (startsNewSection) {
      pushCurrentSection();
      currentSection = trimmed;
      currentContent = [trimmed];
      continue;
    }

    if (!currentSection) {
      currentSection = "global";
      currentContent = [];
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