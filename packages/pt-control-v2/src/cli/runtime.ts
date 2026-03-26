// ============================================================================
// PT Control V2 - Runtime Commands
// ============================================================================

import { createDefaultPTController, PTController } from "../controller/index.js";
import { spawn } from "child_process";
import { existsSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "node:os";
import { readEvents, summarizeEvents, tailEvents } from "../tools/event-log.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_DEV_DIR = process.env.PT_DEV_DIR || `${process.env.HOME ?? homedir()}/pt-dev`;

export async function runtimeCommand(
  subcommand: string | undefined,
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  switch (subcommand) {
    case "build":
      await handleBuild(positional, options);
      break;
    case "deploy":
      await handleDeploy(positional, options);
      break;
  case "watch":
      await handleWatch(positional, options);
      break;
  case "events":
      await handleEvents(positional, options);
      break;
  case "status":
      await handleStatus(positional, options);
      break;
    default:
      if (subcommand) {
        console.error(`Unknown runtime subcommand: ${subcommand}`);
      }
      console.log(`
Runtime Commands:
  pt runtime build [--deploy]      Build the runtime files
  pt runtime deploy                Deploy runtime to PT dev directory
  pt runtime watch                 Watch and rebuild on changes
  pt runtime status                Show runtime status
  pt runtime events [--tail N]     Inspect events.ndjson (supports --type, --json, --verbose)

Options:
  --deploy        Also deploy after build
  --dev-dir       PT development directory (default: ~/pt-dev)

Examples:
  pt runtime build
  pt runtime build --deploy
  pt runtime deploy
  pt runtime watch
`);
      process.exit(1);
  }
}

async function handleBuild(
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  console.log("Building runtime files...\n");

  const runtimeGeneratorPath = join(__dirname, "..", "..", "src", "runtime-generator", "index.ts");

  if (!existsSync(runtimeGeneratorPath)) {
    console.error("Error: Runtime generator build script not found.");
    console.error(`Expected at: ${runtimeGeneratorPath}`);
    process.exit(1);
  }

  try {
    await runBunScript(runtimeGeneratorPath, "build");
    console.log("\nRuntime build complete.");

    // Auto-deploy if requested
    if (options.deploy) {
      console.log("\nDeploying...");
      await handleDeploy(positional, options);
    }
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

async function handleDeploy(
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  const devDir = (options["dev-dir"] as string) || DEFAULT_DEV_DIR;

  console.log(`Deploying runtime to: ${devDir}\n`);

  const runtimeGeneratorPath = join(__dirname, "..", "..", "src", "runtime-generator", "index.ts");

  if (!existsSync(runtimeGeneratorPath)) {
    console.error("Error: Runtime generator deploy script not found.");
    console.error(`Expected at: ${runtimeGeneratorPath}`);
    process.exit(1);
  }

  try {
    await runBunScript(runtimeGeneratorPath, "deploy");
    console.log("\nRuntime deployed successfully.");
    console.log(`\nFiles deployed to ${devDir}:`);
    console.log(`  - main.js      (load this in Packet Tracer)`);
    console.log(`  - runtime.js   (runtime code)`);
    console.log(`  - state.json   (state file)`);
    console.log(`  - command.json (command file)`);
    console.log(`  - response/    (response directory)`);
  } catch (error) {
    console.error("Deploy failed:", error);
    process.exit(1);
  }
}

async function handleWatch(
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  console.log("Watching for changes...\n");
  console.log("Press Ctrl+C to stop.\n");

  const runtimeGeneratorPath = join(__dirname, "..", "..", "src", "runtime-generator", "index.ts");

  if (!existsSync(runtimeGeneratorPath)) {
    console.error("Error: Runtime generator watch script not found.");
    console.error(`Expected at: ${runtimeGeneratorPath}`);
    process.exit(1);
  }

  await runBunScript(runtimeGeneratorPath, "watch");
}

async function handleStatus(
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  const devDir = (options["dev-dir"] as string) || DEFAULT_DEV_DIR;

  console.log(`Runtime Status (${devDir})\n`);

  const files = [
    { name: "main.js", desc: "PT extension entry point" },
    { name: "runtime.js", desc: "Runtime code" },
    { name: "state.json", desc: "State file" },
    { name: "command.json", desc: "Command file" },
    { name: "response", desc: "Response directory" },
  ];

  console.log("File".padEnd(20) + "Status".padEnd(12) + "Description");
  console.log("-".repeat(60));

  let allOk = true;
  for (const file of files) {
    const filePath = join(devDir, file.name);
    const exists = existsSync(filePath);
    let status = exists ? "OK" : "MISSING";
    let extra = "";

    if (exists) {
      try {
        const stats = statSync(filePath);
        if (file.name === "state.json" || file.name === "command.json") {
          extra = ` (${Math.round(Date.now() - stats.mtimeMs)}ms ago)`;
        }
      } catch {
        status = "ERROR";
        allOk = false;
      }
    } else {
      allOk = false;
    }

    const name = file.name.padEnd(19);
    const statusStr = status.padEnd(11);
    console.log(`${name}${statusStr}${file.desc}${extra}`);
  }

  console.log("");
  if (allOk) {
    console.log("All files present. Runtime is ready.");
  } else {
    console.log("Some files are missing. Run 'pt runtime build --deploy' to set up.");
  }

  // Check if PT is connected
  const stateFile = join(devDir, "state.json");
  if (existsSync(stateFile)) {
    try {
      const controller = createDefaultPTController();
      await controller.start();
      const state = controller.readState();
      await controller.stop();

      if (state) {
        console.log("\nPacket Tracer connection: ACTIVE");
        console.log(`Devices in topology: ${Object.keys((state as { devices?: Record<string, unknown> }).devices || {}).length}`);
      }
    } catch {
      console.log("\nPacket Tracer connection: NOT ACTIVE");
      console.log("Open Packet Tracer and load main.js to connect.");
    }
  }

  console.log("");
}

async function handleEvents(
  positional: string[],
  options: Record<string, unknown>
): Promise<void> {
  const devDir = (options["dev-dir"] as string) || DEFAULT_DEV_DIR;
  const eventsPath = join(devDir, "events.ndjson");

  if (!existsSync(eventsPath)) {
    console.error(`No events file found at ${eventsPath}`);
    process.exit(1);
  }

  const rawTail = Number(options["tail"] ?? 20);
  const tailValue = Number.isFinite(rawTail) && rawTail > 0 ? rawTail : 20;
  const typeOption = options["type"];
  const types =
    typeof typeOption === "string"
      ? typeOption.split(",").map((entry) => entry.trim()).filter(Boolean)
      : Array.isArray(typeOption)
      ? typeOption.map((entry) => String(entry))
      : undefined;

  const events = readEvents(eventsPath, { skipInvalid: true });
  const filtered = types && types.length
    ? events.filter((event) => types.includes(event.type))
    : events;

  const summary = summarizeEvents(filtered);
  const tailList = tailEvents(filtered, tailValue);

  console.log(`Events (${summary.total} total, ${Object.keys(summary.counts).length} types)`);
  Object.entries(summary.counts).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  if (options.json) {
    console.log(JSON.stringify(tailList, null, 2));
    return;
  }

  if (!tailList.length) {
    console.log("No events to show.");
    return;
  }

  tailList.forEach((event) => {
    const timestamp = new Date(event.ts).toISOString();
    const meta: string[] = [];

    if ("id" in event && event.id) {
      meta.push(`id=${event.id}`);
    }

    if ("ok" in event && event.ok !== undefined) {
      meta.push(`ok=${event.ok}`);
    }

    const metaText = meta
      .filter(Boolean)
      .join(" ");

    console.log(`[${timestamp}] ${event.type}${metaText ? ` (${metaText})` : ""}`);
    if (options.verbose) {
      console.log(`  ${JSON.stringify(event, null, 2)}`);
    }
  });
}

async function runBunScript(scriptPath: string, ...args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("bun", ["run", scriptPath, ...args], {
      stdio: "inherit",
      shell: false,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}
