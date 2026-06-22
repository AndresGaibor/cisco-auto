import { createErrorResult, createSuccessResult } from "./result-factories";
import type { PtRuntimeApi } from "../pt-api/pt-deps";
import type { PtResult } from "../pt-api/pt-results";

export interface FileReadPayload {
  type: "fileRead";
  path: string;
}

export interface FileWritePayload {
  type: "fileWrite";
  path: string;
  content: string;
}

export interface FileListPayload {
  type: "fileList";
  path: string;
}

export interface FileExistsPayload {
  type: "fileExists";
  path: string;
}

export interface FileMakeDirPayload {
  type: "fileMakeDir";
  path: string;
}

export interface FileRemovePayload {
  type: "fileRemove";
  path: string;
}

function getFileManager(api: PtRuntimeApi): any {
  try {
    var fm = api.ipc.systemFileManager();
    if (fm) return fm;
  } catch {}
  try {
    if (typeof _ScriptModule !== "undefined" && _ScriptModule) {
      return _ScriptModule;
    }
  } catch {}
  return null;
}

export function handleFileRead(payload: FileReadPayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.path) {
    return createErrorResult("Missing payload.path", "INVALID_PAYLOAD");
  }

  var fm = getFileManager(api);
  if (!fm) return createErrorResult("FileManager not available", "NOT_AVAILABLE");

  try {
    var content: string;
    if (typeof fm.getFileContents === "function") {
      content = fm.getFileContents(payload.path);
    } else {
      return createErrorResult("FileManager has no getFileContents", "NOT_SUPPORTED");
    }

    return createSuccessResult({
      path: payload.path,
      content: content,
      size: content ? content.length : 0,
    });
  } catch (e) {
    return createErrorResult("Failed to read file: " + String(e), "FILE_ERROR");
  }
}

export function handleFileWrite(payload: FileWritePayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.path || payload.content === undefined) {
    return createErrorResult("Missing payload.path or payload.content", "INVALID_PAYLOAD");
  }

  var fm = getFileManager(api);
  if (!fm) return createErrorResult("FileManager not available", "NOT_AVAILABLE");

  try {
    if (typeof fm.writePlainTextToFile === "function") {
      fm.writePlainTextToFile(payload.path, payload.content);
    } else if (typeof fm.writeTextToFile === "function") {
      fm.writeTextToFile(payload.path, payload.content);
    } else {
      return createErrorResult("FileManager has no write method", "NOT_SUPPORTED");
    }

    return createSuccessResult({
      path: payload.path,
      size: payload.content.length,
    });
  } catch (e) {
    return createErrorResult("Failed to write file: " + String(e), "FILE_ERROR");
  }
}

export function handleFileList(payload: FileListPayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.path) {
    return createErrorResult("Missing payload.path", "INVALID_PAYLOAD");
  }

  var fm = getFileManager(api);
  if (!fm) return createErrorResult("FileManager not available", "NOT_AVAILABLE");

  try {
    var files: string[];
    if (typeof fm.getFilesInDirectory === "function") {
      files = fm.getFilesInDirectory(payload.path);
    } else {
      return createErrorResult("FileManager has no getFilesInDirectory", "NOT_SUPPORTED");
    }

    return createSuccessResult({
      path: payload.path,
      files: files || [],
      count: files ? files.length : 0,
    });
  } catch (e) {
    return createErrorResult("Failed to list directory: " + String(e), "FILE_ERROR");
  }
}

export function handleFileExists(payload: FileExistsPayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.path) {
    return createErrorResult("Missing payload.path", "INVALID_PAYLOAD");
  }

  var fm = getFileManager(api);
  if (!fm) return createErrorResult("FileManager not available", "NOT_AVAILABLE");

  try {
    var exists: any = false;
    if (typeof fm.fileExists === "function") {
      exists = fm.fileExists(payload.path);
    }

    return createSuccessResult({
      path: payload.path,
      exists: !!exists,
    });
  } catch (e) {
    return createErrorResult("Failed to check file: " + String(e), "FILE_ERROR");
  }
}

export function handleFileMakeDir(payload: FileMakeDirPayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.path) {
    return createErrorResult("Missing payload.path", "INVALID_PAYLOAD");
  }

  var fm = getFileManager(api);
  if (!fm) return createErrorResult("FileManager not available", "NOT_AVAILABLE");

  try {
    var result = false;
    if (typeof fm.makeDirectory === "function") {
      result = !!fm.makeDirectory(payload.path);
    }

    return createSuccessResult({
      path: payload.path,
      created: result,
    });
  } catch (e) {
    return createErrorResult("Failed to create directory: " + String(e), "FILE_ERROR");
  }
}

export function handleFileRemove(payload: FileRemovePayload, api: PtRuntimeApi): PtResult {
  if (!payload || !payload.path) {
    return createErrorResult("Missing payload.path", "INVALID_PAYLOAD");
  }

  var fm = getFileManager(api);
  if (!fm) return createErrorResult("FileManager not available", "NOT_AVAILABLE");

  try {
    var result = false;
    if (typeof fm.removeFile === "function") {
      result = !!fm.removeFile(payload.path);
    }

    return createSuccessResult({
      path: payload.path,
      removed: result,
    });
  } catch (e) {
    return createErrorResult("Failed to remove file: " + String(e), "FILE_ERROR");
  }
}
