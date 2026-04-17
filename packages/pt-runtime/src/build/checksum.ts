export function computeChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function normalizeArtifactForChecksum(content: string): string {
  return content
    .split("\n")
    .filter(
      (line) =>
        !line.includes("PT-SCRIPT v2 active (build:") &&
        !line.includes("Generated at:") &&
        !line.includes("Build ID:"),
    )
    .join("\n");
}
