export type FactCategory = 'rule' | 'session-state' | 'decision' | 'technical' | 'handoff';

export interface Fact {
  id: string;
  key: string;
  content: string;
  category: FactCategory;
  source: string;
  tags: string[];
  confidence: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
  version: number;
}

export type AgentType = 'mcp' | 'file-based' | 'hybrid';

export interface AgentInfo {
  id: string;
  name: string;
  displayName: string;
  type: AgentType;
  installed: boolean;
  configPath?: string;
  memoryPath?: string;
  lastSync?: string;
  status: 'active' | 'stale' | 'disconnected';
  mcpSupported: boolean;
  fileSyncSupported: boolean;
}

export interface Handoff {
  id: string;
  fromAgent: string;
  toAgent?: string | null;
  summary: string;
  context: string;
  status: 'pending' | 'claimed' | 'completed';
  createdAt: string;
  claimedAt?: string | null;
  claimedBy?: string | null;
}

export interface Conflict {
  key: string;
  facts: Fact[];
  hasDiverged: boolean;
}

export interface MemconConfig {
  storePath: string;
  autoSync: boolean;
  syncIntervalMs: number;
  mcpPort?: number;
  ignorePaths: string[];
  customWatchPaths: string[];
  activeAgents: string[];
}
