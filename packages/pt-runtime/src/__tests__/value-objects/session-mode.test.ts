// ============================================================================
// SessionMode Value Object Tests
// ============================================================================

import { describe, it, expect } from "bun:test";
import {
  SessionMode,
  parseSessionMode,
  inferSessionMode,
  isValidSessionMode,
  type IosMode,
} from "../../value-objects/session-mode";

describe("SessionMode", () => {
  describe("constructor", () => {
    it("should create valid session modes", () => {
      const mode = new SessionMode("user-exec");
      expect(mode.value).toBe("user-exec");
    });

    it("should accept all valid modes", () => {
      const validModes: IosMode[] = [
        'user-exec', 'priv-exec', 'config', 'config-if',
        'config-line', 'config-router', 'config-vlan', 'config-subif',
        'rommon', 'unknown'
      ];
      
      validModes.forEach(mode => {
        expect(() => new SessionMode(mode)).not.toThrow();
      });
    });

    it("should reject invalid modes", () => {
      expect(() => new SessionMode("invalid" as IosMode)).toThrow("Invalid session mode");
    });
  });

  describe("type guards", () => {
    it("should identify ROMMON mode", () => {
      expect(new SessionMode('rommon').isRommon).toBe(true);
      expect(new SessionMode('user-exec').isRommon).toBe(false);
    });

    it("should identify unknown mode", () => {
      expect(new SessionMode('unknown').isUnknown).toBe(true);
    });

    it("should identify exec modes", () => {
      expect(new SessionMode('user-exec').isExecMode).toBe(true);
      expect(new SessionMode('priv-exec').isExecMode).toBe(true);
      expect(new SessionMode('config').isExecMode).toBe(false);
    });

    it("should identify config modes", () => {
      expect(new SessionMode('config').isConfigMode).toBe(true);
      expect(new SessionMode('config-if').isConfigMode).toBe(true);
      expect(new SessionMode('config-router').isConfigMode).toBe(true);
      expect(new SessionMode('user-exec').isConfigMode).toBe(false);
    });

    it("should identify privileged mode", () => {
      expect(new SessionMode('priv-exec').isPrivileged).toBe(true);
      expect(new SessionMode('user-exec').isPrivileged).toBe(false);
    });

    it("should identify user exec mode", () => {
      expect(new SessionMode('user-exec').isUserExec).toBe(true);
      expect(new SessionMode('priv-exec').isUserExec).toBe(false);
    });
  });

  describe("capability checks", () => {
    it("should check if can configure", () => {
      expect(new SessionMode('config').canConfigure).toBe(true);
      expect(new SessionMode('config-if').canConfigure).toBe(true);
      expect(new SessionMode('priv-exec').canConfigure).toBe(false);
    });

    it("should check if can execute privileged commands", () => {
      expect(new SessionMode('priv-exec').canExecutePrivileged).toBe(true);
      expect(new SessionMode('config').canExecutePrivileged).toBe(true);
      expect(new SessionMode('user-exec').canExecutePrivileged).toBe(false);
    });
  });

  describe("promptSuffix", () => {
    it("should return correct prompt suffix", () => {
      expect(new SessionMode('user-exec').promptSuffix).toBe('>');
      expect(new SessionMode('priv-exec').promptSuffix).toBe('#');
      expect(new SessionMode('config').promptSuffix).toBe('(config)#');
      expect(new SessionMode('config-if').promptSuffix).toBe('(config-if)#');
      expect(new SessionMode('config-router').promptSuffix).toBe('(config-router)#');
    });
  });

  describe("getTransitionCommand", () => {
    it("should return null for same mode", () => {
      const mode = new SessionMode('priv-exec');
      expect(mode.getTransitionCommand(mode)).toBeNull();
    });

    it("should return disable for priv-exec to user-exec", () => {
      const from = new SessionMode('priv-exec');
      const to = new SessionMode('user-exec');
      expect(to.getTransitionCommand(from)).toBe('disable');
    });

    it("should return enable for user-exec to priv-exec", () => {
      const from = new SessionMode('user-exec');
      const to = new SessionMode('priv-exec');
      expect(to.getTransitionCommand(from)).toBe('enable');
    });

    it("should return configure terminal for priv-exec to config", () => {
      const from = new SessionMode('priv-exec');
      const to = new SessionMode('config');
      expect(to.getTransitionCommand(from)).toBe('configure terminal');
    });

    it("should return end for config to priv-exec", () => {
      const from = new SessionMode('config');
      const to = new SessionMode('priv-exec');
      expect(to.getTransitionCommand(from)).toBe('end');
    });

    it("should return null for unknown mode", () => {
      const from = new SessionMode('unknown');
      const to = new SessionMode('priv-exec');
      expect(to.getTransitionCommand(from)).toBeNull();
    });
  });

  describe("hierarchy comparison", () => {
    it("should check if mode is higher than another", () => {
      const priv = new SessionMode('priv-exec');
      const user = new SessionMode('user-exec');
      
      expect(priv.isHigherThan(user)).toBe(true);
      expect(user.isHigherThan(priv)).toBe(false);
    });

    it("should check if mode is lower than another", () => {
      const config = new SessionMode('config');
      const priv = new SessionMode('priv-exec');
      
      expect(config.isLowerThan(priv)).toBe(false);
      expect(priv.isLowerThan(config)).toBe(true);
    });

    it("should check if mode is equal or higher", () => {
      const mode1 = new SessionMode('priv-exec');
      const mode2 = new SessionMode('priv-exec');
      const mode3 = new SessionMode('user-exec');
      
      expect(mode1.isEqualOrHigherThan(mode2)).toBe(true);
      expect(mode1.isEqualOrHigherThan(mode3)).toBe(true);
    });
  });

  describe("fromPrompt", () => {
    it("should infer user-exec mode", () => {
      const mode = SessionMode.fromPrompt("Router>");
      expect(mode.value).toBe("user-exec");
    });

    it("should infer priv-exec mode", () => {
      const mode = SessionMode.fromPrompt("Router#");
      expect(mode.value).toBe("priv-exec");
    });

    it("should infer config mode", () => {
      const mode = SessionMode.fromPrompt("Router(config)#");
      expect(mode.value).toBe("config");
    });

    it("should infer config-if mode", () => {
      const mode = SessionMode.fromPrompt("Router(config-if)#");
      expect(mode.value).toBe("config-if");
    });

    it("should infer config-router mode", () => {
      const mode = SessionMode.fromPrompt("Router(config-router)#");
      expect(mode.value).toBe("config-router");
    });

    it("should infer rommon mode", () => {
      const mode = SessionMode.fromPrompt("rommon 1 >");
      expect(mode.value).toBe("rommon");
    });

    it("should infer unknown mode for unrecognized prompts", () => {
      const mode = SessionMode.fromPrompt("Some random text");
      expect(mode.value).toBe("unknown");
    });
  });

  describe("equals", () => {
    it("should compare equality", () => {
      const mode1 = new SessionMode("priv-exec");
      const mode2 = new SessionMode("priv-exec");
      const mode3 = new SessionMode("user-exec");

      expect(mode1.equals(mode2)).toBe(true);
      expect(mode1.equals(mode3)).toBe(false);
    });
  });

  describe("toJSON/fromJSON", () => {
    it("should serialize and deserialize", () => {
      const mode = new SessionMode("config-if");
      const json = mode.toJSON();
      expect(json).toBe("config-if");

      const restored = SessionMode.fromJSON(json);
      expect(restored.equals(mode)).toBe(true);
    });
  });
});

describe("parseSessionMode", () => {
  it("should parse valid modes", () => {
    const mode = parseSessionMode("priv-exec");
    expect(mode.value).toBe("priv-exec");
  });

  it("should throw for invalid modes", () => {
    expect(() => parseSessionMode("invalid")).toThrow();
  });
});

describe("inferSessionMode", () => {
  it("should infer mode from prompt", () => {
    expect(inferSessionMode("Router#").value).toBe("priv-exec");
    expect(inferSessionMode("Switch(config)#").value).toBe("config");
  });
});

describe("isValidSessionMode", () => {
  it("should return true for valid modes", () => {
    expect(isValidSessionMode("user-exec")).toBe(true);
    expect(isValidSessionMode("priv-exec")).toBe(true);
    expect(isValidSessionMode("config-if")).toBe(true);
  });

  it("should return false for invalid modes", () => {
    expect(isValidSessionMode("invalid")).toBe(false);
    expect(isValidSessionMode("")).toBe(false);
  });
});
