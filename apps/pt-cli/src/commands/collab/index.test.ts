import { describe, expect, test } from "bun:test";
import { Command } from "commander";
import { createCollabCommand } from "./index.js";

describe("createCollabCommand", () => {
  test("expone el comando collab con subcomandos principales visibles", () => {
    const command = createCollabCommand();
    expect(command.name()).toBe("collab");
    expect(command.description()).toContain("PT Collab");

    // Los comandos visibles tienen _hidden = undefined (no oculto)
    const visibleCommands = command.commands
      .filter((c) => !c._hidden)
      .map((c) => c.name())
      .sort();
    expect(visibleCommands).toEqual(["connect", "start", "status", "stop"]);
  });

  test("oculta comandos avanzados via _hidden", () => {
    const command = createCollabCommand();
    const hiddenCommands = command.commands
      .filter((c) => c._hidden)
      .map((c) => c.name())
      .sort();
    expect(hiddenCommands).toContain("checkpoint");
    expect(hiddenCommands).toContain("conflicts");
    expect(hiddenCommands).toContain("multiuser");
    expect(hiddenCommands).toContain("peers");
    expect(hiddenCommands).toContain("resolve");
    expect(hiddenCommands).toContain("resync");
    expect(hiddenCommands).toContain("doctor");
    expect(hiddenCommands).toContain("reset-url");
  });

  test("start expone opciones esperadas y default public-port es 8443", () => {
    const command = createCollabCommand();
    const cmd = command.commands.find((c) => c.name() === "start")!;
    const options = cmd.options.map((o) => o.long);
    expect(options).toContain("--port");
    expect(options).toContain("--public-port");
    expect(options).toContain("--json");
    const pubPort = cmd.options.find((o) => o.long === "--public-port");
    expect(pubPort?.defaultValue).toBe(8443);
  });

  test("connect acepta URL opcional", () => {
    const command = createCollabCommand();
    const cmd = command.commands.find((c) => c.name() === "connect")!;
    expect(cmd._args.length).toBeGreaterThan(0);
    const options = cmd.options.map((o) => o.long);
    expect(options).toContain("--name");
    expect(options).toContain("--reset-url");
    expect(options).toContain("--json");
  });

  test("stop y status existen como comandos principales", () => {
    const command = createCollabCommand();
    const names = command.commands.filter((c) => !c._hidden).map((c) => c.name());
    expect(names).toContain("stop");
    expect(names).toContain("status");
  });

  test("doctor existe como comando avanzado oculto", () => {
    const command = createCollabCommand();
    const cmd = command.commands.find((c) => c.name() === "doctor");
    expect(cmd).toBeDefined();
    expect(cmd!._hidden).toBe(true);
  });
});
