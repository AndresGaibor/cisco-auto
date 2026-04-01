// ============================================================================
// DNS Lookup Detection Tests
// ============================================================================

import { describe, test, expect } from "bun:test";
import { classifyOutput } from "../src/domain/ios/session/command-result";
import { inferPromptState, needsResponse, IOS_PROMPT_PATTERNS } from "../src/domain/ios/session/prompt-state";
import { CliSession, createCliSession } from "../src/domain/ios/session/cli-session";

describe("DNS Lookup Detection", () => {
  describe("classifyOutput", () => {
    test("detects 'Translating' as dns-lookup", () => {
      const output = 'Translating "shwo"....domain server (255.255.255.255)';
      const result = classifyOutput(output);
      expect(result.type).toBe("dns-lookup");
    });

    test("detects 'Unknown host or address' as dns-lookup-timeout (DNS failed)", () => {
      const output = `% Unknown host or address, or protocol not running.
Router#`;
      const result = classifyOutput(output);
      expect(result.type).toBe("dns-lookup-timeout");
    });

    test("detects 'domain server' as dns-lookup", () => {
      const output = `Translating "test"...domain server`;
      const result = classifyOutput(output);
      expect(result.type).toBe("dns-lookup");
    });

    test("does not classify normal output as dns-lookup", () => {
      const output = `Router# show version
Cisco IOS Software...`;
      const result = classifyOutput(output);
      expect(result.type).toBe("success");
    });

    test("dns-lookup has higher priority than invalid input", () => {
      const output = `Translating "shwo"....domain server
% Invalid input detected`;
      const result = classifyOutput(output);
      expect(result.type).toBe("dns-lookup");
    });
  });

  describe("inferPromptState", () => {
    test("detects resolving-hostname mode", () => {
      const output = 'Translating "shwo"....domain server (255.255.255.255)';
      const result = inferPromptState(output);
      expect(result.mode).toBe("resolving-hostname");
    });

    test("detects resolving-hostname with unknown host", () => {
      const output = `% Unknown host or address`;
      const result = inferPromptState(output);
      expect(result.mode).toBe("resolving-hostname");
    });
  });

  describe("needsResponse", () => {
    test("returns true for resolving-hostname", () => {
      expect(needsResponse("resolving-hostname")).toBe(true);
    });

    test("returns true for awaiting-password", () => {
      expect(needsResponse("awaiting-password")).toBe(true);
    });

    test("returns true for awaiting-confirm", () => {
      expect(needsResponse("awaiting-confirm")).toBe(true);
    });

    test("returns true for paging", () => {
      expect(needsResponse("paging")).toBe(true);
    });

    test("returns false for user-exec", () => {
      expect(needsResponse("user-exec")).toBe(false);
    });
  });

  describe("IOS_PROMPT_PATTERNS", () => {
    test("resolvingHostname pattern matches 'Translating'", () => {
      expect(IOS_PROMPT_PATTERNS.resolvingHostname.test('Translating "shwo"...')).toBe(true);
    });

    test("resolvingHostname pattern matches 'domain server'", () => {
      expect(IOS_PROMPT_PATTERNS.resolvingHostname.test('domain server (255.255.255.255)')).toBe(true);
    });

    test("resolvingHostname pattern matches 'unknown host'", () => {
      expect(IOS_PROMPT_PATTERNS.resolvingHostname.test('Unknown host or address')).toBe(true);
    });
  });

  describe("CliSession DNS handling", () => {
    test("execute() marks result as awaitingDnsLookup when DNS lookup triggered", async () => {
      const handler = {
        enterCommand: async (cmd: string): Promise<[number, string]> => {
          return [0, 'Translating "shwo"....domain server (255.255.255.255)'];
        },
      };

      const session = createCliSession("Router1", handler);
      const result = await session.execute("shwo");

      expect(result.awaitingDnsLookup).toBe(true);
      expect(result.ok).toBe(false);
      expect(result.classification).toBe("dns-lookup");
      expect(session.getState().mode).toBe("resolving-hostname");
    });

    test("executeAndWait() calls handleDnsLookup() and recovers when prompt returns", async () => {
      let callCount = 0;
      const handler = {
        enterCommand: async (cmd: string): Promise<[number, string]> => {
          callCount++;
          // First call returns DNS lookup, second call returns prompt
          if (callCount === 1) {
            return [0, 'Translating "shwo"....domain server'];
          }
          return [0, "Router#"];
        },
      };

      const session = createCliSession("Router1", handler, { commandTimeout: 1000 });
      const result = await session.executeAndWait("shwo");

      // handleDnsLookup should have recovered the prompt
      expect(session.getState().awaitingDnsLookup).toBe(false);
      expect(session.getState().mode).toBe("priv-exec");
      // Classification stays dns-lookup since it triggered but recovered
      expect(result.classification).toBe("dns-lookup");
    });

    test("session state tracks awaitingDnsLookup", async () => {
      const handler = {
        enterCommand: async (cmd: string): Promise<[number, string]> => {
          return [0, 'Translating "test"....domain server'];
        },
      };

      const session = createCliSession("Router1", handler);
      await session.execute("test");

      expect(session.getState().awaitingDnsLookup).toBe(true);
    });

    test("resyncPrompt() clears DNS lookup state", async () => {
      let callCount = 0;
      const handler = {
        enterCommand: async (cmd: string): Promise<[number, string]> => {
          callCount++;
          if (callCount === 1) {
            return [0, 'Translating "test"....domain server'];
          }
          return [0, "Router#"];
        },
      };

      const session = createCliSession("Router1", handler);
      await session.execute("test");
      
      expect(session.getState().awaitingDnsLookup).toBe(true);

      await session.resyncPrompt();
      
      expect(session.getState().awaitingDnsLookup).toBe(false);
      expect(session.getState().mode).toBe("priv-exec");
    });
  });

  describe("DNS lookup recovery scenarios", () => {
    test("lookup times out when DNS never resolves", async () => {
      let callCount = 0;
      const handler = {
        enterCommand: async (cmd: string): Promise<[number, string]> => {
          callCount++;
          // Always return DNS lookup state - simulates stuck DNS
          return [0, 'Translating "shwo"....domain server (255.255.255.255)'];
        },
      };

      const session = createCliSession("Router1", handler, { commandTimeout: 100 });
      const result = await session.executeAndWait("shwo");

      // After timeout, classification should be dns-lookup-timeout
      expect(result.classification).toBe("dns-lookup-timeout");
      expect(result.ok).toBe(false);
    });

    test("handleDnsLookup recovers when prompt returns", async () => {
      let callCount = 0;
      const handler = {
        enterCommand: async (cmd: string): Promise<[number, string]> => {
          callCount++;
          if (callCount === 1) {
            return [0, 'Translating "shwo"....domain server'];
          }
          // Subsequent calls (from handleDnsLookup polling) return proper prompt
          return [0, "Router#"];
        },
      };

      const session = createCliSession("Router1", handler, { commandTimeout: 5000 });
      const result = await session.executeAndWait("shwo");

      // handleDnsLookup should have recovered the prompt
      expect(session.getState().mode).toBe("priv-exec");
      expect(session.getState().awaitingDnsLookup).toBe(false);
    });
  });
});
