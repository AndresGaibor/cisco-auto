// packages/pt-runtime/src/pt/kernel/file-access.ts
// Abstracción de acceso a archivos — permite usar fm o _ScriptModule

declare var fm: unknown;
declare var _ScriptModule: unknown;

function getFM(): typeof fm | null {
  try {
    if (typeof fm !== "undefined" && fm !== null) return fm;
  } catch (e) {
    dprint("[file-access] fm not declared: " + String(e));
  }
  return null;
}

function getSM(): typeof _ScriptModule | null {
  try {
    if (typeof _ScriptModule !== "undefined" && _ScriptModule !== null) return _ScriptModule;
  } catch (e) {
    dprint("[file-access] _ScriptModule not declared: " + String(e));
  }
  return null;
}

function getFileMtime(path: string): number {
  try {
    const _fm = getFM();
    if (
      _fm &&
      (_fm as { getFileModificationTime?: (path: string) => number }).getFileModificationTime
    ) {
      return (_fm as { getFileModificationTime: (path: string) => number }).getFileModificationTime(
        path,
      );
    }
    const _sm = getSM();
    if (_sm) {
      return (_sm as { getFileModificationTime: (path: string) => number }).getFileModificationTime(
        path,
      );
    }
    return 0;
  } catch (e) {
    dprint("[file-access] getFileMtime error: " + String(e));
    return 0;
  }
}

function fileExists(path: string): boolean {
  try {
    const _fm = getFM();
    if (_fm) {
      return !!(_fm as { fileExists: (path: string) => boolean }).fileExists(path);
    }
    const _sm = getSM();
    if (_sm) {
      const sz = (_sm as { getFileSize: (path: string) => number }).getFileSize(path);
      return sz >= 0;
    }
    return false;
  } catch (e) {
    dprint("[file-access] fileExists error: " + String(e));
    return false;
  }
}

function getFileContents(path: string): string {
  const _fm = getFM();
  if (_fm) {
    return (_fm as { getFileContents: (path: string) => string }).getFileContents(path);
  }
  const _sm = getSM();
  if (_sm) {
    return (_sm as { getFileContents: (path: string) => string }).getFileContents(path);
  }
  throw new Error("No file access method available");
}

export interface FileAccess {
  getFM: () => typeof fm | null;
  getFileMtime: (path: string) => number;
  fileExists: (path: string) => boolean;
  getFileContents: (path: string) => string;
}

export function createFileAccess(): FileAccess {
  return {
    getFM,
    getFileMtime,
    fileExists,
    getFileContents,
  };
}
