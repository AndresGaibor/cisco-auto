import type { LinkState } from "../contracts/index.js";
import type { TopologyService } from "../application/services/topology-service.js";

export class LinkFacade {
  constructor(private readonly topologyService: TopologyService) {}

  async addLink(
    device1: string,
    port1: string,
    device2: string,
    port2: string,
    linkType:
      | "auto"
      | "straight"
      | "cross"
      | "roll"
      | "fiber"
      | "phone"
      | "cable"
      | "serial"
      | "console"
      | "wireless"
      | "coaxial"
      | "octal"
      | "cellular"
      | "usb"
      | "custom_io" = "auto",
  ): Promise<LinkState> {
    return this.topologyService.addLink(device1, port1, device2, port2, linkType);
  }

  async removeLink(device: string, port: string): Promise<void> {
    await this.topologyService.removeLink(device, port);
  }
}