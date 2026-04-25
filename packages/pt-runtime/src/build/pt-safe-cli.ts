// PT-Safe CLI - Build gate para validar que el runtime no usa features no compatibles con PT
import * as fs from "fs";
import * as path from "path";
import { checkFilesForPTSafety, formatBuildGateResult, type PtSafeCheckResult, type FileContent } from "./pt-safe-build-gate.js";

interface CLIOptions {
  files?: string[];
  dir?: string;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};
  const flags = args.slice(2);

  for (let i = 0; i < flags.length; i++) {
    if (flags[i] === "--files" || flags[i] === "-f") {
      const files: string[] = [];
      i++;
      while (i < flags.length && !flags[i].startsWith("--")) {
        files.push(flags[i]);
        i++;
      }
      options.files = files;
      i--;
    } else if (flags[i] === "--dir" || flags[i] === "-d") {
      i++;
      options.dir = flags[i];
    }
  }

  return options;
}

function collectJsFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "__tests__" && !entry.name.startsWith(".")) {
        files.push(...collectJsFiles(fullPath));
      }
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function main() {
  const options = parseArgs(Bun.argv);

  if (!options.files && !options.dir) {
    console.log("Usage: bun run pt-safe-cli.ts --files file1.js file2.js");
    console.log("   or: bun run pt-safe-cli.ts --dir src/runtime/");
    process.exit(1);
  }

  const filesToCheck: FileContent[] = [];

  if (options.files) {
    for (const file of options.files) {
      const fullPath = path.resolve(file);
      if (fs.existsSync(fullPath)) {
        filesToCheck.push({ path: fullPath, content: fs.readFileSync(fullPath, "utf-8") });
      } else {
        console.warn(`Warning: File not found: ${fullPath}`);
      }
    }
  }

  if (options.dir) {
    const fullDir = path.resolve(options.dir);
    const jsFiles = collectJsFiles(fullDir);
    for (const file of jsFiles) {
      filesToCheck.push({ path: file, content: fs.readFileSync(file, "utf-8") });
    }
  }

  const result: PtSafeCheckResult = checkFilesForPTSafety(filesToCheck);
  const output = formatBuildGateResult(result, filesToCheck.length);
  console.log(output);

  if (!result.safe) {
    process.exit(1);
  }

  process.exit(0);
}

main();