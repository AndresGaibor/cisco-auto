import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export class TrackService {
  constructor(private readonly trackFilePath: string) {
    const dir = dirname(trackFilePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  read(): string | null {
    try {
      const content = readFileSync(this.trackFilePath, "utf-8").trim();
      return content || null;
    } catch {
      return null;
    }
  }

  write(path: string): void {
    writeFileSync(this.trackFilePath, path, "utf-8");
  }
}
