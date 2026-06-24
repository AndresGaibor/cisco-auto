// ============================================================================
// Tipos para el agente AI integrado con canvas notes de PT
// ============================================================================

export interface AgentQuery {
  id: string;
  noteId: string;
  query: string;
  createdAt: number;
}

export interface AgentResponse {
  id: string;
  noteId: string;
  response: string;
  completedAt: number;
  error?: string;
}

export type AgentStatus = 'pending' | 'processing' | 'completed' | 'error';
