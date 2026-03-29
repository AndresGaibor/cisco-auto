#!/usr/bin/env bun
/**
 * Summarize Log Script
 * 
 * Resume archivos de log en JSON sin mutar el archivo original
 * 
 * Uso: bun run summarize-log.ts <archivo.log> [opciones]
 * 
 * Opciones:
 *   --output <ruta>     Archivo de salida JSON (opcional, stdout si no se especifica)
 *   --format <formato>  Formato de salida: json, summary (default: json)
 *   --filter <nivel>    Filtra por nivel: debug, info, warn, error (opcional)
 *   -h, --help          Muestra esta ayuda
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { parseArgs } from 'util';
import { join, dirname } from 'path';

// Interfaces para el resumen
interface LogEntry {
  timestamp?: string;
  level?: string;
  message: string;
  line: number;
}

interface LogSummary {
  filename: string;
  totalLines: number;
  filteredLines?: number;
  levels: Record<string, number>;
  entries: LogEntry[];
  summary: string;
}

// Parsea una línea de log
function parseLogLine(line: string, lineNumber: number): LogEntry {
  const entry: LogEntry = {
    message: line,
    line: lineNumber,
  };
  
  // Detecta timestamp común
  const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/);
  if (timestampMatch) {
    entry.timestamp = timestampMatch[1];
  }
  
  // Detecta nivel de log
  const levelMatch = line.match(/\b(DEBUG|INFO|WARN(?:ING)?|ERROR|FATAL|TRACE)\b/i);
  if (levelMatch) {
    entry.level = levelMatch[1].toUpperCase();
    if (entry.level === 'WARNING') entry.level = 'WARN';
  }
  
  return entry;
}

// Cuenta niveles de log
function countLevels(entries: LogEntry[]): Record<string, number> {
  const levels: Record<string, number> = {};
  for (const entry of entries) {
    const level = entry.level || 'UNKNOWN';
    levels[level] = (levels[level] || 0) + 1;
  }
  return levels;
}

// Genera un resumen textual
function generateSummary(filename: string, summary: LogSummary): string {
  let text = `📊 Resumen de Log: ${filename}\n`;
  text += `══════════════════════════════════════\n\n`;
  text += `Total de líneas: ${summary.totalLines}\n`;
  
  if (summary.filteredLines !== undefined) {
    text += `Líneas filtradas: ${summary.filteredLines}\n`;
  }
  
  text += `\n📈 Distribución por nivel:\n`;
  for (const [level, count] of Object.entries(summary.levels)) {
    const pct = ((count / summary.totalLines) * 100).toFixed(1);
    text += `  ${level}: ${count} (${pct}%)\n`;
  }
  
  if (summary.entries.length > 0) {
    text += `\n🔍 Primeras entradas relevantes:\n`;
    const relevantEntries = summary.entries.slice(0, 5);
    for (const entry of relevantEntries) {
      const level = entry.level || 'INFO';
      text += `  [${level}] Línea ${entry.line}: ${entry.message.substring(0, 80)}...\n`;
    }
  }
  
  return text;
}

// Parsea los argumentos
const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    output: {
      type: 'string',
      short: 'o',
      default: '',
    },
    format: {
      type: 'string',
      short: 'f',
      default: 'json',
    },
    filter: {
      type: 'string',
      short: 'F',
      default: '',
    },
    help: {
      type: 'boolean',
      short: 'h',
      default: false,
    },
  },
  allowPositionals: true,
});

if (values.help || positionals.length === 0) {
  console.log(`
Summarize Log - Resumen de Logs

Uso: bun run summarize-log.ts <archivo.log> [opciones]

Argumentos:
  archivo.log              Archivo de log a procesar

Opciones:
  -o, --output <ruta>     Archivo de salida JSON (opcional, stdout si no se especifica)
  -f, --format <formato>  Formato: json, summary (default: json)
  -F, --filter <nivel>    Filtra por nivel: debug, info, warn, error
  -h, --help              Muestra esta ayuda

Ejemplos:
  bun run summarize-log.ts logs/app.log
  bun run summarize-log.ts logs/app.log -o logs/summary.json
  bun run summarize-log.ts logs/app.log -F error
  bun run summarize-log.ts logs/app.log -f summary
`);
  process.exit(0);
}

const filename = positionals[0];
const format = values.format as 'json' | 'summary';
const filterLevel = values.filter as string;
const outputFile = values.output as string;

// Valida el formato
if (!['json', 'summary'].includes(format)) {
  console.error('Error: Formato inválido. Use: json, summary');
  process.exit(1);
}

// Valida el archivo de entrada
if (!existsSync(filename)) {
  console.error(`Error: El archivo '${filename}' no existe.`);
  process.exit(1);
}

// Lee el archivo (sin mutar)
const content = readFileSync(filename, 'utf-8');
const lines = content.split('\n').filter(line => line.trim().length > 0);

// Parsea las entradas
let entries: LogEntry[] = lines.map((line, index) => 
  parseLogLine(line, index + 1)
);

// Aplica filtro si se especifica
if (filterLevel) {
  const filterUpper = filterLevel.toUpperCase();
  entries = entries.filter(entry => 
    entry.level === filterUpper || 
    (entry.level === undefined && filterUpper === 'INFO')
  );
}

// Genera el resumen
const summary: LogSummary = {
  filename,
  totalLines: lines.length,
  filteredLines: filterLevel ? entries.length : undefined,
  levels: countLevels(entries),
  entries,
  summary: '',
};

summary.summary = generateSummary(filename, summary);

// Salida
if (format === 'summary') {
  console.log(summary.summary);
} else {
  const output = JSON.stringify(summary, null, 2);
  if (outputFile) {
    writeFileSync(outputFile, output, 'utf-8');
    console.log(`✅ Resumen guardado en: ${outputFile}`);
  } else {
    console.log(output);
  }
}
