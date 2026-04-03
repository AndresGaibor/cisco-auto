/**
 * Runtime IOS Configuration Handlers Template
 * Handles iOS command execution and configuration
 */

export function generateIosConfigHandlersTemplate(): string {
  return `// ============================================================================
// IOS Configuration Handlers
// ============================================================================

function classifyIosOutput(output) {
  var trimmed = (output || "").trim();

  // Error patterns
  if (trimmed.indexOf("% Invalid input") >= 0) {
    return { category: "invalid", ok: false };
  }
  if (trimmed.indexOf("% Incomplete command") >= 0) {
    return { category: "incomplete", ok: false };
  }
  if (trimmed.indexOf("% Ambiguous command") >= 0) {
    return { category: "ambiguous", ok: false };
  }
  if (trimmed.indexOf("% ") >= 0 && trimmed.indexOf("ERROR") >= 0) {
    return { category: "error", ok: false };
  }

  // Success patterns
  if (trimmed.indexOf("--More--") >= 0) {
    return { category: "paging", ok: true };
  }
  if (trimmed.indexOf("[confirm]") >= 0) {
    return { category: "confirm", ok: true };
  }

  // Default
  return { category: "success", ok: true };
}

function handleConfigIos(payload) {
  var device = getNet().getDevice(payload.device);
  if (!device) return { ok: false, error: "Device not found: " + payload.device };

  if (device.skipBoot) device.skipBoot();

  var term = device.getCommandLine();
  if (!term) return { ok: false, error: "Device does not support CLI" };

  function enterCommandResult(command) {
    var response = term.enterCommand(command);
    if (response && typeof response.length === "number") {
      return [response[0] || 0, response[1] || ""];
    }

    var prompt = "";
    try {
      prompt = term.getPrompt ? term.getPrompt() : "";
    } catch (e) {}
    return [0, prompt];
  }

  var session = getOrCreateSession(payload.device, term);

  var configResult = ensureConfigMode(term, session);
  if (!configResult[0]) {
    dprint("[handleConfigIos] Failed to enter config mode: " + configResult[1]);
    return { ok: false, error: "Failed to enter config mode: " + configResult[1], phase: "pre-exec" };
  }

  var results = [];
  var failedCount = 0;
  var stopOnError = payload.stopOnError !== false; // Default: fail-fast

  for (var i = 0; i < payload.commands.length; i++) {
    var cmd = payload.commands[i];
    var cmdResult = executeIosCommand(term, cmd, session);
    var status = cmdResult[0];
    var output = cmdResult[1];

    var classification = classifyIosOutput(output);
    var cmdOk = status === 0 && classification.ok;

    results.push({
      index: i,
      command: cmd,
      ok: cmdOk,
      status: status,
      output: output.slice(0, 500),
      classification: classification.category
    });

    if (!cmdOk) {
      failedCount++;
      if (stopOnError) {
        return {
          ok: false,
          error: "Command failed (abort on error): " + cmd,
          failedAt: i,
          totalCommands: payload.commands.length,
          executedCount: i + 1,
          failedCount: failedCount,
          results: results,
          session: { mode: session.mode }
        };
      }
    }
  }

  if (payload.save !== false) {
    executeIosCommand(term, "write memory", session);
  }

  return {
    ok: failedCount === 0,
    device: payload.device,
    totalCommands: payload.commands.length,
    executedCount: results.length,
    failedCount: failedCount,
    results: results,
    session: { mode: session.mode }
  };
}
`;
}
