import type { VerificationResult } from "./ios-verification-service.js";
import { TopologyConnectivityVerificationService, type ExpectedLink, type ExpectedNeighbor } from "./topology-connectivity-verification-service.js";
import { IosPostVerificationService, type PostVerificationSpec } from "./ios-post-verification.js";
import { IosVerificationService } from "./ios-verification-service.js";
import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";

export interface ScenarioVerificationDevice {
  device: string;
  postChecks?: PostVerificationSpec[];
  expectedNeighbors?: ExpectedNeighbor[];
}

export interface ScenarioEndToEndSpec {
  name: string;
  expectedLinks?: ExpectedLink[];
  minimumLinks?: number;
  devices?: ScenarioVerificationDevice[];
}

export interface ScenarioEndToEndResult {
  scenario: string;
  executed: boolean;
  verified: boolean;
  warnings: string[];
  sections: VerificationResult[];
}

export class ScenarioEndToEndVerificationService {
  private readonly topologyVerifier: TopologyConnectivityVerificationService;
  private readonly iosVerifier: IosVerificationService;
  private readonly iosPostVerifier: IosPostVerificationService;

  constructor(
    primitivePort: RuntimePrimitivePort,
    exec: (
      device: string,
      command: string,
      parse?: boolean,
      timeout?: number
    ) => Promise<{ raw: string; parsed?: unknown }>,
  ) {
    this.topologyVerifier = new TopologyConnectivityVerificationService(primitivePort);
    this.iosVerifier = new IosVerificationService(exec);
    this.iosPostVerifier = new IosPostVerificationService(this.iosVerifier);
  }

  async run(spec: ScenarioEndToEndSpec): Promise<ScenarioEndToEndResult> {
    const sections: VerificationResult[] = [];
    const warnings: string[] = [];

    if (spec.minimumLinks !== undefined) {
      const section = await this.topologyVerifier.verifyLinkCountAtLeast(spec.minimumLinks);
      sections.push(section);
      if (section.warnings?.length) warnings.push(...section.warnings);
    }

    if (spec.expectedLinks?.length) {
      const section = await this.topologyVerifier.verifyExpectedLinks(spec.expectedLinks);
      sections.push(section);
      if (section.warnings?.length) warnings.push(...section.warnings);
    }

    for (const deviceSpec of spec.devices ?? []) {
      if (deviceSpec.postChecks?.length) {
        const summary = await this.iosPostVerifier.run(deviceSpec.device, deviceSpec.postChecks);
        sections.push({
          executed: summary.executed,
          verified: summary.verified,
          verificationSource: ["post-verification"],
          warnings: summary.warnings,
          checks: summary.results.flatMap((r) => r.checks ?? []),
        });
        if (summary.warnings.length) warnings.push(...summary.warnings);
      }

      if (deviceSpec.expectedNeighbors?.length) {
        const neighborSection = await this.topologyVerifier.verifyExpectedNeighbors(
          deviceSpec.device,
          deviceSpec.expectedNeighbors,
          this.iosVerifier["exec"],
        );
        sections.push(neighborSection);
        if (neighborSection.warnings?.length) warnings.push(...neighborSection.warnings);
      }
    }

    const executed = sections.length > 0 && sections.every((s) => s.executed);
    const verified = sections.length > 0 && sections.every((s) => s.verified);

    return {
      scenario: spec.name,
      executed,
      verified,
      warnings,
      sections,
    };
  }
}