import { Command } from 'commander';
import { createAPIServer } from '../../../../src/api/index.ts';

export function createServeCommand(): Command {
  return new Command('serve')
    .description('Start the REST API server')
    .option('-p, --port <port>', 'Port to listen on', '3000')
    .option('-h, --host <host>', 'Host to bind to', '0.0.0.0')
    .action((options) => {
      const port = parseInt(options.port);
      const host = options.host;

      console.log('Starting cisco-auto API server...');
      createAPIServer({ port, host });
    });
}
