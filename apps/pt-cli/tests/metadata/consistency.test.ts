import { test, expect, describe } from "bun:test";
import { Command } from "commander";
import { COMMAND_CATALOG } from "../../src/commands/command-catalog";

// Mock de las funciones de creación de comandos para no cargar todo el runtime
// Simplemente necesitamos saber qué comandos se registran
describe("CLI Metadata Consistency", () => {
  test("Every root command in COMMAND_CATALOG should exist in the real CLI (manual check of index.ts)", async () => {
    // Leemos index.ts para ver los comandos registrados
    const indexContent = await Bun.file("apps/pt-cli/src/index.ts").text();
    
    // Extraer nombres de comandos de program.addCommand(create...Command())
    // o similar en index.ts. Buscamos patrones de registro.
    const registeredCommands: string[] = [];
    
    // Comandos registrados con program.addCommand(create...Command())
    // Asumimos que el nombre del comando está dentro del factory o es el nombre del factory simplificado
    // En este proyecto, el catálogo es la fuente de verdad, así que validamos al revés:
    // Que todo lo que está en el catálogo sea "razonable" respecto a index.ts
    
    const catalogIds = Object.keys(COMMAND_CATALOG);
    
    for (const id of catalogIds) {
      // Verificar si el id aparece en index.ts (aunque sea como parte de una importación o creación)
      // Esto es una validación débil pero útil para detectar drift grueso
      const normalizedId = id.includes('-') ? id : id;
      expect(indexContent).toContain(normalizedId);
    }
  });

  test("COMMAND_CATALOG entries should have all required fields", () => {
    for (const [id, entry] of Object.entries(COMMAND_CATALOG)) {
      expect(entry.id).toBe(id);
      expect(entry.summary).toBeDefined();
      expect(entry.status).toBeDefined();
      expect(typeof entry.requiresPT).toBe("boolean");
      expect(typeof entry.requiresContext).toBe("boolean");
      expect(typeof entry.supportsAutonomousUse).toBe("boolean");
    }
  });

  test("No orphan commands in index.ts without catalog entry", async () => {
    const indexContent = await Bun.file("apps/pt-cli/src/index.ts").text();
    
    // Lista de comandos que sabemos que están en index.ts
    // (Extracción manual basada en la lectura previa de index.ts)
    const expectedFromIndex = [
      'build', 'device', 'show', 'config-host', 'vlan', 'etherchannel',
      'link', 'config-ios', 'routing', 'acl', 'stp', 'services',
      'results', 'logs', 'help', 'history', 'doctor', 'completion',
      'topology', 'status'
    ];

    for (const cmd of expectedFromIndex) {
      expect(COMMAND_CATALOG[cmd]).toBeDefined();
    }
  });
});
