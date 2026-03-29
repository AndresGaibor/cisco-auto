import { describe, it, expect } from "bun:test";
import {
  inferPromptState,
  type PromptState,
  IOS_PROMPT_PATTERNS,
} from "../src/ios/session/prompt-state";
import {
  CliSession,
  createCliSession,
} from "../src/ios/session/cli-session";
import {
  type CommandResult,
  isSuccessResult,
  isErrorResult,
  isPagingResult,
} from "../src/ios/session/command-result";

describe("IOS Prompt State Machine", () => {
  describe("inferPromptState", () => {
    it("infers user-exec mode from '>' prompt", () => {
      const state = inferPromptState("Router1>");
      expect(state.mode).toBe("user-exec");
    });

    it("infers priv-exec mode from '#' prompt", () => {
      const state = inferPromptState("Router1#");
      expect(state.mode).toBe("priv-exec");
    });

    it("infers config mode from '(config)#' prompt", () => {
      const state = inferPromptState("Router1(config)#");
      expect(state.mode).toBe("config");
    });

    it("infers config-if mode from '(config-if)#' prompt", () => {
      const state = inferPromptState("Router1(config-if)#");
      expect(state.mode).toBe("config-if");
    });

    it("infers config-line mode from '(config-line)#' prompt", () => {
      const state = inferPromptState("Router1(config-line)#");
      expect(state.mode).toBe("config-line");
    });

    it("detects password prompt", () => {
      const state = inferPromptState("Password:");
      expect(state.mode).toBe("awaiting-password");
    });

    it("detects confirmation prompt", () => {
      const state = inferPromptState("[confirm]");
      expect(state.mode).toBe("awaiting-confirm");
    });

    it("detects paging (--More--)", () => {
      const state = inferPromptState("--More--");
      expect(state.mode).toBe("paging");
    });

    it("detects paging with spaces", () => {
      const state = inferPromptState(" --More-- ");
      expect(state.mode).toBe("paging");
    });

    it("handles hostname with domain", () => {
      const state = inferPromptState("Router1.cisco-lab.com#");
      expect(state.mode).toBe("priv-exec");
    });

    it("handles interface submode (config-if)#", () => {
      const state = inferPromptState("Switch1(config-if)#");
      expect(state.mode).toBe("config-if");
    });

    it("handles router submode (config-router)#", () => {
      const state = inferPromptState("Router1(config-router)#");
      expect(state.mode).toBe("config-router");
    });

    it("returns unknown for unrecognized prompts", () => {
      const state = inferPromptState("unknown-prompt");
      expect(state.mode).toBe("unknown");
    });
  });

  describe("IOS_PROMPT_PATTERNS", () => {
    it("has all required prompt patterns defined", () => {
      expect(IOS_PROMPT_PATTERNS.userExec).toBeDefined();
      expect(IOS_PROMPT_PATTERNS.privExec).toBeDefined();
      expect(IOS_PROMPT_PATTERNS.config).toBeDefined();
      expect(IOS_PROMPT_PATTERNS.configIf).toBeDefined();
      expect(IOS_PROMPT_PATTERNS.configLine).toBeDefined();
      expect(IOS_PROMPT_PATTERNS.configRouter).toBeDefined();
      expect(IOS_PROMPT_PATTERNS.password).toBeDefined();
      expect(IOS_PROMPT_PATTERNS.confirm).toBeDefined();
      expect(IOS_PROMPT_PATTERNS.paging).toBeDefined();
    });
  });
});

