export interface BackendPort {
  connect(config: unknown): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}
