#!/usr/bin/env bun

import { Command } from "commander";
import { mkdir, readdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { createHash } from "node:crypto";

const SKILL_NAME = "cisco-networking-assistant";
const SKILL_LOCK_FILE = "skills-lock.json";

const DESTINATIONS = [
  ".gemini/skills",
  ".claude/skills",
  ".qwen/skills",
  ".agents/skills",
];

interface DirEnt {
  name: string;
  isDirectory(): boolean;
  isFile(): boolean;
}

interface SkillLock {
  version: number;
  skills: Record<string, {
    source: string;
    sourceType: string;
    computedHash: string;
    description?: string;
    lastSync?: string;
    destinations?: string[];
  }>;
}

// Calcular hash de un directorio recursivamente
async function calcularHashDirectorio(dirPath: string): Promise<string> {
  const hash = createHash("sha256");
  
  async function procesarDirectorio(directorio: string): Promise<void> {
    const entries = await readdir(directorio, { withFileTypes: true });
    
    for (const entry of entries.sort((a: DirEnt, b: DirEnt) => a.name.localeCompare(b.name))) {
      const fullPath = join(directorio, entry.name);
      
      if (entry.isDirectory()) {
        hash.update(`dir:${entry.name}\n`);
        await procesarDirectorio(fullPath);
      } else {
        hash.update(`file:${entry.name}\n`);
        const contenido = await readFile(fullPath);
        hash.update(contenido);
      }
    }
  }
  
  await procesarDirectorio(dirPath);
  return hash.digest("hex");
}

// Copiar directorio recursivamente
async function copiarDirectorio(origen: string, destino: string, dryRun: boolean = false): Promise<string[]> {
  const archivosCopiados: string[] = [];
  
  async function procesarDir(src: string, dst: string): Promise<void> {
    if (!existsSync(dst)) {
      if (!dryRun) {
        await mkdir(dst, { recursive: true });
      }
      console.log(`  📁 Crear directorio: ${dst}`);
    }
    
    const entries = await readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const dstPath = join(dst, entry.name);
      
      if (entry.isDirectory()) {
        await procesarDir(srcPath, dstPath);
      } else {
        console.log(`  📄 Copiar: ${relative(origen, srcPath)}`);
        if (!dryRun) {
          // Crear directorio padre si no existe
          const parentDir = dirname(dstPath);
          if (!existsSync(parentDir)) {
            await mkdir(parentDir, { recursive: true });
          }
          await copyFile(srcPath, dstPath);
        }
        archivosCopiados.push(relative(origen, srcPath));
      }
    }
  }
  
  await procesarDir(origen, destino);
  return archivosCopiados;
}

// Verificar si un directorio está sincronizado
async function verificarSincronizacion(origen: string, destino: string): Promise<{ sincronizado: boolean; diferencias: string[] }> {
  const diferencias: string[] = [];
  
  async function compararDirs(src: string, dst: string, relPath: string = ""): Promise<void> {
    if (!existsSync(dst)) {
      diferencias.push(`Falta directorio: ${relPath || "."}`);
      return;
    }
    
    const srcEntries = await readdir(src, { withFileTypes: true });
    const dstEntries = await readdir(dst, { withFileTypes: true });
    
    const srcNames = new Set(srcEntries.map((e: DirEnt) => e.name));
    const dstNames = new Set(dstEntries.map((e: DirEnt) => e.name));
    
    // Verificar archivos/dirs que faltan en destino
    for (const entry of srcEntries) {
      const fullRelPath = relPath ? `${relPath}/${entry.name}` : entry.name;
      
      if (!dstNames.has(entry.name)) {
        diferencias.push(`Falta: ${fullRelPath}`);
      } else {
        const srcEntry = srcEntries.find((e: DirEnt) => e.name === entry.name)!;
        const dstEntry = dstEntries.find((e: DirEnt) => e.name === entry.name)!;
        
        if (srcEntry.isDirectory() && dstEntry.isDirectory()) {
          await compararDirs(join(src, entry.name), join(dst, entry.name), fullRelPath);
        } else if (srcEntry.isFile() && dstEntry.isFile()) {
          const srcContent = await readFile(join(src, entry.name));
          const dstContent = await readFile(join(dst, entry.name));
          
          if (!srcContent.equals(dstContent)) {
            diferencias.push(`Diferente: ${fullRelPath}`);
          }
        } else if (srcEntry.isFile() !== dstEntry.isFile()) {
          diferencias.push(`Tipo diferente: ${fullRelPath}`);
        }
      }
    }
  }
  
  await compararDirs(origen, destino);
  
  return {
    sincronizado: diferencias.length === 0,
    diferencias,
  };
}

// Leer skills-lock.json
async function leerSkillsLock(): Promise<SkillLock> {
  if (existsSync(SKILL_LOCK_FILE)) {
    const contenido = await readFile(SKILL_LOCK_FILE, "utf-8");
    return JSON.parse(contenido);
  }
  return { version: 1, skills: {} };
}

