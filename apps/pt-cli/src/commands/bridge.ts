#!/usr/bin/env bun
/**
 * Comando pt bridge - Muestra estado del bridge CLI ↔ Packet Tracer
 */

import { Command } from "commander";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

export function createBridgeCommand(): Command {
  return new Command("bridge")
    .description("Mostrar estado del bridge CLI ↔ Packet Tracer")
    .action(() => {
      const devDir = resolve(homedir(), "pt-dev");
      const leaseFile = resolve(devDir, "bridge-lease.json");

      console.log("=== Bridge Status ===\n");

      if (!existsSync(leaseFile)) {
        console.log("Bridge: no lease file found");
        console.log("Status: waiting for first command");
        console.log("\nEjecuta cualquier comando pt para iniciar el bridge");
        return;
      }

      try {
        const lease = JSON.parse(readFileSync(leaseFile, "utf-8"));
        const now = Date.now();
        const age = now - lease.startedAt;
        const ageSec = Math.round(age / 1000);
        const expiresIn = lease.expiresAt - now;
        const leaseValid = expiresIn > 0;

        console.log(`Bridge       : running`);
        console.log(`PID          : ${lease.pid}`);
        console.log(`Owner ID     : ${lease.ownerId?.substring(0, 8)}...`);
        console.log(`Started      : hace ${ageSec}s`);
        console.log(`Lease        : ${leaseValid ? "valid" : "expired"}`);
        console.log(`TTL          : ${lease.ttlMs}ms`);
        console.log(`Version      : ${lease.version}`);

        if (leaseValid) {
          console.log(`Expires in   : ${Math.round(expiresIn / 1000)}s`);
        }

        console.log("");
        console.log("Para más detalles: bun run pt status");
      } catch (e) {
        console.log("Bridge: error reading lease file");
        console.log("Error:", String(e));
      }
    });
}