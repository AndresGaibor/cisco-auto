#!/usr/bin/env bun
import { Command } from "commander";
import chalk from "chalk";
import { Database } from "bun:sqlite";

function initializeSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
}

function getMemoryDb(): Database {
  const home = process.env.HOME || process.env.USERPROFILE || ".";
  const dbPath = `${home}/.cisco-auto/memory.db`;
  const dir = dbPath.substring(0, dbPath.lastIndexOf("/"));
  try {
    require("node:fs").mkdirSync(dir, { recursive: true });
  } catch {
    // Directorio ya existe o no se puede crear, continuar
  }
  const db = new Database(dbPath);
  initializeSchema(db);
  return db;
}

export function createConfigPrefsCommand(): Command {
  const cmd = new Command("prefs").description("Gestionar preferencias");

  cmd.addCommand(
    new Command("set")
      .description("Guardar una preferencia")
      .argument("<key>", "Clave de la preferencia")
      .argument("<value>", "Valor")
      .action((key, value) => {
        const db = getMemoryDb();
        const now = Math.floor(Date.now() / 1000);
        db.run("INSERT OR REPLACE INTO preferences (key, value, updated_at) VALUES (?, ?, ?)", [
          key,
          value,
          now,
        ]);
        console.log(chalk.green(`\n✓ Preferencia "${chalk.cyan(key)}" = "${chalk.cyan(value)}"\n`));
        db.close();
      }),
  );

  cmd.addCommand(
    new Command("get")
      .description("Obtener una preferencia")
      .argument("<key>", "Clave de la preferencia")
      .action((key) => {
        const db = getMemoryDb();
        const row = db.query("SELECT value FROM preferences WHERE key = ?").get(key);
        if (row) {
          console.log((row as { value: string }).value);
        } else {
          console.log(chalk.yellow(`Preferencia "${key}" no encontrada`));
        }
        db.close();
      }),
  );

  cmd.addCommand(
    new Command("list").description("Listar todas las preferencias").action(() => {
      const db = getMemoryDb();
      const prefs = db.query("SELECT * FROM preferences ORDER BY key").all();
      if (prefs.length === 0) {
        console.log(chalk.yellow("No hay preferencias guardadas."));
        db.close();
        return;
      }
      console.log(chalk.bold("\n⚙️ Preferencias\n"));
      for (const p of prefs as Array<{ key: string; value: string }>) {
        console.log(`  ${chalk.yellow(p.key)}: ${p.value}`);
      }
      console.log();
      db.close();
    }),
  );

  return cmd;
}
