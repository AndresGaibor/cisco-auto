import { Command } from 'commander';
import { pushCommands } from '@cisco-auto/bridge';
import { RoutingGenerator } from '@cisco-auto/core';
import { AdvancedRoutingGenerator } from '@cisco-auto/core';
import type { EIGRP, OSPF } from '@cisco-auto/core';

const IPV4_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const CIDR_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\/(?:[0-9]|[12]\d|3[0-2])$/;

function validarIPv4(valor: string): boolean {
  return IPV4_REGEX.test(valor);
}

function validarCIDR(valor: string): boolean {
  return CIDR_REGEX.test(valor);
}

function parseEnteroObligatorio(valor: string, etiqueta: string): number {
  if (!/^\d+$/.test(valor.trim())) {
    throw new Error(`${etiqueta} debe ser un número entero válido`);
  }

  const numero = Number.parseInt(valor, 10);
  if (!Number.isInteger(numero) || numero <= 0) {
    throw new Error(`${etiqueta} debe ser un número entero válido`);
  }

  return numero;
}

async function enviarComandosRouting(dispositivo: string, comandos: string[]): Promise<void> {
  const resultado = await pushCommands(dispositivo, comandos);

  if (!resultado.success) {
    throw new Error(resultado.error || 'No se pudieron aplicar los comandos de routing');
  }

  console.log(`✅ Routing aplicado en ${dispositivo}`);
  if (resultado.commandId) {
    console.log(`   ID del comando: ${resultado.commandId}`);
  }
}

export function buildStaticRouteCommands(dispositivo: string, network: string, nextHop: string): string[] {
  void dispositivo;

  return RoutingGenerator.generateRouting({
    static: [
      {
        network,
        nextHop: nextHop === 'null0' ? 'null0' : nextHop,
        administrativeDistance: 1,
      },
    ],
  });
}

export function buildOspfEnableCommands(processId: number): string[] {
  const spec: OSPF = {
    processId,
    networks: [],
    defaultRoute: false,
  };

  return RoutingGenerator.generateRouting({ ospf: spec });
}

export function buildOspfAddNetworkCommands(processId: number, network: string, area: number | string): string[] {
  const spec: OSPF = {
    processId,
    networks: [
      {
        network,
        area,
      },
    ],
    defaultRoute: false,
  };

  return RoutingGenerator.generateRouting({ ospf: spec });
}

export function buildEigrpEnableCommands(asn: number): string[] {
  const spec: EIGRP = {
    autonomousSystem: asn,
    networks: [],
    noAutoSummary: true,
  };

  return RoutingGenerator.generateRouting({ eigrp: spec });
}

export function buildBgpEnableCommands(asn: number): string[] {
  return AdvancedRoutingGenerator.generateBGP({
    asn,
    neighbors: [],
  });
}

export function createRoutingCommand(): Command {
  const command = new Command('routing')
    .description('Comandos para configurar routing en dispositivos Cisco');

  const staticCommand = new Command('static')
    .description('Configurar rutas estáticas');

  staticCommand.addCommand(
    new Command('add')
      .description('Agregar una ruta estática')
      .requiredOption('--device <name>', 'Nombre del dispositivo')
      .requiredOption('--network <cidr>', 'Red destino en formato CIDR')
      .requiredOption('--next-hop <ip>', 'Siguiente salto o null0')
      .action(async (options) => {
        try {
          if (!validarCIDR(options.network)) {
            throw new Error(`La red debe tener formato CIDR válido: ${options.network}`);
          }

          if (options.nextHop !== 'null0' && !validarIPv4(options.nextHop)) {
            throw new Error(`El next-hop debe ser una IPv4 válida o null0: ${options.nextHop}`);
          }

          const comandos = buildStaticRouteCommands(options.device, options.network, options.nextHop);
          await enviarComandosRouting(options.device, comandos);
        } catch (error) {
          console.error('❌ Error configurando ruta estática:', error instanceof Error ? error.message : error);
          process.exit(1);
        }
      }),
  );

  const ospfCommand = new Command('ospf')
    .description('Configurar OSPF');

  ospfCommand.addCommand(
    new Command('enable')
      .description('Habilitar OSPF en un dispositivo')
      .requiredOption('--device <name>', 'Nombre del dispositivo')
      .requiredOption('--process-id <id>', 'ID del proceso OSPF')
      .action(async (options) => {
        try {
          const processId = parseEnteroObligatorio(options.processId, 'El process-id');
          const comandos = buildOspfEnableCommands(processId);
          await enviarComandosRouting(options.device, comandos);
        } catch (error) {
          console.error('❌ Error habilitando OSPF:', error instanceof Error ? error.message : error);
          process.exit(1);
        }
      }),
  );

  ospfCommand.addCommand(
    new Command('add-network')
      .description('Agregar una red a OSPF')
      .requiredOption('--device <name>', 'Nombre del dispositivo')
      .requiredOption('--network <cidr>', 'Red en formato CIDR')
      .requiredOption('--area <id>', 'Área OSPF')
      .action(async (options) => {
        try {
          if (!validarCIDR(options.network)) {
            throw new Error(`La red debe tener formato CIDR válido: ${options.network}`);
          }

          const area = /^\d+$/.test(options.area) ? parseEnteroObligatorio(options.area, 'El área') : options.area;
          const processId = 1;
          const comandos = buildOspfAddNetworkCommands(processId, options.network, area);
          await enviarComandosRouting(options.device, comandos);
        } catch (error) {
          console.error('❌ Error agregando red OSPF:', error instanceof Error ? error.message : error);
          process.exit(1);
        }
      }),
  );

  const eigrpCommand = new Command('eigrp')
    .description('Configurar EIGRP');

  eigrpCommand.addCommand(
    new Command('enable')
      .description('Habilitar EIGRP en un dispositivo')
      .requiredOption('--device <name>', 'Nombre del dispositivo')
      .requiredOption('--as <number>', 'Número de sistema autónomo')
      .action(async (options) => {
        try {
          const autonomousSystem = parseEnteroObligatorio(options.as, 'El AS');
          const comandos = buildEigrpEnableCommands(autonomousSystem);
          await enviarComandosRouting(options.device, comandos);
        } catch (error) {
          console.error('❌ Error habilitando EIGRP:', error instanceof Error ? error.message : error);
          process.exit(1);
        }
      }),
  );

  const bgpCommand = new Command('bgp')
    .description('Configurar BGP');

  bgpCommand.addCommand(
    new Command('enable')
      .description('Habilitar BGP en un dispositivo')
      .requiredOption('--device <name>', 'Nombre del dispositivo')
      .requiredOption('--as <number>', 'Número de sistema autónomo')
      .action(async (options) => {
        try {
          const autonomousSystem = parseEnteroObligatorio(options.as, 'El AS');
          const comandos = buildBgpEnableCommands(autonomousSystem);
          await enviarComandosRouting(options.device, comandos);
        } catch (error) {
          console.error('❌ Error habilitando BGP:', error instanceof Error ? error.message : error);
          process.exit(1);
        }
      }),
  );

  command.addCommand(staticCommand);
  command.addCommand(ospfCommand);
  command.addCommand(eigrpCommand);
  command.addCommand(bgpCommand);

  return command;
}
