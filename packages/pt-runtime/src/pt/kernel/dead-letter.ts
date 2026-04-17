// packages/pt-runtime/src/pt/kernel/dead-letter.ts
// Mover archivos fallidos al directorio dead-letter

import { safeFM } from "./safe-fm";

export interface DeadLetter {
  move(filePath: string, error: unknown): void;
}

export function createDeadLetter(deadLetterDir: string): DeadLetter {
  function move(filePath: string, error: unknown): void {
    const s = safeFM();
    if (!s.available || !s.fm) return;
    const fm = s.fm;

    try {
      const basename = filePath.split("/").pop() || "unknown";
      const timestamp = String(Date.now());
      const dlPath = deadLetterDir + "/" + timestamp + "-" + basename;

      try {
        fm.moveSrcFileToDestFile(filePath, dlPath, false);
      } catch (e) {
        dprint("[dead-letter] move error: " + String(e));
      }

      fm.writePlainTextToFile(
        dlPath + ".error.json",
        JSON.stringify({
          originalFile: basename,
          error: String(error),
          movedAt: Date.now(),
        }),
      );

      dprint("[dead-letter] moved: " + basename);
    } catch (e) {
      dprint("[dead-letter] error: " + String(e));
    }
  }

  return { move };
}
