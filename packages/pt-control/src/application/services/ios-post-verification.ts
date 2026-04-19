import type { VerificationResult } from "./ios-verification-service.js";
import { IosVerificationService } from "./ios-verification-service.js";

export type PostVerificationSpec =
  | { type: "interface-ip"; interfaceName: string; expectedIp: string }
  | { type: "vlan-exists"; vlanId: number }
  | { type: "access-port"; portName: string; expectedVlan?: number }
  | { type: "trunk-port"; portName: string; expectedVlans?: number[] }
  | { type: "subinterface"; subinterfaceName: string; expectedIp: string }
  | { type: "static-route"; network: string; mask: string; nextHop: string }
  | { type: "dhcp-relay"; interfaceName: string; helperAddress: string }
  | { type: "dhcp-pool"; poolName: string }
  | { type: "ospf"; processId?: number }
  | { type: "acl"; aclNumber: number }
  | { type: "running-config-contains"; snippets: string[] };

export interface PostVerificationSummary {
  verified: boolean;
  executed: boolean;
  warnings: string[];
  results: VerificationResult[];
}

export class IosPostVerificationService {
  constructor(private readonly verifier: IosVerificationService) {}

  async run(device: string, specs: PostVerificationSpec[]): Promise<PostVerificationSummary> {
    const results: VerificationResult[] = [];
    const warnings: string[] = [];

    for (const spec of specs) {
      let result: VerificationResult;

      switch (spec.type) {
        case "interface-ip":
          result = await this.verifier.verifyInterfaceIp(device, spec.interfaceName, spec.expectedIp);
          break;
        case "vlan-exists":
          result = await this.verifier.verifyVlanExists(device, spec.vlanId);
          break;
        case "access-port":
          result = await this.verifier.verifyAccessPort(device, spec.portName, spec.expectedVlan);
          break;
        case "trunk-port":
          result = await this.verifier.verifyTrunkPort(device, spec.portName, spec.expectedVlans);
          break;
        case "subinterface":
          result = await this.verifier.verifySubinterface(device, spec.subinterfaceName, spec.expectedIp);
          break;
        case "static-route":
          result = await this.verifier.verifyStaticRoute(device, spec.network, spec.mask, spec.nextHop);
          break;
        case "dhcp-relay":
          result = await this.verifier.verifyDhcpRelay(device, spec.interfaceName, spec.helperAddress);
          break;
        case "dhcp-pool":
          result = await this.verifier.verifyDhcpPool(device, spec.poolName);
          break;
        case "ospf":
          result = await this.verifier.verifyOspf(device, spec.processId);
          break;
        case "acl":
          result = await this.verifier.verifyAcl(device, spec.aclNumber);
          break;
        case "running-config-contains":
          result = await this.verifier.verifyRunningConfigContains(device, spec.snippets);
          break;
        default: {
          const neverSpec: never = spec;
          throw new Error(`Unsupported post-verification spec: ${JSON.stringify(neverSpec)}`);
        }
      }

      results.push(result);
      if (result.warnings?.length) warnings.push(...result.warnings);
    }

    const executed = results.every((r) => r.executed);
    const verified = results.length > 0 && results.every((r) => r.verified);

    return {
      executed,
      verified,
      warnings,
      results,
    };
  }
}