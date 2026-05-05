import { describe, expect, test } from "bun:test";
import { parseTerminalOutput } from "../terminal-output-parsers.js";
import { verifyHostTerminalEvidence } from "./host-evidence-verifier.js";

describe("verifyHostTerminalEvidence", () => {
  test("acepta ping con 0% pérdida", () => {
    const text = "Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),";
    const warnings: string[] = [];
    const parsed = parseTerminalOutput("host.ping", text);

    const verdict = verifyHostTerminalEvidence("host.ping", text, parsed, warnings);

    expect(verdict).toMatchObject({
      ok: true,
      executionOk: true,
      evidenceOk: true,
      semanticSuccess: true,
    });
  });

  test("rechaza ping con 100% pérdida pero conserva evidenceOk", () => {
    const text = "Packets: Sent = 4, Received = 0, Lost = 4 (100% loss),";
    const warnings: string[] = [];
    const parsed = parseTerminalOutput("host.ping", text);

    const verdict = verifyHostTerminalEvidence("host.ping", text, parsed, warnings);

    expect(verdict).toMatchObject({
      ok: false,
      executionOk: true,
      evidenceOk: true,
      semanticSuccess: false,
    });
    expect(verdict?.reason).toContain("Fallo de conectividad");
  });

  test("acepta ipconfig con IPv4 válida", () => {
    const text = `
FastEthernet0 Connection:
   IP Address......................: 192.168.1.10
   Subnet Mask.....................: 255.255.255.0
`;
    const warnings: string[] = [];
    const parsed = parseTerminalOutput("host.ipconfig", text);

    const verdict = verifyHostTerminalEvidence("host.ipconfig", text, parsed, warnings);

    expect(verdict).toMatchObject({
      ok: true,
      executionOk: true,
      evidenceOk: true,
    });
  });
});
