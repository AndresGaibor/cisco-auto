/**
 * Ruta GET /bridge-client.js
 * Serve bootstrap script que se inyecta en Packet Tracer
 */

const BRIDGE_URL = 'http://127.0.0.1:54321';
const POLL_INTERVAL = 500;

const BOOTSTRAP_SCRIPT = `
(function() {
  'use strict';
  
  const BRIDGE_URL = '${BRIDGE_URL}';
  const POLL_INTERVAL = ${POLL_INTERVAL};
  
  let isRunning = false;
  let pollTimer = null;
  
  /**
   * Envía solicitud al bridge
   */
  async function fetchNext() {
    try {
      const response = await fetch(BRIDGE_URL + '/next');
      if (!response.ok) {
        console.warn('[Bridge] Error fetching:', response.status);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.warn('[Bridge] Connection error:', error.message);
      return null;
    }
  }
  
  /**
   * Ejecuta comando en Packet Tracer
   * Usa la API de PT para evaluar JavaScript async
   */
  async function executeCommand(command) {
    if (!command || !command.command) {
      return;
    }
    
    const cmd = command.command;
    console.log('[Bridge] Ejecutando comando:', cmd.tipo, cmd.args);
    
    try {
      // PT provee evaluateJavaScriptAsync para ejecutar código
      if (typeof window.evaluateJavaScriptAsync === 'function') {
        const code = generarCodigoPT(cmd);
        const result = await window.evaluateJavaScriptAsync(code);
        console.log('[Bridge] Resultado:', result);
      } else {
        // Fallback: intentar con PT API estándar
        console.warn('[Bridge] evaluateJavaScriptAsync no disponible');
      }
    } catch (error) {
      console.error('[Bridge] Error ejecutando:', error);
    }
  }
  
  /**
   * Genera código PT desde comando
   */
  function generarCodigoPT(cmd) {
    switch (cmd.tipo) {
      case 'agregarDispositivo':
        return \`PT.addDevice(\${JSON.stringify(cmd.args)})\`;
      case 'conectar':
        return \`PT.connect(\${JSON.stringify(cmd.args)})\`;
      case 'configurar':
        return \`PT.configure(\${JSON.stringify(cmd.args)})\`;
      case 'eliminarDispositivo':
        return \`PT.removeDevice(\${JSON.stringify(cmd.args)})\`;
      default:
        return \`console.log('Comando desconocido:', \${JSON.stringify(cmd)})\`;
    }
  }
  
  /**
   * Ciclo principal de polling
   */
  async function poll() {
    if (!isRunning) return;
    
    const data = await fetchNext();
    if (data && data.hasCommand && data.command) {
      await executeCommand(data);
    }
    
    // Programar siguiente poll
    if (isRunning) {
      pollTimer = setTimeout(poll, POLL_INTERVAL);
    }
  }
  
  /**
   * Inicia el bridge client
   */
  function start() {
    if (isRunning) {
      console.log('[Bridge] Ya está corriendo');
      return;
    }
    
    isRunning = true;
    console.log('[Bridge] Iniciando polling cada', POLL_INTERVAL, 'ms');
    poll();
  }
  
  /**
   * Detiene el bridge client
   */
  function stop() {
    isRunning = false;
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    console.log('[Bridge] Detenido');
  }
  
  // Auto-iniciar si estamos en PT
  if (typeof window !== 'undefined' && window.document) {
    start();
  }
  
  // Exportar API pública
  window.BridgeClient = { start, stop, isRunning: () => isRunning };
  
})();
`;

/**
 * Handler GET /bridge-client.js
 * Retorna el script de bootstrap como JavaScript
 */
export function handleClient(): Response {
  return new Response(BOOTSTRAP_SCRIPT, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Access-Control-Allow-Origin': 'http://localhost/*',
      'Cache-Control': 'no-cache'
    }
  });
}