describe("CLI Session State Management", () => {
  describe("CliSession", () => {
    it("creates a session with initial user-exec state", () => {
      const session = new CliSession("Router1", {
        enterCommand: (cmd: string) => [0, "Router1>"],
      });

      expect(session.getState().mode).toBe("user-exec");
    });

    it("updates state after enable command", () => {
      const session = new CliSession("Router1", {
        enterCommand: (cmd: string) => {
          if (cmd === "enable") {
            return [0, "Router1#"];
          }
          return [0, "Router1>"];
        },
      });

      session.execute("enable");
      expect(session.getState().mode).toBe("priv-exec");
    });

    it("updates state after configure terminal", () => {
      const session = new CliSession("Router1", {
        enterCommand: (cmd: string) => {
          if (cmd === "configure terminal") {
            return [0, "Router1(config)#"];
          }
          return [0, "Router1#"];
        },
      });

      session.execute("configure terminal");
      expect(session.getState().mode).toBe("config");
    });

    it("transitions from config to config-if", () => {
      const session = new CliSession("Router1", {
        enterCommand: (cmd: string) => {
          if (cmd === "interface GigabitEthernet0/0") {
            return [0, "Router1(config-if)#"];
          }
          return [0, "Router1(config)#"];
        },
      });

      // Simulate being in config mode
      session["state"].mode = "config";
      session.execute("interface GigabitEthernet0/0");
      expect(session.getState().mode).toBe("config-if");
    });

    it("exits config mode with 'exit' command", () => {
      const session = new CliSession("Router1", {
        enterCommand: (cmd: string) => {
          if (cmd === "exit") {
            return [0, "Router1#"];
          }
          return [0, "Router1(config)#"];
        },
      });

      // Start in config mode
      session["state"].mode = "config";
      session.execute("exit");
      expect(session.getState().mode).toBe("priv-exec");
    });

    it("tracks command history", () => {
      const session = new CliSession("Router1", {
        enterCommand: () => [0, "Router1#"],
      });

      session.execute("show version");
      session.execute("show ip int brief");

      const history = session.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0].command).toBe("show version");
      expect(history[1].command).toBe("show ip int brief");
    });

    it("handles paging response correctly", () => {
      const session = new CliSession("Router1", {
        enterCommand: (cmd: string) => {
          if (cmd.startsWith("show")) {
            return [0, "Line1\nLine2\n--More--"];
          }
          return [0, "Router1#"];
        },
      });

      const result = session.execute("show running-config");
      
      expect(result.paging).toBe(true);
    });
  });

  describe("createCliSession", () => {
    it("creates a session with device name and command handler", () => {
      const session = createCliSession("Router1", {
        enterCommand: (cmd: string) => [0, "Router1>"],
      });

      expect(session).toBeInstanceOf(CliSession);
      expect(session.getState().deviceName).toBe("Router1");
    });
  });
});

describe("Command Result Classification", () => {
  describe("isSuccessResult", () => {
    it("returns true for successful results", () => {
      const result: CommandResult = {
        ok: true,
        raw: "Some output",
        status: 0,
      };

      expect(isSuccessResult(result)).toBe(true);
    });

    it("returns false for error results", () => {
      const result: CommandResult = {
        ok: false,
        error: "Command failed",
        raw: "",
        status: 1,
      };

      expect(isSuccessResult(result)).toBe(false);
    });
  });

  describe("isErrorResult", () => {
    it("returns true for error results", () => {
      const result: CommandResult = {
        ok: false,
        error: "Invalid command",
        raw: "",
        status: 1,
      };

      expect(isErrorResult(result)).toBe(true);
    });

    it("returns false for success results", () => {
      const result: CommandResult = {
        ok: true,
        raw: "OK",
        status: 0,
      };

      expect(isErrorResult(result)).toBe(false);
    });
  });

  describe("isPagingResult", () => {
    it("detects paging in output", () => {
      const result: CommandResult = {
        ok: true,
        raw: "interface GigabitEthernet0/0\n Description: Test\n --More--",
        status: 0,
        paging: true,
      };

      expect(isPagingResult(result)).toBe(true);
    });

    it("returns false when no paging", () => {
      const result: CommandResult = {
        ok: true,
        raw: "Simple output",
        status: 0,
      };

      expect(isPagingResult(result)).toBe(false);
    });
  });

  describe("CommandResult structure", () => {
    it("includes required fields", () => {
      const result: CommandResult = {
        ok: true,
        raw: "output",
        status: 0,
      };

      expect(result.ok).toBe(true);
      expect(result.raw).toBe("output");
      expect(result.status).toBe(0);
    });

    it("supports optional parsed field", () => {
      const result: CommandResult = {
        ok: true,
        raw: "output",
        status: 0,
        parsed: { key: "value" },
      };

      expect(result.parsed).toBeDefined();
    });

    it("supports optional error field", () => {
      const result: CommandResult = {
        ok: false,
        error: "Error message",
        raw: "",
        status: 1,
      };

      expect(result.error).toBe("Error message");
    });
  });
});

