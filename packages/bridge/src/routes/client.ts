/**
 * Ruta GET /bridge-client.js
 * Bootstrap script para Packet Tracer WebView
 * 
 * Este script se inyecta en el WebView de PT y:
 * 1. Hace polling a /next para obtener comandos
 * 2. Ejecuta comandos en el Script Engine con $se('runCode', ...)
 * 3. Envía respuestas a /result
 * 4. Permite actualización dinámica de handlers
 */

const BRIDGE_URL = 'http://127.0.0.1:54321';
const POLL_INTERVAL = 300;

const BOOTSTRAP_SCRIPT = `
(function() {
  'use strict';
  
  const BRIDGE_URL = '${BRIDGE_URL}';
  const POLL_INTERVAL = ${POLL_INTERVAL};
  
  let isRunning = false;
  let pollTimer = null;
  let handlersLoaded = false;
  
  // ============================================
  // HTTP Helpers (WebView tiene XMLHttpRequest)
  // ============================================
  
  function httpGet(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.timeout = 5000;
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(xhr.responseText);
        } else {
          reject(new Error('HTTP ' + xhr.status));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Timeout'));
      xhr.send();
    });
  }
  
  function httpPost(url, data) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.timeout = 5000;
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText);
        } else {
          reject(new Error('HTTP ' + xhr.status));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Timeout'));
      xhr.send(JSON.stringify(data));
    });
  }
  
  // ============================================
  // Cargar handlers dinámicos
  // ============================================
  
  async function loadHandlers() {
    try {
      const script = await httpGet(BRIDGE_URL + '/handlers');
      // Ejecutar en Script Engine
      $se('runCode', script);
      handlersLoaded = true;
      log('Handlers cargados');
    } catch (e) {
      log('Error cargando handlers: ' + e.message);
    }
  }
  
  // ============================================
  // Ejecutar comando
  // ============================================
  
  async function executeCommand(cmd) {
    if (!cmd || !cmd.id || !cmd.tipo) return;
    
    log('Ejecutando: ' + cmd.tipo);
    
    // Generar código para Script Engine
    const code = \`
(function() {
  var result = PT_HANDLERS['\${cmd.tipo}'](\${JSON.stringify(cmd.args)});
  
  // Enviar resultado vía HTTP
  (function() {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '\${BRIDGE_URL}/result', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
      id: '\${cmd.id}',
      ok: result.ok,
      message: result.message,
      data: result.data
    }));
  })();
  
  return result;
})();
\`;
    
    // Ejecutar en Script Engine
    try {
      if (typeof $se === 'function') {
        $se('runCode', code);
      } else if (typeof window.webview !== 'undefined' && window.webview.evaluateJavaScriptAsync) {
        window.webview.evaluateJavaScriptAsync(code);
      } else {
        log('ERROR: No hay acceso a Script Engine');
        await sendError(cmd.id, 'No hay acceso a Script Engine');
      }
    } catch (e) {
      log('Error ejecutando: ' + e.message);
      await sendError(cmd.id, e.message);
    }
  }
  
  async function sendError(id, message) {
    try {
      await httpPost(BRIDGE_URL + '/result', {
        id: id,
        ok: false,
        message: message
      });
    } catch (e) {}
  }
  
  // ============================================
  // Polling loop
  // ============================================
  
  async function poll() {
    if (!isRunning) return;
    
    try {
      // Cargar handlers si no están cargados
      if (!handlersLoaded) {
        await loadHandlers();
      }
      
      // Obtener siguiente comando
      const response = await httpGet(BRIDGE_URL + '/next');
      const data = JSON.parse(response);
      
      if (data.hasCommand && data.command) {
        await executeCommand(data.command);
      }
    } catch (e) {
      log('Poll error: ' + e.message);
    }
    
    // Programar siguiente poll
    if (isRunning) {
      pollTimer = setTimeout(poll, POLL_INTERVAL);
    }
  }
  
  // ============================================
  // Control
  // ============================================
  
  function start() {
    if (isRunning) return;
    isRunning = true;
    log('Bridge client iniciado');
    loadHandlers().then(poll);
  }
  
  function stop() {
    isRunning = false;
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    log('Bridge client detenido');
  }
  
  function log(msg) {
    console.log('[Bridge-WebView] ' + msg);
    // También mostrar en UI si está disponible
    try {
      var logEl = document.getElementById('bridge-log');
      if (logEl) {
        logEl.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg + '\\n' + logEl.textContent;
      }
    } catch (e) {}
  }
  
  // Auto-iniciar
  start();
  
  // API pública
  window.BridgeClient = { 
    start, 
    stop, 
    isRunning: () => isRunning,
    loadHandlers 
  };
  
})();
`;

/**
 * Handler GET /bridge-client.js
 */
export function handleClient(): Response {
  return new Response(BOOTSTRAP_SCRIPT, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  });
}