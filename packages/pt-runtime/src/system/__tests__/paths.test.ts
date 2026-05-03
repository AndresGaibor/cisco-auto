import { describe, expect, test } from "bun:test";
import { getDefaultDevDir } from "../paths.js";

describe("getDefaultDevDir", () => {
  test("usa PT_DEV_DIR cuando existe", () => {
    const original = process.env.PT_DEV_DIR;
    process.env.PT_DEV_DIR = "/tmp/pt-dev-custom";

    try {
      expect(getDefaultDevDir()).toBe("/tmp/pt-dev-custom");
    } finally {
      process.env.PT_DEV_DIR = original;
    }
  });

  test("normaliza ruta Windows absoluta en host no Windows", () => {
    const original = process.env.PT_DEV_DIR;
    process.env.PT_DEV_DIR = "C:\\Users\\Andres\\pt-dev";

    try {
      expect(getDefaultDevDir()).toBe("C:/Users/Andres/pt-dev");
    } finally {
      process.env.PT_DEV_DIR = original;
    }
  });
});
