import {
  generateServicesCommands,
  validateServicesConfig,
  type ServicesConfigInput,
} from "@cisco-auto/kernel/plugins/services";
import {
  type DhcpServiceInput,
  type DhcpServiceResult,
  type NtpServiceInput,
  type NtpServiceResult,
  type SyslogServiceInput,
  type SyslogServiceResult,
  type NetworkServiceOutput,
  type NetworkServiceControllerPort,
} from "./network-services-types";

function cidrToMask(cidr: number): string {
  const mask = (0xffffffff << (32 - cidr)) >>> 0;
  return [(mask >>> 24) & 0xff, (mask >>> 16) & 0xff, (mask >>> 8) & 0xff, mask & 0xff].join(
    ".",
  );
}

export function parseNetworkCidr(input: string): { network: string; mask: string } {
  if (!input) return { network: "0.0.0.0", mask: "255.255.255.0" };
  const parts = input.split("/");
  if (parts.length === 2) {
    const cidr = Number(parts[1]);
    const mask = Number.isFinite(cidr) ? cidrToMask(cidr) : "255.255.255.0";
    return { network: parts[0]!, mask };
  }
  return { network: input, mask: "255.255.255.0" };
}

export function buildDhcpServiceCommands(
  deviceName: string,
  poolName: string,
  networkCidr: string,
): string[] {
  const { network, mask } = parseNetworkCidr(networkCidr);
  const spec: ServicesConfigInput = {
    deviceName,
    dhcp: [{ name: poolName, network, mask }],
  };
  const validation = validateServicesConfig(spec);
  if (!validation.ok) {
    throw new Error(
      `Invalid DHCP spec: ${validation.errors.map((e) => e.message).join("; ")}`,
    );
  }
  return generateServicesCommands(spec);
}

export function buildNtpServiceCommands(deviceName: string, server: string): string[] {
  const spec: ServicesConfigInput = {
    deviceName,
    ntp: { servers: [{ ip: server }] },
  };
  const validation = validateServicesConfig(spec);
  if (!validation.ok) {
    throw new Error(
      `Invalid NTP spec: ${validation.errors.map((e) => e.message).join("; ")}`,
    );
  }
  return generateServicesCommands(spec);
}

export function buildSyslogServiceCommands(deviceName: string, server: string): string[] {
  const spec: ServicesConfigInput = {
    deviceName,
    syslog: { servers: [{ ip: server }] },
  };
  return generateServicesCommands(spec);
}

export async function executeDhcpService(
  controller: NetworkServiceControllerPort,
  input: DhcpServiceInput,
): Promise<NetworkServiceOutput<DhcpServiceResult>> {
  try {
    const commands = buildDhcpServiceCommands(input.deviceName, input.poolName, input.network);

    await controller.start();
    try {
      await controller.configIos(input.deviceName, commands);
      return {
        ok: true,
        data: {
          device: input.deviceName,
          pool: input.poolName,
          network: input.network,
          commands,
          commandsGenerated: commands.length,
        },
      };
    } finally {
      await controller.stop();
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function executeNtpService(
  controller: NetworkServiceControllerPort,
  input: NtpServiceInput,
): Promise<NetworkServiceOutput<NtpServiceResult>> {
  try {
    const commands = buildNtpServiceCommands(input.deviceName, input.server);

    await controller.start();
    try {
      await controller.configIos(input.deviceName, commands);
      return {
        ok: true,
        data: {
          device: input.deviceName,
          server: input.server,
          commands,
          commandsGenerated: commands.length,
        },
      };
    } finally {
      await controller.stop();
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function executeSyslogService(
  controller: NetworkServiceControllerPort,
  input: SyslogServiceInput,
): Promise<NetworkServiceOutput<SyslogServiceResult>> {
  try {
    const commands = buildSyslogServiceCommands(input.deviceName, input.server);

    await controller.start();
    try {
      await controller.configIos(input.deviceName, commands);
      return {
        ok: true,
        data: {
          device: input.deviceName,
          server: input.server,
          commands,
          commandsGenerated: commands.length,
        },
      };
    } finally {
      await controller.stop();
    }
  } catch (error) {
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}