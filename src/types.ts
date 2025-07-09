export interface LogEntry {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  type: 'user' | 'assistant';
  message: UserMessage | AssistantMessage;
  uuid: string;
  timestamp: string;
  requestId?: string;
  toolUseResult?: any;
}

export interface UserMessage {
  role: 'user';
  content: string | ToolResult[];
}

export interface AssistantMessage {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: MessageContent[];
  stop_reason: string | null;
  stop_sequence: string | null;
  usage: TokenUsage;
}

export interface MessageContent {
  type: 'text' | 'tool_use';
  text?: string;
  id?: string;
  name?: string;
  input?: any;
}

export interface ToolResult {
  tool_use_id: string;
  type: 'tool_result';
  content: string;
}

export interface TokenUsage {
  input_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  output_tokens: number;
  service_tier: string;
}

export interface UserThread {
  user: LogEntry;
  responses: LogEntry[];
  tools: number;
  totalTokens: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
  };
  cost: number;
  startTime: Date;
  endTime: Date;
}

export interface DailyStats {
  userMessages: number;
  totalExchanges: number;
  toolsUsed: number;
  totalTokens: {
    input: number;
    output: number;
    cacheCreation: number;
    cacheRead: number;
  };
  totalCost: number;
  startTime: Date;
  endTime: Date;
}

export interface PricingRates {
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
}