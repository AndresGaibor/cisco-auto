import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, stat, writeFile, open } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const OMNI_SCRIPT_TTL_MS = 2 * 60 * 60 * 1000;
export const OMNI_RESULT_TTL_MS = 2 * 60 * 60 * 1000;

const TEXT_DECODER = new TextDecoder();
const TEXT_ENCODER = new TextEncoder();

export interface OmniScriptChunkMeta {
  seq: number;
  bytes: number;
  sha256: string;
}

export interface OmniScriptMeta {
  scriptId: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  bytes: number;
  nextSeq: number;
  sha256: string;
  chunks: OmniScriptChunkMeta[];
  status: "open" | "closed";
}

export interface OmniResultMeta {
  resultId: string;
  scriptId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  stdoutBytes: number;
  stderrBytes: number;
  jsonParsed: boolean;
  preview?: string;
  status: "ready" | "expired";
  stdoutPath: string;
  stderrPath: string;
  jsonPath?: string;
  stdoutSha256: string;
  stderrSha256: string;
}

export type OmniClearTarget = "script" | "result" | "all" | "expired";
export type OmniReadMode = "bytes" | "lines";
export type OmniReadStream = "stdout" | "stderr" | "json";

export interface OmniClearSummary {
  scripts: number;
  results: number;
  bytesFreed: number;
}

export interface OmniScriptStatusResult {
  ok: true;
  scriptId: string;
  scriptPath: string;
  metaPath: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  bytes: number;
  nextSeq: number;
  sha256: string;
  status: "open" | "closed";
  chunks: OmniScriptChunkMeta[];
}

export interface OmniResultStatusResult {
  ok: true;
  resultId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  streams: {
    stdout: { bytes: number; available: boolean };
    stderr: { bytes: number; available: boolean };
    json: { bytes: number; available: boolean; reason?: string };
  };
  preview: string;
  next: {
    op: "read_result";
    resultId: string;
    stream: "stdout";
    mode: "bytes";
    offset: number;
    limit: number;
  };
}

export interface OmniReadResult {
  ok: true;
  resultId: string;
  stream: OmniReadStream;
  mode: OmniReadMode;
  offset?: number;
  limit?: number;
  lineOffset?: number;
  lineLimit?: number;
  bytesTotal: number;
  bytesReturned: number;
  nextOffset: number;
  eof: boolean;
  text: string;
  next?: {
    op: "read_result";
    resultId: string;
    stream: OmniReadStream;
    mode: OmniReadMode;
    offset?: number;
    limit?: number;
    lineOffset?: number;
    lineLimit?: number;
  };
}

export interface OmniAppendResult {
  ok: true;
  scriptId: string;
  seq: number;
  receivedBytes: number;
  totalBytes: number;
  nextSeq: number;
  scriptSha256: string;
  duplicate?: boolean;
  chunkSha256: string;
}

