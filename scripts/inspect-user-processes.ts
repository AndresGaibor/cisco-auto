#!/usr/bin/env bun
/**
 * USER PROCESS MONITOR
 * Lista los procesos activos en la PC0.
 */

import { createDefaultPTController } from "@cisco-auto/pt-control";

async function monitorProcesses() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🕵️  MONITOREANDO PROCESOS EN PC0...");

    const exploit = `
        (function() {
            try {
                var pc = ipc.network().getDevice('PC0');
                if (!pc) return "PC0_NOT_FOUND";

                // Probamos nombres de procesos comunes en PT
                var commonProbes = [
                    "PingProcess", "WebBrowserProcess", "TerminalProcess", 
                    "TelnetProcess", "SshProcess", "EmailProcess"
                ];
                
                var active = [];
                for(var i=0; i<commonProbes.length; i++) {
                    var p = pc.getProcess(commonProbes[i]);
                    if (p) {
                        active.push(commonProbes[i] + ":::STATE:" + (p.isStopped ? p.isStopped() : "running"));
                    }
                }
                
                return active.join("|||");
            } catch(e) { return "PROC_ERROR: " + e; }
        })()
    `;

    const res = await controller.send("__evaluate", { code: exploit });
    
    if (res.ok && res.result) {
        console.log(`\n✅ PROCESOS DETECTADOS EN PC0:`);
        console.log("--------------------------------------------------");
        res.result.split("|||").forEach((p: string) => {
            const [name, state] = p.split(":::");
            console.log(`  💠 ${name.padEnd(20)} | ${state}`);
        });
        console.log("--------------------------------------------------");
    } else {
        console.log("\n⚠️  No hay procesos de usuario activos en este momento.");
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}

monitorProcesses();
