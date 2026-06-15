export function isIosPrompt(value: unknown): boolean {
  const line = String(value ?? "").trim();
  return /^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line);
}

export function inferIosModeFromPrompt(prompt: unknown): string | null {
  const value = String(prompt ?? "").trim();

  if (/\(config-if-range\)#\s*$/i.test(value)) return "config-if-range";
  if (/\(config-if\)#\s*$/i.test(value)) return "config-if";
  if (/\(config-subif\)#\s*$/i.test(value)) return "config-subif";
  if (/\(config-router\)#\s*$/i.test(value)) return "config-router";
  if (/\(config-line\)#\s*$/i.test(value)) return "config-line";
  if (/\(config-vlan\)#\s*$/i.test(value)) return "config-vlan";
  if (/\(config\)#\s*$/i.test(value)) return "global-config";

  if (/#\s*$/.test(value)) return "privileged-exec";
  if (/>$/.test(value)) return "user-exec";

  return null;
}

export function isConfigPromptText(value: string): boolean {
  return /\(config[^)]*\)#\s*$/.test(String(value ?? "").trim());
}

export function normalizeIosMode(mode: unknown, prompt?: unknown): string {
  const promptMode = inferIosModeFromPrompt(prompt);

  if (promptMode) {
    return promptMode;
  }

  const raw = String(mode ?? "").trim().toLowerCase();

  if (raw === "user") return "user-exec";
  if (raw === "enable" || raw === "privileged" || raw === "privileged-exec") return "privileged-exec";
  if (raw === "global" || raw === "config" || raw === "global-config") return "global-config";
  if (raw === "config-if") return "config-if";
  if (raw === "config-if-range") return "config-if-range";
  if (raw === "config-subif") return "config-subif";
  if (raw === "config-router") return "config-router";
  if (raw === "config-line") return "config-line";
  if (raw === "config-vlan") return "config-vlan";
  if (raw === "interface-config") return "config-if";
  if (raw === "router-config") return "config-router";
  if (raw === "line-config") return "config-line";
  if (raw === "vlan-config") return "config-vlan";
  if (raw === "logout") return "logout";

  return raw || "unknown";
}

export function isConfigMode(mode: string | null | undefined, prompt?: unknown): boolean {
  const normalized = normalizeIosMode(mode, prompt);

  return normalized === "global-config" || normalized === "config" || normalized.startsWith("config-");
}

export function inferPromptFromTerminalText(text: string): string {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map(function (line) {
      return line.trim();
    })
    .filter(Boolean);

  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i] || "";

    if (/^[A-Za-z0-9._-]+(?:\(config[^)]*\))?[>#]$/.test(line)) {
      return line;
    }

    if (/[A-Z]:\\>$/.test(line)) {
      return line;
    }
  }

  return "";
}