export interface OmniBeginResult {
  ok: true;
  scriptId: string;
  status: "open";
  nextSeq: number;
  bytes: number;
  scriptSha256: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface OmniErrorResult {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface OmniAppendInput {
  scriptId: string;
  seq: number;
  chunk: string;
  chunkSha256?: string;
}

export interface OmniBeginInput {
  scriptId: string;
  description?: string;
}

export interface OmniExecuteScriptInput {
  scriptId: string;
  parseJson?: boolean;
  timeoutMs?: number;
}

export interface OmniExecuteCodeInput {
  code: string;
  parseJson?: boolean;
  timeoutMs?: number;
}

export interface OmniReadInput {
  resultId: string;
  stream: OmniReadStream;
  mode?: OmniReadMode;
  offset?: number;
  limit?: number;
  lineOffset?: number;
  lineLimit?: number;
}

export interface OmniResultRecordInput {
  resultId: string;
  scriptId: string;
  stdoutPath?: string;
  stderrPath?: string;
  jsonPath?: string;
  stdout: string;
  stderr: string;
  json: unknown;
  jsonParsed: boolean;
  previewBytes?: number;
}

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function hashFile(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  return createHash("sha256").update(data).digest("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeScriptId(scriptId: string): string {
  if (!/^[a-zA-Z0-9_.-]{1,80}$/.test(scriptId)) {
    throw new Error("SCRIPT_ID_INVALID");
  }

  return scriptId;
}

export function getOmniDevDir(): string {
  const fromEnv = process.env.PT_DEV_DIR?.trim();
  if (fromEnv) return resolve(fromEnv);
  return join(homedir(), "pt-dev");
}

export function getOmniCacheDir(): string {
  return join(getOmniDevDir(), "mcp-cache", "omni");
}

export function getOmniScriptsDir(): string {
  return join(getOmniCacheDir(), "scripts");
}

export function getOmniResultsDir(): string {
  return join(getOmniCacheDir(), "results");
}

export function getOmniScriptPaths(scriptId: string): { scriptPath: string; metaPath: string } {
  const id = normalizeScriptId(scriptId);
  return {
    scriptPath: join(getOmniScriptsDir(), `${id}.js`),
    metaPath: join(getOmniScriptsDir(), `${id}.meta.json`),
  };
}

export function getOmniResultPaths(resultId: string): { resultDir: string; metaPath: string; stdoutPath: string; stderrPath: string; jsonPath: string } {
  const safeId = resultId.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const resultDir = join(getOmniResultsDir(), safeId);
  return {
    resultDir,
    metaPath: join(resultDir, "meta.json"),
    stdoutPath: join(resultDir, "stdout.txt"),
    stderrPath: join(resultDir, "stderr.txt"),
    jsonPath: join(resultDir, "json.txt"),
  };
}

async function ensureOmniDirs(): Promise<void> {
  await mkdir(getOmniScriptsDir(), { recursive: true });
  await mkdir(getOmniResultsDir(), { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const text = await readFile(filePath, "utf8");
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readFilePreview(filePath: string, maxBytes: number): Promise<string | undefined> {
  if (maxBytes <= 0 || !existsSync(filePath)) return undefined;

  const file = await open(filePath, "r");
  try {
    const stats = await file.stat();
    const buffer = Buffer.alloc(Math.min(maxBytes, stats.size));
    const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
    return TEXT_DECODER.decode(buffer.subarray(0, bytesRead));
  } finally {
    await file.close();
  }
}

async function removePathWithSize(filePath: string): Promise<number> {
  if (!existsSync(filePath)) return 0;

  const stats = await stat(filePath);
  const bytes = stats.isDirectory() ? await getDirectorySize(filePath) : stats.size;
  await rm(filePath, { recursive: true, force: true });
  return bytes;
}

async function getDirectorySize(dirPath: string): Promise<number> {
  if (!existsSync(dirPath)) return 0;

  const entries = await readdir(dirPath, { withFileTypes: true });
  let total = 0;

  for (const entry of entries) {
    const childPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      total += await getDirectorySize(childPath);
    } else {
      total += (await stat(childPath)).size;
    }
  }

  return total;
}

function scriptMetaFromDisk(scriptId: string, meta: OmniScriptMeta | null): OmniScriptMeta | null {
  if (!meta) return null;
  if (meta.scriptId !== scriptId) return null;
  return meta;
}

function makeScriptMeta(scriptId: string, description?: string): OmniScriptMeta {
  const createdAt = nowIso();
  return {
    scriptId,
    description,
    createdAt,
    updatedAt: createdAt,
    expiresAt: new Date(Date.now() + OMNI_SCRIPT_TTL_MS).toISOString(),
    bytes: 0,
    nextSeq: 0,
    sha256: hashText(""),
    chunks: [],
    status: "open",
  };
}

async function loadScriptMeta(scriptId: string): Promise<OmniScriptMeta | null> {
  const { metaPath } = getOmniScriptPaths(scriptId);
  return scriptMetaFromDisk(scriptId, await readJsonFile<OmniScriptMeta>(metaPath));
}

async function saveScriptMeta(meta: OmniScriptMeta): Promise<void> {
  const { metaPath } = getOmniScriptPaths(meta.scriptId);
  await writeJsonFile(metaPath, meta);
}

async function ensureScriptShell(scriptId: string, description?: string): Promise<OmniScriptMeta> {
  await ensureOmniDirs();
  const { scriptPath } = getOmniScriptPaths(scriptId);
  let meta = await loadScriptMeta(scriptId);

  if (!meta) {
    meta = makeScriptMeta(scriptId, description);
    await writeFile(scriptPath, "", "utf8");
    await saveScriptMeta(meta);
    return meta;
  }

  if (!existsSync(scriptPath)) {
    await writeFile(scriptPath, "", "utf8");
  }

  return meta;
}

function buildScriptStatus(meta: OmniScriptMeta): OmniScriptStatusResult {
  const { scriptPath, metaPath } = getOmniScriptPaths(meta.scriptId);
  return {
    ok: true,
    scriptId: meta.scriptId,
    scriptPath,
    metaPath,
    description: meta.description,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    expiresAt: meta.expiresAt,
    bytes: meta.bytes,
    nextSeq: meta.nextSeq,
    sha256: meta.sha256,
    status: meta.status,
    chunks: meta.chunks,
  };
}

function isExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now();
}

async function cleanupExpiredScripts(): Promise<number> {
  if (!existsSync(getOmniScriptsDir())) return 0;

  const entries = await readdir(getOmniScriptsDir());
  let removed = 0;

  for (const entry of entries) {
    if (!entry.endsWith(".meta.json")) continue;
    const metaPath = join(getOmniScriptsDir(), entry);
    const meta = await readJsonFile<OmniScriptMeta>(metaPath);
    if (!meta || !isExpired(meta.expiresAt)) continue;
    const { scriptPath } = getOmniScriptPaths(meta.scriptId);
    await removePathWithSize(scriptPath);
    await removePathWithSize(metaPath);
    removed += 1;
  }

  return removed;
}

async function cleanupExpiredResults(): Promise<number> {
  if (!existsSync(getOmniResultsDir())) return 0;

  const entries = await readdir(getOmniResultsDir(), { withFileTypes: true });
  let removed = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const resultDir = join(getOmniResultsDir(), entry.name);
    const metaPath = join(resultDir, "meta.json");
    const meta = await readJsonFile<OmniResultMeta>(metaPath);
    if (!meta || !isExpired(meta.expiresAt)) continue;
    await removePathWithSize(resultDir);
    removed += 1;
  }

  return removed;
}

export async function cleanupExpiredOmniCache(): Promise<OmniClearSummary> {
  const scriptsRemoved = await cleanupExpiredScripts();
  const resultsRemoved = await cleanupExpiredResults();
  return {
    scripts: scriptsRemoved,
    results: resultsRemoved,
    bytesFreed: 0,
  };
}

export async function beginOmniScript(input: OmniBeginInput): Promise<OmniBeginResult | OmniErrorResult> {
  try {
    const scriptId = normalizeScriptId(input.scriptId);
    const meta = await ensureScriptShell(scriptId, input.description);
    meta.description = input.description ?? meta.description;
    meta.updatedAt = nowIso();
    meta.expiresAt = new Date(Date.now() + OMNI_SCRIPT_TTL_MS).toISOString();
    await saveScriptMeta(meta);

    return {
      ok: true,
      scriptId,
      status: "open",
      nextSeq: meta.nextSeq,
      bytes: meta.bytes,
      scriptSha256: meta.sha256,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
      expiresAt: meta.expiresAt,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: error instanceof Error && error.message === "SCRIPT_ID_INVALID" ? "SCRIPT_ID_INVALID" : "OMNI_CACHE_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function appendOmniScriptChunk(input: OmniAppendInput): Promise<OmniAppendResult | OmniErrorResult> {
  try {
    const scriptId = normalizeScriptId(input.scriptId);
    if (!Number.isInteger(input.seq) || input.seq < 0) {
      return { ok: false, error: { code: "INVALID_SEQUENCE", message: "seq debe ser un entero >= 0." } };
    }

    const meta = await loadScriptMeta(scriptId);
    if (!meta) {
      return { ok: false, error: { code: "SCRIPT_NOT_FOUND", message: `No existe el script '${scriptId}'. Usa begin_script primero.` } };
    }

    const chunkSha256 = input.chunkSha256 ?? hashText(input.chunk);
    const chunkBytes = TEXT_ENCODER.encode(input.chunk).length;

    if (input.seq > meta.nextSeq) {
      return { ok: false, error: { code: "MISSING_PREVIOUS_CHUNK", message: "Falta un chunk previo." } };
    }

    const existing = meta.chunks.find((chunk) => chunk.seq === input.seq);
    if (existing) {
      if (existing.sha256 !== chunkSha256) {
        return { ok: false, error: { code: "CHUNK_CONFLICT", message: "El chunk ya existe con contenido diferente." } };
      }

      return {
        ok: true,
        scriptId,
        seq: input.seq,
        receivedBytes: existing.bytes,
        totalBytes: meta.bytes,
        nextSeq: meta.nextSeq,
        scriptSha256: meta.sha256,
        duplicate: true,
        chunkSha256,
      };
    }

    if (input.seq < meta.nextSeq) {
      return { ok: false, error: { code: "CHUNK_CONFLICT", message: "El chunk llegó fuera de orden y no coincide con el estado actual." } };
    }

    const { scriptPath } = getOmniScriptPaths(scriptId);
    await writeFile(scriptPath, input.chunk, { flag: "a" });

    meta.chunks.push({ seq: input.seq, bytes: chunkBytes, sha256: chunkSha256 });
    meta.chunks.sort((a, b) => a.seq - b.seq);
    meta.nextSeq = input.seq + 1;
    meta.bytes += chunkBytes;
    meta.sha256 = hashText(meta.chunks.map((chunk) => `${chunk.seq}:${chunk.sha256}:${chunk.bytes}`).join("|"));
    meta.updatedAt = nowIso();
    meta.expiresAt = new Date(Date.now() + OMNI_SCRIPT_TTL_MS).toISOString();
    await saveScriptMeta(meta);

    return {
      ok: true,
      scriptId,
      seq: input.seq,
      receivedBytes: chunkBytes,
      totalBytes: meta.bytes,
      nextSeq: meta.nextSeq,
      scriptSha256: meta.sha256,
      chunkSha256,
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: error instanceof Error && error.message === "SCRIPT_ID_INVALID" ? "SCRIPT_ID_INVALID" : "OMNI_CACHE_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

export async function getOmniScriptStatus(scriptId: string): Promise<OmniScriptStatusResult | OmniErrorResult> {
  try {
    const normalized = normalizeScriptId(scriptId);
    const meta = await loadScriptMeta(normalized);
    if (!meta) {
      return { ok: false, error: { code: "SCRIPT_NOT_FOUND", message: `No existe el script '${scriptId}'.` } };
    }

    return buildScriptStatus(meta);
  } catch (error) {
    return {
      ok: false,
      error: {
        code: error instanceof Error && error.message === "SCRIPT_ID_INVALID" ? "SCRIPT_ID_INVALID" : "OMNI_CACHE_ERROR",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function writeResultMeta(meta: OmniResultMeta): Promise<void> {
  const paths = getOmniResultPaths(meta.resultId);
  await writeJsonFile(paths.metaPath, meta);
}

export async function recordOmniResult(input: OmniResultRecordInput): Promise<OmniResultMeta> {
  await ensureOmniDirs();
  const paths = getOmniResultPaths(input.resultId);
  await mkdir(paths.resultDir, { recursive: true });

  const stdoutBytes = input.stdoutPath && existsSync(input.stdoutPath) ? (await stat(input.stdoutPath)).size : TEXT_ENCODER.encode(input.stdout).length;
  const stderrBytes = input.stderrPath && existsSync(input.stderrPath) ? (await stat(input.stderrPath)).size : TEXT_ENCODER.encode(input.stderr).length;

  if (input.stdoutPath && existsSync(input.stdoutPath)) {
    if (input.stdoutPath !== paths.stdoutPath) {
      await writeFile(paths.stdoutPath, await readFile(input.stdoutPath));
    }
  } else {
    await writeFile(paths.stdoutPath, input.stdout, "utf8");
  }

  if (input.stderrPath && existsSync(input.stderrPath)) {
    if (input.stderrPath !== paths.stderrPath) {
      await writeFile(paths.stderrPath, await readFile(input.stderrPath));
    }
  } else {
    await writeFile(paths.stderrPath, input.stderr, "utf8");
  }

  const meta: OmniResultMeta = {
    resultId: input.resultId,
    scriptId: input.scriptId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    expiresAt: new Date(Date.now() + OMNI_RESULT_TTL_MS).toISOString(),
    stdoutBytes,
    stderrBytes,
    jsonParsed: input.jsonParsed,
    preview: input.previewBytes ? await readFilePreview(paths.stdoutPath, input.previewBytes) : undefined,
    status: "ready",
    stdoutPath: paths.stdoutPath,
    stderrPath: paths.stderrPath,
    jsonPath: input.jsonParsed ? paths.jsonPath : undefined,
    stdoutSha256: input.stdoutPath && existsSync(input.stdoutPath) ? await hashFile(paths.stdoutPath) : hashText(input.stdout),
    stderrSha256: input.stderrPath && existsSync(input.stderrPath) ? await hashFile(paths.stderrPath) : hashText(input.stderr),
  };

  await writeResultMeta(meta);

  if (input.jsonParsed && input.json != null) {
    await writeFile(paths.jsonPath, `${JSON.stringify(input.json, null, 2)}\n`, "utf8");
  }

  return meta;
}

export async function getOmniResultStatus(resultId: string): Promise<OmniResultStatusResult | OmniErrorResult> {
  const paths = getOmniResultPaths(resultId);
  const meta = await readJsonFile<OmniResultMeta>(paths.metaPath);

  if (!meta) {
    return { ok: false, error: { code: "RESULT_NOT_FOUND", message: `No existe el resultado '${resultId}'.` } };
  }

  return {
    ok: true,
    resultId: meta.resultId,
    createdAt: meta.createdAt,
    updatedAt: meta.updatedAt,
    expiresAt: meta.expiresAt,
    preview: meta.preview ?? "",
    next: {
      op: "read_result",
      resultId: meta.resultId,
      stream: "stdout",
      mode: "bytes",
      offset: 0,
      limit: 6_000,
    },
    streams: {
      stdout: { bytes: meta.stdoutBytes, available: existsSync(meta.stdoutPath) },
      stderr: { bytes: meta.stderrBytes, available: existsSync(meta.stderrPath) },
      json: meta.jsonParsed && meta.jsonPath ? { bytes: existsSync(meta.jsonPath) ? (await stat(meta.jsonPath)).size : 0, available: existsSync(meta.jsonPath) } : { bytes: 0, available: false, reason: meta.jsonParsed ? "missing_json_file" : "too_large_to_parse" },
    },
  };
}

async function readBytesWindow(filePath: string, offset: number, limit: number): Promise<{ text: string; bytesTotal: number; bytesReturned: number; nextOffset: number; eof: boolean }> {
  const file = await open(filePath, "r");
  try {
    const stats = await file.stat();
    const bytesTotal = stats.size;
    if (offset >= bytesTotal) {
      return { text: "", bytesTotal, bytesReturned: 0, nextOffset: offset, eof: true };
    }

    const buffer = Buffer.alloc(Math.min(limit, bytesTotal - offset));
    const { bytesRead } = await file.read(buffer, 0, buffer.length, offset);
    const slice = buffer.subarray(0, bytesRead);
    const text = TEXT_DECODER.decode(slice);
    return {
      text,
      bytesTotal,
      bytesReturned: bytesRead,
      nextOffset: offset + bytesRead,
      eof: offset + bytesRead >= bytesTotal,
    };
  } finally {
    await file.close();
  }
}

async function readLinesWindow(filePath: string, lineOffset: number, lineLimit: number): Promise<{ text: string; bytesTotal: number; bytesReturned: number; nextOffset: number; eof: boolean }> {
  const file = await open(filePath, "r");
  try {
    const stats = await file.stat();
    const bytesTotal = stats.size;
    const buffer = Buffer.alloc(64 * 1024);
    let remainder = "";
    let skipped = 0;
    const lines: string[] = [];
    let reachedEof = false;
    let position = 0;

    while (lines.length < lineLimit) {
      const { bytesRead } = await file.read(buffer, 0, buffer.length, position);
      if (bytesRead === 0) {
        reachedEof = true;
        break;
      }

      position += bytesRead;
      const chunk = remainder + TEXT_DECODER.decode(buffer.subarray(0, bytesRead), { stream: true });
      const parts = chunk.split(/\r?\n/);
      remainder = parts.pop() ?? "";

      for (const line of parts) {
        if (skipped < lineOffset) {
          skipped += 1;
          continue;
        }

        if (lines.length < lineLimit) {
          lines.push(line);
        }

        if (lines.length >= lineLimit) {
          break;
        }
      }
    }

    if (lines.length < lineLimit && remainder) {
      if (skipped >= lineOffset) {
        lines.push(remainder);
      } else {
        skipped += 1;
      }
      remainder = "";
    }

    const text = lines.join("\n");
    return {
      text,
      bytesTotal,
      bytesReturned: TEXT_ENCODER.encode(text).length,
      nextOffset: lineOffset + lines.length,
      eof: reachedEof && lines.length < lineLimit,
    };
  } finally {
    await file.close();
  }
}

export async function readOmniResult(input: OmniReadInput): Promise<OmniReadResult | OmniErrorResult> {
  const result = await getOmniResultStatus(input.resultId);
  if (!result.ok) return result;

  const mode = input.mode ?? "bytes";
  const streamPath = input.stream === "stdout" ? getOmniResultPaths(input.resultId).stdoutPath : input.stream === "stderr" ? getOmniResultPaths(input.resultId).stderrPath : getOmniResultPaths(input.resultId).jsonPath;
  if (!existsSync(streamPath)) {
    return { ok: false, error: { code: "RESULT_STREAM_NOT_AVAILABLE", message: `No existe el stream '${input.stream}'.` } };
  }

  if (mode === "lines") {
    const lineOffset = input.lineOffset ?? 0;
    const lineLimit = input.lineLimit ?? 100;
    const window = await readLinesWindow(streamPath, lineOffset, lineLimit);
    return {
      ok: true,
      resultId: input.resultId,
      stream: input.stream,
      mode,
      lineOffset,
      lineLimit,
      bytesTotal: window.bytesTotal,
      bytesReturned: window.bytesReturned,
      nextOffset: window.nextOffset,
      eof: window.eof,
      text: window.text,
      next: window.eof
        ? undefined
        : {
            op: "read_result",
            resultId: input.resultId,
            stream: input.stream,
            mode: "lines",
            lineOffset: window.nextOffset,
            lineLimit,
          },
    };
  }

  const offset = input.offset ?? 0;
  const limit = input.limit ?? 6_000;
  const window = await readBytesWindow(streamPath, offset, limit);
  return {
    ok: true,
    resultId: input.resultId,
    stream: input.stream,
    mode,
    offset,
    limit,
    bytesTotal: window.bytesTotal,
    bytesReturned: window.bytesReturned,
    nextOffset: window.nextOffset,
    eof: window.eof,
    text: window.text,
    next: window.eof
      ? undefined
      : {
          op: "read_result",
          resultId: input.resultId,
          stream: input.stream,
          mode: "bytes",
          offset: window.nextOffset,
          limit,
        },
  };
}

async function removeResultDir(resultId: string): Promise<number> {
  const paths = getOmniResultPaths(resultId);
  return removePathWithSize(paths.resultDir);
}

async function removeScript(scriptId: string): Promise<number> {
  const { scriptPath, metaPath } = getOmniScriptPaths(scriptId);
  const scriptBytes = await removePathWithSize(scriptPath);
  const metaBytes = await removePathWithSize(metaPath);
  return scriptBytes + metaBytes;
}

export async function clearOmniCache(target: OmniClearTarget, refId?: string): Promise<OmniClearSummary> {
  await ensureOmniDirs();

  if (target === "script" && refId) {
    return { scripts: 1, results: 0, bytesFreed: await removeScript(refId) };
  }

  if (target === "result" && refId) {
    return { scripts: 0, results: 1, bytesFreed: await removeResultDir(refId) };
  }

  if (target === "all") {
    const scriptFiles = existsSync(getOmniScriptsDir()) ? await readdir(getOmniScriptsDir()) : [];
    const resultDirs = existsSync(getOmniResultsDir()) ? await readdir(getOmniResultsDir(), { withFileTypes: true }) : [];
    let bytesFreed = 0;
    let scripts = 0;
    let results = 0;

    for (const entry of scriptFiles) {
      if (!entry.endsWith(".meta.json")) continue;
      const scriptId = entry.replace(/\.meta\.json$/, "");
      bytesFreed += await removeScript(scriptId);
      scripts += 1;
    }

    for (const entry of resultDirs) {
      if (!entry.isDirectory()) continue;
      bytesFreed += await removeResultDir(entry.name);
      results += 1;
    }

    return { scripts, results, bytesFreed };
  }

  if (target === "expired") {
    let bytesFreed = 0;
    let scripts = 0;
    let results = 0;

    if (existsSync(getOmniScriptsDir())) {
      for (const entry of await readdir(getOmniScriptsDir())) {
        if (!entry.endsWith(".meta.json")) continue;
        const metaPath = join(getOmniScriptsDir(), entry);
        const meta = await readJsonFile<OmniScriptMeta>(metaPath);
        if (!meta || !isExpired(meta.expiresAt)) continue;
        bytesFreed += await removeScript(meta.scriptId);
        scripts += 1;
      }
    }

    if (existsSync(getOmniResultsDir())) {
      for (const entry of await readdir(getOmniResultsDir(), { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const metaPath = join(getOmniResultsDir(), entry.name, "meta.json");
        const meta = await readJsonFile<OmniResultMeta>(metaPath);
        if (!meta || !isExpired(meta.expiresAt)) continue;
        bytesFreed += await removeResultDir(meta.resultId);
        results += 1;
      }
    }

    return { scripts, results, bytesFreed };
  }

  return { scripts: 0, results: 0, bytesFreed: 0 };
}
