import { describe, expect, test } from "bun:test";

import { cleanCmdOutput } from "./output-cleaner.js";

describe("cleanCmdOutput", () => {
  test("remueve el eco inicial del comando IOS", () => {
    const result = cleanCmdOutput({
      deviceKind: "ios",
      command: "show version",
      output: "show version\nCisco IOS Software\nSwitch#",
    });

    expect(result.output).toBe("Cisco IOS Software");
    expect(result.rawOutput).toContain("show version");
  });

  test("filtra syslogs IOS por defecto", () => {
    const result = cleanCmdOutput({
      deviceKind: "ios",
      command: "show ip interface brief",
      output: [
        "show ip interface brief",
        "%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up",
        "Interface IP-Address OK? Method Status Protocol",
      ].join("\n"),
    });

    expect(result.output).not.toContain("%LINK-5-CHANGED");
    expect(result.output).toContain("Interface IP-Address");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  test("conserva syslogs IOS con includeSyslogs", () => {
    const result = cleanCmdOutput({
      deviceKind: "ios",
      command: "show ip interface brief",
      includeSyslogs: true,
      output: [
        "show ip interface brief",
        "%LINK-5-CHANGED: Interface FastEthernet0/1, changed state to up",
        "Interface IP-Address OK? Method Status Protocol",
      ].join("\n"),
    });

    expect(result.output).toContain("%LINK-5-CHANGED");
  });

  test("no limpia de forma agresiva en host", () => {
    const result = cleanCmdOutput({
      deviceKind: "host",
      command: "ipconfig",
      output: "ipconfig\nFastEthernet0 Connection:(default port)",
    });

    expect(result.output).toContain("ipconfig");
  });

  test("remueve eco IOS cuando viene precedido por prompt", () => {
    const result = cleanCmdOutput({
      deviceKind: "ios",
      command: "show version",
      output: "SW-SRV-DIST>show version\nCisco IOS Software\nSW-SRV-DIST>",
    });

    expect(result.output).toBe("Cisco IOS Software");
    expect(result.rawOutput).toContain("SW-SRV-DIST>show version");
  });

  test("preserva eco del comando en errores IOS cuando preserveCommandEcho=true", () => {
    const result = cleanCmdOutput({
      deviceKind: "ios",
      command: "channel-group 7 mode active",
      preserveCommandEcho: true,
      output: [
        "channel-group 7 mode active",
        "                                           ^",
        "% Invalid input detected at '^' marker.",
        "",
        "[cleanup]",
        "end",
        "SW-SRV-DIST#",
        "%SYS-5-CONFIG_I: Configured from console by console",
      ].join("\n"),
    });

    expect(result.output).toContain("channel-group 7 mode active");
    expect(result.output).toContain("^");
    expect(result.output).toContain("% Invalid input detected");
    expect(result.output).not.toContain("%SYS-5-CONFIG_I");
    expect(result.warnings).not.toContain("Se filtró el eco del comando (1 línea/s).");
  });
});
