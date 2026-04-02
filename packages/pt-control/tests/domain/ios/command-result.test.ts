import { describe, test, expect } from "bun:test";
import {
  classifyOutput,
  createSuccessResult,
  createErrorResult,
  isSuccessResult,
  isErrorResult,
  isPagingResult,
  isConfirmPrompt,
  isPasswordPrompt,
} from "@cisco-auto/ios-domain";

describe("classifyOutput", () => {
  describe("success classification", () => {
    test("classifies clean output as success", () => {
      const result = classifyOutput("Router# show version\nCisco IOS Software...");
      expect(result.type).toBe("success");
    });

    test("classifies output ending with prompt as success", () => {
      const result = classifyOutput("Interface Status\nRouter#");
      expect(result.type).toBe("success");
    });
  });

  describe("error classifications", () => {
    test("classifies '% Invalid input detected' as invalid", () => {
      const output = "% Invalid input detected at '^' marker.";
      const result = classifyOutput(output);
      expect(result.type).toBe("invalid");
      expect(result.message).toContain("Invalid input");
    });

    test("classifies '% Incomplete command' as incomplete", () => {
      const output = "% Incomplete command.";
      const result = classifyOutput(output);
      expect(result.type).toBe("incomplete");
    });

    test("classifies '% Ambiguous command' as ambiguous", () => {
      const output = "% Ambiguous command.";
      const result = classifyOutput(output);
      expect(result.type).toBe("ambiguous");
    });

    test("classifies '% Interface does not exist' as interface-not-found", () => {
      const output = "% Interface GigabitEthernet0/1 does not exist";
      const result = classifyOutput(output);
      expect(result.type).toBe("interface-not-found");
    });

    test("classifies '% Invalid network mask' as mask-invalid", () => {
      const output = "% Invalid network mask";
      const result = classifyOutput(output);
      expect(result.type).toBe("mask-invalid");
    });

    test("classifies '% Duplicate address' as ip-conflict", () => {
      const output = "% Duplicate address";
      const result = classifyOutput(output);
      expect(result.type).toBe("ip-conflict");
    });

    test("classifies '% Permission denied' as permission-denied", () => {
      const output = "% Permission denied";
      const result = classifyOutput(output);
      expect(result.type).toBe("permission-denied");
    });

    test("classifies '% Not in enable mode' as permission-denied", () => {
      const output = "% Not in enable mode";
      const result = classifyOutput(output);
      expect(result.type).toBe("permission-denied");
    });
  });

  describe("DNS lookup classification", () => {
    test("classifies 'Translating...' as dns-lookup", () => {
      const output = 'Translating "shwo"....domain server (255.255.255.255)';
      const result = classifyOutput(output);
      expect(result.type).toBe("dns-lookup");
    });

    test("classifies 'Unknown host or address' as dns-lookup-timeout", () => {
      const output = "% Unknown host or address, or protocol not running.";
      const result = classifyOutput(output);
      expect(result.type).toBe("dns-lookup-timeout");
    });
  });

  describe("interactive prompt classification", () => {
    test("classifies '[confirm]' as confirmation-required", () => {
      const output = "[confirm]";
      const result = classifyOutput(output);
      expect(result.type).toBe("confirmation-required");
    });

    test("classifies 'Destination filename [' as copy-destination", () => {
      const output = "Destination filename [startup-config]?";
      const result = classifyOutput(output);
      expect(result.type).toBe("copy-destination");
    });

    test("classifies 'Proceed with reload? [confirm]' as reload-confirm", () => {
      const output = "Proceed with reload? [confirm]";
      const result = classifyOutput(output);
      expect(result.type).toBe("reload-confirm");
    });

    test("classifies 'Delete filename [' as erase-confirm", () => {
      const output = "Delete filename [startup-config]?";
      const result = classifyOutput(output);
      expect(result.type).toBe("erase-confirm");
    });
  });

  describe("paging classification", () => {
    test("classifies output with --More-- as paging", () => {
      const output = "Interface Status\n--More--\nRouter#";
      const result = classifyOutput(output);
      expect(result.type).toBe("paging");
    });
  });

  describe("syslog filtering", () => {
    test("does not treat SYS-5-CONFIG_I as error", () => {
      const output = "%SYS-5-CONFIG_I: Configure from console";
      const result = classifyOutput(output);
      expect(result.type).toBe("success");
    });

    test("does not treat LINEPROTO-5-UPDOWN as error", () => {
      const output = "%LINEPROTO-5-UPDOWN: Line protocol on interface";
      const result = classifyOutput(output);
      expect(result.type).toBe("success");
    });
  });
});

