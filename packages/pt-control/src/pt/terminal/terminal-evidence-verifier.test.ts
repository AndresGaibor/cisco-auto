import { describe, it, expect } from "bun:test";
import { verifyTerminalEvidence } from "./terminal-evidence-verifier.js";
import { parseTerminalOutput } from "./terminal-output-parsers.js";

describe("terminal-evidence-verifier", () => {
  describe("host.ping", () => {
    it("debe dar veredicto OK para ping con 0% pérdida", () => {
      const raw = "Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)";
      const parsed = parseTerminalOutput("host.ping", raw);
      const verdict = verifyTerminalEvidence("host.ping", raw, parsed, 0);
      
      expect(verdict.ok).toBe(true);
      expect(verdict.confidence).toBe(1);
    });

    it("debe dar veredicto OK con warnings para pérdida parcial (25%)", () => {
      const raw = "Packets: Sent = 4, Received = 3, Lost = 1 (25% loss)\nReply from 1.1.1.1...";
      const parsed = parseTerminalOutput("host.ping", raw);
      const verdict = verifyTerminalEvidence("host.ping", raw, parsed, 0);
      
      expect(verdict.ok).toBe(true);
      expect(verdict.warnings.some(w => w.includes("25%"))).toBe(true);
      expect(verdict.confidence).toBe(0.8);
    });

    it("debe dar veredicto FAIL para pérdida total (100%)", () => {
      const raw = "Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)";
      const parsed = parseTerminalOutput("host.ping", raw);
      const verdict = verifyTerminalEvidence("host.ping", raw, parsed, 0);
      
      expect(verdict.ok).toBe(false);
      expect(verdict.reason).toContain("100% pérdida");
    });
  });

  describe("host.tracert", () => {
    it("debe dar veredicto OK si hay 'Trace complete'", () => {
      const raw = "1  1ms  1.1.1.1\nTrace complete.";
      const parsed = parseTerminalOutput("host.tracert", raw);
      const verdict = verifyTerminalEvidence("host.tracert", raw, parsed, 0);
      
      expect(verdict.ok).toBe(true);
    });

    it("debe dar veredicto FAIL si no hay 'Trace complete'", () => {
      const raw = "1  1ms  1.1.1.1\n...";
      const parsed = parseTerminalOutput("host.tracert", raw);
      const verdict = verifyTerminalEvidence("host.tracert", raw, parsed, 0);
      
      expect(verdict.ok).toBe(false);
      expect(verdict.warnings).toContain("Tracert no finalizó con 'Trace complete'");
    });
  });

  describe("host.nslookup", () => {
    it("debe dar veredicto OK para resolución exitosa", () => {
      const raw = "Server: 8.8.8.8\nAddress: 8.8.8.8\n\nName: google.com\nAddress: 1.2.3.4";
      const parsed = parseTerminalOutput("host.nslookup", raw);
      const verdict = verifyTerminalEvidence("host.nslookup", raw, parsed, 0);
      expect(verdict.ok).toBe(true);
    });

    it("debe dar veredicto FAIL para Non-existent domain", () => {
      const raw = "Server: 8.8.8.8\n*** google.com can't find invalid: Non-existent domain";
      const parsed = parseTerminalOutput("host.nslookup", raw);
      const verdict = verifyTerminalEvidence("host.nslookup", raw, parsed, 0);
      expect(verdict.ok).toBe(false);
      expect(verdict.reason).toBe("Nombre no encontrado");
    });
  });

  describe("host.netstat", () => {
    it("debe dar veredicto OK si hay conexiones", () => {
      const raw = "Proto  Local Address          Foreign Address        State\nTCP    1.1.1.1:1025      2.2.2.2:80         ESTABLISHED";
      const parsed = parseTerminalOutput("host.netstat", raw);
      const verdict = verifyTerminalEvidence("host.netstat", raw, parsed, 0);
      expect(verdict.ok).toBe(true);
      expect(verdict.semanticSuccess).toBe(true);
    });
  });

  describe("host.telnet / host.ssh", () => {
    it("debe dar veredicto OK si se recibe el prompt de Password", () => {
      const raw = "Trying 192.168.1.1...\nConnected to 192.168.1.1.\nUser Access Verification\n\nPassword:";
      const verdict = verifyTerminalEvidence("host.telnet", raw, null, 0);
      expect(verdict.ok).toBe(true);
    });

    it("debe dar veredicto FAIL si hay connection refused", () => {
      const raw = "Connecting to 192.168.1.1...Connection closed by foreign host";
      const verdict = verifyTerminalEvidence("host.telnet", raw, null, 0);
      expect(verdict.ok).toBe(false);
    });
  });
});
