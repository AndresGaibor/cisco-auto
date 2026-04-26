// PTSimulation, PTOptions interfaces
// NOTE: PTSimulation does NOT extend PTIpcBase — standalone interface per original registry

export interface PTSimulation {
  backward(): void;
  forward(): void;
  resetSimulation(): void;
  setSimulationMode(enabled: boolean): void;
  isSimulationMode(): boolean; // [CONFIRMED];
  createFrameInstance(): any;
  getCurrentSimTime(): number;
  getClassName?(): string;
  getObjectUuid?(): string;
}

export interface PTOptions {
  setAnimation(enabled: boolean): void;
  setSound(enabled: boolean): void;
  setHideDevLabel(enabled: boolean): void;
  setDeviceModelShown(enabled: boolean): void;
  setMainToolbarShown(enabled: boolean): void;
  setCliTabHidden(enabled: boolean): void;
  getClassName?(): string;
  getObjectUuid?(): string;
}