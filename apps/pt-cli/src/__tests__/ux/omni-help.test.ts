import { describe, expect, test } from "bun:test";
import { createOmniCommand } from "../../commands/omni/index.js";

describe("omni help", () => {
  test("incluye raw, inspect, topology, device y assessment", () => {
    const cmd = createOmniCommand();
    const names = cmd.commands.map((sub) => sub.name());

    expect(names).toContain("raw");
    expect(names).toContain("inspect");
    expect(names).toContain("topology");
    expect(names).toContain("device");
    expect(names).toContain("assessment");
    expect(names).toContain("capability");
  });

  test("inspect tiene subcomandos env, scope, process", () => {
    const cmd = createOmniCommand();
    const inspectCmd = cmd.commands.find((sub) => sub.name() === "inspect");
    expect(inspectCmd).toBeDefined();
    const inspectSubnames = inspectCmd!.commands.map((sub) => sub.name());
    expect(inspectSubnames).toContain("env");
    expect(inspectSubnames).toContain("scope");
    expect(inspectSubnames).toContain("process");
  });

  test("device tiene subcomandos genome y port", () => {
    const cmd = createOmniCommand();
    const deviceCmd = cmd.commands.find((sub) => sub.name() === "device");
    expect(deviceCmd).toBeDefined();
    const deviceSubnames = deviceCmd!.commands.map((sub) => sub.name());
    expect(deviceSubnames).toContain("genome");
    expect(deviceSubnames).toContain("port");
  });

  test("assessment tiene subcomandos running-config, item, correct, time", () => {
    const cmd = createOmniCommand();
    const assessCmd = cmd.commands.find((sub) => sub.name() === "assessment");
    expect(assessCmd).toBeDefined();
    const assessSubnames = assessCmd!.commands.map((sub) => sub.name());
    expect(assessSubnames).toContain("running-config");
    expect(assessSubnames).toContain("item");
    expect(assessSubnames).toContain("correct");
    expect(assessSubnames).toContain("time");
  });

  test("capability tiene subcomandos list, show, run", () => {
    const cmd = createOmniCommand();
    const capCmd = cmd.commands.find((sub) => sub.name() === "capability");
    expect(capCmd).toBeDefined();
    const capSubnames = capCmd!.commands.map((sub) => sub.name());
    expect(capSubnames).toContain("list");
    expect(capSubnames).toContain("show");
    expect(capSubnames).toContain("run");
  });
});
