import { describe, expect, test } from "bun:test";
import {
  detectDnsLookup,
  detectErasePrompt,
  detectHostBusy,
  detectReloadPrompt,
  sanitizeOutput,
  sanitizeTerminalText,
} from "../terminal/prompt-detector";

describe("prompt-detector", () => {
  test("mantiene la sanidad pública de terminal y output", () => {
    const input = " \u001b[31mRouter\u001b[0m\r\nshow ";

    expect(sanitizeTerminalText(input)).toBe("Router\nshow");
    expect(sanitizeOutput(input)).toBe(" Router\nshow ");
  });

  test("detecta prompts comunes con normalización compartida", () => {
    expect(detectReloadPrompt("Proceed with reload? [confirm]")).toBe(true);
    expect(detectErasePrompt("Erase filename [startup-config]? [confirm]")).toBe(true);
    expect(detectDnsLookup("Translating 'shwo'....domain server (255.255.255.255)")).toBe(true);
    expect(detectHostBusy("Reply from 192.0.2.1: bytes=32 time<1ms")).toBe(true);
  });
});
