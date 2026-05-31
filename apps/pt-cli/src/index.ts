#!/usr/bin/env bun

import { parseProgram } from "./program";
import { autoPull } from "./system/auto-pull";

await autoPull(process.argv);
await parseProgram(process.argv);
