// packages/pt-runtime/src/runtime/validators/ios.ts
// Validador para comandos IOS (configIos, execIos)

var MAX_STRING_LENGTH = 4096;
var MAX_ARRAY_LENGTH = 1000;

var IOS_INJECTION_PATTERNS = [/\x00/, /\x1B/, /\r/];

export function validateIosCommand(
  payload: Record<string, unknown>,
  commandType: string,
): Array<{ field: string; message: string }> {
  var errors: Array<{ field: string; message: string }> = [];

  if (!payload.device || typeof payload.device !== "string") {
    errors.push({ field: "device", message: "device is required and must be a string" });
  }

  if (commandType === "configIos" && Array.isArray(payload.commands)) {
    if (payload.commands.length > MAX_ARRAY_LENGTH) {
      errors.push({
        field: "commands",
        message: "Too many commands (max " + MAX_ARRAY_LENGTH + ")",
      });
    }
    for (var i = 0; i < payload.commands.length; i++) {
      var cmd = payload.commands[i];
      if (typeof cmd !== "string") {
        errors.push({ field: "commands[" + i + "]", message: "Command must be a string" });
      } else if (cmd.length > MAX_STRING_LENGTH) {
        errors.push({ field: "commands[" + i + "]", message: "Command exceeds maximum length" });
      } else {
        for (var j = 0; j < IOS_INJECTION_PATTERNS.length; j++) {
          if (IOS_INJECTION_PATTERNS[j].test(cmd)) {
            errors.push({
              field: "commands[" + i + "]",
              message: "Command contains potentially dangerous pattern",
            });
            break;
          }
        }
      }
    }
  }

  if (commandType === "execIos") {
    if (!payload.command || typeof payload.command !== "string") {
      errors.push({ field: "command", message: "command is required and must be a string" });
    } else if (payload.command.length > MAX_STRING_LENGTH) {
      errors.push({ field: "command", message: "Command exceeds maximum length" });
    } else {
      for (var j = 0; j < IOS_INJECTION_PATTERNS.length; j++) {
        if (IOS_INJECTION_PATTERNS[j].test(payload.command)) {
          errors.push({
            field: "command",
            message: "Command contains potentially dangerous pattern",
          });
          break;
        }
      }
    }
  }

  return errors;
}
