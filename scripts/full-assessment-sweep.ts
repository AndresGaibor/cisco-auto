#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";

async function directSweep() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log("\n🚀 INICIANDO BARRIDO POR RESOLUCIÓN DIRECTA...");

    const methods = [
        "getTimeElapsed()",
        "peakAssessmentItemID()",
        "getCountDownTime()",
        "getPDUCount()",
        "getConnectivityTestCount()",
        "isInNetwork()",
        "isUsingCache()",
        "getInstructionsHTML()"
    ];

    for (const m of methods) {
        process.stdout.write(`Calling AssessmentModel.${m}... `);
        const res = await controller.send("__evaluate", { code: "AssessmentModel." + m });
        if (res.ok) {
            console.log(`✅ RESULT: ${JSON.stringify(res.result).substring(0, 40)}`);
        } else {
            console.log(`❌ FAIL: ${res.error}`);
        }
    }

  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    await controller.stop();
  }
}
directSweep();
