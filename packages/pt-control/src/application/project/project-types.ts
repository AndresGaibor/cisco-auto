export interface ProjectStatus {
  ok: boolean;
  activeFile: string;
  savedFilename: string;
  isSavedToDisk: boolean;
  isActivityFile: boolean | null;
  defaultSaveLocation: string;
  tempFileLocation: string;
  deviceCount: number | null;
  linkCount: number | null;
  activeFileClass: string | null;
  networkDescription: string;
}

export interface ProjectSaveResult {
  ok: boolean;
  action: "project.save";
  activeFile: string;
  saved: boolean;
  before: string;
  after: string;
}

export interface ProjectSnapshotChunk {
  snapshotId: string;
  offset: number;
  nextOffset: number;
  eof: boolean;
  bytes: number[];
}

export interface AutosaveEntry {
  id: string;
  createdAt: string;
  projectPath: string;
  autosavePath: string;
  bytes: number;
  sha256: string;
  source: "fileSaveToBytes";
  deviceCount: number | null;
  linkCount: number | null;
}

export interface AutosaveResult {
  ok: boolean;
  action: "project.autosave";
  activeFile: string;
  autosavePath: string;
  bytes: number;
  sha256: string;
  kept: number;
  deletedOld: string[];
}