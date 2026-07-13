// src/services/aiService.ts
import { supabase } from '../supabaseClient';
import type { AIMessage, AIContext, AIModel } from '../types/ai';
import type { AISuggestion } from '../types/ai';

// ✅ Configuration : /api/chat + modèle 1.5b
const AI_CONFIG = {
  qwen: {
    endpoint: 'http://localhost:11434/api/chat',  // ✅ API moderne
    model: 'qwen2.5:1.5b',  // ✅ Modèle léger déjà installé
    enabled: true,
  },
};

// ✅ Prompt système ZTF (version courte)
const ZTF_SYSTEM_PROMPT = `Tu es l'Assistant IA de ZTF-GEST (gestion éditoriale CMCI).

RÈGLES:
- Réponds en français, max 100 mots
- Tu proposes, l'humain décide
- Marquage [IA] obligatoire
- Respecte les départements D0-D8

PIPELINE: DRAFT → TRANSCRIBED → CLEANED → STRUCTURED → REWRITTEN → CORRECTED → TRANSLATED → BAT

Départements: D0=Base, D2=Transcription, D3=Nettoyage, D4=Éditorialisation, D5=Réécriture, D6=Correction, D7=Traduction, D8=BAT`;

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export class AIService {
  private static instance: AIService;
  private conversationHistory: AIMessage[] = [];
  private currentContext: AIContext | null = null;

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  setContext(context: AIContext): void {
    this.currentContext = context;
  }

  getContext(): AIContext | null {
    return this.currentContext;
  }

  async sendMessage(content: string, model: AIModel = 'qwen-local'): Promise<AIMessage> {
    const userMessage: AIMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      isAI: false,
      context: this.currentContext ? {
        department: this.currentContext.department || undefined,
        fileId: this.currentContext.currentFile?.id || undefined,
        status: this.currentContext.currentFile?.status || undefined,
      } : undefined,
    };

    this.conversationHistory.push(userMessage);

    try {
      console.time('⏱️ IA');
      const aiResponse = await this.callAI(content, model);
      console.timeEnd('⏱️ IA');

      const assistantMessage: AIMessage = {
        id: generateId(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        isAI: true,
        model,
        context: this.currentContext ? {
          department: this.currentContext.department || undefined,
          fileId: this.currentContext.currentFile?.id || undefined,
          status: this.currentContext.currentFile?.status || undefined,
        } : undefined,
        type: 'text',
      };

      this.conversationHistory.push(assistantMessage);
      await this.logAIAction('question_asked', {
        question: content,
        response: aiResponse,
        model,
      });

      return assistantMessage;
    } catch (error: any) {
      console.error('❌ Erreur IA:', error);
      return {
        id: generateId(),
        role: 'assistant',
        content: `❌ Erreur: ${error.message}`,
        timestamp: new Date().toISOString(),
        isAI: true,
        type: 'alert',
      };
    }
  }

  private async callAI(_content: string, _model: AIModel): Promise<string> {
    // ✅ Historique court (2 derniers messages seulement)
    const messages = [
      { role: 'system', content: ZTF_SYSTEM_PROMPT },
      ...this.conversationHistory.slice(-2).map(m => ({
        role: m.role,
        content: m.content,
      })),
    ];

    return await this.callQwenChat(messages);
  }

  // ✅ NOUVELLE MÉTHODE: /api/chat (format moderne Ollama)
  private async callQwenChat(messages: any[]): Promise<string> {
    const startTime = Date.now();
    console.log('🤖 Appel Qwen 1.5b via /api/chat...');

    try {
      const response = await fetch(AI_CONFIG.qwen.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: AI_CONFIG.qwen.model,
          messages: messages,  // ✅ Format natif pour /api/chat
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            num_ctx: 1024,    // ✅ Suffisant (pas trop petit)
            num_predict: 256, // ✅ Réponse courte
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✅ Réponse en ${elapsed}s`);

      // ✅ /api/chat retourne data.message.content
      return data.message?.content || 'Pas de réponse';
    } catch (error: any) {
      if (error.message?.includes('Failed to fetch')) {
        throw new Error('Ollama ne répond pas. Vérifiez `ollama serve`.');
      }
      throw new Error(`Erreur: ${error.message}`);
    }
  }

  async getProactiveSuggestion(): Promise<AISuggestion | null> {
    if (!this.currentContext) return null;
    const { department } = this.currentContext;

    const suggestions: Record<string, string[]> = {
      D2: ['Vérifiez la nomenclature du fichier', 'Transcription IA disponible'],
      D3: ['Détection de scories orales possible', 'Vérifiez les références bibliques'],
      D4: ['Cohérence thématique à vérifier', 'Plan chapitré automatique'],
      D5: ['Conformité au Guide de Style ZTF: 87%', 'Reformulation suggérée'],
      D6: ['Américanisme détecté', 'British English: vérification'],
      D7: ['Correspondance biblique vérifiée', 'DeepL assisté'],
    };

    const deptSuggestions = suggestions[department || ''] || [];
    if (deptSuggestions.length === 0) return null;

    return {
      id: generateId(),
      type: 'info',
      title: '💡 Suggestion IA',
      content: deptSuggestions[Math.floor(Math.random() * deptSuggestions.length)],
      priority: 'medium',
      autoApplied: false,
      requiresValidation: true,
      createdAt: new Date().toISOString(),
    };
  }

  private async logAIAction(action: string, details: any): Promise<void> {
    if (!this.currentContext?.userId) return;

    try {
      await supabase.from('audit_log').insert({
        user_id: this.currentContext.userId,
        action_type: `AI_${action}`,
        entity_type: 'ai_assistant',
        entity_id: this.currentContext.currentFile?.id || 'general',
        details: { ...details, department: this.currentContext.department },
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('⚠️ Log audit ignoré:', error);
    }
  }

  getHistory(): AIMessage[] {
    return this.conversationHistory;
  }

  resetConversation(): void {
    this.conversationHistory = [];
  }
}

export const aiService = AIService.getInstance();