describe("createSuccessResult", () => {
  test("creates success result with ok=true", () => {
    const result = createSuccessResult("Router# show version\nIOS 15.0");
    expect(result.ok).toBe(true);
    expect(result.raw).toBe("Router# show version\nIOS 15.0");
    expect(result.status).toBe(0);
  });

  test("marks paging when output contains --More--", () => {
    const result = createSuccessResult("Output\n--More--");
    expect(result.paging).toBe(true);
  });

  test("creates result with parsed data", () => {
    const parsed = { interfaces: [] };
    const result = createSuccessResult("raw output", 0, parsed);
    expect(result.parsed).toEqual(parsed);
  });
});

describe("createErrorResult", () => {
  test("creates error result with ok=false", () => {
    const result = createErrorResult("Command failed", "raw output", 1);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Command failed");
    expect(result.raw).toBe("raw output");
    expect(result.status).toBe(1);
  });

  test("defaults status to 1", () => {
    const result = createErrorResult("Error");
    expect(result.status).toBe(1);
  });
});

describe("isSuccessResult", () => {
  test("returns true for success result", () => {
    const result = createSuccessResult("output");
    expect(isSuccessResult(result)).toBe(true);
  });

  test("returns false for error result", () => {
    const result = createErrorResult("error");
    expect(isSuccessResult(result)).toBe(false);
  });
});

describe("isErrorResult", () => {
  test("returns true for error result", () => {
    const result = createErrorResult("error");
    expect(isErrorResult(result)).toBe(true);
  });

  test("returns false for success result", () => {
    const result = createSuccessResult("output");
    expect(isErrorResult(result)).toBe(false);
  });
});

describe("isPagingResult", () => {
  test("returns true when paging flag is set", () => {
    const result = createSuccessResult("output");
    result.paging = true;
    expect(isPagingResult(result)).toBe(true);
  });

  test("returns true when raw contains --More--", () => {
    const result = createSuccessResult("output\n--More--");
    expect(isPagingResult(result)).toBe(true);
  });

  test("returns false for clean output", () => {
    const result = createSuccessResult("Router# show version");
    expect(isPagingResult(result)).toBe(false);
  });
});

describe("isConfirmPrompt", () => {
  test("returns true when awaitingConfirm flag is set", () => {
    const result = createSuccessResult("output");
    result.awaitingConfirm = true;
    expect(isConfirmPrompt(result)).toBe(true);
  });

  test("returns true when raw contains [confirm]", () => {
    const result = createSuccessResult("[confirm]");
    expect(isConfirmPrompt(result)).toBe(true);
  });

  test("returns false for normal output", () => {
    const result = createSuccessResult("Router# show version");
    expect(isConfirmPrompt(result)).toBe(false);
  });
});

describe("isPasswordPrompt", () => {
  test("returns true for password output", () => {
    const result = createSuccessResult("Password:");
    expect(isPasswordPrompt(result)).toBe(true);
  });

  test("is case insensitive", () => {
    const result = createSuccessResult("PASSWORD:");
    expect(isPasswordPrompt(result)).toBe(true);
  });

  test("returns false for normal output", () => {
    const result = createSuccessResult("Router#");
    expect(isPasswordPrompt(result)).toBe(false);
  });
});
