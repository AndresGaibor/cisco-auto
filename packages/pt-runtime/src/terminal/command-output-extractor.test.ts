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
});
