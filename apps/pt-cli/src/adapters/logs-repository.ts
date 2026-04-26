import { existsSync } from "node:fs";

import type {
  LogBundleWriterPort,
  LogSessionRepositoryPort,
} from "@cisco-auto/pt-control/application/logs";

import { sessionLogStore } from "../telemetry/session-log-store.js";
import { bundleWriter } from "../telemetry/bundle-writer.js";

export function createCliLogSessionRepository(): LogSessionRepositoryPort {
  return {
    async read(sessionId: string) {
      return sessionLogStore.read(sessionId) as never;
    },
  };
}

export function createCliLogBundleWriter(): LogBundleWriterPort {
  return {
    async writeBundle(sessionId: string, outputPath?: string) {
      void outputPath;
      return bundleWriter.writeBundle(sessionId);
    },

    exists(path: string) {
      return existsSync(path);
    },
  };
}