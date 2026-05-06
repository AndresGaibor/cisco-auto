import { describe, expect, test } from "bun:test";
import { PacketTracerPathResolver } from "./packet-tracer-path-resolver.js";

describe("PacketTracerPathResolver", () => {
  const DARWIN_CANDIDATES = [
    "/Applications/Cisco Packet Tracer 9.0.0.app",
    "/Applications/Cisco Packet Tracer 8.2.0.app",
    "/Applications/Cisco Packet Tracer 8.1.0.app",
    "/Applications/Cisco Packet Tracer 8.0.app",
    "/Applications/Cisco Packet Tracer.app",
  ];

  const WINDOWS_CANDIDATES = [
    "C:\\Program Files\\Cisco Packet Tracer 9.0\\PacketTracer.exe",
    "C:\\Program Files\\Cisco Packet Tracer 8.2\\PacketTracer.exe",
    "C:\\Program Files\\Cisco Packet Tracer 8.1\\PacketTracer.exe",
    "C:\\Program Files\\Cisco Packet Tracer 8.0\\PacketTracer.exe",
    "C:\\Program Files\\Cisco Packet Tracer\\PacketTracer.exe",
  ];

  function createDeps(platform: NodeJS.Platform, env: Record<string, string | undefined>, exists: (path: string) => boolean) {
    return { platform, env, exists };
  }

  test("PT_APP_PATH wins en macOS si existe", () => {
    const deps = createDeps(
      "darwin",
      { PT_APP_PATH: "/custom/pt.app" },
      (path) => path === "/custom/pt.app",
    );
    const resolver = new PacketTracerPathResolver(deps);
    const result = resolver.resolve();
    expect(result.source).toBe("env");
    expect(result.selected).toBe("/custom/pt.app");
    expect(result.candidates).toEqual(DARWIN_CANDIDATES);
  });

  test("macOS known paths cuando PT_APP_PATH no existe", () => {
    const deps = createDeps(
      "darwin",
      {},
      (path) => path === "/Applications/Cisco Packet Tracer 9.0.0.app",
    );
    const resolver = new PacketTracerPathResolver(deps);
    const result = resolver.resolve();
    expect(result.source).toBe("known-path");
    expect(result.selected).toBe("/Applications/Cisco Packet Tracer 9.0.0.app");
  });

  test("PT_APP_PATH wins en Windows si existe", () => {
    const deps = createDeps(
      "win32",
      { PT_APP_PATH: "D:\\Apps\\PacketTracer.exe" },
      (path) => path === "D:\\Apps\\PacketTracer.exe",
    );
    const resolver = new PacketTracerPathResolver(deps);
    const result = resolver.resolve();
    expect(result.source).toBe("env");
    expect(result.selected).toBe("D:\\Apps\\PacketTracer.exe");
    expect(result.candidates).toEqual(WINDOWS_CANDIDATES);
  });

  test("Windows known paths cuando PT_APP_PATH no existe", () => {
    const deps = createDeps(
      "win32",
      {},
      (path) => path === "C:\\Program Files\\Cisco Packet Tracer 8.2\\PacketTracer.exe",
    );
    const resolver = new PacketTracerPathResolver(deps);
    const result = resolver.resolve();
    expect(result.source).toBe("known-path");
    expect(result.selected).toBe("C:\\Program Files\\Cisco Packet Tracer 8.2\\PacketTracer.exe");
  });

  test("fallback cuando ningún path existe", () => {
    const deps = createDeps("darwin", {}, () => false);
    const resolver = new PacketTracerPathResolver(deps);
    const result = resolver.resolve();
    expect(result.source).toBe("fallback");
    expect(result.selected).toBeNull();
    expect(result.candidates).toEqual(DARWIN_CANDIDATES);
  });

  test("ignora PT_APP_PATH si no existe el archivo y ningún known-path existe", () => {
    const deps = createDeps(
      "darwin",
      { PT_APP_PATH: "/missing/path.app" },
      () => false,
    );
    const resolver = new PacketTracerPathResolver(deps);
    const result = resolver.resolve();
    expect(result.source).toBe("fallback");
    expect(result.selected).toBeNull();
  });

  test("ignora PT_APP_PATH si no existe pero existe known-path", () => {
    const deps = createDeps(
      "darwin",
      { PT_APP_PATH: "/missing/path.app" },
      (path) => path === "/Applications/Cisco Packet Tracer 9.0.0.app",
    );
    const resolver = new PacketTracerPathResolver(deps);
    const result = resolver.resolve();
    expect(result.source).toBe("known-path");
    expect(result.selected).toBe("/Applications/Cisco Packet Tracer 9.0.0.app");
  });
});