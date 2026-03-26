import { createDefaultPTController } from "../controller/index.js";
import { summarizeEvents, tailEvents } from "../tools/event-log.js";
import type { PTEvent } from "../types/index.js";

type LogMode = "tail" | "errors" | "summary";

function isErrorLikeEvent(event: PTEvent): boolean {
  return event.type === "error" || (event.type === "log" && event.level === "error");
}

function parseLimit(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString();
}

function formatEvent(event: PTEvent): string {
  const timestamp = formatTimestamp(event.ts);

  if (event.type === "error") {
    const details = [event.id ? `id=${event.id}` : null, event.message]
      .filter(Boolean)
      .join(" ");
    return `[${timestamp}] ERROR ${details}`;
  }

  if (event.type === "log") {
    return `[${timestamp}] ${event.level.toUpperCase()} ${event.message}`;
  }

  const meta: string[] = [];

  if ("id" in event && event.id) {
    meta.push(`id=${event.id}`);
  }

  if ("device" in event && typeof event.device === "string") {
    meta.push(`device=${event.device}`);
  }

  if ("ok" in event && event.ok !== undefined) {
    meta.push(`ok=${event.ok}`);
  }

  return `[${timestamp}] ${event.type}${meta.length ? ` (${meta.join(" ")})` : ""}`;
}

function selectMode(subcommand: string | undefined, options: Record<string, unknown>): { mode: LogMode; follow: boolean } {
  const normalized = (subcommand || "").toLowerCase();
  const follow = normalized === "follow" || normalized === "stream" || !!options["follow"];

  if (normalized === "summary") {
    return { mode: "summary", follow: false };
  }

  if (normalized === "errors") {
    return { mode: "errors", follow };
  }

  return { mode: "tail", follow };
}

function filterEvents(events: PTEvent[], mode: LogMode): PTEvent[] {
  if (mode === "errors") {
    return events.filter(isErrorLikeEvent);
  }

  return events;
}

async function followEvents(controller: ReturnType<typeof createDefaultPTController>, mode: LogMode): Promise<void> {
  const unsubscribe = controller.onAll((event) => {
    if (!isRelevant(event, mode)) {
      return;
    }

    console.log(formatEvent(event));
  });

  await new Promise<void>((resolve) => {
    const onSigint = () => {
      process.off("SIGINT", onSigint);
      unsubscribe();
      resolve();
    };

    process.once("SIGINT", onSigint);
  });
}

function isRelevant(event: PTEvent, mode: LogMode): boolean {
  if (mode === "errors") {
    return isErrorLikeEvent(event);
  }

  return true;
}

export async function logsCommand(subcommand: string | undefined, _positional: string[], options: Record<string, unknown>) {
  const controller = createDefaultPTController();
  await controller.start();

  try {
    const { mode, follow } = selectMode(subcommand, options);
    const events = controller.getBridge().getAllEvents();
    const filtered = filterEvents(events, mode);
    const tailLimit = parseLimit(options["tail"] ?? _positional[0], 20);

    if (mode === "summary") {
      const summary = summarizeEvents(filtered);

      if (options["json"]) {
        console.log(JSON.stringify(summary, null, 2));
      } else {
        console.log(`Eventos: ${summary.total}`);
        for (const [type, count] of Object.entries(summary.counts)) {
          console.log(`  ${type}: ${count}`);
        }

        if (summary.latest) {
          console.log(`Último: ${formatEvent(summary.latest)}`);
        }
      }

      return;
    }

    const visible = tailEvents(filtered, tailLimit);

    if (options["json"]) {
      console.log(JSON.stringify(visible, null, 2));
    } else {
      if (!visible.length) {
        console.log("No events to show.");
      } else {
        for (const event of visible) {
          console.log(formatEvent(event));

          if (options["verbose"]) {
            console.log(`  ${JSON.stringify(event, null, 2)}`);
          }
        }
      }
    }

    if (follow) {
      console.log("-- following -- (press Ctrl+C to stop)");
      await followEvents(controller, mode);
    }
  } finally {
    await controller.stop();
  }
}
