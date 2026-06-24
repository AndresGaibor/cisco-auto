// ============================================================================
// Canvas Note Watcher
// Monitorea notas del canvas en busca del prefijo @agent
// y puentea consultas/respuestas vía filesystem
// ============================================================================

import type { PtDeps } from "../../pt-api/pt-deps.js";

interface NoteState {
  lastText: string;
  queryFileWritten: boolean;
  responseReceived: boolean;
}

let watcherTimerId: ReturnType<typeof setInterval> | null = null;
let watcherActive = false;
const noteStates: Record<string, NoteState> = {};
const POLL_INTERVAL_MS = 3000;

function getInboxDir(devDir: string): string {
  return devDir + "/agent/inbox";
}

function getOutboxDir(devDir: string): string {
  return devDir + "/commands";
}

function ensureAgentDirs(fm: any, devDir: string): void {
  if (typeof fm.makeDirectory === "function") {
    fm.makeDirectory(devDir + "/agent");
    fm.makeDirectory(getInboxDir(devDir));
    fm.makeDirectory(getOutboxDir(devDir));
  }
}

var pendingTcpRequests: Record<string, string> = {};
var tcpResponseCache: Record<string, string> = {};

function makeTcpRequest(noteId: string): void {
  if (pendingTcpRequests[noteId] !== undefined) return;
  if (tcpResponseCache[noteId] !== undefined) return;

  var hasTcp = typeof $createTcpSocket === "function";
  dprint("[canvas-watcher] makeTcpRequest " + noteId + " hasTcp=" + hasTcp);
  var socket: any = hasTcp ? $createTcpSocket() : null;
  if (!socket) return;

  pendingTcpRequests[noteId] = "";
  var timedOut = false;
  var timeoutId = setTimeout(function() {
    timedOut = true;
    delete pendingTcpRequests[noteId];
    try { socket.disconnect(); } catch {}
    try { socket.cleanUp(); } catch {}
  }, 8000);

  try {
    socket.dataReceived = function(data: string) {
      dprint("[canvas-watcher] TCP data: " + data.length + " bytes");
      pendingTcpRequests[noteId] = (pendingTcpRequests[noteId] || "") + data;
    };

    socket.stateChanged = function(state: number) {
      dprint("[canvas-watcher] TCP state: " + state);
      if (state === 3) {
        setTimeout(function() {
          if (timedOut) return;
          clearTimeout(timeoutId);
          var responseData = pendingTcpRequests[noteId] || "";
          delete pendingTcpRequests[noteId];

          try {
            var jsonStart = responseData.indexOf("{");
            if (jsonStart >= 0) {
              var jsonStr = responseData.substring(jsonStart);
              var parsed = JSON.parse(jsonStr);
              if (parsed && parsed.response) {
                tcpResponseCache[noteId] = parsed.response;
                dprint("[canvas-watcher] TCP response cached for " + noteId);
              }
            }
          } catch {}
          try { socket.disconnect(); } catch {}
          try { socket.cleanUp(); } catch {}
        }, 500);
      }
    };

    dprint("[canvas-watcher] TCP connecting to 127.0.0.1:4100");
    socket.connect("127.0.0.1", 4100);
    dprint("[canvas-watcher] TCP connected, sending request");

    var request = "GET /response/" + noteId + " HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n";
    socket.sendData(request);
    dprint("[canvas-watcher] TCP request sent");
  } catch (e) {
    dprint("[canvas-watcher] TCP catch error: " + String(e));
    clearTimeout(timeoutId);
    delete pendingTcpRequests[noteId];
    try { socket.disconnect(); } catch {}
    try { socket.cleanUp(); } catch {}
  }
}

function getCachedTcpResponse(noteId: string): { response: string } | null {
  var r = tcpResponseCache[noteId];
  if (r !== undefined) {
    delete tcpResponseCache[noteId];
    return { response: r };
  }
  return null;
}

function cleanupResponseFile(fm: any, outboxDir: string, inboxDir: string, noteId: string): void {
  try {
    if (typeof fm.removeFile === "function") {
      fm.removeFile(outboxDir + "/agent-response-" + noteId + ".json");
      fm.removeFile(inboxDir + "/" + noteId + ".json");
    }
  } catch {}
}

function writeQueryFile(fm: any, inboxDir: string, noteId: string, query: string): boolean {
  try {
    const queryData = JSON.stringify({
      id: noteId,
      noteId: noteId,
      query: query,
      createdAt: Date.now(),
    });
    fm.writePlainTextToFile(inboxDir + "/" + noteId + ".json", queryData);
    return true;
  } catch {
    return false;
  }
}

function tick(deps: PtDeps): void {
  try {
    const lw = deps.getLW();
    const fm = deps.getFM() as any;
    const devDir = deps.DEV_DIR;

    if (!lw || !fm) return;

    const inboxDir = getInboxDir(devDir);
    const outboxDir = getOutboxDir(devDir);

    ensureAgentDirs(fm, devDir);

    // Fase 1: detectar nuevas consultas @agent en notas del canvas
    if (typeof lw.getCanvasNoteIds === "function") {
      const noteIds = lw.getCanvasNoteIds();
      if (noteIds && noteIds.length > 0) {
        for (let i = 0; i < noteIds.length; i++) {
          const noteId = noteIds[i];
          const rawText = typeof lw.getCanvasNoteText === "function"
            ? lw.getCanvasNoteText(noteId)
            : "";
          const text = rawText || "";

          const state = noteStates[noteId] || {
            lastText: "",
            queryFileWritten: false,
            responseReceived: false,
          };

          // Resetear si el texto cambió
          if (text !== state.lastText) {
            state.lastText = text;
            state.queryFileWritten = false;
            state.responseReceived = false;
          }

          // Si empieza con @agent, escribir a inbox
          if (!state.queryFileWritten && text.indexOf("@agent ") === 0) {
            const query = text.substring(7).trim();
            if (query) {
              log(deps, "Nueva consulta @" + noteId + ": " + query);
              if (writeQueryFile(fm, inboxDir, noteId, query)) {
                state.queryFileWritten = true;
                if (typeof lw.changeNoteText === "function") {
                  lw.changeNoteText(noteId, "[Consultando agente...]\n" + query);
                }
              }
            }
          }

          // Fase 2: verificar si hay respuesta via TCP
          if (state.queryFileWritten && !state.responseReceived) {
            log(deps, "Fase2: queryFileWritten=true, esperando respuesta para " + noteId);
            makeTcpRequest(noteId);
            var result = getCachedTcpResponse(noteId);
            if (result) {
              log(deps, "RESPUESTA PARA @" + noteId + ": " + result.response.substring(0, 200));
              if (typeof lw.changeNoteText === "function") {
                lw.changeNoteText(noteId, result.response);
              }
              state.responseReceived = true;
              state.lastText = result.response;
            }
          }

          noteStates[noteId] = state;
        }
      }
    }
  } catch (e) {
    log(deps, "Error en tick: " + String(e));
  }
}

function log(deps: PtDeps, msg: string): void {
  deps.dprint("[canvas-watcher] " + msg);
}

export function startCanvasNoteWatcher(deps: PtDeps): void {
  if (watcherActive) return;
  watcherActive = true;

  watcherTimerId = setInterval(function () {
    tick(deps);
  }, POLL_INTERVAL_MS);

  log(deps, "Watcher iniciado (interval=" + POLL_INTERVAL_MS + "ms)");
}

export function stopCanvasNoteWatcher(): void {
  if (watcherTimerId !== null) {
    clearInterval(watcherTimerId);
    watcherTimerId = null;
  }
  watcherActive = false;
}
