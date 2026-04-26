// PTFileManager, PTFileWatcher, PTGlobalScope interfaces
import type { PTIpcBase } from "./ipc-base.js";

// ============================================================================
// File Manager interfaces
// ============================================================================

export interface PTFileManager {
  // Basic operations
  getFileContents(path: string): string;
  getFileBinaryContents?(path: string): Uint8Array;
  writePlainTextToFile(path: string, content: string): void;
  writeBinaryToFile?(path: string, content: Uint8Array): void;
  writeTextToFile?(path: string, content: string): void;
  fileExists(path: string): string | boolean;
  directoryExists(path: string): boolean;
  makeDirectory(path: string): boolean;
  getFileModificationTime(path: string): number;
  getFilesInDirectory(path: string): string[];
  removeFile(path: string): boolean;
  removeDirectory?(path: string): boolean;
  moveSrcFileToDestFile(src: string, dest: string, overwrite?: boolean): boolean;

  // Copy operations
  copySrcFileToDestFile?(src: string, dest: string): boolean;
  copySrcDirectoryToDestDirectory?(src: string, dest: string): boolean;

  // File info
  getFileSize?(path: string): number;
  getFileCheckSum?(path: string): string;
  getFilePermissions?(path: string): string;
  setFilePermissions?(path: string, permissions: string): boolean;

  // Encryption
  getEncryptedFileContents?(path: string): string;
  getEncryptedFileBinaryContents?(path: string): Uint8Array;
  encrypt?(content: string): string;
  encryptBinary?(content: Uint8Array): Uint8Array;
  encryptFile?(src: string, dest: string): boolean;
  decrypt?(content: string): string;
  decryptBinary?(content: Uint8Array): Uint8Array;
  decryptFile?(src: string, dest: string): boolean;

  // Compression
  zipDirectory?(srcDir: string, destFile: string): boolean;
  zipDirectoryTo?(srcDir: string, destFile: string): boolean;
  zipDirectoryWithPassword?(srcDir: string, destFile: string, password: string): boolean;
  zipDirectoryToWithPassword?(srcDir: string, destFile: string, password: string): boolean;
  unzipFile?(zipFile: string): boolean;
  unzipFileTo?(zipFile: string, destDir: string): boolean;
  unzipFileWithPassword?(zipFile: string, password: string): boolean;
  unzipFileToWithPassword?(zipFile: string, destDir: string, password: string): boolean;

  // Path utilities
  getAbsolutePath?(path: string): string;
  getRelativePath?(path: string, base: string): string;
  isAbsolutePath?(path: string): boolean;
  isRelativePath?(path: string): boolean;
  convertToNativeSeparators?(path: string): string;
  convertFromNativeSeparators?(path: string): string;

  // File watcher (para hot reload)
  getFileWatcher?(path: string): PTFileWatcher | null;

  // Dialogs
  getOpenFileName?(filter?: string): string | null;
  getOpenFileNames?(filter?: string): string[];
  getSaveFileName?(defaultName?: string): string | null;
  getSelectedDirectory?(): string | null;

  // System
  getClassName?(): string;
  getObjectUuid?(): string;

  // Events (IPC style)
  registerEvent?(event: string, context: any, handler: Function): void;
  registerDelegate?(event: string, context: any, handler: Function): void;
  unregisterEvent?(event: string, context: any, handler: Function): void;
  unregisterDelegate?(event: string, context: any, handler: Function): void;
  registerObjectEvent?(event: string, context: any, handler: Function): void;
  unregisterObjectEvent?(event: string, context: any, handler: Function): void;
}

export interface PTFileWatcher {
  register?(path: string, handler: (event: string) => void): void;
  unregister?(path?: string): void;
}

export interface PTGlobalScope {
  ipc: PTIpc;
  fm: PTFileManager;
  dprint: (message: string) => void;
  DEV_DIR: string;
}

import type { PTIpc } from "./ipc-base.js";