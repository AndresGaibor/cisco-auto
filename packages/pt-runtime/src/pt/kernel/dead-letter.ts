// packages/pt-runtime/src/pt/kernel/dead-letter.ts
// Mover archivos fallidos al directorio dead-letter con metadata enriquecida

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
      const modo = s.claimMode;

      let sourceAlive = false;
      if (modo === "copy-delete") {
        try {
          const ok = s.moveOrCopyDelete(filePath, dlPath, false);
          if (!ok) {
            dprint("[dead-letter] copy-delete falló: " + basename);
          } else {
            sourceAlive = !!fm.fileExists(filePath);
            if (sourceAlive) {
              dprint("[dead-letter] source residue tras copy-delete: " + filePath);
            }
          }
        } catch (e) {
          dprint("[dead-letter] copy-delete error: " + String(e));
        }
      } else {
        try {
          fm.moveSrcFileToDestFile(filePath, dlPath, false);
        } catch (e) {
          dprint("[dead-letter] move error: " + String(e));
        }
      }

      const meta = {
        originalPath: filePath,
        deadLetterPath: dlPath,
        reason: String(error && typeof error === "object" ? JSON.stringify(error) : String(error)),
        movedAt: Date.now(),
        claimMode: modo,
        sourceAlive: sourceAlive,
      };

      fm.writePlainTextToFile(dlPath + ".meta.json", JSON.stringify(meta, null, 2));
      dprint("[dead-letter] movido: " + basename + " modo=" + modo + " sourceAlive=" + sourceAlive);
    } catch (e) {
      dprint("[dead-letter] error: " + String(e));
    }
  }

  return { move };
}