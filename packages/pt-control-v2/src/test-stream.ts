import { FastEventStream } from "./infrastructure/pt/fast-event-stream.js";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { writeFileSync } from "node:fs";

const EVENTS_FILE = resolve(process.env.HOME ?? homedir(), "pt-dev/events.ndjson");

console.log("🚀 Testing FastEventStream on:", EVENTS_FILE);

const stream = new FastEventStream(EVENTS_FILE);

stream.on("event", (evt) => {
  console.log("📥 Received Event:", evt.type, evt.id || "");
  if (evt.type === "result") {
    console.log("   Value:", JSON.stringify(evt.value || (evt as any).res || (evt as any).data || evt));
  }
});

stream.on("error", (err) => console.error("❌ Stream Error:", err));
stream.on("warn", (msg) => console.warn("⚠️ Stream Warning:", msg));

stream.start();

console.log("📡 Watching for events... (Press Ctrl+C to stop)");

// Keep process alive
process.stdin.resume();
