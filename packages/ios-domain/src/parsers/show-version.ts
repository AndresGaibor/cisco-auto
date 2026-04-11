import type { ShowVersion } from "@cisco-auto/types";

/**
 * Parse "show version" output
 */
export function parseShowVersion(output: string): ShowVersion {
  const result: ShowVersion = { raw: output };
  const lines = output.split("\n");

  for (const line of lines) {
    if (line.includes("Version")) {
      result.version = line.match(/Version (\S+)/)?.[1];
    }

    if (line.includes(" uptime is ")) {
      result.uptime = line.substring(line.indexOf(" uptime is ") + 11).trim();
    }

    // Hostname is first word before " uptime"
    const hostMatch = line.match(/^(\S+)\s+uptime is/);
    if (hostMatch) {
      result.hostname = hostMatch[1]!;
    }

    if (line.includes("image:")) {
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