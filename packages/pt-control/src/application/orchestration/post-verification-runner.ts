import type { PostVerificationSpec, PostVerificationSummary } from "../services/ios-post-verification.js";
import { IosPostVerificationService } from "../services/ios-post-verification.js";
import type {
  ScenarioEndToEndSpec,
  ScenarioEndToEndResult,
} from "../services/scenario-end-to-end-verification-service.js";
import { ScenarioEndToEndVerificationService } from "../services/scenario-end-to-end-verification-service.js";

export interface WorkflowPostVerificationRequest {
  device?: string;
  postChecks?: PostVerificationSpec[];
  scenario?: ScenarioEndToEndSpec;
}

export interface WorkflowPostVerificationResult {
  ok: boolean;
  warnings: string[];
  postVerification?: PostVerificationSummary;
  scenarioVerification?: ScenarioEndToEndResult;
  error?: string;
}

export class PostVerificationRunner {
  constructor(
    private readonly iosPostVerifier: IosPostVerificationService,
    private readonly scenarioVerifier: ScenarioEndToEndVerificationService,
  ) {}

  async run(request: WorkflowPostVerificationRequest): Promise<WorkflowPostVerificationResult> {
    const warnings: string[] = [];

    try {
      if (request.scenario) {
        const result = await this.scenarioVerifier.run(request.scenario);
        if (result.warnings?.length) warnings.push(...result.warnings);

        return {
          ok: result.executed && result.verified,
          warnings,
          scenarioVerification: result,
          error:
            result.executed && result.verified
              ? undefined
              : `Scenario verification failed: ${result.warnings.join("; ")}`,
        };
      }

      if (request.device && request.postChecks?.length) {
        const summary = await this.iosPostVerifier.run(request.device, request.postChecks);
        if (summary.warnings?.length) warnings.push(...summary.warnings);

        return {
          ok: summary.executed && summary.verified,
          warnings,
          postVerification: summary,
          error:
            summary.executed && summary.verified
              ? undefined
              : `Post-verification failed: ${summary.warnings.join("; ")}`,
        };
      }

      return {
        ok: true,
        warnings,
      };
    } catch (e) {
      return {
        ok: false,
        warnings,
        error: String(e),
      };
    }
  }
}