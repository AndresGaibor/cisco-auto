import { Args, Flags } from '@oclif/core';
import pc from 'picocolors';
import { BaseCommand, createSpinner } from '../../base-command.js';
import { createDefaultPTController } from '../../../controller/index.js';
import { DeviceNotFoundError, ValidationError } from '../../errors/index.js';
import type { DeviceState, ParsedOutput } from '../../../types/index.js';

const SHOW_COMMANDS = {
  'running-config': 'show running-config',
  'running': 'show running-config',
  'startup-config': 'show startup-config',
  'startup': 'show startup-config',
  'ip-route': 'show ip route',
  'route': 'show ip route',
  'vlan': 'show vlan brief',
  'vlans': 'show vlan brief',
  'interface-brief': 'show ip interface brief',
  'interfaces': 'show ip interface brief',
  'version': 'show version',
} as const;

type SupportedShowCommand = keyof typeof SHOW_COMMANDS;

export default class ConfigShow extends BaseCommand {
  static override description = 'Show configuration or status information from a device';

  static override examples = [
    '<%= config.bin %> config show R1',
    '<%= config.bin %> config show R1 running-config',
    '<%= config.bin %> config show S1 vlan',
    '<%= config.bin %> config show R1 ip-route',
    '<%= config.bin %> config show R1 --format json',
  ];

  static override args = {
    device: Args.string({
      description: 'Device name',
      required: true,
    }),
    command: Args.string({
      description: `Show command to execute (default: running-config). Supported: ${Object.keys(SHOW_COMMANDS).join(', ')}`,
      default: 'running-config',
    }),
  };

  static override flags = {
    ...BaseCommand.baseFlags,
    'no-pager': Flags.boolean({
      description: 'Disable pagination (terminal length 0)',
      default: false,
    }),
    'parse': Flags.boolean({
      description: 'Parse output (default: true)',
      default: true,
    }),
  };

  async run(): Promise<void> {
    const device = this.args.device as string;
    const commandArg = (this.args.command as string || 'running-config').toLowerCase() as SupportedShowCommand;
    const flags = this.flags;

    await this.runLoggedCommand({
      action: 'config:show',
      targetDevice: device,
      context: {
        command: commandArg,
        noPager: flags['no-pager'],
        parse: flags.parse,
      },
      execute: async () => {
        const showCommand = SHOW_COMMANDS[commandArg];
        if (!showCommand) {
          throw new ValidationError(
            `Comando '${commandArg}' no soportado. Comandos disponibles: ${Object.keys(SHOW_COMMANDS).join(', ')}`,
            {
              suggestions: Object.keys(SHOW_COMMANDS).map(cmd => `'${cmd}'`),
            }
          );
        }

        const controller = createDefaultPTController();
        this.trackController(controller);
        const spinner = createSpinner(`Fetching ${pc.cyan(showCommand)} from ${pc.cyan(device)}...`);

        await controller.start();

        try {
          const devices = await controller.listDevices() as DeviceState[];
          const deviceExists = devices.some((d: DeviceState) => d.name === device);

          if (!deviceExists) {
            throw new DeviceNotFoundError(device);
          }

          spinner.start();

          let actualCommand = showCommand;
          if (flags['no-pager']) {
            await controller.execIos(device, 'terminal length 0', false);
          }

          const result = await controller.execIos<ParsedOutput>(device, actualCommand, flags.parse as boolean | undefined);

          if (!result.raw && result.raw !== '') {
            throw new Error('No se recibió respuesta del dispositivo');
          }

          const cleanOutput = this.sanitizeOutput(result.raw);

          spinner.succeed(`Retrieved ${pc.cyan(showCommand)} from ${pc.cyan(device)}`);

          if (this.globalFlags.format === 'json') {
            const outputData = flags.parse && result.parsed
              ? { raw: cleanOutput, parsed: result.parsed }
              : { raw: cleanOutput };
            this.outputData(outputData);
          } else {
            this.print(cleanOutput);
          }
        } catch (error) {
          spinner.fail(`Failed to get configuration from ${device}`);
          throw error;
        } finally {
          await controller.stop();
        }
      },
    });
  }

  private sanitizeOutput(output: string): string {
    if (!output) return '';

    return output
      .replace(/--+\s*More\s*-+[\s\S]*/gi, '')
      .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
