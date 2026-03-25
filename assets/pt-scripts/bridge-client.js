(function() {
  const BRIDGE_URL = 'http://127.0.0.1:54321';
  const POLL_INTERVAL = 500;
  const HEARTBEAT_INTERVAL = 5000;
  const MAX_RETRIES = 10;
  const MAX_QUEUE = 100;

  let pollIntervalId = null;
  let heartbeatIntervalId = null;
  let reconnectTimerId = null;
  let retryCount = 0;
  let isConnected = false;
  const commandQueue = [];

  function log(level, message, meta) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    if (meta) {
      entry.meta = meta;
    }
    console.log('[PT-Bridge]', JSON.stringify(entry));
  }

  function enqueueCommand(payload) {
    if (commandQueue.length >= MAX_QUEUE) {
      log('warn', 'Cola llena, descartando comando', {
        id: payload.id || 'sin-id',
        queueSize: commandQueue.length,
      });
      return false;
    }
    commandQueue.push(payload);
    log('debug', 'Comando encolado', {
      id: payload.id || 'sin-id',
      queueSize: commandQueue.length,
    });
    return true;
  }

  function parseNextResponse(text) {
    if (!text) {
      return null;
    }
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.command) {
        return {
          id: parsed.id,
          command: parsed.command,
        };
      }
      if (typeof parsed === 'string') {
        return {
          command: parsed,
        };
      }
    } catch (error) {
      log('debug', 'Respuesta de polling no era JSON válido', {
        error: error && error.message ? error.message : String(error),
      });
    }
    return {
      command: text,
    };
  }

  function executeCommand(payload) {
    if (!payload || !payload.command) {
      return;
    }
    try {
      log('info', 'Ejecutando comando', {
        id: payload.id || 'sin-id',
      });
      $se('runCode', payload.command);
    } catch (error) {
      log('error', 'Error al ejecutar comando', {
        id: payload.id || 'sin-id',
        error: error && error.message ? error.message : String(error),
      });
      sendResult(payload.id || 'sin-id', {
        error: error && error.message ? error.message : String(error),
      });
    }
  }

  function processQueue() {
    if (!commandQueue.length) {
      return;
    }
    const next = commandQueue.shift();
    executeCommand(next);
    if (commandQueue.length) {
      setTimeout(processQueue, 0);
    }
  }

  function handleFailure(reason) {
    isConnected = false;
    log('error', 'Bridge falló', {
      reason,
      retryCount,
    });
    stop();
    scheduleReconnect();
  }

  function scheduleReconnect() {
    if (reconnectTimerId) {
      return;
    }
    if (retryCount >= MAX_RETRIES) {
      log('error', 'Máximo de reintentos alcanzado', {
        attempts: retryCount,
      });
      return;
    }
    retryCount += 1;
    const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
    log('warn', 'Reconectando con backoff exponencial', {
      delay,
      attempt: retryCount,
    });
    reconnectTimerId = setTimeout(() => {
      reconnectTimerId = null;
      start();
    }, delay);
  }

  function clearReconnectTimer() {
    if (reconnectTimerId) {
      clearTimeout(reconnectTimerId);
      reconnectTimerId = null;
    }
  }

  function poll() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', BRIDGE_URL + '/next', true);
    xhr.timeout = 2000;
    xhr.onload = function() {
      if (xhr.status === 200) {
        retryCount = 0;
        clearReconnectTimer();
        isConnected = true;
        const payload = parseNextResponse(xhr.responseText);
        if (payload && payload.command) {
          if (enqueueCommand(payload)) {
            processQueue();
          }
        }
        return;
      }
      handleFailure('HTTP ' + xhr.status);
    };
    xhr.onerror = function(event) {
      handleFailure(event || 'network');
    };
    xhr.ontimeout = function() {
      log('warn', 'Poll timeout');
    };
    xhr.send();
  }

  function heartbeat() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', BRIDGE_URL + '/ping', true);
    xhr.timeout = 1000;
    xhr.onload = function() {
      if (xhr.status === 200) {
        retryCount = 0;
        isConnected = true;
        log('debug', 'Heartbeat OK', {
          timestamp: new Date().toISOString(),
        });
        return;
      }
      handleFailure('heartbeat ' + xhr.status);
    };
    xhr.onerror = function(event) {
      handleFailure(event || 'heartbeat network');
    };
    xhr.send();
  }

  function sendResult(commandId, result) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BRIDGE_URL + '/result', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 5000;
    xhr.onload = function() {
      if (xhr.status === 200) {
        log('debug', 'Resultado enviado', {
          commandId,
        });
        return;
      }
      log('warn', 'Resultado rechazado', {
        commandId,
        status: xhr.status,
      });
    };
    xhr.onerror = function() {
      log('error', 'Error enviando resultado', {
        commandId,
      });
    };
    try {
      xhr.send(JSON.stringify({
        id: commandId,
        result,
      }));
    } catch (error) {
      log('error', 'No se pudo serializar resultado', {
        commandId,
        error: error && error.message ? error.message : String(error),
      });
    }
  }

  function start() {
    if (pollIntervalId || heartbeatIntervalId) {
      log('debug', 'Bridge client ya iniciado');
      return;
    }
    log('info', 'Iniciando bridge client');
    pollIntervalId = setInterval(poll, POLL_INTERVAL);
    heartbeatIntervalId = setInterval(heartbeat, HEARTBEAT_INTERVAL);
    poll();
    heartbeat();
  }

  function stop() {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId);
      heartbeatIntervalId = null;
    }
    clearReconnectTimer();
    isConnected = false;
    log('info', 'Bridge client detenido');
  }

  start();

  window.PTBridge = {
    start,
    stop,
    sendResult,
    isConnected: function() {
      return isConnected;
    },
    queueState: function() {
      return {
        queued: commandQueue.length,
      };
    },
  };
})();
