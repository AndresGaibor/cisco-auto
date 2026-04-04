/**
 * Runtime IOS Configuration Handlers Template
 * Uses synchronous execution with terminal
 */

export function generateIosConfigHandlersTemplate(): string {
  return `// ============================================================================
// IOS Configuration Handlers - Synchronous execution
// ============================================================================

function handleConfigIos(payload) {
  var deviceName = payload.device;
  var device = getNet().getDevice(deviceName);
  
  if (!device) {
    return { 
      ok: false, 
      code: "DEVICE_NOT_FOUND",
      error: "Device not found: " + deviceName 
    };
  }

  var term;
  try {
    term = device.getCommandLine();
  } catch (e) {
    return { 
      ok: false, 
      code: "CLI_UNAVAILABLE",
      error: "Device does not support CLI: " + String(e) 
    };
  }
  
  if (!term) {
    return { 
      ok: false, 
      code: "CLI_UNAVAILABLE",
      error: "Device does not support CLI" 
    };
  }

  // Obtener el modo actual del dispositivo
  var currentMode = "user-exec";
  try {
    // Limpiar output buffer antes de nuevo comando
    try { term.clear(); } catch(e) {}
    
    var prompt = term.getPrompt ? term.getPrompt() : "";
    dprint("[handleConfigIos] Current prompt: '" + prompt + "'");
    if (prompt.indexOf("(config") >= 0) {
      currentMode = "config";
    } else if (prompt.indexOf("#") >= 0) {
      currentMode = "priv-exec";
    } else if (prompt.indexOf(">") >= 0) {
      currentMode = "user-exec";
    }
    dprint("[handleConfigIos] Initial mode: " + currentMode);
  } catch (e) {
    dprint("[handleConfigIos] Error getting prompt: " + String(e));
  }
  
  // Función para ejecutar un comando
  function executeCommandSync(cmd) {
    var output = "";
    var status = 0;
    var paged = false;
    var confirmed = false;
    
    // Obtener longitud actual del buffer ANTES de enviar comando
    var preCommandLength = term.getOutput ? term.getOutput().length : 0;
    dprint("[executeCommandSync] Pre-command buffer length: " + preCommandLength);
    
    // Verificar modo actual antes de ejecutar
    try {
      var prePrompt = term.getPrompt ? term.getPrompt() : "";
      if (prePrompt.indexOf("(config") >= 0) {
        currentMode = "config";
      } else if (prePrompt.indexOf("#") >= 0) {
        currentMode = "priv-exec";
      } else if (prePrompt.indexOf(">") >= 0) {
        currentMode = "user-exec";
      }
    } catch (e) {}
    
    try {
      term.enterCommand(cmd);
      dprint("[executeCommandSync] Sent: '" + cmd + "'");
      
      // Polling simple para obtener output - solo lo nuevo
      var maxAttempts = 30;
      var attempt = 0;
      while (attempt < maxAttempts) {
        try {
          var checkOutput = term.getOutput ? term.getOutput() : "";
          // Solo tomar lo nuevo desde que empezamos
          if (checkOutput.length > preCommandLength) {
            output = checkOutput.slice(preCommandLength);
            // Manejar paging
            if (output.indexOf("--More--") >= 0) {
              term.enterCommand(" ");
              preCommandLength = term.getOutput().length;
              paged = true;
            }
            // Manejar confirm
            if (output.indexOf("[confirm]") >= 0) {
              term.enterCommand("\\n");
              preCommandLength = term.getOutput().length;
              confirmed = true;
            }
            // Detectar cuando termina el comando (vemos prompt y output sustancial)
            if ((output.indexOf("#") >= 0 || output.indexOf(">") >= 0) && output.length > 20) {
              break;
            }
          }
        } catch(e) {
          break;
        }
        attempt++;
      }
    } catch (e) {
      status = 1;
      output = String(e);
    }
    
    // Actualizar el modo después del comando
    try {
      var newPrompt = term.getPrompt ? term.getPrompt() : "";
      if (newPrompt.indexOf("(config") >= 0) {
        currentMode = "config";
      } else if (newPrompt.indexOf("#") >= 0) {
        currentMode = "priv-exec";
      } else if (newPrompt.indexOf(">") >= 0) {
        currentMode = "user-exec";
      }
    } catch (e) {}
    
    // Determinar status basado en output - solo errores en las ultimas lineas
    var outputLines = output.split("\\n");
    var lastLines = outputLines.slice(-5).join("\\n");
    if (lastLines.indexOf("% Invalid") >= 0 || lastLines.indexOf("% Incomplete") >= 0 || 
        lastLines.indexOf("% Ambiguous") >= 0 || lastLines.indexOf("Error") >= 0) {
      status = 1;
    }
    
    return { status: status, output: output, paged: paged, confirmed: confirmed };
  }
  
  // TRANSICIONES DE MODO: Asegurar que estamos en el modo correcto
  
  // Verificar modo actual otra vez
  try {
    var promptBeforeTransitions = term.getPrompt ? term.getPrompt() : "";
    dprint("[handleConfigIos] Prompt before transitions: '" + promptBeforeTransitions + "'");
    if (promptBeforeTransitions.indexOf("(config") >= 0) {
      currentMode = "config";
    } else if (promptBeforeTransitions.indexOf("#") >= 0) {
      currentMode = "priv-exec";
    } else if (promptBeforeTransitions.indexOf(">") >= 0) {
      currentMode = "user-exec";
    }
    dprint("[handleConfigIos] Current mode before transitions: " + currentMode);
  } catch (e) {}
  
  // Si ya estamos en modo config, SALIR primero para asegurar estado limpio
  if (currentMode === "config") {
    dprint("[handleConfigIos] Already in config mode, exiting first");
    var exitResult = executeCommandSync("end");
    dprint("[handleConfigIos] Exit config result: " + exitResult.output.slice(0, 50));
  }
  
  // Si no estamos en modo privilegiado, entrar en enable
  if (currentMode !== "priv-exec") {
    dprint("[handleConfigIos] Entering enable mode");
    var enableResult = executeCommandSync("enable");
    dprint("[handleConfigIos] Enable output: " + enableResult.output.slice(0, 100));
  }
  
  // Verificar modo otra vez después de enable
  try {
    var promptAfterEnable2 = term.getPrompt ? term.getPrompt() : "";
    dprint("[handleConfigIos] Prompt after enable: '" + promptAfterEnable2 + "'");
    if (promptAfterEnable2.indexOf("(config") >= 0) {
      currentMode = "config";
    } else if (promptAfterEnable2.indexOf("#") >= 0) {
      currentMode = "priv-exec";
    }
    dprint("[handleConfigIos] Mode after enable: " + currentMode);
  } catch (e) {}
  
  // Si no estamos en modo config, entrar en configure terminal
  // PERO solo si el primer comando NO es ya un comando de configuración de modo
  var firstCmd = (payload.commands && payload.commands[0]) || "";
  var isModeChangeCommand = firstCmd.indexOf("enable") === 0 || 
                            firstCmd.indexOf("configure") === 0 ||
                            firstCmd.indexOf("exit") === 0 ||
                            firstCmd.indexOf("end") === 0;
  
  if (currentMode.indexOf("config") !== 0 && !isModeChangeCommand) {
    dprint("[handleConfigIos] Entering configure terminal");
    var configResult = executeCommandSync("configure terminal");
    dprint("[handleConfigIos] Configure terminal output: " + configResult.output.slice(0, 100));
  }
  
  // Verificar modo final
  try {
    var promptFinal = term.getPrompt ? term.getPrompt() : "";
    dprint("[handleConfigIos] Prompt final: '" + promptFinal + "'");
    if (promptFinal.indexOf("(config") >= 0) {
      currentMode = "config";
    } else if (promptFinal.indexOf("#") >= 0) {
      currentMode = "priv-exec";
    }
    dprint("[handleConfigIos] Mode final: " + currentMode);
  } catch (e) {}
  
  // Actualizar modo después de transiciones
  try {
    var promptFinal = term.getPrompt ? term.getPrompt() : "";
    if (promptFinal.indexOf("(config") >= 0) {
      currentMode = "config";
    } else if (promptFinal.indexOf("#") >= 0) {
      currentMode = "priv-exec";
    }
  } catch (e) {}
  
  // Ejecutar los comandos de configuración
  var results = [];
  var failedCount = 0;
  var commands = payload.commands || [];
  
  dprint("[handleConfigIos] Executing " + commands.length + " commands (mode: " + currentMode + ")");
  
  for (var i = 0; i < commands.length; i++) {
    var cmd = commands[i];
    dprint("[handleConfigIos] Executing: " + cmd);
    var result = executeCommandSync(cmd);
    
    if (result.status !== 0) {
      failedCount++;
      dprint("[handleConfigIos] Command failed: " + result.output.slice(0, 100));
    }
    
    results.push({
      index: i,
      command: cmd,
      ok: result.status === 0,
      status: result.status,
      output: result.output.slice(0, 500),
      modeBefore: currentMode,
      modeAfter: currentMode,
      paged: result.paged,
      autoConfirmed: result.confirmed
    });
  }
  
  // Save si se requiere
  if (payload.save !== false) {
    dprint("[handleConfigIos] Saving config");
    executeCommandSync("end");
    executeCommandSync("write memory");
  }
  
  return {
    ok: failedCount === 0,
    device: deviceName,
    executedCount: results.length,
    failedCount: failedCount,
    results: results,
    session: { mode: currentMode },
    source: "terminal"
  };
}
`;
}
