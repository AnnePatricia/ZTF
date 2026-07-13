// src/context/AIContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { aiService } from '../services/aiService';
import type { AIContext as AIContextType, AIMessage, AISuggestion } from '../types/ai';
import { useRoles } from '../hooks/useRoles';

interface AIContextProviderProps {
  children: ReactNode;
}

interface AIContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: AIMessage[];
  sendMessage: (content: string) => Promise<void>;
  suggestions: AISuggestion[];
  isTyping: boolean;
  currentContext: AIContextType | null;
  resetConversation: () => void;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const AIContext = createContext<AIContextValue | undefined>(undefined);

export function AIContextProvider({ children }: AIContextProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isEnabled, setEnabled] = useState(true);
  const { currentUser } = useRoles();  // ✅ Retirer currentDepartment

  useEffect(() => {
    if (currentUser) {
      const context: AIContextType = {
        userId: currentUser.id,
        userName: currentUser.full_name,
        department: null,  // ✅ Sera mis à jour dynamiquement
        currentFile: null,
        userRole: currentUser.role,
        sessionId: `session-${Date.now()}`,
      };
      aiService.setContext(context);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isEnabled || !isOpen) return;

    const interval = setInterval(async () => {
      const suggestion = await aiService.getProactiveSuggestion();
      if (suggestion) {
        setSuggestions(prev => [...prev, suggestion]);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isEnabled, isOpen]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    setIsTyping(true);

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      isAI: false,
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await aiService.sendMessage(content);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Erreur envoi message IA:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const resetConversation = () => {
    aiService.resetConversation();
    setMessages([]);
  };

  return (
    <AIContext.Provider
      value={{
        isOpen,
        setIsOpen,
        messages,
        sendMessage,
        suggestions,
        isTyping,
        currentContext: aiService.getContext(),
        resetConversation,
        isEnabled,
        setEnabled,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAIContext() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAIContext must be used within AIContextProvider');
  }
  return context;
}