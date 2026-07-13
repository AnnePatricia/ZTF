// src/components/ia/AIPanel.tsx
import { useState, useRef, useEffect } from 'react';
import { useAIContext } from '../../context/AIContext';
import ChatMessage from './ChatMessage';

export default function AIPanel() {
  const { isOpen, messages, sendMessage, isTyping, currentContext, resetConversation } = useAIContext();
  const [input, setInput] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ Timer pour afficher le temps écoulé
  useEffect(() => {
    if (isTyping) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTyping]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput('');
  };

  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl z-50 flex flex-col border border-gray-200 dark:border-gray-700 animate-slide-up">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fas fa-robot text-xl"></i>
            </div>
            <div>
              <h3 className="font-bold">Assistant ZTF</h3>
              <p className="text-xs text-purple-100 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                En ligne • {currentContext?.department || 'Global'}
              </p>
            </div>
          </div>
          <button
            onClick={resetConversation}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Nouvelle conversation"
          >
            <i className="fas fa-redo text-sm"></i>
          </button>
        </div>

        {currentContext?.currentFile && (
          <div className="mt-3 p-2 bg-white/10 rounded-lg text-xs">
            <p className="font-semibold mb-1">Fichier ouvert:</p>
            <p>{currentContext.currentFile.ztfId} — {currentContext.currentFile.title}</p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-robot text-5xl text-purple-300 dark:text-purple-600 mb-4"></i>
            <p className="text-gray-600 dark:text-gray-400 font-medium">
              Bonjour ! Je suis votre assistant ZTF.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Posez-moi une question sur le pipeline éditorial.
            </p>

            <div className="mt-6 space-y-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2">
                ⚡ Actions rapides:
              </p>
              <button
                onClick={() => handleQuickAction('Explique-moi le workflow D2 → D3')}
                className="w-full text-left px-3 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg text-sm text-purple-700 dark:text-purple-300 transition-colors"
              >
                📋 Explique le workflow D2 → D3
              </button>
              <button
                onClick={() => handleQuickAction('Quelle est la nomenclature ZTF ?')}
                className="w-full text-left px-3 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg text-sm text-purple-700 dark:text-purple-300 transition-colors"
              >
                🏷️ Nomenclature ZTF
              </button>
              <button
                onClick={() => handleQuickAction('Génère une Fiche de Transmission')}
                className="w-full text-left px-3 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg text-sm text-purple-700 dark:text-purple-300 transition-colors"
              >
                📤 Générer Fiche de Transmission
              </button>
            </div>
          </div>
        ) : (
          messages.map(msg => <ChatMessage key={msg.id} message={msg} />)
        )}

        {/* ✅ Indicateur de progression avec temps */}
        {isTyping && (
          <div className="flex items-center gap-3 text-gray-500 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <div className="flex-1">
              <span className="text-xs font-medium">
                {elapsedTime < 5 
                  ? "L'IA réfléchit..." 
                  : elapsedTime < 15 
                  ? "Génération en cours..." 
                  : elapsedTime < 30 
                  ? "Réponse complexe..." 
                  : "Presque terminé..."}
              </span>
              <div className="text-xs text-gray-400 mt-1">
                ⏱️ {elapsedTime}s
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white text-sm"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Ctrl+I pour ouvrir/fermer • Les réponses sont marquées [IA]
        </p>
      </form>
    </div>
  );
}