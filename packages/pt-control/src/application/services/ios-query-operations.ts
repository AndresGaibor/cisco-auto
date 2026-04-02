import type { CliSession } from "@cisco-auto/ios-domain";
import type {
  ParsedOutput,
  ShowIpInterfaceBrief,
  ShowVlan,
  ShowIpRoute,
  ShowRunningConfig,
} from "../../contracts/index.js";
import { resolveCapabilities, type DeviceCapabilities } from "../../domain/ios/capabilities/pt-capability-resolver.js";
import type { CapabilitySet } from "@cisco-auto/ios-domain";

export class IosQueryOperations {
  constructor(
    private getSession: (device: string) => CliSession,
    private execIos: <T = ParsedOutput>(device: string, command: string) => Promise<T>,
    private getDeviceModel: (device: string) => string,
  ) {}

  async resolveCapabilities(device: string): Promise<DeviceCapabilities> {
    const modelId = this.getDeviceModel(device);
    return resolveCapabilities(modelId);
  }

  async showIpInterfaceBrief(device: string): Promise<ShowIpInterfaceBrief> {
    const result = await this.execIos<ShowIpInterfaceBrief>(
      device,
      "show ip interface brief",
    );
    return result;
  }

  async showVlan(device: string): Promise<ShowVlan> {
    const result = await this.execIos<ShowVlan>(device, "show vlan");
    return result;
  }

  async showIpRoute(device: string): Promise<ShowIpRoute> {
    const result = await this.execIos<ShowIpRoute>(device, "show ip route");
    return result;
  }

  async showRunningConfig(device: string): Promise<ShowRunningConfig> {
    const result = await this.execIos<ShowRunningConfig>(device, "show running-config");
    // Cap output to avoid memory issues
    if (result?.raw && result.raw.length > 10_000_000) {
      result.raw = result.raw.substring(0, 10_000_000) + "\n... [TRUNCATED] ...\n";
    }
    return result;
  }

  async show(device: string, command: string): Promise<ParsedOutput> {
    return this.execIos<ParsedOutput>(device, command);
  }
}
