import { describe, expect, it } from "bun:test";
import { parseTerminalOutput } from "../terminal-output-parsers.js";
import { verifyTerminalEvidence } from "../terminal-evidence-verifier.js";

describe("terminal evidence verifier", () => {
  it("verifica show version", () => {
    const raw = `
Cisco IOS Software, C2960 Software
System image file is "flash:c2960.bin"
Switch uptime is 3 days
`;
    const parsed = parseTerminalOutput("terminal.show-version", raw);
    const verdict = verifyTerminalEvidence("terminal.show-version", raw, parsed, 0);

    expect(parsed?.parserId).toBe("ios.show-version");
    expect(verdict.ok).toBe(true);
  });

  it("verifica host ipconfig", () => {
    const raw = `
IP Address..................: 192.168.1.10
Subnet Mask.................: 255.255.255.0
Default Gateway.............: 192.168.1.1
`;
    const parsed = parseTerminalOutput("host.ipconfig", raw);
    const verdict = verifyTerminalEvidence("host.ipconfig", raw, parsed, 0);

    expect(parsed?.parserId).toBe("host.ipconfig");
    expect(verdict.ok).toBe(true);
  });

  it("falla si output está vacío", () => {
    const verdict = verifyTerminalEvidence("terminal.show-version", "", null, 0);
    expect(verdict.ok).toBe(false);
  });
});