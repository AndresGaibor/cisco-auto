import type { RuntimePrimitivePort } from "../../ports/runtime-primitive-port.js";
import type { VerificationResult, VerificationCheck } from "./ios-verification-service.js";

export interface ExpectedLink {
  deviceA: string;
  portA: string;
  deviceB: string;
  portB: string;
}

export interface ExpectedNeighbor {
  device: string;
  localPort?: string;
  remoteDevice: string;
}

export class TopologyConnectivityVerificationService {
  constructor(private readonly primitivePort: RuntimePrimitivePort) {}

  private normalize(value: string): string {
    return String(value ?? "").trim().toLowerCase();
  }

  private sameLink(a: ExpectedLink, b: ExpectedLink): boolean {
    const a1 = `${this.normalize(a.deviceA)}:${this.normalize(a.portA)}`;
    const a2 = `${this.normalize(a.deviceB)}:${this.normalize(a.portB)}`;
    const b1 = `${this.normalize(b.deviceA)}:${this.normalize(b.portA)}`;
    const b2 = `${this.normalize(b.deviceB)}:${this.normalize(b.portB)}`;

    return (a1 === b1 && a2 === b2) || (a1 === b2 && a2 === b1);
  }

  async verifyExpectedLinks(expectedLinks: ExpectedLink[]): Promise<VerificationResult> {
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const result = await this.primitivePort.runPrimitive("topology.snapshot", {}, { timeoutMs: 15000 });
      if (!result.ok || !result.value || typeof result.value !== "object") {
        return {
          executed: false,
          verified: false,
          verificationSource: ["topology.snapshot"],
          warnings: ["No se pudo obtener topology snapshot"],
        };
      }

      const links = Array.isArray((result.value as any).links) ? (result.value as any).links : [];

      for (const expected of expectedLinks) {
        const found = links.some((link: any) =>
          this.sameLink(expected, {
            deviceA: link.device1,
            portA: link.port1,
            deviceB: link.device2,
            portB: link.port2,
          }),
        );

        checks.push({
          name: "expected-link-present",
          ok: found,
          details: expected,
        });

        if (!found) {
          warnings.push(
            `Enlace no detectado: ${expected.deviceA}:${expected.portA} <-> ${expected.deviceB}:${expected.portB}`,
          );
        }
      }

      return {
        executed: true,
        verified: checks.length > 0 && checks.every((c) => c.ok),
        partiallyVerified: checks.some((c) => c.ok) && checks.some((c) => !c.ok) ? true : undefined,
        verificationSource: ["topology.snapshot"],
        warnings,
        checks,
      };
    } catch (e) {
      return {
        executed: false,
        verified: false,
        verificationSource: ["topology.snapshot"],
        warnings: [String(e)],
        checks,
      };
    }
  }

  async verifyExpectedNeighbors(
    device: string,
    expectedNeighbors: ExpectedNeighbor[],
    exec: (
      device: string,
      command: string,
      parse?: boolean,
      timeout?: number
    ) => Promise<{ raw: string; parsed?: unknown }>,
  ): Promise<VerificationResult> {
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const out = await exec(device, "show cdp neighbors", false, 15000);
      const raw = out.raw || "";

      for (const expected of expectedNeighbors) {
        const hasRemote = raw.toLowerCase().includes(expected.remoteDevice.toLowerCase());
        const hasLocal = expected.localPort
          ? raw.toLowerCase().includes(expected.localPort.toLowerCase())
          : true;
        const ok = hasRemote && hasLocal;

        checks.push({
          name: "expected-neighbor-present",
          ok,
          details: expected,
        });

        if (!ok) {
          warnings.push(
            `Vecino no detectado en ${device}: remote=${expected.remoteDevice}` +
              (expected.localPort ? ` localPort=${expected.localPort}` : ""),
          );
        }
      }

      return {
        executed: true,
        verified: checks.length > 0 && checks.every((c) => c.ok),
        partiallyVerified: checks.some((c) => c.ok) && checks.some((c) => !c.ok) ? true : undefined,
        verificationSource: ["show cdp neighbors"],
        warnings,
        checks,
      };
    } catch (e) {
      return {
        executed: false,
        verified: false,
        verificationSource: ["show cdp neighbors"],
        warnings: [String(e)],
        checks,
      };
    }
  }

  async verifyLinkCountAtLeast(minLinks: number): Promise<VerificationResult> {
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];

    try {
      const result = await this.primitivePort.runPrimitive("topology.snapshot", {}, { timeoutMs: 15000 });
      if (!result.ok || !result.value || typeof result.value !== "object") {
        return {
          executed: false,
          verified: false,
          verificationSource: ["topology.snapshot"],
          warnings: ["No se pudo obtener topology snapshot"],
        };
      }

      const links = Array.isArray((result.value as any).links) ? (result.value as any).links : [];
      const ok = links.length >= minLinks;

      checks.push({
        name: "minimum-link-count",
        ok,
        details: { expectedMin: minLinks, found: links.length },
      });

      if (!ok) {
        warnings.push(`Cantidad de enlaces insuficiente: esperados mínimo ${minLinks}, detectados ${links.length}`);
      }

      return {
        executed: true,
        verified: ok,
        verificationSource: ["topology.snapshot"],
        warnings,
        checks,
      };
    } catch (e) {
      return {
        executed: false,
        verified: false,
        verificationSource: ["topology.snapshot"],
        warnings: [String(e)],
        checks,
      };
    }
  }
}