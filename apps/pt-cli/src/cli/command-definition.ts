#!/usr/bin/env bun
import type { Command } from "commander";

export type PtCommandGroup =
  | "core"
  | "runtime"
  | "lab"
  | "topology"
  | "terminal"
  | "configuration"
  | "verification"
  | "debug";

export interface PtExample {
  command: string;
  description: string;
}

export interface PtCommandDefinition {
  id: string;
  name: string;
  aliases?: string[];
  group: PtCommandGroup;
  summary: string;
  description: string;
  examples: PtExample[];
  related: string[];
  agentHints: string[];
  hidden?: boolean;
  legacy?: boolean;
  factory: () => Command;
}

export interface PtCommandCatalog {
  publicCommands: PtCommandDefinition[];
  legacyCommands: PtCommandDefinition[];
  allCommands: PtCommandDefinition[];
}