// Escribir skills-lock.json
async function escribirSkillsLock(data: SkillLock, dryRun: boolean = false): Promise<void> {
  const contenido = JSON.stringify(data, null, 2);
  
  if (dryRun) {
    console.log(`  📝 skills-lock.json (dry-run, no se escribirá):`);
    console.log(contenido);
  } else {
    await writeFile(SKILL_LOCK_FILE, contenido);
    console.log(`  ✅ skills-lock.json actualizado`);
  }
}

// Función principal de sincronización
async function sincronizarSkill(options: { dryRun?: boolean; check?: boolean; source?: string }) {
  const sourceDir = options.source 
    ? join(options.source, "skills", SKILL_NAME) 
    : join(".iflow", "skills", SKILL_NAME);
  
  console.log(`\n🔄 Sincronizando skill: ${SKILL_NAME}`);
  console.log(`📂 Directorio fuente: ${sourceDir}`);
  
  // Verificar que existe el directorio fuente
  if (!existsSync(sourceDir)) {
    console.error(`❌ Error: Directorio fuente no encontrado: ${sourceDir}`);
    process.exit(1);
  }
  
  // Modo check
  if (options.check) {
    console.log("\n🔍 Modo verificación de sincronía...\n");
    
    const skillLock = await leerSkillsLock();
    const sourceHash = skillLock.skills[SKILL_NAME]?.computedHash || "desconocido";
    let todoSincronizado = true;
    
    for (const destBase of DESTINATIONS) {
      const destDir = join(destBase, SKILL_NAME);
      const relDestDir = join(destBase, SKILL_NAME);
      
      if (!existsSync(destDir)) {
        console.log(`⏭️  ${relDestDir}: No existe (será creado en próxima sincronización)`);
        continue;
      }
      
      console.log(`\n📋 Verificando: ${relDestDir}`);
      const { sincronizado, diferencias } = await verificarSincronizacion(sourceDir, destDir);
      
      if (sincronizado) {
        console.log(`  ✅ Sincronizado`);
      } else {
        console.log(`  ❌ Diferencias encontradas:`);
        for (const diff of diferencias.slice(0, 10)) {
          console.log(`     - ${diff}`);
        }
        if (diferencias.length > 10) {
          console.log(`     ... y ${diferencias.length - 10} más`);
        }
        todoSincronizado = false;
      }
    }
    
    console.log(`\n📊 Hash fuente: ${sourceHash.substring(0, 16)}...`);
    
    if (todoSincronizado) {
      console.log(`\n✅ Todos los destinos están sincronizados`);
      process.exit(0);
    } else {
      console.log(`\n❌ Hay diferencias pendientes. Ejecuta sin --check para sincronizar.`);
      process.exit(1);
    }
  }
  
  // Sincronización normal
  console.log("\n📋 Destinos:");
  for (const dest of DESTINATIONS) {
    console.log(`  - ${dest}/`);
  }
  
  if (options.dryRun) {
    console.log("\n⚠️  MODO DRY-RUN - No se copiará nada\n");
  }
  
  // Calcular hash del source
  console.log("\n⏳ Calculando hash del source...");
  const sourceHash = await calcularHashDirectorio(sourceDir);
  console.log(`   Hash: ${sourceHash.substring(0, 16)}...`);
  
  // Copiar a cada destino
  console.log("\n📦 Iniciando sincronización...\n");
  
  for (const destBase of DESTINATIONS) {
    const destDir = join(destBase, SKILL_NAME);
    console.log(`\n➡️  Sincronizando: ${destDir}`);
    
    try {
      await copiarDirectorio(sourceDir, destDir, options.dryRun);
    } catch (error) {
      console.error(`   ❌ Error al copiar: ${error}`);
    }
  }
  
  // Actualizar skills-lock.json
  console.log("\n📝 Actualizando skills-lock.json...");
  const skillLock = await leerSkillsLock();
  
  if (!skillLock.skills[SKILL_NAME]) {
    skillLock.skills[SKILL_NAME] = {
      source: ".iflow/skills/cisco-networking-assistant",
      sourceType: "local",
      computedHash: sourceHash,
      description: "Asistente experto para tareas de redes Cisco y Packet Tracer",
    };
  } else {
    skillLock.skills[SKILL_NAME].computedHash = sourceHash;
  }
  
  skillLock.skills[SKILL_NAME].lastSync = new Date().toISOString();
  skillLock.skills[SKILL_NAME].destinations = DESTINATIONS.map(d => `${d}/${SKILL_NAME}`);
  
  await escribirSkillsLock(skillLock, options.dryRun);
  
  console.log("\n✅ Sincronización completada!");
  
  if (options.dryRun) {
    console.log("⚠️  Modo dry-run - ningún archivo fue modificado");
  }
}

// Programa principal
const program = new Command();

program
  .name("sync-skills")
  .description("Sincroniza la skill cisco-networking-assistant entre directorios CLI")
  .option("-d, --dry-run", "Muestra qué se haría sin copiar archivos")
  .option("-c, --check", "Verifica si todos los destinos están sincronizados")
  .option("-s, --source <path>", "Directorio fuente (default: .iflow/)")
  .action(sincronizarSkill);

program.parse();
