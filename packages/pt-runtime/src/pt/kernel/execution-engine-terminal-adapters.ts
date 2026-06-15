// packages/pt-runtime/src/pt/kernel/execution-engine-terminal-adapters.ts
// Terminal adapters: createAttachableTerminal y tryAttachTerminal
// Dependen de resolvePacketTracerIpc (dentro del closure) y del terminal engine

import type { TerminalEngine } from "../terminal/terminal-engine";
import {
  inferPromptFromTerminalText,
  normalizeIosMode,
} from "./execution-engine-prompt-utils";
import { normalizeEol } from "./execution-engine-output-detectors";

function readTerminalTextSafe(term: any): string {
  const methods = [
    "getAllOutput",
    "getBuffer",
    "getOutput",
    "getText",
    "readAll",
    "read",
    "getHistory",
    "history",
  ];

  for (let i = 0; i < methods.length; i += 1) {
    const name = methods[i];

    try {
      if (typeof term[name] === "function") {
        const value = term[name]();
        if (value && typeof value === "string") {
          return value;
        }
      }
    } catch {}
  }

  try {
    if (typeof term.getConsole === "function") {
      const consoleObj = term.getConsole();

      if (consoleObj) {
        for (let i = 0; i < methods.length; i += 1) {
          const name = methods[i];

          try {
            if (typeof consoleObj[name] === "function") {
              const value = consoleObj[name]();
              if (value && typeof value === "string") {
                return value;
              }
            }
          } catch {}
        }
      }
    }
  } catch {}

  return "";
}

export function createAttachableTerminal(term: any): any {
  return {
    getPrompt: function () {
      try {
        if (typeof term.getPrompt === "function") {
          const prompt = term.getPrompt();
          if (prompt && typeof prompt === "string") {
            return prompt;
          }
        }
      } catch {}

      return inferPromptFromTerminalText(readTerminalTextSafe(term));
    },

    getMode: function () {
      const prompt = inferPromptFromTerminalText(readTerminalTextSafe(term));

      try {
        if (typeof term.getMode === "function") {
          return normalizeIosMode(term.getMode(), prompt);
        }
      } catch {}

      return normalizeIosMode("unknown", prompt);
    },

    getOutput: function () {
      try {
        if (typeof term.getOutput === "function") {
          return term.getOutput();
        }
      } catch {}

      return readTerminalTextSafe(term);
    },

    getAllOutput: function () {
      try {
        if (typeof term.getAllOutput === "function") {
          return term.getAllOutput();
        }
      } catch {}

      return readTerminalTextSafe(term);
    },

    getBuffer: function () {
      try {
        if (typeof term.getBuffer === "function") {
          return term.getBuffer();
        }
      } catch {}

      return readTerminalTextSafe(term);
    },

    getCommandInput: function () {
      try {
        if (typeof term.getCommandInput === "function") {
          return term.getCommandInput();
        }
      } catch {}

      return "";
    },

    enterCommand: function (cmd: string) {
      return term.enterCommand(cmd);
    },

    enterChar: function (charCode: number, modifiers: number) {
      return term.enterChar(charCode, modifiers);
    },

    registerEvent: function (
      eventName: string,
      context: unknown,
      handler: (src: unknown, args: unknown) => void,
    ) {
      return term.registerEvent(eventName, context, handler);
    },

    unregisterEvent: function (
      eventName: string,
      context: unknown,
      handler: (src: unknown, args: unknown) => void,
    ) {
      return term.unregisterEvent(eventName, context, handler);
    },

    println: function (text: string) {
      if (typeof term.println === "function") {
        return term.println(text);
      }
    },

    flush: function () {
      if (typeof term.flush === "function") {
        return term.flush();
      }
    },

    getConsole: function () {
      if (typeof term.getConsole === "function") {
        return term.getConsole();
      }

      return null;
    },
  };
}

function resolvePacketTracerIpc(): any {
  try {
    if (typeof self !== "undefined" && self) {
      const root = self as any;
      if (root.ipc && typeof root.ipc.network === "function") {
        return root.ipc;
      }
    }
  } catch {}

  try {
    if (typeof ipc !== "undefined" && ipc && typeof ipc.network === "function") {
      return ipc;
    }
  } catch {}

  try {
    if (typeof _ScriptModule !== "undefined" && _ScriptModule) {
      const scriptModule = _ScriptModule as any;
      const context = scriptModule.context;
      const scriptModuleIpc = context && context.ipc;
      if (scriptModuleIpc && typeof scriptModuleIpc.network === "function") {
        return scriptModuleIpc;
      }
    }
  } catch {}

  return null;
}

export function createTryAttachTerminal(terminal: TerminalEngine, execLog: (msg: string) => void) {
  return function tryAttachTerminal(device: string): boolean {
    try {
      const resolvedIpc = resolvePacketTracerIpc();

      if (!resolvedIpc) {
        execLog("ATTACH failed device=" + device + " reason=no-ipc");
        return false;
      }

      const net = typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;

      if (!net || typeof net.getDevice !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-network");
        return false;
      }

      const dev = net.getDevice(device);

      if (!dev) {
        execLog("ATTACH failed device=" + device + " reason=no-device");
        return false;
      }

      if (typeof dev.getCommandLine !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-get-command-line");
        return false;
      }

      const term = dev.getCommandLine();

      if (!term) {
        execLog("ATTACH failed device=" + device + " reason=no-command-line");
        return false;
      }

      if (typeof term.enterCommand !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-enter-command");
        return false;
      }

      if (typeof term.registerEvent !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-register-event");
        return false;
      }

      if (typeof term.unregisterEvent !== "function") {
        execLog("ATTACH failed device=" + device + " reason=no-unregister-event");
        return false;
      }

      terminal.attach(device, createAttachableTerminal(term) as any);
      return true;
    } catch (error) {
      execLog("ATTACH failed device=" + device + " error=" + String(error));
      return false;
    }
  };
}

export function createGetNativeTerminalForDevice(execLog: (msg: string) => void) {
  return function getNativeTerminalForDevice(device: string): any {
    try {
      const resolvedIpc = resolvePacketTracerIpc();
      const net = resolvedIpc && typeof resolvedIpc.network === "function" ? resolvedIpc.network() : null;
      const dev = net && typeof net.getDevice === "function" ? net.getDevice(device) : null;

      if (!dev) return null;

      try {
        if (typeof dev.getCommandLine === "function") {
          const term = dev.getCommandLine();
          if (term) return term;
        }
      } catch {}

      try {
        if (
          typeof dev.getConsole === "function" &&
          dev.getConsole() &&
          typeof dev.getConsole().getTerminalLine === "function"
        ) {
          const term = dev.getConsole().getTerminalLine();
          if (term) return term;
        }
      } catch {}

      return null;
    } catch {
      return null;
    }
  };
}
