// ============================================================================
// PT Control V2 - Topology Validate Command
// ============================================================================

import { BaseCommand } from '../../base-command.js';

export default class TopologyValidate extends BaseCommand {
  static override description = 'Validate current topology for common issues';

  static override examples = [
    '<%= config.bin %> topology validate',
    '<%= config.bin %> topology validate --format json',
    '<%= config.bin %> topology validate --strict',
  ];

  static override flags = {
    ...BaseCommand.baseFlags,
    strict: BaseCommand.baseFlags['yes'],
  };

  async run(): Promise<void> {
    await this.runLoggedCommand({
      action: 'topology:validate',
      context: {
        format: this.globalFlags.format,
        strict: this.flags.strict,
      },
      execute: async () => {
        const controller = this.createController();
        this.trackController(controller);

        await controller.start();

        try {
          const snapshot = await controller.snapshot() as {
            devices: Record<string, {
              name: string;
              model: string;
              type: string;
              power: boolean;
              ports: unknown[];
              hostname?: string;
              ip?: string;
              gateway?: string;
            }>;
            links: Record<string, {
              id: string;
              device1: string;
              port1: string;
              device2: string;
              port2: string;
            }>;
          };

          const issues: Array<{
            severity: 'error' | 'warning' | 'info';
            code: string;
            message: string;
            device?: string;
          }> = [];

          const devices = Object.values(snapshot.devices);
          const links = Object.values(snapshot.links);

          for (const device of devices) {
            if (!device.power) {
              issues.push({
                severity: 'warning',
                code: 'DEVICE_POWERED_OFF',
                message: `Device '${device.name}' is powered off`,
                device: device.name,
              });
            }

            const ports = device.ports as Array<{ ipAddress?: string }> | undefined;
            const hasIP = ports?.some(p => p.ipAddress);
            if (!hasIP && device.type !== 'cloud' && device.type !== 'generic') {
              issues.push({
                severity: 'info',
                code: 'NO_IP_ADDRESS',
                message: `Device '${device.name}' has no IP address configured`,
                device: device.name,
              });
            }

            const routerTypes = ['router', 'switch_layer3', 'multilayer_device'];
            if (routerTypes.includes(device.type) && !device.gateway && hasIP) {
              issues.push({
                severity: 'warning',
                code: 'NO_GATEWAY',
                message: `Router '${device.name}' may need a default gateway`,
                device: device.name,
              });
            }
          }

          for (const link of links) {
            const fromDevice = snapshot.devices[link.device1];
            const toDevice = snapshot.devices[link.device2];

            if (!fromDevice?.power || !toDevice?.power) {
              issues.push({
                severity: 'error',
                code: 'LINK_TO_POWERED_OFF',
                message: `Link connects to powered-off device: ${link.device1}-${link.device2}`,
              });
            }
          }

          const result = {
            valid: issues.filter(i => i.severity === 'error').length === 0,
            issues,
            statistics: {
              totalIssues: issues.length,
              errors: issues.filter(i => i.severity === 'error').length,
              warnings: issues.filter(i => i.severity === 'warning').length,
              info: issues.filter(i => i.severity === 'info').length,
            },
          };

          if (this.globalFlags.format === 'json' || this.globalFlags.jq) {
            this.outputData(result);
            return;
          }

          if (result.valid) {
            this.printSuccess('Topology is valid');
          } else {
            this.printWarning('Topology has issues that need attention');
          }

          this.print('');
          this.print(`Issues: ${result.statistics.errors} errors, ${result.statistics.warnings} warnings, ${result.statistics.info} info`);

          if (issues.length > 0) {
            this.print('');
            this.outputData(issues);
          }
        } finally {
          await controller.stop();
        }
      },
    });
  }
}
