// ============================================================================
// PT Control V2 - Runtime Events Command
// ============================================================================

import { Flags } from '@oclif/core';
import { existsSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { BaseCommand } from '../../base-command.js';
import { ValidationError } from '../../errors/index.js';
import { readEvents, summarizeEvents, tailEvents } from '../../../tools/event-log.js';

export default class RuntimeEvents extends BaseCommand {
  static override description = 'Inspect PT event log (V2: logs/events.current.ndjson, V1: events.ndjson)';

  static override examples = [
    '<%= config.bin %> runtime events',
    '<%= config.bin %> runtime events --tail 50',
    '<%= config.bin %> runtime events --type addDevice,removeDevice',
    '<%= config.bin %> runtime events --format json',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    tail: Flags.integer({
      description: 'Number of recent events to show',
      default: 20,
      char: 'n',
    }),
    type: Flags.string({
      description: 'Filter by event type(s), comma-separated',
      char: 't',
    }),
  };

  async run(): Promise<void> {
    const tail = this.flags.tail as number;
    const typeFilter = this.flags.type as string | undefined;

    const v2EventsPath = join(this.devDir, 'logs', 'events.current.ndjson');
    const v1EventsPath = join(this.devDir, 'events.ndjson');

    const eventsPath = existsSync(v2EventsPath) ? v2EventsPath : v1EventsPath;

    if (!existsSync(eventsPath)) {
      throw new ValidationError(`No events file found. Tried:\n  V2: ${v2EventsPath}\n  V1: ${v1EventsPath}`);
    }

    // Parse type filter
    const types = typeFilter
      ? typeFilter.split(',').map(t => t.trim()).filter(Boolean)
      : undefined;

    const events = readEvents(eventsPath, { skipInvalid: true });
    const filtered = types && types.length
      ? events.filter(event => types.includes(event.type))
      : events;

    const summary = summarizeEvents(filtered);
    const tailList = tailEvents(filtered, tail);

    // Summary header
    this.print(`Events (${summary.total} total, ${Object.keys(summary.counts).length} types)`);

    if (!this.globalFlags.quiet) {
      for (const [type, count] of Object.entries(summary.counts)) {
        this.print(`  ${type}: ${count}`);
      }
    }

    if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
      this.outputData(tailList);
      return;
    }

    this.print('');

    if (tailList.length === 0) {
      this.print('No events to show.');
      return;
    }

    // Display events
    for (const event of tailList) {
      const timestamp = new Date(event.ts).toISOString();
      const meta: string[] = [];

      if ('id' in event && event.id) {
        meta.push(`id=${event.id}`);
      }

      if ('ok' in event && event.ok !== undefined) {
        meta.push(`ok=${event.ok}`);
      }

      const metaText = meta.filter(Boolean).join(' ');

      this.print(`[${pc.gray(timestamp)}] ${pc.cyan(event.type)}${metaText ? ` (${metaText})` : ''}`);

      if (this.globalFlags.verbose) {
        this.print(`  ${JSON.stringify(event, null, 2)}`);
      }
    }
  }
}