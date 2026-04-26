import type { DeviceState } from "../contracts/index.js";
import type { DeviceService } from "../application/services/device-service.js";
import type { HostCommandService } from "./host-command-service.js";

export class HostFacade {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly hostCommandService: HostCommandService,
  ) {}

  async configHost(
    device: string,
    options: {
      ip?: string;
      mask?: string;
      gateway?: string;
      dns?: string;
      dhcp?: boolean;
    },
  ): Promise<void> {
    await this.deviceService.configHost(device, options);
  }

  async configureDhcpServer(
    device: string,
    options: {
      enabled: boolean;
      port?: string;
      pools: Array<{
        name: string;
        network: string;
        mask: string;
        defaultRouter: string;
        dns?: string;
        startIp?: string;
        endIp?: string;
        maxUsers?: number;
      }>;
      excluded?: Array<{ start: string; end: string }>;
    },
  ): Promise<void> {
    await this.deviceService.configureDhcpServer(device, options);
  }

  async inspectDhcpServer(device: string, port?: string) {
    return this.deviceService.inspectDhcpServer(device, port);
  }

  async getHostHistory(device: string): Promise<{
    entries: Array<{ command: string; output: string; timestamp?: number }>;
    count: number;
    raw: string;
    methods?: string[];
  }> {
    return this.hostCommandService.getHostHistory(device);
  }

  async sendPing(device: string, target: string, timeoutMs = 30000): Promise<{
    success: boolean;
    raw: string;
    stats?: { sent: number; received: number; lost: number; lossPercent: number };
  }> {
    return this.hostCommandService.sendPing(device, target, timeoutMs);
  }

  async getHostIpconfig(device: string, timeoutMs = 15000) {
    return this.hostCommandService.getHostIpconfig(device, timeoutMs);
  }

  async getHostArp(device: string, timeoutMs = 15000) {
    return this.hostCommandService.getHostArp(device, timeoutMs);
  }

  async getHostTracert(device: string, target: string, timeoutMs = 60000) {
    return this.hostCommandService.getHostTracert(device, target, timeoutMs);
  }

  async getHostNslookup(device: string, target: string, timeoutMs = 20000) {
    return this.hostCommandService.getHostNslookup(device, target, timeoutMs);
  }

  async getHostNetstat(device: string, timeoutMs = 15000) {
    return this.hostCommandService.getHostNetstat(device, timeoutMs);
  }

  async getHostRoute(device: string, timeoutMs = 15000) {
    return this.hostCommandService.getHostRoute(device, timeoutMs);
  }

  async getHostTelnet(device: string, target: string, timeoutMs = 20000) {
    return this.hostCommandService.getHostTelnet(device, target, timeoutMs);
  }

  async getHostSsh(device: string, user: string, target: string, timeoutMs = 20000) {
    return this.hostCommandService.getHostSsh(device, user, target, timeoutMs);
  }

  async inspectHost(device: string): Promise<DeviceState> {
    return this.hostCommandService.inspectHost(device);
  }
}