/**
 * Versiones async (non-blocking) de las utilidades de fs-atomic.ts.
 *
 * REGLA: estas funciones NO reemplazan las versiones sync. Las garantías
 * atómicas (atomicWriteFile, safeRename, claimCommandFile) permanecen sync
 * porque el overhead de async no aporta beneficio y el bucle de retry de
 * rename depende de la inmediatez del sync.
 *
 * Aquí solo viven las operaciones que se benefician de async:
 *   - Lectura de JSON y texto (readJsonFile, readTextFile)
 *   - Listado de directorios (listJsonFiles)
 *   - Verificación de existencia (pathExists)
 *   - Estadísticas de tamaño (fileSize)
 *   - Append de líneas (appendLine) — para event-log-writer
 *   - Escritura best-effort sin fsync (writeTextFile)
 *
 * La API pública mantiene backward compatibility 100% — las funciones
 * sync originales en fs-atomic.ts siguen exportadas y operativas.
 */
import {
  readFile,
  readdir,
  access,
  stat,
  appendFile,
  writeFile,
  mkdir,
} from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Lee un archivo de texto. Retorna null si el archivo no existe.
 * Lanza el error para otros códigos (EACCES, EISDIR, etc.).
 */
export async function readTextFile(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Lee y parsea un archivo JSON. Retorna null si no existe o está vacío.
 * Lanza SyntaxError si el contenido no es JSON válido.
 */
export async function readJsonFileAsync<T = unknown>(path: string): Promise<T | null> {
  const content = await readTextFile(path);
  if (content === null) return null;
  if (!content.trim()) return null;
  return JSON.parse(content) as T;
}

/**
 * Variante estricta: lanza si el archivo falta o es JSON inválido.
 */
export async function readJsonFileOrThrowAsync<T = unknown>(path: string): Promise<T> {
  const value = await readJsonFileAsync<T>(path);
  if (value === null) {
    throw new Error(`Invalid or missing JSON file: ${path}`);
  }
  return value;
}

/**
 * Lista todos los archivos .json de un directorio, ordenados alfabéticamente.
 * Retorna array vacío si el directorio no existe o no se puede leer.
 */
export async function listJsonFilesAsync(dir: string): Promise<string[]> {
  try {
    const files = await readdir(dir);
    return files.filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
}

/**
 * Verifica si una ruta existe (archivo o directorio).
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Tamaño en bytes del archivo. Retorna 0 si no existe.
 */
export async function fileSize(path: string): Promise<number> {
  try {
    const stats = await stat(path);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Crea un directorio recursivamente. Idempotente.
 */
export async function ensureDirAsync(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

/**
 * Append de una línea a un archivo (sin newline final agregado por el caller).
 * El newline se agrega aquí si la línea no lo trae.
 * Reintenta en ENOENT para tolerar la ventana de rotación.
 * NO usa atomicWriteFile — append es inherentemente más seguro que overwrite.
 */
export async function appendLineAsync(path: string, line: string): Promise<void> {
  await ensureDirAsync(dirname(path));
  const content = line.endsWith("\n") ? line : `${line}\n`;

  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await appendFile(path, content, "utf8");
      return;
    } catch (err) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === "ENOENT" && attempt < maxRetries - 1) {
        continue;
      }
      throw err;
    }
  }
}

/**
 * Escritura best-effort (sin fsync). Útil para índices auxiliares y
 * manifests donde la atomicidad estricta no es crítica.
 * NO usar como reemplazo de atomicWriteFile — usar solo para datos
 * no críticos o que se reconstruyen desde la fuente de verdad.
 */
export async function writeTextFile(path: string, content: string): Promise<void> {
  await ensureDirAsync(dirname(path));
  await writeFile(path, content, "utf8");
}
