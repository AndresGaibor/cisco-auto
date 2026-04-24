import type { ShowVersion } from "@cisco-auto/types";

/**
 * Parser para output de "show version".
 * Extrae version IOS, uptime, hostname, imagen, processor y config register.
 * Solo captura la primera versión encontrada (descarta BOOTLDR/ROM versions).
 * @param output - Output crudo del comando
 * @returns ShowVersion con campos extraídos
 */
export function parseShowVersion(output: string): ShowVersion {
  const result: ShowVersion = { raw: output };
  const lines = output.split("\n");

  for (const line of lines) {
    // Only capture the FIRST version found (IOS software version, not BOOTLDR/ROM versions)
    if (!result.version && line.includes("Version")) {
      result.version = line.match(/Version ([^,\s]+)/)?.[1];
    }

    if (line.includes(" uptime is ")) {
      result.uptime = line.substring(line.indexOf(" uptime is ") + 11).trim();
    }

    // Hostname is first word before " uptime" (handles indented lines)
    const hostMatch = line.match(/^(\S+)\s+uptime is/);
    if (!result.hostname) {
      const hostMatch2 = line.match(/(\S+)\s+uptime is/);
      if (hostMatch2) {
        result.hostname = hostMatch2[1]!;
      }
    }

    if (line.includes("image file is")) {
      const imgMatch = line.match(/image file is "([^"]+)"/);
      if (imgMatch) result.image = imgMatch[1];
    } else if (line.includes("image:")) {
      result.image = line.match(/image: (\S+)/)?.[1];
    }

    if (line.includes("processor")) {
      result.processor = line.match(/(.+) processor/)?.[1]?.trim();
    }

    if (line.includes("Configuration register")) {
      result.configRegister = line.match(/Configuration register is (\S+)/)?.[1];
    }
  }

  return result;
}