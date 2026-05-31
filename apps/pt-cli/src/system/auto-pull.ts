import { execSync } from "child_process";

const HELP_FLAGS = new Set(["--help", "-h", "--version", "-V"]);

const DISABLE_ENV = process.env.PT_AUTO_PULL === "0" || process.env.PT_AUTO_PULL === "false";

export function autoPull(argv = process.argv): void {
  if (DISABLE_ENV) return;

  // Omitir para comandos de ayuda/versión
  if (argv.slice(2).some((arg) => HELP_FLAGS.has(arg))) return;

  // Verificar si hay cambios sin commit
  try {
    const status = execSync("git status --porcelain", {
      encoding: "utf-8",
      cwd: process.cwd(),
      timeout: 5000,
    });
    if (status.trim().length > 0) return;
  } catch {
    return;
  }

  // Hacer git pull (fast-forward only)
  try {
    const result = execSync("git pull --ff-only 2>&1", {
      encoding: "utf-8",
      cwd: process.cwd(),
      timeout: 15000,
    });
    const output = result.trim();
    if (output && !output.includes("Already up to date")) {
      process.stderr.write(output + "\n");
    }
  } catch {
    // fallo silencioso
  }
}
