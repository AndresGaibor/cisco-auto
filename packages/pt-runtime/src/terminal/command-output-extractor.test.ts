import { describe, expect, test } from "bun:test";

import { extractCommandOutput } from "./command-output-extractor.js";

describe("extractCommandOutput", () => {
  test("elimina eco, syslog y prompt de la salida IOS limpia", () => {
    const result = extractCommandOutput({
      command: "show version",
      sessionKind: "ios",
      promptBefore: "Router#",
      promptAfter: "Router#",
      eventOutput: [
        "show version",
        "Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.2",
        "%LINK-3-UPDOWN: Interface GigabitEthernet0/1, changed state to up",
        "Router#",
      ].join("\n"),
      snapshotDelta: "",
      commandEndedSeen: true,
      outputEventsCount: 1,
    });

    expect(result.output).toBe(
      "Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.2",
    );
    expect(result.raw).toContain("%LINK-3-UPDOWN");
  });

  test("usa solo el último bloque cuando eventOutput trae dos ejecuciones del mismo comando", () => {
    const result = extractCommandOutput({
      command: "show version",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST>",
      promptAfter: "SW-SRV-DIST>",
      eventOutput: [
        "SW-SRV-DIST>show version",
        "OLD VERSION OUTPUT",
        "SW-SRV-DIST>",
        "SW-SRV-DIS  show version",
        "NEW VERSION OUTPUT",
        "SW-SRV-DIST>",
      ].join("\n"),
      snapshotDelta: "",
      commandEndedSeen: true,
    });

    expect(result.raw).toContain("NEW VERSION OUTPUT");
    expect(result.raw).not.toContain("OLD VERSION OUTPUT");
    expect(result.output).toContain("NEW VERSION OUTPUT");
    expect(result.output).not.toContain("OLD VERSION OUTPUT");
  });

  test("puede cortar snapshotDelta cuando eventOutput no trae bloque confiable", () => {
    const result = extractCommandOutput({
      command: "show running-config",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST#",
      promptAfter: "SW-SRV-DIST#",
      eventOutput: "",
      snapshotDelta: [
        "SW-SRV-DIST#show running-config",
        "OLD CONFIG",
        "SW-SRV-DIST#",
        "SW-SRV-DIST#  show running-config",
        "NEW CONFIG",
        "SW-SRV-DIST#",
      ].join("\n"),
      commandEndedSeen: true,
    });

    expect(result.raw).toContain("NEW CONFIG");
    expect(result.raw).not.toContain("OLD CONFIG");
    expect(result.output).toContain("NEW CONFIG");
    expect(result.output).not.toContain("OLD CONFIG");
  });

  test("prefiere snapshot-after-sliced sobre output crudo con error IOS stale", () => {
    const staleEventOutput = [
      "SW-SRV-DIST(config-if-range)#channel-group 7 mode active",
      "                                           ^",
      "% Invalid input detected at '^' marker.",
      "SW-SRV-DIST(config-if-range)#end",
      "SW-SRV-DIST#",
    ].join("\n");

    const snapshotAfterRaw = [
      "SW-SRV-DIST(config-if-range)#channel-group 7 mode active",
      "                                           ^",
      "% Invalid input detected at '^' marker.",
      "SW-SRV-DIST(config-if-range)#end",
      "SW-SRV-DIST#",
      "SW-SRV-DIST#show version",
      "Cisco IOS Software, C2960 Software",
      "Configuration register is 0xF",
      "SW-SRV-DIST#",
    ].join("\n");

    const result = extractCommandOutput({
      command: "show version",
      sessionKind: "ios",
      promptBefore: "SW-SRV-DIST#",
      promptAfter: "SW-SRV-DIST#",
      eventOutput: staleEventOutput,
      snapshotDelta: "",
      snapshotAfter: {
        raw: snapshotAfterRaw,
        source: "test",
      },
      commandEndedSeen: true,
      outputEventsCount: 1,
    });

    expect(result.source).toBe("snapshot-after-sliced (test)");
    expect(result.raw).toContain("SW-SRV-DIST#show version");
    expect(result.raw).toContain("Cisco IOS Software");
    expect(result.raw).not.toContain("channel-group 7 mode active");
    expect(result.output).toContain("Cisco IOS Software");
    expect(result.output).not.toContain("% Invalid input detected");
  });
});
