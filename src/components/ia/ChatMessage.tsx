// src/components/ia/ChatMessage.tsx
import type { AIMessage } from '../../types/ai';

interface ChatMessageProps {
  message: AIMessage;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isAI = message.isAI;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser 
          ? 'bg-blue-500' 
          : 'bg-gradient-to-br from-purple-500 to-indigo-500'
      }`}>
        <i className={`fas ${isUser ? 'fa-user' : 'fa-robot'} text-white text-sm`}></i>
      </div>

      {/* Contenu */}
      <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`inline-block max-w-[85%] px-4 py-2 rounded-2xl ${
          isUser
            ? 'bg-blue-500 text-white rounded-tr-sm'
            : isAI
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-sm border-l-4 border-purple-500'
            : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'
        }`}>
          {/* Marquage [IA] obligatoire */}
          {isAI && (
            <div className="flex items-center gap-1 mb-1 pb-1 border-b border-purple-200 dark:border-purple-800">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                [IA]
              </span>
              {message.model && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  • {message.model === 'qwen-local' ? 'Qwen 3.7' : 'Claude'}
                </span>
              )}
            </div>
          )}

          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Timestamp */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-2">
          {new Date(message.timestamp).toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
          {message.context?.department && (
            <span className="ml-2 text-purple-500">• {message.context.department}</span>
          )}
        </p>
      </div>
    </div>
  );
}