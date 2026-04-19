#!/usr/bin/env bun
import { createDefaultPTController } from "@cisco-auto/pt-control";
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  magenta: (s: string) => `\x1b[35m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`
};

async function dive() {
  const controller = createDefaultPTController();
  try {
    await controller.start();
    console.log(colors.bold(colors.magenta("\n🕵️  INCURSIÓN PROFUNDA: EL ÁRBOL DE EVALUACIÓN")));
    const exploit = `
      (function() {
        var results = [];
        try {
            var rootChildren = AssessmentModel.getAssessmentNodeChildrenAsList("");
            for (var i = 0; i < rootChildren.length; i++) {
                var nodeId = rootChildren[i];
                results.push({ id: nodeId, correct: AssessmentModel.isAssessmentItemCorrect(nodeId), type: "node" });
                var subChildren = AssessmentModel.getAssessmentNodeChildrenAsList(nodeId);
                for (var j = 0; j < subChildren.length; j++) {
                    var subId = subChildren[j];
                    results.push({ id: subId, correct: AssessmentModel.isAssessmentItemCorrect(subId), parent: nodeId, type: "item" });
                }
            }
        } catch(e) { return "ERROR: " + e; }
        return results;
      })()
    `;
    const res = await controller.send("__evaluate", { code: exploit });
    if (res.ok) {
        const items = res.result;
        if (Array.isArray(items) && items.length > 0) {
            console.log(colors.green(`\n✅ Se encontraron ${items.length} elementos.`));
            items.forEach((item: any) => {
                console.log(`${item.correct ? colors.green("✓") : colors.red("✗")} [${item.id}]`);
            });
        } else {
            console.log(colors.magenta("\n⚠️ ESCENARIO SIN EVALUACIÓN ACTIVA."));
        }
    }
    const scoreExploit = `({ total: AssessmentModel.getTotalItemCountByComponent("all"), correct: AssessmentModel.getCorrectItemCountByComponent("all"), points: AssessmentModel.getPointsByComponent("all"), time: AssessmentModel.getTimeElapsed() })`;
    const score = await controller.send("__evaluate", { code: scoreExploit });
    console.log(colors.bold(colors.cyan("\n📊 ESTADO GLOBAL:")));
    console.log(JSON.stringify(score.result, null, 2));
  } catch (error: any) {
    console.error(colors.red(`\n💥 Error: ${error.message}`));
  } finally {
    await controller.stop();
  }
}
dive();
