// src/types/ai.ts

export type AIMode = 'passive' | 'proactive' | 'question' | 'generation';

export type AIModel = 'qwen-local' | 'claude-api';

export type CommentType = 
  | 'typo' 
  | 'doctrinal' 
  | 'style' 
  | 'question' 
  | 'validation';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isAI: boolean;  // ✅ Marquage obligatoire [IA]
  model?: AIModel;
  context?: {
    department?: string;
    fileId?: string;
    status?: string;
  };
  type?: 'text' | 'suggestion' | 'alert' | 'generation';
  metadata?: {
    confidence?: number;
    source?: string;
    accepted?: boolean;
  };
}

export interface AIContext {
  userId: string | null;
  userName: string | null;
  department: string | null;
  currentFile: {
    id?: string;
    ztfId?: string;
    title?: string;
    status?: string;
    type?: string;
  } | null;
  userRole: string | null;
  sessionId: string;
}

export interface AISuggestion {
  id: string;
  type: 'anomaly' | 'improvement' | 'warning' | 'info';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  autoApplied: boolean;
  requiresValidation: boolean;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  messages: AIMessage[];
  context: AIContext;
  createdAt: string;
  updatedAt: string;
  department: string;
  title: string;
}

export interface AIActionLog {
  id: string;
  userId: string;
  action: 'suggestion_accepted' | 'suggestion_rejected' | 'question_asked' | 'generation_used';
  fileId?: string;
  department: string;
  details: any;
  timestamp: string;
}