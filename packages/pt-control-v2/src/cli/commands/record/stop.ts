// ============================================================================
// PT Control V2 - Record Stop Command
// ============================================================================

import { existsSync, readFileSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { ValidationError } from '../../errors/index.js';

export default class RecordStop extends BaseCommand {
  static override description = 'Stop recording operations';

  static override examples = [
    '<%= config.bin %> record stop',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
  };

  async run(): Promise<void> {
    const recordingMarker = join(this.devDir, '.recording');

    if (!existsSync(recordingMarker)) {
      throw new ValidationError('No recording in progress');
    }

    const spinner = createSpinner('Stopping recording...');
    spinner.start();

    try {
      // Read recording info
      const recordingInfo = JSON.parse(readFileSync(recordingMarker, 'utf-8'));
      const outputPath = recordingInfo.output;

      // Remove marker
      unlinkSync(recordingMarker);

      // Get stats
      const outputStats = existsSync(outputPath)
        ? statSync(outputPath)
        : null;

      const lines = outputStats
        ? readFileSync(outputPath, 'utf-8').trim().split('\n').filter(Boolean).length
        : 0;

      const duration = Math.round((Date.now() - recordingInfo.started) / 1000);

      spinner.succeed('Recording stopped');

      if (this.globalFlags.format === 'json') {
        this.outputData({
          success: true,
          output: outputPath,
          duration,
          events: lines,
        });
      } else {
        this.print(`  Output: ${outputPath}`);
        this.print(`  Duration: ${duration}s`);
        this.print(`  Events: ${lines}`);
      }
    } catch (error) {
      spinner.fail('Failed to stop recording');
      throw error;
    }
  }
}