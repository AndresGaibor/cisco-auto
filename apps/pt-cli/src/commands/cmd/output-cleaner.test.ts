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
});
