#!/usr/bin/env bun
import { describe, expect, test } from "bun:test";
import { PUBLIC_COMMAND_DEFINITIONS } from "../../commands/command-registry.js";
import { renderRootHelp } from "../../cli/help-renderer.js";

describe("help UX", () => {
  test("root help enseña reglas mentales", () => {
    const help = renderRootHelp(PUBLIC_COMMAND_DEFINITIONS);

    expect(help).toContain("pt cmd");
    expect(help).toContain("pt set");
    expect(help).toContain("pt verify");
    expect(help).toContain("Primeros pasos");
    expect(help).toContain("Salida para agentes");
  });
});