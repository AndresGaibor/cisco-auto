#!/usr/bin/env node
// ============================================================================
// PT Control V2 - CLI Entry Point
// ============================================================================

import { deviceCommand } from "./device.js";
import { linkCommand } from "./link.js";
import { configCommand } from "./config.js";
import { showCommand } from "./show.js";
import { inspectCommand } from "./inspect.js";
import { runtimeCommand } from "./runtime.js";
import { snapshotCommand } from "./snapshot.js";
import { logsCommand } from "./logs.js";
import { recordCommand } from "./record.js";
import { replayCommand } from "./replay.js";
import { completionCommand } from "./completion.js";

const VERSION = "1.0.0";

// ============================================================================
// CLI Parser
// ============================================================================

function parseArgs(args: string[]): { command: string; subcommand: string; options: Record<string, unknown>; positional: string[] } {
  const [command, subcommand, ...rest] = args;
  const options: Record<string, unknown> = {};
  const positional: string[] = [];

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const nextArg = rest[i + 1];
      if (nextArg && !nextArg.startsWith("--") && !nextArg.startsWith("-")) {
        options[key] = nextArg;
        i++;
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith("-")) {
      const key = arg.slice(1);
      options[key] = true;
    } else {
      positional.push(arg);
    }
  }

  return { command, subcommand, options, positional };
}

function printUsage(): void {
  console.log(`
pt-control v${VERSION} - Packet Tracer Control CLI

Usage:
  pt <command> <subcommand> [options] [args]

Nueva estructura:
  device    pt device list|add|remove|rename
  link      pt link list|add|remove
  config    pt config ios|host|set|get
  runtime   pt runtime build|deploy|watch|status
  tools     pt show|inspect|snapshot|logs|record|replay
  completion pt completion [shell]

Examples:
  pt device list --format table
  pt device add R1 router --x 100 --y 100
  pt device remove R1
  pt device rename R1 Router1
  pt link add R1:GigabitEthernet0/0 S1:GigabitEthernet0/1 --type straight
  pt link remove R1:GigabitEthernet0/0
  pt config ios R1 --commands "conf t" "hostname R1"
  pt config host PC1 --ip 192.168.1.10 --mask 255.255.255.0
  pt config set dev-dir ~/pt-dev
  pt config get dev-dir
  pt runtime build --deploy
  pt runtime status
  pt show R1 "ip interface brief"
  pt inspect R1
  pt snapshot save base-topology
  pt snapshot load base-topology
  pt logs --follow
  pt record start --output ops.ndjson
  pt record stop
  pt replay --file ops.ndjson --speed 1.0
  pt completion bash

Options:
  --help, -h     Show this help message
  --version, -v  Show version
  --dev-dir      PT development directory (default: ~/pt-dev)
  --json         Output as JSON
  --verbose      Verbose output
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    printUsage();
    process.exit(0);
  }

  if (args[0] === "--version" || args[0] === "-v") {
    console.log(`pt-control v${VERSION}`);
    process.exit(0);
  }

  const { command, subcommand, options, positional } = parseArgs(args);

  try {
    switch (command) {
      case "device":
        await deviceCommand(subcommand, positional, options);
        break;
      case "link":
        await linkCommand(subcommand, positional, options);
        break;
      case "config":
        await configCommand(subcommand, positional, options);
        break;
      case "show":
        await showCommand(subcommand, positional, options);
        break;
      case "inspect":
        await inspectCommand(subcommand, positional, options);
        break;
      case "runtime":
        await runtimeCommand(subcommand, positional, options);
        break;
      case "snapshot":
        await snapshotCommand(subcommand, positional, options);
        break;
      case "logs":
        await logsCommand(subcommand, positional, options);
        break;
      case "record":
        await recordCommand(subcommand, positional, options);
        break;
      case "replay":
        await replayCommand(subcommand, positional, options);
        break;
      case "completion":
        await completionCommand(positional, options);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  }
}

main();
