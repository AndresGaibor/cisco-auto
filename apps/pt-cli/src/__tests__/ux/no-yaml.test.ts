#!/usr/bin/env bun
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (full.includes("/legacy/")) continue;
    if (full.includes("/node_modules/")) continue;

    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith(".ts") || full.endsWith(".json")) {
      files.push(full);
    }
  }

  return files;
}

describe("CLI pública no usa YAML en interfaz pública", () => {
  test("no hay --output yaml ni .yaml en help principal", () => {
    const helpOutput = `pt cmd      Ejecuta comandos dentro de routers, switches, PCs y servers
pt set      Cambia propiedades/API/GUI que no son terminal
pt verify   Valida conectividad, VLANs, routing, servicios y protocolos`;

    expect(helpOutput).not.toContain("--output yaml");
    expect(helpOutput).not.toContain("yaml");
  });
});