describe("Mode Transitions", () => {
  describe("ensurePrivileged", () => {
    it("stays in priv-exec if already privileged", async () => {
      const session = new CliSession("Router1", {
        enterCommand: () => [0, "Router1#"],
      });

      session["state"].mode = "priv-exec";
      
      const result = await session.ensurePrivileged();
      
      expect(result).toBe(true);
      expect(session.getState().mode).toBe("priv-exec");
    });

    it("enters priv-exec from user-exec", async () => {
      const session = new CliSession("Router1", {
        enterCommand: (cmd: string) => {
          if (cmd === "enable") {
            return [0, "Router1#"];
          }
          return [0, "Router1>"];
        },
      });

      session["state"].mode = "user-exec";
      
      const result = await session.ensurePrivileged();
      
      expect(result).toBe(true);
      expect(session.getState().mode).toBe("priv-exec");
    });
  });

  describe("ensureConfigMode", () => {
    it("stays in config if already there", async () => {
      const session = new CliSession("Router1", {
        enterCommand: () => [0, "Router1(config)#"],
      });

      session["state"].mode = "config";
      
      const result = await session.ensureConfigMode();
      
      expect(result).toBe(true);
      expect(session.getState().mode).toBe("config");
    });

    it("enters config from priv-exec", async () => {
      const session = new CliSession("Router1", {
        enterCommand: (cmd: string) => {
          if (cmd === "configure terminal") {
            return [0, "Router1(config)#"];
          }
          return [0, "Router1#"];
        },
      });

      session["state"].mode = "priv-exec";
      
      const result = await session.ensureConfigMode();
      
      expect(result).toBe(true);
      expect(session.getState().mode).toBe("config");
    });
  });

  describe("handlePaging", () => {
    it("sends space to continue when paging detected", async () => {
      let spaceSent = false;
      const session = new CliSession("Router1", {
        enterCommand: (cmd: string) => {
          if (cmd === " ") {
            spaceSent = true;
            return [0, "More output\nRouter1#"];
          }
          return [0, "Line1\nLine2\n--More--"];
        },
      });

      session["state"].mode = "priv-exec";
      await session.handlePaging();

      // After handling paging, the state should be back to normal
      expect(session.getState().paging).toBe(false);
    });

    it("sends 'q' to quit paging when needed", async () => {
      let quitSent = false;
      const session = new CliSession("Router1", {
        enterCommand: (cmd: string) => {
          if (cmd === "q") {
            quitSent = true;
            return [0, "Router1#"];
          }
          return [0, "--More--"];
        },
      });

      session["state"].mode = "priv-exec";
      session["state"].paging = true;
      await session.continuePaging();

      expect(quitSent).toBe(true);
    });
  });

  describe("handleConfirmation", () => {
    it("sends enter to confirm by default", async () => {
      let enterSent = false;
      const session = new CliSession("Router1", {
        enterCommand: (cmd: string) => {
          if (cmd === "\n" || cmd === "") {
            enterSent = true;
            return [0, "Router1#"];
          }
          return [0, "[confirm]"];
        },
      });

      session["state"].mode = "config";
      session["state"].awaitingConfirm = true;
      
      await session.handleConfirmation(true);

      expect(enterSent).toBe(true);
    });

    it("sends 'no' to cancel", async () => {
      let noSent = false;
      const session = new CliSession("Router1", {
        enterCommand: (cmd: string) => {
          if (cmd === "no") {
            noSent = true;
            return [0, "Router1(config)#"];
          }
          return [0, "[confirm]"];
        },
      });

      session["state"].mode = "config";
      session["state"].awaitingConfirm = true;
      
      await session.handleConfirmation(false);

      expect(noSent).toBe(true);
    });
  });
});
