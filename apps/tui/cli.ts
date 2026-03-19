#!/usr/bin/env bun
/**
 * CLI entry point for TUI
 */

import { startTUI } from './src/index';

console.clear();
console.log('Starting Cisco Auto TUI...');
console.log('Press [q] or [Esc] to quit\n');

startTUI();
