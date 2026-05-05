import { describe, expect, test } from "bun:test";
import { parseTerminalOutput } from "../terminal-output-parsers.js";
import { verifyIosTerminalEvidence } from "./ios-evidence-verifier.js";

describe("verifyIosTerminalEvidence", () => {
  test("acepta show version válido", () => {
    const text = `
Cisco IOS Software, C2960 Software, Version 12.2
System image file is "flash:c2960-lanbase-mz.bin"
`;
    const warnings: string[] = [];
    const parsed = parseTerminalOutput("terminal.show-version", text);

    const verdict = verifyIosTerminalEvidence("terminal.show-version", text, parsed, warnings);

    expect(verdict).toMatchObject({
      ok: true,
      executionOk: true,
      evidenceOk: true,
    });
  });

  test("rechaza running-config contaminado con show version, ip brief y enable", () => {
    const text = [
      "Motherboard assembly number     : 73-9832-06",
      "Configuration register is 0xF",
      "SW-SRV-DIST>show version",
      "Cisco IOS Software, C2960 Software, Version 12.2",
      "SW-SRV-DIST>show ip interface brief",
      "Interface              IP-Address      OK? Method Status                Protocol",
      "FastEthernet0/1        unassigned      YES manual up                    up",
      "SW-SRV-DIST>enable",
    ].join("\n");

    const warnings: string[] = [];
    const parsed = parseTerminalOutput("terminal.show-running-config", text);

    const verdict = verifyIosTerminalEvidence(
      "terminal.show-running-config",
      text,
      parsed,
      warnings,
    );

    expect(verdict).toMatchObject({
      ok: false,
      executionOk: true,
      evidenceOk: false,
    });
    expect(warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("otro comando show"),
        expect.stringContaining("enable"),
      ]),
    );
  });

  test("acepta show running-config válido", () => {
    const text = `
Building configuration...

Current configuration : 2020 bytes
!
version 12.2
hostname SW-SRV-DIST
!
interface Vlan99
 ip address 192.168.99.6 255.255.255.0
!
end
`;
    const warnings: string[] = [];
    const parsed = parseTerminalOutput("terminal.show-running-config", text);

    const verdict = verifyIosTerminalEvidence(
      "terminal.show-running-config",
      text,
      parsed,
      warnings,
    );

    expect(verdict).toMatchObject({
      ok: true,
      executionOk: true,
      evidenceOk: true,
    });
  });
});
