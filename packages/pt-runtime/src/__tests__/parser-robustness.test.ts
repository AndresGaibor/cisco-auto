import { test, expect } from "bun:test";
import { generateParserCode } from "../utils/parser-generator.js";

test("show ip interface brief tolerates irregular spacing", () => {
  const code = generateParserCode();
  // Evaluate the generated parser code and get __getParser
  const getParser = new Function(code + '\nreturn __getParser;')();
  const parser = getParser('show ip interface brief');
  expect(typeof parser).toBe('function');

  const sample = `Interface              IP-Address      OK? Method Status                Protocol\nGigabitEthernet0/0    192.168.1.1     YES manual up                    up`;
  const out = parser(sample);
  expect(out).toBeTruthy();
  expect(Array.isArray(out.entries)).toBe(true);
  expect(out.entries.length).toBeGreaterThan(0);
  expect(out.entries[0].interface).toBeDefined();
  expect(out.entries[0].ipAddress).toBeDefined();
});

test("show vlan brief parses multiple ports and irregular spacing", () => {
  const code = generateParserCode();
  const getParser = new Function(code + '\nreturn __getParser;')();
  const parser = getParser('show vlan brief');

  const sample = `VLAN Name                             Status    Ports\n10   ADMIN                            active    Gi0/1, Gi0/2\n20   USERS                            active`;
  const out = parser(sample);
  expect(out.entries.length).toBeGreaterThan(0);
  const vlan10 = out.entries.find((v: any) => v.id === 10);
  expect(vlan10).toBeTruthy();
  expect(Array.isArray(vlan10.ports)).toBe(true);
});
