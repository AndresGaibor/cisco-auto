// ============================================================================
// PT Control V2 - Record Start Command
// ============================================================================

import { Flags } from '@oclif/core';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { ValidationError } from '../../errors/index.js';

export default class RecordStart extends BaseCommand {
  static override description = 'Start recording operations to a file';

  static override examples = [
    '<%= config.bin %> record start',
    '<%= config.bin %> record start --output my-session.ndjson',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    output: Flags.string({
      description: 'Output file for recording',
      default: 'recording.ndjson',
      char: 'o',
    }),
  };

  async run(): Promise<void> {
    const output = this.flags.output as string;

    const outputPath = join(this.devDir, output);

    // Check if already recording
    const recordingMarker = join(this.devDir, '.recording');
    if (existsSync(recordingMarker)) {
      throw new ValidationError('Recording already in progress. Run `pt record stop` first.');
    }

    const controller = createDefaultPTController();
    const spinner = createSpinner('Starting recording...');

    await controller.start();

    try {
      spinner.start();

      // Create recording marker
      writeFileSync(recordingMarker, JSON.stringify({
        output: outputPath,
        started: Date.now(),
      }));

      // Create empty output file
      writeFileSync(outputPath, '');

      spinner.succeed('Recording started');

      if (this.globalFlags.format === 'json') {
        this.outputData({
          success: true,
          output: outputPath,
        });
      } else {
        this.print(`  Output: ${outputPath}`);
        this.print(`  Stop with: ${pc.cyan('pt record stop')}`);
      }

      // Note: Actual event recording would be implemented in the bridge
      this.printWarning('Note: Event recording is implemented at the bridge level');
    } catch (error) {
      spinner.fail('Failed to start recording');
      throw error;
    } finally {
      await controller.stop();
    }
  }
}