/**
 * Runtime IOS Execution Handlers Template
 * Uses synchronous execution with terminal
 */

import { generateParserCode } from "../utils/parser-generator";

export function generateIosExecHandlersTemplate(): string {
  const parsersCode = generateParserCode();
  
  return `// ============================================================================
// IOS Output Parsers
// ============================================================================

${parsersCode}

// ============================================================================
// IOS Execution Handlers - Synchronous execution
// ============================================================================

function handleExecIos(payload) {
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
      error: "TerminalLine not available for device " + deviceName 
    };
  }
  
  if (!term) {
    return { 
      ok: false, 
      code: "CLI_UNAVAILABLE",
      error: "TerminalLine not available for device " + deviceName 
    };
  }

  var command = payload.command;
  dprint("[handleExecIos] Command payload: '" + JSON.stringify(payload) + "'");
  dprint("[handleExecIos] Raw command: '" + command + "'");
  var output = "";
  var status = 0;
  
  // Obtener modo actual
  var currentMode = "user-exec";
  var preCommandLength = 0;
  
  try {
    // NO limpiar el buffer - obtenemos la longitud actual
    preCommandLength = term.getOutput ? term.getOutput().length : 0;
    var prompt = term.getPrompt ? term.getPrompt() : "";
    dprint("[handleExecIos] Initial prompt: '" + prompt + "', pre-command buffer: " + preCommandLength);
    if (prompt.indexOf("(config") >= 0) {
      currentMode = "config";
    } else if (prompt.indexOf("#") >= 0) {
      currentMode = "priv-exec";
    } else if (prompt.indexOf(">") >= 0) {
      currentMode = "user-exec";
    }
  } catch (e) {}
  
  dprint("[handleExecIos] Current mode: " + currentMode + ", command: " + command);
  
  // Verificar si es un comando show (se ejecuta en modo privilegiado, NO config)
  var isShowCommand = command.toLowerCase().indexOf("show ") === 0 || 
                      command.toLowerCase().indexOf("show ") > 0;
  
  // Si estamos en modo config y es un show command, salir primero
  if (currentMode === "config" && isShowCommand) {
    dprint("[handleExecIos] Exiting config mode for show command");
    try {
      term.enterCommand("end");
      var maxAttempts = 10;
      var attempt = 0;
      while (attempt < maxAttempts) {
        var checkOutput = term.getOutput ? term.getOutput() : "";
        if (checkOutput.indexOf("#") >= 0) {
          currentMode = "priv-exec";
          preCommandLength = checkOutput.length;
          break;
        }
        attempt++;
      }
    } catch (e) {}
  }
  
  // Asegurar modo privilegiado para show commands
  if (isShowCommand && currentMode !== "priv-exec") {
    dprint("[handleExecIos] Entering enable mode");
    try {
      term.enterCommand("enable");
      var maxAttempts = 10;
      var attempt = 0;
      while (attempt < maxAttempts) {
        var checkOutput = term.getOutput ? term.getOutput() : "";
        if (checkOutput.indexOf("#") >= 0) {
          currentMode = "priv-exec";
          preCommandLength = checkOutput.length;
          break;
        }
        attempt++;
      }
    } catch (e) {}
  }
  
  // Ejecutar comando de forma síncrona
  try {
    // Obtener longitud actual del buffer ANTES de enviar comando
    preCommandLength = term.getOutput ? term.getOutput().length : 0;
    dprint("[handleExecIos] Pre-command buffer length: " + preCommandLength);
    
    term.enterCommand(command);
    
    // Polling para obtener output - solo lo nuevo
    var maxAttempts = 30;
    var attempt = 0;
    while (attempt < maxAttempts) {
      try {
        var checkOutput = term.getOutput ? term.getOutput() : "";
        // Solo tomar lo nuevo desde que empezamos
        if (checkOutput.length > preCommandLength) {
          output = checkOutput.slice(preCommandLength);
          if (output.indexOf("--More--") >= 0) {
            term.enterCommand(" ");
            preCommandLength = term.getOutput().length;
          }
          if (output.indexOf("[confirm]") >= 0) {
            term.enterCommand("\\n");
            preCommandLength = term.getOutput().length;
          }
          // Salir cuando veamos prompt y output sustancial
          if ((output.indexOf("#") >= 0 || output.indexOf(">") >= 0) && output.length > 20) {
            break;
          }
        }
      } catch(e) {
        break;
      }
      attempt++;
    }
    dprint("[handleExecIos] Post-command output: " + output.length + " chars");
  } catch (e) {
    status = 1;
    output = String(e);
  }
  
  // Determinar status basado en output - solo errores en las ultimas lineas DEL OUTPUT NUEVO
  var outputLines = output.split("\\n");
  var lastLines = outputLines.slice(-5).join("\\n");
  if (lastLines.indexOf("% Invalid") >= 0 || lastLines.indexOf("% Incomplete") >= 0 || 
      lastLines.indexOf("% Ambiguous") >= 0 || lastLines.indexOf("Error") >= 0) {
    status = 1;
  }
  
  var result = {
    ok: status === 0,
    raw: output,
    status: status,
    source: "terminal",
    session: { mode: currentMode }
  };
  
  if (!result.ok) {
    result.error = {
      code: "COMMAND_FAILED",
      message: "Command failed with status " + status,
      raw: output.slice(0, 200)
    };
  }
  
  return result;
}

function handleExecInteractive(payload) {
  // Stub: execInteractive usa el mismo mecanismo que execIos pero con streaming
  // Por ahora, delegamos a handleExecIos
  return handleExecIos(payload);
}
`;
}
