import { describe, expect, test } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { formatDevDirForDisplay, getDefaultDevDir, normalizeHostPath } from "./paths.js";

describe("formatDevDirForDisplay", () => {
  test("muestra ~/pt-dev en macOS/Linux con ruta por defecto", () => {
    expect(formatDevDirForDisplay(join(homedir(), "pt-dev"))).toBe("~/pt-dev");
  });

  test("muestra la ruta custom tal cual", () => {
    expect(formatDevDirForDisplay("/tmp/pt-dev-custom")).toBe("/tmp/pt-dev-custom");
  });

  test("normaliza PT_DEV_DIR Windows en host POSIX", () => {
    expect(normalizeHostPath("C:\\Users\\Andres\\pt-dev\\")).toBe("C:/Users/Andres/pt-dev");
  });

  test("getDefaultDevDir normaliza PT_DEV_DIR", () => {
    const original = process.env.PT_DEV_DIR;
    process.env.PT_DEV_DIR = "C:\\Users\\Andres\\pt-dev\\";

    try {
      expect(getDefaultDevDir()).toBe("C:/Users/Andres/pt-dev");
    } finally {
      process.env.PT_DEV_DIR = original;
    }
  });

  test("muestra %USERPROFILE%\\pt-dev en Windows cuando coincide", () => {
    const originalPlatform = process.platform;
    const originalUserProfile = process.env.USERPROFILE;

    Object.defineProperty(process, "platform", { value: "win32" });
    process.env.USERPROFILE = "C:\\Users\\Andres";

    try {
      expect(formatDevDirForDisplay("C:\\Users\\Andres\\pt-dev")).toBe("%USERPROFILE%\\pt-dev");
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
      process.env.USERPROFILE = originalUserProfile;
    }
  });
});
