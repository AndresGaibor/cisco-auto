import { describe, expect, test } from "bun:test";
import { sha256Buffer, stableJsonHash, normalizeIosConfig, normalizeDeviceXml } from "../protocol/hashes.js";

describe("sha256Buffer", () => {
  test("produce hash consistente para mismo input", () => {
    const a = sha256Buffer(Buffer.from("hello"));
    const b = sha256Buffer(Buffer.from("hello"));
    expect(a).toBe(b);
  });

  test("produce hash diferente para distinto input", () => {
    const a = sha256Buffer(Buffer.from("hello"));
    const b = sha256Buffer(Buffer.from("world"));
    expect(a).not.toBe(b);
  });
});

describe("stableJsonHash", () => {
  test("mismo objeto sin importar orden de keys", () => {
    const a = stableJsonHash({ b: 2, a: 1 });
    const b = stableJsonHash({ a: 1, b: 2 });
    expect(a).toBe(b);
  });

  test("objetos diferentes producen hash diferente", () => {
    const a = stableJsonHash({ x: 1 });
    const b = stableJsonHash({ x: 2 });
    expect(a).not.toBe(b);
  });
});

describe("normalizeIosConfig", () => {
  test("elimina prompts de IOS", () => {
    const input = "Router>enable\nRouter#show run\nBuilding configuration...\n!";
    const result = normalizeIosConfig(input);
    expect(result).not.toContain("Router>");
    expect(result).not.toContain("Router#");
  });

  test("elimina lineas de comentario IOS", () => {
    const input = "!\ninterface GigabitEthernet0/0\n!\nip address 192.168.1.1 255.255.255.0\n!";
    const result = normalizeIosConfig(input);
    expect(result).not.toContain("!");
  });

  test("normaliza CRLF a LF", () => {
    const input = "hostname R1\r\ninterface g0/0\r\n";
    const result = normalizeIosConfig(input);
    expect(result).not.toContain("\r");
  });

  test("normalizacion consistente", () => {
    const a = normalizeIosConfig("hostname R1\ninterface g0/0\n");
    const b = normalizeIosConfig("hostname R1\r\ninterface g0/0\r\n");
    expect(a).toBe(b);
  });
});

describe("normalizeDeviceXml", () => {
  test("elimina espacios entre tags", () => {
    const input = "<root>\n  <item>val</item>\n</root>";
    const result = normalizeDeviceXml(input);
    expect(result).not.toContain("\n");
  });

  test("normalizacion consistente", () => {
    const a = normalizeDeviceXml("<root>  <item>x</item>  </root>");
    const b = normalizeDeviceXml("<root><item>x</item></root>");
    expect(a).toBe(b);
  });
});
